import { action, observable, runInAction } from "mobx";
import moment from "moment";
import { notification } from "antd";
import { store as mainStore } from "../Store";
import { FormDefinition } from "./types";
import { answered, ChildFieldIds, childDateOfDeath, childDerivedValues, childFields, extendChildLayout, isPendingChildField, resolveChildFields, validateChildReview } from "./childReview";
import { computeSkipState, isNo, isYes, MDR_ADMISSION, MDR_DEATH, MDR_STAY, maternalPregnancyOutcome, stayDuration } from "./skipLogic";
import {
  fromDhis2DeId,
  isMappedPendingDe,
  mappedPendingUids,
  PENDING_DATA_ELEMENTS,
  toDhis2DeId,
} from "./pendingDataElements";
import { mustCorrectFlags, validateReviewForm } from "./reviewValidation";
import { resolveEventAttributeOptionCombo } from "./trackerCategory";
import { CERTIFICATE_PLACE_OF_DEATH } from "./registry";

export const MATERNAL_TO_MCCOD_MAP: Record<string, string> = {
  "CupbOInqvJI": "MOstDqSY0gO", // National ID
  "FIfoObQJvNp": "ZYKmQ9GPOaF", // Full Name
  "iJqBq0kQtWO": "q7e7FOXKnOf", // Age
  "BRtcz4HV7Ak": "FGagV1Utrdh", // Inpatient Number
  "hcu4LCAMSkz": "dsiwvNQLe5n", // Village
  "FHmHV9mElbD": "t5nTEmlScSt", // District
  "ioXkKfrgCJa": "u44XP9fZweA", // Subcounty
  "itNUbtIXfCT": "ZKBE8Xm9DJG", // MoH Case Number
  "ByIsCiqkq4v": "ymyLrfEcYkD", // Parity
  "jdxl2rdeDEk": "lQ1Byr04JTx", // Weeks of Pregnancy
  "WzauwhVOwM0": "i8rrl8YWxLF", // Date and Time of Death
  "eJwpqR9t7YM": "RJhbkjYrODG", // Referred From
  "uFoaTRJ16Ch": "gNM2Yhypydx", // Manner of Death - Accident
  "K4FUK590rIU": "KsGOxFyzIs1", // Manner of Death - Assault
  "AqXDMjrPUEE": "Z41di0TRjIu", // Place of Delivery
  "NEW_mdr_autopsy_requested": "jY3K6Bv4o9Q", // Autopsy Requested (Yes/No/Unknown)
};

/** MCH020 place of delivery → MCCOD "Place of delivery" option. */
export const certificatePlaceOfDelivery = (place: any): string => {
  const text = String(place ?? "").trim();
  if (/^tba$/i.test(text)) return "TBA";
  if (/^home$/i.test(text)) return "Home";
  if (/on the way|in transit/i.test(text)) return "In Transit";
  if (/know|^other$/i.test(text)) return "Don't Know";
  return "Health Facility";
};

export const CDR_TO_MCCOD_MAP: Record<string, string> = {
  "ZKBE8Xm9DJG": "ZKBE8Xm9DJG", // MoH Case Number
  "GTI7EqoQokL": "ZYKmQ9GPOaF", // Child's Name / Initials -> Deceased Name
  "Hq6GGFTlHHj": "e96GB4CXyd3", // Sex
  "FA5JmqKlrUT": "zwKo51BEayZ", // Residence Village -> Village
  "Q6LIN4M0CU2": "u44XP9fZweA", // Residence Subcounty -> Subcounty
  "xv0FATnFVms": "t5nTEmlScSt", // Residence District -> District
  "mfR5fhnOQTA": "i8rrl8YWxLF", // Date of Death -> Date and Time of Death
  "VdxRWEF4UPB": "xNCSFrgdUgi", // Place of Death -> Place of Death
  "yNsiNIq5D59": "QDHeWslaEoH", // Was Child Referred -> Referred
  "xOyckoyi422": "WqYvFt79TQB", // Referred From Facility -> Referred From
  "ugiAlde4VrW": "xAWYJtQsg8M", // Birth Weight -> Birth Weight (grams)
  "waxR2t677eo": "Z41di0TRjIu", // Place of Delivery -> Place of Delivery
};

export const PERINATAL_TO_MCCOD_MAP: Record<string, string> = {
  "ZKBE8Xm9DJG": "ZKBE8Xm9DJG", // Case Number -> MoH Case Number
  "NEW_pdr_mother_nin": "MOstDqSY0gO", // Mother NIN -> National ID
  "H34bcwaOliX": "FGagV1Utrdh", // IP Number (Newborn) -> Inpatient Number
  "xpJgWYFpvht": "ZYKmQ9GPOaF", // Mother's Initials -> Full Name
  "ZBvxrMFv9aW": "e96GB4CXyd3", // Sex of Baby -> Sex
  "RpkIvgOOZJt": "RbrUuKFSqkZ", // Date and Time of Delivery -> Date of Birth
  "rjoVXlCWLYM": "TgFI46omIEg", // Age in Minutes -> Age in minutes
  "rDI0uhcVLAk": "VJXpmHCaAFG", // Age in Hours -> Age in hours
  "quKRjZzkSRA": "v8mvHHXo06E", // Age in Days -> Age in days
  "m8jUvzBgYga": "lQ1Byr04JTx", // Weeks of pregnancy / amenorrhea -> Completed weeks of pregnancy
  "hTYVRRvhYEt": "DdfDMFW4EJ9", // Mother's Age (years) -> Age of mother (years)
  "dKQIx7sVFbD": "bNpMzyShDCX", // Parish -> Residence-Parish
  "T0f4UTwxd6Q": "dsiwvNQLe5n", // Village -> Village / Occupation
  "t5nTEmlScSt": "t5nTEmlScSt", // District -> District
  "u44XP9fZweA": "u44XP9fZweA", // Subcounty -> Subcounty
  "Dq9aH0aZ2wb": "i8rrl8YWxLF", // Date and Time of Death -> Date and time of Death
  "ZkNDFfFSTYg": "ZkNDFfFSTYg", // Linked status -> Linked
};

export function generateDhis2Uid() {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let uid = letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 10; i++) {
    uid += allowed.charAt(Math.floor(Math.random() * allowed.length));
  }
  return uid;
}

export function isMoment(v: any): boolean {
  return !!(v && (moment.isMoment(v) || typeof v.format === "function" || v._isAMomentObject));
}

export interface DeMeta {
  id: string;
  name: string;
  valueType: string;
  options?: { code: string; name: string }[];
}

/**
 * Store for the config-driven death-review forms (MDR / PDR / CDR).
 * It reuses the DHIS2 engine + org unit data held by the main store,
 * but keeps all multi-form logic isolated so the legacy MCCOD flow is
 * untouched.
 */
// MCCOD data elements used by the WHO DORIS underlying-cause computation.
const MCCOD = {
  codeA: "zD0E77W4rFs",
  codeB: "tuMMQsGtE69",
  codeC: "C8n6hBilwsX",
  codeD: "IeS8V8Yf40N",
  intervalA: "WkXxkKEJLsg",
  intervalB: "fleGy9CvHYh",
  intervalC: "hO8No9fHVd2",
  intervalD: "eCVDO6lt4go",
  sex: "e96GB4CXyd3",
  age: "q7e7FOXKnOf",
  dob: "RbrUuKFSqkZ",
  dod: "i8rrl8YWxLF",
  wasPregnant: "zcn7acUB6x1",
  pregContribute: "AJAraEcfH63",
  pregTime: "KpfvNQSsWIw",
  dorisText: "tKezaEs8Ez5",
  dorisCode: "LAvyxs29laJ",
  finalText: "mQVAyOLbga1",
  finalCode: "n2mScmFMovq",
};

class DynamicFormStore {
  @observable activeForm: FormDefinition | null = null;
  @observable program: string | null = null;
  @observable meta: Record<string, DeMeta> = {};
  @observable loadingMeta = false;
  @observable saving = false;
  @observable computingDoris = false;
  @observable dorisReport = "";
  @observable currentEvent: any = null;
  @observable mccodEventUid: string | null = null;
  @observable defaultValues: Record<string, any> = {};
  @observable records: any[] = [];
  @observable loadingRecords = false;
  @observable recordLoadError = "";
  private recordRequest = 0;
  @observable maternalCaseNumbers: Set<string> = new Set();
  @observable perinatalCaseNumbers: Set<string> = new Set();
  @observable childCaseNumbers: Set<string> = new Set();
  @observable pendingEditEvent: any = null;
  /** Data element ids that actually belong to the active program stage. */
  stageDataElements: Set<string> = new Set();
  @observable childFieldIds: ChildFieldIds = {};
  private pendingChildEvent: { event: string; caseNumber: string; orgUnit: string } | null = null;

  private get engine() {
    return mainStore.engine;
  }

  @action reset = () => {
    this.clearRecordList();
    this.activeForm = null;
    this.program = null;
    this.meta = {};
    this.currentEvent = null;
    this.mccodEventUid = null;
    this.defaultValues = {};
  };

  @action openForm = async (def: FormDefinition) => {
    this.clearRecordList();
    this.activeForm = def;
    this.childFieldIds = {};
    this.pendingChildEvent = null;
    this.currentEvent = null;
    this.defaultValues = {};
    this.program = def.program ?? null;
    await this.loadMeta(def);
  };

  private clearRecordList() {
    this.recordRequest++;
    this.records = [];
    this.loadingRecords = false;
    this.recordLoadError = "";
    this.maternalCaseNumbers = new Set();
    this.perinatalCaseNumbers = new Set();
    this.childCaseNumbers = new Set();
  }

  private fetchTrackerEvents(url: string) {
    return this.engine.link.fetch(url, { cache: "no-store", redirect: "error" });
  }

  /** All real DHIS2 data element UIDs referenced by a form's layout (incl. mapped placeholders). */
  private layoutDataElementIds = (def: FormDefinition): string[] => {
    const UID = /^[A-Za-z][A-Za-z0-9]{10}$/;
    const set = new Set<string>();
    for (const section of def.layout) {
      for (const group of section.groups) {
        for (const f of group.fields) {
          [f.de, f.codeField, f.uriField].forEach((id) => {
            if (!id) return;
            const resolved = toDhis2DeId(id);
            if (UID.test(resolved)) set.add(resolved);
          });
        }
      }
    }
    for (const uid of mappedPendingUids()) set.add(uid);
    return Array.from(set);
  };

  /** Fallback meta for unmapped NEW_* placeholders (UI-only until UIDs are pasted). */
  private pendingFallbackMeta = (): Record<string, DeMeta> => {
    const meta: Record<string, DeMeta> = {};
    for (const de of PENDING_DATA_ELEMENTS) {
      meta[de.placeholder] = {
        id: de.placeholder,
        name: de.name,
        valueType: de.valueType === "TRUE_ONLY" ? "TRUE_ONLY" : de.valueType,
        options: de.options,
      };
    }
    return meta;
  };

  /** Resolve the owning program + metadata for every field the form renders. */
  @action loadMeta = async (def: FormDefinition) => {
    this.loadingMeta = true;
    try {
      // Resolve the owning program + the stage's own data elements (used to
      // keep the save payload valid — fields drawn from other programs, like
      // the shared ICD-11 cause section, are shown but not sent to this stage).
      this.stageDataElements = new Set();
      let childFieldIds: ChildFieldIds = {};
      if (def.programStage) {
        try {
          const elementFields = def.id === "cdr" ? "id,code,valueType,optionSet[options[code]]" : "id";
          const stageRes: any = await this.engine.link.fetch(
            `/api/programStages/${def.programStage}.json?fields=program[id],programStageDataElements[dataElement[${elementFields}]]`
          );
          this.program = stageRes?.program?.id ?? def.program ?? null;
          (stageRes?.programStageDataElements || []).forEach((psde: any) => {
            if (psde?.dataElement?.id)
              this.stageDataElements.add(psde.dataElement.id);
          });
          if (def.caseNumberField) this.stageDataElements.add(def.caseNumberField);
          this.stageDataElements.add("ZKBE8Xm9DJG");
          if (def.id === "cdr") {
            childFieldIds = resolveChildFields((stageRes?.programStageDataElements || [])
              .map((entry: any) => entry.dataElement));
          }
        } catch (e) {
          this.program = def.program ?? null;
        }
      } else {
        this.program = def.program ?? null;
      }

      // Load metadata for EVERY data element in the layout — not just those on
      // the program stage — so fields drawn from other programs (e.g. the MCCOD
      // cause-of-death section embedded in a review) get the correct widget
      // (date pickers, dropdowns) instead of a plain text box.
      const ids = Array.from(new Set([...this.layoutDataElementIds(def), ...Object.values(childFieldIds)]));
      const meta: Record<string, DeMeta> = {};
      const CHUNK = 50;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const url =
          `/api/dataElements.json?paging=false&fields=` +
          `id,name,valueType,optionSet[options[code,name,sortOrder]]` +
          `&filter=id:in:[${chunk.join(",")}]`;
        try {
          const res: any = await this.engine.link.fetch(url);
          (res.dataElements || []).forEach((de: any) => {
            // Present option choices in their defined DHIS2 order.
            const options = (de.optionSet?.options || [])
              .slice()
              .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((o: any) => ({ code: o.code, name: o.name }));
            meta[de.id] = {
              id: de.id,
              name: de.name,
              valueType: de.valueType,
              options: options.length ? options : undefined,
            };
          });
        } catch (e) {
          console.log("loadMeta chunk error", e);
        }
      }
      // Alias mapped placeholder keys to the fetched DHIS2 meta so widgets keep
      // working while layouts still use NEW_* ids. If the live DE has no option
      // set yet, keep the catalog fallback choices (blood group, legibility, etc.).
      const fallback = this.pendingFallbackMeta();
      for (const de of PENDING_DATA_ELEMENTS) {
        const uid = toDhis2DeId(de.placeholder);
        if (uid !== de.placeholder && meta[uid]) {
          const live = meta[uid];
          const options =
            live.options && live.options.length
              ? live.options
              : fallback[de.placeholder]?.options;
          meta[uid] = { ...live, options };
          meta[de.placeholder] = { ...live, id: de.placeholder, options };
        }
      }

      // Presentation overrides declared on the layout (date pickers for text
      // DEs, tick boxes, Yes/No pairs, fixed choice lists).
      const YES_NO = [{ code: "Yes", name: "Yes" }, { code: "No", name: "No" }];
      for (const section of def.layout) {
        for (const group of section.groups) {
          for (const field of group.fields) {
            if (!field.widget && !field.options) continue;
            const base: DeMeta = meta[field.de] ?? { id: field.de, name: field.label, valueType: "TEXT" };
            let next: DeMeta = { ...base };
            if (field.widget === "date") next.valueType = "DATE";
            if (field.widget === "checkbox") next.valueType = "TRUE_ONLY";
            if (field.widget === "yesNo" || field.widget === "yesNoCheck") next.options = YES_NO;
            if (field.options) next.options = field.options;
            meta[field.de] = next;
          }
        }
      }

      runInAction(() => {
        this.meta = { ...fallback, ...meta };
        this.childFieldIds = resolveChildFields(Object.entries(childFieldIds).map(([key, id]) => ({
          ...meta[id],
          code: childFields[key as keyof ChildFieldIds].code,
          optionSet: { options: meta[id]?.options || [] },
        })));
      });
    } catch (e) {
      console.log("loadMeta error", e);
    } finally {
      runInAction(() => (this.loadingMeta = false));
    }
  };

  /**
   * Facility namespace for case numbers: the org unit's DHIS2 code when it has
   * one, else its (globally unique) UID. Most facilities in this instance have
   * no code, so the UID fallback is what actually guarantees national
   * uniqueness — the sequence itself is only computed per facility.
   */
  private ouCodeCache: Record<string, string> = {};
  private getOrgUnitCode = async (ou: string): Promise<string> => {
    if (this.ouCodeCache[ou]) return this.ouCodeCache[ou];
    let slug = ou; // full UID → unique even when the facility has no code
    try {
      const res: any = await this.engine.link.fetch(
        `/api/organisationUnits/${ou}.json?fields=code`
      );
      if (res?.code)
        slug = String(res.code).replace(/[^A-Za-z0-9]+/g, "").toUpperCase();
    } catch (e) {
      console.log("getOrgUnitCode error", e);
    }
    this.ouCodeCache[ou] = slug;
    return slug;
  };

  /** Numeric suffix of a case number carrying `prefix`, else 0. */
  private caseSeq = (value: string, prefix: string): number => {
    if (!value || value.indexOf(prefix) !== 0) return 0;
    const n = parseInt(value.slice(prefix.length), 10);
    return isNaN(n) ? 0 : n;
  };

  /**
   * Running prefix that namespaces a facility's sequence for this form/year,
   * e.g. "020/MRRH/2026/". The facility code makes numbers nationally unique
   * even though the sequence is only computed from events at that facility.
   */
  private caseNumberPrefix = async (def: FormDefinition): Promise<string> => {
    const ou = mainStore.selectedOrgUnit;
    const facility = ou ? await this.getOrgUnitCode(ou) : "NA";
    const code = def.caseCode || def.id.toUpperCase();
    const year = moment().format("YYYY");
    return `${code}/${facility}/${year}/`;
  };

  /**
   * Next sequential MoH case number for this form at the selected facility.
   * Scoped per facility + form + year, then re-verified as unused at save
   * time (see `save`) so no two records ever share a number.
   */
  @action generateCaseNumber = async (def: FormDefinition): Promise<string> => {
    const prefix = await this.caseNumberPrefix(def);
    const format = (n: number) => prefix + String(n).padStart(5, "0");
    try {
      const program = await this.ensureProgram(def);
      const ou = mainStore.selectedOrgUnit;
      let max = 0;
      if (program && def.programStage && ou) {
        const url =
          `/api/tracker/events?program=${program}` +
          `&programStage=${def.programStage}` +
          `&orgUnit=${ou}&orgUnitMode=SELECTED` +
          `&filter=${def.caseNumberField}:LIKE:${encodeURIComponent(prefix.replace(/[/:]/g, (character) => "/" + character))}` +
          `&order=createdAt:desc&pageSize=200` +
          `&fields=event,dataValues[dataElement,value]`;
        const res: any = await this.fetchTrackerEvents(url);
        (res?.events || []).forEach((ev: any) => {
          const seq = this.caseSeq(
            this.recordValue(ev, def.caseNumberField),
            prefix
          );
          if (seq > max) max = seq;
        });
      }
      return format(max + 1);
    } catch (e) {
      console.log("generateCaseNumber error", e);
      // Never block record creation: fall back to a unique time-based suffix.
      return format(Number(String(Date.now()).slice(-5)));
    }
  };

  /** Look up an existing review event by its case number for editing. */
  @action findByCaseNumber = async (def: FormDefinition, caseNo: string) => {
    const orgUnit = mainStore.selectedOrgUnit;
    if (!caseNo || !this.program || !orgUnit) return null;
    try {
      const url =
        `/api/tracker/events?program=${this.program}` +
        `&programStage=${def.programStage}` +
        `&orgUnit=${orgUnit}&orgUnitMode=SELECTED` +
        `&filter=${def.caseNumberField}:EQ:${encodeURIComponent(caseNo.replace(/[/:]/g, (character) => "/" + character))}` +
        `&fields=event,orgUnit,occurredAt,dataValues[dataElement,value]&pageSize=1`;
      const res: any = await this.fetchTrackerEvents(url);
      return res?.events?.[0] ? { ...res.events[0], eventDate: res.events[0].occurredAt } : null;
    } catch (e) {
      console.log("findByCaseNumber error", e);
      return null;
    }
  };

  @action fetchMccodEventForCase = async (caseNumberFieldUid: string, caseNumber: string, orgUnit = mainStore.selectedOrgUnit, requireResult = false) => {
    if (!caseNumber || !caseNumberFieldUid || !orgUnit) return null;
    try {
      console.log(`[MCCOD Sync] Searching for case number: ${caseNumber}`);
      const url =
        `/api/tracker/events?program=vf8dN49jprI&programStage=aKclf7Yl1PE` +
        `&orgUnit=${orgUnit}&orgUnitMode=SELECTED` +
        `&filter=${caseNumberFieldUid}:EQ:${encodeURIComponent(caseNumber.replace(/[/:]/g, (character) => "/" + character))}` +
        `&fields=event,dataValues[dataElement,value]&pageSize=1`;
      const res: any = await this.fetchTrackerEvents(url);
      if (!Array.isArray(res?.events)) throw new Error("Could not read existing ICD-11 certificates.");
      const ev = res?.events?.[0] ?? null;
      if (ev) {
        let cleanEvUid = ev.event;
        if (cleanEvUid && typeof cleanEvUid === "string" && cleanEvUid.includes(":")) {
          cleanEvUid = cleanEvUid.split(":")[0];
        }
        runInAction(() => {
          this.mccodEventUid = cleanEvUid;
        });
        const mapped: Record<string, any> = {};
        (ev.dataValues || []).forEach((dv: any) => {
          mapped[dv.dataElement] = dv.value;
        });
        return mapped;
      }
      console.log(`[MCCOD Sync] No existing MCCOD event found for case: ${caseNumber}`);
      return null;
    } catch (e) {
      if (requireResult) throw e;
      console.log("fetchMccodEventForCase error", e);
      return null;
    }
  };

  /** Resolve (and cache) the DHIS2 program that owns this form's stage. */
  @action private ensureProgram = async (
    def: FormDefinition
  ): Promise<string | null> => {
    if (this.program) return this.program;
    if (def.program) {
      this.program = def.program;
      return this.program;
    }
    if (!def.programStage) return null;
    try {
      const stageRes: any = await this.engine.link.fetch(
        `/api/programStages/${def.programStage}.json?fields=program[id]`
      );
      const pid = stageRes?.program?.id ?? null;
      runInAction(() => (this.program = pid));
      return pid;
    } catch (e) {
      console.log("ensureProgram error", e);
      return null;
    }
  };

  private fetchCaseLinks = async (programStage: string, orgUnit: string) => {
    const stage = await this.engine.link.fetch(`/api/programStages/${programStage}.json?fields=program[id]`);
    if (!stage?.program?.id) return { events: [] };
    return this.fetchTrackerEvents(
      `/api/tracker/events?program=${stage.program.id}&programStage=${programStage}` +
      `&orgUnit=${orgUnit}&orgUnitMode=SELECTED&fields=dataValues[dataElement,value]&pageSize=500`
    );
  };

  private importTrackerEvent = async ({ eventDate, ...event }: any) => {
    const attributeOptionCombo = await resolveEventAttributeOptionCombo(
      (url) => this.engine.link.fetch(url, { cache: "no-store" }),
      event.program,
      mainStore.selectedNationality
    );
    const dataValues = event.dataValues.flatMap(({ dataElement, value }: any) => {
      if (this.meta[dataElement]?.valueType === "TRUE_ONLY" && /^(false|0)$/i.test(String(value))) {
        const previouslyChecked = this.currentEvent?.event === event.event &&
          this.recordValue(this.currentEvent, dataElement) === "true";
        return previouslyChecked ? [{ dataElement, value: null }] : [];
      }
      return [{ dataElement, value: value == null ? null : String(value) }];
    });
    const result = await this.engine.mutate({
      type: "create",
      resource: "tracker",
      params: { async: false, importStrategy: "CREATE_AND_UPDATE" },
      data: { events: [{ ...event, occurredAt: eventDate + "T00:00:00.000",
        ...(attributeOptionCombo ? { attributeOptionCombo } : {}),
        dataValues,
      }] },
    });
    const report = result?.response ?? result;
    if (report?.status === "ERROR") {
      throw new Error(report.validationReport?.errorReports?.map((error: any) => error.message).join("; ") || "DHIS2 rejected the event.");
    }
  };

  /** Load the most recent events for this form at the selected org unit. */
  @action loadRecords = async (def: FormDefinition) => {
    if (this.activeForm?.id !== def.id) return;
    this.clearRecordList();
    const request = this.recordRequest;
    const orgUnit = mainStore.selectedOrgUnit;
    const program = await this.ensureProgram(def);
    if (request !== this.recordRequest) return;
    if (!def.programStage || !program || !orgUnit) {
      // Nothing to load yet — surface *why* so an empty list is diagnosable.
      console.log("loadRecords skipped", {
        form: def.id,
        programStage: def.programStage,
        program,
        orgUnit,
      });
      runInAction(() => (this.records = []));
      return;
    }
    runInAction(() => (this.loadingRecords = true));
    try {
      const url =
        `/api/tracker/events?program=${program}` +
        `&programStage=${def.programStage}` +
        `&orgUnit=${orgUnit}&orgUnitMode=SELECTED` +
        `&order=occurredAt:desc&pageSize=100` +
        `&fields=event,occurredAt,orgUnit,status,updatedAt,` +
        `dataValues[dataElement,value]`;
      const res: any = await this.fetchTrackerEvents(url);
      if (request !== this.recordRequest) return;
      if (!Array.isArray(res?.events)) throw new Error("Unexpected Tracker event response");
      const events = res.events.map((event: any) => ({
        ...event,
        eventDate: event.occurredAt,
        lastUpdated: event.updatedAt,
        orgUnitName: mainStore.selectedOrgUnitName,
      }));
      console.log(
        `loadRecords ${def.id}: ${events.length} event(s)`,
        { program, programStage: def.programStage, orgUnit }
      );
      runInAction(() => {
        this.records = events;
      });

      if (def.isMccod) {
        // Fetch maternal, perinatal, and child case numbers at the same org unit to identify link types
        try {
          const [matRes, periRes, childRes]: any[] = await Promise.all([
            this.fetchCaseLinks("YXed7PnLRco", orgUnit).catch(() => ({})),
            this.fetchCaseLinks("CGz50G2MY16", orgUnit).catch(() => ({})),
            this.fetchCaseLinks("lLO6f44xh4H", orgUnit).catch(() => ({}))
          ]);

          const matCases = new Set<string>();
          (matRes?.events || []).forEach((e: any) => {
            const dv = (e.dataValues || []).find((d: any) => d.dataElement === "ZKBE8Xm9DJG");
            if (dv?.value) matCases.add(dv.value.trim());
          });

          const periCases = new Set<string>();
          (periRes?.events || []).forEach((e: any) => {
            const dv = (e.dataValues || []).find((d: any) => d.dataElement === "ZKBE8Xm9DJG");
            if (dv?.value) periCases.add(dv.value.trim());
          });

          const childCases = new Set<string>();
          (childRes?.events || []).forEach((e: any) => {
            const dv = (e.dataValues || []).find((d: any) => d.dataElement === "ZKBE8Xm9DJG");
            if (dv?.value) childCases.add(dv.value.trim());
          });

          runInAction(() => {
            if (request !== this.recordRequest) return;
            this.maternalCaseNumbers = matCases;
            this.perinatalCaseNumbers = periCases;
            this.childCaseNumbers = childCases;
          });
        } catch (linkErr) {
          console.error("Failed to pre-fetch cases for linkage checking:", linkErr);
        }
      }
    } catch (e) {
      console.log("loadRecords error", e);
      runInAction(() => {
        if (request !== this.recordRequest) return;
        this.recordLoadError = "Could not load current records from DHIS2.";
      });
    } finally {
      runInAction(() => {
        if (request === this.recordRequest) this.loadingRecords = false;
      });
    }
  };

  /** Convenience: value of a data element on an event row. */
  recordValue = (event: any, de: string): string => {
    const dv = (event?.dataValues || []).find(
      (d: any) => d.dataElement === de
    );
    return dv?.value ?? "";
  };

  @action loadEventForEdit = (event: any) => {
    this.pendingChildEvent = null;
    this.currentEvent = event;
    const dv: Record<string, any> = {};
    (event?.dataValues || []).forEach((d: any) => {
      // Remap real UIDs back to NEW_* layout keys when a mapping exists.
      dv[fromDhis2DeId(d.dataElement)] = d.value;
    });

    const activeForm = this.activeForm;
    if (activeForm && activeForm.caseNumberField && !dv[activeForm.caseNumberField]) {
      // If an existing record was saved without a case number, generate one immediately
      this.generateCaseNumber(activeForm).then((code) => {
        if (code) {
          runInAction(() => {
            this.defaultValues[activeForm.caseNumberField] = code;
          });
        }
      });
    }

    this.defaultValues = dv;
    this.dorisReport = dv["W0r4m6NiLsy"] || "";

    if (activeForm && activeForm.linkedField) {
      let linkedVal = dv[activeForm.linkedField] || "";
      if (linkedVal && typeof linkedVal === "string" && linkedVal.includes(":")) {
        linkedVal = linkedVal.split(":")[0];
      }
      this.mccodEventUid = (linkedVal && linkedVal !== "true" && linkedVal !== "false" && linkedVal !== "1" && linkedVal !== "0") ? linkedVal : null;
    } else {
      this.mccodEventUid = null;
    }
  };

  @action startNew = () => {
    this.pendingChildEvent = null;
    this.currentEvent = null;
    this.defaultValues = {};
    this.mccodEventUid = null;
  };

  /** Replace the choice list for one field (used for cascading address pickers). */
  @action setFieldOptions = (de: string, options: { code: string; name: string }[]) => {
    const current: DeMeta = this.meta[de] ?? { id: de, name: de, valueType: "TEXT" };
    this.meta = { ...this.meta, [de]: { ...current, options } };
  };

  @action setDefaults = (values: Record<string, any>) => {
    this.defaultValues = values;
  };

  /** Persist the review event to DHIS2 (create or update). */
  @action save = async (values: Record<string, any>, mode: "complete" | "draft" | "certify" = "complete"): Promise<boolean> => {
    const def = this.activeForm;
    if (!def) return false;
    const isDraft = def.id === "cdr" && mode === "draft";
    const certifyPerinatal = def.id === "pdr" && mode === "certify";
    if (isDraft && this.currentEvent?.status === "COMPLETED") return false;
    if (!this.program) {
      notification.error({
        message: "Cannot save",
        description: def.placeholder
          ? "This form's data elements have not been mapped to DHIS2 yet."
          : "The program for this form could not be resolved.",
        duration: 4,
      });
      return false;
    }
    const orgUnit = ((def.id === "cdr" || def.id === "pdr") && this.currentEvent?.orgUnit) || mainStore.selectedOrgUnit;
    if (!orgUnit) {
      notification.error({ message: "Select an organisation unit first." });
      return false;
    }

    if (this.saving) return false;
    if (certifyPerinatal) {
      const savedCase = this.recordValue(this.currentEvent, def.caseNumberField);
      if (!this.currentEvent?.event || !savedCase) {
        notification.error({ message: "Save the perinatal death review before certifying the cause of death." });
        return false;
      }
      if (!answered(values.zD0E77W4rFs)) {
        notification.error({ message: "Select an ICD-11 code for the direct cause of death before certifying." });
        return false;
      }
      if (!answered(values[CERTIFICATE_PLACE_OF_DEATH])) {
        notification.error({ message: "Enter Place of death in ICD-11 certificate details before certifying." });
        return false;
      }
      values = { ...values, [def.caseNumberField]: savedCase };
    }
    if (def.id === "mdr") {
      // DHIS2 requires an outcome. When no delivery took place the question is
      // closed, so record the matching outcome automatically.
      if (!answered(values[maternalPregnancyOutcome]) && isNo(values, "PbayNOhXnyx", this.meta)) {
        values = { ...values, [maternalPregnancyOutcome]: "Not Delivered" };
      }
      // Stored duration of stay always follows admission and death.
      const stay = stayDuration(values[MDR_ADMISSION], values[MDR_DEATH]);
      if (stay) MDR_STAY.forEach((de, i) => { values = { ...values, [de]: stay[i] }; });
      if (!answered(values[maternalPregnancyOutcome])) {
        notification.error({ message: "Select the outcome of pregnancy in Section 5 before saving." });
        return false;
      }
    }
    if (def.id === "mdr" || def.id === "pdr") {
      const hidden = computeSkipState(def.id, def, values, this.meta).hiddenFields;
      const blockers = mustCorrectFlags(validateReviewForm(def.id, values, this.meta, hidden));
      if (blockers.length) {
        notification.error({
          message: "Correct the highlighted values before saving",
          description: blockers.map((f) => f.message).join(" "),
          duration: 6,
        });
        return false;
      }
    }
    if (def.id === "cdr") {
      const original: Record<string, any> = {};
      for (const entry of this.currentEvent?.dataValues || []) {
        original[entry.dataElement] = entry.value;
      }
      values = { ...original, ...values };
      const layout = extendChildLayout(def, this.childFieldIds);
      const skip = computeSkipState("cdr", layout, values, this.meta, this.childFieldIds);
      layout.layout.forEach((section, index) => {
        for (const group of section.groups) {
          for (const { de } of group.fields) {
            if ((skip.hiddenSections.has(index) || skip.hiddenFields.has(de)) &&
              !answered(values[de]) && answered(original[de])) {
              values[de] = original[de];
            }
          }
        }
      });
      values = { ...values, ...childDerivedValues(values, this.childFieldIds) };
      const errors = validateChildReview(values, this.childFieldIds, (de) => isYes(values, de, this.meta), original, !isDraft);
      if (errors.length) {
        notification.error({ message: "Check the child death review", description: errors.join(" ") });
        return false;
      }
    }

    this.saving = true;
    try {
      const existingEventUid = this.currentEvent?.event;
      if (def.id === "cdr" && existingEventUid) {
        const savedCase = this.recordValue(this.currentEvent, def.caseNumberField);
        if (savedCase) values = { ...values, [def.caseNumberField]: savedCase };
      }
      // For brand-new records, guarantee the sequential case number is still
      // free right before persisting; if a concurrent save claimed it, roll to
      // the next available number so two records can never share one.
      const pendingChild = def.id === "cdr" && this.pendingChildEvent;
      if (!existingEventUid && pendingChild) {
        if (pendingChild.orgUnit !== orgUnit) {
          notification.error({ message: "Return to the original facility to retry this review." });
          return false;
        }
        values = { ...values, [def.caseNumberField]: pendingChild.caseNumber };
      } else if (!existingEventUid && def.caseNumberField) {
        let caseNo = values[def.caseNumberField];
        if (!caseNo) {
          caseNo = await this.generateCaseNumber(def);
        }
        for (
          let i = 0;
          caseNo && i < 8 && (await this.findByCaseNumber(def, caseNo));
          i++
        ) {
          caseNo = await this.generateCaseNumber(def);
        }
        if (caseNo) {
          values = { ...values, [def.caseNumberField]: caseNo };
        }
      }
      if (def.id === "cdr" && !existingEventUid && !values[def.caseNumberField]) {
        notification.error({ message: "Could not assign the child death review case number." });
        return false;
      }

      const dataValues = Object.entries(values)
        // Drop unmapped NEW_* placeholders (they are not DHIS2 DEs yet).
        // Mapped placeholders are rewritten to real UIDs below and kept.
        .filter(([de]) => !isPendingChildField(de) && (isMappedPendingDe(de) || !de.startsWith("NEW_")))
        .filter(
          ([de, v]) =>
            (def.id === "cdr" && v === null && Object.values(this.childFieldIds).includes(de)) ||
            (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
        )
        .map(([de, value]) => [toDhis2DeId(de), value] as [string, any])
        // Only send data elements that belong to this program stage (always keep case number).
        .filter(
          ([de]) =>
            de === def.caseNumberField ||
            de === "ZKBE8Xm9DJG" ||
            this.stageDataElements.size === 0 ||
            this.stageDataElements.has(de)
        )
        .map(([dataElement, value]) => {
          let out: any = value;
          // Multi-select → comma-joined option codes.
          if (Array.isArray(value)) out = value.join(",");
          if (isMoment(value)) {
            const vt = this.meta[fromDhis2DeId(dataElement)]?.valueType || this.meta[dataElement]?.valueType;
            out =
              vt === "DATETIME"
                ? moment(value).format("YYYY-MM-DDTHH:mm:ss.SSS")
                : vt === "TIME"
                ? moment(value).format("HH:mm")
                : moment(value).format("YYYY-MM-DD");
          }
          if (typeof out === "boolean") out = out ? "true" : "false";
          return { dataElement, value: out };
        });

      // An answer that was cleared (or closed by skip logic) must also leave
      // DHIS2: send an explicit delete for each stored value now empty.
      if ((def.id === "mdr" || def.id === "pdr") && existingEventUid) {
        const sending = new Set(dataValues.map((entry: any) => entry.dataElement));
        for (const [key, v] of Object.entries(values)) {
          const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
          if (!empty || key === def.caseNumberField) continue;
          if (isPendingChildField(key) || (key.startsWith("NEW_") && !isMappedPendingDe(key))) continue;
          const dataElement = toDhis2DeId(key);
          if (sending.has(dataElement)) continue;
          if (this.stageDataElements.size > 0 && !this.stageDataElements.has(dataElement)) continue;
          const stored = this.recordValue(this.currentEvent, dataElement);
          if (stored === undefined || stored === null || stored === "") continue;
          dataValues.push({ dataElement, value: null });
        }
      }

      const event: any = {
        program: this.program,
        programStage: def.programStage,
        orgUnit,
        eventDate: this.deriveEventDate(values),
        status: isDraft ? "ACTIVE" : "COMPLETED",
        dataValues,
      };
      if (existingEventUid) event.event = existingEventUid;
      else {
        event.event = pendingChild ? pendingChild.event : generateDhis2Uid();
        if (def.id === "cdr") this.pendingChildEvent = { event: event.event, caseNumber: values[def.caseNumberField], orgUnit };
      }

      if (!certifyPerinatal) {
        await this.importTrackerEvent(event);
        runInAction(() => {
          if (def.id === "cdr") this.pendingChildEvent = null;
          this.currentEvent = { ...this.currentEvent, ...event };
        });
      }
      if (isDraft) {
        notification.success({ message: "Child death review draft saved" });
        return true;
      }

      const mccodSection = def.layout.find((s: any) =>
        s.title.toUpperCase().includes("CERTIFIED CAUSE OF DEATH") ||
        s.title.toUpperCase().includes("CASES OF DEATH (FRAME A)") ||
        s.title.toUpperCase().includes("CAUSE OF DEATH (FRAME A)")
      );
      if (!def.isMccod && (def.id !== "pdr" || certifyPerinatal) &&
        mccodSection && def.caseNumberField && values[def.caseNumberField] &&
        (def.id !== "cdr" || values.sfpqAeqKeyQ)) {
        const mccodDataValues: any[] = [];
        
        const mccodElements = [
          "ZKBE8Xm9DJG", "MOstDqSY0gO", "ZYKmQ9GPOaF", "twVlVWM3ffz", "zwKo51BEayZ", 
          "b70okb06FWa", "t5nTEmlScSt", "RbrUuKFSqkZ", "u44XP9fZweA", "q7e7FOXKnOf", 
          "e96GB4CXyd3", "i8rrl8YWxLF", "sfpqAeqKeyQ", "zD0E77W4rFs", "cSDJ9kSJkFP", 
          "Ylht9kCLSRW", "uckvenVFnwf", "ZFdJRT3PaUd", "Op5pSvgHo1M", "k9xdBQzYMXo", 
          "FhHPxY16vet", "PaoRZbokFWJ", "QTKk2Xt8KDu", "u9tYUv6AM51", "WkXxkKEJLsg", 
          "W0r4m6NiLsy",
          
          // Line b
          "zb7uTuBCPrN", "tuMMQsGtE69", "yftBZ5bSEOb", "myydnkmLfhp", "fleGy9CvHYh",
          // Line c
          "QGFYJK00ES7", "C8n6hBilwsX", "fJUy96o8akn", "aC64sB86ThG", "hO8No9fHVd2",
          // Line d
          "CnPGhOcERFF", "IeS8V8Yf40N", "S53kx50gjQn", "cmZrrHfTxW3", "eCVDO6lt4go",
          // Other Conditions
          "xeE5TQLvucB", "ctbKSNV2cg7", "T4uxg60LaIw",
          "mI0UjQioE7E", "krhrEBwjENc",
          "u5ebhwtAmpU", "ZKtS7L49Poo",
          "OxJgcwH15L7", "fJDDc9mlubU",
          "Zrn8LD3LoKY", "z89Wr84V2G6",
          // Final Underlying Cause
          "mQVAyOLbga1", "n2mScmFMovq", "xNCSFrgdUgi"
        ];

        // Map Maternal & CDR fields to MCCOD UIDs
        const MCCOD_TO_SOURCE_MAP: Record<string, string> = {};
        if (def.id === "cdr") {
          Object.entries(CDR_TO_MCCOD_MAP).forEach(([src, mccod]) => {
            MCCOD_TO_SOURCE_MAP[mccod] = src;
          });
          if (this.childFieldIds.ageYears) MCCOD_TO_SOURCE_MAP.q7e7FOXKnOf = this.childFieldIds.ageYears;
          if (this.childFieldIds.birthDate) MCCOD_TO_SOURCE_MAP.RbrUuKFSqkZ = this.childFieldIds.birthDate;
        } else {
          const mapping = def.id === "pdr" ? PERINATAL_TO_MCCOD_MAP : MATERNAL_TO_MCCOD_MAP;
          Object.entries(mapping).forEach(([src, mccod]) => {
            if (def.id !== "pdr" || mccod !== "ZYKmQ9GPOaF") MCCOD_TO_SOURCE_MAP[mccod] = src;
          });
        }

        mccodElements.forEach((mccodDe) => {
          let val = values[mccodDe];
          if (val === undefined || val === null || val === "") {
            const sourceDe = MCCOD_TO_SOURCE_MAP[mccodDe];
            if (sourceDe) val = values[sourceDe];
          }

          if (val !== undefined && val !== null && val !== "") {
            let out: any = val;
            if (Array.isArray(val)) out = val.join(",");

            let vt = "TEXT";
            if (mccodDe === "i8rrl8YWxLF") {
              vt = "DATETIME";
            } else if (mccodDe === "zwKo51BEayZ") {
              vt = "DATE";
            } else if (this.meta[mccodDe]) {
              vt = this.meta[mccodDe].valueType;
            }

            if (isMoment(val)) {
              out = vt === "DATETIME"
                ? moment(val).format("YYYY-MM-DDTHH:mm:ss.SSS")
                : vt === "TIME"
                ? moment(val).format("HH:mm")
                : moment(val).format("YYYY-MM-DD");
            } else if (typeof val === "string" && val) {
              if (vt === "DATETIME") {
                const parsed = moment(val);
                if (parsed.isValid()) {
                  out = parsed.format("YYYY-MM-DDTHH:mm:ss.SSS");
                }
              } else if (vt === "DATE") {
                const parsed = moment(val);
                if (parsed.isValid()) {
                  out = parsed.format("YYYY-MM-DD");
                }
              }
            }
            if (typeof out === "boolean") out = out ? "true" : "false";
            // MCH020 place of delivery lists facility levels and community
            // choices; the certificate keeps the five broad places.
            if (mccodDe === "Z41di0TRjIu" && def.id === "mdr") out = certificatePlaceOfDelivery(out);

            mccodDataValues.push({ dataElement: mccodDe, value: out });
          }
        });

        // Add the linkage field value
        if (mainStore.isIframeEdit) mccodDataValues.push({ dataElement: "ZkNDFfFSTYg", value: "Linked" });

        if (mccodDataValues.length > 0) {
          if (certifyPerinatal && !this.mccodEventUid) {
            await this.fetchMccodEventForCase(def.caseNumberField, values[def.caseNumberField], orgUnit, true);
          }
          let cleanMccodEventUid = this.mccodEventUid;
          if (cleanMccodEventUid && typeof cleanMccodEventUid === "string" && cleanMccodEventUid.includes(":")) {
            cleanMccodEventUid = cleanMccodEventUid.split(":")[0];
          }

          if (!cleanMccodEventUid) {
            cleanMccodEventUid = generateDhis2Uid();
            runInAction(() => {
              this.mccodEventUid = cleanMccodEventUid;
            });
          }

          // Format eventDate
          let rawDate = values["i8rrl8YWxLF"] || (certifyPerinatal && values.Dq9aH0aZ2wb);
          if (!rawDate && values["WzauwhVOwM0"]) {
            rawDate = values["WzauwhVOwM0"];
          }
          let formattedDate = "";
          if (moment.isMoment(rawDate)) {
            formattedDate = moment(rawDate).format("YYYY-MM-DD");
          } else if (rawDate && typeof rawDate === "string") {
            formattedDate = rawDate.split("T")[0];
          } else {
            formattedDate = this.deriveEventDate(values);
          }

          const mccodEvent: any = {
            orgUnit,
            program: "vf8dN49jprI",
            programStage: "aKclf7Yl1PE",
            eventDate: formattedDate,
            dataValues: mccodDataValues,
            event: cleanMccodEventUid || generateDhis2Uid(),
            status: "COMPLETED",
          };


          try {
             await this.importTrackerEvent(mccodEvent);
             const createdUid = mccodEvent.event;

             if (createdUid && !this.mccodEventUid) {
               runInAction(() => { this.mccodEventUid = createdUid; });
             }

             let cleanCurrentEventUid = event.event;
             if (cleanCurrentEventUid && typeof cleanCurrentEventUid === "string" && cleanCurrentEventUid.includes(":")) {
               cleanCurrentEventUid = cleanCurrentEventUid.split(":")[0];
             }

             if (createdUid && def.linkedField && cleanCurrentEventUid) {
               try {
                 const reviewValues = certifyPerinatal ? this.currentEvent.dataValues : event.dataValues;
                 await this.importTrackerEvent({
                     ...event,
                     event: cleanCurrentEventUid,
                     ...(certifyPerinatal && this.currentEvent.eventDate
                       ? { eventDate: this.currentEvent.eventDate.split("T")[0] } : {}),
                     dataValues: [
                       ...reviewValues.filter(
                         (dv: any) => dv.dataElement !== def.linkedField
                       ),
                       { dataElement: def.linkedField, value: createdUid },
                     ],
                 });
                 if (certifyPerinatal) {
                   runInAction(() => {
                     this.currentEvent = {
                       ...this.currentEvent,
                       dataValues: [
                         ...this.currentEvent.dataValues.filter((dv: any) => dv.dataElement !== def.linkedField),
                         { dataElement: def.linkedField, value: createdUid },
                       ],
                     };
                   });
                 }
               } catch (linkErr) {
                 if (certifyPerinatal) throw linkErr;
                 console.log("Failed to write linkage field", linkErr);
               }
             }
          } catch (mccodErr) {
             if (certifyPerinatal) throw mccodErr;
             console.log("Failed to sync MCCOD event", mccodErr);
          }
        }
      }

      notification.success({
        message: certifyPerinatal ? "Certified cause of death saved and linked" : `${def.title} saved successfully`,
        duration: 3,
      });
      return true;
    } catch (e) {
      if (def.id !== "cdr") console.log("save error", e);
      notification.error({
        message: certifyPerinatal ? "Could not save and link the ICD-11 certificate" : `Failed to save ${def.title}`,
        description: e instanceof Error ? e.message : undefined,
        duration: 4,
      });
      return false;
    } finally {
      runInAction(() => (this.saving = false));
    }
  };

  private deriveEventDate = (values: Record<string, any>) => {
    // Prefer a date-of-death field when present, else today.
    const dateDe = this.activeForm?.id === "cdr" ? childDateOfDeath : Object.keys(this.meta).find(
      (id) =>
        /DATE/.test(this.meta[id]?.valueType || "") &&
        /death/i.test(this.meta[id]?.name || "")
    );
    const v = dateDe ? values[dateDe] : null;
    if (v) return moment(v).format("YYYY-MM-DD");
    return moment().format("YYYY-MM-DD");
  };

  /** Resolve the human-readable option name for a coded field value. */
  private optionName = (de: string, value: any): string => {
    const opt = this.meta[de]?.options?.find((o) => o.code === value);
    return opt?.name ?? (value == null ? "" : String(value));
  };

  /**
   * Compute the underlying cause of death with the WHO DORIS algorithm and
   * write it back into the DORIS + final underlying-cause fields.
   * Ported from the legacy MCCOD form's `setDorisFields`.
   */
  @action computeDoris = async (
    values: Record<string, any>
  ): Promise<Record<string, any> | null> => {
    this.computingDoris = true;
    this.dorisReport = "";
    try {
      const sexName = this.optionName(MCCOD.sex, values[MCCOD.sex]);
      const sex =
        /male/i.test(sexName) && !/female/i.test(sexName)
          ? "1"
          : /female/i.test(sexName)
          ? "2"
          : "9";

      const ageYears = values[MCCOD.age];
      const pregName = this.optionName(
        MCCOD.wasPregnant,
        values[MCCOD.wasPregnant]
      );
      const contributeName = this.optionName(
        MCCOD.pregContribute,
        values[MCCOD.pregContribute]
      );
      const pregTimeName = this.optionName(
        MCCOD.pregTime,
        values[MCCOD.pregTime]
      );

      const payload: Record<string, string> = {
        sex,
        estimatedAge: ageYears
          ? moment.duration({ years: Number(ageYears) }).toISOString()
          : "",
        causeOfDeathCodeA: values[MCCOD.codeA] || "",
        causeOfDeathCodeB: values[MCCOD.codeB] || "",
        causeOfDeathCodeC: values[MCCOD.codeC] || "",
        causeOfDeathCodeD: values[MCCOD.codeD] || "",
        causeOfDeathCodePart2: "",
        causeOfDeathUriPart2: "",
        intervalA: values[MCCOD.intervalA] || "",
        intervalB: values[MCCOD.intervalB] || "",
        intervalC: values[MCCOD.intervalC] || "",
        intervalD: values[MCCOD.intervalD] || "",
        dateBirth: values[MCCOD.dob]
          ? moment(values[MCCOD.dob]).toISOString()
          : "",
        dateDeath: values[MCCOD.dod]
          ? moment(values[MCCOD.dod]).toISOString()
          : "",
        maternalDeathWasPregnant: /yes/i.test(pregName)
          ? "1"
          : /no/i.test(pregName)
          ? "0"
          : "9",
        maternalDeathPregnancyContribute: /yes/i.test(contributeName)
          ? "1"
          : /no/i.test(contributeName)
          ? "0"
          : "9",
        timeFromPregnancy: /within 42 days/i.test(pregTimeName)
          ? "1"
          : /43 days/i.test(pregTimeName)
          ? "2"
          : "9",
      };

      if (
        !payload.causeOfDeathCodeA &&
        !payload.causeOfDeathCodeB &&
        !payload.causeOfDeathCodeC &&
        !payload.causeOfDeathCodeD
      ) {
        notification.warning({
          message: "Enter at least one ICD-11 coded cause of death first.",
        });
        return null;
      }

      const burl = "https://hmis-dev.health.go.ug";
      const url =
        burl +
        "/icd/release/11/2024-01/doris?" +
        new URLSearchParams(payload).toString();

      const res: any = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "API-Version": "v2",
          "Accept-Language": "en",
        },
      }).then((r) => {
        if (!r.ok) throw new Error("DORIS API failed with status " + r.status);
        return r.json();
      });

      let title = "";
      if (res?.uri) {
        try {
          const uris = res.uri.split(" / ");
          const titlePromises = uris.map(async (u: string) => {
            const nameres: any = await fetch(
              u.replace(
                "http://id.who.int",
                "https://hmis-dev.health.go.ug"
              ),
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "API-Version": "v2",
                  "Accept-Language": "en",
                },
              }
            ).then((response) => {
              if (!response.ok)
                throw new Error("ICD API failed with status " + response.status);
              return response.json();
            });
            return nameres?.title?.["@value"] || "";
          });
          const titles = await Promise.all(titlePromises);
          title = titles.filter(Boolean).join(" & ");
        } catch (e) {
          console.error("Failed to fetch title for URI:", res.uri);
        }
      }

      const updates: Record<string, any> = {
        [MCCOD.dorisText]: title,
        [MCCOD.dorisCode]: res?.code ?? "",
        [MCCOD.finalText]: title,
        [MCCOD.finalCode]: res?.code ?? "",
      };

      let report = res?.report;
      if (!report && (res?.error || res?.warning)) {
        report = [
          res.error ? `Error: ${res.error}` : "",
          res.warning ? `Warning: ${res.warning}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
      }
      runInAction(() => {
        this.dorisReport = report || "No computation report available.";
      });

      notification.success({
        message: "Underlying cause computed",
        description: title
          ? `${res?.code} — ${title}`
          : res?.code || "See report",
        duration: 4,
      });
      return updates;
    } catch (e) {
      console.log("computeDoris error", e);
      notification.error({
        message: "Failed to compute underlying cause (DORIS)",
        duration: 4,
      });
      return null;
    } finally {
      runInAction(() => (this.computingDoris = false));
    }
  };

  /**
   * Prepare the payload MCCOD needs to attach an ICD-11 record to this death,
   * matching the legacy iframe/localStorage contract (case-number based).
   */
  buildMccodLink = (def: FormDefinition, values: Record<string, any>) => {
    const raw = values[def.caseNumberField] || "";
    const prefixed =
      def.casePrefix && !String(raw).includes(def.casePrefix.trim())
        ? `${def.casePrefix}${raw}`
        : raw;
    return {
      orgUnit: mainStore.selectedOrgUnit,
      nationality: mainStore.selectedNationality,
      event: this.currentEvent?.event,
      [def.caseNumberField]: prefixed,
    };
  };
}

export const dynamicFormStore = new DynamicFormStore();
