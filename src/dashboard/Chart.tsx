import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

const base: Highcharts.Options = {
  credits: { enabled: false },
  chart: { backgroundColor: "transparent", style: { fontFamily: "inherit" }, spacing: [8, 8, 8, 8] },
  title: { text: undefined },
  legend: { itemStyle: { color: "#334155", fontWeight: "600" } },
  tooltip: { shared: false, borderRadius: 8 },
};

/** Thin wrapper so every dashboard chart shares the same base look. */
export const Chart = ({ options, height }: { options: Highcharts.Options; height: number }) => (
  <HighchartsReact
    highcharts={Highcharts}
    options={{
      ...base,
      ...options,
      chart: { ...base.chart, ...options.chart, height },
    }}
  />
);
