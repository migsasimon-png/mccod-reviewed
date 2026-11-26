import moment from "moment";
import {
  calculateChildAge, calculateFacilityStay, childDateOfDeath, childDerivedValues,
  childFields, childUnder28Days, extendChildLayout, formatFacilityStay, hiddenChildFields,
  isChildReviewOverdue, resolveChildFields, validateChildReview,
} from "./childReview";
import { computeSkipState, applySkipEffects } from "./skipLogic";
import { getFormDefinition } from "./registry";

test("reports completed years and remainder months, and uses completed neonatal days", () => {
  expect(calculateChildAge("2022-01-15", "2025-04-14")).toEqual({ years: 3, months: 2, days: null });
  expect(calculateChildAge("2025-07-01", "2025-07-01")).toEqual({ years: 0, months: 0, days: 0 });
  expect(calculateChildAge("2025-07-01", "2025-07-28")?.days).toBe(27);
  expect(calculateChildAge("2025-07-01", "2025-07-29")?.days).toBeNull();
  expect(calculateChildAge("2025-07-01", "2025-06-30")).toBeNull();
});

test("requires both times for stay and validates chronology across dates", () => {
  const admission = "2025-06-30T23:55";
  expect(calculateFacilityStay(admission, "2025-07-02", "01:00")).toBe(1505);
  expect(formatFacilityStay(1505)).toBe("1 day, 1 hour, 5 minutes");
  expect(calculateFacilityStay(admission, "2025-07-01", "")).toBeNull();
  expect(calculateFacilityStay(admission, "2025-06-30", "23:54")).toBe(-1);
  expect(calculateFacilityStay(admission, "2025-06-30", "23:55")).toBe(0);
});

test("only binds independent identifiers on valid stage metadata", () => {
  const child = { ...childFields.childNin, id: "ChildNin001", valueType: "TEXT" };
  const nextOfKin = { ...childFields.nextOfKinNin, id: "NextKin0001", valueType: "TEXT" };
  expect(resolveChildFields([child, nextOfKin])).toEqual({ childNin: child.id, nextOfKinNin: nextOfKin.id });
  expect(resolveChildFields([child, child, { ...nextOfKin, valueType: "NUMBER" }])).toEqual({});
  expect(resolveChildFields([{ ...childFields.birthDate, id: "BirthDate01", valueType: "DATE" }])).toEqual({});
  expect(validateChildReview({ child: "123", kin: "AB123456789012" }, { childNin: "child", nextOfKinNin: "kin" }, () => false))
    .toEqual(["Child NIN must contain 14 letters or digits."]);
  expect(validateChildReview({}, { childNin: "child", nextOfKinNin: "kin" }, () => false)).toEqual([]);
});

test("valid dates replace derived age components and a zero age is preserved", () => {
  const ids = { birthDate: "born", ageYears: "years", ageMonths: "months", ageDays: "days", ageSource: "source" };
  const values = { born: "2025-07-01", [childDateOfDeath]: "2025-07-01" };
  expect(childDerivedValues(values, ids)).toEqual({ years: 0, months: 0, days: 0, source: "CALCULATED" });
  expect(childUnder28Days({ years: 2, CdceEuqRSwT: 5 }, ids)).toBe(false);
});

test("conditional details are retained when a CDSR answer changes", () => {
  const values = { yNsiNIq5D59: "No", g3yvhO9uFpI: "Example facility", CdceEuqRSwT: "27" };
  const cdr = getFormDefinition("cdr");
  const skip = computeSkipState("cdr", cdr, values, {});
  expect(skip.hiddenFields.has("g3yvhO9uFpI")).toBe(true);
  const maternal = cdr.layout.findIndex((section) => /maternal risk factors/i.test(section.title));
  expect(skip.hiddenSections.has(maternal)).toBe(true);
  expect(computeSkipState("cdr", cdr, { ...values, CdceEuqRSwT: "28" }, {}).hiddenSections.has(maternal)).toBe(false);
  expect(applySkipEffects({ yNsiNIq5D59: "No" }, values, {}, "cdr")).toEqual({});
  for (const id of ["pdr", "mdr"] as const) {
    const def = getFormDefinition(id);
    expect(computeSkipState(id, def, values, {}).hiddenSections.size).toBe(0);
  }
});

test("growth requires all three prerequisites and screening details require Yes", () => {
  const ids = {
    stabilized: "stable", ward: "ward", assessmentAppropriate: "appropriate",
    developmentPerformed: "development", developmentFindings: "findings",
    tbScreened: "tb", tbDetails: "tbDetails", hbsStatus: "test", hbsResult: "result",
  };
  const values = { stable: "No", ward: "Yes", appropriate: "Yes", development: true, tb: "Unknown", test: "Requested" };
  expect(hiddenChildFields(values, ids)).toEqual(expect.arrayContaining(["development", "findings", "tbDetails", "result"]));
  expect(hiddenChildFields({ ...values, stable: "Yes", tb: "Yes", test: "Done" }, ids)).toEqual([]);
});

test("checks applicable Apgar scores and requires details for affirmative completion", () => {
  const ids = { apgarAssessed: "apgar", apgarFive: "score", complicationDetails: "details" };
  const values = { apgar: "Yes", score: 11, KWBvJMz69gN: "Yes" };
  expect(validateChildReview(values, ids, () => true)).toHaveLength(2);
  expect(validateChildReview({ ...values, score: 10 }, ids, () => true, {}, false)).toEqual([]);
  expect(validateChildReview({ apgar: "Unknown", score: 11 }, ids, () => false)).toEqual([]);
});

test("Apgar Yes shows scores and Apgar No shows cry comment fields", () => {
  const ids = {
    apgarAssessed: "apgar", apgarOne: "one", apgarFive: "five",
    immediateCry: "cry", birthEvidence: "evidence",
  };
  expect(hiddenChildFields({ apgar: "Yes" }, ids)).toEqual(expect.arrayContaining(["cry", "evidence"]));
  expect(hiddenChildFields({ apgar: "No" }, ids)).toEqual(expect.arrayContaining(["one", "five"]));
});

test("asks about the previous admission before physical examination", () => {
  const section = getFormDefinition("cdr").layout.find(({ title }) => /condition at admission/i.test(title));
  const fields = section!.groups.flatMap(({ fields }) => fields.map(({ de }) => de));
  expect(fields.indexOf("A5mxXfgcbvg")).toBeGreaterThan(-1);
  expect(fields.indexOf("A5mxXfgcbvg")).toBeLessThan(fields.indexOf("Lt6AEASiVsc"));
});

test("marks active reviews overdue after seven Uganda calendar days", () => {
  const lastDay = moment.parseZone("2026-11-18T20:59:59Z");
  const nextDay = moment.parseZone("2026-11-18T21:00:00Z");
  expect(isChildReviewOverdue("ACTIVE", "2026-11-11", lastDay)).toBe(false);
  expect(isChildReviewOverdue("ACTIVE", "2026-11-11", nextDay)).toBe(true);
  expect(isChildReviewOverdue("COMPLETED", "2026-11-11", nextDay)).toBe(false);
  expect(isChildReviewOverdue("ACTIVE", "", nextDay)).toBe(false);
});

test("places APGAR after mode of delivery and shows staff details for Yes", () => {
  const ids = { apgarAssessed: "apgar", criticalStaffDetails: "staff", completedBy: "author" };
  const def = extendChildLayout(getFormDefinition("cdr"), ids);
  const labour = def.layout.flatMap((section) => section.groups).find((group) => group.label === "Labour and Birth");
  const fields = labour!.fields.map((field) => field.de);
  expect(fields[fields.indexOf("TZCPZIB2vWU") + 1]).toBe("apgar");
  expect(def.layout[def.layout.length - 1].groups[0].fields[0].de).toBe("author");
  expect(computeSkipState("cdr", def, { aJ5HMCLsHYr: "Yes" }, {}, ids).hiddenFields.has("staff")).toBe(false);
  expect(computeSkipState("cdr", def, { aJ5HMCLsHYr: "No" }, {}, ids).hiddenFields.has("staff")).toBe(true);
});

test("shows temporary Yes follow-ups before DHIS2 metadata is available", () => {
  const parent = "JDDXYWLRunF";
  const pending = "pending-cdsr-unavailableDetails";
  const def = extendChildLayout(getFormDefinition("cdr"), {});
  const fields = def.layout.flatMap((section) => section.groups.flatMap((group) => group.fields));
  expect(fields[fields.findIndex((field) => field.de === parent) + 1].de).toBe(pending);
  expect(computeSkipState("cdr", def, {}, {}).hiddenFields.has(pending)).toBe(true);
  expect(computeSkipState("cdr", def, { [parent]: "YN01-01" }, {}).hiddenFields.has(pending)).toBe(false);
  expect(computeSkipState("cdr", def, { [parent]: "No" }, {}).hiddenFields.has(pending)).toBe(true);
  const mapped = extendChildLayout(getFormDefinition("cdr"), { unavailableDetails: "MappedDet01" });
  expect(mapped.layout.flatMap((section) => section.groups.flatMap((group) => group.fields))
    .some((field) => field.de === pending)).toBe(false);
});
