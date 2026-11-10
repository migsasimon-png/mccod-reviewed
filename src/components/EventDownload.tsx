import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Drawer,
  Select,
  DatePicker,
  Radio,
  Button,
  Progress,
  Tag,
  Divider,
  Empty,
  Spin,
  TreeSelect,
  Switch,
  Tooltip,
  message,
} from "antd";
import { CSVLink } from "react-csv";
import { observer } from "mobx-react";
import { useStore } from "../Context";
import moment from "moment";
import "./EventDownload.css";

const { RangePicker } = DatePicker;
const { Option } = Select;

interface Dhis2Program {
  id: string;
  displayName: string;
  programStages: { id: string; displayName: string }[];
}

type ExportFormat = "csv" | "json";
type OuMode = "SELECTED" | "DESCENDANTS" | "ACCESSIBLE";

const OU_MODES: { value: OuMode; label: string; desc: string }[] = [
  { value: "SELECTED", label: "Selected only", desc: "Events at the chosen org unit" },
  { value: "DESCENDANTS", label: "Include sub-units", desc: "Includes all children of the selected org unit" },
  { value: "ACCESSIBLE", label: "All accessible", desc: "All org units the current user can access" },
];

const PAGE_SIZE = 250;

function flattenEvent(
  ev: any,
  deNames: Record<string, string>,
  programName: string,
  multiProgram: boolean
): Record<string, string> {
  const row: Record<string, string> = {};
  if (multiProgram) row["Program"] = programName;
  row["Event ID"] = ev.event || "";
  row["Organisation Unit"] = ev.orgUnitName || ev.orgUnit || "";
  row["Event Date"] = ev.eventDate ? moment(ev.eventDate).format("YYYY-MM-DD") : "";
  row["Status"] = ev.status || "";
  row["Created"] = ev.created ? moment(ev.created).format("YYYY-MM-DD HH:mm") : "";
  row["Last Updated"] = ev.lastUpdated ? moment(ev.lastUpdated).format("YYYY-MM-DD HH:mm") : "";
  for (const dv of ev.dataValues || []) {
    const label = deNames[dv.dataElement] || dv.dataElement;
    row[label] = dv.value ?? "";
  }
  return row;
}

function buildCsvData(
  rows: Record<string, string>[]
): { headers: string[]; data: string[][] } {
  if (rows.length === 0) return { headers: [], data: [] };
  const headerSet = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => headerSet.add(k)));
  const headers = Array.from(headerSet);
  const data = rows.map((r) => headers.map((h) => r[h] || ""));
  return { headers, data };
}

async function loadOptionNameMap(
  engine: any,
  programStageId: string
): Promise<Record<string, Record<string, string>>> {
  try {
    const url =
      `/api/programStages/${programStageId}.json` +
      `?fields=programStageDataElements[dataElement[id,optionSet[options[code,displayName]]]]`;
    const res: any = await engine.link.fetch(url);
    const map: Record<string, Record<string, string>> = {};
    for (const psde of res?.programStageDataElements || []) {
      const de = psde?.dataElement;
      if (de?.optionSet?.options?.length) {
        const lookup: Record<string, string> = {};
        for (const opt of de.optionSet.options) {
          lookup[opt.code] = opt.displayName;
        }
        map[de.id] = lookup;
      }
    }
    return map;
  } catch {
    return {};
  }
}

const EventDownload = observer(() => {
  const store = useStore();
  const csvRef = useRef<any>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [allPrograms, setAllPrograms] = useState<Dhis2Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);

  const [dlOrgUnit, setDlOrgUnit] = useState<string | undefined>(undefined);
  const [ouMode, setOuMode] = useState<OuMode>("DESCENDANTS");

  const [dateRange, setDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [resolveOptionCodes, setResolveOptionCodes] = useState(true);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);

  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [totalFetched, setTotalFetched] = useState(0);
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef(false);

  const fetchPrograms = useCallback(async () => {
    if (allPrograms.length > 0 || loadingPrograms) return;
    setLoadingPrograms(true);
    try {
      const url =
        `/api/programs.json?paging=false&filter=programType:eq:WITHOUT_REGISTRATION` +
        `&fields=id,displayName,programStages[id,displayName]`;
      const res: any = await store.engine.link.fetch(url);
      const programs: Dhis2Program[] = (res?.programs || []).sort((a: any, b: any) =>
        a.displayName.localeCompare(b.displayName)
      );
      setAllPrograms(programs);
    } catch (e) {
      console.error("Failed to load programs:", e);
      message.error("Could not load programs from DHIS2");
    } finally {
      setLoadingPrograms(false);
    }
  }, [store.engine, allPrograms.length, loadingPrograms]);

  useEffect(() => {
    if (drawerOpen) fetchPrograms();
  }, [drawerOpen, fetchPrograms]);

  const fetchDeNames = useCallback(
    async (programStageId: string): Promise<Record<string, string>> => {
      try {
        const url =
          `/api/programStages/${programStageId}.json` +
          `?fields=programStageDataElements[dataElement[id,displayName]]`;
        const res: any = await store.engine.link.fetch(url);
        const map: Record<string, string> = {};
        (res?.programStageDataElements || []).forEach((psde: any) => {
          if (psde.dataElement) {
            map[psde.dataElement.id] = psde.dataElement.displayName;
          }
        });
        return map;
      } catch {
        return {};
      }
    },
    [store.engine]
  );

  const fetchAllPages = useCallback(
    async (
      programId: string,
      programStageId: string,
      onPage: (loaded: number, total: number | null) => void
    ): Promise<any[]> => {
      const all: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && !abortRef.current) {
        let url =
          `/api/events.json?program=${programId}` +
          `&programStage=${programStageId}` +
          `&order=eventDate:desc` +
          `&pageSize=${pageSize}&page=${page}` +
          `&totalPages=true` +
          `&fields=event,eventDate,orgUnit,orgUnitName,status,created,lastUpdated,` +
          `dataValues[dataElement,value]`;

        if (ouMode === "ACCESSIBLE") {
          url += `&ouMode=ACCESSIBLE`;
        } else if (dlOrgUnit) {
          url += `&orgUnit=${dlOrgUnit}&ouMode=${ouMode}`;
        } else {
          url += `&ouMode=ACCESSIBLE`;
        }

        if (dateRange) {
          url += `&startDate=${dateRange[0].format("YYYY-MM-DD")}`;
          url += `&endDate=${dateRange[1].format("YYYY-MM-DD")}`;
        }

        const res: any = await store.engine.link.fetch(url);
        const events = res?.events || [];
        all.push(...events);

        const totalCount = res?.pager?.total ?? null;
        onPage(all.length, totalCount);

        hasMore = events.length === pageSize;
        page++;
      }
      return all;
    },
    [store.engine, dlOrgUnit, ouMode, dateRange, pageSize]
  );

  const handleDownload = useCallback(async () => {
    if (selectedProgramIds.length === 0) {
      message.warning("Select at least one program to download");
      return;
    }
    if (!dlOrgUnit && ouMode !== "ACCESSIBLE") {
      message.warning("Select an organisation unit first, or choose \"All accessible\" mode");
      return;
    }

    setDownloading(true);
    setDownloadReady(false);
    setError(null);
    setProgress(0);
    setTotalFetched(0);
    abortRef.current = false;

    try {
      const allRows: Record<string, string>[] = [];

      const tasks: { programId: string; programName: string; stageId: string; stageName: string }[] = [];
      for (const pid of selectedProgramIds) {
        const prog = allPrograms.find((p) => p.id === pid);
        if (!prog) continue;
        for (const stage of prog.programStages) {
          tasks.push({
            programId: prog.id,
            programName: prog.displayName,
            stageId: stage.id,
            stageName: stage.displayName,
          });
        }
      }

      if (tasks.length === 0) {
        setError("Selected programs have no program stages.");
        setDownloading(false);
        return;
      }

      const multiProgram = selectedProgramIds.length > 1;

      for (let i = 0; i < tasks.length; i++) {
        if (abortRef.current) break;
        const task = tasks[i];
        const label = tasks.length > 1 ? `${task.programName} / ${task.stageName}` : task.programName;

        setProgressLabel(`Loading metadata for ${label}...`);
        setProgress(Math.round((i / tasks.length) * 100));

        const deNames = await fetchDeNames(task.stageId);
        const optionMap = resolveOptionCodes
          ? await loadOptionNameMap(store.engine, task.stageId)
          : {};

        setProgressLabel(`Fetching ${label}...`);

        const events = await fetchAllPages(
          task.programId,
          task.stageId,
          (loaded, total) => {
            const base = (i / tasks.length) * 100;
            const share = (1 / tasks.length) * 100;
            const pageProgress = total && total > 0 ? (loaded / total) * share : share * 0.5;
            setProgress(Math.min(99, Math.round(base + pageProgress)));
            setProgressLabel(`${label}: ${loaded}${total ? ` of ${total}` : ""} events...`);
          }
        );

        for (const ev of events) {
          if (resolveOptionCodes && ev.dataValues) {
            for (const dv of ev.dataValues) {
              const lookup = optionMap[dv.dataElement];
              if (lookup && dv.value && lookup[dv.value]) {
                dv.value = lookup[dv.value];
              }
            }
          }
          const row = flattenEvent(ev, deNames, task.programName, multiProgram);
          allRows.push(row);
        }
        setTotalFetched(allRows.length);
      }

      if (abortRef.current) {
        setProgressLabel("Download cancelled");
        setDownloading(false);
        return;
      }

      if (allRows.length === 0) {
        setError("No events found for the selected filters. Try a wider date range, different org unit, or \"All accessible\" mode.");
        setDownloading(false);
        setProgress(0);
        return;
      }

      setProgress(100);
      setProgressLabel(`Preparing ${allRows.length} events for export...`);

      if (format === "json") {
        const blob = new Blob([JSON.stringify(allRows, null, 2)], {
          type: "application/json",
        });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `events_${moment().format("YYYYMMDD_HHmm")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        message.success(`Downloaded ${allRows.length} events as JSON`);
        setDownloading(false);
      } else {
        const { headers, data } = buildCsvData(allRows);
        setCsvData([headers, ...data]);
        setDownloadReady(true);
      }
    } catch (err) {
      console.error("Download error:", err);
      setError((err as any)?.message || "Download failed — check network or permissions.");
      setDownloading(false);
      setProgress(0);
    }
  }, [
    selectedProgramIds,
    allPrograms,
    dlOrgUnit,
    ouMode,
    format,
    resolveOptionCodes,
    store.engine,
    fetchDeNames,
    fetchAllPages,
  ]);

  useEffect(() => {
    if (downloadReady && csvData && csvRef.current) {
      setTimeout(() => {
        csvRef.current.link.click();
        message.success(`Downloaded ${csvData.length - 1} events as CSV`);
        setDownloading(false);
        setDownloadReady(false);
      }, 300);
    }
  }, [downloadReady, csvData]);

  const handleCancel = () => {
    abortRef.current = true;
  };

  const csvFilename = `events_${moment().format("YYYYMMDD_HHmm")}.csv`;

  const orgUnits = store.organisationUnits || [];

  return (
    <>
      <button
        className="tile download-tile"
        style={{ background: "linear-gradient(135deg, #475569 0%, #1e293b 100%)" }}
        onClick={() => setDrawerOpen(true)}
      >
        <span className="tile-glow" />
        <span className="tile-badge">Export</span>
        <span className="tile-icon">
          <svg viewBox="0 0 24 24">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
        </span>
        <div className="tile-body">
          <p className="tile-title">Download Events</p>
          <p className="tile-subtitle">
            Export event data from any program as CSV or JSON
          </p>
        </div>
        <span className="tile-cta">
          Open exporter <span className="arrow">→</span>
        </span>
      </button>

      <Drawer
        title={null}
        placement="right"
        width={560}
        onClose={() => { setDrawerOpen(false); handleCancel(); }}
        visible={drawerOpen}
        className="download-drawer"
        bodyStyle={{ padding: 0 }}
      >
        <div className="dd-header">
          <div className="dd-header-icon">
            <svg viewBox="0 0 24 24" fill="#fff" width="28" height="28">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          </div>
          <div>
            <h2 className="dd-title">Event Data Export</h2>
            <p className="dd-subtitle">
              Download events from any DHIS2 event program
            </p>
          </div>
        </div>

        <div className="dd-body">
          {/* 1. PROGRAM SELECTION */}
          <div className="dd-section">
            <label className="dd-label">Programs to export</label>
            {loadingPrograms ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <Spin size="small" />
                <span style={{ marginLeft: 8, color: "#64748b" }}>Loading programs...</span>
              </div>
            ) : (
              <>
                <Select
                  mode="multiple"
                  style={{ width: "100%" }}
                  placeholder="Search and select programs..."
                  value={selectedProgramIds}
                  onChange={setSelectedProgramIds}
                  optionFilterProp="children"
                  showSearch
                  maxTagCount={3}
                  maxTagPlaceholder={(omitted) => `+${omitted.length} more`}
                >
                  {allPrograms.map((p) => (
                    <Option key={p.id} value={p.id}>
                      {p.displayName}
                    </Option>
                  ))}
                </Select>
                <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                    onClick={() => setSelectedProgramIds(allPrograms.map((p) => p.id))}
                  >
                    Select all ({allPrograms.length})
                  </Button>
                  {selectedProgramIds.length > 0 && (
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0 }}
                      onClick={() => setSelectedProgramIds([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {selectedProgramIds.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {selectedProgramIds.map((id) => {
                      const prog = allPrograms.find((p) => p.id === id);
                      return (
                        <Tag key={id} color="blue" closable onClose={() =>
                          setSelectedProgramIds((prev) => prev.filter((x) => x !== id))
                        }>
                          {prog?.displayName || id}
                        </Tag>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <Divider style={{ margin: "16px 0" }} />

          {/* 2. ORGANISATION UNIT */}
          <div className="dd-section">
            <label className="dd-label">Organisation unit</label>
            <TreeSelect
              showSearch
              allowClear
              treeDataSimpleMode
              style={{ width: "100%" }}
              treeNodeFilterProp="title"
              value={dlOrgUnit}
              dropdownStyle={{ maxHeight: 350, overflow: "auto" }}
              placeholder="Select organisation unit (country, region, district, facility)..."
              onChange={(val: any) => setDlOrgUnit(val)}
              treeData={orgUnits}
            />
            <div style={{ marginTop: 8 }}>
              <Radio.Group
                value={ouMode}
                onChange={(e) => setOuMode(e.target.value)}
              >
                {OU_MODES.map((m) => (
                  <Tooltip key={m.value} title={m.desc}>
                    <Radio.Button value={m.value}>{m.label}</Radio.Button>
                  </Tooltip>
                ))}
              </Radio.Group>
            </div>
            <span className="dd-hint">
              {ouMode === "ACCESSIBLE"
                ? "Will download from all org units you have access to (org unit selection ignored)"
                : ouMode === "DESCENDANTS"
                ? "Will include events at the selected org unit and all its children"
                : "Will download events at the selected org unit only"}
            </span>
          </div>

          <Divider style={{ margin: "16px 0" }} />

          {/* 3. DATE RANGE */}
          <div className="dd-section">
            <label className="dd-label">Date range</label>
            <RangePicker
              style={{ width: "100%" }}
              value={dateRange}
              onChange={(vals) => setDateRange(vals as any)}
              allowClear
              ranges={{
                "This month": [moment().startOf("month"), moment().endOf("month")],
                "Last 3 months": [moment().subtract(3, "months").startOf("month"), moment()],
                "Last 6 months": [moment().subtract(6, "months").startOf("month"), moment()],
                "This year": [moment().startOf("year"), moment()],
                "Last year": [moment().subtract(1, "year").startOf("year"), moment().subtract(1, "year").endOf("year")],
                "All time": [moment("2015-01-01"), moment()],
              } as any}
              format="YYYY-MM-DD"
            />
            <span className="dd-hint">Leave empty to export all dates</span>
          </div>

          <Divider style={{ margin: "16px 0" }} />

          {/* 4. EXPORT OPTIONS */}
          <div className="dd-section dd-options-row">
            <div>
              <label className="dd-label">File format</label>
              <Radio.Group
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="csv">CSV</Radio.Button>
                <Radio.Button value="json">JSON</Radio.Button>
              </Radio.Group>
            </div>
            <div>
              <label className="dd-label">Page size</label>
              <Select
                value={pageSize}
                onChange={setPageSize}
                style={{ width: 110 }}
                size="small"
              >
                <Option value={100}>100</Option>
                <Option value={250}>250</Option>
                <Option value={500}>500</Option>
              </Select>
            </div>
            <div>
              <label className="dd-label">Decode option codes</label>
              <Tooltip title="Replace coded values (e.g. 'OPT_YES') with human-readable names (e.g. 'Yes')">
                <Switch
                  checked={resolveOptionCodes}
                  onChange={setResolveOptionCodes}
                  checkedChildren="Yes"
                  unCheckedChildren="No"
                  size="small"
                />
              </Tooltip>
            </div>
          </div>

          <Divider style={{ margin: "16px 0" }} />

          {/* PROGRESS */}
          {downloading && (
            <div className="dd-progress">
              <Spin size="small" />
              <div style={{ flex: 1 }}>
                <Progress
                  percent={progress}
                  size="small"
                  strokeColor={{ from: "#1c5fb0", to: "#10b981" }}
                  status="active"
                />
                <span className="dd-progress-label">{progressLabel}</span>
              </div>
              <Button danger size="small" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}

          {error && (
            <div className="dd-error">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={error}
              />
            </div>
          )}

          {!downloading && totalFetched > 0 && !error && (
            <div className="dd-summary">
              <Tag color="green">{totalFetched} events exported successfully</Tag>
            </div>
          )}

          {/* ACTIONS */}
          <div className="dd-actions">
            <Button onClick={() => setDrawerOpen(false)}>Close</Button>
            <Button
              type="primary"
              size="large"
              loading={downloading}
              disabled={selectedProgramIds.length === 0}
              onClick={handleDownload}
              className="dd-download-btn"
            >
              {downloading
                ? "Downloading..."
                : `Download${selectedProgramIds.length > 0
                    ? ` (${selectedProgramIds.length} program${selectedProgramIds.length > 1 ? "s" : ""})`
                    : ""}`}
            </Button>
          </div>
        </div>

        <CSVLink
          ref={csvRef}
          data={csvData ?? []}
          filename={csvFilename}
          style={{ display: "none" }}
        />
      </Drawer>
    </>
  );
});

export default EventDownload;
