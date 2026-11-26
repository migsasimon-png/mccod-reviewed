import moment from "moment";
import { formDefinitions, MCCOD_PROGRAM, MCCOD_STAGE } from "../forms/registry";
import { FormId } from "../forms/types";
import {
  DASH_FORMS,
  DashRecord,
  OuRef,
  RawEvent,
  outermostRoots,
  pathFromAncestors,
  toRecord,
} from "./dashboardData";

type Fetch = (url: string) => Promise<any>;

export interface Scope {
  /** Org units the signed-in user is assigned to; DHIS2 limits every query to them. */
  roots: OuRef[];
  levels: Record<number, string>;
}

export interface LoadedData {
  records: DashRecord[];
  truncated: FormId[];
  failed: { form: FormId; area: string }[];
  loadedAt: number;
}

const PAGE_SIZE = 500;
/** 60 pages x 500 = 30,000 events per form and area before the dashboard stops. */
const MAX_PAGES = 60;
const OU_CHUNK = 100;

const programCache: Partial<Record<FormId, string>> = {};

export async function loadScope(fetch: Fetch): Promise<Scope> {
  const me = await fetch(`/api/me.json?fields=organisationUnits[id,displayName,level,path]`);
  let units: (OuRef & { path?: string })[] = (me?.organisationUnits || []).map((o: any) => ({
    id: o.id,
    name: o.displayName,
    level: o.level,
    path: o.path,
  }));
  if (units.length === 0) {
    // Accounts without an assignment (for example superusers) see the whole tree.
    const top = await fetch(`/api/organisationUnits.json?level=1&paging=false&fields=id,displayName,level,path`);
    units = (top?.organisationUnits || []).map((o: any) => ({
      id: o.id,
      name: o.displayName,
      level: o.level,
      path: o.path,
    }));
  }
  const levels: Record<number, string> = {};
  try {
    const res = await fetch(`/api/organisationUnitLevels.json?paging=false&fields=level,displayName`);
    (res?.organisationUnitLevels || []).forEach((l: any) => (levels[l.level] = l.displayName));
  } catch {
    /* labels fall back to "Level N" */
  }
  return { roots: outermostRoots(units).sort((a, b) => a.name.localeCompare(b.name)), levels };
}

const programOf = async (fetch: Fetch, form: FormId): Promise<string | null> => {
  if (programCache[form]) return programCache[form] as string;
  const def = formDefinitions[form];
  let program: string | null | undefined = def.program;
  if (!program && form === "mccod") program = MCCOD_PROGRAM;
  if (!program && def.programStage) {
    const res = await fetch(`/api/programStages/${def.programStage}.json?fields=program[id]`);
    program = res?.program?.id;
  }
  if (program) programCache[form] = program;
  return program || null;
};

const stageOf = (form: FormId) => (form === "mccod" ? MCCOD_STAGE : formDefinitions[form].programStage);

async function loadPaths(fetch: Fetch, ids: string[], rootIds: string[]): Promise<Record<string, OuRef[]>> {
  const out: Record<string, OuRef[]> = {};
  const res = await fetch(
    `/api/organisationUnits.json?paging=false&filter=id:in:[${ids.join(",")}]` +
      `&fields=id,displayName,level,ancestors[id,displayName,level]`
  );
  for (const ou of res?.organisationUnits || []) out[ou.id] = pathFromAncestors(ou, rootIds);
  return out;
}

export interface LoadHandlers {
  /** Called as pages arrive so the dashboard can fill in while it loads. */
  onRecords: (batch: DashRecord[]) => void;
  onProgress: (loaded: number, total: number) => void;
  shouldStop: () => boolean;
}

export async function loadDashboard(
  fetch: Fetch,
  scope: Scope,
  range: [moment.Moment, moment.Moment],
  h: LoadHandlers
): Promise<{ truncated: FormId[]; failed: LoadedData["failed"] }> {
  const rootIds = scope.roots.map((r) => r.id);
  const failed: LoadedData["failed"] = [];
  const truncated = new Set<FormId>();
  const seen = new Set<string>();
  const paths: Record<string, OuRef[]> = {};
  const pending = new Map<string, Promise<void>>();
  const totals = new Map<string, number>();
  let loaded = 0;
  const today = moment();

  const ensurePaths = async (ids: string[]) => {
    const need = Array.from(new Set(ids)).filter((id) => id && !paths[id] && !pending.has(id));
    for (let i = 0; i < need.length; i += OU_CHUNK) {
      const chunk = need.slice(i, i + OU_CHUNK);
      const p = loadPaths(fetch, chunk, rootIds)
        .then((r) => void Object.assign(paths, r))
        .catch(() => undefined);
      chunk.forEach((id) => pending.set(id, p));
    }
    await Promise.all(ids.map((id) => pending.get(id)).filter(Boolean));
  };

  const report = () =>
    h.onProgress(loaded, Array.from(totals.values()).reduce((a, b) => a + b, 0));

  const runJob = async (form: FormId, root: OuRef) => {
    const key = `${form}:${root.id}`;
    const program = await programOf(fetch, form);
    const stage = stageOf(form);
    if (!program || !stage) return;
    for (let page = 1; page <= MAX_PAGES; page++) {
      if (h.shouldStop()) return;
      const url =
        `/api/tracker/events?program=${program}&programStage=${stage}` +
        `&orgUnit=${root.id}&orgUnitMode=DESCENDANTS` +
        `&occurredAfter=${range[0].clone().startOf("day").format("YYYY-MM-DDTHH:mm:ss")}` +
        `&occurredBefore=${range[1].clone().endOf("day").format("YYYY-MM-DDTHH:mm:ss")}` +
        `&order=occurredAt:desc&pageSize=${PAGE_SIZE}&page=${page}` +
        (page === 1 ? `&totalPages=true` : ``) +
        `&fields=event,occurredAt,orgUnit,status,createdAt,updatedAt,dataValues[dataElement,value]`;
      const res = await fetch(url);
      if (page === 1) {
        const total = Number(res?.total ?? res?.pager?.total);
        totals.set(key, Number.isFinite(total) ? total : 0);
      }
      const events: RawEvent[] = res?.events || [];
      await ensurePaths(events.map((e) => e.orgUnit));
      const fresh = events.filter((e) => !seen.has(`${form}:${e.event}`));
      fresh.forEach((e) => seen.add(`${form}:${e.event}`));
      h.onRecords(
        fresh.map((e) =>
          toRecord(form, e, paths[e.orgUnit] || [{ id: e.orgUnit, name: e.orgUnit, level: 0 }], today)
        )
      );
      loaded += events.length;
      report();
      if (events.length < PAGE_SIZE) return;
    }
    if (!h.shouldStop()) truncated.add(form);
  };

  const jobs: Promise<void>[] = [];
  DASH_FORMS.forEach((form) =>
    scope.roots.forEach((root) =>
      jobs.push(
        runJob(form, root).catch(() => {
          failed.push({ form, area: root.name });
        })
      )
    )
  );
  await Promise.all(jobs);
  return { truncated: Array.from(truncated), failed };
}
