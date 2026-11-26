import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react";
import moment from "moment";
import { Alert, Button, DatePicker, Empty, Input, Progress, Radio, Skeleton, Table, Tabs, Tag, Tooltip, TreeSelect, message } from "antd";
import { useStore } from "../Context";
import { dynamicFormStore } from "../forms/DynamicFormStore";
import { FormId } from "../forms/types";
import { Chart } from "./Chart";
import { LoadedData, Scope, loadDashboard, loadScope } from "./dashboardApi";
import {
  AreaRow,
  DASH_FORMS,
  DashRecord,
  FORM_COLOR,
  FORM_LABEL,
  OuRef,
  PeriodPreset,
  StatusFilter,
  breakdownByChild,
  computeKpis,
  filterRecords,
  isDraft,
  monthsBetween,
  needsCertification,
  periodRange,
  topCauses,
  trendByMonth,
} from "./dashboardData";
import "./Dashboard.css";

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const PERIODS: { key: PeriodPreset; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "Last 3 months" },
  { key: "year", label: "This year" },
  { key: "lastYear", label: "Last year" },
  { key: "custom", label: "Custom" },
];

const STATUS_TABS: { key: StatusFilter; label: string; hint: string }[] = [
  { key: "all", label: "All", hint: "Every record in this view" },
  { key: "certify", label: "Need ICD-11 certification", hint: "Maternal and perinatal reviews with no certified cause yet" },
  { key: "flags", label: "Need correction", hint: "Records that break a rule the form would block on" },
  { key: "drafts", label: "Drafts", hint: "Saved but not completed" },
  { key: "overdue", label: "Overdue child reviews", hint: "More than 7 days since the date of death and still a draft" },
  { key: "completed", label: "Completed", hint: "Saved as complete" },
];

const csvCell = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const issuesOf = (r: DashRecord): { label: string; color: string; tip?: string }[] => {
  const out: { label: string; color: string; tip?: string }[] = [];
  out.push(isDraft(r) ? { label: "Draft", color: "blue" } : { label: "Completed", color: "green" });
  if (needsCertification(r)) out.push({ label: "Needs certification", color: "orange" });
  if (r.overdue) out.push({ label: "Overdue", color: "red" });
  if (r.flags.length) out.push({ label: "Needs correction", color: "red", tip: r.flags.join(" ") });
  return out;
};

interface SavedView {
  preset: PeriodPreset;
  custom: [moment.Moment, moment.Moment] | null;
  forms: FormId[];
  status: StatusFilter;
  month: string | null;
  search: string;
  trail: OuRef[];
  areaView: "chart" | "table";
}

/** Kept for the session so coming back from a record lands on the same view, without reloading. */
let savedView: SavedView | null = null;
let cachedData: { key: string; data: LoadedData; at: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export const Dashboard = observer(() => {
  const store = useStore();
  const fetchJson = useCallback((url: string) => store.engine.link.fetch(url, { cache: "no-store" }), [store.engine]);

  const [scope, setScope] = useState<Scope | null>(null);
  const [scopeError, setScopeError] = useState("");
  const [trail, setTrail] = useState<OuRef[]>(savedView ? savedView.trail : []);

  const [preset, setPreset] = useState<PeriodPreset>(savedView ? savedView.preset : "year");
  const [custom, setCustom] = useState<[moment.Moment, moment.Moment] | null>(savedView ? savedView.custom : null);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState("");

  const [forms, setForms] = useState<FormId[]>(savedView ? savedView.forms : DASH_FORMS);
  const [status, setStatus] = useState<StatusFilter>(savedView ? savedView.status : "all");
  const [month, setMonth] = useState<string | null>(savedView ? savedView.month : null);
  const [search, setSearch] = useState(savedView ? savedView.search : "");
  const [areaView, setAreaView] = useState<"chart" | "table">(savedView ? savedView.areaView : "chart");
  const forceReload = useRef(false);
  const restoredView = useRef(!!savedView);

  const tableRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const kpiRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const requestRef = useRef(0);

  // 1. Who is signed in and which org units they own.
  useEffect(() => {
    let cancelled = false;
    loadScope(fetchJson)
      .then((s) => {
        if (cancelled) return;
        setScope(s);
        if (!restoredView.current) setTrail(s.roots.length === 1 ? [s.roots[0]] : []);
      })
      .catch(() => !cancelled && setScopeError("Could not read your organisation unit access from DHIS2."));
    return () => {
      cancelled = true;
    };
  }, [fetchJson]);

  // 2. The period is the only filter that needs a new request.
  const customKey = custom ? `${custom[0].valueOf()}-${custom[1].valueOf()}` : "";
  const range = useMemo(() => periodRange(preset, custom), [preset, customKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const rangeKey = `${range[0].valueOf()}-${range[1].valueOf()}`;

  useEffect(() => {
    if (!scope) return;
    const token = ++requestRef.current;
    const current = () => token === requestRef.current;
    const cacheKey = `${scope.roots.map((r) => r.id).join(",")}|${rangeKey}`;
    if (!forceReload.current && cachedData && cachedData.key === cacheKey && Date.now() - cachedData.at < CACHE_MS) {
      setData(cachedData.data);
      setLoading(false);
      setLoadError("");
      return;
    }
    forceReload.current = false;
    setLoading(true);
    setLoadError("");
    setProgress(0);
    setData(null);

    // Pages stream in; show them as they arrive instead of waiting for all.
    const acc: DashRecord[] = [];
    let dirty = false;
    const flush = (extra?: Partial<LoadedData>) => {
      dirty = false;
      setData({ records: acc.slice(), truncated: [], failed: [], loadedAt: Date.now(), ...extra });
    };
    const timer = window.setInterval(() => current() && dirty && flush(), 700);

    loadDashboard(fetchJson, scope, range, {
      onRecords: (batch) => {
        acc.push(...batch);
        dirty = true;
      },
      onProgress: (loaded, total) => current() && setProgress(total ? Math.min(99, Math.round((loaded / total) * 100)) : 0),
      shouldStop: () => !current(),
    })
      .then((res) => {
        if (!current()) return;
        flush(res);
        if (res.failed.length === 0) {
          cachedData = {
            key: cacheKey,
            data: { records: acc, truncated: res.truncated, failed: res.failed, loadedAt: Date.now() },
            at: Date.now(),
          };
        }
      })
      .catch(() => current() && setLoadError("The dashboard could not be loaded. Check your connection and try again."))
      .finally(() => {
        window.clearInterval(timer);
        if (current()) setLoading(false);
      });
    return () => window.clearInterval(timer);
  }, [scope, rangeKey, reloadKey, fetchJson]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstRange = useRef(true);
  useEffect(() => {
    if (firstRange.current) {
      firstRange.current = false;
      return;
    }
    setMonth(null);
  }, [rangeKey]);

  useEffect(() => {
    savedView = { preset, custom, forms, status, month, search, trail, areaView };
  }, [preset, custom, forms, status, month, search, trail, areaView]);

  const areaId = trail.length ? trail[trail.length - 1].id : null;
  const levelName = (level: number) => (scope?.levels[level] || `Level ${level}`);

  // --- derived data ----------------------------------------------------------
  const records = data?.records || [];

  /** Records for the chosen area, form and search; the status tabs count from here. */
  const base = useMemo(
    () => filterRecords(records, { forms, month, status: "all", search }, areaId),
    [records, forms, month, search, areaId]
  );
  const filtered = useMemo(
    () => filterRecords(records, { forms, month, status, search }, areaId),
    [records, forms, month, status, search, areaId]
  );
  const kpis = useMemo(() => computeKpis(base), [base]);

  const noMonthBase = useMemo(
    () => filterRecords(records, { forms, month: null, status, search }, areaId),
    [records, forms, status, search, areaId]
  );
  const months = useMemo(() => monthsBetween(range[0], range[1]), [rangeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const trend = useMemo(() => trendByMonth(noMonthBase, months, forms), [noMonthBase, months, forms]);

  const allFormsBase = useMemo(
    () => filterRecords(records, { forms: DASH_FORMS, month, status, search }, areaId),
    [records, month, status, search, areaId]
  );
  const formCounts = useMemo(() => {
    const out: Record<FormId, number> = { mdr: 0, pdr: 0, cdr: 0, mccod: 0 };
    allFormsBase.forEach((r) => (out[r.form] += 1));
    return out;
  }, [allFormsBase]);

  const known = useMemo(() => {
    const noFilters = forms.length === DASH_FORMS.length && status === "all" && !month && !search.trim();
    if (!noFilters || !scope) return [];
    if (!areaId) return scope.roots;
    return (store.userOrgUnits || [])
      .filter((u: any) => u.parent?.id === areaId || u.pId === areaId)
      .map((u: any) => ({ id: u.id, name: u.name, level: u.level, leaf: !!u.leaf }));
  }, [forms, status, month, search, scope, areaId, store.userOrgUnits]);

  const rows: AreaRow[] = useMemo(
    () => breakdownByChild(filtered, areaId, known).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    [filtered, areaId, known]
  );
  const causes = useMemo(() => topCauses(filtered, 10), [filtered]);

  // --- actions ----------------------------------------------------------------
  const toggleForm = (f: FormId) => {
    setForms((cur) => {
      const next = cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f];
      return next.length ? next : DASH_FORMS;
    });
  };
  const drillTo = (row: { id: string; name: string; level: number }) => {
    setTrail((t) => [...t, { id: row.id, name: row.name, level: row.level }]);
    setMonth(null);
  };
  const goToCrumb = (index: number) => setTrail((t) => t.slice(0, index + 1));
  const goToTop = () => setTrail([]);
  const filtersActive = forms.length !== DASH_FORMS.length || status !== "all" || !!month || !!search.trim();
  const clearFilters = () => {
    setForms(DASH_FORMS);
    setStatus("all");
    setMonth(null);
    setSearch("");
  };
  const pickStatus = (s: StatusFilter) => {
    setStatus((cur) => (cur === s ? "all" : s));
    if (tableRef.current) tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openRecord = (r: DashRecord) => {
    dynamicFormStore.pendingEditEvent = {
      ...r.raw,
      eventDate: r.raw.occurredAt,
      lastUpdated: r.raw.updatedAt,
    };
    store.setSelectedOrgUnit(r.orgUnit);
    store.returnToDashboard = true;
    store.openModule(r.form);
  };

  const startNew = (form: FormId) => {
    const here = (store.userOrgUnits || []).find((u: any) => u.id === areaId);
    if (here && here.leaf) store.setSelectedOrgUnit(here.id);
    store.returnToDashboard = true;
    store.openModule(form);
  };

  // Every org unit under the user's own units, for the area / facility picker.
  const orgUnitIndex = useMemo(() => {
    const m = new Map<string, any>();
    (store.userOrgUnits || []).forEach((u: any) => m.set(u.id, u));
    return m;
  }, [store.userOrgUnits]);

  const treeData = useMemo(() => {
    if (!scope) return [];
    const rootIds = new Set(scope.roots.map((r) => r.id));
    const out: any[] = [];
    const have = new Set<string>();
    (store.userOrgUnits || []).forEach((u: any) => {
      const inScope = rootIds.has(u.id) || (u.path || "").split("/").some((id: string) => rootIds.has(id));
      if (!inScope) return;
      have.add(u.id);
      out.push({ id: u.id, pId: rootIds.has(u.id) ? "" : u.parent?.id || u.pId || "", value: u.id, title: u.name, isLeaf: !!u.leaf });
    });
    scope.roots.forEach((r) => {
      if (!have.has(r.id)) out.push({ id: r.id, pId: "", value: r.id, title: r.name, isLeaf: false });
    });
    return out;
  }, [scope, store.userOrgUnits]);

  const pickArea = (id?: string) => {
    setMonth(null);
    if (!scope) return;
    if (!id) {
      setTrail(scope.roots.length === 1 ? [scope.roots[0]] : []);
      return;
    }
    const rootIds = scope.roots.map((r) => r.id);
    const ids: string[] = ((orgUnitIndex.get(id) || {}).path || "").split("/").filter(Boolean);
    const rootAt = ids.findIndex((x) => rootIds.includes(x));
    const chain: OuRef[] = (rootAt >= 0 ? ids.slice(rootAt) : [id])
      .map((x) => orgUnitIndex.get(x) || scope.roots.find((r) => r.id === x))
      .filter(Boolean)
      .map((x: any) => ({ id: x.id, name: x.name, level: x.level }));
    setTrail(chain.length ? chain : [{ id, name: id, level: 0 }]);
  };

  const downloadPdf = async () => {
    const blocks = [topRef.current, kpiRef.current, gridRef.current, tableRef.current].filter(Boolean) as HTMLElement[];
    if (!blocks.length) return;
    setPdfBusy(true);
    const scrollY = window.scrollY;
    try {
      const [h2c, pdf] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const html2canvas: any = (h2c as any).default || h2c;
      const JsPDF: any = (pdf as any).jsPDF || (pdf as any).default;
      window.scrollTo(0, 0);

      const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 8;
      const footer = 7;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2 - footer;
      let y = margin;

      for (const el of blocks) {
        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: "#f1f5f9",
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
        });
        let w = usableW;
        let h = (canvas.height * w) / canvas.width;
        if (h > usableH) {
          h = usableH;
          w = (canvas.width * h) / canvas.height;
        }
        if (y > margin && y + h > margin + usableH) {
          doc.addPage();
          y = margin;
        }
        doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, y, w, h);
        y += h + 3;
      }

      const pages = doc.getNumberOfPages();
      const where = trail.length ? trail.map((t) => t.name).join(" > ") : "All my areas";
      const when = `${range[0].format("DD MMM YYYY")} to ${range[1].format("DD MMM YYYY")}`;
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Simple Analytics  |  ${where}  |  ${when}  |  Generated ${moment().format("DD MMM YYYY HH:mm")}`, margin, pageH - 5);
        doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 5, { align: "right" });
      }
      doc.save(`simple-analytics_${moment().format("YYYYMMDD_HHmm")}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
      message.error("The PDF could not be created. Try again, or use a shorter period.");
    } finally {
      window.scrollTo(0, scrollY);
      setPdfBusy(false);
    }
  };

  const downloadView = () => {
    const header = ["Case number", "Form", "Area", "Parent area", "Event date", "Status", "Needs certification", "Overdue", "Needs correction"];
    const lines = filtered.map((r) =>
      [
        r.caseNumber,
        FORM_LABEL[r.form],
        r.path[r.path.length - 1]?.name,
        r.path.length > 1 ? r.path[r.path.length - 2].name : "",
        r.date,
        isDraft(r) ? "Draft" : "Completed",
        needsCertification(r) ? "Yes" : "",
        r.overdue ? "Yes" : "",
        r.flags.join(" "),
      ].map(csvCell).join(",")
    );
    const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `dashboard_${moment().format("YYYYMMDD_HHmm")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  };

  // --- charts -----------------------------------------------------------------
  const monthLabel = (m: string) => moment(m + "-01").format("MMM YY");
  const trendOptions: Highcharts.Options = {
    chart: { type: "column" },
    xAxis: {
      categories: months.map(monthLabel),
      plotBands: month && months.indexOf(month) >= 0
        ? [{ from: months.indexOf(month) - 0.5, to: months.indexOf(month) + 0.5, color: "rgba(28,95,176,0.12)" }]
        : [],
    },
    yAxis: { title: { text: undefined }, allowDecimals: false, stackLabels: { enabled: false } },
    plotOptions: {
      column: { stacking: "normal", borderRadius: 3, cursor: "pointer" },
      series: {
        point: { events: { click: function () { const m = months[(this as any).index]; setMonth((cur) => (cur === m ? null : m)); } } },
      },
    },
    series: trend.map((t) => ({ type: "column", name: FORM_LABEL[t.form], color: FORM_COLOR[t.form], data: t.data })) as any,
  };

  const topRows = rows.slice(0, 12);
  const childLevel = rows.length ? levelName(rows[0].level) : "";
  const areaOptions: Highcharts.Options = {
    chart: { type: "bar" },
    xAxis: { categories: topRows.map((r) => r.name), labels: { style: { fontWeight: "600" } } },
    yAxis: { title: { text: undefined }, allowDecimals: false },
    plotOptions: {
      bar: { stacking: "normal", cursor: "pointer", borderRadius: 3 },
      series: { point: { events: { click: function () { const r = topRows[(this as any).index]; if (r) drillTo(r); } } } },
    },
    series: forms.map((f) => ({ type: "bar", name: FORM_LABEL[f], color: FORM_COLOR[f], data: topRows.map((r) => r.counts[f]) })) as any,
  };

  const causeOptions: Highcharts.Options = {
    chart: { type: "bar" },
    legend: { enabled: false },
    xAxis: { categories: causes.map((c) => c.label), labels: { style: { fontSize: "11px" } } },
    yAxis: { title: { text: undefined }, allowDecimals: false },
    plotOptions: { bar: { borderRadius: 3, color: "#0f766e" } },
    series: [{ type: "bar", name: "Records", data: causes.map((c) => c.n) }] as any,
  };

  const mixOptions: Highcharts.Options = {
    chart: { type: "pie" },
    legend: { enabled: false },
    plotOptions: {
      pie: {
        innerSize: "62%",
        cursor: "pointer",
        dataLabels: { enabled: true, format: "{point.name}: {point.y}", style: { fontWeight: "600" } },
        point: { events: { click: function () { toggleForm((this as any).options.form); } } },
      },
    },
    series: [{
      type: "pie",
      name: "Records",
      data: DASH_FORMS.filter((f) => formCounts[f] > 0).map((f) => ({
        name: FORM_LABEL[f], y: formCounts[f], color: FORM_COLOR[f], form: f,
        sliced: forms.length < DASH_FORMS.length && forms.includes(f),
      })),
    }] as any,
  };

  // --- table ------------------------------------------------------------------
  const columns: any[] = [
    {
      title: "Case number",
      key: "case",
      sorter: (a: DashRecord, b: DashRecord) => a.caseNumber.localeCompare(b.caseNumber),
      render: (_: any, r: DashRecord) => <strong>{r.caseNumber || "—"}</strong>,
    },
    {
      title: "Form",
      key: "form",
      render: (_: any, r: DashRecord) => (
        <span className="dash-form-pill" style={{ background: FORM_COLOR[r.form] }}>{FORM_LABEL[r.form]}</span>
      ),
    },
    {
      title: "Area",
      key: "area",
      render: (_: any, r: DashRecord) => (
        <div className="dash-area-cell">
          <span>{r.path[r.path.length - 1]?.name}</span>
          {r.path.length > 1 && <small>{r.path[r.path.length - 2].name}</small>}
        </div>
      ),
    },
    {
      title: "Event date",
      key: "date",
      defaultSortOrder: "descend",
      sorter: (a: DashRecord, b: DashRecord) => (a.date || "").localeCompare(b.date || ""),
      render: (_: any, r: DashRecord) => (r.date ? moment(r.date).format("DD MMM YYYY") : "—"),
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, r: DashRecord) => (
        <span className="dash-tags">
          {issuesOf(r).map((i) => (
            <Tooltip key={i.label} title={i.tip}>
              <Tag color={i.color}>{i.label}</Tag>
            </Tooltip>
          ))}
        </span>
      ),
    },
    {
      title: "",
      key: "open",
      align: "right",
      render: (_: any, r: DashRecord) => (
        <Button type="primary" size="small" onClick={(e) => { e.stopPropagation(); openRecord(r); }}>
          Open →
        </Button>
      ),
    },
  ];

  const areaColumns: any[] = [
    {
      title: childLevel || "Area",
      key: "name",
      sorter: (a: AreaRow, b: AreaRow) => a.name.localeCompare(b.name),
      render: (_: any, r: AreaRow) => <a onClick={() => drillTo(r)}><strong>{r.name}</strong></a>,
    },
    ...forms.map((f) => ({
      title: FORM_LABEL[f],
      key: f,
      align: "right",
      sorter: (a: AreaRow, b: AreaRow) => a.counts[f] - b.counts[f],
      render: (_: any, r: AreaRow) => r.counts[f] || <span className="dash-zero">0</span>,
    })),
    {
      title: "Total",
      key: "total",
      align: "right",
      defaultSortOrder: "descend",
      sorter: (a: AreaRow, b: AreaRow) => a.total - b.total,
      render: (_: any, r: AreaRow) => <strong>{r.total}</strong>,
    },
    {
      title: "Needs action",
      key: "attention",
      align: "right",
      sorter: (a: AreaRow, b: AreaRow) => a.attention - b.attention,
      render: (_: any, r: AreaRow) => (r.attention ? <Tag color="orange">{r.attention}</Tag> : <span className="dash-zero">0</span>),
    },
  ];

  // --- render ---------------------------------------------------------------------
  const rootLabel = scope && scope.roots.length
    ? scope.roots.length === 1
      ? `${levelName(scope.roots[0].level)} · ${scope.roots[0].name}`
      : `${scope.roots.length} areas`
    : "";

  const statusCount = (s: StatusFilter) => filterRecords(base, { forms, month, status: s, search: "" }, null).length;

  const KPI_CARDS: { key: StatusFilter; label: string; value: number; tone: string; hint: string }[] = [
    { key: "all", label: "Records", value: kpis.total, tone: "blue", hint: "Everything in this view" },
    { key: "completed", label: "Completed", value: kpis.completed, tone: "green", hint: "Saved as complete" },
    { key: "certify", label: "Need ICD-11 certification", value: kpis.certify, tone: "orange", hint: "Maternal and perinatal, no certified cause yet" },
    { key: "flags", label: "Need correction", value: kpis.flags, tone: "red", hint: "Break a rule the form blocks on" },
    { key: "drafts", label: "Drafts", value: kpis.drafts, tone: "slate", hint: "Saved, not completed" },
    { key: "overdue", label: "Overdue child reviews", value: kpis.overdue, tone: "red", hint: "Draft and more than 7 days since death" },
  ];

  return (
    <div className="dash">
      <div ref={topRef}>
      <div className="dash-topbar">
        <button className="dash-back" data-html2canvas-ignore="true" onClick={store.goHome}>← All forms</button>
        <div className="dash-title">
          <h1>Simple Analytics</h1>
          {rootLabel && <span className="dash-scope" title="Your access comes from the organisation units assigned to your DHIS2 account">{rootLabel}</span>}
        </div>
        <div className="dash-top-actions" data-html2canvas-ignore="true">
          <span className="dash-updated">
            {data ? `Updated ${moment(data.loadedAt).format("HH:mm")}` : ""}
          </span>
          <Button
            onClick={() => {
              forceReload.current = true;
              setReloadKey((k) => k + 1);
            }}
            loading={loading}
          >
            Refresh
          </Button>
          <Button onClick={downloadView} disabled={!filtered.length}>Download CSV</Button>
          <Button type="primary" onClick={downloadPdf} loading={pdfBusy} disabled={loading || !data}>
            Download PDF
          </Button>
        </div>
      </div>

      {scopeError && <Alert type="error" showIcon message={scopeError} style={{ marginBottom: 12 }} />}

      <div className="dash-controls">
        <div className="dash-control dash-control--area">
          <label>Area or facility</label>
          <TreeSelect
            showSearch
            allowClear
            size="small"
            treeDataSimpleMode
            treeNodeFilterProp="title"
            style={{ width: "100%" }}
            dropdownStyle={{ maxHeight: 400, minWidth: 340, overflow: "auto" }}
            placeholder="Search any region, district or facility…"
            value={areaId || undefined}
            treeData={treeData}
            onChange={(v: any) => pickArea(v || undefined)}
          />
        </div>
        <div className="dash-control">
          <label>Period</label>
          <Radio.Group value={preset} onChange={(e) => setPreset(e.target.value)} buttonStyle="solid" size="small">
            {PERIODS.map((p) => <Radio.Button key={p.key} value={p.key}>{p.label}</Radio.Button>)}
          </Radio.Group>
          {preset === "custom" && (
            <RangePicker
              size="small"
              value={custom}
              onChange={(v) => setCustom(v && v[0] && v[1] ? [v[0], v[1]] : null)}
              disabledDate={(d) => !!d && d.isAfter(moment(), "day")}
            />
          )}
        </div>
        <div className="dash-control">
          <label>Forms</label>
          <div className="dash-chips">
            {DASH_FORMS.map((f) => {
              const on = forms.includes(f);
              return (
                <button
                  key={f}
                  className={`dash-chip${on ? " is-on" : ""}`}
                  style={on ? { borderColor: FORM_COLOR[f], background: FORM_COLOR[f] } : undefined}
                  onClick={() => toggleForm(f)}
                  title={on ? "Click to hide" : "Click to show"}
                >
                  {FORM_LABEL[f]} <b>{formCounts[f]}</b>
                </button>
              );
            })}
          </div>
        </div>
        <div className="dash-control dash-control--grow">
          <label>Search</label>
          <Input.Search
            allowClear
            size="small"
            placeholder="Case number or area name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filtersActive && <Button type="link" onClick={clearFilters}>Clear filters</Button>}
      </div>

      <div className="dash-crumbs">
        {scope && scope.roots.length > 1 && (
          <>
            <a className={trail.length ? "" : "is-current"} onClick={goToTop}>All my areas</a>
            {trail.length > 0 && <span className="dash-sep">›</span>}
          </>
        )}
        {trail.map((t, i) => (
          <React.Fragment key={t.id}>
            {i === trail.length - 1 ? (
              <span className="is-current">{t.name} <small>{levelName(t.level)}</small></span>
            ) : (
              <a onClick={() => goToCrumb(i)}>{t.name}</a>
            )}
            {i < trail.length - 1 && <span className="dash-sep">›</span>}
          </React.Fragment>
        ))}
        {month && (
          <Tag closable onClose={() => setMonth(null)} color="blue" style={{ marginLeft: 12 }}>
            {moment(month + "-01").format("MMMM YYYY")}
          </Tag>
        )}
      </div>
      </div>

      {loading && (
        <div className="dash-loading">
          <Progress percent={progress} size="small" status="active" />
          <span>{data ? `Loaded ${data.records.length.toLocaleString()} records so far…` : "Loading records from DHIS2…"}</span>
        </div>
      )}
      {loadError && <Alert type="error" showIcon message={loadError} style={{ marginBottom: 12 }} />}
      {data && data.failed.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Some records could not be loaded"
          description={`${data.failed.map((f) => `${FORM_LABEL[f.form]} (${f.area})`).join(", ")}. Counts for these may be too low. Press Refresh to try again.`}
        />
      )}
      {data && data.truncated.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Very large period"
          description={`${data.truncated.map((f) => FORM_LABEL[f]).join(", ")}: only the most recent 30,000 records per area were loaded. Choose a shorter period for exact counts.`}
        />
      )}

      <div className="dash-kpis" ref={kpiRef}>
        {KPI_CARDS.map((c) => (
          <button
            key={c.key + c.label}
            className={`dash-kpi dash-kpi--${c.tone}${status === c.key ? " is-active" : ""}${c.value === 0 ? " is-zero" : ""}`}
            onClick={() => pickStatus(c.key)}
            title={c.hint}
          >
            {loading && !data ? <Skeleton active paragraph={false} title={{ width: "60%" }} /> : <span className="dash-kpi-value">{c.value.toLocaleString()}</span>}
            <span className="dash-kpi-label">{c.label}</span>
          </button>
        ))}
      </div>

      {data && !loading && base.length === 0 && records.length === 0 ? (
        <div className="dash-card">
          <Empty description="No records in this period for the areas you can see. Try a longer period." />
        </div>
      ) : (
        <>
          <div className="dash-grid" ref={gridRef}>
            <div className="dash-card dash-card--wide">
              <div className="dash-card-head">
                <h3>Records by month</h3>
                <span className="dash-card-hint">Click a column to look at one month</span>
              </div>
              <Chart options={trendOptions} height={260} />
            </div>

            <div className="dash-card">
              <div className="dash-card-head">
                <h3>Records by form</h3>
                <span className="dash-card-hint">Click a slice to show or hide a form</span>
              </div>
              {allFormsBase.length ? <Chart options={mixOptions} height={260} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>

            <div className="dash-card dash-card--wide">
              <div className="dash-card-head">
                <h3>{childLevel ? `Records by ${childLevel.toLowerCase()}` : "Records by area"}</h3>
                <Radio.Group value={areaView} onChange={(e) => setAreaView(e.target.value)} size="small">
                  <Radio.Button value="chart">Chart</Radio.Button>
                  <Radio.Button value="table">Table</Radio.Button>
                </Radio.Group>
              </div>
              {rows.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={trail.length ? "There is no lower level here. The records are listed below." : "Nothing to show"}
                />
              ) : areaView === "chart" ? (
                <>
                  <span className="dash-card-hint">Click a bar to open that area{rows.length > topRows.length ? ` · top ${topRows.length} of ${rows.length}, see the table for all` : ""}</span>
                  <Chart options={areaOptions} height={Math.max(220, topRows.length * 30 + 70)} />
                </>
              ) : (
                <Table
                  size="small"
                  rowKey="id"
                  columns={areaColumns}
                  dataSource={rows}
                  pagination={{ pageSize: 8, hideOnSinglePage: true }}
                  onRow={(r: AreaRow) => ({ onClick: () => drillTo(r), style: { cursor: "pointer" } })}
                />
              )}
            </div>

            <div className="dash-card">
              <div className="dash-card-head">
                <h3>Top causes of death</h3>
                <span className="dash-card-hint">From certified causes in this view</span>
              </div>
              {causes.length ? <Chart options={causeOptions} height={Math.max(220, causes.length * 28 + 60)} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No causes recorded yet" />}
            </div>
          </div>

          <div className="dash-card" ref={tableRef}>
            <div className="dash-card-head">
              <h3>Records</h3>
              <div className="dash-quick" data-html2canvas-ignore="true">
                <span>Start new:</span>
                {DASH_FORMS.map((f) => (
                  <Button key={f} size="small" onClick={() => startNew(f)} style={{ borderColor: FORM_COLOR[f], color: FORM_COLOR[f] }}>
                    + {FORM_LABEL[f]}
                  </Button>
                ))}
              </div>
            </div>
            <Tabs activeKey={status} onChange={(k) => setStatus(k as StatusFilter)}>
              {STATUS_TABS.map((t) => (
                <TabPane
                  key={t.key}
                  tab={
                    <Tooltip title={t.hint}>
                      <span>{t.label} <span className="dash-tab-count">{statusCount(t.key)}</span></span>
                    </Tooltip>
                  }
                />
              ))}
            </Tabs>
            <Table
              size="middle"
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "25", "50"], hideOnSinglePage: true }}
              onRow={(r: DashRecord) => ({ onClick: () => openRecord(r), style: { cursor: "pointer" } })}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filtersActive ? "Nothing matches these filters" : "No records"} /> }}
            />
          </div>
        </>
      )}
    </div>
  );
});
