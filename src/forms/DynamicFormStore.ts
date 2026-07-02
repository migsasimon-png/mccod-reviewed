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

  /** Resolve the owning program + data element metadata for a stage. */
  @action loadMeta = async (def: FormDefinition) => {
    if (!def.programStage) {
      // CDR placeholder — no real stage yet.
      this.meta = {};
      return;
    }
    this.loadingMeta = true;
    try {
      const url =
        `/api/programStages/${def.programStage}.json?fields=` +
        `program[id],programStageDataElements[dataElement[id,name,valueType,` +
        `optionSet[options[code,name]]]]`;
      const res: any = await this.engine.link.fetch(url);
      const meta: Record<string, DeMeta> = {};
      (res.programStageDataElements || []).forEach((psde: any) => {
        const de = psde.dataElement;
        if (!de) return;
        meta[de.id] = {
          id: de.id,
          name: de.name,
          valueType: de.valueType,
          options: de.optionSet?.options,
        };
      });
      runInAction(() => {
        this.program = res.program?.id ?? def.program ?? null;
        this.meta = meta;
      });
    } catch (e) {
      console.log("loadMeta error", e);
    } finally {
      runInAction(() => (this.loadingMeta = false));
    }
  };

  /** Generate a fresh MoH case number from the DHIS2 id pool. */
  @action generateCaseNumber = async (): Promise<string> => {
    try {
      const res: any = await this.engine.link.fetch("/api/system/id.json");
      return res?.codes?.[0] ?? "";
    } catch (e) {
      console.log("generateCaseNumber error", e);
      return "";
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

  /** Load the most recent events for this form at the selected org unit. */
  @action loadRecords = async (def: FormDefinition) => {
    const orgUnit = mainStore.selectedOrgUnit;
    if (!def.programStage || !this.program || !orgUnit) {
      this.records = [];
      return;
    }
    this.loadingRecords = true;
    try {
      const url =
        `/api/events.json?program=${this.program}` +
        `&programStage=${def.programStage}` +
        `&orgUnit=${orgUnit}&ouMode=SELECTED` +
        `&order=eventDate:desc&pageSize=100&totalPages=false` +
        `&fields=event,eventDate,orgUnit,orgUnitName,` +
        `dataValues[dataElement,value]`;
      const res: any = await this.engine.link.fetch(url);
      runInAction(() => {
        this.records = res?.events || [];
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
      const dataValues = Object.entries(values)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([dataElement, value]) => {
          let out: any = value;
          if (moment.isMoment(value)) {
            const vt = this.meta[dataElement]?.valueType;
            out =
              vt === "DATETIME"
                ? moment(value).format("YYYY-MM-DDTHH:mm:ss.SSS")
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
              "https://ug.sk-engine.cloud/icd-api"
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
