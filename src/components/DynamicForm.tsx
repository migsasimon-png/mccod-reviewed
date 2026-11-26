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
  Alert,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  notification,
  Popover,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  TimePicker,
} from "antd";
import { useStore } from "../Context";
import { isTicked, matchOptionCode } from "../forms/legacyValues";
import { dynamicFormStore, MATERNAL_TO_MCCOD_MAP, CDR_TO_MCCOD_MAP, PERINATAL_TO_MCCOD_MAP } from "../forms/DynamicFormStore";
import { getFormDefinition, CASE_NUMBER_DE } from "../forms/registry";
import { answered, childDateOfDeath, childDerivedValues, childFieldsForDisplay, extendChildLayout, formatFacilityStay, isChildReviewOverdue, isPendingChildField } from "../forms/childReview";
import { FormField, FormGroup, ListColumn } from "../forms/types";
import { confirmFlags, flagsByField, mustCorrectFlags, validateReviewForm } from "../forms/reviewValidation";
import { isMappedPendingDe, toDhis2DeId } from "../forms/pendingDataElements";
import {
  applySkipEffects,
  computeSkipState,
  emptySkipState,
  isFieldDisabled,
  isFieldVisible,
  MDR_ADMISSION,
  MDR_DEATH,
  MDR_STAY,
  stayDuration,
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

const normalizeNin = (value: unknown) => typeof value === "string" ? value.trim().toUpperCase() : "";
const reviewNinFields = { mdr: "CupbOInqvJI", pdr: "NEW_pdr_mother_nin" };
interface NiraPerson {
  givenNames?: string;
  surname?: string;
  dateOfBirth?: string;
  gender?: string;
  error?: { code?: string | number };
}
interface NiraResidence {
  address?: { village?: string; parish?: string; subCounty?: string; district?: string };
  error?: unknown;
}

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

/**
 * Drop-downs and pickers render their popup inside the field's own column.
 * Without this, antd appends the popup to <body> and, inside the scrolling
 * form, it can open at the top of the page or below the visible area.
 */
const popupAtField = (node: HTMLElement) => node.parentElement ?? document.body;

/** MCCOD usual-residence drop-downs (values are stored by organisation-unit display name). */
const RESIDENCE = {
  region: "zwKo51BEayZ",
  district: "u44XP9fZweA",
  subcounty: "t5nTEmlScSt",
};

/** Sub-counties (level 5) under a district, including those nested under a level-4 unit. */
const subcountyChoices = (data: any) => {
  const children: any[] = data?.children ?? [];
  let units = children.filter((c) => c.level === 5);
  if (!units.length) {
    children
      .filter((c) => c.level === 4)
      .forEach((unit) => {
        units = [...units, ...(unit.children ?? []).filter((c: any) => c.level === 5)];
      });
  }
  return units.map((u) => ({ code: u.displayName, name: u.displayName }));
};

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
    if (dynamicFormStore.activeForm?.id === "cdr" && field.de === dynamicFormStore.childFieldIds.stay) {
      const minutes = Number(rest.value);
      const text = answered(rest.value) && Number.isInteger(minutes) && minutes >= 0
        ? formatFacilityStay(minutes)
        : "Unknown";
      return <Input id={rest.id} value={text} readOnly />;
    }

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

    if (field.widget === "yesNoCheck") {
      const yes = /^yes$/i.test(String(rest.value ?? ""));
      const no = /^no$/i.test(String(rest.value ?? ""));
      return (
        <Space size="large">
          <Checkbox
            disabled={disabled}
            checked={yes}
            onChange={(e) => rest.onChange?.(e.target.checked ? "Yes" : null)}
          >
            Yes
          </Checkbox>
          <Checkbox
            disabled={disabled}
            checked={no}
            onChange={(e) => rest.onChange?.(e.target.checked ? "No" : null)}
          >
            No
          </Checkbox>
        </Space>
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

    // Retired choices stay out of the list (a saved record still shows its own).
    if (options && field.hideOptions?.length) {
      const live = new Set((meta?.options || []).map((o) => o.code));
      const ready = !field.hideOptionsWhen || field.hideOptionsWhen.every((code) => live.has(code));
      if (ready) {
        const current = rest.value == null ? "" : String(rest.value);
        options = options.filter((o) => !field.hideOptions!.includes(o.code) || o.code === current);
      }
    }

    // July 2024 paper: ANC "Unknown" → "Records not available"
    if (options && options.length && field.de === "QidQVyBFspW") {
      options = options.map((o) =>
        /^unknown$/i.test(o.name || "")
          ? { ...o, name: "Records not available" }
          : o
      );
    }

    // A layout-declared choice list stays a drop-down even while it is empty
    // (cascading pickers fill it once their parent value is chosen).
    if (options && (options.length || field.options)) {
      const isYesNoOptions =
        options.length >= 2 &&
        options.length <= 4 &&
        options.every((o) => {
          const lower = o.name?.trim().toLowerCase() || "";
          return [
            "yes",
            "no",
            "y",
            "n",
            "true",
            "false",
            "unknown",
            "records not available",
            "don't know",
            "not known",
            "n/a",
            "not applicable",
            "none",
          ].includes(lower);
        });

      if (isYesNoOptions && !field.multi) {
        return (
          <Radio.Group {...rest} disabled={disabled} style={{ width: "100%" }}>
            {options.map((o) => (
              <Radio key={o.code} value={o.code}>
                {o.name}
              </Radio>
            ))}
          </Radio.Group>
        );
      }

      return (
        <Select
          {...rest}
          mode={field.multi ? "multiple" : undefined}
          size="middle"
          getPopupContainer={popupAtField}
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
        <Radio.Group {...rest} disabled={disabled} style={{ width: "100%" }}>
          <Radio value="true">Yes</Radio>
          <Radio value="false">No</Radio>
        </Radio.Group>
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
        <DatePicker
          {...rest}
          size="middle"
          disabled={disabled}
          getPopupContainer={popupAtField}
          style={{ width: "100%" }}
          disabledDate={(current) => !field.allowFuture && !!current && current.isAfter(moment(), "day")}
        />
      );
    }
    if (vt === "DATETIME") {
      return (
        <DatePicker
          {...rest}
          size="middle"
          showTime
          disabled={disabled}
          getPopupContainer={popupAtField}
          style={{ width: "100%" }}
          disabledDate={(current) => !field.allowFuture && !!current && current.isAfter(moment(), "day")}
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
          getPopupContainer={popupAtField}
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
    if (vt === "LONG_TEXT" || (isPendingChildField(field.de) && !field.de.endsWith("Nin"))) {
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
  if (isPendingChildField(field.de)) return { sm: 24, lg: 24 };
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
  if (vt === "TRUE_ONLY") return isTicked(raw) ? "Yes" : "No";
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
  if (vt === "TRUE_ONLY") return isTicked(raw) ? "Yes" : "No";
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
  const overdueReviews = def.id === "cdr"
    ? new Set(rows.filter((record) => isChildReviewOverdue(
        record.status,
        dynamicFormStore.recordValue(record, childDateOfDeath)
      )).map((record) => record.event))
    : new Set();

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
      if (col.type === "reviewStatus") {
        if (r.status === "COMPLETED") return <Tag color="green">Completed</Tag>;
        if (overdueReviews.has(r.event)) return <Tag color="red">Overdue</Tag>;
        if (r.status === "ACTIVE") return <Tag color="blue">In progress</Tag>;
        return r.status || "—";
      }
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
        const isCertified = def.id === "pdr" ? isRealUid : Boolean(isRealUid || finalCause || causeA);

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
      {store.selectedOrgUnit && overdueReviews.size > 0 && (
        <p role="status">
          {overdueReviews.size} {overdueReviews.size === 1 ? "listed review is" : "listed reviews are"} past the seven-day deadline from the date of death.
        </p>
      )}
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
              dynamicFormStore.recordLoadError || (store.selectedOrgUnit
                ? rows.length > 0
                  ? "No matching case numbers found."
                  : "No records yet — create the first one."
                : "No facility selected.")
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
  const baseDef = store.activeFormId ? getFormDefinition(store.activeFormId) : null;
  const childFieldIds = dynamicFormStore.childFieldIds;
  const def = useMemo(
    () => baseDef?.id === "cdr" ? extendChildLayout(baseDef, childFieldIds) : baseDef,
    [baseDef, childFieldIds]
  );
  const [ninLoading, setNinLoading] = useState(false);
  const ninRequests = useRef(new Map<string, symbol>());
  const ninTokenRequest = useRef<Promise<void> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});



  const [currentStep, setCurrentStep] = useState(0);
  const [savedOnce, setSavedOnce] = useState(false);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [formKey, setFormKey] = useState(0);
  const hydratedForm = useRef<{ id: string; key: number } | null>(null);
  const perinatalDraftKey = useRef<string | null>(null);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [detailRecord, setDetailRecord] = useState<any | null>(null);

  const [dorisValue, setDorisValue] = useState<any>({});
  const [dorisReport, setDorisReport] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [computingDoris, setComputingDoris] = useState(false);
  const dorisTimeoutRef = useRef<any>(null);
  const [lastFetchedActiveSi, setLastFetchedActiveSi] = useState<number | null>(null);
  const [lastFetchedCase, setLastFetchedCase] = useState<string | null>(null);

  useEffect(() => () => {
    if (dorisTimeoutRef.current) clearTimeout(dorisTimeoutRef.current);
  }, [baseDef]);

  const finalCauseOptions = useMemo(() => {
    const opts: Record<string, string> = {};

    // Already-selected final underlying cause (persisted value)
    const manualText = formValues["mQVAyOLbga1"];
    const manualCode = formValues["n2mScmFMovq"];
    if (manualCode) opts[manualCode] = manualText || manualCode;
    else if (manualText) opts[`_manual_${manualText}`] = manualText;

    // Row a — cause text: sfpqAeqKeyQ, code: Ylht9kCLSRW
    const causeA_text = formValues["sfpqAeqKeyQ"];
    const causeA_code = formValues[def?.id === "cdr" ? "zD0E77W4rFs" : "Ylht9kCLSRW"];
    if (causeA_text) opts[causeA_code || `_a_${causeA_text}`] = causeA_text;

    // Row b — cause text: zb7uTuBCPrN, code: myydnkmLfhp
    const causeB_text = formValues["zb7uTuBCPrN"];
    const causeB_code = formValues[def?.id === "cdr" ? "tuMMQsGtE69" : "myydnkmLfhp"];
    if (causeB_text) opts[causeB_code || `_b_${causeB_text}`] = causeB_text;

    // Row c — cause text: QGFYJK00ES7, code: aC64sB86ThG
    const causeC_text = formValues["QGFYJK00ES7"];
    const causeC_code = formValues[def?.id === "cdr" ? "C8n6hBilwsX" : "aC64sB86ThG"];
    if (causeC_text) opts[causeC_code || `_c_${causeC_text}`] = causeC_text;

    // Row d — cause text: CnPGhOcERFF, code: cmZrrHfTxW3
    const causeD_text = formValues["CnPGhOcERFF"];
    const causeD_code = formValues[def?.id === "cdr" ? "IeS8V8Yf40N" : "cmZrrHfTxW3"];
    if (causeD_text) opts[causeD_code || `_d_${causeD_text}`] = causeD_text;

    // NOTE: dorisValue is intentionally NOT added here as a separate option.
    // DORIS may return a combined postcoordinated code (e.g. "JB63.Z/1C12.Y")
    // that doesn't correspond to any single cause the doctor entered.
    // Instead, MccodTableSection highlights the matching existing entry.

    return opts;
  }, [formValues, dorisValue, def?.id]);


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
    if (!baseDef) return;
    hydratedForm.current = null;
    perinatalDraftKey.current = null;
    setCurrentStep(0);
    setSavedOnce(false);
    setMode("list");
    (async () => {
      await dynamicFormStore.openForm(baseDef);
      await dynamicFormStore.loadRecords(baseDef);
    })();
  }, [baseDef]);

  // MCCOD residence drop-downs. Options come from the organisation-unit
  // hierarchy and are re-applied after each metadata load.
  const residenceCache = useRef({
    regionsReady: false,
    districtsByRegion: new Map<string, any[]>(),
    districtIds: new Map<string, string>(),
    subcounties: new Map<string, { code: string; name: string }[]>(),
  });
  const [residenceReady, setResidenceReady] = useState(false);
  const residenceRegion = formValues[RESIDENCE.region];
  const residenceDistrict = formValues[RESIDENCE.district];
  const metaLoading = dynamicFormStore.loadingMeta;
  const isMccod = def?.id === "mccod";

  useEffect(() => {
    if (!isMccod || metaLoading) return;
    let cancelled = false;
    (async () => {
      const cache = residenceCache.current;
      if (!cache.regionsReady) {
        const res: any = await store.getRegions();
        if (cancelled || !res?.organisationUnits) return;
        (res.organisationUnits as any[]).forEach((region) => {
          cache.districtsByRegion.set(region.displayName, region.children || []);
          (region.children || []).forEach((d: any) => cache.districtIds.set(d.displayName, d.id));
        });
        cache.regionsReady = true;
      }
      if (cancelled) return;
      dynamicFormStore.setFieldOptions(
        RESIDENCE.region,
        Array.from(cache.districtsByRegion.keys()).map((name) => ({ code: name, name }))
      );
      setResidenceReady(true);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isMccod, metaLoading, store]);

  useEffect(() => {
    if (!isMccod || metaLoading || !residenceReady) return;
    const districts = residenceCache.current.districtsByRegion.get(residenceRegion) ?? [];
    dynamicFormStore.setFieldOptions(
      RESIDENCE.district,
      districts.map((d: any) => ({ code: d.displayName, name: d.displayName }))
    );
  }, [isMccod, metaLoading, residenceReady, residenceRegion]);

  useEffect(() => {
    if (!isMccod || metaLoading || !residenceReady) return;
    const cache = residenceCache.current;
    const districtId = residenceDistrict ? cache.districtIds.get(residenceDistrict) : undefined;
    if (!districtId) {
      dynamicFormStore.setFieldOptions(RESIDENCE.subcounty, []);
      return;
    }
    let cancelled = false;
    (async () => {
      let options = cache.subcounties.get(districtId);
      if (!options) {
        const data: any = await store.engine.link.fetch(
          `/api/organisationUnits/${districtId}?paging=false&fields=level,id,children[id,displayName,level,children[id,displayName,level]]`
        );
        options = subcountyChoices(data);
        cache.subcounties.set(districtId, options);
      }
      if (!cancelled) dynamicFormStore.setFieldOptions(RESIDENCE.subcounty, options);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isMccod, metaLoading, residenceReady, residenceDistrict]);

  // Reload records whenever the selected org unit changes.
  useEffect(() => {
    if (def && mode === "list") dynamicFormStore.loadRecords(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedOrgUnit]);

  useEffect(() => {
    const requests = ninRequests.current;
    requests.clear();
    setNinLoading(false);
    return () => requests.clear();
  }, [baseDef, formKey, mode]);



  // Hydrate the form from the record's stored values whenever we enter form
  // mode (new or edit). Pushing values into the form store — not just relying
  // on initialValues — is what makes fields on later wizard steps (which mount
  // after the Form) show their saved data, and clears stale values between
  // records.
  useEffect(() => {
    if (mode !== "form" || dynamicFormStore.loadingMeta || !def) return;
    if (def.id === "pdr") {
      if (hydratedForm.current?.id === def.id && hydratedForm.current.key === formKey) return;
      hydratedForm.current = { id: def.id, key: formKey };
    }
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
    form.resetFields();
    form.setFieldsValue(hydrated);
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
      dynamicFormStore.meta,
      childFieldIds
    );
  }, [def, formValues, dynamicFormStore.meta, childFieldIds]);

  // Live red flags: shown on the field as soon as a value is out of range.
  const reviewFlags = useMemo(
    () => (def && (def.id === "mdr" || def.id === "pdr")
      ? validateReviewForm(def.id, formValues, dynamicFormStore.meta, skip.hiddenFields)
      : []),
    [def, formValues, dynamicFormStore.meta, skip]
  );
  const flagMap = useMemo(() => flagsByField(reviewFlags), [reviewFlags]);

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
            const currentValues = form.getFieldsValue(true);
            const certificateFields = def.id === "pdr" ? new Set(
              def.layout.filter(({ title }) => /^ICD-11 certificate details$|^CERTIFIED CAUSE OF DEATH/i.test(title))
                .flatMap(({ groups }) => groups.flatMap(({ fields }) =>
                  fields.flatMap(({ de, codeField, uriField }) => [de, codeField, uriField])))
            ) : null;
            const updates: Record<string, any> = {};
            for (const key of Object.keys(mccodValues)) {
              if ((!certificateFields || certificateFields.has(key)) && !answered(currentValues[key])) {
                updates[key] = hydrate({ [key]: mccodValues[key] })[key];
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
        out[de] = def?.id === "cdr" ? moment(out[de], ["HH:mm:ss", "HH:mm"], true) : moment(out[de], "HH:mm");
      } else if (vt === "TRUE_ONLY") {
        // Legacy records hold "true", "YES" or the answer text itself.
        out[de] = isTicked(out[de]);
      } else if (vt && DATE_TYPES.includes(vt) && out[de]) {
        out[de] = moment(out[de]);
      } else if (def?.id === "mccod" && typeof out[de] === "string") {
        // Older MCCOD answers differ in case ("YES") or wording ("true").
        const options = dynamicFormStore.meta[de]?.options;
        if (options?.length) out[de] = matchOptionCode(out[de], options);
      }
    });
    // A field that replaces an earlier true/false question shows the old answer as Yes/No.
    def?.layout.forEach((sec) =>
      sec.groups.forEach((g) =>
        g.fields.forEach((f) => {
          if (!f.legacyDe || answered(out[f.de]) || !answered(values[f.legacyDe])) return;
          const old = String(values[f.legacyDe]).trim().toLowerCase();
          if (/^(true|yes|1)$/.test(old)) out[f.de] = "Yes";
          else if (/^(false|no|0)$/.test(old)) out[f.de] = "No";
        })
      )
    );
    // Duration of stay is always derived from admission and death.
    if (def?.id === "mdr") {
      const stay = stayDuration(out[MDR_ADMISSION], out[MDR_DEATH]);
      if (stay) MDR_STAY.forEach((de, i) => { out[de] = stay[i]; });
    }
    return def?.id === "cdr" ? { ...out, ...childDerivedValues(out, childFieldIds) } : out;
  };

  const readPerinatalDraft = (orgUnit: string, event = "new"): Record<string, any> => {
    const user = store.user?.id;
    perinatalDraftKey.current = def.id === "pdr" && user && orgUnit
      ? `perinatal-review-draft:${user}:${orgUnit}:${event}` : null;
    const key = perinatalDraftKey.current;
    if (!key) return {};
    try {
      const saved = window.sessionStorage.getItem(key);
      if (!saved) return {};
      const draft = JSON.parse(saved);
      notification.info({ message: "Unsaved perinatal review restored" });
      return draft;
    } catch {
      return {};
    }
  };

  const rememberPerinatalDraft = (values: Record<string, any>) => {
    const key = perinatalDraftKey.current;
    if (!key) return;
    try {
      const snapshot = Object.fromEntries(Object.entries(values).map(([de, value]) => [
        de, moment.isMoment(value) && dynamicFormStore.meta[de]?.valueType === "TIME"
          ? value.format("HH:mm") : value ?? null,
      ]));
      window.sessionStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
      // The in-memory form still works when browser storage is unavailable.
    }
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
    const draft = readPerinatalDraft(store.selectedOrgUnit);
    setSavedOnce(false);
    setCurrentStep(0);
    // Seed the case number into the defaults so the hydration effect applies
    // it when the form mounts (rather than racing a direct setFieldsValue).
    const code = draft[def.caseNumberField] || await dynamicFormStore.generateCaseNumber(def);
    dynamicFormStore.setDefaults({ ...draft, ...(code ? { [def.caseNumberField]: code } : {}) });
    setFormKey((k) => k + 1);
    setMode("form");
  };

  const openEdit = (event: any) => {
    dynamicFormStore.loadEventForEdit(event);
    const draft = readPerinatalDraft(event.orgUnit || store.selectedOrgUnit, event.event);
    dynamicFormStore.setDefaults({ ...dynamicFormStore.defaultValues, ...draft });
    const hydrated = hydrate(dynamicFormStore.defaultValues);
    setFormValues(hydrated);
    setSavedOnce(def.id !== "cdr" || event.status === "COMPLETED");
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

  const saveChildReview = async (mode: "draft" | "complete") => {
    if (await dynamicFormStore.save(collectValues(), mode)) {
      const caseNumber = dynamicFormStore.recordValue(dynamicFormStore.currentEvent, def.caseNumberField);
      form.setFieldsValue({ [def.caseNumberField]: caseNumber });
      setFormValues((previous) => ({ ...previous, [def.caseNumberField]: caseNumber }));
      setSavedOnce(mode === "complete");
      setSaveTrigger((t) => t + 1);
      dynamicFormStore.loadRecords(def);
    }
  };

  /** Open the wizard step that holds a field (used to show a flagged value). */
  const goToField = (de: string) => {
    const section = def.layout.findIndex((sec) => sec.groups.some((g) => g.fields.some((f) => f.de === de)));
    const step = stepKeys.indexOf(String(section));
    if (step >= 0) setCurrentStep(step);
  };

  const handleSave = async () => {
    const values = collectValues();
    if (def.id === "cdr") {
      await saveChildReview("complete");
      return;
    }
    // Don't persist answers to fields the skip logic has hidden — recompute
    // from the full value set (not the possibly-stale render state) and drop
    // every hidden field / field in a hidden section.
    const finalSkip = computeSkipState(
      def.id,
      def,
      values,
      dynamicFormStore.meta
    );
    // Red flags: a must-correct value stops the save and jumps to its section;
    // an unusual value asks the reviewer to confirm.
    if (def.id === "mdr" || def.id === "pdr") {
      const flags = validateReviewForm(def.id, values, dynamicFormStore.meta, finalSkip.hiddenFields);
      const blockers = mustCorrectFlags(flags);
      if (blockers.length) {
        goToField(blockers[0].field);
        notification.error({
          message: "Correct the highlighted values before saving",
          description: blockers.map((f) => f.message).filter((m, i, all) => all.indexOf(m) === i).join(" "),
          duration: 6,
        });
        return;
      }
      const confirms = confirmFlags(flags);
      if (confirms.length) {
        const proceed = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: "Please confirm unusual values",
            content: (
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {confirms.map((f) => <li key={f.field + f.message}>{f.message}</li>)}
              </ul>
            ),
            okText: "Save anyway",
            cancelText: "Go back and check",
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (!proceed) {
          goToField(confirms[0].field);
          return;
        }
      }
    }
    // Skip logic closed these questions. Answers still on the record are left
    // alone; an answer cleared by skip logic is kept as an empty value so the
    // save removes it from DHIS2.
    const cleaned: Record<string, any> = { ...values };
    const isEmptyAnswer = (v: any) =>
      v === undefined || v === null || v === "" || v === false || (Array.isArray(v) && v.length === 0);
    def.layout.forEach((sec, i) => {
      const sectionHidden = finalSkip.hiddenSections.has(i);
      sec.groups.forEach((g) =>
        g.fields.forEach((f) => {
          if ((sectionHidden || finalSkip.hiddenFields.has(f.de)) && !isEmptyAnswer(cleaned[f.de]))
            delete cleaned[f.de];
        })
      );
    });
    const draftKey = perinatalDraftKey.current;
    let submittedDraft: string | null = null;
    try {
      if (draftKey) submittedDraft = window.sessionStorage.getItem(draftKey);
    } catch {}
    const ok = await dynamicFormStore.save(cleaned);
    if (ok) {
      if (def.id === "pdr") {
        const caseNumber = dynamicFormStore.recordValue(dynamicFormStore.currentEvent, def.caseNumberField);
        form.setFieldsValue({ [def.caseNumberField]: caseNumber });
        setFormValues((previous) => ({ ...previous, [def.caseNumberField]: caseNumber }));
      }
      try {
        if (draftKey && window.sessionStorage.getItem(draftKey) === submittedDraft) {
          window.sessionStorage.removeItem(draftKey);
        }
      } catch {}
      setSavedOnce(true);
      setSaveTrigger((t) => t + 1);
      dynamicFormStore.loadRecords(def);
    }
  };

  const handleCertify = async () => {
    const values = collectValues();
    if (def.id === "pdr") {
      if (await dynamicFormStore.save(values, "certify")) {
        const linked = dynamicFormStore.recordValue(dynamicFormStore.currentEvent, def.linkedField);
        form.setFieldsValue({ [def.linkedField]: linked });
        setFormValues((previous) => ({ ...previous, [def.linkedField]: linked }));
        void dynamicFormStore.loadRecords(def);
      }
      return;
    }
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
    if (def.id === "cdr") return;
    if (dorisTimeoutRef.current) clearTimeout(dorisTimeoutRef.current);
    dorisTimeoutRef.current = setTimeout(() => {
      setDorisFields();
    }, 1500);
  };

  const setDorisFields = async () => {
    if (def.id === "cdr" || dynamicFormStore.activeForm?.id !== def.id) return;
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

    const burl = "https://hmis-dev.health.go.ug";
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
                u.replace("http://id.who.int", "https://hmis-dev.health.go.ug"),
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
        
        if (dynamicFormStore.activeForm?.id !== def.id) return;
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

  const prefillFromNin = async (field: string, nin: string) => {
    const request = Symbol();
    ninRequests.current.set(field, request);
    const isCurrent = () => ninRequests.current.get(field) === request &&
      normalizeNin(form.getFieldValue(field)) === nin;
    setNinLoading(true);

    try {
      if (!store.apiStore.ninToken) {
        if (!ninTokenRequest.current) {
          ninTokenRequest.current = store.apiStore.fetchNINToken().finally(() => {
            ninTokenRequest.current = null;
          });
        }
        await ninTokenRequest.current;
      }
      if (!isCurrent()) return;
      const nextOfKin = def.id === "cdr" && field === childFieldsForDisplay(childFieldIds).nextOfKinNin;
      const [person, residence] = await Promise.allSettled([
        ninapi.getNINPerson(nin),
        nextOfKin ? Promise.resolve(undefined) : ninapi.getNINPlaceOfBirth(nin),
      ]);
      if (!isCurrent()) return;
      const info = person.status === "fulfilled" ? (person.value as { data?: NiraPerson })?.data : undefined;
      const location = residence.status === "fulfilled" ? (residence.value as { data?: NiraResidence })?.data : undefined;
      const address = location?.error ? undefined : location?.address;
      const values = form.getFieldsValue(true);
      const updates: Record<string, any> = {};
      const put = (de: string | undefined, value: unknown) => {
        if (!de || !answered(value)) return;
        const options = dynamicFormStore.meta[de]?.options;
        if (!options?.length) {
          updates[de] = value;
          return;
        }
        const key = String(value).trim().toLowerCase();
        const match = options.find(({ code, name }) =>
          String(code).toLowerCase() === key || String(name).trim().toLowerCase() === key);
        if (match) updates[de] = match.code;
      };
      if (info && !info.error) {
        const names = [info.givenNames, info.surname].filter(Boolean).join(" ").trim();
        const initials = names.split(/\s+/).filter(Boolean).map((name) => name[0].toUpperCase()).join("");
        const dob = moment(info.dateOfBirth, ["DD/MM/YYYY", "YYYY-MM-DD", moment.ISO_8601], true);
        const gender = String(info.gender || "").toUpperCase();
        const sex = gender === "M" || gender === "MALE" ? "Male" :
          gender === "F" || gender === "FEMALE" ? "Female" : undefined;
        const deathField = def.id === "mdr" ? "WzauwhVOwM0" : "i8rrl8YWxLF";
        const reference = (def.id === "mdr" || def.id === "mccod") && values[deathField]
          ? moment(values[deathField]) : moment();
        const age = dob.isValid() && reference.isValid() && !reference.isBefore(dob, "day")
          ? reference.diff(dob, "years") : undefined;
        if (def.id === "mccod") {
          // Name is held as parts; the joined full name is kept for lists/certificates.
          put("Q7VM7swIWb6", info.surname);
          put("QmcOqkcNTip", info.givenNames);
          put("ZYKmQ9GPOaF", names);
          put("e96GB4CXyd3", sex);
          if (age !== undefined) {
            updates.roxn33dtLLx = "Yes";
            updates.RbrUuKFSqkZ = dob;
            updates.q7e7FOXKnOf = age;
          }
        } else if (def.id === "mdr") {
          put("FIfoObQJvNp", initials);
          put("iJqBq0kQtWO", age);
        } else if (def.id === "pdr") {
          put("xpJgWYFpvht", initials);
          put("hTYVRRvhYEt", age);
        } else if (nextOfKin) {
          put("vY1rgZCGd2r", age);
        } else {
          put("GTI7EqoQokL", initials);
          put("Hq6GGFTlHHj", sex);
          if (age !== undefined && childFieldIds.birthDate) updates[childFieldIds.birthDate] = dob;
        }
      }

      if (address) {
        const addressFields = {
          // village, parish, subcounty, district (live DHIS2 names)
          mccod: ["dsiwvNQLe5n", "bNpMzyShDCX", "t5nTEmlScSt", "u44XP9fZweA"],
          mdr: ["hcu4LCAMSkz", undefined, "ioXkKfrgCJa", "FHmHV9mElbD"],
          pdr: ["T0f4UTwxd6Q", "dKQIx7sVFbD", "u44XP9fZweA", "t5nTEmlScSt"],
          cdr: ["FA5JmqKlrUT", "m2N3Ea9gdz6", "Q6LIN4M0CU2", "xv0FATnFVms"],
        }[def.id];
        const layoutFields = new Set(def.layout.flatMap((section) => section.groups.flatMap((group) => group.fields.map(({ de }) => de))));
        [address.village, address.parish, address.subCounty, address.district].forEach((value, index) => {
          const de = addressFields[index];
          if (de && layoutFields.has(de)) put(de, value);
        });
      }
      if (!Object.keys(updates).length) {
        if (person.status === "rejected") {
          const description = person.reason instanceof Error ? person.reason.message : undefined;
          notification.error({ message: "NIRA lookup failed", description });
        } else if (String(info?.error?.code) === "320") {
          notification.warning({ message: "NIRA could not find a record for this NIN" });
        } else if (info?.error) {
          notification.error({
            message: "NIRA rejected the lookup",
            description: info.error.code ? `NIRA error code: ${info.error.code}` : undefined,
          });
        } else {
          notification.warning({ message: "NIRA response contained no usable details for this form" });
        }
        return;
      }
      if (def.id === "cdr") Object.assign(updates, childDerivedValues({ ...values, ...updates }, childFieldIds));
      const patch = { [field]: nin, ...updates };
      form.setFieldsValue(patch);
      rememberPerinatalDraft({ ...form.getFieldsValue(true), ...patch });
      setFormValues((prev) => ({ ...prev, ...patch }));
      notification.success({ message: "Details filled from NIRA", duration: 3 });
    } catch {
      if (isCurrent()) notification.error({ message: "Could not fetch details from NIRA" });
    } finally {
      if (ninRequests.current.get(field) === request) {
        ninRequests.current.delete(field);
        setNinLoading(ninRequests.current.size > 0);
      }
    }
  };

  const onValuesChange = (changed: Record<string, any>, allValues: Record<string, any>) => {
    // Accumulate rather than replace: fields from other wizard steps may be
    // unmounted and absent from `allValues`, and we must not lose their values.
    setFormValues((prev) => ({ ...prev, ...allValues }));
    const patch = def.id === "cdr"
      ? childDerivedValues({ ...formValues, ...allValues }, childFieldIds)
      : applySkipEffects(
      changed,
      { ...formValues, ...allValues },
      dynamicFormStore.meta,
      def.id,
      def,
      formValues
    );
    // Changing a higher residence level clears the levels below it.
    if (def.id === "mccod") {
      if (RESIDENCE.region in changed) {
        patch[RESIDENCE.district] = null;
        patch[RESIDENCE.subcounty] = null;
      } else if (RESIDENCE.district in changed) {
        patch[RESIDENCE.subcounty] = null;
      }
    }
    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
      setFormValues((prev) => ({ ...prev, ...allValues, ...patch }));
    }
    rememberPerinatalDraft({ ...formValues, ...form.getFieldsValue(true), ...patch });

    const displayIds = childFieldsForDisplay(childFieldIds);
    const ninFields = def.id === "cdr" ? [displayIds.childNin, displayIds.nextOfKinNin] :
      [def.id === "mccod" ? def.ninField : reviewNinFields[def.id]];
    for (const field of ninFields) {
      if (!field || !(field in changed)) continue;
      const nin = normalizeNin(changed[field]);
      if (/^[A-Z0-9]{14}$/.test(nin)) {
        void prefillFromNin(field, nin);
      } else {
        ninRequests.current.delete(field);
        setNinLoading(ninRequests.current.size > 0);
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
    if (def.id === "cdr" && sectionTitle === "SECTION SEVEN: Action Plan") {
      const fields = def.layout[si].groups.flatMap((group) => group.fields)
        .filter((field) => isFieldVisible(field, si, skip));
      return (
        <div className="mccod-table-container" style={{ overflowX: "auto" }}>
          <table className="mccod-table" aria-label="Action plan" style={{ minWidth: 640 }}>
            <thead>
              <tr>{fields.map((field) => <th key={field.de} scope="col">{field.label}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                {fields.map((field) => (
                  <td key={field.de}>
                    <Form.Item name={field.de} valuePropName={valuePropName(field)} noStyle>
                      <FieldWidget
                        field={field}
                        form={form}
                        disabled={isFieldDisabled(field, skip) || field.readOnly}
                        aria-label={field.label}
                      />
                    </Form.Item>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
    
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
            childCertification={def.id === "cdr"}
            fields={allFields} 
            form={form} 
            locked={false}
            skipLogic={skip} 
            dorisReport={dorisReport}
            onSave={def.id === "pdr" ? handleCertify : handleSave}
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

    const renderFieldCol = (field: FormField) => {
              const locked = isFieldDisabled(field, skip) || !!field.readOnly;
              const fieldHint = skip.hints[field.de] || field.hint;
              const flag = flagMap[field.de];
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
                    validateStatus={flag ? (flag.type === "mustCorrect" ? "error" : "warning") : undefined}
                    help={flag ? flag.message : fieldHint}
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
    };

    /** A tick box (or any other widget) drawn as a compact list row. */
    const renderListItem = (field: FormField) => {
      const locked = isFieldDisabled(field, skip) || !!field.readOnly;
      const flag = flagMap[field.de];
      if (dynamicFormStore.meta[field.de]?.valueType === "TRUE_ONLY") {
        return (
          <Form.Item
            key={field.de}
            name={field.de}
            valuePropName="checked"
            validateStatus={flag ? (flag.type === "mustCorrect" ? "error" : "warning") : undefined}
            help={flag?.message}
            className="dform-list-item"
          >
            <Checkbox disabled={locked}>{field.label}</Checkbox>
          </Form.Item>
        );
      }
      return <Row key={field.de}>{renderFieldCol(field)}</Row>;
    };

    const visible = (f: FormField) => isFieldVisible(f, si, skip);
    const numberOf = (label?: string) => (label || "").match(/^\s*(\d+)\./)?.[1] ?? "";
    const withoutNumber = (label?: string) => (label || "").replace(/^\s*\d+\.\s*/, "");

    /** Capture style: No. | Factor | Yes | Specify, one row per factor. */
    const renderFactorsTable = (group: FormGroup, gi: number) => {
      const rows = group.fields.filter((f) => !f.specifyFor);
      return (
        <div className="dform-group" key={gi}>
          {group.label && <div className="dform-group-label">{group.label}</div>}
          <div className="mccod-table-container" style={{ overflowX: "auto" }}>
            <table className="mccod-table dform-factors" aria-label={group.label || "Factors"}>
              <thead>
                <tr>
                  <th scope="col" style={{ width: 48 }}>No.</th>
                  <th scope="col">Factor</th>
                  <th scope="col" style={{ width: 70 }}>Yes</th>
                  <th scope="col" style={{ width: "34%" }}>Specify</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((factor) => {
                  const specify = group.fields.find((f) => f.specifyFor === factor.de);
                  const ticked = dynamicFormStore.meta[factor.de]?.valueType === "TRUE_ONLY";
                  const flag = flagMap[factor.de];
                  return (
                    <tr key={factor.de}>
                      <td>{numberOf(factor.label)}</td>
                      <td>{withoutNumber(factor.label)}</td>
                      {ticked ? (
                        <>
                          <td>
                            <Form.Item name={factor.de} valuePropName="checked" noStyle>
                              <Checkbox disabled={isFieldDisabled(factor, skip)} aria-label={factor.label} />
                            </Form.Item>
                          </td>
                          <td>
                            {specify && visible(specify) ? (
                              <Form.Item name={specify.de} noStyle>
                                <Input size="small" aria-label={specify.label} />
                              </Form.Item>
                            ) : null}
                          </td>
                        </>
                      ) : (
                        <td colSpan={2}>
                          <Form.Item
                            name={factor.de}
                            noStyle
                          >
                            <FieldWidget field={factor} form={form} disabled={isFieldDisabled(factor, skip)} />
                          </Form.Item>
                          {flag && <div className="dform-inline-flag">{flag.message}</div>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    /** Table of 5 recommendations. Row n+1 opens once row n has an answer. */
    const renderRecommendationsTable = (group: FormGroup, gi: number) => {
      const rows: FormField[][] = [];
      for (let i = 0; i < group.fields.length; i += 4) rows.push(group.fields.slice(i, i + 4));
      const filled = (row: FormField[]) => row.some((f) => answered(formValues[f.de]));
      const open = rows.filter((row, index) => index === 0 || filled(rows[index - 1]) || filled(row));
      const columns = ["Issue or gap", "Recommendation", "Responsible person", "Timeframe"];
      return (
        <div className="dform-group" key={gi}>
          {group.label && <div className="dform-group-label">{group.label}</div>}
          <div className="mccod-table-container" style={{ overflowX: "auto" }}>
            <table className="mccod-table dform-recommendations" aria-label="Recommendations" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ width: 48 }}>No.</th>
                  {columns.map((title) => <th key={title} scope="col">{title}</th>)}
                </tr>
              </thead>
              <tbody>
                {open.map((row, index) => (
                  <tr key={row[0].de}>
                    <td>{numberOf(row[0].label) || index + 1}</td>
                    {row.map((field) => (
                      <td key={field.de}>
                        <Form.Item name={field.de} noStyle>
                          <FieldWidget
                            field={field}
                            form={form}
                            disabled={isFieldDisabled(field, skip) || field.readOnly}
                            aria-label={field.label}
                          />
                        </Form.Item>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {open.length < rows.length && (
            <div className="dform-field-hint">The next row opens once this one has an answer.</div>
          )}
        </div>
      );
    };

    /** Sub-groups drawn side by side, each with its own heading. */
    const renderColumnsGroup = (group: FormGroup, gi: number) => {
      const columns = (group.columns || []).filter((column) => column.fields.some(visible));
      const span = Math.max(8, Math.floor(24 / Math.max(1, columns.length)));
      return (
        <div className="dform-group" key={gi}>
          {group.label && <div className="dform-group-label">{group.label}</div>}
          <Row gutter={[24, 4]}>
            {columns.map((column, ci) => (
              <Col key={ci} xs={24} md={span}>
                {column.label && <div className="dform-subgroup-label">{column.label}</div>}
                {column.fields.filter(visible).map(renderListItem)}
              </Col>
            ))}
          </Row>
        </div>
      );
    };

    return def.layout[si].groups.map((group, gi) => {
      const groupFields = group.fields.filter(visible);
      if (!groupFields.length) return null;
      if (group.table === "factors") return renderFactorsTable(group, gi);
      if (group.table === "recommendations") return renderRecommendationsTable(group, gi);
      if (group.columns && group.columns.length) return renderColumnsGroup(group, gi);
      return (
        <div className="dform-group" key={gi}>
          {group.label && <div className="dform-group-label">{group.label}</div>}
          <Row gutter={[14, 4]}>{groupFields.map(renderFieldCol)}</Row>
        </div>
      );
    });
  };

  // Questions shown on the form whose data element is not on the programme
  // stage yet. DHIS2 would reject them, so the save leaves them out silently;
  // tell the reviewer instead.
  const unsavedQuestions: string[] = [];
  if ((def.id === "mdr" || def.id === "pdr") && !dynamicFormStore.loadingMeta && dynamicFormStore.stageDataElements.size > 0) {
    def.layout.forEach((sec, si) => {
      if (/CERTIFIED CAUSE|ICD-11 certificate/i.test(sec.title)) return;
      sec.groups.forEach((g) => g.fields.forEach((f) => {
        if (!isFieldVisible(f, si, skip) || f.de === "ZkNDFfFSTYg" || f.readOnly) return;
        const resolved = isMappedPendingDe(f.de) ? toDhis2DeId(f.de) : f.de;
        if (!dynamicFormStore.stageDataElements.has(resolved)) unsavedQuestions.push(f.label || f.de);
      }));
    });
  }

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
            {store.returnToDashboard && (
              <>
                <span className="dform-sep">/</span>
                <button className="dform-link" onClick={() => store.openModule("dashboard")}>
                  ← Dashboard
                </button>
              </>
            )}
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

                {unsavedQuestions.length > 0 && (
                  <Alert
                    className="dform-unsaved-alert"
                    type="warning"
                    showIcon
                    message={`${unsavedQuestions.length} question${unsavedQuestions.length === 1 ? "" : "s"} on this form cannot be saved yet`}
                    description={
                      <>
                        Their data elements are not on the DHIS2 programme stage, so answers to them are not stored.
                        Ask a DHIS2 administrator to run the retest metadata script.
                        <div className="dform-unsaved-list">
                          {unsavedQuestions.slice(0, 12).join("; ")}
                          {unsavedQuestions.length > 12 ? `; and ${unsavedQuestions.length - 12} more` : ""}
                        </div>
                      </>
                    }
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
                                          ...Object.entries((def.id === "pdr" || def.title?.toLowerCase().includes("perinatal")) ? PERINATAL_TO_MCCOD_MAP : (def.id === "cdr" || def.title?.toLowerCase().includes("child")) ? CDR_TO_MCCOD_MAP : MATERNAL_TO_MCCOD_MAP).map(([src, dest]) => {
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
          {def.id === "cdr" && !savedOnce && (
            <Button
              onClick={() => saveChildReview("draft")}
              loading={dynamicFormStore.saving}
              disabled={dynamicFormStore.loadingMeta || !dynamicFormStore.program}
            >
              Save draft
            </Button>
          )}
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
                {def.id === "cdr" && !savedOnce ? "Complete review" : `Save ${def.title}`}
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
