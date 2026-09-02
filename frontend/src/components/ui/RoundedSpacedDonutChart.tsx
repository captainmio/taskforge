import type { ApexOptions } from "apexcharts";
import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

export interface DonutChartDatum {
  label: string;
  value: number;
  color: string;
}

interface RoundedSpacedDonutChartProps {
  data: DonutChartDatum[];
  totalLabel: string;
}

const RoundedSpacedDonutChart = ({
  data,
  totalLabel,
}: RoundedSpacedDonutChartProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "donut",
        fontFamily: "inherit",
        toolbar: { show: false },
      },
      labels: data.map((item) => item.label),
      colors: data.map((item) => item.color),
      dataLabels: { enabled: false },
      legend: {
        position: "bottom",
        fontSize: "13px",
        fontWeight: 600,
        labels: { colors: "#4b5563" },
        markers: { size: 9 },
        itemMargin: { horizontal: 10, vertical: 4 },
      },
      noData: {
        text: "No tasks yet",
        style: { color: "#6b7280", fontSize: "14px" },
      },
      plotOptions: {
        pie: {
          borderRadius: 8,
          spacing: 3,
          donut: {
            size: "62%",
            labels: {
              show: true,
              total: {
                show: true,
                label: totalLabel,
                formatter: () => String(total),
              },
            },
          },
        },
      },
      stroke: { width: 0 },
      tooltip: {
        y: {
          formatter: (value) => `${value} task${value === 1 ? "" : "s"}`,
        },
      },
    }),
    [data, total, totalLabel],
  );

  return (
    <div role="img" aria-label={`${total} ${totalLabel.toLowerCase()}`}>
      <ReactApexChart
        options={options}
        series={data.map((item) => item.value)}
        type="donut"
        height={340}
      />
    </div>
  );
};

export default RoundedSpacedDonutChart;
