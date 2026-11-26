import moment from "moment";
import type { DeMeta } from "./DynamicFormStore";
import { answered, ChildFieldIds, childDateOfDeath, childFieldsForDisplay, childFollowUps, calculateChildAge, childUnder28Days, hiddenChildFields, legacyAgeDays } from "./childReview";
import { FormDefinition, FormField, FormId } from "./types";

export interface SkipState {
  hiddenFields: Set<string>;
  disabledFields: Set<string>;
  hiddenSections: Set<number>;
  sectionNotes: Record<number, string>;
  hints: Record<string, string>;
}

type Values = Record<string, any>;

export const maternalPregnancyOutcome = "aCzqBYUkfDe";
const maternalLabour = "J11gxMDNvv7";
const maternalDelivery = "PbayNOhXnyx";
const maternalDeliveryPlace = "AqXDMjrPUEE";
const maternalAncAttended = "QidQVyBFspW";
const perinatalAncAttended = "GOC04o3duHu";
const perinatalDeathType = "TiPl1iLI30H";
const perinatalUnknownCause = "Y5T6DMJiZPJ";
const perinatalPregnancyType = "CY6W9fagQ0e";

const deliveryChoices = [
  ["TKWaMxLDj7J", "kHdz10PWtjp", "brmlMKiNrZt", "On3EvqCavl1", "NAnhGvDjMRF", "sju2IsSkUZG", "Wy8zkenyVr4"],
  ["OP5Jr95bkkW", "BLbGQB5NTX1", "NEW_mdr_assistant_nurse", "ZMq8DHxtwCP", "OdQkbYCACsT", "ZOZFaanQLAD", "YHBzpuYWQg1", "STVD72fHWYK"],
];

/** MDR ANC follow-ups closed when ANC is No / Records not available. */
const MDR_ANC_FOLLOWUPS = [
  "a5fh4wtDzmi", "w3QkbELzeDu",
  "y0B7fm7rguE", "kRQ3g914TCz", "kUecSo0kdJ3", "NEW_mdr_maternal_infections",
  "wwmxSrEknn8", "byW52kaC6pR", "nw15Ko1SKnq",
  "fA4uVOOV7Gl", "yajntikIgCk", "HwJeCYbUnDL", "Us9t4jzNMSd", "BxBqvKhoJvj",
  "vVP5ClqKkHQ", "oz0vASbQvq5", "IACcLw1GbkR", "OJVwBSHC4b0",
  "x4luCocBY5h", "z8bU25JRAGG", "T3QwXHphTIu", "NEW_mdr_hb_level",
  "QPw7nHXJqe9", "NEW_mdr_hepb_result", "c6gVPQ5rTOo", "NEW_mdr_urinalysis_result",
  "fuRsZ7wn5Q5", "cqVj2lrYx2W",
];

/** PDR ANC intervention/test block closed when ANC is No. */
const PDR_ANC_FOLLOWUPS = [
  "NEW_pdr_ipt", "NEW_pdr_td",
  "ywMAGkuvTjq", "VnDcrZ4gCdR", "VtF7Nx2yjat",
  "DPG74K71T7a", "qnhVulYBuyO",
  "riyahnxUdTf",
  "NEW_pdr_blood_group", "NEW_pdr_rhesus_factor", "NEW_pdr_blood_transfusion",
];

const PDR_APGAR_SCORES = ["NEW_pdr_apgar_1", "NEW_pdr_apgar_5", "NEW_pdr_apgar_10"];
const PDR_RESUS_BY = [
  "q4YXJgj2sIZ", "LF6ukmshijY", "PlzGmmIbpK5", "bRddgcYH9Qn", "fv703VfWJli",
  "NEW_pdr_resus_nursing_assistant", "J3VHBvaXyyb",
];
const PDR_RESUS_DONE = [
  "mkQMb4ANZ1C", "x7fsCQzTP4G", "HeOmzW0Bj8f", "IELb95GgJhj",
  "YPDveEOR7Cz", "yCUx2f9ed7R", "CprvAYJIWNv", "QP3u2BU4E9p",
];
const PDR_MEDICATIONS = [
  "NEW_pdr_med_oxygen_free_flow", "NEW_pdr_med_oxygen_cpap", "NEW_pdr_med_adrenaline",
  "NEW_pdr_med_surfactant", "NEW_pdr_med_iv_fluids", "NEW_pdr_med_caffeine_citrate",
  "NEW_pdr_med_blood_transfusion", "NEW_pdr_med_other",
];

/** Newborn-only fields closed for fresh/macerated stillbirth. */
const PDR_NEWBORN_FIELDS = [
  "H34bcwaOliX", // newborn IP number
  "rjoVXlCWLYM", "rDI0uhcVLAk", "quKRjZzkSRA", // age of the baby
  ...PDR_APGAR_SCORES, "Yis06rsFWQz",
  "x7k2caL4psq",
  ...PDR_RESUS_DONE, ...PDR_RESUS_BY, ...PDR_MEDICATIONS,
  "NEW_pdr_neonatal_admission_time",
  "qaJDxXfEWPv", "Rqn5P8xXXqp", "WlknV4Af2se", "cbCv995TsyQ",
  "OeL1eJ2tGsN", "prGljHyx851", "XoWWbJlnMsi", "T609w4wbcim",
  "YV5WasxuoTN", "M5zzpq6O4xU", "Hq66gDflc5k", "vnKvRqyjngA", "XZRrIoCTb3P",
];

// --- MCH020 (maternal) groups used by the skip rules ---------------------
const MDR_DEAD_ON_ARRIVAL = ["PkkDS8oCueZ", "JrphiR5eL7e", "UktXJadJhId", "Wkx3fzsB2dd", "Agzf9GaJ6G2"];
const MDR_ADMISSION_ASSESSMENT = [
  "Rrs7OQx1yMS", "ejbJJ1gTnQb", "Hn09AcoW4Mk", "rn8cGimwQ3a", "c8hsSJy63ay",
  "OWhIguUYA66", "MDXum0oNBQb", "W7EN3QVTdMD", "lSthTlIFbEh", "ocMXxDCF6DF",
];
const MDR_INTRAPARTUM_INTERVENTIONS = [
  "qm3ga81qmEC", "oxXg2PTeAok", "fvecJ8TFPRc", "lXdAZeKZn4m", "kEhmeGfdTGB", "LfkUUKPomSf",
  "hyQ9IWF9uEo", "NuHtNZpdXaD", "EBjGwPPITzl", "oZzfT8loS4B", "N7eTWuQRdy7", "QspOEbJwvrn",
  "Dhq6iXq1c1Z", "IRv21OKIBgM",
];
const MDR_DELIVERY_INTERVENTIONS = [
  "NY7O9X3XNRv", "hyQ9IWF9uEo", "ObzLdxNcGZY", // manual removal of placenta
  "MfICS1uUUdJ", "NuHtNZpdXaD", "qNNcwXQDFVE", // caesarean section
  "bypev1wrHaJ", "N7eTWuQRdy7", "vi73Sj73I1P", // instrumental delivery
  "lz77rqS6fIo", "Dhq6iXq1c1Z", "wde8p5nd32l", // perineal repair
];
const MDR_COMPLICATIONS = ["LA1WtCaWi2M", "owuXac0M85O", "A1eKHTfGYfT", "Yj5FTl1DukQ", "brdup6zLcEo", "Xo0I6fvmmha", "ezUwUwLOWDO"];
/** 8a 3.2 postpartum haemorrhage and 4. puerperal sepsis. */
const MDR_POSTPARTUM_CAUSES = [
  "SLRPjzRPpEJ", "o3yTjUABKux", "fUmxaY8tsVf", "p2TjG5L7gfw", "iteIkVf68jY", "H7Pf8ugBfpf", "ZbC9oYLjvsH",
  "lSD9vEkw81r", "mXZw0MFlC5e", "Np2XQF1gkaU", "hSmmYHV1eXV",
];
/** 8a causes that only apply after a caesarean section. */
const MDR_CAESAREAN_CAUSES = ["iteIkVf68jY", "Np2XQF1gkaU", "hSmmYHV1eXV"];
/** 8a causes that only apply to an obstructed labour. */
const MDR_OBSTRUCTED_LABOUR_CAUSES = ["o3yTjUABKux", "lSD9vEkw81r", "hSmmYHV1eXV"];
const MDR_CAESAREAN_MODES = ["NAnhGvDjMRF", "sju2IsSkUZG"];
const MDR_ABORTION_ECTOPIC = [
  "xiAXjQxZDSW", "W3mgyMha0N0", "D5E0lOCtKdM", "Ws8mQOp3DZr", "a7HrnNVPtZN", "wdLRU8IixLi",
];
export const MDR_HAEMORRHAGE_CAUSES = [
  "c2Sn7Z6RuK4", "czaXNYJ31Rv", "gQjgm8foJPK",
  "SLRPjzRPpEJ", "o3yTjUABKux", "fUmxaY8tsVf", "p2TjG5L7gfw", "iteIkVf68jY", "H7Pf8ugBfpf", "ZbC9oYLjvsH",
];
export const MDR_CAESAREAN_SECTION_6 = ["MfICS1uUUdJ", "NuHtNZpdXaD", "qNNcwXQDFVE"];
export const MDR_UNKNOWN_CAUSE = "C3RST8YWsXt";
export const MDR_ADMISSION = "c5kDr80smH8";
export const MDR_DEATH = "WzauwhVOwM0";
/** Duration of stay: days, hours, minutes. Calculated from admission and death. */
export const MDR_STAY = ["IH7NTNcSZYk", "ww21ycTPDb6", "BJXbwUs4tGF"];
const MDR_CAUSES_SECTION = /^SECTION 8a/i;

/** 8b certified-cause chain, same data elements in every form that has it. */
const CAUSE_CHAIN = {
  causes: ["sfpqAeqKeyQ", "zb7uTuBCPrN", "QGFYJK00ES7", "CnPGhOcERFF"],
  types: ["Ylht9kCLSRW", "myydnkmLfhp", "aC64sB86ThG", "cmZrrHfTxW3"],
  times: ["WkXxkKEJLsg", "fleGy9CvHYh", "hO8No9fHVd2", "eCVDO6lt4go"],
};

/**
 * Retired questions kept on a saved record: shown (read-only) only when the
 * record already holds an answer, otherwise they stay out of the form.
 */
export const LEGACY_WHEN_EMPTY = [
  "KijgmSoHqpQ", // MDR free-text recommendations (now a table)
  "BOUN3iTMTzU", "nAc07V7ZYUL", // PDR free-text comments / actions (now a table)
  "CQUQiCpk4um", // PDR 3-choice mode of delivery (now 7 choices)
];

/** Causes that cannot apply to a stillbirth. */
const PDR_STILLBIRTH_IMPOSSIBLE_CAUSES = ["Q6HnSrUTl39", "jSaonaOE68O"]; // tetanus, septicaemia

const PDR_CAUSE_TEXT = new Set(["H4iDsba7jkw", "xYenYvBElrk"]);

const PDR_CAUSE_TICKS = [
  "Q6HnSrUTl39", "UaGg4B3DUac", "jSaonaOE68O", "xYenYvBElrk",
  "xjeIBJ2XyPd", "H4iDsba7jkw", "apgGGC11v8Y",
];

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
  // Name is captured as three parts; ZYKmQ9GPOaF keeps the joined full name
  // for record lists, certificates and the CDR/ICD linkage.
  fullName: "ZYKmQ9GPOaF",
  surname: "Q7VM7swIWb6",
  givenName: "QmcOqkcNTip",
  otherName: "tuGPnGHWqQn",
};

const NAME_PARTS = [MCCOD.surname, MCCOD.givenName, MCCOD.otherName];

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
  { child: "VtF7Nx2yjat", parent: "VnDcrZ4gCdR", when: "positive", forms: ["pdr"] },
  { child: "b9JlESs135J", parent: "o69aE6o8LfO", when: "no", forms: ["pdr"] },
  // MDR
  { child: "eJwpqR9t7YM", parent: "iAgu1y93XAB", when: "yes", forms: ["mdr"] },
  { child: "NEW_mdr_autopsy_performed", parent: "NEW_mdr_autopsy_requested", when: "yes", forms: ["mdr"] },
  { child: "hZlRNVrmS1y", parent: "QidQVyBFspW", when: "yes", forms: ["mdr"] },
  { child: "IACcLw1GbkR", parent: "oz0vASbQvq5", when: "positive", forms: ["mdr"] },
  { child: "OJVwBSHC4b0", parent: "oz0vASbQvq5", when: "positive", forms: ["mdr"] },
  // CDR (real DHIS2 UIDs)
  { child: "xOyckoyi422", parent: "yNsiNIq5D59", when: "yes", forms: ["cdr"] }, // referred from?
  { child: "g3yvhO9uFpI", parent: "yNsiNIq5D59", when: "yes", forms: ["cdr"] }, // referral facility name
  { child: "hPVCXHCvwrc", parent: "qFCcNYREZjM", when: "yes", forms: ["cdr"] }, // nutrition status
  { child: "IUq6H8B59IH", parent: "xPCrY214eXn", when: "no", forms: ["cdr"] }, // missed doses
  { child: "xbxWKAsmIN0", parent: "tKPEnIA0OAy", when: "yes", forms: ["cdr"] }, // ANC how many times
  { child: "JXTeTVgMDOB", parent: "tKPEnIA0OAy", when: "yes", forms: ["cdr"] }, // GA at first visit
  { child: "g3UtTdCciWW", parent: "kWgqvfLcgPL", when: "yes", forms: ["cdr"] }, // prophylactic antibiotics
  { child: "gjtE3eQbY1F", parent: "OfoBANMXa2W", when: "no", forms: ["cdr"] }, // treatment gaps
  { child: "uvkRiOjbT5v", parent: "YcGZgrQsCDg", when: "no", forms: ["cdr"] }, // guideline gaps
  { child: "QwtvsW7nnsq", parent: "NS5BU8xUaTb", when: "yes", forms: ["cdr"] }, // missing drug
  { child: "GNcZNHZzkQ0", parent: "NS5BU8xUaTb", when: "yes", forms: ["cdr"] }, // reason
  // Investigation "Results" appear only once the test is marked Done.
  { child: "rM8N5O9U2cJ", parent: "qRTPdydasD8", when: "yes", forms: ["cdr"] },
  { child: "Wo5Y36If9KN", parent: "TiLOqqWZMFC", when: "yes", forms: ["cdr"] },
  { child: "rLovNSMYQUX", parent: "BsbK0Og0Et1", when: "yes", forms: ["cdr"] },
  { child: "h68IiMVXpY8", parent: "nPwwg6KuS8K", when: "yes", forms: ["cdr"] },
  { child: "egQ7WouuJ2I", parent: "QeewvymWLUI", when: "yes", forms: ["cdr"] },
  { child: "rU3OQWsuQNg", parent: "WOUTeWO4N2B", when: "yes", forms: ["cdr"] },
  { child: "hWsEil3PGdm", parent: "wvxA1sftXz6", when: "yes", forms: ["cdr"] },
  { child: "PPGUwRVze5V", parent: "ra1MS089BCO", when: "yes", forms: ["cdr"] },
  { child: "sgREYy06ifA", parent: "rm6Vi9rW7sJ", when: "yes", forms: ["cdr"] },
  { child: "WGpDDBmMIHR", parent: "wjY44Ck5Q5z", when: "yes", forms: ["cdr"] },
];

export const emptySkipState = (): SkipState => ({
  hiddenFields: new Set(),
  disabledFields: new Set(),
  hiddenSections: new Set(),
  sectionNotes: {},
  hints: {},
});

const hasValue = (v: any) =>
  v !== undefined &&
  v !== null &&
  v !== "" &&
  !(Array.isArray(v) && v.length === 0);

export const optionLabel = (de: string, value: any, meta: Record<string, DeMeta>) => {
  const opt = meta[de]?.options?.find((o) => o.code === value);
  return opt?.name ?? (value == null ? "" : String(value));
};

export const isYes = (values: Values, de: string, meta: Record<string, DeMeta>) => {
  const t = optionLabel(de, values[de], meta);
  return /^(yes|y|true)$/i.test(t.trim()) || values[de] === true || values[de] === "true" || /^YN01-01$/i.test(String(values[de]));
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

// Label patterns that mark a field as depending on the answer above it.
const YES_IF = /^\s*if\s+yes\b/i;
const NO_IF = /^\s*if\s+no\b/i;
const HAS_SPECIFY = /\bspecif(y|ies)\b/i;
const HAS_OTHER = /\bothers?\b/i;
const OTHER_END = /[-(]\s*others?\s*\)?\s*$/i;

/** True when the parent field's answer is an "Other" option / a ticked box. */
const otherSelected = (
  parent: string,
  values: Values,
  meta: Record<string, DeMeta>
) => {
  const v = values[parent];
  if (!hasValue(v)) return false;
  if (meta[parent]?.valueType === "TRUE_ONLY" || typeof v === "boolean") {
    return isTruthyCheckbox(v);
  }
  const label = optionLabel(parent, v, meta);
  // If the value mapped to an option name, require it to be an "Other" option.
  if (label && label !== String(v)) return /other/i.test(label);
  // Free text / unmapped value present — can't infer, so don't hide.
  return true;
};

/** True when the parent has been answered affirmatively (ticked / not "No"). */
const affirmative = (
  parent: string,
  values: Values,
  meta: Record<string, DeMeta>
) => {
  const v = values[parent];
  if (!hasValue(v)) return false;
  if (meta[parent]?.valueType === "TRUE_ONLY" || typeof v === "boolean") {
    return isTruthyCheckbox(v);
  }
  return !isNo(values, parent, meta);
};

/**
 * Generic, label-driven conditional visibility. For every field whose label
 * signals a dependency ("If Yes…", "If No…", "…(Other/specify)"), tie it to the
 * question immediately above it and hide it until that answer matches. Fields
 * with an explicit rule (see CONDITIONAL) or a bespoke semantic rule are left
 * to those, so this never fights a known mapping. Errs toward showing.
 */
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Nearest preceding field whose label is a prefix of the child's label. */
const findPrefixParent = (
  childLabel: string,
  preceding: FormField[]
): string | null => {
  const c = norm(childLabel);
  for (let i = preceding.length - 1; i >= 0; i--) {
    const pl = norm(preceding[i].label || "");
    if (pl.length >= 5 && pl !== c && c.startsWith(pl)) return preceding[i].de;
  }
  return null;
};

const applyLabelConditionals = (
  def: FormDefinition,
  values: Values,
  meta: Record<string, DeMeta>,
  state: SkipState,
  overridden: Set<string>
) => {
  for (const sec of def.layout) {
    const preceding: FormField[] = [];
    for (const group of sec.groups) {
      for (const f of group.fields) {
        const lbl = f.label || "";
        const prev = preceding.length
          ? preceding[preceding.length - 1].de
          : null;
        if (!overridden.has(f.de)) {
          if (YES_IF.test(lbl)) {
            // "If Yes…" answers the question directly above it.
            if (prev && !isYes(values, prev, meta)) state.hiddenFields.add(f.de);
          } else if (NO_IF.test(lbl)) {
            if (prev && !isNo(values, prev, meta)) state.hiddenFields.add(f.de);
          } else if (HAS_SPECIFY.test(lbl) || OTHER_END.test(lbl)) {
            // "…Other (specify)" / "X specify" → tie to the field it extends,
            // matched by label prefix (its parent question), and show only when
            // that is Other / ticked. Skip "If <thing> specify" (non-Other
            // trigger) and anything with no confident parent — leave visible.
            const semanticIf = /^\s*if\b/i.test(lbl) && !HAS_OTHER.test(lbl);
            const parent = semanticIf ? null : findPrefixParent(lbl, preceding);
            if (parent) {
              // "…(Other)" triggers on the parent's Other option; a bare
              // "…specify" triggers when the parent is ticked / answered Yes.
              const triggered = HAS_OTHER.test(lbl)
                ? otherSelected(parent, values, meta)
                : affirmative(parent, values, meta);
              if (!triggered) state.hiddenFields.add(f.de);
            }
          }
        }
        preceding.push(f);
      }
    }
  }
};

/** CDSR skips maternal risk factors if the child was under 28 completed days. */
const applyCdrRules = (
  values: Values,
  def: FormDefinition,
  state: SkipState,
  ids: ChildFieldIds,
  meta: Record<string, DeMeta>
) => {
  for (const key of Object.keys(childFollowUps) as (keyof ChildFieldIds)[]) {
    const de = ids[key];
    const parent = childFollowUps[key];
    if (de && parent && !isYes(values, parent, meta)) state.hiddenFields.add(de);
  }
  for (const de of hiddenChildFields(values, ids)) state.hiddenFields.add(de);
  const age = ids.birthDate && calculateChildAge(values[ids.birthDate], values[childDateOfDeath]);
  const hasNewAge = [ids.ageYears, ids.ageMonths, ids.ageDays].some((de) => de && answered(values[de]));
  if (age) {
    for (const de of [ids.ageYears, ids.ageMonths, ids.ageDays, ids.ageSource]) {
      if (de) state.disabledFields.add(de);
    }
  }
  if (ids.birthDate && (hasNewAge || age)) state.hiddenFields.add(legacyAgeDays);
  if (childUnder28Days(values, ids)) {
    def.layout.forEach((sec, idx) => {
      if (/maternal risk factor/i.test(sec.title)) {
        state.hiddenSections.add(idx);
        state.sectionNotes[idx] =
          "Skipped — child under 28 days (per form instruction)";
      }
    });
  }
};

/** Cause-of-death chain: line b opens after a, c after b, d after c. */
const applyCauseChain = (values: Values, state: SkipState) => {
  const { causes, types, times } = CAUSE_CHAIN;
  for (let i = 1; i < causes.length; i++) {
    if (!hasValue(values[causes[i - 1]])) {
      state.disabledFields.add(causes[i]);
      state.hints[causes[i]] = i === 1 ? "Fill cause (a) first" : `Fill cause (${"abcd"[i - 1]}) first`;
    }
  }
  for (let i = 0; i < causes.length; i++) {
    if (!hasValue(values[types[i]])) state.disabledFields.add(times[i]);
    // A line that cannot be filled yet cannot carry an interval either.
    if (state.disabledFields.has(causes[i])) {
      state.disabledFields.add(types[i]);
      state.disabledFields.add(times[i]);
    }
  }
};

/**
 * Hide dependants unless the parent is answered Yes. An unanswered parent only
 * keeps its dependants when one of them already holds saved data.
 */
const closeUnlessYes = (
  state: SkipState,
  values: Values,
  meta: Record<string, DeMeta>,
  parent: string,
  children: string[]
) => {
  if (isYes(values, parent, meta)) return;
  if (!hasValue(values[parent]) && children.some((de) => hasValue(values[de]))) return;
  for (const de of children) state.hiddenFields.add(de);
};

/** Every tick and note in section 8a, except Unknown. */
export const mdrCauseIds = (def: FormDefinition): string[] => {
  const ids: string[] = [];
  for (const sec of def.layout) {
    if (!MDR_CAUSES_SECTION.test(sec.title)) continue;
    for (const group of sec.groups) {
      for (const f of group.fields) if (f.de !== MDR_UNKNOWN_CAUSE) ids.push(f.de);
    }
  }
  return ids;
};

/** Early-pregnancy column is not on the July 2024 form: hidden, never wiped. */
const MDR_EARLY_PREGNANCY_COLUMN = [
  "hUT25oOxMmX", "aOIkElUMfoW", "kFUUPTSrZCS", "qgkXe3wF21D", "arW1EL6XQpE",
  "PBi1HNrSiFj", "oStdvpxWD7g", "lRT0g2bRtwZ", "PpzqCyOQzuS", "I9wJoLNkSUp",
  "OeuIhu9K7XC", "AqsuNrGpPha", "HXSJvazF11O", "CbT0u1Fx6ZN",
];

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
    isYes(values, MCCOD.external, meta) ||
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

  applyCauseChain(values, state);

  PREG_FOLLOWUPS.forEach((de) => {
    if (!isYes(values, MCCOD.pregnant, meta)) state.hiddenFields.add(de);
  });
};

/** Side-effects when values change (auto-fill, clear invalid/hidden answers). */
export const applySkipEffects = (
  changed: Values,
  values: Values,
  meta: Record<string, DeMeta>,
  formId: FormId,
  def?: FormDefinition,
  previous?: Values
): Values => {
  if (formId === "cdr") return {};
  const patch = baseSkipEffects(changed, values, meta, formId, def);
  if ((formId !== "mdr" && formId !== "pdr") || !def) return patch;

  // Clear whatever this change just closed ("Close, Clear, Reopen").
  if (previous) {
    const before = computeSkipState(formId, def, previous, meta).hiddenFields;
    let merged: Values = { ...values, ...patch };
    for (let pass = 0; pass < 3; pass++) {
      const hidden = computeSkipState(formId, def, merged, meta).hiddenFields;
      let grew = false;
      hidden.forEach((de) => {
        if (before.has(de) || !hasValue(merged[de])) return;
        if (merged[de] === false) return;
        patch[de] = clearedValue(de, merged[de], meta);
        grew = true;
      });
      if (!grew) break;
      merged = { ...values, ...patch };
    }
  }
  return patch;
};

/** Empty value for a cleared answer: a box is unticked, anything else is blank. */
const clearedValue = (de: string, current: any, meta: Record<string, DeMeta>) =>
  meta[de]?.valueType === "TRUE_ONLY" || typeof current === "boolean" ? false : undefined;

const toMoment = (v: any) => {
  if (!v) return null;
  const m = moment.isMoment(v) ? v.clone() : moment(v);
  return m.isValid() ? m : null;
};

/** Duration of stay from admission to death as [days, hours, minutes]. */
export const stayDuration = (admission: any, death: any): [number, number, number] | null => {
  const a = toMoment(admission);
  const d = toMoment(death);
  if (!a || !d || d.isBefore(a)) return null;
  const totalMinutes = d.diff(a, "minutes");
  return [Math.floor(totalMinutes / 1440), Math.floor((totalMinutes % 1440) / 60), totalMinutes % 60];
};

const baseSkipEffects = (
  changed: Values,
  values: Values,
  meta: Record<string, DeMeta>,
  formId: FormId,
  def?: FormDefinition
): Values => {
  const patch: Values = {};

  if (formId === "mdr") {
    // Unknown cause: ticking it clears every other cause.
    if (def && MDR_UNKNOWN_CAUSE in changed && isTruthyCheckbox(values[MDR_UNKNOWN_CAUSE])) {
      for (const de of mdrCauseIds(def)) {
        if (hasValue(values[de])) patch[de] = clearedValue(de, values[de], meta);
      }
    }
    // Duration of stay follows the admission and death dates.
    if (MDR_ADMISSION in changed || MDR_DEATH in changed) {
      const stay = stayDuration(values[MDR_ADMISSION], values[MDR_DEATH]);
      MDR_STAY.forEach((de, i) => { patch[de] = stay ? stay[i] : undefined; });
    }
  }
  if (formId === "pdr" && "Yis06rsFWQz" in changed && isTruthyCheckbox(values.Yis06rsFWQz)) {
    for (const de of PDR_APGAR_SCORES) patch[de] = undefined;
  }
  if (formId === "mdr") {
    for (const choices of deliveryChoices) {
      const selected = choices.find((de) => de in changed && isYes(values, de, meta));
      if (selected) {
        for (const de of choices) if (de !== selected) patch[de] = false;
      }
    }
  }

  if (formId === "mccod" && NAME_PARTS.some((de) => de in changed)) {
    const parts = [values[MCCOD.givenName], values[MCCOD.otherName], values[MCCOD.surname]]
      .map((v) => (v == null ? "" : String(v).trim()))
      .filter(Boolean);
    patch[MCCOD.fullName] = parts.join(" ");
  }

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

  if (formId === "pdr" && perinatalUnknownCause in changed) {
    if (isTruthyCheckbox(values[perinatalUnknownCause]) || isYes(values, perinatalUnknownCause, meta)) {
      // Two of the causes are free-text "specify" boxes: blank them, untick the rest.
      for (const de of PDR_CAUSE_TICKS) patch[de] = PDR_CAUSE_TEXT.has(de) ? undefined : false;
    }
  }

  if (formId === "pdr" && perinatalDeathType in changed) {
    const deathType = optionLabel(perinatalDeathType, values[perinatalDeathType], meta);
    const stillbirth = /still\s*birth|fresh|macerated/i.test(deathType) && !/neonatal/i.test(deathType);
    if (stillbirth) {
      for (const de of [...PDR_NEWBORN_FIELDS, ...PDR_STILLBIRTH_IMPOSSIBLE_CAUSES]) {
        patch[de] = undefined;
      }
    }
  }

  if (formId === "mdr" && maternalAncAttended in changed) {
    const ancLabel = optionLabel(maternalAncAttended, values[maternalAncAttended], meta);
    if (!isYes(values, maternalAncAttended, meta) || /records?\s+not\s+available|unknown/i.test(ancLabel)) {
      for (const de of MDR_ANC_FOLLOWUPS) patch[de] = undefined;
    }
  }

  if (formId === "pdr" && perinatalAncAttended in changed && !isYes(values, perinatalAncAttended, meta)) {
    for (const de of PDR_ANC_FOLLOWUPS) patch[de] = undefined;
  }

  return patch;
};

export const computeSkipState = (
  formId: FormId,
  def: FormDefinition,
  values: Values,
  meta: Record<string, DeMeta>,
  childFieldIds: ChildFieldIds = {}
): SkipState => {
  const state = emptySkipState();

  // Fields with an explicit or bespoke rule are excluded from the generic
  // label-driven pass so the two never disagree.
  const overridden = new Set<string>(
    CONDITIONAL.filter((r) => !r.forms || r.forms.includes(formId)).map(
      (r) => r.child
    )
  );

  applyConditionalChildren(formId, values, meta, state);
  applyLabelConditionals(def, values, meta, state, overridden);

  if (formId === "mdr") {
    // Place of death: only Health Facility implies admission fields apply.
    const deathPlaceCode = String(values.NEW_mdr_death_place_type ?? "");
    const deathPlaceLabel = optionLabel("NEW_mdr_death_place_type", values.NEW_mdr_death_place_type, meta);
    const diedAtFacility =
      deathPlaceCode === "HealthFacility" || /^health\s*facility$/i.test(deathPlaceLabel);
    if (hasValue(values.NEW_mdr_death_place_type) && !diedAtFacility) {
      for (const de of ["wmNrbtFpcdy", "ByIsCiqkq4v", "vORgqb7tQBu", "jdxl2rdeDEk", "c5kDr80smH8", "IH7NTNcSZYk", "ww21ycTPDb6", "BJXbwUs4tGF"]) {
        state.hiddenFields.add(de);
      }
    }
    // No ANC / records unavailable → close facility type, risk, meds, investigations.
    const ancLabel = optionLabel(maternalAncAttended, values[maternalAncAttended], meta);
    if (!isYes(values, maternalAncAttended, meta) || /records?\s+not\s+available|unknown/i.test(ancLabel)) {
      for (const de of MDR_ANC_FOLLOWUPS) state.hiddenFields.add(de);
    }
    if (!isYes(values, maternalLabour, meta)) {
      for (const de of ["E0OEw6yVcJm", "NKKunKgeJiD", "pVGyUKsZywW", "tkiEm0lt9cV", "HJhEdW3YNL3"]) state.hiddenFields.add(de);
    }
    if (state.hiddenFields.has("E0OEw6yVcJm") || !isYes(values, "E0OEw6yVcJm", meta)) state.hiddenFields.add("v9BgVEytqsi");
    const delivered = isYes(values, maternalDelivery, meta);
    const deliveryNo = isNo(values, maternalDelivery, meta);
    if (!delivered) {
      for (const de of [maternalDeliveryPlace, ...deliveryChoices.flat()]) state.hiddenFields.add(de);
    }
    const place = optionLabel(maternalDeliveryPlace, values[maternalDeliveryPlace], meta);
    if (!delivered || !/facility|hospital|health cent(?:re|er)|clinic|maternity/i.test(place)) state.hiddenFields.add("NEW_mdr_delivery_facility_name");
    if (!isYes(values, "NEW_mdr_autopsy_requested", meta) || !isYes(values, "NEW_mdr_autopsy_performed", meta)) state.hiddenFields.add("UEmwYMZK0Uh");
    // July 2024 paper uses 3 columns (antenatal / intrapartum / postpartum).
    for (const de of MDR_EARLY_PREGNANCY_COLUMN) state.hiddenFields.add(de);

    // 4.3 other type of facility
    if (!/other/i.test(optionLabel("a5fh4wtDzmi", values.a5fh4wtDzmi, meta))) state.hiddenFields.add("w3QkbELzeDu");
    // Tests: the result opens only when the test was done.
    closeUnlessYes(state, values, meta, "vVP5ClqKkHQ", ["oz0vASbQvq5", "IACcLw1GbkR", "OJVwBSHC4b0"]);
    closeUnlessYes(state, values, meta, "x4luCocBY5h", ["z8bU25JRAGG"]);
    closeUnlessYes(state, values, meta, "T3QwXHphTIu", ["NEW_mdr_hb_level"]);
    closeUnlessYes(state, values, meta, "QPw7nHXJqe9", ["NEW_mdr_hepb_result"]);
    closeUnlessYes(state, values, meta, "c6gVPQ5rTOo", ["NEW_mdr_urinalysis_result"]);
    // Vital signs: the reading opens only when it was recorded.
    closeUnlessYes(state, values, meta, "Rrs7OQx1yMS", ["ejbJJ1gTnQb", "Hn09AcoW4Mk"]);
    closeUnlessYes(state, values, meta, "rn8cGimwQ3a", ["c8hsSJy63ay"]);
    closeUnlessYes(state, values, meta, "OWhIguUYA66", ["MDXum0oNBQb"]);
    // Dead on arrival closes the admission assessment.
    if (MDR_DEAD_ON_ARRIVAL.some((de) => isTruthyCheckbox(values[de]))) {
      for (const de of MDR_ADMISSION_ASSESSMENT) state.hiddenFields.add(de);
    }

    // Delivery did not take place: next section, nothing after birth applies.
    if (deliveryNo) {
      state.hiddenFields.add(maternalPregnancyOutcome);
      for (const de of MDR_COMPLICATIONS) state.hiddenFields.add(de);
      for (const de of [...MDR_DELIVERY_INTERVENTIONS, ...MDR_POSTPARTUM_CAUSES]) state.hiddenFields.add(de);
      if (!MDR_ABORTION_ECTOPIC.some((de) => isTruthyCheckbox(values[de]))) state.hiddenFields.add("LFYN9XzE4cB");
    }
    const outcomeLabel = optionLabel(maternalPregnancyOutcome, values[maternalPregnancyOutcome], meta);
    const weightRelevant = /live\s*birth|still\s*birth/i.test(outcomeLabel) ||
      (!hasValue(values[maternalPregnancyOutcome]) && hasValue(values.XW2CKaAiMKc));
    if (deliveryNo || !weightRelevant) state.hiddenFields.add("XW2CKaAiMKc");
    state.hints[maternalPregnancyOutcome] = "Required by DHIS2.";

    // Labour did not occur: no intrapartum care, no obstructed-labour causes.
    if (isNo(values, maternalLabour, meta)) {
      for (const de of [...MDR_INTRAPARTUM_INTERVENTIONS, ...MDR_OBSTRUCTED_LABOUR_CAUSES]) state.hiddenFields.add(de);
    }
    // Vaginal delivery: caesarean-only causes do not apply.
    if (!MDR_CAESAREAN_MODES.some((de) => isTruthyCheckbox(values[de])) &&
        deliveryChoices[0].some((de) => isTruthyCheckbox(values[de]))) {
      for (const de of MDR_CAESAREAN_CAUSES) state.hiddenFields.add(de);
    }

    // 8a: Unknown excludes every other cause.
    const causeIds = mdrCauseIds(def);
    if (isTruthyCheckbox(values[MDR_UNKNOWN_CAUSE]) && !causeIds.some((de) => hasValue(values[de]) && values[de] !== false && values[de] !== "false")) {
      for (const de of causeIds) state.hiddenFields.add(de);
    }

    // Duration of stay is calculated from admission and death.
    for (const de of MDR_STAY) state.disabledFields.add(de);
    state.hints[MDR_STAY[0]] = "Calculated from admission and death.";
    applyCauseChain(values, state);
  }

  if (formId === "pdr") {
    if (!isYes(values, perinatalAncAttended, meta)) {
      for (const de of PDR_ANC_FOLLOWUPS) state.hiddenFields.add(de);
    }
    const pregType = optionLabel(perinatalPregnancyType, values[perinatalPregnancyType], meta);
    if (!/multiple|twin|triplet/i.test(pregType)) {
      state.hiddenFields.add("NEW_pdr_multiple_babies_count");
    }
    const deathType = optionLabel(perinatalDeathType, values[perinatalDeathType], meta);
    const stillbirth = /still\s*birth|fresh|macerated/i.test(deathType) && !/neonatal/i.test(deathType);
    if (stillbirth) {
      for (const de of PDR_NEWBORN_FIELDS) state.hiddenFields.add(de);
      for (const de of PDR_STILLBIRTH_IMPOSSIBLE_CAUSES) state.hiddenFields.add(de);
    }
    if (isTruthyCheckbox(values[perinatalUnknownCause]) || isYes(values, perinatalUnknownCause, meta)) {
      for (const de of PDR_CAUSE_TICKS) state.hiddenFields.add(de);
    }
    if (isTruthyCheckbox(values.Yis06rsFWQz) || isYes(values, "Yis06rsFWQz", meta)) {
      for (const de of PDR_APGAR_SCORES) state.hiddenFields.add(de);
    }
    if (!isYes(values, "x7k2caL4psq", meta)) {
      for (const de of [...PDR_RESUS_DONE, ...PDR_RESUS_BY, ...PDR_MEDICATIONS]) state.hiddenFields.add(de);
    }
    // 3.7.4.2 medication items open when "Medication given" is ticked.
    if (!isTruthyCheckbox(values.CprvAYJIWNv)) {
      for (const de of PDR_MEDICATIONS) state.hiddenFields.add(de);
    }

    // 1.4 / 1.7 "Others, specify"
    if (!/other/i.test(optionLabel("NEW_pdr_facility_level", values.NEW_pdr_facility_level, meta))) {
      state.hiddenFields.add("NEW_pdr_facility_level_other");
    }
    if (!/other/i.test(optionLabel("o03g3QSYR0b", values.o03g3QSYR0b, meta))) {
      state.hiddenFields.add("NEW_pdr_referred_from_other");
    }
    // 1.6 baby not referred: referred-from and facility name close.
    closeUnlessYes(state, values, meta, "bS24JUbPyQv", ["o03g3QSYR0b", "NEW_pdr_referred_from_other", "HJd1MWPsvUC"]);
    // 2.5.3 / 2.5.6 tests: results open only when the test was done.
    closeUnlessYes(state, values, meta, "ywMAGkuvTjq", ["VnDcrZ4gCdR", "VtF7Nx2yjat"]);
    closeUnlessYes(state, values, meta, "DPG74K71T7a", ["qnhVulYBuyO"]);
    // 3.2 not a health facility: facility name and partograph close.
    const placeLabel = optionLabel("LjrdbcFRI1d", values.LjrdbcFRI1d, meta);
    if (hasValue(values.LjrdbcFRI1d) && !/facility|hospital|health cent(?:re|er)|clinic/i.test(placeLabel)) {
      for (const de of ["Boui663joOP", "aLvTannWmvI", "o69aE6o8LfO", "b9JlESs135J"]) state.hiddenFields.add(de);
    }
    // 3.4 partograph not used or unknown: correct use and gap close.
    closeUnlessYes(state, values, meta, "aLvTannWmvI", ["o69aE6o8LfO", "b9JlESs135J"]);

    // Legacy 3-choice mode of delivery stays visible only on records that hold it.
    applyCauseChain(values, state);
  }

  // Retired questions: shown (read-only data) only when the record has an answer.
  for (const de of LEGACY_WHEN_EMPTY) {
    if (!hasValue(values[de])) state.hiddenFields.add(de);
  }

  // A "specify" box opens only when its tick is ticked.
  for (const sec of def.layout) {
    for (const group of sec.groups) {
      for (const f of group.fields) {
        if (!f.specifyFor) continue;
        const parent = values[f.specifyFor];
        if (!(isTruthyCheckbox(parent) || isYes(values, f.specifyFor, meta))) state.hiddenFields.add(f.de);
      }
    }
  }

  // Children of a closed question close with it.
  for (let pass = 0; pass < 3; pass++) {
    let grew = false;
    for (const rule of CONDITIONAL) {
      if (rule.forms && !rule.forms.includes(formId)) continue;
      if (state.hiddenFields.has(rule.parent) && !state.hiddenFields.has(rule.child)) {
        state.hiddenFields.add(rule.child);
        grew = true;
      }
    }
    if (!grew) break;
  }

  if (formId === "mccod" || def.isMccod) {
    applyMccodRules(values, meta, def, state);
  }

  if (formId === "cdr") {
    applyCdrRules(values, def, state, childFieldsForDisplay(childFieldIds), meta);
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
