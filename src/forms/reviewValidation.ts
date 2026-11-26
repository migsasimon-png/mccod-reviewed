import moment, { Moment } from "moment";
import type { DeMeta } from "./DynamicFormStore";
import { FormId } from "./types";
import { formDefinitions } from "./registry";
import {
  isYes,
  MDR_CAESAREAN_SECTION_6,
  MDR_HAEMORRHAGE_CAUSES,
  MDR_UNKNOWN_CAUSE,
  mdrCauseIds,
  optionLabel,
} from "./skipLogic";

export type ReviewFlagType = "mustCorrect" | "confirm";

export interface ReviewFlag {
  field: string;
  message: string;
  type: ReviewFlagType;
}

type Values = Record<string, any>;

const hasValue = (v: any) =>
  v !== undefined &&
  v !== null &&
  v !== "" &&
  !(Array.isArray(v) && v.length === 0);

const asMoment = (v: any): Moment | null => {
  if (!hasValue(v)) return null;
  const m = moment.isMoment(v) ? v : moment(v);
  return m.isValid() ? m : null;
};

const isFuture = (v: any) => {
  const m = asMoment(v);
  return !!(m && m.isAfter(moment(), "day"));
};

const num = (v: any): number | null => {
  if (!hasValue(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const ticked = (values: Values, de: string, meta: Record<string, DeMeta>) =>
  values[de] === true || values[de] === "true" || isYes(values, de, meta);

/** Follow-up deadlines are plans, so they may lie in the future. */
const FUTURE_DATE_ALLOWED = /^NEW_(mdr|pdr)_rec\d_date$/;

/**
 * Shared and form-specific red flags (Nov 2026 review). Flags on a field that
 * is closed by skip logic are left out: a closed question cannot be corrected.
 */
export const validateReviewForm = (
  formId: FormId,
  values: Values,
  meta: Record<string, DeMeta> = {},
  hidden: Set<string> = new Set()
): ReviewFlag[] => {
  const all: ReviewFlag[] = [];
  const flag = (field: string, message: string, type: ReviewFlagType) => all.push({ field, message, type });

  // --- every date field ----------------------------------------------------
  const dateFields = new Set<string>(
    formId === "mdr"
      ? ["c5kDr80smH8", "WzauwhVOwM0", "NEW_mdr_review_date"]
      : formId === "pdr"
      ? ["RpkIvgOOZJt", "Dq9aH0aZ2wb", "NEW_pdr_review_date", "NEW_pdr_neonatal_admission_time"]
      : []
  );
  if (formId === "mdr" || formId === "pdr") {
    Object.keys(meta).forEach((de) => {
      if (/^(DATE|DATETIME)$/.test(meta[de]?.valueType || "")) dateFields.add(de);
    });
  }
  dateFields.forEach((de) => {
    if (FUTURE_DATE_ALLOWED.test(de)) return;
    if (isFuture(values[de])) flag(de, "Date cannot be in the future.", "mustCorrect");
  });

  // --- NIN -------------------------------------------------------------------
  const ninField = formId === "mdr" ? "CupbOInqvJI" : formId === "pdr" ? "NEW_pdr_mother_nin" : null;
  if (ninField && hasValue(values[ninField])) {
    const nin = String(values[ninField]).replace(/\s+/g, "");
    if (!/^[A-Za-z0-9]{14}$/.test(nin)) flag(ninField, "NIN must have 14 characters.", "mustCorrect");
  }

  // --- MCH020 ----------------------------------------------------------------
  if (formId === "mdr") {
    const age = num(values.iJqBq0kQtWO);
    if (age != null && (age < 10 || age > 70)) {
      flag("iJqBq0kQtWO", "Check age. Outside 10 to 70 years.", "confirm");
    }

    const adm = asMoment(values.c5kDr80smH8);
    const death = asMoment(values.WzauwhVOwM0);
    if (adm && death && death.isBefore(adm, "minute")) {
      flag("WzauwhVOwM0", "Death cannot be before admission.", "mustCorrect");
    }

    const gravida = num(values.wmNrbtFpcdy);
    if (gravida != null && (gravida < 1 || gravida > 20)) flag("wmNrbtFpcdy", "Check gravida.", "confirm");
    const para = num(values.ByIsCiqkq4v);
    if (para != null && gravida != null && para >= gravida) {
      flag("ByIsCiqkq4v", "Para should be less than gravida.", "confirm");
    }

    const systolic = num(values.ejbJJ1gTnQb);
    const diastolic = num(values.Hn09AcoW4Mk);
    if (systolic != null && (systolic < 50 || systolic > 250)) {
      flag("ejbJJ1gTnQb", "Blood pressure not possible.", "mustCorrect");
    }
    if (diastolic != null && ((systolic != null && diastolic >= systolic) || diastolic < 0 || diastolic > 250)) {
      flag("Hn09AcoW4Mk", "Blood pressure not possible.", "mustCorrect");
    }
    const temperature = num(values.c8hsSJy63ay);
    if (temperature != null && (temperature < 30 || temperature > 43)) {
      flag("c8hsSJy63ay", "Temperature must be 30 to 43 °C.", "mustCorrect");
    }

    const visits = num(values.hZlRNVrmS1y);
    if (visits != null && visits > 15) flag("hZlRNVrmS1y", "Check number of visits.", "confirm");
    const hb = num(values.NEW_mdr_hb_level);
    if (hb != null && (hb < 2 || hb > 20)) flag("NEW_mdr_hb_level", "Hb must be 2 to 20 g/dL.", "mustCorrect");

    const outcome = optionLabel("aCzqBYUkfDe", values.aCzqBYUkfDe, meta);
    if (isYes(values, "PbayNOhXnyx", meta) && /not\s*delivered/i.test(outcome)) {
      flag("aCzqBYUkfDe", "Delivery and outcome disagree.", "mustCorrect");
    }

    const weight = num(values.XW2CKaAiMKc);
    if (weight != null && (weight < 300 || weight > 6000)) {
      flag("XW2CKaAiMKc", "Weight must be 300 to 6,000 g.", "mustCorrect");
    }

    // 5.9 caesarean mode against Section 6
    const caesareanMode = ["NAnhGvDjMRF", "sju2IsSkUZG"].find((de) => ticked(values, de, meta));
    if (caesareanMode && !MDR_CAESAREAN_SECTION_6.some((de) => ticked(values, de, meta))) {
      flag(caesareanMode, "Tick caesarean in Section 6.", "confirm");
    }
    // 5.12 PPH against 8a
    if (ticked(values, "owuXac0M85O", meta) && !MDR_HAEMORRHAGE_CAUSES.some((de) => ticked(values, de, meta))) {
      flag("owuXac0M85O", "Check cause of death.", "confirm");
    }

    // 8a Unknown with any other cause
    if (ticked(values, MDR_UNKNOWN_CAUSE, meta)) {
      const others = mdrCauseIds(formDefinitions.mdr);
      if (others.some((de) => hasValue(values[de]) && values[de] !== false && values[de] !== "false")) {
        flag(MDR_UNKNOWN_CAUSE, "Unknown cannot be ticked with a cause.", "mustCorrect");
      }
    }
  }

  // --- MCH017 ----------------------------------------------------------------
  if (formId === "pdr") {
    const delivery = asMoment(values.RpkIvgOOZJt);
    const death = asMoment(values.Dq9aH0aZ2wb);
    if (delivery && death && death.isBefore(delivery, "minute")) {
      flag("Dq9aH0aZ2wb", "Death cannot be before delivery.", "mustCorrect");
    }

    const deathType = optionLabel("TiPl1iLI30H", values.TiPl1iLI30H, meta);
    const neonatal = /neonatal/i.test(deathType);
    const fresh = /fresh/i.test(deathType);
    const macerated = /macerated|mercerated/i.test(deathType);
    if (neonatal && delivery && death && death.diff(delivery, "days", true) > 28) {
      flag("Dq9aH0aZ2wb", "Neonatal death must be within 28 days.", "mustCorrect");
    }

    const weight = num(values.bDWkcVeQLUc);
    if (weight != null && (weight < 300 || weight > 6000)) {
      flag("bDWkcVeQLUc", "Weight must be 300 to 6,000 g.", "mustCorrect");
    }

    ["NEW_pdr_apgar_1", "NEW_pdr_apgar_5", "NEW_pdr_apgar_10"].forEach((de) => {
      const score = num(values[de]);
      if (score != null && (score < 0 || score > 10)) flag(de, "Apgar must be 0 to 10.", "mustCorrect");
    });

    // 3.3 fetal heart against the type of stillbirth
    if (ticked(values, "t1udXNXQ5hc", meta)) {
      if (macerated) flag("TiPl1iLI30H", "Check type of stillbirth.", "confirm");
      else if (fresh) flag("TiPl1iLI30H", "Intrapartum death. Review labour care.", "confirm");
    }

    const weeks = num(values.m8jUvzBgYga);
    if (weeks != null) {
      if (weeks < 20 || weeks > 45) flag("m8jUvzBgYga", "Check weeks.", "confirm");
      else if ((fresh || macerated) && weeks < 28) {
        flag("m8jUvzBgYga", "Below review threshold. Check weeks.", "confirm");
      }
      if (weeks >= 37 && hasValue(values.H4iDsba7jkw) && values.H4iDsba7jkw !== false && values.H4iDsba7jkw !== "false") {
        flag("H4iDsba7jkw", "Check weeks or cause.", "confirm");
      }
    }

    const motherAge = num(values.hTYVRRvhYEt);
    if (motherAge != null && (motherAge < 10 || motherAge > 70)) {
      flag("hTYVRRvhYEt", "Check age. Outside 10 to 70 years.", "confirm");
    }

    const babies = num(values.NEW_pdr_multiple_babies_count);
    if (babies != null && (babies < 2 || babies > 5)) {
      flag("NEW_pdr_multiple_babies_count", "Number must be 2 to 5.", "mustCorrect");
    }

    // Unknown cause is exclusive with every other cause tick
    if (ticked(values, "Y5T6DMJiZPJ", meta)) {
      const otherCauses = ["Q6HnSrUTl39", "UaGg4B3DUac", "jSaonaOE68O", "xYenYvBElrk", "xjeIBJ2XyPd", "H4iDsba7jkw", "apgGGC11v8Y"];
      const has = (de: string) => hasValue(values[de]) && values[de] !== false && values[de] !== "false";
      if (otherCauses.some(has)) {
        flag("Y5T6DMJiZPJ", "Unknown cannot be ticked with a cause.", "mustCorrect");
      }
    }
  }

  return all.filter((f) => !hidden.has(f.field));
};

export const mustCorrectFlags = (flags: ReviewFlag[]) =>
  flags.filter((f) => f.type === "mustCorrect");

export const confirmFlags = (flags: ReviewFlag[]) =>
  flags.filter((f) => f.type === "confirm");

/** One flag per field for inline display; a must-correct flag wins. */
export const flagsByField = (flags: ReviewFlag[]): Record<string, ReviewFlag> => {
  const out: Record<string, ReviewFlag> = {};
  for (const f of flags) {
    if (!out[f.field] || (out[f.field].type === "confirm" && f.type === "mustCorrect")) out[f.field] = f;
  }
  return out;
};
