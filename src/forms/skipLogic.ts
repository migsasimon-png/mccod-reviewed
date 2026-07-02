import moment from "moment";
import { DeMeta } from "./DynamicFormStore";
import { FormDefinition, FormField, FormId } from "./types";

export interface SkipState {
  hiddenFields: Set<string>;
  disabledFields: Set<string>;
  hiddenSections: Set<number>;
  sectionNotes: Record<number, string>;
  hints: Record<string, string>;
}

type Values = Record<string, any>;

const MCCOD = {
  sex: "e96GB4CXyd3",
  dobKnown: "roxn33dtLLx",
  dob: "RbrUuKFSqkZ",
  age: "q7e7FOXKnOf",
  dod: "i8rrl8YWxLF",
  caseNo: "ZKBE8Xm9DJG",
  pregnant: "zcn7acUB6x1",
  referred: "QDHeWslaEoH",
  referredFrom: "WqYvFt79TQB",
  surgery: "Kk0hmrJPR90",
  surgeryDate: "j5TIQx3gHyF",
  surgeryReason: "JhHwdQ337nn",
  autopsy: "jY3K6Bv4o9Q",
  autopsyUsed: "UfG52s4YcUt",
  stillborn: "ivnHp4M4hFF",
  hoursSurvived: "jf9TogeSZpk",
  external: "AZSlwlRAFig",
  disease: "FhHPxY16vet",
  causeA: "sfpqAeqKeyQ",
  causeB: "zb7uTuBCPrN",
  causeC: "QGFYJK00ES7",
  causeD: "CnPGhOcERFF",
  intTypeA: "Ylht9kCLSRW",
  intA: "WkXxkKEJLsg",
  intTypeB: "myydnkmLfhp",
  intB: "fleGy9CvHYh",
  intTypeC: "aC64sB86ThG",
  intC: "hO8No9fHVd2",
  intTypeD: "cmZrrHfTxW3",
  intD: "eCVDO6lt4go",
  injuryDate: "U18Tnfz9EKd",
  externalDesc: "DKlOhZJOCrX",
  externalPlace: "kGIDD5xIeLC",
  externalPlaceOther: "mDez8j7furx",
};

const MANNER_FIELDS = [
  MCCOD.disease,
  "gNM2Yhypydx",
  "wX3i3gkTG4m",
  "KsGOxFyzIs1",
  "tYH7drlbNya",
  "xDMX2CJ4Xw3",
  "b4yPk98om7e",
  "fQWuywOaoN2",
  "o1hG9vr0peF",
];

const EXTERNAL_FIELDS = [
  MCCOD.injuryDate,
  MCCOD.externalDesc,
  MCCOD.externalPlace,
  MCCOD.externalPlaceOther,
  MCCOD.external,
];

const PREG_FOLLOWUPS = [
  "KpfvNQSsWIw",
  "AJAraEcfH63",
  "RJhbkjYrODG",
  "ymyLrfEcYkD",
  "K5BDPJQk1BP",
  "Z41di0TRjIu",
  "uaxjt0inPNF",
];

const FETAL_FIELDS = [
  "V4rE1tsj5Rb",
  "ivnHp4M4hFF",
  "jf9TogeSZpk",
  "lQ1Byr04JTx",
  "GFVhltTCG8b",
  "xAWYJtQsg8M",
  "DdfDMFW4EJ9",
];

/** Parent → child fields shown only when parent matches yes/no. */
const CONDITIONAL: {
  child: string;
  parent: string;
  when: "yes" | "no" | "positive";
  forms?: FormId[];
}[] = [
  // MCCOD
  { child: "KpfvNQSsWIw", parent: MCCOD.pregnant, when: "yes", forms: ["mccod"] },
  { child: "AJAraEcfH63", parent: MCCOD.pregnant, when: "yes", forms: ["mccod"] },
  { child: "RJhbkjYrODG", parent: MCCOD.pregnant, when: "yes", forms: ["mccod"] },
  { child: "ymyLrfEcYkD", parent: MCCOD.pregnant, when: "yes", forms: ["mccod"] },
  { child: "K5BDPJQk1BP", parent: MCCOD.pregnant, when: "yes", forms: ["mccod"] },
  { child: "Z41di0TRjIu", parent: MCCOD.pregnant, when: "yes", forms: ["mccod"] },
  { child: "uaxjt0inPNF", parent: MCCOD.pregnant, when: "yes", forms: ["mccod"] },
  { child: MCCOD.surgeryDate, parent: MCCOD.surgery, when: "yes", forms: ["mccod"] },
  { child: MCCOD.surgeryReason, parent: MCCOD.surgery, when: "yes", forms: ["mccod"] },
  { child: MCCOD.autopsyUsed, parent: MCCOD.autopsy, when: "yes", forms: ["mccod"] },
  { child: MCCOD.referredFrom, parent: MCCOD.referred, when: "yes", forms: ["mccod"] },
  // PDR
  { child: "o03g3QSYR0b", parent: "bS24JUbPyQv", when: "yes", forms: ["pdr"] },
  { child: "laCeT3RhMUh", parent: "GOC04o3duHu", when: "yes", forms: ["pdr"] },
  { child: "g7cj6HmiFHJ", parent: "noTA8bNu7Er", when: "yes", forms: ["pdr"] },
  { child: "VtF7Nx2yjat", parent: "VnDcrZ4gCdR", when: "positive", forms: ["pdr"] },
  { child: "b9JlESs135J", parent: "o69aE6o8LfO", when: "no", forms: ["pdr"] },
  // MDR
  { child: "hZlRNVrmS1y", parent: "QidQVyBFspW", when: "yes", forms: ["mdr"] },
  { child: "IACcLw1GbkR", parent: "oz0vASbQvq5", when: "positive", forms: ["mdr"] },
  { child: "OJVwBSHC4b0", parent: "oz0vASbQvq5", when: "positive", forms: ["mdr"] },
  // CDR (placeholder IDs)
  { child: "CDR_referred_from", parent: "CDR_referred", when: "yes", forms: ["cdr"] },
  { child: "CDR_referred_from_other", parent: "CDR_referred_from", when: "yes", forms: ["cdr"] },
  { child: "CDR_nutrition_status", parent: "CDR_malnutrition_screened", when: "yes", forms: ["cdr"] },
  { child: "CDR_missed_doses", parent: "CDR_immunization_uptodate", when: "no", forms: ["cdr"] },
  { child: "CDR_mother_anc_times", parent: "CDR_mother_anc", when: "yes", forms: ["cdr"] },
  {
    child: "CDR_prophylactic_antibiotics",
    parent: "CDR_antibiotics_given",
    when: "yes",
    forms: ["cdr"],
  },
  { child: "CDR_inv_unavailable_specify", parent: "CDR_inv_unavailable", when: "yes", forms: ["cdr"] },
  { child: "CDR_treatment_gaps", parent: "CDR_treatment_adequate", when: "no", forms: ["cdr"] },
  { child: "CDR_guidelines_gaps", parent: "CDR_guidelines_followed", when: "no", forms: ["cdr"] },
  { child: "CDR_complications_specify", parent: "CDR_complications", when: "yes", forms: ["cdr"] },
  { child: "CDR_drugs_unavailable_specify", parent: "CDR_drugs_unavailable", when: "yes", forms: ["cdr"] },
];

export const emptySkipState = (): SkipState => ({
  hiddenFields: new Set(),
  disabledFields: new Set(),
  hiddenSections: new Set(),
  sectionNotes: {},
  hints: {},
});

const hasValue = (v: any) => v !== undefined && v !== null && v !== "";

const optionLabel = (de: string, value: any, meta: Record<string, DeMeta>) => {
  const opt = meta[de]?.options?.find((o) => o.code === value);
  return opt?.name ?? (value == null ? "" : String(value));
};

export const isYes = (values: Values, de: string, meta: Record<string, DeMeta>) => {
  const t = optionLabel(de, values[de], meta);
  return /^yes$/i.test(t) || values[de] === true || values[de] === "true" || /^YN01-01$/i.test(String(values[de]));
};

export const isNo = (values: Values, de: string, meta: Record<string, DeMeta>) => {
  const t = optionLabel(de, values[de], meta);
  return /^no$/i.test(t) || values[de] === false || values[de] === "false" || /^YN01-02$/i.test(String(values[de]));
};

export const isPositive = (values: Values, de: string, meta: Record<string, DeMeta>) => {
  const t = optionLabel(de, values[de], meta);
  return /positive|reactive|detected/i.test(t);
};

export const isFemale = (values: Values, meta: Record<string, DeMeta>) => {
  const t = optionLabel(MCCOD.sex, values[MCCOD.sex], meta);
  return /^female$/i.test(t) || String(values[MCCOD.sex]) === "SX01-02";
};

export const isMale = (values: Values, meta: Record<string, DeMeta>) => {
  const t = optionLabel(MCCOD.sex, values[MCCOD.sex], meta);
  return /^male$/i.test(t) || String(values[MCCOD.sex]) === "SX01-01";
};

export const getAgeYears = (values: Values): number | null => {
  if (hasValue(values[MCCOD.age])) return Number(values[MCCOD.age]);
  const dob = values[MCCOD.dob];
  if (dob && moment.isMoment(dob) && dob.isValid()) return moment().diff(dob, "years");
  if (typeof dob === "string" && dob) {
    const m = moment(dob);
    if (m.isValid()) return moment().diff(m, "years");
  }
  return null;
};

const isTruthyCheckbox = (v: any) => v === true || v === "true";

const applyConditionalChildren = (
  formId: FormId,
  values: Values,
  meta: Record<string, DeMeta>,
  state: SkipState
) => {
  for (const rule of CONDITIONAL) {
    if (rule.forms && !rule.forms.includes(formId)) continue;
    const show =
      rule.when === "yes"
        ? isYes(values, rule.parent, meta)
        : rule.when === "no"
        ? isNo(values, rule.parent, meta)
        : isPositive(values, rule.parent, meta);
    if (!show) state.hiddenFields.add(rule.child);
  }
};

const applyMccodRules = (
  values: Values,
  meta: Record<string, DeMeta>,
  def: FormDefinition,
  state: SkipState
) => {
  const age = getAgeYears(values);
  const caseNo = String(values[MCCOD.caseNo] || "");
  const isPeriCase = /PERI/i.test(caseNo);

  // Maternal section — female, reproductive age
  def.layout.forEach((sec, idx) => {
    if (/for women|maternal/i.test(sec.title)) {
      if (isMale(values, meta)) {
        state.hiddenSections.add(idx);
        state.sectionNotes[idx] = "Not applicable — deceased is male";
      } else if (age != null && (age <= 10 || age >= 50)) {
        state.hiddenSections.add(idx);
        state.sectionNotes[idx] = "Not applicable — outside reproductive age range (10–49 years)";
      }
    }
    if (/fetal|infant/i.test(sec.title)) {
      const showFetal = isPeriCase || (age != null && age < 1);
      if (!showFetal) {
        state.hiddenSections.add(idx);
        state.sectionNotes[idx] = "Not applicable — deceased age is 1 year or older";
      }
    }
  });

  FETAL_FIELDS.forEach((de) => {
    if (age != null && age >= 1 && !isPeriCase) state.hiddenFields.add(de);
  });

  // External place "Other"
  const placeLabel = optionLabel(MCCOD.externalPlace, values[MCCOD.externalPlace], meta);
  if (!/other/i.test(placeLabel)) {
    state.hiddenFields.add(MCCOD.externalPlaceOther);
  }

  // DOB known — disable DOB when not known
  if (!isYes(values, MCCOD.dobKnown, meta)) {
    state.disabledFields.add(MCCOD.dob);
    if (!hasValue(values[MCCOD.dobKnown])) {
      state.hints[MCCOD.dob] = 'Select “Date of Birth Known = Yes” to enter date of birth';
    }
  }

  // Stillborn → hours survived
  if (!isYes(values, MCCOD.stillborn, meta) && !isNo(values, MCCOD.stillborn, meta)) {
    state.hiddenFields.add(MCCOD.hoursSurvived);
  } else if (isNo(values, MCCOD.stillborn, meta)) {
    state.hiddenFields.add(MCCOD.hoursSurvived);
  }

  // External cause block
  const externalSelected =
    isTruthyCheckbox(values[MCCOD.external]) ||
    MANNER_FIELDS.some(
      (de) => de !== MCCOD.disease && isTruthyCheckbox(values[de])
    );
  const diseaseOnly =
    isTruthyCheckbox(values[MCCOD.disease]) && !externalSelected;

  if (diseaseOnly) {
    EXTERNAL_FIELDS.forEach((de) => state.hiddenFields.add(de));
  } else if (!externalSelected) {
    EXTERNAL_FIELDS.filter((de) => de !== MCCOD.external).forEach((de) =>
      state.hiddenFields.add(de)
    );
  }

  // Manner of death — mutual exclusivity (disable others when one picked)
  const selectedManner = MANNER_FIELDS.find((de) => isTruthyCheckbox(values[de]));
  if (selectedManner) {
    MANNER_FIELDS.forEach((de) => {
      if (de !== selectedManner) state.disabledFields.add(de);
    });
  }

  // Cause-of-death chain — unlock progressively
  if (!hasValue(values[MCCOD.causeA])) {
    [MCCOD.causeB, MCCOD.causeC, MCCOD.causeD].forEach((de) =>
      state.disabledFields.add(de)
    );
  }
  if (!hasValue(values[MCCOD.causeB])) state.disabledFields.add(MCCOD.causeC);
  if (!hasValue(values[MCCOD.causeC])) state.disabledFields.add(MCCOD.causeD);

  if (!hasValue(values[MCCOD.intTypeA])) state.disabledFields.add(MCCOD.intA);
  if (!hasValue(values[MCCOD.intTypeB])) state.disabledFields.add(MCCOD.intB);
  if (!hasValue(values[MCCOD.intTypeC])) state.disabledFields.add(MCCOD.intC);
  if (!hasValue(values[MCCOD.intTypeD])) state.disabledFields.add(MCCOD.intD);

  if (!hasValue(values[MCCOD.causeA])) {
    state.hints[MCCOD.causeB] = "Fill cause (a) first";
  }

  PREG_FOLLOWUPS.forEach((de) => {
    if (!isYes(values, MCCOD.pregnant, meta)) state.hiddenFields.add(de);
  });
};

/** Side-effects when values change (auto-fill, clear invalid/hidden answers). */
export const applySkipEffects = (
  changed: Values,
  values: Values,
  meta: Record<string, DeMeta>,
  formId: FormId
): Values => {
  const patch: Values = {};

  if (changed[MCCOD.dob] && moment.isMoment(changed[MCCOD.dob])) {
    patch[MCCOD.age] = moment().diff(changed[MCCOD.dob], "years");
  }

  if (changed[MCCOD.dobKnown] && isNo(values, MCCOD.dobKnown, meta)) {
    patch[MCCOD.dob] = null;
  }

  if (changed[MCCOD.dod] && values[MCCOD.dob]) {
    const dob = moment.isMoment(values[MCCOD.dob])
      ? values[MCCOD.dob]
      : moment(values[MCCOD.dob]);
    const dod = moment.isMoment(changed[MCCOD.dod])
      ? changed[MCCOD.dod]
      : moment(changed[MCCOD.dod]);
    if (dob.isValid() && dod.isValid() && dod.isBefore(dob)) {
      patch[MCCOD.dod] = null;
    }
  }

  if (changed[MCCOD.caseNo]) {
    const cn = String(changed[MCCOD.caseNo]);
    if (/PERI|MATERNAL/i.test(cn)) {
      patch[MCCOD.age] = 0;
    }
  }

  if (changed[MCCOD.pregnant] && !isYes(values, MCCOD.pregnant, meta)) {
    PREG_FOLLOWUPS.forEach((de) => {
      patch[de] = undefined;
    });
  }

  if (changed[MCCOD.surgery] && !isYes(values, MCCOD.surgery, meta)) {
    patch[MCCOD.surgeryDate] = null;
    patch[MCCOD.surgeryReason] = undefined;
  }

  if (changed[MCCOD.autopsy] && !isYes(values, MCCOD.autopsy, meta)) {
    patch[MCCOD.autopsyUsed] = undefined;
  }

  // Clear conditional children when parent flips
  for (const rule of CONDITIONAL) {
    if (rule.forms && !rule.forms.includes(formId)) continue;
    if (!(rule.parent in changed)) continue;
    const show =
      rule.when === "yes"
        ? isYes(values, rule.parent, meta)
        : rule.when === "no"
        ? isNo(values, rule.parent, meta)
        : isPositive(values, rule.parent, meta);
    if (!show) patch[rule.child] = undefined;
  }

  return patch;
};

export const computeSkipState = (
  formId: FormId,
  def: FormDefinition,
  values: Values,
  meta: Record<string, DeMeta>
): SkipState => {
  const state = emptySkipState();
  applyConditionalChildren(formId, values, meta, state);

  if (formId === "mccod" || def.isMccod) {
    applyMccodRules(values, meta, def, state);
  }

  // MDR is always maternal — hide nothing by sex, but still honour conditional children
  if (formId === "pdr") {
    // Perinatal: antenatal follow-ups only when booking = yes (handled by CONDITIONAL)
  }

  return state;
};

export const isFieldVisible = (
  field: FormField,
  sectionIndex: number,
  skip: SkipState
) => !skip.hiddenFields.has(field.de) && !skip.hiddenSections.has(sectionIndex);

export const isFieldDisabled = (field: FormField, skip: SkipState) =>
  skip.disabledFields.has(field.de);
