import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { observer } from "mobx-react";
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
  Progress,
  Row,
  Select,
  Spin,
  Table,
  Tag,
  TimePicker,
} from "antd";
import { useStore } from "../Context";
import { dynamicFormStore } from "../forms/DynamicFormStore";
import { getFormDefinition } from "../forms/registry";
import { FormField, ListColumn } from "../forms/types";
import {
  applySkipEffects,
  computeSkipState,
  emptySkipState,
  isFieldDisabled,
  isFieldVisible,
} from "../forms/skipLogic";
import { useNinApi } from "../utils/ninApi";
import { ICDField } from "./ICDField";
import { FormContextBar, isFormContextReady } from "./FormContextBar";
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
const FieldWidget = observer(
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

    const options = meta?.options;
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
      if (col.type === "status") {
        const linked = col.de ? dynamicFormStore.recordValue(r, col.de) : "";
        return (
          <Tag color={linked ? "green" : "orange"}>
            {linked ? "Certified" : "Pending"}
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
            ? `${rows.length} record${rows.length === 1 ? "" : "s"} at this facility`
            : "Select an organisation unit to list records"}
        </span>
        <Button type="primary" onClick={onNew} disabled={!canAdd}>
          + New {def.title}
        </Button>
      </div>
      <Spin spinning={dynamicFormStore.loadingRecords}>
        {rows.length ? (
          <Table
            size="middle"
            rowKey="event"
            columns={columns}
            dataSource={rows}
            className="dform-records-table"
            onRow={(r: any) => ({ onClick: () => onView(r) })}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
          />
        ) : (
          <Empty
            description={
              store.selectedOrgUnit
                ? "No records yet — create the first one."
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
                    : "Not yet certified"}
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

  const [currentStep, setCurrentStep] = useState(0);
  const [savedOnce, setSavedOnce] = useState(false);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [formKey, setFormKey] = useState(0);
  const [detailRecord, setDetailRecord] = useState<any | null>(null);

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

  const [formValues, setFormValues] = useState<Record<string, any>>({});

  // Hydrate the form from the record's stored values whenever we enter form
  // mode (new or edit). Pushing values into the form store — not just relying
  // on initialValues — is what makes fields on later wizard steps (which mount
  // after the Form) show their saved data, and clears stale values between
  // records.
  useEffect(() => {
    if (mode !== "form" || dynamicFormStore.loadingMeta) return;
    const hydrated = hydrate(dynamicFormStore.defaultValues);
    setFormValues(hydrated);
    // Defer to the next tick so the form instance is fully connected and the
    // current step's fields are registered before we push values in.
    const t = setTimeout(() => {
      form.resetFields();
      form.setFieldsValue(hydrated);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey, mode, dynamicFormStore.loadingMeta]);

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
  };

  // Render the groups + fields of a single section (used by the wizard step).
  const renderSection = (si: number) =>
    def.layout[si].groups.map((group, gi) => {
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
                <Col key={field.de} xs={24} {...fieldSpan(field)}>
                  <Form.Item
                    name={field.de}
                    label={field.label}
                    valuePropName={valuePropName(field)}
                    help={fieldHint}
                    className={`dform-item${locked ? " dform-item-locked" : ""}`}
                  >
                    <FieldWidget
                      field={field}
                      form={form}
                      disabled={locked}
                      hint={fieldHint}
                    />
                  </Form.Item>
                </Col>
              );
            })}
          </Row>
        </div>
      );
    });

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
        <aside className="dform-side">
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
                  onClick={() => setCurrentStep(i)}
                  style={active ? { borderColor: def.accent } : undefined}
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

          {def.isMccod && dynamicFormStore.dorisReport && (
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
              {def.isMccod ? (
                <Button
                  onClick={handleDoris}
                  loading={dynamicFormStore.computingDoris}
                  className="dform-certify"
                >
                  Compute underlying cause (WHO DORIS)
                </Button>
              ) : (
                savedOnce && (
                  <Button onClick={handleCertify} className="dform-certify">
                    Certify Cause of Death (ICD-11) →
                  </Button>
                )
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
