import { useEffect, useRef } from "react";
import { Chart } from "./chartSetup";

function LineChart({ trend = [] }) {
  const ref = useRef(null);

  useEffect(() => {
    const labels = trend.length
      ? trend.map((d) => d.label)
      : ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"];
    const chart = new Chart(ref.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Processing",
            data: trend.length
              ? trend.map((d) => d.processing)
              : [0, 0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: "#7C6FF7",
            backgroundColor: "rgba(124,111,247,0.08)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#7C6FF7",
            borderWidth: 2,
          },
          {
            label: "For Review",
            data: trend.length
              ? trend.map((d) => d.for_review)
              : [0, 0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: "#F4A837",
            backgroundColor: "rgba(244,168,55,0.06)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#F4A837",
            borderWidth: 2,
          },
          {
            label: "For Releasing",
            data: trend.length
              ? trend.map((d) => d.for_releasing)
              : [0, 0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: "#4899F7",
            backgroundColor: "rgba(72,153,247,0.06)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#4899F7",
            borderWidth: 2,
          },
          {
            label: "Released",
            data: trend.length
              ? trend.map((d) => d.released)
              : [0, 0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: "#2DC78D",
            backgroundColor: "rgba(45,199,141,0.06)",
            tension: 0.4,
            fill: false,
            pointRadius: 4,
            pointBackgroundColor: "#2DC78D",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: "#F0F2F7" },
            ticks: { font: { size: 11 }, color: "#8892A4" },
          },
          y: {
            min: 0,
            max: 175,
            grid: { color: "#F0F2F7" },
            ticks: { font: { size: 11 }, color: "#8892A4", stepSize: 25 },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [trend]);

  return <canvas ref={ref} />;
}

export default LineChart;
