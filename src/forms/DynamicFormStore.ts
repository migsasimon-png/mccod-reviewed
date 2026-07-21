import { action, observable, runInAction } from "mobx";
import moment from "moment";
import { notification } from "antd";
import { store as mainStore } from "../Store";
import { FormDefinition } from "./types";

export const MATERNAL_TO_MCCOD_MAP: Record<string, string> = {
  "CupbOInqvJI": "MOstDqSY0gO", // National ID
  "FIfoObQJvNp": "ZYKmQ9GPOaF", // Full Name
  "iJqBq0kQtWO": "q7e7FOXKnOf", // Age
  "BRtcz4HV7Ak": "FGagV1Utrdh", // Inpatient Number
  "hcu4LCAMSkz": "dsiwvNQLe5n", // Village
  "FHmHV9mElbD": "u44XP9fZweA", // District
  "ioXkKfrgCJa": "t5nTEmlScSt", // Subcounty
  "itNUbtIXfCT": "ZKBE8Xm9DJG", // MoH Case Number
  "ByIsCiqkq4v": "ymyLrfEcYkD", // Parity
  "jdxl2rdeDEk": "lQ1Byr04JTx", // Weeks of Pregnancy
  "WzauwhVOwM0": "i8rrl8YWxLF", // Date and Time of Death
  "eJwpqR9t7YM": "RJhbkjYrODG", // Referred From
  "uFoaTRJ16Ch": "gNM2Yhypydx", // Manner of Death - Accident
  "K4FUK590rIU": "KsGOxFyzIs1", // Manner of Death - Assault
  "AqXDMjrPUEE": "Z41di0TRjIu", // Place of Delivery
  "js6jQi1rx1j": "jY3K6Bv4o9Q", // Autopsy Requested
};

export const CDR_TO_MCCOD_MAP: Record<string, string> = {
  "ZKBE8Xm9DJG": "ZKBE8Xm9DJG", // MoH Case Number
  "GTI7EqoQokL": "ZYKmQ9GPOaF", // Child's Name / Initials -> Deceased Name
  "Hq6GGFTlHHj": "e96GB4CXyd3", // Sex
  "CdceEuqRSwT": "q7e7FOXKnOf", // Age (days) -> Age
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
  @observable maternalCaseNumbers: Set<string> = new Set();
  @observable perinatalCaseNumbers: Set<string> = new Set();
  @observable childCaseNumbers: Set<string> = new Set();
  @observable pendingEditEvent: any = null;
  /** Data element ids that actually belong to the active program stage. */
  stageDataElements: Set<string> = new Set();

  private get engine() {
    return mainStore.engine;
  }

  @action reset = () => {
    this.activeForm = null;
    this.program = null;
    this.meta = {};
    this.currentEvent = null;
    this.mccodEventUid = null;
    this.defaultValues = {};
  };

  @action openForm = async (def: FormDefinition) => {
    this.activeForm = def;
    this.currentEvent = null;
    this.defaultValues = {};
    this.program = def.program ?? null;
    await this.loadMeta(def);
  };

  /** All real DHIS2 data element UIDs referenced by a form's layout. */
  private layoutDataElementIds = (def: FormDefinition): string[] => {
    const UID = /^[A-Za-z][A-Za-z0-9]{10}$/;
    const set = new Set<string>();
    for (const section of def.layout) {
      for (const group of section.groups) {
        for (const f of group.fields) {
          [f.de, f.codeField, f.uriField].forEach((id) => {
            if (id && UID.test(id)) set.add(id);
          });
        }
      }
    }
    return Array.from(set);
  };

  /** Resolve the owning program + metadata for every field the form renders. */
  @action loadMeta = async (def: FormDefinition) => {
    this.loadingMeta = true;
    try {
      // Resolve the owning program + the stage's own data elements (used to
      // keep the save payload valid — fields drawn from other programs, like
      // the shared ICD-11 cause section, are shown but not sent to this stage).
      this.stageDataElements = new Set();
      if (def.programStage) {
        try {
          const stageRes: any = await this.engine.link.fetch(
            `/api/programStages/${def.programStage}.json?fields=` +
              `program[id],programStageDataElements[dataElement[id]]`
          );
          this.program = stageRes?.program?.id ?? def.program ?? null;
          (stageRes?.programStageDataElements || []).forEach((psde: any) => {
            if (psde?.dataElement?.id)
              this.stageDataElements.add(psde.dataElement.id);
          });
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
      const ids = this.layoutDataElementIds(def);
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
      runInAction(() => {
        this.meta = meta;
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
          `/api/events.json?program=${program}` +
          `&programStage=${def.programStage}` +
          `&orgUnit=${ou}&ouMode=SELECTED` +
          `&filter=${def.caseNumberField}:like:${encodeURIComponent(prefix)}` +
          `&order=created:desc&pageSize=200&totalPages=false` +
          `&fields=event,dataValues[dataElement,value]`;
        const res: any = await this.engine.link.fetch(url);
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
    if (!caseNo || !this.program) return null;
    try {
      const url =
        `/api/events.json?program=${this.program}` +
        `&programStage=${def.programStage}` +
        `&filter=${def.caseNumberField}:eq:${encodeURIComponent(caseNo)}` +
        `&fields=event,orgUnit,eventDate,dataValues[dataElement,value]&pageSize=1`;
      const res: any = await this.engine.link.fetch(url);
      return res?.events?.[0] ?? null;
    } catch (e) {
      console.log("findByCaseNumber error", e);
      return null;
    }
  };

  @action fetchMccodEventForCase = async (caseNumberFieldUid: string, caseNumber: string) => {
    if (!caseNumber || !caseNumberFieldUid) return null;
    try {
      console.log(`[MCCOD Sync] Searching for case number: ${caseNumber}`);
      const url =
        `/api/events.json?programStage=aKclf7Yl1PE` +
        `&filter=${caseNumberFieldUid}:eq:${encodeURIComponent(caseNumber)}` +
        `&fields=event,dataValues[dataElement,value]&pageSize=1`;
      const res: any = await this.engine.link.fetch(url);
      const ev = res?.events?.[0] ?? null;
      if (ev) {
        let cleanEvUid = ev.event;
        if (cleanEvUid && typeof cleanEvUid === "string" && cleanEvUid.includes(":")) {
          cleanEvUid = cleanEvUid.split(":")[0];
        }
        console.log(`[MCCOD Sync] Found existing MCCOD event: ${cleanEvUid}`, ev.dataValues);
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

  /** Load the most recent events for this form at the selected org unit. */
  @action loadRecords = async (def: FormDefinition) => {
    const orgUnit = mainStore.selectedOrgUnit;
    const program = await this.ensureProgram(def);
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
    this.loadingRecords = true;
    try {
      const url =
        `/api/events.json?program=${program}` +
        `&programStage=${def.programStage}` +
        `&orgUnit=${orgUnit}&ouMode=SELECTED` +
        `&order=eventDate:desc&pageSize=100&totalPages=false` +
        `&fields=event,eventDate,orgUnit,orgUnitName,` +
        `dataValues[dataElement,value]`;
      const res: any = await this.engine.link.fetch(url);
      const events = res?.events || [];
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
            this.engine.link.fetch(`/api/events.json?programStage=YXed7PnLRco&orgUnit=${orgUnit}&ouMode=SELECTED&fields=dataValues[dataElement,value]&pageSize=500`).catch(() => ({})),
            this.engine.link.fetch(`/api/events.json?programStage=CGz50G2MY16&orgUnit=${orgUnit}&ouMode=SELECTED&fields=dataValues[dataElement,value]&pageSize=500`).catch(() => ({})),
            this.engine.link.fetch(`/api/events.json?programStage=lLO6f44xh4H&orgUnit=${orgUnit}&ouMode=SELECTED&fields=dataValues[dataElement,value]&pageSize=500`).catch(() => ({}))
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
      runInAction(() => (this.records = []));
    } finally {
      runInAction(() => (this.loadingRecords = false));
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
    this.currentEvent = event;
    const dv: Record<string, any> = {};
    (event?.dataValues || []).forEach((d: any) => {
      dv[d.dataElement] = d.value;
    });
    this.defaultValues = dv;
    this.dorisReport = dv["W0r4m6NiLsy"] || "";

    const activeForm = this.activeForm;
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
    this.currentEvent = null;
    this.defaultValues = {};
    this.mccodEventUid = null;
  };

  @action setDefaults = (values: Record<string, any>) => {
    this.defaultValues = values;
  };

  /** Persist the review event to DHIS2 (create or update). */
  @action save = async (values: Record<string, any>): Promise<boolean> => {
    const def = this.activeForm;
    if (!def) return false;
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
    const orgUnit = mainStore.selectedOrgUnit;
    if (!orgUnit) {
      notification.error({ message: "Select an organisation unit first." });
      return false;
    }

    this.saving = true;
    try {
      // For brand-new records, guarantee the sequential case number is still
      // free right before persisting; if a concurrent save claimed it, roll to
      // the next available number so two records can never share one.
      if (!this.currentEvent?.event && def.caseNumberField) {
        let caseNo = values[def.caseNumberField];
        for (
          let i = 0;
          caseNo && i < 8 && (await this.findByCaseNumber(def, caseNo));
          i++
        ) {
          caseNo = await this.generateCaseNumber(def);
        }
        if (caseNo && caseNo !== values[def.caseNumberField]) {
          values = { ...values, [def.caseNumberField]: caseNo };
        }
      }

      const dataValues = Object.entries(values)
        .filter(
          ([, v]) =>
            v !== undefined &&
            v !== null &&
            v !== "" &&
            !(Array.isArray(v) && v.length === 0)
        )
        // Only send data elements that belong to this program stage.
        .filter(
          ([de]) =>
            this.stageDataElements.size === 0 || this.stageDataElements.has(de)
        )
        .map(([dataElement, value]) => {
          let out: any = value;
          // Multi-select → comma-joined option codes.
          if (Array.isArray(value)) out = value.join(",");
          if (isMoment(value)) {
            const vt = this.meta[dataElement]?.valueType;
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

      const event: any = {
        program: this.program,
        programStage: def.programStage,
        orgUnit,
        eventDate: this.deriveEventDate(values),
        status: "COMPLETED",
        dataValues,
      };
      if (this.currentEvent?.event) event.event = this.currentEvent.event;

      // Only attach nationality attributeCategoryOptions if program uses it (Maternal / MCCOD)
      if (def.isMccod || this.program === "vf8dN49jprI" || def.id === "mdr") {
        event.attributeCategoryOptions = mainStore.selectedNationality || "l4UMmqvSBe5";
      }

      console.log("[Save Payload] POSTING Event payload:", JSON.parse(JSON.stringify(event)));

      try {
        await this.engine.mutate({
          type: this.currentEvent?.event ? "update" : "create",
          resource: "events",
          ...(this.currentEvent?.event ? { id: this.currentEvent.event } : {}),
          data: event,
        });
      } catch (mutateErr: any) {
        const errString = String(mutateErr?.message || mutateErr || "");
        if (event.attributeCategoryOptions && (errString.includes("Attribute option combo") || errString.includes("category combo") || errString.includes("409"))) {
          console.warn("[Save Warning] Retrying event save without attributeCategoryOptions due to DHIS2 category combo mismatch:", errString);
          delete event.attributeCategoryOptions;
          await this.engine.mutate({
            type: this.currentEvent?.event ? "update" : "create",
            resource: "events",
            ...(this.currentEvent?.event ? { id: this.currentEvent.event } : {}),
            data: event,
          });
        } else {
          throw mutateErr;
        }
      }

      const mccodSection = def.layout.find((s: any) =>
        s.title.toUpperCase().includes("CERTIFIED CAUSE OF DEATH") ||
        s.title.toUpperCase().includes("CASES OF DEATH (FRAME A)") ||
        s.title.toUpperCase().includes("CAUSE OF DEATH (FRAME A)")
      );
      if (mccodSection && def.caseNumberField && values[def.caseNumberField]) {
        const mccodDataValues: any[] = [];
        
        let mccodElements = [
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
          "mQVAyOLbga1", "n2mScmFMovq"
        ];

        if (def.isMccod) {
          const allMccodDes = new Set<string>();
          def.layout.forEach((section: any) => {
            section.groups.forEach((group: any) => {
              group.fields.forEach((field: any) => {
                allMccodDes.add(field.de);
                if (field.codeField) allMccodDes.add(field.codeField);
                if (field.uriField) allMccodDes.add(field.uriField);
              });
            });
          });
          mccodElements = Array.from(allMccodDes);
        }

        // Map Maternal & CDR fields to MCCOD UIDs
        const MCCOD_TO_SOURCE_MAP: Record<string, string> = {
          "twVlVWM3ffz": "Hq6GGFTlHHj", // Sex (CDR)
          "zwKo51BEayZ": "zwKo51BEayZ", // Village
          "RbrUuKFSqkZ": "RbrUuKFSqkZ", // DOB
          "e96GB4CXyd3": "e96GB4CXyd3", // Place of Death
          "b70okb06FWa": "b70okb06FWa"  // Inpatient Number
        };
        Object.entries(MATERNAL_TO_MCCOD_MAP).forEach(([src, mccod]) => {
          MCCOD_TO_SOURCE_MAP[mccod] = src;
        });
        Object.entries(CDR_TO_MCCOD_MAP).forEach(([src, mccod]) => {
          MCCOD_TO_SOURCE_MAP[mccod] = src;
        });

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

            mccodDataValues.push({ dataElement: mccodDe, value: out });
          }
        });

        // Add the linkage field value
        mccodDataValues.push({
          dataElement: "ZkNDFfFSTYg",
          value: mainStore.isIframeEdit ? "Linked" : ""
        });

        if (mccodDataValues.length > 0) {
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
          let rawDate = values["i8rrl8YWxLF"];
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
            attributeCategoryOptions: mainStore.selectedNationality || "l4UMmqvSBe5",
            orgUnit,
            program: "vf8dN49jprI",
            programStage: "aKclf7Yl1PE",
            eventDate: formattedDate,
            dataValues: mccodDataValues,
            event: cleanMccodEventUid,
          };

          console.log("[Save Payload] POSTING MCCOD Event payload:", JSON.parse(JSON.stringify(mccodEvent)));

          try {
             const headers: Record<string, string> = {
               "Content-Type": "application/json",
               "Authorization": "Basic aGlzcC5za3VudW5rYTpOb21pc3IxMjMkJCQk"
             };

             const url = "/api/40/events";

             let response = await fetch(url, {
               method: "POST",
               headers,
               credentials: "include",
               body: JSON.stringify(mccodEvent),
             });

             if (!response.ok && mccodEvent.attributeCategoryOptions) {
               console.warn("[MCCOD Sync Warning] 409 Conflict when saving background MCCOD event with attributeCategoryOptions. Retrying without it...");
               delete mccodEvent.attributeCategoryOptions;
               response = await fetch(url, {
                 method: "POST",
                 headers,
                 credentials: "include",
                 body: JSON.stringify(mccodEvent),
               });
             }

              if (!response.ok) {
                let errMsg = `HTTP error! status: ${response.status}`;
                try {
                  const errJson = await response.json();
                  console.error("[MCCOD Sync Error] Conflict details:", errJson);
                  if (errJson.message) errMsg += ` - ${errJson.message}`;
                } catch (e) {
                  try {
                    const errText = await response.text();
                    console.error("[MCCOD Sync Error] Response text:", errText);
                  } catch (e2) {}
                }
                throw new Error(errMsg);
              }

             const mccodResult: any = await response.json();

             // Write the real MCCOD event UID back to ZkNDFfFSTYg on the
             // maternal event so the "Certified" badge reflects reality.
             let createdUid =
               cleanMccodEventUid ||
               mccodResult?.response?.importSummaries?.[0]?.reference ||
               mccodResult?.importSummaries?.[0]?.reference ||
               mccodResult?.reference ||
               null;

             if (createdUid && typeof createdUid === "string" && createdUid.includes(":")) {
               createdUid = createdUid.split(":")[0];
             }

             if (createdUid && !this.mccodEventUid) {
               runInAction(() => { this.mccodEventUid = createdUid; });
             }

             let cleanCurrentEventUid = this.currentEvent?.event;
             if (cleanCurrentEventUid && typeof cleanCurrentEventUid === "string" && cleanCurrentEventUid.includes(":")) {
               cleanCurrentEventUid = cleanCurrentEventUid.split(":")[0];
             }

             if (createdUid && def.linkedField && cleanCurrentEventUid) {
               try {
                 await this.engine.mutate({
                   type: "update",
                   resource: "events",
                   id: cleanCurrentEventUid,
                   data: {
                     ...event,
                     dataValues: [
                       ...(event.dataValues || []).filter(
                         (dv: any) => dv.dataElement !== def.linkedField
                       ),
                       { dataElement: def.linkedField, value: createdUid },
                     ],
                   },
                 });
               } catch (linkErr) {
                 console.log("Failed to write linkage field", linkErr);
               }
             }
          } catch (mccodErr) {
             console.log("Failed to sync MCCOD event", mccodErr);
          }
        }
      }

      notification.success({
        message: `${def.title} saved successfully`,
        duration: 3,
      });
      return true;
    } catch (e) {
      console.log("save error", e);
      notification.error({
        message: `Failed to save ${def.title}`,
        duration: 4,
      });
      return false;
    } finally {
      runInAction(() => (this.saving = false));
    }
  };

  private deriveEventDate = (values: Record<string, any>) => {
    // Prefer a date-of-death field when present, else today.
    const dateDe = Object.keys(this.meta).find(
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

      const burl = "https://ug.sk-engine.online";
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
                "https://ug.sk-engine.online"
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
