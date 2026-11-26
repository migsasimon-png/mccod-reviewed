import moment from "moment";
import { FormDefinition, FormField, FormGroup } from "./types";
import metadata from "./childReviewMetadata.json";

export const childDateOfDeath = "mfR5fhnOQTA";
export const childTimeOfDeath = "IGjo7hyxtxF";
export const legacyAgeDays = "CdceEuqRSwT";

// Register these codes only on CDR stage elements with the specified semantics.
export const childFields = metadata;

type ChildFieldKey = keyof typeof childFields;
export type ChildFieldIds = Partial<Record<ChildFieldKey, string>>;
type Values = Record<string, any>;

const ageSources = ["CALCULATED", "CAREGIVER_REPORTED", "ESTIMATED"] as const;
const entries = Object.keys(childFields) as ChildFieldKey[];

/** Affirmative answers across TEXT option sets and BOOLEAN DEs. */
const isAffirmative = (value: any) =>
  value === true || value === "true" || /^yes$/i.test(String(value ?? "").trim());

const matchesControl = (value: any, expected: string) => {
  if (/^(yes|true)$/i.test(expected)) return isAffirmative(value);
  if (/^no$/i.test(expected) || expected === "false") {
    return value === false || value === "false" || /^no$/i.test(String(value ?? "").trim());
  }
  return String(value ?? "") === expected;
};

export function resolveChildFields(elements: any[]): ChildFieldIds {
  const ids: ChildFieldIds = {};
  for (const key of entries) {
    const spec = childFields[key];
    const candidates = elements.filter((element) => element?.code === spec.code);
    if (candidates.length !== 1) continue;
    const element = candidates[0];
    if (!/^[A-Za-z][A-Za-z0-9]{10}$/.test(element.id) || element.valueType !== spec.type) continue;
    const options = element.optionSet?.options || [];
    const expected = "options" in spec ? spec.options : [];
    if (options.length !== expected.length ||
      expected.some((code) => !options.some((option: any) => option.code === code))) continue;
    ids[key] = element.id;
  }
  if (![ids.birthDate, ids.ageYears, ids.ageMonths, ids.ageDays, ids.ageSource].every(Boolean)) {
    delete ids.birthDate;
    delete ids.ageYears;
    delete ids.ageMonths;
    delete ids.ageDays;
    delete ids.ageSource;
  }
  if (!ids.admission || !ids.stay) {
    delete ids.admission;
    delete ids.stay;
  }
  for (const [child, parent] of Object.entries(controlledFollowUps)) {
    if (parent && !ids[parent.key]) delete ids[child as ChildFieldKey];
  }
  if (!ids.otherHistoryDetails) delete ids.otherHistory;
  if (!ids.stabilized || !ids.ward || !ids.assessmentAppropriate) {
    for (const key of assessmentKeys) delete ids[key];
  }
  return ids;
}

export const previousAdmission = "A5mxXfgcbvg";
export const childFollowUps: Partial<Record<ChildFieldKey, string>> = {
  previousFacility: previousAdmission,
  previousPeriod: previousAdmission,
  previousDetails: previousAdmission,
  referralTime: "yNsiNIq5D59",
  referralReason: "yNsiNIq5D59",
  referralArrival: "yNsiNIq5D59",
  referralDocuments: "yNsiNIq5D59",
  unavailableDetails: "JDDXYWLRunF",
  complicationDetails: "KWBvJMz69gN",
  referralFacilityType: "yNsiNIq5D59",
  criticalStaffDetails: "aJ5HMCLsHYr",
  staffSkillsDetails: "RzEDajSvfxr",
  staffMisconductDetails: "E9wgWyLMSoG",
};

const assessmentKeys: ChildFieldKey[] = [
  "growthPerformed", "developmentPerformed", "growthAssessmentTime",
  "growthFindings", "developmentFindings", "assessmentReason",
];
const controlledFollowUps: Partial<Record<ChildFieldKey, { key: ChildFieldKey; value: string }>> = {
  tbDetails: { key: "tbScreened", value: "Yes" },
  scdDetails: { key: "scdScreened", value: "Yes" },
  disabilityDetails: { key: "disabilityScreened", value: "Yes" },
  growthFindings: { key: "growthPerformed", value: "Yes" },
  developmentFindings: { key: "developmentPerformed", value: "Yes" },
  // Apgar Yes → score boxes; Apgar No → cry + comment
  apgarOne: { key: "apgarAssessed", value: "Yes" },
  apgarFive: { key: "apgarAssessed", value: "Yes" },
  immediateCry: { key: "apgarAssessed", value: "No" },
  birthEvidence: { key: "apgarAssessed", value: "No" },
  otherHistoryDetails: { key: "otherHistory", value: "true" },
  hbsResult: { key: "hbsStatus", value: "Done" },
  geneXpertResult: { key: "geneXpertStatus", value: "Done" },
};

const pendingFieldPrefix = "pending-cdsr-";
export const isPendingChildField = (id: string) => id.startsWith(pendingFieldPrefix);

export function childFieldsForDisplay(ids: ChildFieldIds): ChildFieldIds {
  const displayIds = { ...ids };
  for (const key of ["childNin", "nextOfKinNin"] as const) {
    if (!ids[key]) displayIds[key] = pendingFieldPrefix + key;
  }
  for (const key of entries) {
    const rule = controlledFollowUps[key];
    const hasParent = childFollowUps[key] || (rule && ids[rule.key]);
    if (!ids[key] && hasParent && ["TEXT", "LONG_TEXT"].includes(childFields[key].type) &&
      !("options" in childFields[key])) {
      displayIds[key] = pendingFieldPrefix + key;
    }
  }
  return displayIds;
}

export function hiddenChildFields(values: Values, ids: ChildFieldIds): string[] {
  const hiddenKeys: ChildFieldKey[] = [];
  const get = (key: ChildFieldKey) => ids[key] ? values[ids[key]!] : undefined;
  for (const [key, rule] of Object.entries(controlledFollowUps)) {
    if (rule && !matchesControl(get(rule.key), rule.value)) hiddenKeys.push(key as ChildFieldKey);
  }
  const growthYes = isAffirmative(get("growthPerformed"));
  const developmentYes = isAffirmative(get("developmentPerformed"));
  const growthNo = matchesControl(get("growthPerformed"), "No");
  const developmentNo = matchesControl(get("developmentPerformed"), "No");
  if (!growthYes && !developmentYes) hiddenKeys.push("growthAssessmentTime");
  if (!growthNo && !developmentNo) hiddenKeys.push("assessmentReason");
  const stabilizedInWard = matchesControl(get("stabilized"), "Yes") && matchesControl(get("ward"), "Yes");
  if (!stabilizedInWard) hiddenKeys.push("assessmentAppropriate");
  if (!stabilizedInWard || !matchesControl(get("assessmentAppropriate"), "Yes")) {
    hiddenKeys.push(...assessmentKeys);
  }
  return hiddenKeys.map((key) => ids[key]).filter((id): id is string => !!id);
}

const insertAfter: Partial<Record<ChildFieldKey, string>> = {
  ...childFollowUps,
  referralFacilityType: "g3yvhO9uFpI",
  municipality: "xv0FATnFVms",
  actionFollowUp: "YXYZT4v0t0W",
  birthDate: legacyAgeDays,
  ageYears: legacyAgeDays,
  ageMonths: legacyAgeDays,
  ageDays: legacyAgeDays,
  ageSource: legacyAgeDays,
  childNin: "GTI7EqoQokL",
  nextOfKinNin: "N4M7AB37cP9",
  admission: "gxWri1uDNFM",
  stay: "gxWri1uDNFM",
  smartScore: "Lt6AEASiVsc",
  smartRisk: "Lt6AEASiVsc",
  smartTime: "Lt6AEASiVsc",
  smartSource: "Lt6AEASiVsc",
  tbScreened: "hPVCXHCvwrc",
  tbDetails: "hPVCXHCvwrc",
  scdScreened: "hPVCXHCvwrc",
  scdDetails: "hPVCXHCvwrc",
  disabilityScreened: "hPVCXHCvwrc",
  disabilityDetails: "hPVCXHCvwrc",
  stabilized: "QUMkGwjclEf",
  ward: "QUMkGwjclEf",
  assessmentAppropriate: "QUMkGwjclEf",
  growthPerformed: "QUMkGwjclEf",
  developmentPerformed: "QUMkGwjclEf",
  growthAssessmentTime: "QUMkGwjclEf",
  growthFindings: "QUMkGwjclEf",
  developmentFindings: "QUMkGwjclEf",
  assessmentReason: "QUMkGwjclEf",
  pregnancyTreatment: "DuFUOsHMvjZ",
  pregnancySocial: "DuFUOsHMvjZ",
  apgarAssessed: "TZCPZIB2vWU",
  apgarOne: "TZCPZIB2vWU",
  apgarFive: "TZCPZIB2vWU",
  birthAsphyxia: "TZCPZIB2vWU",
  immediateCry: "TZCPZIB2vWU",
  birthEvidence: "TZCPZIB2vWU",
  otherHistory: "g3UtTdCciWW",
  otherHistoryDetails: "g3UtTdCciWW",
  hbsStatus: "Wo5Y36If9KN",
  hbsResult: "Wo5Y36If9KN",
  geneXpertStatus: "WGpDDBmMIHR",
  geneXpertResult: "WGpDDBmMIHR",
};

const subheading: Partial<Record<string, string>> = {
  Lt6AEASiVsc: "Smart Triage",
  hPVCXHCvwrc: "Screening",
  QUMkGwjclEf: "Growth and development",
};

export function extendChildLayout(def: FormDefinition, ids: ChildFieldIds): FormDefinition {
  ids = childFieldsForDisplay(ids);
  const completionFields: FormField[] = [];
  for (const key of ["completedBy", "feedbackContact", "reviewParticipants"] as const) {
    const de = ids[key];
    if (de) completionFields.push({ de, label: childFields[key].label });
  }
  return {
    ...def,
    layout: [...def.layout.map((section) => ({
      ...section,
      groups: section.groups.flatMap((group) => {
        const groups: FormGroup[] = [];
        let current: FormGroup = { label: group.label, fields: [] };
        for (const field of group.fields) {
          current.fields.push(field);
          const additional: FormField[] = [];
          for (const key of entries) {
            const de = ids[key];
            if (de && insertAfter[key] === field.de) {
              additional.push({
                de,
                label: childFields[key].label,
                readOnly: key === "stay",
                hint: isPendingChildField(de) ? "Available for this session. This field needs DHIS2 metadata before it can be saved." : undefined,
              });
            }
          }
          const label = subheading[field.de];
          if (label && additional.length) {
            groups.push(current, { label, fields: additional });
            current = { label: null, fields: [] };
          } else {
            current.fields.push(...additional);
          }
        }
        if (current.fields.length) groups.push(current);
        return groups;
      }),
    })), ...(completionFields.length ? [{
      title: "Review team and contact",
      groups: [{ label: null, fields: completionFields }],
    }] : [])],
  };
}

export const answered = (value: any) => value !== null && value !== undefined &&
  (typeof value !== "string" || value.trim() !== "");

function readDate(value: any, formats: string | string[]) {
  // DHIS2 stores these values as facility wall time. UTC arithmetic keeps
  // another user's browser timezone or DST from changing the elapsed time.
  return moment.isMoment(value)
    ? value.clone().utcOffset(0, true)
    : moment.utc(String(value ?? ""), formats, true);
}

export function isChildReviewOverdue(status: string, deathDate: string, today = moment()) {
  if (status !== "ACTIVE") return false;
  const death = readDate(deathDate, "YYYY-MM-DD");
  const facilityDate = today.clone().utcOffset(180).format("YYYY-MM-DD");
  return death.isValid() && readDate(facilityDate, "YYYY-MM-DD").diff(death, "days") > 7;
}

const datetimeFormats = ["YYYY-MM-DDTHH:mm:ss.SSS", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DDTHH:mm"];

export function calculateChildAge(birth: any, death: any) {
  const dob = readDate(birth, "YYYY-MM-DD").startOf("day");
  const dod = readDate(death, "YYYY-MM-DD").startOf("day");
  if (!dob.isValid() || !dod.isValid() || dod.isBefore(dob)) return null;
  const totalMonths = dod.diff(dob, "months");
  const totalDays = dod.diff(dob, "days");
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: totalDays < 28 ? totalDays : null,
  };
}

export function calculateFacilityStay(admission: any, deathDate: any, deathTime: any) {
  const admitted = readDate(admission, datetimeFormats);
  const date = readDate(deathDate, "YYYY-MM-DD");
  const time = readDate(deathTime, ["HH:mm:ss", "HH:mm"]);
  if (!admitted.isValid() || !date.isValid() || !time.isValid()) return null;
  const death = date.startOf("day").hour(time.hour()).minute(time.minute()).second(time.second());
  return death.isBefore(admitted) ? -1 : death.diff(admitted, "minutes");
}

export function formatFacilityStay(minutes: number) {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainder = minutes % 60;
  return `${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"}, ${remainder} minute${remainder === 1 ? "" : "s"}`;
}

export function childUnder28Days(values: Values, ids: ChildFieldIds) {
  const age = ids.birthDate && calculateChildAge(values[ids.birthDate], values[childDateOfDeath]);
  const hasNewAge = [ids.ageYears, ids.ageMonths, ids.ageDays].some((de) => de && answered(values[de]));
  const days = age ? age.days : hasNewAge ? (ids.ageDays && values[ids.ageDays]) : values[legacyAgeDays];
  return answered(days) && Number.isInteger(Number(days)) && Number(days) >= 0 && Number(days) < 28;
}

export function childDerivedValues(values: Values, ids: ChildFieldIds): Values {
  const result: Values = {};
  if (ids.birthDate && ids.ageYears && ids.ageMonths && ids.ageDays && ids.ageSource) {
    const age = calculateChildAge(values[ids.birthDate], values[childDateOfDeath]);
    if (age) {
      result[ids.ageYears] = age.years;
      result[ids.ageMonths] = age.months;
      result[ids.ageDays] = age.days;
      result[ids.ageSource] = "CALCULATED";
    } else if (values[ids.ageSource] === "CALCULATED") {
      for (const de of [ids.ageYears, ids.ageMonths, ids.ageDays, ids.ageSource]) result[de] = null;
    }
  }
  if (ids.admission && ids.stay) {
    const minutes = calculateFacilityStay(values[ids.admission], values[childDateOfDeath], values[childTimeOfDeath]);
    result[ids.stay] = minutes !== null && minutes >= 0 ? minutes : null;
  }
  return result;
}

export function validateChildReview(
  values: Values,
  ids: ChildFieldIds,
  isYes: (de: string) => boolean,
  original: Values = {},
  completing = true
) {
  const errors: string[] = [];
  const hidden = new Set(hiddenChildFields(values, ids));
  for (const key of ["childNin", "nextOfKinNin"] as const) {
    const de = ids[key];
    if (de && answered(values[de]) && values[de] !== original[de] && !/^[A-Za-z0-9]{14}$/.test(String(values[de]))) {
      errors.push(`${childFields[key].label} must contain 14 letters or digits.`);
    }
  }
  if (ids.birthDate && answered(values[ids.birthDate]) && answered(values[childDateOfDeath]) &&
    !calculateChildAge(values[ids.birthDate], values[childDateOfDeath])) {
    errors.push("Enter valid birth and death dates with death on or after birth.");
  }
  if (ids.admission && calculateFacilityStay(values[ids.admission], values[childDateOfDeath], values[childTimeOfDeath]) === -1) {
    errors.push("Death must be on or after admission.");
  }
  if (ids.referralTime && ids.referralArrival && isYes("yNsiNIq5D59")) {
    const referred = readDate(values[ids.referralTime], datetimeFormats);
    const arrival = readDate(values[ids.referralArrival], datetimeFormats);
    if (referred.isValid() && arrival.isValid() && arrival.isBefore(referred)) {
      errors.push("Referral arrival must be on or after referral.");
    }
  }
  const ranges = [[ids.ageYears, 17], [ids.ageMonths, 11], [ids.ageDays, 27]] as const;
  for (const [de, max] of ranges) {
    if (de && answered(values[de]) && (!Number.isInteger(Number(values[de])) || Number(values[de]) < 0 || Number(values[de]) > max)) {
      errors.push(`Age components must be whole numbers within their range (maximum ${max}).`);
    }
  }
  if (ids.ageDays && answered(values[ids.ageDays]) &&
    ((ids.ageYears && Number(values[ids.ageYears]) > 0) || (ids.ageMonths && Number(values[ids.ageMonths]) > 0))) {
    errors.push("Completed neonatal days require zero completed years and months.");
  }
  if (ids.ageSource && ranges.some(([de]) => de && answered(values[de])) &&
    !(ageSources as readonly string[]).includes(String(values[ids.ageSource]))) {
    errors.push("Select the source of the child's age.");
  }
  if (ids.ageSource && values[ids.ageSource] === "CALCULATED" &&
    (!ids.birthDate || !calculateChildAge(values[ids.birthDate], values[childDateOfDeath]))) {
    errors.push("Calculated age requires a valid date of birth and date of death.");
  }
  for (const key of ["unavailableDetails", "complicationDetails"] as const) {
    const de = ids[key];
    const parent = childFollowUps[key];
    if (completing && de && parent && isYes(parent) && !String(values[de] ?? "").trim() &&
      (!answered(original[parent]) || values[parent] !== original[parent] || answered(original[de]))) {
      errors.push(`Enter ${childFields[key].label.toLowerCase()}.`);
    }
  }
  if (!childUnder28Days(values, ids)) {
    for (const key of ["apgarOne", "apgarFive"] as const) {
      const de = ids[key];
      if (de && !hidden.has(de) && answered(values[de]) &&
        (!Number.isInteger(Number(values[de])) || Number(values[de]) < 0 || Number(values[de]) > 10)) {
        errors.push(`${childFields[key].label} must be a whole number from 0 to 10.`);
      }
    }
    if (completing && ids.otherHistoryDetails && !hidden.has(ids.otherHistoryDetails) &&
      !String(values[ids.otherHistoryDetails] ?? "").trim()) {
      errors.push("Specify other significant history.");
    }
  }
  return errors;
}
