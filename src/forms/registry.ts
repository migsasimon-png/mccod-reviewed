import layouts from "./layouts.json";
import { FormDefinition, FormId, FormLayout } from "./types";

// The MCCOD (ICD-11 certification) program — shared with the legacy flow.
export const MCCOD_PROGRAM = "vf8dN49jprI";
export const MCCOD_STAGE = "aKclf7Yl1PE";
export const CASE_NUMBER_DE = "ZKBE8Xm9DJG";
export const LINKED_DE = "ZkNDFfFSTYg";

const l = layouts as unknown as Record<FormId, FormLayout>;

// The MDR "Section 8b: Certified Cause of Death" free-text cause fields are
// upgraded to WHO ICD-11 search fields so the maternal review certifies the
// cause the same way MCCOD does.
const MDR_ICD_COD = new Set([
  "sfpqAeqKeyQ", // cause of death (a)
  "zb7uTuBCPrN", // cause of death (b)
  "QGFYJK00ES7", // cause of death (c)
  "CnPGhOcERFF", // cause of death (d)
]);

for (const section of l.mdr) {
  for (const group of section.groups) {
    for (const f of group.fields) {
      if (MDR_ICD_COD.has(f.de)) f.icd = true;
    }
  }
}

export const formDefinitions: Record<FormId, FormDefinition> = {
  mdr: {
    id: "mdr",
    title: "Maternal Death Review",
    subtitle: "MPDSR Form 020 — review a maternal death",
    color: "linear-gradient(135deg, #b0206a 0%, #7a1450 100%)",
    accent: "#b0206a",
    icon: "maternal",
    programStage: "YXed7PnLRco",
    casePrefix: " MATERNAL - ",
    caseNumberField: CASE_NUMBER_DE,
    linkedField: LINKED_DE,
    layout: l.mdr,
  },
  pdr: {
    id: "pdr",
    title: "Perinatal Death Review",
    subtitle: "MPDSR Form 017 — review a perinatal/newborn death",
    color: "linear-gradient(135deg, #1f7a4d 0%, #155c39 100%)",
    accent: "#1f7a4d",
    icon: "perinatal",
    programStage: "CGz50G2MY16",
    casePrefix: "PERI - ",
    caseNumberField: CASE_NUMBER_DE,
    linkedField: LINKED_DE,
    layout: l.pdr,
  },
  cdr: {
    id: "cdr",
    title: "Child Death Review",
    subtitle: "CDR Form — deaths from 8 days to 17 years",
    color: "linear-gradient(135deg, #b5651d 0%, #8a4a12 100%)",
    accent: "#b5651d",
    icon: "child",
    programStage: "",
    casePrefix: "CHILD - ",
    caseNumberField: CASE_NUMBER_DE,
    layout: l.cdr,
    placeholder: true,
  },
  mccod: {
    id: "mccod",
    title: "ICD-11 Medical Certification",
    subtitle: "HMIS Form 100 — medical certificate of cause of death",
    color: "linear-gradient(135deg, #1c5fb0 0%, #12447f 100%)",
    accent: "#1c5fb0",
    icon: "mccod",
    programStage: MCCOD_STAGE,
    caseNumberField: CASE_NUMBER_DE,
    nameField: "ZYKmQ9GPOaF",
    ninField: "MOstDqSY0gO",
    layout: l.mccod,
    // The MCCOD form *is* the certification, so it has no separate ICD prefix
    // and no "certify" hand-off; it computes the underlying cause via WHO DORIS.
    isMccod: true,
  },
};

export const getFormDefinition = (id: FormId): FormDefinition =>
  formDefinitions[id];

/** Flattened field lookup for a form, keyed by data element id. */
export const fieldIndex = (id: FormId) => {
  const idx: Record<string, { label: string; icd?: boolean }> = {};
  for (const section of formDefinitions[id].layout) {
    for (const group of section.groups) {
      for (const f of group.fields) {
        idx[f.de] = { label: f.label, icd: f.icd };
      }
    }
  }
  return idx;
};
