import { action, observable, runInAction } from "mobx";
import moment from "moment";
import { notification } from "antd";
import { store as mainStore } from "../Store";
import { FormDefinition } from "./types";

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
  @observable defaultValues: Record<string, any> = {};
  @observable records: any[] = [];
  @observable loadingRecords = false;
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
  };

  @action startNew = () => {
    this.currentEvent = null;
    this.defaultValues = {};
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
          if (moment.isMoment(value)) {
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
        attributeCategoryOptions:
          mainStore.selectedNationality || "l4UMmqvSBe5",
        dataValues,
      };
      if (this.currentEvent?.event) event.event = this.currentEvent.event;

      await this.engine.mutate({
        type: this.currentEvent?.event ? "update" : "create",
        resource: "events",
        ...(this.currentEvent?.event ? { id: this.currentEvent.event } : {}),
        data: event,
      });

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
          const nameres: any = await fetch(
            res.uri.replace(
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
          ).then((r) => {
            if (!r.ok) throw new Error("ICD API failed " + r.status);
            return r.json();
          });
          title = nameres?.title?.["@value"] ?? "";
        } catch (e) {
          console.log("DORIS name lookup failed", e);
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
