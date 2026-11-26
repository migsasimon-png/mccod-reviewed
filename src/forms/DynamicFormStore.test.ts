import { store } from "../Store";
import { childFields } from "./childReview";
import { dynamicFormStore } from "./DynamicFormStore";
import { CASE_NUMBER_DE, CERTIFICATE_PLACE_OF_DEATH, getFormDefinition } from "./registry";
import { applySkipEffects, computeSkipState, maternalPregnancyOutcome } from "./skipLogic";

jest.mock("../Store", () => ({
  store: {
    selectedOrgUnit: "Facility001",
    engine: { link: { fetch: jest.fn() }, mutate: jest.fn() },
  },
}));

jest.mock("antd", () => ({ notification: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

test("saves a facility draft, completes the same event, and retains an inactive answer", async () => {
  const def = getFormDefinition("cdr");
  const referringFacility = { id: "g3yvhO9uFpI", valueType: "TEXT" };
  const referred = { id: "yNsiNIq5D59", valueType: "BOOLEAN" };
  const complication = { id: "KWBvJMz69gN", valueType: "BOOLEAN" };
  const detail = { id: "Example0001", code: childFields.complicationDetails.code, valueType: "LONG_TEXT" };
  const dataElements = [referringFacility, referred, complication, detail];
  const fetch = store.engine.link.fetch as jest.Mock;
  const mutate = store.engine.mutate as jest.Mock;
  fetch.mockImplementation(async (url: string) => {
    if (url.includes("/api/programs/")) return { categoryCombo: { id: "Default0001", name: "default" } };
    if (url.includes("programStages")) {
      return { program: { id: def.program }, programStageDataElements: dataElements.map((dataElement) => ({ dataElement })) };
    }
    if (url.includes("dataElements")) return { dataElements };
    return { events: [] };
  });
  await dynamicFormStore.openForm(def);

  const values = {
    [CASE_NUMBER_DE]: "CDR/Test/2025/00001", [referred.id]: "true",
    [referringFacility.id]: "Example facility", [complication.id]: "true",
  };
  expect(await dynamicFormStore.save(values, "draft")).toBe(true);
  expect(mutate).toHaveBeenCalledTimes(1);
  const create = mutate.mock.calls[0][0];
  expect(create).toMatchObject({ type: "create", resource: "tracker", params: { async: false }, data: { events: [{ status: "ACTIVE", orgUnit: "Facility001" }] } });
  expect(create.data.events[0].event).toMatch(/^[A-Za-z][A-Za-z0-9]{10}$/);
  expect(create.data.events[0].attributeOptionCombo).toBeUndefined();
  expect(await dynamicFormStore.save({
    [referred.id]: "false", [referringFacility.id]: undefined, [detail.id]: "Synthetic complication",
  })).toBe(true);
  expect(mutate).toHaveBeenCalledTimes(2);
  expect(mutate.mock.calls[1][0]).toMatchObject({
    type: "create",
    resource: "tracker",
    data: { events: [{
      event: create.data.events[0].event,
      status: "COMPLETED",
      dataValues: expect.arrayContaining([
        { dataElement: referringFacility.id, value: "Example facility" },
        { dataElement: referred.id, value: "false" },
        { dataElement: detail.id, value: "Synthetic complication" },
      ]),
    }] },
  });

  dynamicFormStore.startNew();
  mutate.mockRejectedValueOnce(new Error("Synthetic transport failure"));
  expect(await dynamicFormStore.save(values, "draft")).toBe(false);
  expect(await dynamicFormStore.save(values, "draft")).toBe(true);
  expect(mutate.mock.calls[3][0].data.events[0].event).toBe(mutate.mock.calls[2][0].data.events[0].event);
});

test("maternal review skips inapplicable questions and keeps pregnancy outcome visible", () => {
  const def = getFormDefinition("mdr");
  const values = {
    NEW_mdr_death_place_type: "Home",
    iAgu1y93XAB: "No", J11gxMDNvv7: "No", E0OEw6yVcJm: "Yes",
    PbayNOhXnyx: "No", NEW_mdr_autopsy_requested: "No",
    QidQVyBFspW: "No",
  };
  const skip = computeSkipState("mdr", def, values, {});
  expect(Array.from(skip.hiddenFields)).toEqual(expect.arrayContaining([
    "c5kDr80smH8", "eJwpqR9t7YM", "E0OEw6yVcJm", "v9BgVEytqsi",
    "TKWaMxLDj7J", "NEW_mdr_autopsy_performed", "UEmwYMZK0Uh",
    "a5fh4wtDzmi", "vVP5ClqKkHQ",
  ]));
  // No delivery closes the outcome (the save records "Not Delivered") and everything after birth.
  expect(skip.hiddenFields.has(maternalPregnancyOutcome)).toBe(true);
  expect(computeSkipState("mdr", def, {}, {}).hiddenFields.has(maternalPregnancyOutcome)).toBe(false);
  expect(applySkipEffects({ TKWaMxLDj7J: true }, { TKWaMxLDj7J: true }, {}, "mdr").kHdz10PWtjp).toBe(false);
});

test("perinatal stillbirth hides newborn questions and unknown cause clears others", () => {
  const def = getFormDefinition("pdr");
  const stillbirth = computeSkipState("pdr", def, { TiPl1iLI30H: "Fresh stillbirth" }, {});
  expect(Array.from(stillbirth.hiddenFields)).toEqual(expect.arrayContaining([
    "NEW_pdr_apgar_1", "x7k2caL4psq", "qaJDxXfEWPv", "Q6HnSrUTl39", "jSaonaOE68O",
    "rjoVXlCWLYM", "q4YXJgj2sIZ", "NEW_pdr_resus_nursing_assistant", "H34bcwaOliX",
  ]));
  const unknown = computeSkipState("pdr", def, { Y5T6DMJiZPJ: true }, {});
  expect(unknown.hiddenFields.has("apgGGC11v8Y")).toBe(true);
  expect(applySkipEffects({ Y5T6DMJiZPJ: true }, { Y5T6DMJiZPJ: true }, {}, "pdr").apgGGC11v8Y).toBe(false);
});

test("maternal Tracker submissions reuse nationality and omit unchecked TRUE_ONLY fields", async () => {
  const def = getFormDefinition("mdr");
  const fetch = store.engine.link.fetch as jest.Mock;
  const mutate = store.engine.mutate as jest.Mock;
  mutate.mockClear();
  const dataElements = [
    { id: maternalPregnancyOutcome, valueType: "TEXT" },
    { id: "TKWaMxLDj7J", valueType: "TRUE_ONLY" },
    { id: "kHdz10PWtjp", valueType: "TRUE_ONLY" },
  ];
  fetch.mockImplementation(async (url: string) => {
    if (url.includes("/api/programs/")) return { categoryCombo: { id: "CatCombo001", name: "Nationality" } };
    if (url.includes("/api/categoryOptionCombos")) return {
      categoryOptionCombos: [
        { id: "OtherCombo1", categoryOptions: [{ id: "OtherOption" }] },
        { id: "NationComb1", categoryOptions: [{ id: "Nationality1" }] },
      ],
    };
    if (url.includes("programStages")) return { program: { id: "Program0001" }, programStageDataElements: dataElements.map((dataElement) => ({ dataElement })) };
    if (url.includes("dataElements")) return { dataElements };
    return { events: [] };
  });
  await dynamicFormStore.openForm(def);
  const previousNationality = store.selectedNationality;
  store.selectedNationality = "Nationality1";
  try {
    expect(await dynamicFormStore.save({})).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
    expect(await dynamicFormStore.save({
      [CASE_NUMBER_DE]: "020/Test/2026/00001",
      [maternalPregnancyOutcome]: "EXAMPLE",
      TKWaMxLDj7J: true,
      kHdz10PWtjp: false,
    })).toBe(true);
    const [event] = mutate.mock.calls[0][0].data.events;
    expect(event.attributeOptionCombo).toBe("NationComb1");
    expect(event.attributeCategoryOptions).toBeUndefined();
    expect(event.dataValues).toContainEqual({ dataElement: "TKWaMxLDj7J", value: "true" });
    expect(event.dataValues.some(({ dataElement }: any) => dataElement === "kHdz10PWtjp")).toBe(false);
  } finally {
    store.selectedNationality = previousNationality;
  }
});

test("certifies a saved perinatal review without creating a second review", async () => {
  const def = getFormDefinition("pdr");
  const fetch = store.engine.link.fetch as jest.Mock;
  const mutate = store.engine.mutate as jest.Mock;
  mutate.mockClear();
  fetch.mockImplementation(async (url: string) => {
    if (url.includes("/api/programs/")) return { categoryCombo: { id: "Default0001", name: "default" } };
    if (url.includes("/api/programStages/")) return {
      program: { id: "Program0001" },
      programStageDataElements: [{ dataElement: { id: def.linkedField } }],
    };
    if (url.includes("/api/dataElements")) return { dataElements: [] };
    return { events: [] };
  });
  await dynamicFormStore.openForm(def);
  const values = { [CASE_NUMBER_DE]: "017/Test/2026/00001", zD0E77W4rFs: "EXAMPLE" };
  expect(await dynamicFormStore.save(values, "certify")).toBe(false);
  expect(mutate).not.toHaveBeenCalled();
  expect(await dynamicFormStore.save(values)).toBe(true);
  const [review] = mutate.mock.calls[0][0].data.events;
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(await dynamicFormStore.save(values, "certify")).toBe(false);
  expect(mutate).toHaveBeenCalledTimes(1);
  const certificateValues = { ...values, [CERTIFICATE_PLACE_OF_DEATH]: "Example facility" };

  mutate.mockResolvedValueOnce({ status: "ERROR", validationReport: { errorReports: [{ message: "Synthetic rejection" }] } });
  expect(await dynamicFormStore.save(certificateValues, "certify")).toBe(false);
  expect(mutate).toHaveBeenCalledTimes(2);
  const [failedCertificate] = mutate.mock.calls[1][0].data.events;
  expect(await dynamicFormStore.save(certificateValues, "certify")).toBe(true);
  const [certificate] = mutate.mock.calls[2][0].data.events;
  const [linkedReview] = mutate.mock.calls[3][0].data.events;
  expect(certificate).toMatchObject({ programStage: "aKclf7Yl1PE", event: failedCertificate.event });
  expect(certificate.event).not.toBe(review.event);
  expect(certificate.dataValues).toContainEqual({ dataElement: CERTIFICATE_PLACE_OF_DEATH, value: "Example facility" });
  expect(linkedReview).toMatchObject({ programStage: def.programStage, event: review.event });
  expect(linkedReview.dataValues).toContainEqual({ dataElement: def.linkedField, value: certificate.event });
});
