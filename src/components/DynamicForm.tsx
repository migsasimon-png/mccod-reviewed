import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { observer } from "mobx-react";
import { runInAction } from "mobx";
import moment from "moment";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  notification,
  Popover,
  Progress,
  Row,
  Select,
  Spin,
  Table,
  Tag,
  TimePicker,
} from "antd";
import { useStore } from "../Context";
import { dynamicFormStore, MATERNAL_TO_MCCOD_MAP, CDR_TO_MCCOD_MAP, PERINATAL_TO_MCCOD_MAP } from "../forms/DynamicFormStore";
import { getFormDefinition, CASE_NUMBER_DE } from "../forms/registry";
import { FormField, ListColumn } from "../forms/types";
import {
  applySkipEffects,
  computeSkipState,
  emptySkipState,
  isFieldDisabled,
  isFieldVisible,
} from "../forms/skipLogic";
import { LoadingOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { MccodTableSection } from "./MccodTableSection";
import { MccodLinkageBanner } from "./MccodLinkageBanner";
import { MccodToMaternalLinkageBanner } from "./MccodToMaternalLinkageBanner";
import { useNinApi } from "../utils/ninApi";
import { ICDField } from "./ICDField";
import { FormContextBar, isFormContextReady } from "./FormContextBar";
import { DorisReportModal } from "./DorisReportModal";
import "./DynamicForm.css";

const UGANDAN = "l4UMmqvSBe5";

const { Option } = Select;
const { TextArea } = Input;

const NUMERIC = [
  "INTEGER",
  "INTEGER_POSITIVE",
  "INTEGER_NEGATIVE",
  "INTEGER_ZERO_OR_POSITIVE",
  "NUMBER",
  "PERCENTAGE",
  "UNIT_INTERVAL",
];

/** Renders a single field's widget based on runtime DHIS2 metadata. */
export const FieldWidget = observer(
  ({
    field,
    form,
    disabled = false,
    hint,
    ...rest
  }: {
    field: FormField;
    form: any;
    disabled?: boolean;
    hint?: string;
    // antd Form.Item injects value/onChange/id here — they MUST be forwarded to
    // the underlying control, otherwise the widget is uncontrolled and neither
    // hydration (edit prefill) nor data capture works.
    [key: string]: any;
  }) => {
    const meta = dynamicFormStore.meta[field.de];

    // Case number is an alphanumeric string (e.g. CDR/BrtC10sqp45/2026/00001).
    // Force standard text Input so antd InputNumber does not blank it out.
    const activeCaseDe = dynamicFormStore.activeForm?.caseNumberField;
    if (field.de === "ZKBE8Xm9DJG" || (activeCaseDe && field.de === activeCaseDe)) {
      return <Input {...rest} size="middle" disabled={disabled} placeholder={hint} />;
    }

    if (field.icd) {
      return (
        <ICDField
          field={field.de}
          form={form}
          codeField={field.codeField}
          uriField={field.uriField}
          next={field.next}
          disabled={disabled}
        />
      );
    }

    let options = meta?.options;
    if (
      (!options || !options.length) &&
      ["Ylht9kCLSRW", "myydnkmLfhp", "aC64sB86ThG", "cmZrrHfTxW3"].includes(field.de)
    ) {
      options = [
        { code: "Minutes", name: "Minutes" },
        { code: "Hours", name: "Hours" },
        { code: "Days", name: "Days" },
        { code: "Weeks", name: "Weeks" },
        { code: "Months", name: "Months" },
        { code: "Years", name: "Years" },
      ];
    }

    if (options && options.length) {
      return (
        <Select
          {...rest}
          mode={field.multi ? "multiple" : undefined}
          size="middle"
          allowClear
          showSearch
          showArrow
          optionFilterProp="children"
          disabled={disabled}
          style={{ width: "100%" }}
        >
          {options.map((o) => (
            <Option key={o.code} value={o.code}>
              {o.name}
            </Option>
          ))}
        </Select>
      );
    }

    const vt = meta?.valueType;
    if (vt === "BOOLEAN") {
      return (
        <Select {...rest} size="middle" allowClear disabled={disabled} style={{ width: "100%" }}>
          <Option value="true">Yes</Option>
          <Option value="false">No</Option>
        </Select>
      );
    }
    if (vt === "TRUE_ONLY") {
      return (
        <Checkbox {...rest} disabled={disabled}>
          Yes
        </Checkbox>
      );
    }
    if (vt === "DATE") {
      return (
        <DatePicker {...rest} size="middle" disabled={disabled} style={{ width: "100%" }} />
      );
    }
    if (vt === "DATETIME") {
      return (
        <DatePicker
          {...rest}
          size="middle"
          showTime
          disabled={disabled}
          style={{ width: "100%" }}
        />
      );
    }
    if (vt === "TIME") {
      return (
        <TimePicker
          {...rest}
          size="middle"
          format="HH:mm"
          minuteStep={5}
          disabled={disabled}
          style={{ width: "100%" }}
        />
      );
    }
    if (vt && NUMERIC.includes(vt)) {
      const num: any = { size: "middle", disabled, style: { width: "100%" } };
      if (vt.indexOf("INTEGER") === 0) num.precision = 0; // whole numbers only
      if (vt === "INTEGER_POSITIVE") num.min = 1;
      else if (vt === "INTEGER_NEGATIVE") num.max = -1;
      else if (
        vt === "INTEGER_ZERO_OR_POSITIVE" ||
        vt === "PERCENTAGE" ||
        vt === "UNIT_INTERVAL"
      )
        num.min = 0;
      if (vt === "PERCENTAGE") num.max = 100;
      if (vt === "UNIT_INTERVAL") {
        num.max = 1;
        num.step = 0.1;
      }
      return <InputNumber {...rest} {...num} />;
    }
    if (vt === "LONG_TEXT") {
      return <TextArea {...rest} rows={3} disabled={disabled} />;
    }
    return <Input {...rest} size="middle" disabled={disabled} placeholder={hint} />;
  }
);

/**
 * Responsive column width for a field, tiered by its DHIS2 value type:
 *  - full  (lg 24) → long free text
 *  - medium (lg 8) → short free text + coded dropdowns (need label room)
 *  - compact (lg 6) → dates, numbers, yes/no, checkboxes
 * (ICD cause fields are laid out separately and don't use this.)
 */
const fieldSpan = (field: FormField): { sm: number; lg: number } => {
  // Explicit per-field override (e.g. the wide cause / small interval fields).
  if (field.col) return { sm: field.col >= 12 ? 24 : 12, lg: field.col };
  const meta = dynamicFormStore.meta[field.de];
  const vt = meta?.valueType;
  // ICD cause search needs room; long text and multi-selects take a full row;
  // everything else forms a uniform three-column grid so fields line up.
  if (field.icd) return { sm: 24, lg: 16 };
  if (vt === "LONG_TEXT" || field.multi) return { sm: 24, lg: 24 };
  return { sm: 12, lg: 8 };
};

const valuePropName = (field: FormField) =>
  dynamicFormStore.meta[field.de]?.valueType === "TRUE_ONLY"
    ? "checked"
    : "value";

const DATE_TYPES = ["DATE", "DATETIME"];

/**
 * Human-readable value of a field on a saved event, for the read-only detail
 * view: option codes → names, dates formatted, booleans as Yes/No, ICD fields
 * shown with their code. Returns "" when the field was left blank.
 */
const displayValue = (field: FormField, record: any): string => {
  const raw = dynamicFormStore.recordValue(record, field.de);
  if (raw === "" || raw == null) return "";
  const meta = dynamicFormStore.meta[field.de];
  if (field.multi) {
    return String(raw)
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => meta?.options?.find((o) => o.code === c)?.name ?? c)
      .join(", ");
  }
  const opt = meta?.options?.find((o) => o.code === raw);
  if (opt) return opt.name;
  const vt = meta?.valueType;
  if (vt === "BOOLEAN")
    return /^true$/i.test(raw) ? "Yes" : /^false$/i.test(raw) ? "No" : raw;
  if (vt === "TRUE_ONLY") return /^true$/i.test(raw) ? "Yes" : raw;
  if (vt === "DATE")
    return moment(raw).isValid() ? moment(raw).format("DD MMM YYYY") : raw;
  if (vt === "DATETIME")
    return moment(raw).isValid() ? moment(raw).format("DD MMM YYYY, HH:mm") : raw;
  if (field.icd && field.codeField) {
    const code = dynamicFormStore.recordValue(record, field.codeField);
    return code ? `${raw} (${code})` : raw;
  }
  return raw;
};

/** Human-readable value of a single data element on a record (for list cells). */
const displayValueByDe = (de: string, record: any): string => {
  const raw = dynamicFormStore.recordValue(record, de);
  if (raw === "" || raw == null) return "";
  const meta = dynamicFormStore.meta[de];
  const opt = meta?.options?.find((o) => o.code === raw);
  if (opt) return opt.name;
  const vt = meta?.valueType;
  if (vt === "BOOLEAN")
    return /^true$/i.test(raw) ? "Yes" : /^false$/i.test(raw) ? "No" : raw;
  if (vt === "TRUE_ONLY") return /^true$/i.test(raw) ? "Yes" : raw;
  if (vt === "DATE")
    return moment(raw).isValid() ? moment(raw).format("DD MMM YYYY") : raw;
  return raw;
};

/** Fallback columns when a form defines no explicit `listColumns`. */
const defaultListColumns = (
  def: ReturnType<typeof getFormDefinition>
): ListColumn[] => {
  const cols: ListColumn[] = [
    { key: "case", title: "Case number", de: def.caseNumberField },
  ];
  if (def.nameField) cols.push({ key: "name", title: "Deceased", de: def.nameField });
  if (def.ninField) cols.push({ key: "nin", title: "NIN", de: def.ninField });
  cols.push({ key: "date", title: "Event date", type: "date", width: 130 });
  if (def.linkedField)
    cols.push({
      key: "status",
      title: "Status",
      type: "status",
      de: def.linkedField,
      width: 120,
    });
  return cols;
};

interface RecordListProps {
  def: ReturnType<typeof getFormDefinition>;
  onNew: () => void;
  onView: (event: any) => void;
  onEdit: (event: any) => void;
}

const RecordList = observer(({ def, onNew, onView, onEdit }: RecordListProps) => {
  const store = useStore();
  const rows = dynamicFormStore.records;
  const canAdd = isFormContextReady(store);
  const [searchText, setSearchText] = useState("");

  const filteredRows = useMemo(() => {
    if (!searchText.trim()) return rows;
    return rows.filter((r: any) => {
      const caseNum = dynamicFormStore.recordValue(r, CASE_NUMBER_DE) || "";
      return caseNum.toLowerCase().includes(searchText.toLowerCase().trim());
    });
  }, [rows, searchText]);

  // Configurable columns from the form definition; fall back to a sensible
  // default derived from case/name/nin/date/status when none are configured.
  const configured =
    def.listColumns && def.listColumns.length
      ? def.listColumns
      : defaultListColumns(def);

  const columns: any[] = configured.map((col) => ({
    title: col.title,
    key: col.key,
    align: col.align,
    width: col.width,
    render: (_: any, r: any) => {
      if (col.type === "date")
        return r.eventDate ? moment(r.eventDate).format("DD MMM YYYY") : "—";
      if (col.type === "datetime") {
        const raw = col.key === "lastUpdated" ? r.lastUpdated : (col.de ? dynamicFormStore.recordValue(r, col.de) : "");
        return raw ? moment(raw).format("DD MMM YYYY HH:mm") : "—";
      }
      if (col.type === "maternalLink") {
        const caseNumRaw = dynamicFormStore.recordValue(r, CASE_NUMBER_DE) || (col.de ? dynamicFormStore.recordValue(r, col.de) : "");
        const caseNum = (caseNumRaw || "").trim().toUpperCase();

        let label = "Direct Entry";
        let color = "default";

        if (caseNum.startsWith("CDR") || caseNum.startsWith("CDS") || caseNum.includes("CHILD") || dynamicFormStore.childCaseNumbers.has(caseNumRaw.trim())) {
          label = "Child Death Review";
          color = "gold";
        } else if (caseNum.startsWith("PERI") || caseNum.startsWith("017") || caseNum.startsWith("PDR") || dynamicFormStore.perinatalCaseNumbers.has(caseNumRaw.trim())) {
          label = "Perinatal";
          color = "green";
        } else if (caseNum.startsWith("MD") || caseNum.startsWith("020") || caseNum.includes("MATERNAL") || dynamicFormStore.maternalCaseNumbers.has(caseNumRaw.trim())) {
          label = "Maternal Death Review";
          color = "purple";
        } else if (caseNum.startsWith("EMR")) {
          label = "IYAFYA";
          color = "blue";
        }

        return (
          <Tag color={color} style={{ fontWeight: 600 }}>
            {label}
          </Tag>
        );
      }
      if (col.type === "status") {
        const linkedVal = col.de ? dynamicFormStore.recordValue(r, col.de) : "";
        const causeA = dynamicFormStore.recordValue(r, "sfpqAeqKeyQ") || dynamicFormStore.recordValue(r, "zD0E77W4rFs");
        const finalCause = dynamicFormStore.recordValue(r, "n2mScmFMovq") || dynamicFormStore.recordValue(r, "mQVAyOLbga1");
        
        // A record is ONLY "Certified" if it has an actual ICD-11 cause filled in OR linkedVal is a real 11-char DHIS2 Event UID
        const isRealUid = typeof linkedVal === "string" && linkedVal.length === 11 && !/^(true|false|1|0|yes|no)$/i.test(linkedVal);
        const isCertified = Boolean(isRealUid || finalCause || causeA);

        return (
          <Tag color={isCertified ? "green" : "orange"}>
            {isCertified ? "Certified" : "Not Linked"}
          </Tag>
        );
      }
      const opt = col.de ? displayValueByDe(col.de, r) : "";
      return opt || "—";
    },
  }));
  columns.push({
    title: "",
    key: "actions",
    align: "right" as const,
    render: (_: any, r: any) => (
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onView(r);
          }}
        >
          View
        </Button>
        <Button
          size="small"
          type="link"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(r);
          }}
        >
          Edit
        </Button>
      </div>
    ),
  });

  return (
    <div className="dform-records">
      <div className="dform-records-head">
        <span className="dform-toolbar-title">
          {store.selectedOrgUnit
            ? `${filteredRows.length} record${filteredRows.length === 1 ? "" : "s"} at this facility`
            : "Select an organisation unit to list records"}
        </span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {store.selectedOrgUnit && rows.length > 0 && (
            <Input.Search
              placeholder="Search case number..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 280 }}
            />
          )}
          <Button type="primary" onClick={onNew} disabled={!canAdd}>
            + New {def.title}
          </Button>
        </div>
      </div>
      <Spin spinning={dynamicFormStore.loadingRecords}>
        {filteredRows.length ? (
          <Table
            size="middle"
            rowKey="event"
            columns={columns}
            dataSource={filteredRows}
            className="dform-records-table"
            onRow={(r: any) => ({ onClick: () => onView(r) })}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
          />
        ) : (
          <Empty
            description={
              store.selectedOrgUnit
                ? rows.length > 0
                  ? "No matching case numbers found."
                  : "No records yet — create the first one."
                : "No facility selected."
            }
          />
        )}
      </Spin>
    </div>
  );
});

interface RecordDetailProps {
  def: ReturnType<typeof getFormDefinition>;
  record: any | null;
  onClose: () => void;
  onEdit: (event: any) => void;
}

/** Read-only, full-detail view of a saved death record, grouped by section. */
const RecordDetail = observer(
  ({ def, record, onClose, onEdit }: RecordDetailProps) => {
    const sections = record
      ? def.layout
          .map((section) => ({
            title: section.title,
            rows: section.groups.flatMap((g) =>
              g.fields
                .map((f) => ({ label: f.label, value: displayValue(f, record) }))
                .filter((r) => r.value !== "")
            ),
          }))
          .filter((s) => s.rows.length)
      : [];

    const val = (de?: string) =>
      de && record ? dynamicFormStore.recordValue(record, de) : "";
    const caseNo = val(def.caseNumberField);
    const name = val(def.nameField);
    const nin = val(def.ninField);
    const linked = val(def.linkedField);

    return (
      <Drawer
        title={`${def.title} — record detail`}
        width={720}
        visible={!!record}
        onClose={onClose}
        className="dfd-drawer"
        footer={
          <div className="dfd-footer">
            <Button onClick={onClose}>Close</Button>
            <Button
              type="primary"
              onClick={() => record && onEdit(record)}
              className="dfd-edit"
            >
              Edit this record
            </Button>
          </div>
        }
      >
        {record && (
          <>
            <div className="dfd-head" style={{ borderLeftColor: def.accent }}>
              <div className="dfd-name">{name || "Unnamed deceased"}</div>
              <div className="dfd-meta">
                <span>
                  <b>Case no.</b> {caseNo || "—"}
                </span>
                {def.ninField && (
                  <span>
                    <b>NIN</b> {nin || "—"}
                  </span>
                )}
                <span>
                  <b>Date</b>{" "}
                  {record.eventDate
                    ? moment(record.eventDate).format("DD MMM YYYY")
                    : "—"}
                </span>
                <span>
                  <b>Facility</b> {record.orgUnitName || "—"}
                </span>
              </div>
              {def.linkedField && (
                <Tag
                  color={linked ? "green" : "orange"}
                  className="dfd-tag"
                >
                  {linked
                    ? "Linked to ICD-11 certificate"
                    : "Not Linked"}
                </Tag>
              )}
            </div>

            {sections.length === 0 ? (
              <Empty description="No data captured on this record yet." />
            ) : (
              sections.map((s, i) => (
                <div className="dfd-section" key={i}>
                  <div className="dfd-section-title">{s.title}</div>
                  <table className="dfd-table">
                    <tbody>
                      {s.rows.map((r, j) => (
                        <tr key={j}>
                          <th>{r.label}</th>
                          <td>{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </>
        )}
      </Drawer>
    );
  }
);

export const DynamicForm = observer(() => {
  const store = useStore();
  const [form] = Form.useForm();
  const ninapi = useNinApi();
  const def = store.activeFormId ? getFormDefinition(store.activeFormId) : null;
  const [ninLoading, setNinLoading] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});



  const [currentStep, setCurrentStep] = useState(0);
  const [savedOnce, setSavedOnce] = useState(false);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [formKey, setFormKey] = useState(0);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [detailRecord, setDetailRecord] = useState<any | null>(null);

  const [dorisValue, setDorisValue] = useState<any>({});
  const [dorisReport, setDorisReport] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [computingDoris, setComputingDoris] = useState(false);
  const dorisTimeoutRef = useRef<any>(null);
  const [lastFetchedActiveSi, setLastFetchedActiveSi] = useState<number | null>(null);
  const [lastFetchedCase, setLastFetchedCase] = useState<string | null>(null);

  const finalCauseOptions = useMemo(() => {
    const opts: Record<string, string> = {};

    // Already-selected final underlying cause (persisted value)
    const manualText = formValues["mQVAyOLbga1"];
    const manualCode = formValues["n2mScmFMovq"];
    if (manualCode) opts[manualCode] = manualText || manualCode;
    else if (manualText) opts[`_manual_${manualText}`] = manualText;

    // Row a — cause text: sfpqAeqKeyQ, code: Ylht9kCLSRW
    const causeA_text = formValues["sfpqAeqKeyQ"];
    const causeA_code = formValues["Ylht9kCLSRW"];
    if (causeA_text) opts[causeA_code || `_a_${causeA_text}`] = causeA_text;

    // Row b — cause text: zb7uTuBCPrN, code: myydnkmLfhp
    const causeB_text = formValues["zb7uTuBCPrN"];
    const causeB_code = formValues["myydnkmLfhp"];
    if (causeB_text) opts[causeB_code || `_b_${causeB_text}`] = causeB_text;

    // Row c — cause text: QGFYJK00ES7, code: aC64sB86ThG
    const causeC_text = formValues["QGFYJK00ES7"];
    const causeC_code = formValues["aC64sB86ThG"];
    if (causeC_text) opts[causeC_code || `_c_${causeC_text}`] = causeC_text;

    // Row d — cause text: CnPGhOcERFF, code: cmZrrHfTxW3
    const causeD_text = formValues["CnPGhOcERFF"];
    const causeD_code = formValues["cmZrrHfTxW3"];
    if (causeD_text) opts[causeD_code || `_d_${causeD_text}`] = causeD_text;

    // NOTE: dorisValue is intentionally NOT added here as a separate option.
    // DORIS may return a combined postcoordinated code (e.g. "JB63.Z/1C12.Y")
    // that doesn't correspond to any single cause the doctor entered.
    // Instead, MccodTableSection highlights the matching existing entry.

    return opts;
  }, [formValues, dorisValue]);


  // Live-measure the sticky hero so the sticky sidebar sits exactly below it
  // at every viewport width (the hero grows taller when its row wraps).
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const hero = heroRef.current;
    const wrap = wrapRef.current;
    const RO = (window as any).ResizeObserver;
    if (!hero || !wrap || !RO) return;
    const apply = () =>
      wrap.style.setProperty("--dform-hero-h", `${hero.offsetHeight}px`);
    apply();
    const ro = new RO(apply);
    ro.observe(hero);
    return () => ro.disconnect();
  }, [def, mode]);

  const sectionKeys = useMemo(
    () => (def ? def.layout.map((_, i) => String(i)) : []),
    [def]
  );

  useEffect(() => {
    if (!def) return;
    setCurrentStep(0);
    setSavedOnce(false);
    setMode("list");
    (async () => {
      await dynamicFormStore.openForm(def);
      await dynamicFormStore.loadRecords(def);
    })();
  }, [def, sectionKeys]);

  // Reload records whenever the selected org unit changes.
  useEffect(() => {
    if (def && mode === "list") dynamicFormStore.loadRecords(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedOrgUnit]);

  // Warm up the NIN token so lookups work on the MCCOD certificate.
  useEffect(() => {
    if (def?.isMccod) store.apiStore?.fetchNINToken?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def]);


  // Hydrate the form from the record's stored values whenever we enter form
  // mode (new or edit). Pushing values into the form store — not just relying
  // on initialValues — is what makes fields on later wizard steps (which mount
  // after the Form) show their saved data, and clears stale values between
  // records.
  useEffect(() => {
    if (mode !== "form" || dynamicFormStore.loadingMeta || !def) return;
    const hydrated = hydrate(dynamicFormStore.defaultValues);

    // If case number is not set in hydrated values, fallback to store defaults or current event
    if (def.caseNumberField && !hydrated[def.caseNumberField]) {
      const fallbackCode =
        dynamicFormStore.defaultValues?.[def.caseNumberField] ||
        (dynamicFormStore.currentEvent ? dynamicFormStore.recordValue(dynamicFormStore.currentEvent, def.caseNumberField) : "");
      if (fallbackCode) {
        hydrated[def.caseNumberField] = fallbackCode;
      }
    }

    setFormValues(hydrated);
    // Defer to the next tick so the form instance is fully connected and the
    // current step's fields are registered before we push values in.
    const t = setTimeout(() => {
      form.resetFields();
      form.setFieldsValue(hydrated);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey, mode, dynamicFormStore.loadingMeta, dynamicFormStore.defaultValues]);

  // When the wizard step changes, re-push the known values so fields that only
  // mount on the newly-shown step still display their saved/entered data. This
  // is independent of antd's version-specific `preserve` behaviour.
  useEffect(() => {
    if (mode !== "form") return;
    form.setFieldsValue(formValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, mode]);



  const skip = useMemo(() => {
    if (!def) return emptySkipState();
    return computeSkipState(
      def.id,
      def,
      formValues,
      dynamicFormStore.meta
    );
  }, [def, formValues, dynamicFormStore.meta]);

  const applicableSectionKeys = useMemo(() => {
    if (!def) return [];
    return sectionKeys.filter((_, i) => !skip.hiddenSections.has(i));
  }, [def, sectionKeys, skip.hiddenSections]);

  // Wizard steps = applicable sections that still have at least one visible
  // field once field-level skip logic is applied.
  const stepKeys = useMemo(() => {
    if (!def) return [] as string[];
    return applicableSectionKeys.filter((k) => {
      const si = Number(k);
      const section = def.layout[si];
      return section?.groups.some((g) =>
        g.fields.some((f) => isFieldVisible(f, si, skip))
      );
    });
  }, [def, applicableSectionKeys, skip]);

  // Keep the current step in range as sections appear/disappear.
  useEffect(() => {
    if (currentStep > stepKeys.length - 1) {
      setCurrentStep(Math.max(0, stepKeys.length - 1));
    }
  }, [stepKeys.length, currentStep]);

  // Load MCCOD data when the Certified Cause of Death section becomes active
  const stepKeysStr = stepKeys.join(",");
  useEffect(() => {
    if (!def || mode !== "form" || dynamicFormStore.loadingMeta) return;
    const clampedStep = Math.min(currentStep, Math.max(0, stepKeys.length - 1));
    const activeStepKey = stepKeys[clampedStep];
    const computedActiveSi = activeStepKey != null ? Number(activeStepKey) : null;
    if (computedActiveSi == null) return;

    const sectionTitle = def.layout[computedActiveSi]?.title || "";
    if (
      sectionTitle.toUpperCase().includes("CERTIFIED CAUSE OF DEATH") ||
      sectionTitle.toUpperCase().includes("CASES OF DEATH") ||
      sectionTitle.toUpperCase().includes("CAUSE OF DEATH")
    ) {
      const caseNumber = form.getFieldValue(def.caseNumberField);
      if (caseNumber) {
        if (computedActiveSi === lastFetchedActiveSi && caseNumber === lastFetchedCase) {
          return;
        }
        setLastFetchedActiveSi(computedActiveSi);
        setLastFetchedCase(caseNumber);

        dynamicFormStore.fetchMccodEventForCase(def.caseNumberField, caseNumber).then((mccodValues) => {
          if (mccodValues && Object.keys(mccodValues).length > 0) {
            // Only overwrite fields that are currently empty to avoid wiping user input
            const currentValues = form.getFieldsValue();
            const updates: Record<string, any> = {};
            for (const key of Object.keys(mccodValues)) {
              if (!currentValues[key]) {
                updates[key] = mccodValues[key];
              }
            }
            if (Object.keys(updates).length > 0) {
              form.setFieldsValue(updates);
              setFormValues((prev: any) => ({ ...prev, ...updates }));
            }
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, stepKeysStr, def?.id, mode, dynamicFormStore.loadingMeta, form, lastFetchedActiveSi, lastFetchedCase]);

  if (!def) return null;

  // Coerce stored string dates into moments so the pickers hydrate correctly.
  const multiDes = useMemo(() => {
    const s = new Set<string>();
    def?.layout.forEach((sec) =>
      sec.groups.forEach((g) =>
        g.fields.forEach((f) => {
          if (f.multi) s.add(f.de);
        })
      )
    );
    return s;
  }, [def]);

  const hydrate = (values: Record<string, any>) => {
    const out: Record<string, any> = { ...values };
    Object.keys(out).forEach((de) => {
      const vt = dynamicFormStore.meta[de]?.valueType;
      if (multiDes.has(de)) {
        // Stored as comma-joined codes; the multi-select expects an array.
        out[de] =
          typeof out[de] === "string" && out[de]
            ? out[de].split(",").map((s: string) => s.trim()).filter(Boolean)
            : Array.isArray(out[de])
            ? out[de]
            : [];
      } else if (vt === "TIME" && out[de]) {
        out[de] = moment(out[de], "HH:mm");
      } else if (vt && DATE_TYPES.includes(vt) && out[de]) {
        out[de] = moment(out[de]);
      }
    });
    return out;
  };

  const openNew = async () => {
    if (!isFormContextReady(store)) {
      notification.warning({
        message: "Select organisation unit and nationality first",
        description:
          "Use the selectors above before creating a new record.",
        duration: 4,
      });
      return;
    }
    dynamicFormStore.startNew();
    setSavedOnce(false);
    setCurrentStep(0);
    // Seed the case number into the defaults so the hydration effect applies
    // it when the form mounts (rather than racing a direct setFieldsValue).
    const code = await dynamicFormStore.generateCaseNumber(def);
    dynamicFormStore.setDefaults(code ? { [def.caseNumberField]: code } : {});
    setFormKey((k) => k + 1);
    setMode("form");
  };

  const openEdit = (event: any) => {
    dynamicFormStore.loadEventForEdit(event);
    const hydrated = hydrate(dynamicFormStore.defaultValues);
    setFormValues(hydrated);
    setSavedOnce(true);
    setCurrentStep(0);
    setFormKey((k) => k + 1);
    setMode("form");
  };

  useEffect(() => {
    if (dynamicFormStore.pendingEditEvent && def) {
      const evt = dynamicFormStore.pendingEditEvent;
      runInAction(() => {
        dynamicFormStore.pendingEditEvent = null;
      });
      openEdit(evt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.activeFormId, def]);

  useEffect(() => {
    setDorisReport(dynamicFormStore.dorisReport || "");
  }, [dynamicFormStore.dorisReport, mode, formKey]);

  // Complete value set across all wizard steps: accumulated `formValues`
  // (survives step unmounts) overlaid with the live form store.
  const collectValues = () => ({ ...formValues, ...form.getFieldsValue(true) });

  const handleSave = async () => {
    const values = collectValues();
    // Don't persist answers to fields the skip logic has hidden — recompute
    // from the full value set (not the possibly-stale render state) and drop
    // every hidden field / field in a hidden section.
    const finalSkip = computeSkipState(
      def.id,
      def,
      values,
      dynamicFormStore.meta
    );
    const cleaned: Record<string, any> = { ...values };
    def.layout.forEach((sec, i) => {
      const sectionHidden = finalSkip.hiddenSections.has(i);
      sec.groups.forEach((g) =>
        g.fields.forEach((f) => {
          if (sectionHidden || finalSkip.hiddenFields.has(f.de))
            delete cleaned[f.de];
        })
      );
    });
    const ok = await dynamicFormStore.save(cleaned);
    if (ok) {
      setSavedOnce(true);
      setSaveTrigger((t) => t + 1);
      dynamicFormStore.loadRecords(def);
    }
  };

  const handleCertify = async () => {
    const values = collectValues();
    const link = dynamicFormStore.buildMccodLink(def, values);
    localStorage.setItem("mcodtemp", JSON.stringify(link));
    // Hand off to the legacy MCCOD records flow, which carries the full
    // prefill + underlying-cause logic (setNewFromLocalStorage moves pages).
    store.openModule("records");
    store.setNewFromLocalStorage(link);
    await store.fetchLocalStorageEvent();
  };

  const handleDoris = async () => {
    const values = collectValues();
    const updates = await dynamicFormStore.computeDoris(values);
    if (updates) form.setFieldsValue(updates);
  };

  const debouncedDorisFields = () => {
    if (dorisTimeoutRef.current) clearTimeout(dorisTimeoutRef.current);
    dorisTimeoutRef.current = setTimeout(() => {
      setDorisFields();
    }, 1500);
  };

  const setDorisFields = async () => {
    setComputingDoris(true);
    setDorisReport("");

    const intervalAType = form.getFieldValue("Ylht9kCLSRW");
    const intervalAVal = form.getFieldValue("WkXxkKEJLsg");
    const intervalA = (!!intervalAType && !!intervalAVal) ? moment.duration({ [intervalAType]: intervalAVal }).toISOString() : "";

    const intervalBType = form.getFieldValue("myydnkmLfhp");
    const intervalBVal = form.getFieldValue("fleGy9CvHYh");
    const intervalB = (!!intervalBType && !!intervalBVal) ? moment.duration({ [intervalBType]: intervalBVal }).toISOString() : "";

    const intervalCType = form.getFieldValue("aC64sB86ThG");
    const intervalCVal = form.getFieldValue("hO8No9fHVd2");
    const intervalC = (!!intervalCType && !!intervalCVal) ? moment.duration({ [intervalCType]: intervalCVal }).toISOString() : "";

    const intervalDType = form.getFieldValue("cmZrrHfTxW3");
    const intervalDVal = form.getFieldValue("eCVDO6lt4go");
    const intervalD = (!!intervalDType && !!intervalDVal) ? moment.duration({ [intervalDType]: intervalDVal }).toISOString() : "";

    const actualTimeOfDeath = form.getFieldValue("WzauwhVOwM0");
    const dateOfDeath = actualTimeOfDeath ? moment(actualTimeOfDeath) : null;
    const personsAge = form.getFieldValue("iJqBq0kQtWO");

    // Collect Other Significant Conditions (Part II) - codes joined by " / "
    const otherCodes = [
      form.getFieldValue("ctbKSNV2cg7") || "",  // Other 1 code
      form.getFieldValue("krhrEBwjENc") || "",  // Other 2 code
      form.getFieldValue("ZKtS7L49Poo") || "",  // Other 3 code
      form.getFieldValue("fJDDc9mlubU") || "",  // Other 4 code
      form.getFieldValue("z89Wr84V2G6") || "",  // Other 5 code
    ].filter(Boolean);

    const otherUris = [
      form.getFieldValue("T4uxg60LaIw") || "",  // Other 1 uri
    ].filter(Boolean);

    const payload: Record<string, string> = {
        sex: "2",
        estimatedAge: personsAge ? moment.duration({ years: personsAge }).toISOString() : "",
        causeOfDeathCodeA: form.getFieldValue("zD0E77W4rFs") || "",
        causeOfDeathCodeB: form.getFieldValue("tuMMQsGtE69") || "",
        causeOfDeathCodeC: form.getFieldValue("C8n6hBilwsX") || "",
        causeOfDeathCodeD: form.getFieldValue("IeS8V8Yf40N") || "",
        causeOfDeathCodePart2: otherCodes.join(" / "),
        causeOfDeathUriPart2: otherUris.join(" / "),
        intervalA,
        intervalB,
        intervalC,
        intervalD,
        dateBirth: "",
        dateDeath: dateOfDeath?.toISOString() ?? "",
        maternalDeathWasPregnant: "1",
        maternalDeathPregnancyContribute: "9", 
        timeFromPregnancy: "9",
    };

    if (!payload.causeOfDeathCodeA && !payload.causeOfDeathCodeB && !payload.causeOfDeathCodeC && !payload.causeOfDeathCodeD) {
      notification.warning({ message: "Enter at least one ICD-11 coded cause of death first." });
      setComputingDoris(false);
      return;
    }

    const burl = "https://ug.sk-engine.online";
    const url = burl + "/icd/release/11/2024-01/doris?" + new URLSearchParams(payload).toString();
    
    try {
        const res: any = await fetch(url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "API-Version": "v2",
                "Accept-Language": "en",
            }
        }).then((response) => {
            if (!response.ok) throw new Error("Doris API failed with status " + response.status);
            return response.json();
        });

        let title = "";
        if (res?.uri) {
          try {
            const uris = res.uri.split(" / ");
            const titlePromises = uris.map(async (u: string) => {
              const nameres: any = await fetch(
                u.replace("http://id.who.int", "https://ug.sk-engine.online"),
                {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/json",
                        "API-Version": "v2",
                        "Accept-Language": "en",
                    }
                }).then((response) => {
                    if (!response.ok) throw new Error("ICD API failed with status " + response.status);
                    return response.json();
                });
              return nameres?.title?.["@value"] || "";
            });
            const titles = await Promise.all(titlePromises);
            title = titles.filter(Boolean).join(" & ");
          } catch (e) {
            console.error("Failed to fetch title for URI:", res.uri);
          }
        }
        
        form.setFieldsValue({
            mQVAyOLbga1: title,
            n2mScmFMovq: res.code
        });

        setDorisValue({
            code: res.code,
            text: title
        });
        
        let reportText = res.report;
        if (!reportText && (res.error || res.warning)) {
            reportText = [
                res.error ? `Error: ${res.error}` : "",
                res.warning ? `Warning: ${res.warning}` : ""
            ].filter(Boolean).join("\n\n");
        }
        const finalReport = reportText || "No computation report available.";
        setDorisReport(finalReport);
        runInAction(() => {
          dynamicFormStore.dorisReport = finalReport;
        });
    } catch (error) {
        console.error("Failed to fetch Doris fields:", error);
        notification.error({ message: "Failed to compute underlying cause" });
    } finally {
        setComputingDoris(false);
    }
  };

  // Map an ISO gender letter to the sex data element's option code.
  const sexCodeFor = (letter: "M" | "F") => {
    const opts = dynamicFormStore.meta["e96GB4CXyd3"]?.options || [];
    const match = opts.find((o) =>
      letter === "M" ? /^male/i.test(o.name) : /^female/i.test(o.name)
    );
    return match?.code;
  };

  const prefillFromNin = async (nin: string) => {
    setNinLoading(true);
    try {
      const res: any = await ninapi.getNINPerson(nin);
      const info = res?.data;
      if (!info || info.error) {
        notification.error({
          message: "NIN not found",
          description:
            info?.error?.message ||
            "The NIN was not found. Double-check for mistakes.",
        });
        return;
      }
      const updates: Record<string, any> = {
        ZYKmQ9GPOaF: `${info.givenNames ?? ""} ${info.surname ?? ""}`.trim(),
        roxn33dtLLx: "true",
      };
      const sexCode =
        info.gender === "M"
          ? sexCodeFor("M")
          : info.gender === "F"
          ? sexCodeFor("F")
          : undefined;
      if (sexCode) updates.e96GB4CXyd3 = sexCode;
      if (info.dateOfBirth) {
        const dob = moment(info.dateOfBirth, "DD/MM/YYYY");
        if (dob.isValid()) {
          updates.RbrUuKFSqkZ = dob;
          updates.q7e7FOXKnOf = moment().diff(dob, "years");
        }
      }
      form.setFieldsValue(updates);
      setFormValues((prev) => ({ ...prev, ...updates }));
      notification.success({
        message: "Deceased details prefilled from NIN",
        duration: 3,
      });
    } catch (e) {
      console.log("prefillFromNin error", e);
      notification.error({ message: "Error fetching NIN information" });
    } finally {
      setNinLoading(false);
    }
  };

  const onValuesChange = (changed: Record<string, any>, allValues: Record<string, any>) => {
    // Accumulate rather than replace: fields from other wizard steps may be
    // unmounted and absent from `allValues`, and we must not lose their values.
    setFormValues((prev) => ({ ...prev, ...allValues }));
    const patch = applySkipEffects(
      changed,
      allValues,
      dynamicFormStore.meta,
      def.id
    );
    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
      setFormValues((prev) => ({ ...prev, ...allValues, ...patch }));
    }

    if (def.isMccod && def.ninField) {
      const nin = changed[def.ninField];
      if (
        typeof nin === "string" &&
        nin.length === 14 &&
        store.selectedNationality === UGANDAN
      ) {
        prefillFromNin(nin);
      }
    }

    const dorisFields = [
      "zD0E77W4rFs", "tuMMQsGtE69", "C8n6hBilwsX", "IeS8V8Yf40N", // codes A-D
      "ctbKSNV2cg7", "krhrEBwjENc", "ZKtS7L49Poo", "fJDDc9mlubU", "z89Wr84V2G6", // codes Other 1-5
      "Ylht9kCLSRW", "myydnkmLfhp", "aC64sB86ThG", "cmZrrHfTxW3", // interval types
      "WkXxkKEJLsg", "fleGy9CvHYh", "hO8No9fHVd2", "eCVDO6lt4go", // interval values
      "sfpqAeqKeyQ", "zb7uTuBCPrN", "QGFYJK00ES7", "CnPGhOcERFF", // cause text A-D
      "xeE5TQLvucB", "mI0UjQioE7E", "u5ebhwtAmpU", "OxJgcwH15L7", "Zrn8LD3LoKY" // cause text Other 1-5
    ];
    if (dorisFields.some((f) => f in changed)) {
      debouncedDorisFields();
    }
  };

  // Render the groups + fields of a single section (used by the wizard step).
  const renderSection = (si: number) => {
    const sectionTitle = def.layout[si].title;
    
    if (
      sectionTitle?.toUpperCase().includes("CERTIFIED CAUSE OF DEATH") ||
      sectionTitle?.toUpperCase().includes("CASES OF DEATH (FRAME A)") ||
      sectionTitle?.toUpperCase().includes("CAUSE OF DEATH (FRAME A)")
    ) {
       const allFields = def.layout[si].groups.flatMap(g => 
         Array.isArray(g) ? g : g.fields
       );
       
        return (
          <MccodTableSection 
            fields={allFields} 
            form={form} 
            locked={false}
            skipLogic={skip} 
            dorisReport={dorisReport}
            onSave={handleSave}
            saving={dynamicFormStore.saving}
            finalCauseOptions={finalCauseOptions}
            onComputeDoris={debouncedDorisFields}
            computingDoris={computingDoris}
            dorisValue={dorisValue}
            onSelectUnderlyingCause={(text, code) => {
              form.setFieldsValue({ mQVAyOLbga1: text, n2mScmFMovq: code });
              setFormValues((prev) => ({ ...prev, mQVAyOLbga1: text, n2mScmFMovq: code }));
            }}
            onIcdSelect={(selectedEntity) => {
              const all = { ...formValues, ...form.getFieldsValue(true) };
              setFormValues(all);
              debouncedDorisFields();
            }}
          />
        );
    }

    return def.layout[si].groups.map((group, gi) => {
      const groupFields = group.fields.filter((f) => isFieldVisible(f, si, skip));
      if (!groupFields.length) return null;
      return (
        <div className="dform-group" key={gi}>
          {group.label && <div className="dform-group-label">{group.label}</div>}
          <Row gutter={[14, 4]}>
            {groupFields.map((field) => {
              const locked = isFieldDisabled(field, skip) || !!field.readOnly;
              const fieldHint = skip.hints[field.de] || field.hint;
              return field.icd ? (
                <Col key={field.de} xs={24} {...fieldSpan(field)}>
                  <div
                    className={`dform-item dform-icd${locked ? " dform-item-locked" : ""}`}
                  >
                    <label className="dform-icd-label">{field.label}</label>
                    {fieldHint && (
                      <span className="dform-field-hint">{fieldHint}</span>
                    )}
                    <FieldWidget
                      field={field}
                      form={form}
                      disabled={locked}
                      hint={fieldHint}
                    />
                  </div>
                </Col>
              ) : (
                <Col key={field.de} xs={24} {...fieldSpan(field)} style={{ display: field.de === "ZkNDFfFSTYg" ? "none" : undefined }}>
                  <Form.Item
                    name={field.de}
                    label={field.label}
                    valuePropName={valuePropName(field)}
                    help={fieldHint}
                    className={`dform-item${locked ? " dform-item-locked" : ""}`}
                  >
                      {field.de === "n2mScmFMovq" ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <FieldWidget field={field} form={form} disabled={locked} hint={fieldHint} />
                          </div>
                          <DorisReportModal report={dorisReport} />
                        </div>
                      ) : field.de === "mQVAyOLbga1" ? (
                      <div>
                        <Select
                          disabled={locked}
                          style={{ width: "100%" }}
                          optionLabelProp="label"
                          placeholder="Select or compute underlying cause"
                          onChange={(val: any) => {
                            const code = Object.keys(finalCauseOptions).find(k => (finalCauseOptions as any)[k] === val);
                            form.setFieldsValue({ mQVAyOLbga1: val, n2mScmFMovq: code });
                          }}
                        >
                          {Object.entries(finalCauseOptions).map(([code, text]) => {
                            const cleanCode = code.startsWith("_") ? "" : code;
                            const dorisCodes = dorisValue?.code
                              ? dorisValue.code.split("/").map((c: string) => c.trim())
                              : [];
                            const isRecommended = cleanCode ? dorisCodes.includes(cleanCode) : false;
                            const labelText = cleanCode ? `${text} (${cleanCode})` : text as string;
                            const fullDescription = `${text}${cleanCode ? ` — Code: ${cleanCode}` : ""}`;
                            return (
                              <Select.Option
                                key={code}
                                value={text as string}
                                label={labelText}
                                title={fullDescription}
                              >
                                <div
                                  title={fullDescription}
                                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", whiteSpace: "normal", lineHeight: "1.4" }}
                                >
                                  {isRecommended && (
                                    <span style={{ background: "#1677ff", color: "#fff", borderRadius: 3, padding: "1px 5px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                      ★ DORIS
                                    </span>
                                  )}
                                  <span>
                                    {text as string}
                                    {cleanCode && (
                                      <span style={{ color: "#888", marginLeft: 4, fontSize: 12 }}>({cleanCode})</span>
                                    )}
                                  </span>
                                </div>
                              </Select.Option>
                            );
                          })}
                        </Select>
                        {dorisValue?.code && (
                          <div style={{ marginTop: 6, fontSize: "12px", background: "#e6f7ff", border: "1px solid #91d5ff", padding: "5px 10px", borderRadius: "4px", color: "#0050b3" }}>
                            💡 WHO DORIS recommends selecting the <strong>★ DORIS</strong> marked option above as the underlying cause.
                          </div>
                        )}
                      </div>
                    ) : (
                      <FieldWidget
                        field={field}
                        form={form}
                        disabled={locked}
                        hint={fieldHint}
                      />
                    )}
                  </Form.Item>
                </Col>
              );
            })}
          </Row>
        </div>
      );
    });
  };

  const clampedStep = Math.min(currentStep, Math.max(0, stepKeys.length - 1));
  const activeStepKey = stepKeys[clampedStep];
  const activeSi = activeStepKey != null ? Number(activeStepKey) : null;
  const isLastStep = clampedStep >= stepKeys.length - 1;
  const activeVisibleCount =
    activeSi != null
      ? def.layout[activeSi].groups.reduce(
          (n, g) => n + g.fields.filter((f) => isFieldVisible(f, activeSi, skip)).length,
          0
        )
      : 0;
  const nextTitle =
    !isLastStep && stepKeys[clampedStep + 1] != null
      ? def.layout[Number(stepKeys[clampedStep + 1])].title
      : "";

  return (
    <div className="dform-wrap" ref={wrapRef}>
      <div className="dform-hero" ref={heroRef} style={{ background: def.color }}>
        <div className="dform-hero-head">
          <div className="dform-crumb">
            <button className="dform-link" onClick={store.goHome}>
              ← All forms
            </button>
            <span className="dform-sep">/</span>
            <span className="dform-hero-name">{def.title}</span>
          </div>
          <FormContextBar hero />
        </div>
      </div>

      {def.placeholder && (
        <div className="dform-note">
          This form is scaffolded with placeholder data elements. I will map the{" "}
          <code>CDR_*</code> fields to real DHIS2 data element UIDs to enable
          saving.
        </div>
      )}

      {mode === "list" ? (
        <>
          <RecordList
            def={def}
            onNew={openNew}
            onView={setDetailRecord}
            onEdit={openEdit}
          />
          <RecordDetail
            def={def}
            record={detailRecord}
            onClose={() => setDetailRecord(null)}
            onEdit={(r) => {
              setDetailRecord(null);
              openEdit(r);
            }}
          />
        </>
      ) : (
      <>
      <div className="dform-wizard-top">
        <Button size="small" onClick={() => setMode("list")}>
          ← Records
        </Button>
        <span className="dform-toolbar-title">
          {dynamicFormStore.currentEvent ? "Editing record" : "New record"}
        </span>
        <span className="dform-step-counter">
          Step {stepKeys.length ? clampedStep + 1 : 0} of {stepKeys.length}
        </span>
      </div>

      <Progress
        percent={stepKeys.length ? ((clampedStep + 1) / stepKeys.length) * 100 : 0}
        showInfo={false}
        strokeColor={def.accent}
        className="dform-progress"
      />

      <div className="dform-shell">
        <aside className={`dform-side${sidebarCollapsed ? " dform-side--collapsed" : ""}`}>
          <button
            type="button"
            className="dform-side-toggle"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
          <div className="dform-stepper">
            {stepKeys.map((k, i) => {
              const si = Number(k);
              const done = i < clampedStep;
              const active = i === clampedStep;
              return (
                <button
                  key={k}
                  type="button"
                  className={`dform-step${active ? " is-active" : ""}${
                    done ? " is-done" : ""
                  }`}
                  onClick={() => { setCurrentStep(i); setSidebarCollapsed(false); }}
                  style={active ? { borderColor: def.accent } : undefined}
                  title={def.layout[si].title}
                >
                  <span
                    className="dform-step-idx"
                    style={
                      active || done ? { background: def.accent } : undefined
                    }
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="dform-step-name">
                    {def.layout[si].title}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="dform-main">
          {clampedStep === 0 && (
            <div className="dform-guide">
              <strong>How this form works</strong>
              <span>
                Answer one section at a time. Later steps and questions appear
                based on your answers (sex, age, yes/no choices, cause-of-death
                chain), so you only ever see what applies to this death.
              </span>
            </div>
          )}

          {(() => {
            const resolvedCaseNumber =
              (def?.caseNumberField ? form.getFieldValue(def.caseNumberField) : "") ||
              (def?.caseNumberField ? formValues[def.caseNumberField] : "") ||
              (def?.caseNumberField ? dynamicFormStore.defaultValues?.[def.caseNumberField] : "") ||
              (def?.caseNumberField && dynamicFormStore.currentEvent ? dynamicFormStore.recordValue(dynamicFormStore.currentEvent, def.caseNumberField) : "");

            return (
              <>
                {!def.isMccod && def.caseNumberField && (
                  <MccodLinkageBanner
                    caseNumber={resolvedCaseNumber}
                    caseNumberFieldUid={def.caseNumberField}
                    onOpenMccod={() => store.openModule("mccod")}
                    saveTrigger={saveTrigger}
                  />
                )}

                {def.isMccod && def.caseNumberField && (
                  <MccodToMaternalLinkageBanner
                    caseNumber={resolvedCaseNumber}
                  />
                )}

                <Spin spinning={dynamicFormStore.loadingMeta || ninLoading}>
                  <Form
                    form={form}
                    layout="vertical"
                    onValuesChange={onValuesChange}
                    initialValues={hydrate(dynamicFormStore.defaultValues)}
                  >
                    {activeSi != null ? (
                      <div className="dform-active-section">
                        <div className="dform-active-head">
                          <span className="dform-active-title">
                            {def.layout[activeSi].title}
                            {def.layout[activeSi].title.toUpperCase().includes("CERTIFIED CAUSE OF DEATH") && !def.isMccod && (
                              <>
                                <Popover
                                  title="Background Data Sync Mapping"
                                  trigger="hover"
                                  content={
                                    <div style={{ maxWidth: 900, maxHeight: 400, overflowY: "auto" }}>
                                      <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 8 }}>
                                        These fields from earlier sections will be synced to the MCCOD event upon saving:
                                      </p>
                                      <Table
                                        size="small"
                                        pagination={false}
                                        columns={[
                                          { title: "Field name on form", dataIndex: "fieldName", key: "fieldName" },
                                          { title: `DE_ID in ${def.title}`, dataIndex: "matId", key: "matId" },
                                          { title: `Value in ${def.title}`, dataIndex: "matVal", key: "matVal" },
                                          { title: "DE_Name in MCCOD", dataIndex: "mccodName", key: "mccodName" },
                                          { title: "DE_ID in MCCOD", dataIndex: "mccodId", key: "mccodId" },
                                          { title: "Value in MCCOD", dataIndex: "mccodVal", key: "mccodVal" },
                                        ]}
                                        dataSource={[
                                          ...Object.entries((def.key === "pdr" || def.title?.toLowerCase().includes("perinatal")) ? PERINATAL_TO_MCCOD_MAP : (def.key === "cdr" || def.title?.toLowerCase().includes("child")) ? CDR_TO_MCCOD_MAP : MATERNAL_TO_MCCOD_MAP).map(([src, dest]) => {
                                            const val = form.getFieldValue(src);
                                            const srcMeta = dynamicFormStore.meta[src];
                                            const destMeta = dynamicFormStore.meta[dest];
                                            const displayVal = val !== undefined && val !== null && val !== "" ? String(val) : <em style={{color: "#aaa"}}>(empty)</em>;

                                            let fieldName = srcMeta ? srcMeta.name : src;
                                            for (const sec of def.layout) {
                                              for (const group of sec.groups) {
                                                const found = group.fields.find((f: any) => f.de === src);
                                                if (found && found.label) {
                                                  fieldName = found.label;
                                                  break;
                                                }
                                              }
                                            }

                                            let mccodName = destMeta ? destMeta.name : dest;
                                            const mccodDef = getFormDefinition("mccod");
                                            if (mccodDef) {
                                              for (const sec of mccodDef.layout) {
                                                for (const group of sec.groups) {
                                                  const found = group.fields.find((f: any) => f.de === dest);
                                                  if (found && found.label) {
                                                    mccodName = found.label;
                                                    break;
                                                  }
                                                }
                                              }
                                            }

                                            return {
                                              key: src,
                                              fieldName,
                                              matId: src,
                                              matVal: displayVal,
                                              mccodName,
                                              mccodId: dest,
                                              mccodVal: displayVal,
                                            };
                                          }),
                                          ...def.layout[activeSi].groups.flatMap(g => g.fields).filter(f => f.de !== "ZkNDFfFSTYg").map(f => {
                                            const val = form.getFieldValue(f.de);
                                            const meta = dynamicFormStore.meta[f.de];
                                            const displayVal = val !== undefined && val !== null && val !== "" ? String(val) : <em style={{color: "#aaa"}}>(empty)</em>;
                                            return {
                                              key: f.de,
                                              fieldName: f.label,
                                              matId: f.de,
                                              matVal: displayVal,
                                              mccodName: meta ? meta.name : f.de,
                                              mccodId: f.de,
                                              mccodVal: displayVal,
                                            };
                                          })
                                        ]}
                                      />
                                    </div>
                                  }
                                >
                                  <InfoCircleOutlined style={{ marginLeft: 12, color: "#1890ff", cursor: "pointer", fontSize: "16px" }} />
                                </Popover>
                              </>
                            )}
                            {resolvedCaseNumber && (
                              <span style={{ marginLeft: 16, fontSize: "0.85em", opacity: 0.8, fontWeight: "normal" }}>
                                 Case Number: {resolvedCaseNumber}
                              </span>
                            )}
                          </span>
                          <span className="dform-section-count">
                            {activeVisibleCount} question
                            {activeVisibleCount === 1 ? "" : "s"}
                          </span>
                        </div>
                        {renderSection(activeSi)}
                      </div>
                    ) : (
                      <Empty description="No applicable questions for this record yet." />
                    )}
                  </Form>
                </Spin>
              </>
            );
          })()}

          {activeSi != null &&
            (def.layout[activeSi]?.title?.toUpperCase().includes("CAUSE OF DEATH") ||
             def.layout[activeSi]?.title?.toUpperCase().includes("CASES OF DEATH")) &&
            dynamicFormStore.dorisReport && (
              <div className="dform-doris-report">
                <strong>WHO DORIS report</strong>
                <pre>{dynamicFormStore.dorisReport}</pre>
              </div>
            )}
        </div>
      </div>

      <div className="dform-actions">
        <Button
          onClick={() =>
            clampedStep === 0 ? setMode("list") : setCurrentStep((s) => s - 1)
          }
        >
          {clampedStep === 0 ? "← Records" : "← Back"}
        </Button>
        <div className="dform-actions-right">
          {isLastStep ? (
            <>
              {!def.isMccod && savedOnce && (
                <Button onClick={handleCertify} className="dform-certify">
                  Certify Cause of Death (ICD-11)
                </Button>
              )}
              <Button
                type="primary"
                loading={dynamicFormStore.saving}
                onClick={handleSave}
                disabled={def.placeholder && !dynamicFormStore.program}
              >
                Save {def.title}
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              onClick={() =>
                setCurrentStep((s) => Math.min(s + 1, stepKeys.length - 1))
              }
            >
              {nextTitle ? `Next: ${nextTitle} →` : "Next →"}
            </Button>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
});
