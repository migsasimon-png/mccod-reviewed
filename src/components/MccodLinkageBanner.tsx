import React, { useEffect, useState } from "react";
import { Button, Spin, Tag } from "antd";
import {
  CheckCircleFilled,
  WarningFilled,
  LinkOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { observer } from "mobx-react";
import { dynamicFormStore } from "../forms/DynamicFormStore";

interface MccodLinkageBannerProps {
  caseNumber: string | undefined;
  caseNumberFieldUid: string;
  onOpenMccod?: () => void;
  saveTrigger?: number;
}

type LinkageState = "loading" | "linked" | "unlinked";

export const MccodLinkageBanner: React.FC<MccodLinkageBannerProps> = observer(
  ({ caseNumber, caseNumberFieldUid, onOpenMccod, saveTrigger }) => {
    const [state, setState] = useState<LinkageState>("loading");
    const [underlyingCause, setUnderlyingCause] = useState<string>("");
    const [underlyingCode, setUnderlyingCode] = useState<string>("");

    const [lastCheckedCase, setLastCheckedCase] = useState("");
    const [lastCheckedTrigger, setLastCheckedTrigger] = useState<number>(-1);

    useEffect(() => {
      if (!caseNumber) {
        setState("unlinked");
        return;
      }
      if (caseNumber === lastCheckedCase && saveTrigger === lastCheckedTrigger) {
        return; // Already fetched for this case and save session
      }

      setLastCheckedCase(caseNumber);
      setLastCheckedTrigger(saveTrigger ?? 0);

      setState("loading");
      dynamicFormStore
        .fetchMccodEventForCase(caseNumberFieldUid, caseNumber)
        .then((result: Record<string, any> | null) => {
          if (result) {
            // mQVAyOLbga1 = final underlying cause text
            // n2mScmFMovq = final underlying cause code
            setUnderlyingCause(result["mQVAyOLbga1"] || "");
            setUnderlyingCode(result["n2mScmFMovq"] || "");
            setState("linked");
          } else {
            setState("unlinked");
          }
        })
        .catch(() => setState("unlinked"));
    }, [caseNumber, caseNumberFieldUid, saveTrigger, lastCheckedCase, lastCheckedTrigger]);

    if (!caseNumber) return null;

    if (state === "loading") {
      return (
        <div className="mccod-linkage-banner mccod-linkage-banner--loading">
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />}
          />
          <span>Checking for linked ICD-11 certificate…</span>
        </div>
      );
    }

    if (state === "linked") {
      return (
        <div className="mccod-linkage-banner mccod-linkage-banner--linked">
          <CheckCircleFilled className="mccod-linkage-icon mccod-linkage-icon--ok" />
          <div className="mccod-linkage-content">
            <span className="mccod-linkage-title">
              ICD-11 Medical Certificate — Completed
            </span>
            {underlyingCause && (
              <span className="mccod-linkage-cause">
                Underlying cause:{" "}
                <strong>{underlyingCause}</strong>
                {underlyingCode && (
                  <Tag
                    color="blue"
                    style={{ marginLeft: 8, fontFamily: "monospace" }}
                  >
                    {underlyingCode}
                  </Tag>
                )}
              </span>
            )}
          </div>
          {onOpenMccod && (
            <Button
              type="link"
              icon={<LinkOutlined />}
              onClick={onOpenMccod}
              className="mccod-linkage-btn"
            >
              View Certificate →
            </Button>
          )}
        </div>
      );
    }

    // unlinked
    return (
      <div className="mccod-linkage-banner mccod-linkage-banner--unlinked">
        <WarningFilled className="mccod-linkage-icon mccod-linkage-icon--warn" />
        <div className="mccod-linkage-content">
          <span className="mccod-linkage-title">
            No ICD-11 Medical Certificate found for this case
          </span>
          <span className="mccod-linkage-cause">
            The ICD-11 certificate will be created automatically when this form is saved.
          </span>
        </div>
      </div>
    );
  }
);
