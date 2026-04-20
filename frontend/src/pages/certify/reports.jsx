import React, { useEffect, useMemo, useRef, useState } from "react";
import reportService from "../../services/reportService";
import { useNavigate } from "react-router-dom";
import {
  BsChevronLeft,
  BsBarChart,
  BsCollection,
  BsCheckCircle,
  BsClockHistory,
  BsXCircle,
} from "react-icons/bs";
import { Chart } from "./analytics/chartSetup";
import DonutChart from "./analytics/DonutChart";
import FeedbackDialog from "../../components/common/feedbackDialog";

const Reports = () => {
  const [period, setPeriod] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const certificateChartRef = useRef(null);
  const programChartRef = useRef(null);
  const certChartInstance = useRef(null);
  const progChartInstance = useRef(null);
  const agingAreaRef = useRef(null);
  const agingAreaInstance = useRef(null);
  const certScatterRef = useRef(null);
  const certScatterInstance = useRef(null);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "default",
  });

  useEffect(() => {
    if (!data || !certScatterRef.current) return;

    const items = data.diagnostic.bottleneck_by_certificate;

    certScatterInstance.current?.destroy();

    certScatterInstance.current = new Chart(certScatterRef.current, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Certificates",
            data: items.map((item) => ({
              x: item.count,
              y: item.avg_age_days,
              label: item.certificate_type,
            })),
            backgroundColor: items.map((item) => {
              if (item.avg_age_days >= 10) return "#ef4444"; // critical
              if (item.avg_age_days >= 7) return "#f97316"; // high
              if (item.avg_age_days >= 4) return "#facc15"; // medium
              return "#22c55e"; // low
            }),
            pointRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const d = ctx.raw;
                return `${d.label}: ${d.x} req, ${d.y} days`;
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Request Volume" },
            ticks: { font: { size: 10 } },
          },
          y: {
            title: { display: true, text: "Avg Delay (days)" },
            ticks: { font: { size: 10 } },
          },
        },
      },
    });
  }, [data]);

  const programBottleneckRef = useRef(null);
  const programBottleneckInstance = useRef(null);

  useEffect(() => {
    if (!data || !programBottleneckRef.current) return;

    const items = data.diagnostic.bottleneck_by_program;

    const labels = items.map((i) => formatProgramName(i.program));
    const counts = items.map((i) => i.count);
    const delays = items.map((i) => i.avg_age_days);

    programBottleneckInstance.current?.destroy();

    programBottleneckInstance.current = new Chart(
      programBottleneckRef.current,
      {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Requests",
              data: counts,
              backgroundColor: "#4899F7",
              borderRadius: 6,
            },
            {
              label: "Avg Delay (days)",
              data: delays,
              backgroundColor: "#ee1133",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom" },
            datalabels: { display: false },
          },
          scales: {
            x: { ticks: { font: { size: 10 } } },
            y: { ticks: { font: { size: 10 } } },
          },
        },
      },
    );
  }, [data]);

  useEffect(() => {
    if (!data || !agingAreaRef.current) return;

    const entries = Object.entries(data.diagnostic.aging_buckets);

    const labels = entries.map(([k]) => k.replace(/_/g, " "));
    const values = entries.map(([, v]) => v);

    agingAreaInstance.current?.destroy();

    agingAreaInstance.current = new Chart(agingAreaRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: "#4899F7",
            backgroundColor: "rgba(72,153,247,0.2)",
            fill: true,
            tension: 0.4,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 10 } } },
          y: { ticks: { font: { size: 10 } } },
        },
      },
    });
  }, [data]);

  const bottleneckBarRef = useRef(null);
  const bottleneckBarInstance = useRef(null);

  useEffect(() => {
    if (!data || !bottleneckBarRef.current) return;

    const entries = Object.entries(data.diagnostic.bottleneck_by_status).sort(
      (a, b) => b[1] - a[1],
    ); // 🔥 sort descending

    const labels = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);

    bottleneckBarInstance.current?.destroy();

    bottleneckBarInstance.current = new Chart(bottleneckBarRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: "#ee1133",
            borderRadius: 6,
            maxBarThickness: 40,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
        },
        scales: {
          x: {
            ticks: {
              font: { size: 10 },
              color: "#6b7280",
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: { size: 10 },
              color: "#6b7280",
            },
            grid: { color: "#f0f2f7" },
          },
        },
      },
    });
  }, [data]);

  const periodOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_30_days", label: "Last 30 Days" },
    { value: "this_month", label: "This Month" },
    { value: "this_year", label: "This Year" },
  ];

  const formatProgramName = (program) => {
    if (!program) return "";

    let formatted = program;

    formatted = formatted
      .replace(/Bachelor of Science/gi, "BS")
      .replace(/Bachelor of Arts/gi, "BA")
      .replace(/Bachelor of/gi, "");

    formatted = formatted
      .replace(/\bin\b/gi, " ") // ✅ FIXED
      .replace(/\s+/g, " ")
      .trim();

    return formatted;
  };

  useEffect(() => {
    if (!data || !certificateChartRef.current) return;

    const labels = data.descriptive.certificate_types.map((i) => i.name);
    const values = data.descriptive.certificate_types.map((i) => i.count);

    certChartInstance.current?.destroy();

    certChartInstance.current = new Chart(certificateChartRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: "#4899F7",
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { font: { size: 10 } },
            grid: { color: "#F0F2F7" },
          },
          y: {
            ticks: { font: { size: 10 } },
            grid: { display: false },
          },
        },
      },
    });
  }, [data]);

  useEffect(() => {
    if (!data || !programChartRef.current) return;

    const labels = data.descriptive.programs.map((i) =>
      formatProgramName(i.name),
    );
    const values = data.descriptive.programs.map((i) => i.count);

    progChartInstance.current?.destroy();

    progChartInstance.current = new Chart(programChartRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: "#ee1133",
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { font: { size: 10 } },
            grid: { color: "#F0F2F7" },
          },
          y: {
            ticks: { font: { size: 10 } },
            grid: { display: false },
          },
        },
      },
    });
  }, [data]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    reportService
      .getSummary(period)
      .then((res) => {
        if (!active) return;
        setData(res);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.detail || "Failed to load reports.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  const statusBreakdown = useMemo(() => {
    const order = [
      "SUBMITTED",
      "PENDING",
      "APPROVED",
      "PROCESSING",
      "FOR_RELEASING",
      "RELEASED",
    ];
    const raw = data?.descriptive?.status_breakdown || {};
    const entries = order
      .filter((key) => raw[key] !== undefined)
      .map((key) => ({ status: key, count: raw[key] }));
    if (!entries.length) {
      Object.entries(raw).forEach(([status, count]) => {
        entries.push({ status, count });
      });
    }
    const total = entries.reduce((sum, item) => sum + item.count, 0) || 1;
    return { entries, total };
  }, [data]);

  const chartRef = useRef(null);
  const forecastChartRef = useRef(null);

  useEffect(() => {
    if (!data || !chartRef.current) return;
    const history = data.descriptive.daily_requests || [];
    const forecast = data.predictive.forecast_next_7_days || [];
    const labels = [
      ...history.map((d) => d.date),
      ...forecast.map((d) => d.date),
    ];
    const historyData = history.map((d) => d.count);
    const forecastData = forecast.map((d) => d.blended);
    const actualSeries = [
      ...historyData,
      ...new Array(forecastData.length).fill(null),
    ];
    const forecastSeries = [
      ...new Array(historyData.length).fill(null),
      ...forecastData,
    ];

    if (forecastChartRef.current) {
      forecastChartRef.current.destroy();
    }

    forecastChartRef.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Actual Requests",
            data: actualSeries,
            borderColor: "#4899F7",
            backgroundColor: "rgba(72,153,247,0.08)",
            tension: 0.35,
            fill: true,
            pointRadius: 2,
            borderWidth: 2,
          },
          {
            label: "Forecast (Blended)",
            data: forecastSeries,
            borderColor: "#ee1133",
            backgroundColor: "rgba(238,17,51,0.08)",
            tension: 0.35,
            fill: true,
            pointRadius: 2,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: "bottom" } },
        scales: {
          x: {
            ticks: { font: { size: 10 }, color: "#8892A4" },
            grid: { color: "#F0F2F7" },
          },
          y: {
            ticks: { font: { size: 10 }, color: "#8892A4" },
            grid: { color: "#F0F2F7" },
          },
        },
      },
    });

    return () => {
      forecastChartRef.current?.destroy();
      forecastChartRef.current = null;
    };
  }, [data]);

  const SkeletonCard = ({ className = "" }) => (
    <div
      className={`bg-white rounded-md border border-gray-200 shadow-sm p-5 animate-pulse ${className}`}
    >
      <div className="h-3 w-28 bg-gray-200 rounded mb-3" />
      <div className="h-6 w-20 bg-gray-200 rounded" />
    </div>
  );

  const SkeletonPanel = () => (
    <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 animate-pulse">
      <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
      <div className="space-y-2">
        <div className="h-2 w-full bg-gray-200 rounded" />
        <div className="h-2 w-5/6 bg-gray-200 rounded" />
        <div className="h-2 w-2/3 bg-gray-200 rounded" />
      </div>
    </div>
  );

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadSummary = async () => {
    try {
      const blob = await reportService.downloadSummary(period);
      downloadBlob(blob, `certify_summary_${period}.csv`);
    } catch (err) {
      setFeedbackModal({
        open: true,
        title: "Download Failed",
        message: "Failed to download summary report.",
        tone: "error",
      });
    }
  };

  return (
    <div className="py-3 space-y-4">
      <div className="bg-white rounded-md border border-gray-200 shadow-sm px-2 py-2">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
              className="text-lg font-bold  text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors  rounded"
            >
              <BsChevronLeft style={{ strokeWidth: "0.5" }} />
              <span>Reports</span>
            </button>
            <p className="text-xs text-gray-500 ml-5">
              Descriptive, diagnostic, and predictive insights for certificate
              requests.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleDownloadSummary}
              className="px-3 py-2 text-sm bg-[#ee1133] text-white rounded-md hover:bg-[#c50f2a]"
            >
              Download Summary
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SkeletonPanel />
            <SkeletonPanel />
            <SkeletonPanel />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonPanel />
            <SkeletonPanel />
          </div>
          <SkeletonPanel />
        </>
      )}

      {!loading && error && (
        <div className="bg-white rounded-md border border-red-200 shadow-sm p-6 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* TOTAL REQUESTS */}
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3 cursor-pointer hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BsCollection className="text-gray-400" />
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    Total Requests
                  </div>
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">
                  +{data.descriptive.requests_today ?? 0} today
                </span>
              </div>

              <div className="text-2xl font-semibold text-gray-800 mt-1 ml-2">
                {data.descriptive.total_requests}
              </div>

              <div className="text-[11px] text-gray-500 mt-1 ml-2">
                Pending: {data.descriptive.pending} • Processing:{" "}
                {data.descriptive.processing || "-"}
              </div>
            </div>

            {/* RELEASED */}
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3 cursor-pointer hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BsCheckCircle className="text-gray-400" />
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    Released
                  </div>
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {data.descriptive.release_rate || 0}%
                </span>
              </div>

              <div className="text-2xl font-semibold text-gray-800 mt-1 ml-2">
                {data.descriptive.released_total}
              </div>

              <div className="text-[11px] text-gray-500 mt-1 ml-2">
                Completed requests
              </div>
            </div>

            {/* AVG PROCESSING TIME */}
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3 cursor-pointer hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BsClockHistory className="text-gray-400" />
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    Avg Processing Time
                  </div>
                </div>
                <span className="text-[11px] text-amber-600 font-medium">
                  SLA: {data.descriptive.sla_days ?? 2} days
                </span>
              </div>

              <div className="text-2xl font-semibold text-gray-800 mt-1 ml-2">
                {data.descriptive.avg_processing_time_label}
              </div>

              <div className="text-[11px] text-gray-500 mt-1 ml-2">
                System-wide average
              </div>
            </div>

            {/* ✅ REJECTION RATE (NEW KPI) */}
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3 cursor-pointer hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BsXCircle className="text-gray-400" />
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    Rejection Rate
                  </div>
                </div>
                <span className="text-[11px] text-red-600 font-medium">
                  Quality Metric
                </span>
              </div>

              <div className="text-2xl font-semibold text-gray-800 mt-1 ml-2">
                {data.descriptive.rejection_rate ?? 0}%
              </div>

              <div className="text-[11px] text-gray-500 mt-1 ml-2">
                Rejected vs total requests
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-800">
                  Descriptive Analytics
                </div>
                <span className="text-[11px] text-gray-400">Status</span>
              </div>

              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="w-[140px] h-[140px]">
                  <DonutChart
                    data={statusBreakdown.entries.map((item) => item.count)}
                  />
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  {statusBreakdown.entries.map((item) => {
                    const pct = Math.round(
                      (item.count / statusBreakdown.total) * 100,
                    );

                    return (
                      <div
                        key={item.status}
                        className="flex justify-between bg-gray-50 px-3 py-2 rounded"
                      >
                        <span className="text-gray-600">{item.status}</span>
                        <span className="font-semibold text-gray-800">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-800">
                  Top Certificate Types
                </div>
                <span className="text-[11px] text-gray-400">By volume</span>
              </div>

              <div className="h-56">
                <canvas ref={certificateChartRef}></canvas>
              </div>
            </div>

            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-800">
                  Top Programs
                </div>
                <span className="text-[11px] text-gray-400">By requests</span>
              </div>

              <div className="h-56">
                <canvas ref={programChartRef}></canvas>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* AGING BUCKETS - AREA CHART */}
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-800">
                  Aging Buckets
                </div>
                <span className="text-[11px] text-gray-400">Distribution</span>
              </div>

              <div className="h-56">
                <canvas ref={agingAreaRef}></canvas>
              </div>
            </div>

            {/* BOTTLENECKS - DONUT */}
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-800">
                  Bottlenecks by Status
                </div>
                <span className="text-[11px] text-gray-400">5+ days delay</span>
              </div>

              <div className="h-56">
                <canvas ref={bottleneckBarRef}></canvas>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* PROGRAMS */}
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-800">
                  Bottlenecked Programs
                </div>
                <span className="text-[11px] text-gray-400">
                  Delay vs Volume
                </span>
              </div>

              <div className="h-64">
                <canvas ref={programBottleneckRef}></canvas>
              </div>
            </div>
            {/* CERTIFICATES */}
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-800">
                  Bottlenecked Certificate Types
                </div>
                <span className="text-[11px] text-gray-400">
                  Delay vs Volume
                </span>
              </div>

              <div className="h-64">
                <canvas ref={certScatterRef}></canvas>
              </div>
              <p className="text-[11px] text-gray-500">
                The larger the average age in days, the slower the processing
                and the more severe the bottleneck.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-gray-800">
                Stalled Requests
              </div>

              {/* 🔥 FILTER TOGGLE */}
              <button
                onClick={() => setShowCriticalOnly(!showCriticalOnly)}
                className={`text-[11px] px-2 py-1 rounded ${
                  showCriticalOnly
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {showCriticalOnly ? "Showing Critical" : "Show Critical Only"}
              </button>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2">Reference</th>
                    <th className="py-2">Student</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Age</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {data.diagnostic.stalled_requests
                    .filter((row) =>
                      showCriticalOnly ? row.age_days >= 10 : true,
                    ) // 🔥 filter
                    .sort((a, b) => b.age_days - a.age_days)
                    .map((row) => {
                      const ageColor =
                        row.age_days >= 14
                          ? "text-red-600"
                          : row.age_days >= 10
                            ? "text-orange-500"
                            : "text-amber-500";

                      return (
                        <tr
                          key={row.reference_number}
                          className="border-t hover:bg-gray-50 transition"
                        >
                          <td className="py-2 text-gray-700 font-medium">
                            {row.reference_number}
                          </td>

                          <td className="py-2 text-gray-700">
                            {row.student_name}
                          </td>

                          <td className="py-2">
                            <span className="px-2 py-1 text-[11px] rounded-full bg-gray-100 text-gray-700">
                              {row.status}
                            </span>
                          </td>

                          <td className={`py-2 font-semibold ${ageColor}`}>
                            {row.age_days} days
                          </td>

                          {/* ✅ ACTION BUTTON */}
                          <td className="py-2 text-right">
                            <button
                              onClick={() =>
                                navigate(`/requests/${row.reference_number}`)
                              }
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {data.diagnostic.stalled_requests.length === 0 && (
                <div className="text-sm text-gray-500 py-3">
                  No stalled requests found.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  Predictive Analytics
                </div>
                <div className="text-xs text-gray-500">
                  Forecast of incoming requests for the next 7 days
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Trend window:{" "}
                <span className="font-medium">
                  {data.predictive.methodology.linear_trend_window_days} days
                </span>
              </div>
            </div>

            {/* 🔥 INSIGHT SUMMARY */}
            {(() => {
              const forecast = data.predictive.forecast_next_7_days;

              const avg = Math.round(
                forecast.reduce((sum, d) => sum + d.blended, 0) /
                  forecast.length,
              );

              const max = Math.max(...forecast.map((d) => d.blended));

              const trendUp = forecast.at(-1).blended > forecast[0].blended;

              return (
                <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2 text-xs text-blue-700 mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                  <span>
                    Avg expected requests:{" "}
                    <span className="font-semibold">{avg}</span>
                  </span>

                  <span>
                    Peak forecast: <span className="font-semibold">{max}</span>
                  </span>

                  <span
                    className={`font-medium ${
                      trendUp ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    Interpretation:{" "}
                    <span className="font-semibold">
                      {trendUp ? "Increasing demand" : "Stable / decreasing"}
                    </span>
                  </span>
                </div>
              );
            })()}

            {/* CHART */}
            <div className="h-64 mb-4">
              <canvas ref={chartRef} />
            </div>

            {/* TABLE */}
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Linear</th>
                    <th className="py-2">Moving Avg</th>
                    <th className="py-2">Exp Smooth</th>
                    <th className="py-2">Blended</th>
                  </tr>
                </thead>

                <tbody>
                  {data.predictive.forecast_next_7_days.map((row) => {
                    const max = Math.max(
                      ...data.predictive.forecast_next_7_days.map(
                        (r) => r.blended,
                      ),
                    );

                    const isPeak = row.blended === max;

                    return (
                      <tr
                        key={row.date}
                        className={`border-t ${
                          isPeak ? "bg-red-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="py-2 text-gray-700">{row.date}</td>

                        <td className="py-2 text-gray-500">{row.linear}</td>

                        <td className="py-2 text-gray-500">{row.moving_avg}</td>

                        <td className="py-2 text-gray-500">
                          {row.exp_smoothing}
                        </td>

                        {/* 🔥 MAIN VALUE */}
                        <td className="py-2 font-semibold text-gray-900">
                          {row.blended}
                          {isPeak && (
                            <span className="ml-2 text-[10px] text-red-600">
                              Peak
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <FeedbackDialog
        open={feedbackModal.open}
        title={feedbackModal.title}
        message={feedbackModal.message}
        tone={feedbackModal.tone}
        onClose={() =>
          setFeedbackModal((current) => ({ ...current, open: false }))
        }
      />
    </div>
  );
};

export default Reports;
