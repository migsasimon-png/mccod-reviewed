import React from "react";
import { observer } from "mobx-react";
import { Col, Row, Select, TreeSelect } from "antd";
import { useStore } from "../Context";
import "./FormContextBar.css";

const { Option } = Select;

interface FormContextBarProps {
  compact?: boolean;
  /** Render inline on the coloured hero (transparent bg, light labels). */
  hero?: boolean;
}

/** Shared facility + nationality selectors required before creating records. */
export const FormContextBar = observer(({ compact, hero }: FormContextBarProps) => {
  const store = useStore();
  const nationalities = store.nationalitySelect || [];
  // Facilities the logged-in user is tagged to.
  const assigned = store.userAssignedOrgUnits || [];
  // Tagged to exactly one leaf facility → selected for them and shown read-only.
  const lockedOrgUnit = store.singleAssignedOrgUnit;
  // Any tagged unit that is a parent (has children below it).
  const hasChildren = assigned.some((u: any) => u.leaf === false);
  // Tagged to a parent unit → drill down its subtree to pick a child facility.
  const scopedTree = !lockedOrgUnit && assigned.length > 0 && hasChildren;
  // Tagged to several leaf facilities → pick from just those (flat list).
  const chooseFromAssigned =
    !lockedOrgUnit && !scopedTree && assigned.length > 1;
  const size = hero ? "middle" : "large";

  return (
    <div
      className={`fctx${hero ? " fctx-hero" : ""}${
        compact ? " fctx-compact" : ""
      }`}
    >
      <Row gutter={12} align="bottom">
        <Col xs={24} sm={12} md={16} lg={16}>
          <label className="fctx-label">Organisation Unit *</label>
          {lockedOrgUnit ? (
            <div className="fctx-fixed-org" title={lockedOrgUnit.name}>
              {lockedOrgUnit.name}
            </div>
          ) : scopedTree ? (
            <TreeSelect
              showSearch
              treeDataSimpleMode
              size={size}
              style={{ width: "100%" }}
              treeNodeFilterProp="title"
              value={store.selectedOrgUnit}
              placeholder="Select facility"
              dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
              onChange={store.setSelectedOrgUnit}
              loadData={(node: any) =>
                store.loadOrganisationUnitsChildren(node.id)
              }
              treeData={store.assignedOrgUnitTree}
            />
          ) : chooseFromAssigned ? (
            <Select
              showSearch
              size={size}
              optionFilterProp="children"
              style={{ width: "100%" }}
              placeholder="Select your facility"
              value={store.selectedOrgUnit}
              onChange={store.setSelectedOrgUnit}
            >
              {assigned.map((o: any) => (
                <Option key={o.id} value={o.id}>
                  {o.name}
                </Option>
              ))}
            </Select>
          ) : (
            <TreeSelect
              showSearch
              allowClear
              treeDataSimpleMode
              size={size}
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
          )}
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <label className="fctx-label">Nationality *</label>
          <Select
            size={size}
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
