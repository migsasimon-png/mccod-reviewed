import React, { useEffect, useState } from "react";
import { Button, Spin } from "antd";
import {
  CheckCircleFilled,
  WarningFilled,
  LinkOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { observer } from "mobx-react";
import { store as mainStore } from "../Store";
import { dynamicFormStore } from "../forms/DynamicFormStore";

interface MccodToMaternalLinkageBannerProps {
  caseNumber: string | undefined;
}

type LinkageState = "loading" | "linked" | "unlinked";

export const MccodToMaternalLinkageBanner: React.FC<MccodToMaternalLinkageBannerProps> = observer(
  ({ caseNumber }) => {
    const [state, setState] = useState<LinkageState>("loading");
    const [linkedEvent, setLinkedEvent] = useState<any>(null);

    useEffect(() => {
      if (!caseNumber) {
        setState("unlinked");
        return;
      }

      setState("loading");
      // Search for maternal event by Case Number in maternal program stage (YXed7PnLRco)
      const url =
        `/api/events.json?programStage=YXed7PnLRco` +
        `&filter=ZKBE8Xm9DJG:eq:${encodeURIComponent(caseNumber)}` +
        `&fields=event,orgUnit,eventDate,dataValues[dataElement,value]&pageSize=1`;

      dynamicFormStore.engine.link
        .fetch(url)
        .then((res: any) => {
          const evt = res?.events?.[0];
          if (evt) {
            setLinkedEvent(evt);
            setState("linked");
          } else {
            setState("unlinked");
          }
        })
        .catch(() => setState("unlinked"));
    }, [caseNumber]);

    if (!caseNumber) return null;

    if (state === "loading") {
      return (
        <div className="mccod-linkage-banner mccod-linkage-banner--loading" style={{ marginBottom: 16 }}>
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />}
          />
          <span>Checking for linked Maternal review…</span>
        </div>
      );
    }

    if (state === "linked") {
      return (
        <div className="mccod-linkage-banner mccod-linkage-banner--linked" style={{ marginBottom: 16, background: "#f9f0ff", border: "1px solid #d3adf7" }}>
          <CheckCircleFilled className="mccod-linkage-icon mccod-linkage-icon--ok" style={{ color: "#722ed1" }} />
          <div className="mccod-linkage-content">
            <span className="mccod-linkage-title" style={{ color: "#531dab" }}>
              Linked Maternal Death Review found
            </span>
            <span className="mccod-linkage-cause" style={{ color: "#531dab" }}>
              Case Number: <strong>{caseNumber}</strong> (Maternal Stage)
            </span>
          </div>
          <Button
            type="link"
            icon={<LinkOutlined />}
            onClick={() => {
              dynamicFormStore.pendingEditEvent = linkedEvent;
              mainStore.openModule("mdr");
            }}
            className="mccod-linkage-btn"
            style={{ color: "#722ed1" }}
          >
            Open Maternal Review →
          </Button>
        </div>
      );
    }

    // unlinked
    return (
      <div className="mccod-linkage-banner mccod-linkage-banner--unlinked" style={{ marginBottom: 16, background: "#fafafa", border: "1px solid #d9d9d9" }}>
        <WarningFilled className="mccod-linkage-icon mccod-linkage-icon--warn" style={{ color: "#8c8c8c" }} />
        <div className="mccod-linkage-content">
          <span className="mccod-linkage-title" style={{ color: "#595959" }}>
            Direct ICD-11 Medical Certificate
          </span>
          <span className="mccod-linkage-cause" style={{ color: "#8c8c8c" }}>
            No linked Maternal Death Review found for case number "{caseNumber}".
          </span>
        </div>
      </div>
    );
  }
);
