/**
 * Placeholder data elements used in MDR/PDR layouts before / alongside real DHIS2 UIDs.
 *
 * Layouts keep stable NEW_* keys. PENDING_DE_UIDS remaps at save/load time.
 * Fallback options below are used when the live DE has no option set yet.
 */

import { RETEST_DATA_ELEMENTS, RETEST_DE_UIDS } from "./retestDataElements";

export type PendingForm = "mdr" | "pdr";

export interface PendingDataElement {
  /** Stable placeholder id used in layouts.json / skip logic. */
  placeholder: string;
  form: PendingForm;
  /** Paper form item (MCH020 / MCH017 July 2024). */
  paperItem: string;
  name: string;
  valueType: "TEXT" | "LONG_TEXT" | "INTEGER" | "INTEGER_ZERO_OR_POSITIVE" | "NUMBER" | "BOOLEAN" | "TRUE_ONLY" | "DATE" | "DATETIME" | "TIME";
  /** Option codes/names when an option set is required / used as fallback. */
  options?: { code: string; name: string }[];
  /** In layouts.json today? */
  inLayout: boolean;
  notes?: string;
}

/**
 * Real DHIS2 UIDs. Keys MUST be the NEW_* placeholders used in layouts.json.
 * Confirmed on stages YXed7PnLRco (MDR) and CGz50G2MY16 (PDR).
 */
export const PENDING_DE_UIDS: Record<string, string> = {
  // --- MCH020 (MDR) ---
  NEW_mdr_death_place_type: "sng0ADbyiaD",
  NEW_mdr_delivery_facility_name: "quUGi5FzvQD",
  NEW_mdr_reviewer_details: "PFX8QLFkHPW",
  NEW_mdr_record_legibility: "GGmkUtIUudN",

  // --- MCH017 (PDR) ---
  NEW_pdr_mother_nin: "vBw7yUMmNqE",
  NEW_pdr_multiple_babies_count: "mpkn0DcwYJ4",
  NEW_pdr_blood_group: "MgfCM5suH25",
  NEW_pdr_rhesus_factor: "bV4o7i4z3by",
  NEW_pdr_blood_transfusion: "QoQK1LYwt8r",
  NEW_pdr_review_date: "Xb6hXkvGn5S",
  NEW_pdr_record_legibility: "mtRKyyYI43Z",
  NEW_pdr_reviewer_details: "W0xhCBT435Y",
  NEW_pdr_neonatal_admission_time: "VsTOk8MFAc2",

  // --- 24 Nov 2026 retest: created by scripts/apply-retest-metadata.js ---
  ...RETEST_DE_UIDS,
};

export const PENDING_DATA_ELEMENTS: PendingDataElement[] = [
  ...RETEST_DATA_ELEMENTS,
  // —— MCH020 Maternal (MDR) ——
  {
    placeholder: "NEW_mdr_death_place_type",
    form: "mdr",
    paperItem: "3.1",
    name: "Where did the death occur?",
    valueType: "TEXT",
    options: [
      { code: "HealthFacility", name: "Health Facility" },
      { code: "Home", name: "Home" },
      { code: "In_transit_from_Home", name: "In transit from Home" },
      { code: "During_Referral", name: "During Referral" },
    ],
    inLayout: true,
    notes: "Non-facility places hide admission fields.",
  },
  {
    placeholder: "NEW_mdr_delivery_facility_name",
    form: "mdr",
    paperItem: "5.8",
    name: "Specify Name of facility",
    valueType: "TEXT",
    inLayout: true,
  },
  {
    placeholder: "NEW_mdr_reviewer_details",
    form: "mdr",
    paperItem: "Completed by",
    name: "Reviewer Details (Name / Contact / Date)",
    valueType: "TEXT",
    inLayout: true,
  },
  {
    placeholder: "NEW_mdr_record_legibility",
    form: "mdr",
    paperItem: "9 / records",
    name: "Legibility of Medical Records",
    valueType: "TEXT",
    options: [
      { code: "Good", name: "Good" },
      { code: "Poor", name: "Poor" },
    ],
    inLayout: true,
  },

  // —— MCH017 Perinatal (PDR) ——
  {
    placeholder: "NEW_pdr_mother_nin",
    form: "pdr",
    paperItem: "1.1.3",
    name: "Mother NIN",
    valueType: "TEXT",
    inLayout: true,
  },
  {
    placeholder: "NEW_pdr_multiple_babies_count",
    form: "pdr",
    paperItem: "2.2.2.1",
    name: "If multiple, state number of babies",
    valueType: "INTEGER",
    inLayout: true,
  },
  {
    placeholder: "NEW_pdr_blood_group",
    form: "pdr",
    paperItem: "2.5.9",
    name: "Blood Group",
    valueType: "TEXT",
    options: [
      { code: "A", name: "A" },
      { code: "B", name: "B" },
      { code: "AB", name: "AB" },
      { code: "O", name: "O" },
    ],
    inLayout: true,
  },
  {
    placeholder: "NEW_pdr_rhesus_factor",
    form: "pdr",
    paperItem: "2.5.9.1",
    name: "Rhesus Factor",
    valueType: "TEXT",
    options: [
      { code: "Positive", name: "Positive" },
      { code: "Negative", name: "Negative" },
    ],
    inLayout: true,
  },
  {
    placeholder: "NEW_pdr_blood_transfusion",
    form: "pdr",
    paperItem: "2.5.9.2",
    name: "Blood Transfusion During Pregnancy",
    valueType: "TEXT",
    options: [
      { code: "Yes", name: "Yes" },
      { code: "No", name: "No" },
    ],
    inLayout: true,
    notes: "Live DE is TEXT without option set — fallback Yes/No used in UI.",
  },
  {
    placeholder: "NEW_pdr_record_legibility",
    form: "pdr",
    paperItem: "6.1",
    name: "Legibility of Medical Records",
    valueType: "TEXT",
    options: [
      { code: "Good", name: "Good" },
      { code: "Poor", name: "Poor" },
    ],
    inLayout: true,
  },
  {
    placeholder: "NEW_pdr_reviewer_details",
    form: "pdr",
    paperItem: "Completed by",
    name: "Reviewer Details (Name / Contact / Date)",
    valueType: "TEXT",
    inLayout: true,
  },
  {
    placeholder: "NEW_pdr_review_date",
    form: "pdr",
    paperItem: "Date of review",
    name: "Date of Review",
    valueType: "DATE",
    inLayout: true,
  },
  {
    placeholder: "NEW_pdr_neonatal_admission_time",
    form: "pdr",
    paperItem: "3.8.1.1",
    name: "If Neonatal death, time of Admission",
    valueType: "TIME",
    inLayout: true,
  },
];

const DHIS2_UID = /^[A-Za-z][A-Za-z0-9]{10}$/;

export const isPendingPlaceholder = (id: string) => id.startsWith("NEW_");

export const isMappedPendingDe = (placeholder: string) => {
  const uid = PENDING_DE_UIDS[placeholder];
  return !!(uid && DHIS2_UID.test(uid));
};

/** Layout/form key → DHIS2 data element id used on the wire. */
export const toDhis2DeId = (placeholderOrUid: string): string => {
  const mapped = PENDING_DE_UIDS[placeholderOrUid];
  if (mapped && DHIS2_UID.test(mapped)) return mapped;
  return placeholderOrUid;
};

/** Build reverse map: real UID → placeholder (only for mapped entries). */
export const pendingUidToPlaceholder = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [placeholder, uid] of Object.entries(PENDING_DE_UIDS)) {
    if (uid && DHIS2_UID.test(uid)) out[uid] = placeholder;
  }
  return out;
};

/** DHIS2 data element id → layout/form key. */
export const fromDhis2DeId = (uid: string): string =>
  pendingUidToPlaceholder()[uid] || uid;

/** Placeholders that still have no real UID (create these in DHIS2). */
export const unmappedPlaceholders = (form?: PendingForm) =>
  PENDING_DATA_ELEMENTS.filter(
    (de) => (!form || de.form === form) && !isMappedPendingDe(de.placeholder)
  );

/** UIDs to fetch meta for, in addition to layout UID-shaped ids. */
export const mappedPendingUids = (): string[] =>
  Object.values(PENDING_DE_UIDS).filter((uid) => DHIS2_UID.test(uid));
