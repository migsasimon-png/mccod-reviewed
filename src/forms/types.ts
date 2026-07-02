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
  /** Data element toggled to "Linked" once an ICD-11 record is attached. */
  linkedField?: string;
  /** Deceased full-name data element (shown as a record-list column). */
  nameField?: string;
  /** NIN / national ID data element (record-list column + NIN prefill). */
  ninField?: string;
  layout: FormLayout;
  /** CDR ships with placeholder data elements until the user maps them. */
  placeholder?: boolean;
  /** The MCCOD certification itself — enables WHO DORIS, hides "certify". */
  isMccod?: boolean;
}

export type FormId = "mdr" | "pdr" | "cdr" | "mccod";

/** "records" opens the legacy MCCOD case list + analytics flow. */
export type FormModule = "home" | "records" | FormId;
