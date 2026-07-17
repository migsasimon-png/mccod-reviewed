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

/** Child Death Review: maternal risk factors only for children < 28 days. */
const CDR_AGE_DAYS = "CdceEuqRSwT";
const applyCdrRules = (
  values: Values,
  def: FormDefinition,
  state: SkipState
) => {
  // The age element only holds days for infants under one month; when it is
  // filled and under 28 days, the maternal risk-factor section is skipped.
  const days = values[CDR_AGE_DAYS];
  if (hasValue(days) && Number(days) < 28) {
    def.layout.forEach((sec, idx) => {
      if (/maternal risk factor/i.test(sec.title)) {
        state.hiddenSections.add(idx);
        state.sectionNotes[idx] =
          "Skipped — child under 28 days (per form instruction)";
      }
    });
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

  // Fields with an explicit or bespoke rule are excluded from the generic
  // label-driven pass so the two never disagree.
  const overridden = new Set<string>(
    CONDITIONAL.filter((r) => !r.forms || r.forms.includes(formId)).map(
      (r) => r.child
    )
  );

  applyConditionalChildren(formId, values, meta, state);
  applyLabelConditionals(def, values, meta, state, overridden);

  if (formId === "mccod" || def.isMccod) {
    applyMccodRules(values, meta, def, state);
  }

  if (formId === "cdr") {
    applyCdrRules(values, def, state);
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
