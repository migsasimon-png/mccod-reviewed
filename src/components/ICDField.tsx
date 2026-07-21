import React, { SFC, useState, useRef, useCallback } from "react";
import * as ECT from "@whoicd/icd11ect";
import { Button, Form, Input, Popconfirm } from "antd";
import { CloseOutlined } from "@ant-design/icons";

import "@whoicd/icd11ect/style.css";
import "../App.css";
import { observer } from "mobx-react";
import { useStore } from "../Context";

interface ICD {
  field: string;
  form: any;
  codeField?: string;
  uriField?: string;
  disabled?: boolean;
  next?: string;
  searchQueryField?: string;
  bestMatchTextField?: string;
  enableAltText?: any;
  addUnderlyingCause?: any;
  id?: string;
  resetUnderlyingCauseDropdown?: any;
  dvalue?: any;
  onSelect?: (selectedEntity?: any) => void;
}

export const ICDField: SFC<ICD> = observer(
  ({
    field,
    form,
    codeField,
    uriField,
    searchQueryField,
    bestMatchTextField,
    next,
    enableAltText,
    disabled = false,
    addUnderlyingCause,
    id,
    resetUnderlyingCauseDropdown,
    dvalue,
    onSelect,
  }) => {
    const [buttonIsDisabled, setButtonIsDisabled] = useState(true);
    const [inputIsDisabled, setInputIsDisabled] = useState(false);
    const [popConfirmVisible, setPopConfirmVisible] = useState(false);
    const popupContainerID = useRef(`ctw-win-${field}-${Math.random().toString(36).slice(2)}`).current;
    const [value, setValue] = useState("");
    const [visible, setVisible] = useState(false);
    const store = useStore();
    const ectBound = useRef(false);

    const mySettings = {
      apiServerUrl: "https://ug.sk-engine.online",
      icdMinorVersion: "2024-01",
      icdLinearization: "mms",
      language: store.ICDLang ?? "en",
      autoBind: false,
      wordsAvailable: false,
      simplifiedMode: false,
      enablePostcoordination: true,
      includePostcoordination: true,
      postcoordinationAvailable: true,
    };

    const handleEntitySelected = useCallback((selectedEntity: any) => {
      form.setFieldsValue({ [field]: selectedEntity.title });

      if (next) store.enableValue(next);

      if (codeField) {
        form.setFieldsValue({ [codeField]: selectedEntity.code });

        if (selectedEntity.code.charAt(0) === "N") {
          ["FhHPxY16vet","wX3i3gkTG4m","KsGOxFyzIs1","tYH7drlbNya",
           "xDMX2CJ4Xw3","b4yPk98om7e","fQWuywOaoN2","o1hG9vr0peF"].forEach(
            (de) => store.disableValue(de)
          );
        }

        if (addUnderlyingCause)
          addUnderlyingCause(selectedEntity.code, selectedEntity.title, selectedEntity.uri);
      } else {
        if (addUnderlyingCause)
          addUnderlyingCause(selectedEntity.title, selectedEntity.title, selectedEntity.uri);
      }

      if (uriField) form.setFieldsValue({ [uriField]: selectedEntity.uri });
      if (searchQueryField) form.setFieldsValue({ [searchQueryField]: selectedEntity.searchQuery });

      ECT.Handler.clear(field);
      setVisible(false);
      setValue("");

      if (resetUnderlyingCauseDropdown) resetUnderlyingCauseDropdown(Math.random());
      if (onSelect) onSelect(selectedEntity);
    }, [field, form, codeField, uriField, searchQueryField, next, addUnderlyingCause, resetUnderlyingCauseDropdown, onSelect, store]);

    // Ref callback — called by React with the real DOM <input> node when it mounts
    const inputRefCallback = useCallback((el: HTMLInputElement | null) => {
      if (el && !ectBound.current) {
        ectBound.current = true;
        const myCallbacks = {
          searchEndedFunction: (e: any) => {
            setButtonIsDisabled(false);
            setTimeout(() => {
              if (id) {
                const resultsExist = document
                  .getElementById(id)
                  ?.getElementsByClassName("entityDetailsContent")?.length;
                setPopConfirmVisible(!resultsExist);
              }
            }, 6000);
          },
          selectedEntityFunction: handleEntitySelected,
        };

        ECT.Handler.configure(mySettings, myCallbacks);
        ECT.Handler.bind(field);
        el.focus();
      }

      if (!el) {
        ectBound.current = false;
      }
    }, [field, store.ICDLang, handleEntitySelected]);

    const clear = () => {
      if (addUnderlyingCause) addUnderlyingCause("", "", "");
      ECT.Handler.clear(field);
      setVisible(false);
    };

    const switchToAltText = () => {
      clear();
      setButtonIsDisabled(true);
      setInputIsDisabled(true);
      setValue("");
      if (enableAltText) enableAltText(false);
    };

    return (
      <div id={id} style={{ position: "relative", width: "100%" }}>
        {/* When not visible: show the read-only Ant Design input that opens the search on click */}
        {!visible && (
          <Form.Item name={field} className="m-0" style={{ marginBottom: 0 }}>
            <Input
              size="large"
              disabled={store.viewMode || disabled}
              readOnly
              style={{ cursor: disabled || store.viewMode ? "not-allowed" : "pointer" }}
              onClick={() => {
                if (!store.viewMode && !disabled) {
                  ectBound.current = false; // allow re-bind
                  setVisible(true);
                  setValue("");
                }
              }}
            />
          </Form.Item>
        )}

        {/* When visible: native input with ctw-input + ctw-window for ECT to bind to */}
        {visible && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="text"
              autoComplete="off"
              autoFocus
              disabled={disabled || inputIsDisabled}
              className="ctw-input"
              data-ctw-ino={field}
              ref={inputRefCallback}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                store.causeOfDeathAltSearch(e.target.value);
                form.setFieldsValue({ cSDJ9kSJkFP: null });
              }}
              style={{
                flex: 1,
                height: "40px",
                fontSize: "14px",
                padding: "4px 11px",
                border: "1px solid #d9d9d9",
                borderRadius: "6px",
                outline: "none",
                width: "100%",
              }}
            />

            <Popconfirm
              disabled={buttonIsDisabled}
              visible={popConfirmVisible}
              onVisibleChange={() => setPopConfirmVisible(!popConfirmVisible)}
              title="ICD Code not found, use as Free Text Field?"
              onConfirm={() => {
                if (codeField === "zD0E77W4rFs") {
                  store.disableValue("zD0E77W4rFs"); store.disableValue("sfpqAeqKeyQ");
                  store.enableValue("cSDJ9kSJkFP"); store.enableValue("Ylht9kCLSRW");
                  form.setFieldsValue({ zD0E77W4rFs: null, sfpqAeqKeyQ: null });
                }
                if (codeField === "tuMMQsGtE69") {
                  store.disableValue("tuMMQsGtE69"); store.disableValue("zb7uTuBCPrN");
                  store.enableValue("uckvenVFnwf"); store.enableValue("myydnkmLfhp");
                  form.setFieldsValue({ tuMMQsGtE69: null, zb7uTuBCPrN: null });
                }
                if (codeField === "C8n6hBilwsX") {
                  store.disableValue("C8n6hBilwsX"); store.disableValue("QGFYJK00ES7");
                  store.enableValue("ZFdJRT3PaUd"); store.enableValue("aC64sB86ThG");
                  form.setFieldsValue({ C8n6hBilwsX: null, QGFYJK00ES7: null });
                }
                if (codeField === "IeS8V8Yf40N") {
                  store.disableValue("IeS8V8Yf40N"); store.disableValue("CnPGhOcERFF");
                  store.enableValue("Op5pSvgHo1M"); store.enableValue("cmZrrHfTxW3");
                  form.setFieldsValue({ IeS8V8Yf40N: null, CnPGhOcERFF: null });
                }
                switchToAltText();
              }}
            >
              <Button
                disabled={buttonIsDisabled}
                size="large"
                icon={<CloseOutlined style={{ fontSize: "16px", color: "red" }} />}
              />
            </Popconfirm>
          </div>
        )}

        {/* ECT results window — always in DOM when visible so ECT can inject results */}
        {visible && (
          <div
            className="ctw-window"
            data-ctw-ino={field}
            id={popupContainerID}
            style={{
              position: "fixed",
              zIndex: 10000,
              background: "#fff",
              border: "1px solid #d9d9d9",
              borderRadius: "4px",
              minWidth: "720px",
              maxHeight: "400px",
              overflowY: "auto",
              display: value ? "block" : "none",
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
            }}
          />
        )}
      </div>
    );
  }
);
