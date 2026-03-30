import React, { useEffect, useMemo, useRef, useState } from "react";
import reportService from "../../services/reportService";
import { useNavigate } from "react-router-dom";
import { BsChevronLeft } from "react-icons/bs";
import { Chart } from "./analytics/chartSetup";
import DonutChart from "./analytics/DonutChart";

const Reports = () => {
  const [period, setPeriod] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const periodOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_30_days", label: "Last 30 Days" },
    { value: "this_month", label: "This Month" },
    { value: "this_year", label: "This Year" },
  ];

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
      alert("Failed to download summary report.");
    }
  };

  const handleDownloadRequests = async () => {
    try {
      const blob = await reportService.downloadRequests();
      downloadBlob(blob, "certify_requests.csv");
    } catch (err) {
      alert("Failed to download raw requests.");
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
            <button
              onClick={handleDownloadRequests}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Download Raw Requests
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-5">
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Total Requests
              </div>
              <div className="text-2xl font-semibold text-gray-800 mt-2">
                {data.descriptive.total_requests}
              </div>
            </div>
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-5">
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Released
              </div>
              <div className="text-2xl font-semibold text-gray-800 mt-2">
                {data.descriptive.released_total}
              </div>
            </div>
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-5">
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Avg Processing Time
              </div>
              <div className="text-2xl font-semibold text-gray-800 mt-2">
                {data.descriptive.avg_processing_time_label}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
              <div className="text-sm font-semibold text-gray-800 mb-4">
                Descriptive Analytics
              </div>
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  data={statusBreakdown.entries.map((item) => item.count)}
                />
                <div className="w-full space-y-2 text-xs">
                  {statusBreakdown.entries.map((item) => {
                    const pct = Math.round(
                      (item.count / statusBreakdown.total) * 100,
                    );
                    return (
                      <div key={item.status} className="flex justify-between">
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

            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
              <div className="text-sm font-semibold text-gray-800 mb-4">
                Top Certificate Types
              </div>
              <div className="space-y-3 text-sm">
                {data.descriptive.certificate_types.map((item) => (
                  <div key={item.name} className="flex justify-between">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-semibold text-gray-800">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
              <div className="text-sm font-semibold text-gray-800 mb-4">
                Top Programs
              </div>
              <div className="space-y-3 text-sm">
                {data.descriptive.programs.map((item) => (
                  <div key={item.name} className="flex justify-between">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-semibold text-gray-800">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
              <div className="text-sm font-semibold text-gray-800 mb-4">
                Diagnostic Analytics: Aging Buckets
              </div>
              <div className="space-y-2 text-sm">
                {Object.entries(data.diagnostic.aging_buckets).map(
                  ([bucket, count]) => (
                    <div key={bucket} className="flex justify-between">
                      <span className="text-gray-600">
                        {bucket.replace("_", " ")}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {count}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
              <div className="text-sm font-semibold text-gray-800 mb-4">
                Bottlenecks by Status (5+ days)
              </div>
              <div className="space-y-2 text-sm">
                {Object.entries(data.diagnostic.bottleneck_by_status).map(
                  ([status, count]) => (
                    <div key={status} className="flex justify-between">
                      <span className="text-gray-600">{status}</span>
                      <span className="font-semibold text-gray-800">
                        {count}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
              <div className="text-sm font-semibold text-gray-800 mb-4">
                Bottlenecked Certificate Types
              </div>
              <div className="space-y-2 text-sm">
                {data.diagnostic.bottleneck_by_certificate.map((item) => (
                  <div
                    key={item.certificate_type}
                    className="flex justify-between"
                  >
                    <span className="text-gray-600">
                      {item.certificate_type}
                    </span>
                    <span className="font-semibold text-gray-800">
                      {item.avg_age_days}d ({item.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
              <div className="text-sm font-semibold text-gray-800 mb-4">
                Bottlenecked Programs
              </div>
              <div className="space-y-2 text-sm">
                {data.diagnostic.bottleneck_by_program.map((item) => (
                  <div key={item.program} className="flex justify-between">
                    <span className="text-gray-600">{item.program}</span>
                    <span className="font-semibold text-gray-800">
                      {item.avg_age_days}d ({item.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
            <div className="text-sm font-semibold text-gray-800 mb-4">
              Stalled Requests (7+ days)
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2">Reference</th>
                    <th className="py-2">Student</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Age (days)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.diagnostic.stalled_requests.map((row) => (
                    <tr key={row.reference_number} className="border-t">
                      <td className="py-2 text-gray-700">
                        {row.reference_number}
                      </td>
                      <td className="py-2 text-gray-700">{row.student_name}</td>
                      <td className="py-2 text-gray-700">{row.status}</td>
                      <td className="py-2 text-gray-700">{row.age_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.diagnostic.stalled_requests.length === 0 && (
                <div className="text-sm text-gray-500 py-3">
                  No stalled requests found.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  Predictive Analytics
                </div>
                <div className="text-xs text-gray-500">
                  Linear trend, moving average, and exponential smoothing for the
                  next 7 days.
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Window: {data.predictive.methodology.linear_trend_window_days}{" "}
                days
              </div>
            </div>
            <div className="h-64 mb-4">
              <canvas ref={chartRef} />
            </div>
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
                  {data.predictive.forecast_next_7_days.map((row) => (
                    <tr key={row.date} className="border-t">
                      <td className="py-2 text-gray-700">{row.date}</td>
                      <td className="py-2 text-gray-700">{row.linear}</td>
                      <td className="py-2 text-gray-700">{row.moving_avg}</td>
                      <td className="py-2 text-gray-700">
                        {row.exp_smoothing}
                      </td>
                      <td className="py-2 text-gray-700 font-semibold">
                        {row.blended}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
