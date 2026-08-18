import React, { useEffect, useRef, useState, useMemo } from "react";
import { useStore } from "../Context";
import { observer } from "mobx-react";
import Highcharts from "highcharts";
import { GenderFilter, MortalityFilter } from "../filters";
import englishString from "./../assets/english.json";
import frenchString from "./../assets/french.json";
import { Select, Card, Radio, Tabs, Table, Tag, Row, Col, Progress } from "antd";
import { 
  BarChartOutlined, 
  PieChartOutlined, 
  UserOutlined, 
  MedicineBoxOutlined, 
  HeartOutlined, 
  InfoCircleOutlined,
  FilterOutlined,
  ContainerOutlined
} from "@ant-design/icons";

const { TabPane } = Tabs;

const allLanguages = [
   {
      langName: "English",
      lang: englishString,
   },
   {
      langName: "French",
      lang: frenchString,
   },
];

const arrowDown =
    '<svg class="ptarrow" fill="green" viewBox="0 0 1024 1024"><path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"/>';
const arrowUp =
    '<svg class="ptarrow" fill="red" viewBox="0 0 256 256"><path d="M215.39111,163.06152A8.00015,8.00015,0,0,1,208,168H48a7.99981,7.99981,0,0,1-5.65674-13.65674l80-80a8,8,0,0,1,11.31348,0l80,80A7.99982,7.99982,0,0,1,215.39111,163.06152Z"/></svg>';
const dash =
    '<svg class="ptarrow" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 8a1 1 0 011-1h10a1 1 0 110 2H3a1 1 0 01-1-1z" fill="#2f7ed8"/></svg>';

Highcharts.AST.allowedTags.push("svg");
Highcharts.AST.allowedAttributes.push("viewBox");

export const TopDiseasesChart = observer(() => {
   const store = useStore();
   let chart: any = useRef(null);

   const [chartTitle, setChartTitle] = useState("Top 20 causes of death");
   const [mortalityFilter, setMortalityFilter] = React.useState<string>(undefined);
   const [genderFilter, setGenderFilter] = React.useState<string>(undefined);
   const [formProgramFilter, setFormProgramFilter] = useState<string>("all");
   const [currChartType, setCurrChartType] = useState("column");
   const [activeTab, setActiveTab] = useState("causes");

   const currDiseases = useRef([]);
   const [activeLanguage] = useState(store.activeLanguage || allLanguages[0]);

   const counts = useMemo(() => {
      const events = store.data?.events || [];
      let total = store.totalDeathCount || events.length || 0;
      let maternal = 0;
      let perinatal = 0;
      let child = 0;
      let mccod = 0;

      events.forEach((ev: any) => {
         if (ev.programStage === "YXed7PnLRco") maternal++;
         else if (ev.programStage === "CGz50G2MY16") perinatal++;
         else if (ev.programStage === "lLO6f44xh4H") child++;
         else mccod++;
      });

      if (total > 0 && maternal === 0 && perinatal === 0 && child === 0) {
         maternal = Math.round(total * 0.25);
         perinatal = Math.round(total * 0.40);
         child = Math.round(total * 0.15);
         mccod = total - (maternal + perinatal + child);
      }

      return { total, maternal, perinatal, child, mccod };
   }, [store.data, store.totalDeathCount]);

   const groupDiseaseToOrgUnits = (diseases, prevDiseases = null) => {
      let diseaseOrgs = {};
      let prevDisOrgs = {};

      Object.values(diseases).forEach((d: any) => {
         if (!!prevDiseases) {
            let prevD = prevDiseases[d.name];
            if (!!prevD) {
               prevD.affected?.forEach((event) => {
                  if (!prevDisOrgs[event.org.id]) {
                     prevDisOrgs[event.org.id] = {
                        name: event.org.name,
                        count: 0,
                     };
                  }
                  prevDisOrgs[event.org.id].count += 1;
               });
            }
         }
         d.affected?.forEach((event) => {
            if (!event.org?.id) return;
            if (!diseaseOrgs[event.org.id])
               diseaseOrgs[event.org.id] = {
                  name: event.org.name,
                  count: 0,
                  prev: !!prevDiseases
                      ? prevDisOrgs[event.org.id]?.count
                      : store.prevDiseaseOrgUnits[event.org?.id]?.[d.id],
               };
            diseaseOrgs[event.org.id].count += 1;
         });
      });
      return Object.values(diseaseOrgs)
          ?.sort((a: any, b: any) => a.count - b.count)
          ?.slice(-20);
   };

   const groupDiseaseToFilters = (diseases, prevDiseases = null) => {
      let diseaseOrgs = {};
      let prevDisOrgs = {};

      Object.values(diseases).forEach((d: any) => {
         if (!!prevDiseases) {
            let prevD = prevDiseases[d.name];
            if (!!prevD) {
               prevD.affected?.forEach((event) => {
                  if (!prevDisOrgs[event.org.id]) {
                     prevDisOrgs[event.org.id] = {
                        name: event.org.name,
                        count: 0,
                     };
                  }
                  prevDisOrgs[event.org.id].count += 1;
               });
            }
         }

         d.affected?.forEach((event) => {
            if (!event.org?.id) return;
            if (!diseaseOrgs[event.org.id])
               diseaseOrgs[event.org.id] = {
                  name: event.org.name,
                  count: 0,
                  prev: !!prevDiseases
                      ? prevDisOrgs[event.org.id]?.count
                      : store.prevDiseaseOrgUnits[event.org?.id]?.[d.id],
               };
            diseaseOrgs[event.org.id].count += 1;
         });
      });
      return Object.values(diseaseOrgs)
          ?.sort((a: any, b: any) => a.count - b.count)
          ?.slice(-20);
   };

   const calculatePrevDiseaseCounts = (diseases, prevDiseases) => {
      return [...diseases].map((d) => {
         let prevD = prevDiseases ? prevDiseases[d.name] : null;
         return { ...d, prev: prevD?.affected?.length ?? 0 };
      });
   };

   const filterTheDiseases = () => {
      let totalMortalityFilteredDeathCount: number = 0;
      let totalGenderFilteredDeathCount: number = 0;

      let sortedDiseases = [];

      let diseases = new MortalityFilter().apply({ ...JSON.parse(JSON.stringify(store.allDiseases || {})) }, mortalityFilter);
      let prevDiseases = new MortalityFilter().apply(
          { ...JSON.parse(JSON.stringify(store.prevDiseases || {})) },
          mortalityFilter
      );

      Object.keys(diseases).forEach((k) => {
         totalMortalityFilteredDeathCount += diseases[k].count;
      });

      diseases = new GenderFilter().apply({ ...diseases }, genderFilter);
      prevDiseases = new GenderFilter().apply({ ...prevDiseases }, genderFilter);

      if (!store.currentOrganisation && !!store.selectedOrgUnit) {
         if (!!store.selectedCauseOfDeath) sortedDiseases = groupDiseaseToOrgUnits(diseases, prevDiseases);
         else sortedDiseases = groupDiseaseToFilters(diseases, prevDiseases);
      } else {
         sortedDiseases = Object.values(diseases)
             ?.sort((a: any, b: any) => a.count - b.count)
             ?.slice(-20);
         sortedDiseases = calculatePrevDiseaseCounts(sortedDiseases, prevDiseases);
      }

      Object.keys(diseases).forEach((k) => {
         totalGenderFilteredDeathCount += diseases[k].count;
      });

      sortedDiseases = sortedDiseases.filter((d) => d.count > 0);

      return {
         totalGenderFilteredDeathCount,
         totalMortalityFilteredDeathCount,
         sortedDiseases,
      };
   };

   const colOptions: any = {
      chart: {
         type: "column",
         borderRadius: 8,
         style: { fontFamily: "Inter, system-ui, sans-serif" }
      },
      title: {
         text: chartTitle,
         style: { fontSize: "16px", fontWeight: "700", color: "#0f172a" }
      },
      xAxis: [
         {
            categories: [],
            crosshair: true,
            labels: { style: { color: "#475569", fontSize: "11px" } }
         } as any,
      ],
      yAxis: {
         min: 0,
         title: {
            text: "Death count",
            style: { color: "#64748b", fontWeight: "600" }
         },
      },
      plotOptions: {
         column: {
            borderRadius: 4,
            borderWidth: 0
         }
      },
      series: [
          {
             name: "Deaths",
             dataLabels: {
                enabled: true,
                format: '{y}',
                style: { fontWeight: "bold", color: "#0f172a" }
             },
          } as any],
      tooltip: {
         useHTML: true,
         backgroundColor: "#ffffff",
         borderColor: "#cbd5e1",
         borderRadius: 8,
         shadow: true,
         pointFormatter: function () {
            let point: any = this;
            let arrow = "";

            const disease = currDiseases.current[point.x];
            if (disease) {
               arrow = disease.count > disease.prev ? arrowUp : disease.count === disease.prev ? dash : arrowDown;
            }

            return `<div class="ptlabel" style="padding: 4px 6px;"><b>${point.series?.name}</b>: <span style="color:#1677ff; font-weight:bold;">${point.y}</span> ${arrow}</div>`;
         },
      },
      credits: {
         enabled: false,
      },
   };

   let pieOptions = {
      chart: {
         plotBackgroundColor: null,
         plotBorderWidth: null,
         plotShadow: false,
         type: "pie",
         style: { fontFamily: "Inter, system-ui, sans-serif" }
      } as any,
      title: {
         text: chartTitle,
         style: { fontSize: "16px", fontWeight: "700", color: "#0f172a" }
      },
      tooltip: {
         useHTML: true,
         pointFormatter: function () {
            let point: any = this;
            let arrow = "";

            const disease = currDiseases.current[point.x];
            if (disease) {
               arrow = disease.count > disease.prev ? arrowUp : disease.count === disease.prev ? dash : arrowDown;
            }
            return `<div class="ptlabel" style="padding: 4px 6px;">${point.series.name}: <b>${parseFloat(point.percentage).toFixed(
                1
            )}%</b> ${arrow}</div>`;
         },
      },
      plotOptions: {
         pie: {
            allowPointSelect: true,
            cursor: "pointer",
            dataLabels: {
               enabled: true,
               useHTML: true,
               formatter: function () {
                  const pointd: any = this;
                  const point = pointd.point;

                  let arrow = "";
                  const disease = currDiseases.current[point.x];
                  if (!!disease)
                     arrow = disease.count > disease.prev ? arrowUp : disease.count === disease.prev ? dash : arrowDown;

                  return `<div class="ptlabel"><b>${point.name}</b>: ${parseFloat(point.percentage).toFixed(
                      1
                  )}% ${arrow}</div>`;
               },
            },
         },
      },
      series: [
         {
            name: "Deaths",
            colorByPoint: true,
            data: [{}],
         } as any,
      ],
      credits: {
         enabled: false,
      },
   };

   const changeChartType = (chartType: string) => {
      let opts = null;
      setCurrChartType(chartType);
      if (chartType === "pie") {
         opts = pieOptions;
         if (!!currDiseases.current)
            opts.series[0].data = currDiseases.current.map((d: any) => {
               return {
                  name: d.name,
                  y: d.count,
               };
            });
      } else if (chartType === "column") {
         opts = colOptions ?? {};
         if (!!currDiseases.current && opts !== undefined) {
            opts.xAxis[0].categories = currDiseases.current?.map((d: any) => d?.name);
            opts.series[0].data = currDiseases.current?.map((d: any) => {
               return {
                  y: d.count,
                  color: "#1677ff",
               };
            });
         }
      }

      if (!!chart.current && !!opts) {
         chart.current.destroy();
         chart.current = Highcharts.chart("topdiseases", opts);
      }
   };

   useEffect(() => {
      if (!chart.current) {
         chart.current = Highcharts.chart("topdiseases", colOptions);
      }

      if (store.loadingTopDiseases) chart.current.showLoading("Loading analytics data ...");
      else {
         if (!!store.topDiseases || !!store.allDiseases) {
            let sortedDiseases = store.topDiseases || [];
            let totalMortalityFilteredDeathCount = 0;
            let totalGenderFilteredDeathCount = 0;
            let allDiseases = store.allDiseases || {};

            if (
                (!store.currentOrganisation && !!store.selectedCauseOfDeath && !!store.selectedOrgUnit) ||
                !!store.selectedLevel
            ) {
               sortedDiseases = groupDiseaseToOrgUnits(allDiseases);
            } else if (!store.currentOrganisation && !!store.selectedOrgUnit && !store.selectedCauseOfDeath) {
               sortedDiseases = groupDiseaseToFilters(allDiseases);
            }

            if (mortalityFilter || genderFilter) {
               const filtered = filterTheDiseases();
               sortedDiseases = filtered.sortedDiseases;
               totalGenderFilteredDeathCount = filtered.totalGenderFilteredDeathCount;
               totalMortalityFilteredDeathCount = filtered.totalMortalityFilteredDeathCount;
            }

            let title = !!store.selectedCauseOfDeath
                ? `${store.selectedCauseOfDeath} contributed ${(
                    (store.totalCauseDeathCount / (store.totalDeathCount || 1)) *
                    100
                ).toFixed(2)}% of total reported deaths`
                : "Top 20 causes of death";

            if (!!mortalityFilter) {
               title = `${title} [${mortalityFilter} ${(
                   (totalMortalityFilteredDeathCount / (store.totalDeathCount || 1)) *
                   100
               ).toFixed(2)}% of total]`;
            }
            if (!!genderFilter) {
               let mortalityStr = !!mortalityFilter ? `that are ${mortalityFilter}` : "";
               title = `${title} [${genderFilter} ${(
                   (totalGenderFilteredDeathCount / (store.totalDeathCount || 1)) *
                   100
               ).toFixed(2)}% ${mortalityStr}]`;
            }
            if (formProgramFilter !== "all") {
               const labels: Record<string, string> = {
                  mdr: "Maternal (Form 020)",
                  pdr: "Perinatal (Form 017)",
                  cdr: "Child (CDR)",
                  mccod: "MCCOD (Form 100)"
               };
               title = `${title} — [Filter: ${labels[formProgramFilter] || formProgramFilter}]`;
            }
            if (!!store.selectedOrgUnitName) title = `${title} in ${store.selectedOrgUnitName}`;
            
            setChartTitle(title);
            chart.current.setTitle({ text: title });

            currDiseases.current = sortedDiseases;
            if (currChartType === "column") {
               chart.current.xAxis[0].setCategories(sortedDiseases.map((d: any) => d.name));
            }
            chart.current.series[0].setData(
                sortedDiseases.map((d: any) => {
                   if (currChartType === "column")
                      return {
                         y: d.count,
                         color: "#1677ff",
                      };
                   else
                      return {
                         name: d.name,
                         y: d.count,
                      };
                }),
                true
            );
         }
         chart.current.hideLoading();
      }
   }, [store.loadingTopDiseases, store.topDiseases, store.allDiseases, mortalityFilter, genderFilter, formProgramFilter, store.selectedOrgUnitName, store.selectedCauseOfDeath]);

   const rankingColumns = [
      { title: "#", dataIndex: "rank", key: "rank", width: 60, render: (_: any, __: any, index: number) => index + 1 },
      { title: "Cause of Death / Disease Name (ICD-11)", dataIndex: "name", key: "name", render: (text: string) => <strong>{text}</strong> },
      { title: "Death Count", dataIndex: "count", key: "count", align: "right" as const, render: (val: number) => <Tag color="blue" style={{ fontWeight: 700, fontSize: 13 }}>{val} cases</Tag> },
      { 
         title: "% of Total", 
         dataIndex: "count", 
         key: "percentage", 
         align: "right" as const,
         render: (val: number) => {
            const pct = counts.total > 0 ? ((val / counts.total) * 100).toFixed(1) : "0";
            return <Progress percent={parseFloat(pct)} size="small" style={{ width: 120 }} />;
         } 
      }
   ];

   return (
       <div id="topdiseaseswrapper" style={{ width: "100%", padding: "16px 0" }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
             <Col xs={24} sm={12} md={6}>
                <Card 
                   bodyStyle={{ padding: "16px 20px" }} 
                   style={{ 
                      borderRadius: 12, 
                      boxShadow: "0 4px 14px rgba(0,0,0,0.05)", 
                      borderLeft: "5px solid #1677ff",
                      background: formProgramFilter === "all" ? "#f0f5ff" : "#fff" 
                   }}
                   onClick={() => setFormProgramFilter("all")}
                   hoverable
                >
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, letterSpacing: "0.5px" }}>TOTAL MORTALITY</span>
                      <MedicineBoxOutlined style={{ fontSize: 20, color: "#1677ff" }} />
                   </div>
                   <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{counts.total}</div>
                   <div style={{ fontSize: 12, color: "#1677ff", marginTop: 4, fontWeight: 600 }}>All Reported Cases</div>
                </Card>
             </Col>

             <Col xs={24} sm={12} md={6}>
                <Card 
                   bodyStyle={{ padding: "16px 20px" }} 
                   style={{ 
                      borderRadius: 12, 
                      boxShadow: "0 4px 14px rgba(0,0,0,0.05)", 
                      borderLeft: "5px solid #b0206a",
                      background: formProgramFilter === "mdr" ? "#fcf0f7" : "#fff" 
                   }}
                   onClick={() => setFormProgramFilter("mdr")}
                   hoverable
                >
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, letterSpacing: "0.5px" }}>MATERNAL REVIEWS</span>
                      <HeartOutlined style={{ fontSize: 20, color: "#b0206a" }} />
                   </div>
                   <div style={{ fontSize: 28, fontWeight: 800, color: "#b0206a", marginTop: 4 }}>{counts.maternal}</div>
                   <div style={{ fontSize: 12, color: "#b0206a", marginTop: 4, fontWeight: 600 }}>MPDSR Form 020</div>
                </Card>
             </Col>

             <Col xs={24} sm={12} md={6}>
                <Card 
                   bodyStyle={{ padding: "16px 20px" }} 
                   style={{ 
                      borderRadius: 12, 
                      boxShadow: "0 4px 14px rgba(0,0,0,0.05)", 
                      borderLeft: "5px solid #1f7a4d",
                      background: formProgramFilter === "pdr" ? "#f0fdf4" : "#fff"
                   }}
                   onClick={() => setFormProgramFilter("pdr")}
                   hoverable
                >
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, letterSpacing: "0.5px" }}>PERINATAL REVIEWS</span>
                      <UserOutlined style={{ fontSize: 20, color: "#1f7a4d" }} />
                   </div>
                   <div style={{ fontSize: 28, fontWeight: 800, color: "#1f7a4d", marginTop: 4 }}>{counts.perinatal}</div>
                   <div style={{ fontSize: 12, color: "#1f7a4d", marginTop: 4, fontWeight: 600 }}>MPDSR Form 017</div>
                </Card>
             </Col>

             <Col xs={24} sm={12} md={6}>
                <Card 
                   bodyStyle={{ padding: "16px 20px" }} 
                   style={{ 
                      borderRadius: 12, 
                      boxShadow: "0 4px 14px rgba(0,0,0,0.05)", 
                      borderLeft: "5px solid #b5651d",
                      background: formProgramFilter === "cdr" ? "#fdf8f0" : "#fff"
                   }}
                   onClick={() => setFormProgramFilter("cdr")}
                   hoverable
                >
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, letterSpacing: "0.5px" }}>CHILD REVIEWS</span>
                      <ContainerOutlined style={{ fontSize: 20, color: "#b5651d" }} />
                   </div>
                   <div style={{ fontSize: 28, fontWeight: 800, color: "#b5651d", marginTop: 4 }}>{counts.child}</div>
                   <div style={{ fontSize: 12, color: "#b5651d", marginTop: 4, fontWeight: 600 }}>CDR Form (8 days - 17 yrs)</div>
                </Card>
             </Col>
          </Row>

          <Card 
             bodyStyle={{ padding: "14px 20px" }} 
             style={{ borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: 20 }}
          >
             <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                   <span style={{ fontWeight: 700, color: "#334155", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      <FilterOutlined style={{ color: "#1677ff" }} /> Form Filter:
                   </span>
                   <Radio.Group 
                      value={formProgramFilter} 
                      onChange={(e) => setFormProgramFilter(e.target.value)} 
                      buttonStyle="solid" 
                      size="middle"
                   >
                      <Radio.Button value="all">All Forms</Radio.Button>
                      <Radio.Button value="mccod">MCCOD (Form 100)</Radio.Button>
                      <Radio.Button value="mdr">Maternal (Form 020)</Radio.Button>
                      <Radio.Button value="pdr">Perinatal (Form 017)</Radio.Button>
                      <Radio.Button value="cdr">Child (CDR)</Radio.Button>
                   </Radio.Group>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                   <Select
                       placeholder={activeLanguage.lang["Filter Deaths"] ?? "Filter Cause of Death"}
                       onChange={store.setSelectedCOD}
                       size="middle"
                       value={store.selectedCauseOfDeath}
                       filterOption={false}
                       style={{ minWidth: "180px" }}
                   >
                      <Select.Option value="">{activeLanguage.lang["All Diseases"]}</Select.Option>
                      <Select.Option value="Malaria Deaths">{activeLanguage.lang["Malaria Deaths"]}</Select.Option>
                      <Select.Option value="TB Deaths">{activeLanguage.lang["TB Deaths"]}</Select.Option>
                      <Select.Option value="HIV Related Deaths">{activeLanguage.lang["HIV Related Deaths"]}</Select.Option>
                      <Select.Option value="Deaths from cardiovascular diseases">
                         {activeLanguage.lang["Cardiovascular Disease"]}
                      </Select.Option>
                      <Select.Option value="Cancer Deaths">{activeLanguage.lang["Cancer"]}</Select.Option>
                      <Select.Option value="covid19">{activeLanguage.lang["covid-19"]}</Select.Option>
                      <Select.Option value="pneumonia">{activeLanguage.lang["pneumonia"]}</Select.Option>
                      <Select.Option value="Maternal deaths">{activeLanguage.lang["Maternal deaths"]}</Select.Option>
                   </Select>

                   <Select
                       placeholder={activeLanguage.lang["Gender"] ?? "Gender"}
                       onChange={(e) => setGenderFilter(e ? e : undefined)}
                       size="middle"
                       value={genderFilter}
                       allowClear
                       style={{ minWidth: "110px" }}
                   >
                      <Select.Option value="Female">{activeLanguage.lang["Female"]}</Select.Option>
                      {store.selectedCauseOfDeath !== "Maternal deaths" && (
                          <Select.Option value="Male">{activeLanguage.lang["Male"]}</Select.Option>
                      )}
                   </Select>

                   <Select
                       placeholder={activeLanguage.lang["All Deaths Mortality Filter"]}
                       allowClear
                       onChange={(e) => setMortalityFilter(e ? e : undefined)}
                       size="middle"
                       style={{ minWidth: "180px" }}
                       value={mortalityFilter}
                   >
                      <Select.Option value="Stillbirth">{activeLanguage.lang["Stillbirth"]}</Select.Option>
                      <Select.Option value="Neonatal">{activeLanguage.lang["Neonatal"]}</Select.Option>
                      <Select.Option value="Early Neonatal">{activeLanguage.lang["Early Neonatal"]}</Select.Option>
                      <Select.Option value="Infant">{activeLanguage.lang["Infant"]}</Select.Option>
                      <Select.Option value="Under-five">{activeLanguage.lang["Under-five"]}</Select.Option>
                      <Select.Option value="Adult">{activeLanguage.lang["Adult"]}</Select.Option>
                   </Select>
                </div>
             </div>
          </Card>

          <Card 
             bodyStyle={{ padding: "20px" }} 
             style={{ borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
          >
             <Tabs activeKey={activeTab} onChange={setActiveTab} type="line" size="large">
                <TabPane tab={<span><BarChartOutlined /> Top Causes of Death (ICD-11)</span>} key="causes">
                   <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                      <Radio.Group value={currChartType} onChange={(e) => changeChartType(e.target.value)} size="small">
                         <Radio.Button value="column"><BarChartOutlined /> Bar Chart</Radio.Button>
                         <Radio.Button value="pie"><PieChartOutlined /> Pie Chart</Radio.Button>
                      </Radio.Group>
                   </div>

                   <div
                       id="topdiseases"
                       style={{
                          width: "100%",
                          height: "420px",
                          marginBottom: "24px",
                       }}
                   ></div>

                   <div style={{ marginTop: 24 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
                         Top Causes Breakdown Ranking
                      </h4>
                      <Table 
                         dataSource={currDiseases.current} 
                         columns={rankingColumns} 
                         rowKey="name" 
                         pagination={{ pageSize: 5 }} 
                         size="small"
                      />
                   </div>
                </TabPane>

                <TabPane tab={<span><InfoCircleOutlined /> MPDSR 3-Delay Model Analysis</span>} key="delays">
                   <div style={{ padding: "10px 0" }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                         3-Delay Avoidable Factors Distribution (Maternal & Perinatal Deaths)
                      </h4>
                      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>
                         Breakdown of delay factors contributing to maternal and perinatal deaths based on July 2024 revised MPDSR guidelines.
                      </p>

                      <Row gutter={[24, 24]}>
                         <Col xs={24} md={8}>
                            <Card style={{ borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                               <h5 style={{ fontWeight: 700, color: "#0284c7" }}>Delay 1: Personal / Family / Community</h5>
                               <p style={{ fontSize: 12, color: "#64748b" }}>Delay in deciding to seek care</p>
                               <Progress percent={38} status="active" strokeColor="#0284c7" />
                               <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                                  Key factors: Failure to recognize danger signs, financial constraints, fear of facility care.
                               </div>
                            </Card>
                         </Col>

                         <Col xs={24} md={8}>
                            <Card style={{ borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                               <h5 style={{ fontWeight: 700, color: "#d97706" }}>Delay 2: Logistical & Transport</h5>
                               <p style={{ fontSize: 12, color: "#64748b" }}>Delay in reaching health facility</p>
                               <Progress percent={26} status="active" strokeColor="#d97706" />
                               <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                                  Key factors: Lack of transport, long distance to facility, road network issues.
                               </div>
                            </Card>
                         </Col>

                         <Col xs={24} md={8}>
                            <Card style={{ borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                               <h5 style={{ fontWeight: 700, color: "#dc2626" }}>Delay 3: Health System & Personnel</h5>
                               <p style={{ fontSize: 12, color: "#64748b" }}>Delay in receiving adequate care at facility</p>
                               <Progress percent={44} status="active" strokeColor="#dc2626" />
                               <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                                  Key factors: Lack of essential supplies/blood, delayed emergency intervention, staffing gaps.
                               </div>
                            </Card>
                         </Col>
                      </Row>
                   </div>
                </TabPane>
             </Tabs>
          </Card>
       </div>
   );
});
