// Shared types for the config-driven death-review form engine.

export interface FormField {
  /** DHIS2 data element UID (or a CDR_* placeholder pending mapping). */
  de: string;
  /** Human readable label shown in the UI. */
  label: string;
  /** Optional helper text (e.g. the allowed choices). */
  hint?: string;
  /** When true this field is an ICD-11 coded cause-of-death search field. */
  icd?: boolean;
  /** Data element that stores the ICD-11 code for an ICD field. */
  codeField?: string;
  /** Data element that stores the ICD-11 URI for an ICD field. */
  uriField?: string;
  /** Data element to enable once this ICD field is filled (chained rows). */
  next?: string;
  /** Render disabled — e.g. the auto-generated case number, not hand-edited. */
  readOnly?: boolean;
  /** Coded field that accepts several options — a multi-select of checkboxes. */
  multi?: boolean;
  /** Explicit large-screen column span (1–24) overriding the default sizing. */
  col?: number;
}

export interface FormGroup {
  /** Sub-heading shown above the group, or null for an ungrouped block. */
  label: string | null;
  fields: FormField[];
}

export interface FormSection {
  title: string;
  groups: FormGroup[];
}

export type FormLayout = FormSection[];

/** A configurable column in a form's record-list table. */
export interface ListColumn {
  /** Unique key for the column. */
  key: string;
  /** Header text. */
  title: string;
  /**
   * Data element UID to read for this column (via recordValue). Omitted for
   * built-in columns whose value is derived (e.g. the event date).
   */
  de?: string;
  /**
   * Built-in render behaviour:
   *  - "date"   → formats the event date (ignores `de`)
   *  - "status" → renders the linked/certified tag from `de`
   *  - default  → shows the raw/coded value of `de`
   */
  type?: "value" | "date" | "status";
  /** Optional fixed width in pixels. */
  width?: number;
  /** Text alignment. */
  align?: "left" | "right" | "center";
}

export interface FormDefinition {
  id: FormId;
  title: string;
  subtitle: string;
  /** Tile gradient / accent colour. */
  color: string;
  accent: string;
  /** Icon key rendered on the home tile. */
  icon: "maternal" | "perinatal" | "mccod" | "child";
  /** DHIS2 program stage that owns this form's data elements. */
  programStage: string;
  /** Owning program; resolved from the stage at runtime when omitted. */
  program?: string;
  /** Prefix stamped onto the case number so MCCOD can match the death. */
  casePrefix?: string;
  /** Data element holding the MoH national case number. */
  caseNumberField: string;
  /** Short register code stamped into generated case numbers (e.g. "020"). */
  caseCode?: string;
  /** Data element toggled to "Linked" once an ICD-11 record is attached. */
  linkedField?: string;
  /** Deceased full-name data element (shown as a record-list column). */
  nameField?: string;
  /** NIN / national ID data element (record-list column + NIN prefill). */
  ninField?: string;
  /**
   * Columns shown in the record-list table. When omitted the list falls back
   * to a sensible default derived from caseNumber/name/nin/date/status.
   */
  listColumns?: ListColumn[];
  layout: FormLayout;
  /** CDR ships with placeholder data elements until the user maps them. */
  placeholder?: boolean;
  /** The MCCOD certification itself — enables WHO DORIS, hides "certify". */
  isMccod?: boolean;
}

export type FormId = "mdr" | "pdr" | "cdr" | "mccod";

/** "records" opens the legacy MCCOD case list + analytics flow. */
export type FormModule = "home" | "records" | FormId;
