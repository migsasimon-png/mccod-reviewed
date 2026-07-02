import React from "react";
import { observer } from "mobx-react";
import { Alert, Col, Row, Select, TreeSelect } from "antd";
import { useStore } from "../Context";
import "./FormContextBar.css";

const { Option } = Select;

interface FormContextBarProps {
  compact?: boolean;
}

/** Shared facility + nationality selectors required before creating records. */
export const FormContextBar = observer(({ compact }: FormContextBarProps) => {
  const store = useStore();
  const nationalities = store.nationalitySelect || [];
  const ready = !!(store.selectedOrgUnit && store.selectedNationality);

  return (
    <div className={`fctx${compact ? " fctx-compact" : ""}`}>
      {!ready && (
        <Alert
          type="warning"
          showIcon
          message="Select organisation unit and nationality before adding a new record."
          className="fctx-alert"
        />
      )}
      <Row gutter={12}>
        <Col xs={24} md={15} lg={16}>
          <label className="fctx-label">Organisation Unit *</label>
          <TreeSelect
            showSearch
            allowClear
            treeDataSimpleMode
            size="large"
            style={{ width: "100%" }}
            treeNodeFilterProp="title"
            value={store.selectedOrgUnit}
            placeholder="Select health facility"
            dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
            onChange={store.setSelectedOrgUnit}
            loadData={(node: any) =>
              store.loadOrganisationUnitsChildren(node.id)
            }
            treeData={store.organisationUnits}
          />
        </Col>
        <Col xs={24} md={9} lg={8}>
          <label className="fctx-label">Nationality *</label>
          <Select
            size="large"
            allowClear
            style={{ width: "100%" }}
            placeholder="Select nationality"
            value={store.selectedNationality}
            onChange={store.setSelectedNationality}
          >
            {nationalities.map((n: any) => (
              <Option key={n.id} value={n.id}>
                {n.name}
              </Option>
            ))}
          </Select>
        </Col>
      </Row>
    </div>
  );
});

export const isFormContextReady = (store: {
  selectedOrgUnit?: string;
  selectedNationality?: string;
}) => !!(store.selectedOrgUnit && store.selectedNationality);
