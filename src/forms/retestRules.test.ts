import moment from "moment";
import { getFormDefinition } from "./registry";
import { applySkipEffects, computeSkipState, stayDuration } from "./skipLogic";
import { confirmFlags, flagsByField, mustCorrectFlags, validateReviewForm } from "./reviewValidation";

const mdr = getFormDefinition("mdr");
const pdr = getFormDefinition("pdr");
const hidden = (form: typeof mdr, values: Record<string, any>) =>
  computeSkipState(form.id, form, values, {}).hiddenFields;
const messages = (form: "mdr" | "pdr", values: Record<string, any>, filter = mustCorrectFlags) =>
  filter(validateReviewForm(form, values)).map((f) => f.message);

describe("MCH020 skip logic", () => {
  test("tests open their result only when done", () => {
    expect(hidden(mdr, { vVP5ClqKkHQ: "No" })).toEqual(expect.objectContaining(new Set()));
    for (const answer of ["No", "Unknown"]) {
      const closed = hidden(mdr, { QidQVyBFspW: "Yes", vVP5ClqKkHQ: answer, x4luCocBY5h: answer, T3QwXHphTIu: answer });
      expect(closed.has("oz0vASbQvq5")).toBe(true);
      expect(closed.has("z8bU25JRAGG")).toBe(true);
      expect(closed.has("NEW_mdr_hb_level")).toBe(true);
    }
    const open = hidden(mdr, { QidQVyBFspW: "Yes", vVP5ClqKkHQ: "Yes", T3QwXHphTIu: "Yes" });
    expect(open.has("oz0vASbQvq5")).toBe(false);
    expect(open.has("NEW_mdr_hb_level")).toBe(false);
  });

  test("4.3 other, vital readings and dead on arrival", () => {
    expect(hidden(mdr, { QidQVyBFspW: "Yes", a5fh4wtDzmi: "Health Center II" }).has("w3QkbELzeDu")).toBe(true);
    expect(hidden(mdr, { QidQVyBFspW: "Yes", a5fh4wtDzmi: "Other" }).has("w3QkbELzeDu")).toBe(false);
    const noVitals = hidden(mdr, { Rrs7OQx1yMS: "false", rn8cGimwQ3a: "false", OWhIguUYA66: "false" });
    ["ejbJJ1gTnQb", "Hn09AcoW4Mk", "c8hsSJy63ay", "MDXum0oNBQb"].forEach((de) => expect(noVitals.has(de)).toBe(true));
    const doa = hidden(mdr, { Rrs7OQx1yMS: "true", Agzf9GaJ6G2: true });
    ["Rrs7OQx1yMS", "ejbJJ1gTnQb", "lSthTlIFbEh", "ocMXxDCF6DF"].forEach((de) => expect(doa.has(de)).toBe(true));
  });

  test("no delivery closes outcome, weight, complications, placenta and PPH", () => {
    const closed = hidden(mdr, { PbayNOhXnyx: "false" });
    ["aCzqBYUkfDe", "XW2CKaAiMKc", "owuXac0M85O", "LFYN9XzE4cB", "ObzLdxNcGZY", "MfICS1uUUdJ", "SLRPjzRPpEJ", "lSD9vEkw81r"]
      .forEach((de) => expect(closed.has(de)).toBe(true));
    // Abortion or ectopic keeps the days question.
    expect(hidden(mdr, { PbayNOhXnyx: "false", xiAXjQxZDSW: true }).has("LFYN9XzE4cB")).toBe(false);
  });

  test("baby weight only for live birth and stillbirths", () => {
    expect(hidden(mdr, { PbayNOhXnyx: "true", aCzqBYUkfDe: "Abortion/Miscarriage" }).has("XW2CKaAiMKc")).toBe(true);
    expect(hidden(mdr, { PbayNOhXnyx: "true", aCzqBYUkfDe: "Live Birth" }).has("XW2CKaAiMKc")).toBe(false);
  });

  test("no labour and vaginal delivery close the matching causes and rows", () => {
    const noLabour = hidden(mdr, { J11gxMDNvv7: "No" });
    ["qm3ga81qmEC", "Dhq6iXq1c1Z", "o3yTjUABKux", "lSD9vEkw81r", "hSmmYHV1eXV"].forEach((de) => expect(noLabour.has(de)).toBe(true));
    const vaginal = hidden(mdr, { PbayNOhXnyx: "true", TKWaMxLDj7J: true });
    ["iteIkVf68jY", "Np2XQF1gkaU", "hSmmYHV1eXV"].forEach((de) => expect(vaginal.has(de)).toBe(true));
    expect(hidden(mdr, { PbayNOhXnyx: "true", NAnhGvDjMRF: true }).has("iteIkVf68jY")).toBe(false);
  });

  test("Unknown cause closes and clears the others", () => {
    const values = { C3RST8YWsXt: true, c2Sn7Z6RuK4: true };
    const patch = applySkipEffects({ C3RST8YWsXt: true }, values, {}, "mdr", mdr, { c2Sn7Z6RuK4: true });
    expect(patch.c2Sn7Z6RuK4).toBe(false);
    expect(hidden(mdr, { C3RST8YWsXt: true }).has("c2Sn7Z6RuK4")).toBe(true);
    // Stored conflicts stay visible so they can be corrected.
    expect(hidden(mdr, values).has("c2Sn7Z6RuK4")).toBe(false);
    expect(messages("mdr", values)).toContain("Unknown cannot be ticked with a cause.");
  });

  test("closing a question clears what was typed in its dependants", () => {
    const before = { QidQVyBFspW: "Yes", vVP5ClqKkHQ: "Yes", oz0vASbQvq5: "Positive", IACcLw1GbkR: "Yes" };
    const after = { ...before, vVP5ClqKkHQ: "No" };
    const patch = applySkipEffects({ vVP5ClqKkHQ: "No" }, after, {}, "mdr", mdr, before);
    expect(patch).toMatchObject({ oz0vASbQvq5: undefined, IACcLw1GbkR: undefined });
    expect(Object.keys(patch)).toEqual(expect.arrayContaining(["oz0vASbQvq5", "IACcLw1GbkR"]));
  });

  test("factor Specify box opens only when its factor is ticked", () => {
    expect(hidden(mdr, {}).has("i00ejpzpAGf")).toBe(true);
    expect(hidden(mdr, { afDz7SrXJkc: true }).has("i00ejpzpAGf")).toBe(false);
  });

  test("duration of stay follows admission and death and is locked", () => {
    expect(stayDuration("2026-11-20T08:00", "2026-11-22T10:30")).toEqual([2, 2, 30]);
    expect(stayDuration("2026-11-22T08:00", "2026-11-20T10:30")).toBeNull();
    const patch = applySkipEffects(
      { WzauwhVOwM0: moment("2026-11-22T10:30") },
      { c5kDr80smH8: moment("2026-11-20T08:00"), WzauwhVOwM0: moment("2026-11-22T10:30") },
      {}, "mdr", mdr, {}
    );
    expect([patch.IH7NTNcSZYk, patch.ww21ycTPDb6, patch.BJXbwUs4tGF]).toEqual([2, 2, 30]);
    expect(computeSkipState("mdr", mdr, {}, {}).disabledFields.has("IH7NTNcSZYk")).toBe(true);
  });

  test("certified cause lines open in turn", () => {
    const state = computeSkipState("mdr", mdr, {}, {});
    ["zb7uTuBCPrN", "QGFYJK00ES7", "CnPGhOcERFF"].forEach((de) => expect(state.disabledFields.has(de)).toBe(true));
    const withA = computeSkipState("mdr", mdr, { sfpqAeqKeyQ: "Sepsis" }, {});
    expect(withA.disabledFields.has("zb7uTuBCPrN")).toBe(false);
    expect(withA.disabledFields.has("QGFYJK00ES7")).toBe(true);
  });
});

describe("MCH017 skip logic", () => {
  test("stillbirth closes newborn questions, resuscitation and age of baby", () => {
    const closed = hidden(pdr, { TiPl1iLI30H: "Macerated still Birth" });
    ["H34bcwaOliX", "rjoVXlCWLYM", "rDI0uhcVLAk", "quKRjZzkSRA", "x7k2caL4psq", "q4YXJgj2sIZ", "qaJDxXfEWPv", "NEW_pdr_med_adrenaline"]
      .forEach((de) => expect(closed.has(de)).toBe(true));
  });

  test("tests, referral, place of delivery and partograph", () => {
    expect(hidden(pdr, { ywMAGkuvTjq: "false" }).has("VnDcrZ4gCdR")).toBe(true);
    expect(hidden(pdr, { DPG74K71T7a: "false" }).has("qnhVulYBuyO")).toBe(true);
    expect(hidden(pdr, { bS24JUbPyQv: "false" }).has("HJd1MWPsvUC")).toBe(true);
    const home = hidden(pdr, { LjrdbcFRI1d: "Home" });
    ["Boui663joOP", "aLvTannWmvI", "o69aE6o8LfO"].forEach((de) => expect(home.has(de)).toBe(true));
    const unused = hidden(pdr, { LjrdbcFRI1d: "Health Facility", aLvTannWmvI: "No" });
    expect(unused.has("o69aE6o8LfO")).toBe(true);
    expect(hidden(pdr, { LjrdbcFRI1d: "Health Facility", aLvTannWmvI: "Yes" }).has("o69aE6o8LfO")).toBe(false);
  });

  test("medication items open when medication is given", () => {
    expect(hidden(pdr, { x7k2caL4psq: "true" }).has("NEW_pdr_med_adrenaline")).toBe(true);
    expect(hidden(pdr, { x7k2caL4psq: "true", CprvAYJIWNv: true }).has("NEW_pdr_med_adrenaline")).toBe(false);
  });

  test("Unknown cause blanks text causes and unticks the rest", () => {
    const patch = applySkipEffects({ Y5T6DMJiZPJ: true }, { Y5T6DMJiZPJ: true }, {}, "pdr");
    expect(patch.apgGGC11v8Y).toBe(false);
    expect(patch.H4iDsba7jkw).toBeUndefined();
  });
});

describe("red flags", () => {
  test("MCH020 values that are impossible must be corrected", () => {
    const flags = messages("mdr", {
      ejbJJ1gTnQb: 500, Hn09AcoW4Mk: 600, c8hsSJy63ay: 99, NEW_mdr_hb_level: 30, XW2CKaAiMKc: 99999,
      c5kDr80smH8: "2026-11-22T08:00", WzauwhVOwM0: "2026-11-20T08:00",
      PbayNOhXnyx: "true", aCzqBYUkfDe: "Not Delivered", CupbOInqvJI: "123",
    });
    expect(flags).toEqual(expect.arrayContaining([
      "Blood pressure not possible.", "Temperature must be 30 to 43 °C.", "Hb must be 2 to 20 g/dL.",
      "Weight must be 300 to 6,000 g.", "Death cannot be before admission.",
      "Delivery and outcome disagree.", "NIN must have 14 characters.",
    ]));
  });

  test("MCH020 unusual values ask for confirmation", () => {
    const flags = messages("mdr", {
      iJqBq0kQtWO: 5, wmNrbtFpcdy: 25, ByIsCiqkq4v: 30, hZlRNVrmS1y: 40,
      NAnhGvDjMRF: true, owuXac0M85O: true,
    }, confirmFlags);
    expect(flags).toEqual(expect.arrayContaining([
      "Check age. Outside 10 to 70 years.", "Check gravida.", "Para should be less than gravida.",
      "Check number of visits.", "Tick caesarean in Section 6.", "Check cause of death.",
    ]));
    expect(messages("mdr", { wmNrbtFpcdy: 2, ByIsCiqkq4v: 10 }, confirmFlags)).toContain("Para should be less than gravida.");
  });

  test("a flag on a closed question is dropped", () => {
    const flags = validateReviewForm("mdr", { XW2CKaAiMKc: 99999 }, {}, new Set(["XW2CKaAiMKc"]));
    expect(flags).toHaveLength(0);
    expect(flagsByField(validateReviewForm("mdr", { XW2CKaAiMKc: 99999 }))["XW2CKaAiMKc"].type).toBe("mustCorrect");
  });

  test("recommendation timeframes may be in the future", () => {
    const future = moment().add(30, "days").format("YYYY-MM-DD");
    const meta = { NEW_mdr_rec1_date: { id: "x", name: "x", valueType: "DATE" } };
    expect(validateReviewForm("mdr", { NEW_mdr_rec1_date: future }, meta)).toHaveLength(0);
  });

  test("MCH017 weeks, Apgar, fetal heart and prematurity", () => {
    const must = messages("pdr", {
      RpkIvgOOZJt: "2026-11-20", Dq9aH0aZ2wb: "2026-11-18", NEW_pdr_apgar_5: 11, bDWkcVeQLUc: 99999,
    });
    expect(must).toEqual(expect.arrayContaining([
      "Death cannot be before delivery.", "Apgar must be 0 to 10.", "Weight must be 300 to 6,000 g.",
    ]));
    expect(messages("pdr", { m8jUvzBgYga: 50 }, confirmFlags)).toContain("Check weeks.");
    expect(messages("pdr", { m8jUvzBgYga: 22, TiPl1iLI30H: "Fresh Still Birth" }, confirmFlags))
      .toContain("Below review threshold. Check weeks.");
    expect(messages("pdr", { m8jUvzBgYga: 40, H4iDsba7jkw: "Respiratory distress" }, confirmFlags))
      .toContain("Check weeks or cause.");
    expect(messages("pdr", { t1udXNXQ5hc: "Yes", TiPl1iLI30H: "Macerated still Birth" }, confirmFlags))
      .toContain("Check type of stillbirth.");
    expect(messages("pdr", { t1udXNXQ5hc: "Yes", TiPl1iLI30H: "Fresh Still Birth" }, confirmFlags))
      .toContain("Intrapartum death. Review labour care.");
    expect(messages("pdr", {
      RpkIvgOOZJt: "2026-09-01", Dq9aH0aZ2wb: "2026-11-20", TiPl1iLI30H: "Neonatal Death",
    })).toContain("Neonatal death must be within 28 days.");
  });
});
