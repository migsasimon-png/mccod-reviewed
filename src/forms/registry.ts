import layouts from "./layouts.json";
import { FormDefinition, FormId, FormLayout } from "./types";

// The MCCOD (ICD-11 certification) program — shared with the legacy flow.
export const MCCOD_PROGRAM = "vf8dN49jprI";
export const MCCOD_STAGE = "aKclf7Yl1PE";
export const CASE_NUMBER_DE = "ZKBE8Xm9DJG";
export const LINKED_DE = "ZkNDFfFSTYg";

const l = layouts as unknown as Record<FormId, FormLayout>;

// The "Certified Cause of Death" free-text cause fields are upgraded to WHO
// ICD-11 search fields so each review (maternal, perinatal, child) can certify
// the cause inline the same way MCCOD does — no separate form needed.
const ICD_COD = new Set([
  "sfpqAeqKeyQ", // cause of death (a)
  "zb7uTuBCPrN", // cause of death (b)
  "QGFYJK00ES7", // cause of death (c)
  "CnPGhOcERFF", // cause of death (d)
  "xeE5TQLvucB", // Other significant condition 1
  "mI0UjQioE7E", // Other significant condition 2
  "u5ebhwtAmpU", // Other significant condition 3
  "OxJgcwH15L7", // Other significant condition 4
  "Zrn8LD3LoKY", // Other significant condition 5
]);

// Coded fields where several answers apply at once — rendered as a
// multi-select of checkboxes; stored as comma-joined option codes.
const MULTI_SELECT = new Set([
  "FX3mcSuvR3c", // CDR — Major signs and symptoms at admission
  "DuFUOsHMvjZ", // CDR — Known conditions during pregnancy
]);

// Certified cause-of-death chain: each row is a wide ICD cause field flanked by
// two small interval fields (type + value), like a death-certificate line —
// Cause (14) | Type of interval (5) | Time interval (5) = 24.
const COL_SPAN: Record<string, number> = {
  sfpqAeqKeyQ: 14, zb7uTuBCPrN: 14, QGFYJK00ES7: 14, CnPGhOcERFF: 14, // cause a–d
  Ylht9kCLSRW: 5, myydnkmLfhp: 5, aC64sB86ThG: 5, cmZrrHfTxW3: 5, // interval type a–d
  WkXxkKEJLsg: 5, fleGy9CvHYh: 5, hO8No9fHVd2: 5, eCVDO6lt4go: 5, // interval value a–d
};

// Copy codeField, uriField and next from mccod layout to other layouts (mdr, pdr, cdr)
const mccodFieldMap = new Map<string, { codeField?: string; uriField?: string; next?: string }>();
for (const section of l.mccod) {
  for (const group of section.groups) {
    for (const f of group.fields) {
      if (ICD_COD.has(f.de)) {
        mccodFieldMap.set(f.de, { codeField: f.codeField, uriField: f.uriField, next: f.next });
      }
    }
  }
}

for (const layout of [l.mdr, l.pdr, l.cdr]) {
  for (const section of layout) {
    for (const group of section.groups) {
      for (const f of group.fields) {
        if (ICD_COD.has(f.de)) f.icd = true;
        if (MULTI_SELECT.has(f.de)) f.multi = true;

        const mccodProps = mccodFieldMap.get(f.de);
        if (mccodProps) {
          if (mccodProps.codeField) f.codeField = mccodProps.codeField;
          if (mccodProps.uriField) f.uriField = mccodProps.uriField;
          if (mccodProps.next) f.next = mccodProps.next;
        }
      }
    }
  }
}

for (const layout of [l.mdr, l.pdr, l.cdr, l.mccod]) {
  for (const section of layout) {
    for (const group of section.groups) {
      for (const f of group.fields) {
        // The case number is auto-generated and sequential — never hand-typed.
        if (f.de === CASE_NUMBER_DE) f.readOnly = true;
        if (COL_SPAN[f.de]) f.col = COL_SPAN[f.de];
      }
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
    caseCode: "020",
    linkedField: LINKED_DE,
    listColumns: [
      { key: "case", title: "Case number", de: CASE_NUMBER_DE },
      { key: "initials", title: "Initials", de: "FIfoObQJvNp" },
      { key: "district", title: "District", de: "FHmHV9mElbD" },
      { key: "age", title: "Age", de: "iJqBq0kQtWO", align: "right" },
      { key: "date", title: "Event date", type: "date", width: 130 },
      { key: "lastUpdated", title: "Last updated", type: "datetime", width: 160 },
      { key: "status", title: "Status", type: "status", de: LINKED_DE, width: 120 },
    ],
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
    caseCode: "017",
    linkedField: LINKED_DE,
    listColumns: [
      { key: "case", title: "Case number", de: CASE_NUMBER_DE },
      { key: "mother", title: "Mother's initials", de: "xpJgWYFpvht" },
      { key: "district", title: "District", de: "u44XP9fZweA" },
      { key: "date", title: "Event date", type: "date", width: 130 },
      { key: "lastUpdated", title: "Last updated", type: "datetime", width: 160 },
      { key: "status", title: "Status", type: "status", de: LINKED_DE, width: 120 },
    ],
    layout: l.pdr,
  },
  cdr: {
    id: "cdr",
    title: "Child Death Review",
    subtitle: "CDR Form — deaths from 8 days to 17 years",
    color: "linear-gradient(135deg, #b5651d 0%, #8a4a12 100%)",
    accent: "#b5651d",
    icon: "child",
    program: "EIdLkJfyJ6s",
    programStage: "lLO6f44xh4H",
    casePrefix: "CHILD - ",
    caseNumberField: CASE_NUMBER_DE,
    caseCode: "CDR",
    listColumns: [
      { key: "case", title: "Case number", de: CASE_NUMBER_DE },
      { key: "initials", title: "Child's initials", de: "GTI7EqoQokL" },
      { key: "sex", title: "Sex", de: "Hq6GGFTlHHj" },
      { key: "district", title: "District", de: "xv0FATnFVms" },
      { key: "date", title: "Event date", type: "date", width: 130 },
      { key: "lastUpdated", title: "Last updated", type: "datetime", width: 160 },
    ],
    layout: l.cdr,
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
    caseCode: "100",
    nameField: "ZYKmQ9GPOaF",
    ninField: "MOstDqSY0gO",
    listColumns: [
      { key: "case", title: "Case number", de: CASE_NUMBER_DE },
      { key: "name", title: "Deceased", de: "ZYKmQ9GPOaF" },
      { key: "nin", title: "NIN", de: "MOstDqSY0gO" },
      { key: "date", title: "Event date", type: "date", width: 130 },
      { key: "link", title: "Maternal Link", type: "maternalLink", width: 140 },
      { key: "lastUpdated", title: "Last updated", type: "datetime", width: 160 },
    ],
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
