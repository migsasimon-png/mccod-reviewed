import moment from "moment";
import { CASE_NUMBER_DE, LINKED_DE } from "../forms/registry";
import { FormId } from "../forms/types";
import { childDateOfDeath, isChildReviewOverdue } from "../forms/childReview";
import { fromDhis2DeId } from "../forms/pendingDataElements";
import { validateReviewForm } from "../forms/reviewValidation";

export const DASH_FORMS: FormId[] = ["mdr", "pdr", "cdr", "mccod"];

export const FORM_LABEL: Record<FormId, string> = {
  mdr: "Maternal",
  pdr: "Perinatal",
  cdr: "Child",
  mccod: "ICD-11 certificate",
};

export const FORM_COLOR: Record<FormId, string> = {
  mdr: "#b0206a",
  pdr: "#1f7a4d",
  cdr: "#b5651d",
  mccod: "#1c5fb0",
};

export interface OuRef {
  id: string;
  name: string;
  level: number;
}

export interface RawEvent {
  event: string;
  occurredAt?: string;
  orgUnit: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  dataValues?: { dataElement: string; value: string }[];
}

export interface DashRecord {
  id: string;
  form: FormId;
  orgUnit: string;
  /** Root → this unit. */
  path: OuRef[];
  date: string;
  month: string;
  status: string;
  updatedAt: string;
  caseNumber: string;
  cause: string;
  /** null when certification does not apply to the form. */
  certified: boolean | null;
  overdue: boolean;
  flags: string[];
  raw: RawEvent;
}

// Data elements used by the dashboard (see registry.ts / DynamicFormStore.ts).
const FINAL_CAUSE_TEXT = "mQVAyOLbga1";
const FINAL_CAUSE_CODE = "n2mScmFMovq";
const CAUSE_A_TEXT = "sfpqAeqKeyQ";
const CAUSE_A_CODE_PDR = "zD0E77W4rFs";

export const isLinkedUid = (value: any) =>
  typeof value === "string" &&
  value.length === 11 &&
  !/^(true|false|1|0|yes|no)$/i.test(value);

const valuesOf = (ev: RawEvent) => {
  const out: Record<string, string> = {};
  for (const dv of ev.dataValues || []) out[dv.dataElement] = dv.value;
  return out;
};

/** Hard errors only — the same rules the form blocks saving on. */
export const hardFlags = (form: FormId, values: Record<string, string>): string[] => {
  if (form !== "mdr" && form !== "pdr") return [];
  try {
    const layoutKeys: Record<string, any> = {};
    Object.keys(values).forEach((uid) => (layoutKeys[fromDhis2DeId(uid)] = values[uid]));
    const messages = validateReviewForm(form, layoutKeys)
      .filter((f) => f.type === "mustCorrect")
      .map((f) => f.message);
    return Array.from(new Set(messages));
  } catch {
    return [];
  }
};

export const toRecord = (
  form: FormId,
  ev: RawEvent,
  path: OuRef[],
  today = moment()
): DashRecord => {
  const values = valuesOf(ev);
  const date = ev.occurredAt ? moment(ev.occurredAt).format("YYYY-MM-DD") : "";
  const linked = values[LINKED_DE];
  const hasCause = !!(values[FINAL_CAUSE_CODE] || values[FINAL_CAUSE_TEXT] || values[CAUSE_A_TEXT] || values[CAUSE_A_CODE_PDR]);
  let certified: boolean | null = null;
  if (form === "pdr") certified = isLinkedUid(linked);
  else if (form === "mdr") certified = isLinkedUid(linked) || hasCause;

  const status = ev.status || "";
  const overdue =
    form === "cdr" ? isChildReviewOverdue(status, values[childDateOfDeath] || "", today) : false;

  return {
    id: ev.event,
    form,
    orgUnit: ev.orgUnit,
    path,
    date,
    month: date.slice(0, 7),
    status,
    updatedAt: ev.updatedAt || ev.createdAt || "",
    caseNumber: (values[CASE_NUMBER_DE] || "").trim(),
    cause: (values[FINAL_CAUSE_TEXT] || values[CAUSE_A_TEXT] || "").trim(),
    certified,
    overdue,
    flags: hardFlags(form, values),
    raw: ev,
  };
};

// --- Filters -----------------------------------------------------------------

export type AttentionKind = "certify" | "drafts" | "overdue" | "flags";
export type StatusFilter = "all" | "completed" | AttentionKind;

export interface RecordFilters {
  forms: FormId[];
  /** YYYY-MM, set by clicking a column in the trend chart. */
  month?: string | null;
  status: StatusFilter;
  search: string;
}

/**
 * Only the child review has a draft state (see DynamicFormStore.save). Older
 * maternal, perinatal and certificate events can also be ACTIVE in DHIS2 but
 * are finished records, so they are not drafts.
 */
export const isDraft = (r: DashRecord) => r.form === "cdr" && r.status === "ACTIVE";
export const needsCertification = (r: DashRecord) => r.certified === false;
export const needsAttention = (r: DashRecord) =>
  needsCertification(r) || isDraft(r) || r.overdue || r.flags.length > 0;

export const matchesStatus = (r: DashRecord, status: StatusFilter) => {
  switch (status) {
    case "completed":
      return !isDraft(r);
    case "certify":
      return needsCertification(r);
    case "drafts":
      return isDraft(r);
    case "overdue":
      return r.overdue;
    case "flags":
      return r.flags.length > 0;
    default:
      return true;
  }
};

export const inArea = (r: DashRecord, areaId: string | null) =>
  !areaId || r.path.some((p) => p.id === areaId);

export const filterRecords = (
  records: DashRecord[],
  f: RecordFilters,
  areaId: string | null
): DashRecord[] => {
  const q = f.search.trim().toLowerCase();
  return records.filter(
    (r) =>
      f.forms.includes(r.form) &&
      inArea(r, areaId) &&
      (!f.month || r.month === f.month) &&
      matchesStatus(r, f.status) &&
      (!q || r.caseNumber.toLowerCase().includes(q) || r.path.some((p) => p.name.toLowerCase().includes(q)))
  );
};

// --- Aggregates ----------------------------------------------------------------

export interface Kpis {
  total: number;
  completed: number;
  certify: number;
  drafts: number;
  overdue: number;
  flags: number;
}

export const computeKpis = (records: DashRecord[]): Kpis => ({
  total: records.length,
  completed: records.filter((r) => !isDraft(r)).length,
  certify: records.filter(needsCertification).length,
  drafts: records.filter(isDraft).length,
  overdue: records.filter((r) => r.overdue).length,
  flags: records.filter((r) => r.flags.length > 0).length,
});

export const monthsBetween = (from: moment.Moment, to: moment.Moment): string[] => {
  const out: string[] = [];
  const cursor = from.clone().startOf("month");
  const end = to.clone().startOf("month");
  while (!cursor.isAfter(end) && out.length < 120) {
    out.push(cursor.format("YYYY-MM"));
    cursor.add(1, "month");
  }
  return out;
};

export const trendByMonth = (records: DashRecord[], months: string[], forms: FormId[]) =>
  forms.map((form) => ({
    form,
    data: months.map((m) => records.filter((r) => r.form === form && r.month === m).length),
  }));

export interface AreaRow {
  id: string;
  name: string;
  level: number;
  /** True when no deeper level exists below this unit in the loaded data. */
  leaf: boolean;
  counts: Record<FormId, number>;
  total: number;
  attention: number;
}

const emptyCounts = (): Record<FormId, number> => ({ mdr: 0, pdr: 0, cdr: 0, mccod: 0 });

/**
 * Break the records under `areaId` down by the next level of the hierarchy.
 * `known` adds units that have no records yet so they still show up with zeros.
 */
export const breakdownByChild = (
  records: DashRecord[],
  areaId: string | null,
  known: (OuRef & { leaf?: boolean })[] = []
): AreaRow[] => {
  const rows = new Map<string, AreaRow>();
  const hasDeeper = new Set<string>();
  const ensure = (ref: OuRef, leaf: boolean) => {
    let row = rows.get(ref.id);
    if (!row) {
      row = { id: ref.id, name: ref.name, level: ref.level, leaf, counts: emptyCounts(), total: 0, attention: 0 };
      rows.set(ref.id, row);
    }
    return row;
  };
  for (const r of records) {
    r.path.forEach((p, i) => {
      if (i < r.path.length - 1) hasDeeper.add(p.id);
    });
    let child: OuRef | undefined;
    if (!areaId) child = r.path[0];
    else {
      const at = r.path.findIndex((p) => p.id === areaId);
      if (at < 0) continue;
      child = r.path[at + 1];
    }
    if (!child) continue; // the record sits on the area itself
    const row = ensure(child, true);
    row.counts[r.form] += 1;
    row.total += 1;
    if (needsAttention(r)) row.attention += 1;
  }
  known.forEach((k) => ensure(k, k.leaf === true));
  // A unit with something deeper below it can be opened.
  rows.forEach((row) => {
    if (hasDeeper.has(row.id)) row.leaf = false;
  });
  return Array.from(rows.values());
};

export const topCauses = (records: DashRecord[], limit = 10) => {
  const counts = new Map<string, { label: string; n: number }>();
  for (const r of records) {
    if (!r.cause) continue;
    const key = r.cause.toLowerCase();
    const hit = counts.get(key);
    if (hit) hit.n += 1;
    else counts.set(key, { label: r.cause, n: 1 });
  }
  return Array.from(counts.values())
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .slice(0, limit);
};

export const queueFor = (records: DashRecord[], kind: AttentionKind) => {
  const pick: Record<AttentionKind, (r: DashRecord) => boolean> = {
    certify: needsCertification,
    drafts: isDraft,
    overdue: (r) => r.overdue,
    flags: (r) => r.flags.length > 0,
  };
  return records
    .filter(pick[kind])
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
};

// --- Periods -------------------------------------------------------------------

export type PeriodPreset = "month" | "quarter" | "year" | "lastYear" | "custom";

export const periodRange = (
  preset: PeriodPreset,
  custom?: [moment.Moment, moment.Moment] | null,
  now = moment()
): [moment.Moment, moment.Moment] => {
  switch (preset) {
    case "month":
      return [now.clone().startOf("month"), now.clone().endOf("day")];
    case "quarter":
      return [now.clone().subtract(2, "months").startOf("month"), now.clone().endOf("day")];
    case "lastYear":
      return [now.clone().subtract(1, "year").startOf("year"), now.clone().subtract(1, "year").endOf("year")];
    case "custom":
      if (custom) return [custom[0].clone().startOf("day"), custom[1].clone().endOf("day")];
      return [now.clone().startOf("year"), now.clone().endOf("day")];
    default:
      return [now.clone().startOf("year"), now.clone().endOf("day")];
  }
};

// --- Hierarchy -------------------------------------------------------------------

/** Keep only the roots that are not inside another root. */
export const outermostRoots = (units: (OuRef & { path?: string })[]): OuRef[] => {
  const unique = new Map<string, OuRef & { path?: string }>();
  units.forEach((u) => unique.set(u.id, u));
  const all = Array.from(unique.values());
  return all
    .filter(
      (u) => !all.some((o) => o.id !== u.id && !!o.path && !!u.path && u.path.startsWith(o.path + "/"))
    )
    .map(({ id, name, level }) => ({ id, name, level }));
};

/** Turn an API org unit (with ancestors) into a root → unit path, cut at `rootId`. */
export const pathFromAncestors = (
  ou: { id: string; displayName: string; level: number; ancestors?: { id: string; displayName: string; level: number }[] },
  rootIds: string[]
): OuRef[] => {
  const chain: OuRef[] = [...(ou.ancestors || [])]
    .sort((a, b) => a.level - b.level)
    .map((a) => ({ id: a.id, name: a.displayName, level: a.level }));
  chain.push({ id: ou.id, name: ou.displayName, level: ou.level });
  const rootAt = chain.findIndex((c) => rootIds.includes(c.id));
  return rootAt > 0 ? chain.slice(rootAt) : chain;
};
