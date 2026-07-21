import React from "react";
import { FormInstance, Button, Select, Form } from "antd";
import { SaveOutlined, RobotOutlined } from "@ant-design/icons";
import { ICDField } from "./ICDField";
import { FieldWidget } from "./DynamicForm";
import { DorisReportModal } from "./DorisReportModal";

interface MccodTableSectionProps {
  fields: any[];
  form: FormInstance;
  locked: boolean;
  skipLogic: any;
  dorisReport: string;
  onSave?: () => void;
  saving?: boolean;
  finalCauseOptions?: Record<string, string>;
  onComputeDoris?: () => void;
  computingDoris?: boolean;
  dorisValue?: { code: string; text: string } | null;
  onSelectUnderlyingCause?: (text: string, code: string) => void;
  onIcdSelect?: (selectedEntity: any) => void;
}

const findField = (fields: any[], de: string) =>
  fields.find((f) => f.de === de);

export const MccodTableSection: React.FC<MccodTableSectionProps> = ({
  fields,
  form,
  locked,
  skipLogic,
  dorisReport,
  onSave,
  saving,
  finalCauseOptions,
  onComputeDoris,
  computingDoris,
  dorisValue,
  onSelectUnderlyingCause,
  onIcdSelect,
}) => {
  const isFieldLocked = (field: any) => {
    if (locked) return true;
    if (!field) return false;
    const isHidden = skipLogic?.hiddenFields?.has(field.de);
    const isDisabled = skipLogic?.disabledFields?.has(field.de);
    return isHidden || isDisabled || !!field.readOnly;
  };

  const renderRow = (
    label: string,
    id: string,
    causeDe: string,
    typeDe: string,
    timeDe: string
  ) => {
    const causeField = findField(fields, causeDe);
    const typeField = typeDe ? findField(fields, typeDe) : null;
    const timeField = timeDe ? findField(fields, timeDe) : null;

    if (!causeField) return null;

    const rowCauseLocked = isFieldLocked(causeField);
    const rowCodeLocked = causeField.codeField ? isFieldLocked({ de: causeField.codeField }) : locked;
    const rowTypeLocked = typeField ? isFieldLocked(typeField) : locked;
    const rowTimeLocked = timeField ? isFieldLocked(timeField) : locked;

    return (
      <tr key={id}>
        <td>{label}</td>
        <td style={{ textAlign: "center", fontWeight: "bold" }}>{id}</td>
        <td>
          <div className="dform-icd">
            <ICDField
              field={causeField.de}
              form={form}
              codeField={causeField.codeField}
              uriField={causeField.uriField}
              next={causeField.next}
              disabled={rowCauseLocked}
              onSelect={onIcdSelect}
            />
          </div>
        </td>
        <td>
          {causeField.codeField && (
            <Form.Item name={causeField.codeField} noStyle>
              <FieldWidget
                field={{ ...causeField, de: causeField.codeField }}
                form={form}
                disabled={rowCodeLocked}
              />
            </Form.Item>
          )}
        </td>
        <td>
          {typeField && (
            <Form.Item name={typeField.de} noStyle>
              <FieldWidget field={typeField} form={form} disabled={rowTypeLocked} />
            </Form.Item>
          )}
        </td>
        <td>
          {timeField && (
            <Form.Item name={timeField.de} noStyle>
              <FieldWidget field={timeField} form={form} disabled={rowTimeLocked} />
            </Form.Item>
          )}
        </td>
      </tr>
    );
  };

  return (
    <>
    <div className="mccod-table-container" style={{ overflowX: "auto" }}>
      <table className="mccod-table">
        <colgroup>
          <col style={{ width: "25%" }} />
          <col style={{ width: "5%" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: "25%" }}></th>
            <th style={{ width: "5%", textAlign: "center" }}></th>
            <th style={{ width: "40%" }}>Cause of death</th>
            <th style={{ width: "10%" }}>Code</th>
            <th style={{ width: "12%" }}>Time interval type from onset to death</th>
            <th style={{ width: "8%" }}>Time interval from onset to death</th>
          </tr>
        </thead>
        <tbody>
          {renderRow("Report disease or condition directly leading to death on line", "a", "sfpqAeqKeyQ", "Ylht9kCLSRW", "WkXxkKEJLsg")}
          {renderRow("Report chain of events 'due to' (b to d) in order (if applicable)", "b", "zb7uTuBCPrN", "myydnkmLfhp", "fleGy9CvHYh")}
          {renderRow("", "c", "QGFYJK00ES7", "aC64sB86ThG", "hO8No9fHVd2")}
          {renderRow("", "d", "CnPGhOcERFF", "cmZrrHfTxW3", "eCVDO6lt4go")}
          
          {/* Other Conditions */}
          {renderRow("Other significant conditions contributing to death (time intervals can be included in brackets after the condition)", "Other 1", "xeE5TQLvucB", "", "")}
          {renderRow("", "Other 2", "mI0UjQioE7E", "", "")}
          {renderRow("", "Other 3", "u5ebhwtAmpU", "", "")}
          {renderRow("", "Other 4", "OxJgcwH15L7", "", "")}
          {renderRow("", "Other 5", "Zrn8LD3LoKY", "", "")}

          {/* Final Underlying Cause */}
          <tr>
            <td colSpan={2} style={{ fontWeight: "bold", background: "#fafafa" }}>
              Final Underlying Cause
            </td>
            <td>
              <Form.Item name="mQVAyOLbga1" noStyle>
                <Select
                  disabled={locked}
                  style={{ width: "100%" }}
                  placeholder="Select or compute underlying cause"
                  optionLabelProp="label"
                  onChange={(val: any) => {
                    const code = finalCauseOptions
                      ? Object.keys(finalCauseOptions).find(
                          (k) => finalCauseOptions[k] === val
                        )
                      : "";
                    if (onSelectUnderlyingCause) {
                      onSelectUnderlyingCause(val, code || "");
                    } else {
                      form.setFieldsValue({ mQVAyOLbga1: val, n2mScmFMovq: code });
                    }
                  }}
                  value={form.getFieldValue("mQVAyOLbga1")}
                >
                  {finalCauseOptions &&
                    Object.entries(finalCauseOptions).map(([code, text]) => {
                      const cleanCode = code.startsWith("_") ? "" : code;

                      // DORIS may return a combined code like "JB63.Z/1C12.Y"
                      // We split it and check if this entry's code is one of those parts
                      const dorisCodes = dorisValue?.code
                        ? dorisValue.code.split("/").map((c: string) => c.trim())
                        : [];
                      const isRecommended = cleanCode
                        ? dorisCodes.includes(cleanCode)
                        : false;

                      const labelText = cleanCode ? `${text} (${cleanCode})` : text;
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
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "2px 0",
                              whiteSpace: "normal",
                              lineHeight: "1.4",
                            }}
                          >
                            {isRecommended && (
                              <span
                                style={{
                                  background: "#1677ff",
                                  color: "#fff",
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                ★ DORIS
                              </span>
                            )}
                            <span>
                              {text as string}
                              {cleanCode && (
                                <span style={{ color: "#888", marginLeft: 4, fontSize: 12 }}>
                                  ({cleanCode})
                                </span>
                              )}
                            </span>
                          </div>
                        </Select.Option>
                      );
                    })}
                </Select>
              </Form.Item>
              {dorisValue?.code && (
                <div style={{ marginTop: 8, fontSize: "12px", background: "#e6f7ff", border: "1px solid #91d5ff", padding: "6px 10px", borderRadius: "4px", color: "#0050b3", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px" }}>
                  <span>💡 WHO DORIS recommends selecting the <strong>★ DORIS</strong> marked option above as the underlying cause.</span>
                </div>
              )}
            </td>
            <td>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ flex: 1 }}>
                  {findField(fields, "n2mScmFMovq") && (
                    <Form.Item name="n2mScmFMovq" noStyle>
                      <FieldWidget
                        field={findField(fields, "n2mScmFMovq")}
                        form={form}
                        disabled={locked}
                      />
                    </Form.Item>
                  )}
                </div>
                {dorisReport && <DorisReportModal report={dorisReport} />}
              </div>
            </td>
            <td colSpan={2} style={{ background: "#fafafa" }}></td>
          </tr>
        </tbody>
      </table>
    </div>

      {/* Sticky Save Bar */}
      {onSave && (
        <div className="mccod-save-bar">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={onSave}
            size="large"
          >
            Save Certified Cause of Death
          </Button>
        </div>
      )}
    </>
  );
};
