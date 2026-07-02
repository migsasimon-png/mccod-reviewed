import React, { SFC, useState, useEffect } from "react";
import * as ECT from "@whoicd/icd11ect";
import { Button, Form, Input, Popconfirm } from "antd";
import { CloseOutlined, ConsoleSqlOutlined } from "@ant-design/icons";

import "@whoicd/icd11ect/style.css";
import "../App.css";
import { observer } from "mobx-react";
import { useStore } from "../Context";
import { any } from "prop-types";


const state = {
  field1: "",
};

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
  dvalue?: any
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
    dvalue
  }) => {
    // Testing
    const [buttonIsDisabled, setButtonIsDisabled] = useState(true);
    const [inputIsDisabled, setInputIsDisabled] = useState(false);
    const [popConfirmVisible, setPopConfirmVisible] = useState(false);
    const popupContainerID = `${Math.random()}`;
    const [reposition, setReposition] = useState(false);
    const [listenerAdded, setListenerAdded] = useState(false);
    const fieldRef = React.createRef<HTMLDivElement>();
    const inputRef = React.createRef<any>()

    //
    const [value, setValue] = useState("");
    const [visible, setVisible] = useState(false);
    const store = useStore();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    // const aval = (fieldName,form) => {
    //   return Form.useWatch(fieldName,form);
    // }

    const mySettings = {
      //apiServerUrl: "https://ug.sk-engine.cloud/icd-api",
       apiServerUrl: "https://hmis-tests.health.go.ug",
      // apiServerUrl: " https://icdapi.azurewebsites.net",
      language: store.ICDLang ?? "en",
      autoBind: false,
      wordsAvailable: false,
    };

    const myCallbacks = {
      // Testing
      searchEndedFunction: (e: any) => {
        // Scroll to input
        scrollToInput();
        //this callback is called when search ends.
        setButtonIsDisabled(false);
        setTimeout(() => {
          if (id) {
            let resultsExist = document
              .getElementById(id)
              ?.getElementsByClassName("entityDetailsContent")?.length;
            if (resultsExist) {
              // Hide the popup if it's visible
              setPopConfirmVisible(false);
            } else {
              // Show the popup because there are no results
              setPopConfirmVisible(true);
            }
          }
        }, 6000);
      },
      // End of Testing
      selectedEntityFunction: (selectedEntity: any) => {
        form.setFieldsValue({
          [field]: selectedEntity.title,
        });
        if (next) {
          console.log("Enabling next field", next);
          store.enableValue(next);
        }
        if (codeField) {
          form.setFieldsValue({
            [codeField]: selectedEntity.code,
          });

          if (selectedEntity.code.charAt(0) === "N") {
            // var coded = selectedEntity.code

            //var res =  JSON.stringify(coded);
            // console.log(coded.charAt(0));
            console.log("Code starts with N");

            store.disableValue("FhHPxY16vet");
            store.disableValue("wX3i3gkTG4m");
            store.disableValue("KsGOxFyzIs1");
            store.disableValue("tYH7drlbNya");
            store.disableValue("xDMX2CJ4Xw3");
            store.disableValue("b4yPk98om7e");
            store.disableValue("fQWuywOaoN2");
            store.disableValue("o1hG9vr0peF");
          }

          // Testing
          console.log("FULL SELECTED ENTITY IS ", selectedEntity);
          if (addUnderlyingCause) {
            addUnderlyingCause(
              selectedEntity.code,
              selectedEntity.title,
              selectedEntity.uri
            ); // Calls a function from the props that sets the underlying cause as the code
          }
        } else {
          if (addUnderlyingCause) {
            addUnderlyingCause(
              selectedEntity.title,
              selectedEntity.title,
              selectedEntity.uri
            );
          }
          // End of Testing
        }

        if (uriField) {
          form.setFieldsValue({
            [uriField]: selectedEntity.uri,
          });
        }

        if (searchQueryField) {
          //console.log(selectedEntity.searchQuery);
          console.log(
            "Setting searchQuery field to ",
            selectedEntity.searchQuery
          );

          form.setFieldsValue({
            [searchQueryField]: selectedEntity.searchQuery,
          });
        }

        if (bestMatchTextField) {
          //console.log(selectedEntity.searchQuery);
          console.log(selectedEntity.bestMatchText);

          console.log("best match field is", bestMatchTextField);
          console.log("Selected entity is", selectedEntity);

          form.setFieldsValue({
            //[uriField]: selectedEntity.uri
          });
        } else {
          console.log("There was no best match");
        }
        ECT.Handler.clear(field);
        setVisible(false);
        setValue("");

        if (resetUnderlyingCauseDropdown) {
          resetUnderlyingCauseDropdown(Math.random());
        }
      },
    };

    ECT.Handler.configure(mySettings, myCallbacks);
    ECT.Handler.bind(field);

    var altSearchText;
    const clear = () => {
      // Testing
      if (addUnderlyingCause) {
        addUnderlyingCause("", "", ""); // Calls a function from the props that resets the underlying cause
      }
      // End of Testing

      ECT.Handler.clear(field);
      setVisible(false);
    };

    const switchToAltText = () => {
      // Testing
      clear(); // Clears the search results
      setButtonIsDisabled(true); // Disables the cancel button
      setInputIsDisabled(true); // Disables the search input field
      setValue(""); // Clears the search field
      if (enableAltText) {
        enableAltText(false); // Calls a function from props that enables the alt text field
      }
    };

    const repositionSearchResults = () => {
      // Get the icd element
      if (id) {
        const icdPopup = document.getElementById(popupContainerID);

        // Get it's position in the viewport
        const bounding = icdPopup?.getBoundingClientRect();

        // Log the results
        if (bounding) {
          if (
            bounding.top >= 0 &&
            bounding.left >= 0 &&
            bounding.right <=
              (window.innerWidth || document.documentElement.clientWidth) &&
            bounding.bottom <=
              (window.innerHeight || document.documentElement.clientHeight)
          ) {
            // console.log("In the viewport!");
          } else {
            // console.log("Not in the viewport");
            setReposition(!reposition);
          }
        }
      }
    };

    const styles = {
      icdContainerStyles: {
        position: "relative" as "relative",
      },
      resultStyles: {
        position: "absolute" as "absolute",
        height: "62vh",
        zIndex: 1000,
        backgroundColor: "#fff",
        overflowY: "scroll" as "scroll",
        left: "-19vw",
        right: "-50vw",
        boxShadow: "5px 5px 3px rgba(0, 0, 0, 0.1)",
        transform:
          !buttonIsDisabled && reposition
            ? "translateY(-115%)"
            : !buttonIsDisabled && !reposition
            ? "translateY(3%)"
            : "translateY(20%)",
      },
    };

    useEffect(() => {
      if (!listenerAdded) {
        setListenerAdded(true);
        window.addEventListener("scroll", repositionSearchResults, {
          passive: true,
        });
      }

      return () => {
        window.removeEventListener("scroll", repositionSearchResults);
      };
    }, []);

    const scrollToInput = () => {
      // if(fieldRef){

      fieldRef?.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      // }
    };

    useEffect(() => {
      
      console.log("form val", dvalue, (!!dvalue && !!visible ? false: visible))
      setVisible((v) => 
        !!dvalue && !!v ? false: v
      )

      if (!!dvalue && !!next) {
        console.log("Enabling next field again", next)
        store.enableValue(next);
      }

    }, [dvalue, next, store])

    console.log("visible", visible)

    return (
      <div style={styles.icdContainerStyles} id={id}>
        {visible ? (
          <div className="flex" ref={fieldRef}>
           
            <Input
              size="large"
              disabled={
                disabled ? disabled : inputIsDisabled ? inputIsDisabled : false
              }
              className="ctw-input"
              data-ctw-ino={field}
              ref={inputRef}
              value={value}
              onChange={(e: any) => {
                setValue(e.target.value);
                var CODA = e.target.value;
                store.causeOfDeathAltSearch(e.target.value);
                form.setFieldsValue({ cSDJ9kSJkFP: null });
              }}
              onClick={(e: any) => {
                console.log(codeField);
                if (codeField === "zD0E77W4rFs") {
                  store.enableValue("zD0E77W4rFs");
                  store.enableValue("sfpqAeqKeyQ");
                  store.disableValue("cSDJ9kSJkFP");
                }

                console.log("input working");
                setValue("");
                // if (form.getFieldValue('sfpqAeqKeyQ') === ''){

                //     form.setFieldsValue({ zD0E77W4rFs: null });
                //     console.log('clear working')
                // }
              }}
            />
            
            <Popconfirm
              disabled={buttonIsDisabled}
              visible={popConfirmVisible}
              onVisibleChange={() => setPopConfirmVisible(!popConfirmVisible)}
              title="ICD Code not found, use as Free  search Text Field?"
              onConfirm={(e: any) => {
                console.log(store.ICDAltSearchtextA);
                console.log(store.currentEvent);
                console.log(codeField);
                console.log(searchQueryField);
                console.log(bestMatchTextField);

                // var cod = JSON.stringify(codeField);

                if (codeField === "zD0E77W4rFs") {
                  store.disableValue("zD0E77W4rFs");
                  store.disableValue("sfpqAeqKeyQ");
                  store.enableValue("cSDJ9kSJkFP");
                  store.enableValue("Ylht9kCLSRW");
                  form.setFieldsValue({ zD0E77W4rFs: null });
                  form.setFieldsValue({ sfpqAeqKeyQ: null });
                }

                if (codeField === "tuMMQsGtE69") {
                  store.disableValue("tuMMQsGtE69");
                  store.disableValue("zb7uTuBCPrN");
                  store.enableValue("uckvenVFnwf");
                  store.enableValue("myydnkmLfhp");
                  form.setFieldsValue({ tuMMQsGtE69: null });
                  form.setFieldsValue({ zb7uTuBCPrN: null });
                }

                if (codeField === "C8n6hBilwsX") {
                  store.disableValue("C8n6hBilwsX");
                  store.disableValue("QGFYJK00ES7");
                  store.enableValue("ZFdJRT3PaUd");
                  store.enableValue("aC64sB86ThG");
                  form.setFieldsValue({ C8n6hBilwsX: null });
                  form.setFieldsValue({ QGFYJK00ES7: null });
                }

                if (codeField === "IeS8V8Yf40N") {
                  store.disableValue("IeS8V8Yf40N");
                  store.disableValue("CnPGhOcERFF");
                  store.enableValue("Op5pSvgHo1M");
                  store.enableValue("cmZrrHfTxW3");
                  form.setFieldsValue({ IeS8V8Yf40N: null });
                  form.setFieldsValue({ CnPGhOcERFF: null });
                }

                // store.disableValue(cod);

                // console.log(e.target.value);

                // Testing
                switchToAltText();
              }}
            >
              <Button
                disabled={buttonIsDisabled}
                size="large"
                icon={
                  <CloseOutlined
                    style={{
                      fontSize: "16px",
                      color: "red",
                    }}
                  />
                }
              />
            </Popconfirm>
          </div>
        ) : (
          <Form.Item name={field} className="m-0">
            <Input
              size="large"
              disabled={store.viewMode}
              onClick={() => {
                if (!store.viewMode) {
                  setVisible(true);
                }
              }}
            />
          </Form.Item>
        )}
        {value ? (
          <div
            className="ctw-window"
            style={styles.resultStyles}
            data-ctw-ino={field}
            id={popupContainerID}
          ></div>
        ) : null}
      </div>
    );
  }
);
