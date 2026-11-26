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
  /**
   * Presentation override applied on top of the DHIS2 metadata:
   *  - "date"       → date picker (for DATE-like answers stored as text)
   *  - "checkbox"   → single tick box labelled Yes (stored true/false)
   *  - "yesNo"      → Yes / No radio pair
   *  - "yesNoCheck" → Yes / No tick boxes, mutually exclusive
   */
  widget?: "date" | "checkbox" | "yesNo" | "yesNoCheck";
  /** Fixed choices for a coded field when the DHIS2 option set is absent. */
  options?: { code: string; name: string }[];
  /**
   * Option codes that stay out of the choice list (retired choices). A saved
   * record that already holds one still shows it, so old answers stay readable.
   */
  hideOptions?: string[];
  /**
   * Retired options are hidden only when every code listed here exists in the
   * live option set (the replacement choices have been created). Without this
   * the options are hidden unconditionally.
   */
  hideOptionsWhen?: string[];
  /**
   * Earlier boolean data element this field replaces. A saved record that holds
   * the old true/false answer shows it here as Yes/No.
   */
  legacyDe?: string;
  /** Allow future dates in a date picker (follow-up deadlines, not events). */
  allowFuture?: boolean;
  /**
   * In a "factors" table: this field is the Specify box of the tick box with
   * this data element id. It only opens once that factor is ticked.
   */
  specifyFor?: string;
}

export interface FormGroup {
  /** Sub-heading shown above the group, or null for an ungrouped block. */
  label: string | null;
  fields: FormField[];
  /**
   * How the group is drawn:
   *  - default           a responsive grid of labelled fields
   *  - "factors"         table of No. / Factor / Yes / Specify rows (Capture style)
   *  - "recommendations" table of No. / Gap / Recommendation / Responsible / Timeframe,
   *                      4 fields per row; row n+1 opens once row n has an answer
   */
  table?: "factors" | "recommendations";
  /** Sub-groups drawn side by side, each with its own heading. */
  columns?: FormGroup[];
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
  type?: "value" | "date" | "status" | "datetime" | "maternalLink" | "reviewStatus";
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
export type FormModule = "home" | "dashboard" | "records" | FormId;
