import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chart, registerables } from "chart.js";
import dashboardService from "../../services/dashboardService";
import "./dashboard.css";
Chart.register(...registerables);

// ─── SVG icons ───────────────────────────────────────────────────────────────
const CalIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#4899F7"
    strokeWidth="2"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const SearchIcon = ({ color = "#F4A837" }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const DocIcon = ({ color = "#7C6FF7" }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const PrintIcon = ({ color = "#2DC78D" }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
  >
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const CheckIcon = ({ color = "#2DC78D" }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const XIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F74242"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const LockIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const RefreshIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.5 15a9 9 0 1 1-2.2-8.3L23 10" />
  </svg>
);
const ClockIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const WarnIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#F4A837">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2" />
    <line x1="12" y1="17" x2="12.01" y2="17" stroke="white" strokeWidth="2" />
  </svg>
);

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
function DonutChart({ data = [0, 0, 0, 0, 0] }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = new Chart(ref.current, {
        type: "doughnut",
        data: {
          datasets: [
            {
              data,
              backgroundColor: [
                "#7C6FF7",
                "#F4A837",
                "#4899F7",
                "#2DC78D",
                "#F74242",
              ],
              borderWidth: 3,
              borderColor: "#fff",
              hoverOffset: 4,
            },
          ],
        },
        options: {
          cutout: "68%",
          plugins: { legend: { display: false } },
          responsive: true,
          maintainAspectRatio: true,
          animation: { duration: 0 },
        },
      });
    } else {
      chartRef.current.data.datasets[0].data = data;
      chartRef.current.update();
    }
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);
  return <canvas ref={ref} width={160} height={160} />;
}

// ─── LINE CHART ───────────────────────────────────────────────────────────────
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
            borderColor: "#4899F7",
            backgroundColor: "rgba(72,153,247,0.06)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#4899F7",
            borderWidth: 2,
          },
          {
            label: "For Releasing",
            data: trend.length
              ? trend.map((d) => d.for_releasing)
              : [0, 0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: "#2DC78D",
            backgroundColor: "rgba(45,199,141,0.06)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#2DC78D",
            borderWidth: 2,
          },
          {
            label: "Released",
            data: trend.length
              ? trend.map((d) => d.released)
              : [0, 0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: "#F4A837",
            backgroundColor: "rgba(244,168,55,0.06)",
            tension: 0.4,
            fill: false,
            pointRadius: 4,
            pointBackgroundColor: "#F4A837",
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

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function CertifyDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [dashboardData, setDashboardData] = useState(null);
  const [statusSummary, setStatusSummary] = useState(null);
  const [trendSummary, setTrendSummary] = useState(null);
  const [historySummary, setHistorySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [trendMenuOpen, setTrendMenuOpen] = useState(false);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const [statusPeriod, setStatusPeriod] = useState("all");
  const [trendPeriod, setTrendPeriod] = useState("last_7_days");
  const [historyPeriod, setHistoryPeriod] = useState("all");

  const periodOptions = [
    { value: "today", label: "Today" },
    { value: "last_7_days", label: "Last 7 days" },
    { value: "last_30_days", label: "Last 30 days" },
    { value: "this_month", label: "This month" },
    { value: "this_year", label: "This year" },
    { value: "all", label: "All time" },
  ];

  useEffect(() => {
    const cached = sessionStorage.getItem("dashboard_summary_cache");
    if (cached) {
      try {
        setDashboardData(JSON.parse(cached));
        setLoading(false);
      } catch {
        sessionStorage.removeItem("dashboard_summary_cache");
      }
    }

    const fetchDashboard = async () => {
      try {
        if (!cached) setLoading(true);
        const data = await dashboardService.getSummary();
        setDashboardData(data);
        sessionStorage.setItem(
          "dashboard_summary_cache",
          JSON.stringify(data),
        );
      } catch (err) {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  useEffect(() => {
    dashboardService
      .getSummary(statusPeriod)
      .then(setStatusSummary)
      .catch(() => {});
  }, [statusPeriod]);

  useEffect(() => {
    dashboardService
      .getSummary(trendPeriod)
      .then(setTrendSummary)
      .catch(() => {});
  }, [trendPeriod]);

  useEffect(() => {
    dashboardService
      .getSummary(historyPeriod)
      .then(setHistorySummary)
      .catch(() => {});
  }, [historyPeriod]);
  const tabs = [
    { name: "Dashboard", icon: <CalIcon /> },
    { name: "Checking of Request", icon: <LockIcon /> },
    { name: "Request Tracker", icon: <RefreshIcon /> },
    {
      name: "Ready",
      icon: (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    { name: "History", icon: <ClockIcon /> },
  ];

  const totals = dashboardData?.totals || {};
  const changes = dashboardData?.changes || {};
  const breakdown =
    statusSummary?.status_breakdown || dashboardData?.status_breakdown || {};
  const trend =
    trendSummary?.requests_over_time || dashboardData?.requests_over_time || [];

  const formatChangeBadge = (change) => {
    if (!change || change.direction === "flat") return "";
    return `${change.direction === "up" ? "▲" : "▼"} ${change.percent}%`;
  };

  const changeClass = (change) => (change?.direction === "down" ? "red" : "");

  const stats = [
    {
      num: String(totals.requests_today || 0),
      label: "Requests Today",
      badge: formatChangeBadge(changes.requests_today),
      badgeCls: changeClass(changes.requests_today),
      iconBg: "#EBF4FF",
      icon: <CalIcon />,
    },
    {
      num: String(totals.for_approval_review || 0),
      label: "For Approval / Review",
      badge: "",
      iconBg: "#F0EEFF",
      icon: <DocIcon />,
    },
    {
      num: String(totals.ready_for_printing || 0),
      label: "Ready for Printing",
      badge: formatChangeBadge(changes.ready_for_printing),
      badgeCls: changeClass(changes.ready_for_printing),
      iconBg: "#E8FBF3",
      icon: <PrintIcon />,
    },
    {
      num: String(totals.released_this_month || 0),
      label: "Released This Month",
      badge: formatChangeBadge(changes.released_this_month),
      badgeCls: changeClass(changes.released_this_month),
      iconBg: "#FFF3E8",
      icon: <CheckIcon color="#F4A837" />,
    },
    {
      num: totals.avg_processing_time_label || "—",
      label: "Avg Processing Time",
      badge: "",
      iconBg: "#EEF2FF",
      icon: <ClockIcon />,
    },
  ];

  const legendItems = [
    { color: "#7C6FF7", label: "Processing", val: breakdown.processing || 0 },
    { color: "#F4A837", label: "For Review", val: breakdown.for_review || 0 },
    {
      color: "#4899F7",
      label: "For Releasing",
      val: breakdown.for_releasing || 0,
    },
    { color: "#2DC78D", label: "Released", val: breakdown.released || 0 },
  ];

  const chartLegend = [
    { color: "#7C6FF7", label: "Processing" },
    { color: "#F4A837", label: "For Review" },
    { color: "#4899F7", label: "For Releasing" },
    { color: "#2DC78D", label: "Released" },
  ];

  const tableRows = (dashboardData?.monthly_overview || []).map((r) => ({
    code: r.sr_code || "-",
    name: r.student_name,
    cert: r.certificate_type,
    status:
      r.status === "PROCESSING"
        ? "processing"
        : r.status === "APPROVED"
          ? "review"
          : r.status === "FOR_RELEASING"
            ? "releasing"
            : r.status === "RELEASED"
              ? "released"
              : "",
  }));

  const statusLabel = {
    processing: "Processing",
    review: "For Review",
    releasing: "For Releasing",
    released: "Released",
  };

  const lbRows = (dashboardData?.performance_leaderboard || []).map((r, i) => ({
    code: `#${i + 1}`,
    name: r.name,
    val: r.count,
  }));

  const recentRows = (dashboardData?.recent_requests || []).map((r) => ({
    code: r.sr_code || "-",
    name: r.student_name,
    val: (r.status || "").replace(/_/g, " "),
  }));

  const certHistory =
    historySummary?.certificate_history ||
    dashboardData?.certificate_history ||
    [];
  const maxHistory = Math.max(...certHistory.map((x) => x.count), 1);
  const totalProcessed = certHistory.reduce((sum, x) => sum + x.count, 0);

  return (
    <div className="certify">
      {/* MAIN */}
      <div className="c-main">
        {loading && !dashboardData && (
          <div className="c-skeleton">
            <div className="c-skel-row">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="c-skel-card" />
              ))}
            </div>
            <div className="c-skel-row c-skel-mid">
              <div className="c-skel-card c-skel-tall" />
              <div className="c-skel-card c-skel-wide" />
            </div>
            <div className="c-skel-row c-skel-bottom">
              <div className="c-skel-card c-skel-wide" />
              <div className="c-skel-card" />
              <div className="c-skel-card" />
            </div>
          </div>
        )}
        {error && (
          <div className="c-card" style={{ color: "#F74242" }}>
            {error}
          </div>
        )}

        {/* STATS */}
        <div className="c-stats">
          {stats.map((s, i) => (
            <div className="c-stat" key={i}>
              <div className="c-stat-icon" style={{ background: s.iconBg }}>
                {s.icon}
              </div>
              <div>
                <div className="c-stat-num">
                  {s.num}
                  {s.sup && (
                    <sup style={{ fontSize: 12, verticalAlign: "super" }}>
                      {s.sup}
                    </sup>
                  )}
                </div>
                <div className="c-stat-label">
                  {s.label}
                  {s.badge && (
                    <span className={`c-badge ${s.badgeCls || ""}`}>
                      {" "}
                      {s.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MID ROW */}
        <div className="c-mid">
          {/* Donut */}
          <div className="c-card">
            <div className="c-card-header">
              <span className="c-card-title">Request Status</span>
              <div className="relative">
                <button
                  className="c-dots"
                  onClick={() => setStatusMenuOpen((v) => !v)}
                >
                  ···
                </button>
                {statusMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    {periodOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setStatusPeriod(opt.value);
                          setStatusMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="c-donut-wrap">
              <div className="c-donut-canvas">
                <DonutChart data={legendItems.map((l) => l.val)} />
              </div>
              <div className="c-legend">
                {legendItems.map((l, i) => (
                  <div className="c-legend-item" key={i}>
                    <div className="c-legend-left">
                      <div
                        className="c-legend-dot"
                        style={{ background: l.color }}
                      />
                      {l.label}
                    </div>
                    <div className="c-legend-val">{l.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Line chart */}
          <div className="c-card">
            <div className="c-card-header">
              <span className="c-card-title">Requests Over Time</span>
              <div className="relative">
                <button
                  className="c-dots"
                  onClick={() => setTrendMenuOpen((v) => !v)}
                >
                  ···
                </button>
                {trendMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    {periodOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setTrendPeriod(opt.value);
                          setTrendMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="c-line-wrap">
              <LineChart trend={trend} />
            </div>
            <div className="c-chart-legend">
              {chartLegend.map((c, i) => (
                <div className="c-chart-legend-item" key={i}>
                  <div
                    className="c-chart-dot"
                    style={{ background: c.color }}
                  />
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="c-bottom">
          {/* TABLE */}
          <div className="c-card c-table-card" style={{ padding: 0 }}>
            <div style={{ padding: "18px 18px 12px" }}>
              <div className="c-card-header">
                <div>
                  <span className="c-card-title">Monthly Overview</span>
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: 11,
                      color: "#2DC78D",
                      fontWeight: 600,
                    }}
                  >
                    ▲0.04▲
                  </span>
                  <span
                    style={{ fontSize: 11, color: "#8892A4", marginLeft: 6 }}
                  >
                    | Last year · past month ›
                  </span>
                </div>
              </div>
              <table className="c-table">
                <thead>
                  <tr>
                    <th>SR Code</th>
                    <th>Name</th>
                    <th>Certificate Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.code}</td>
                      <td>{r.name}</td>
                      <td>{r.cert}</td>
                      <td>
                        {r.status && (
                          <span className={`c-badge-pill ${r.status}`}>
                            {statusLabel[r.status]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="c-table-alert">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <WarnIcon size={14} />{" "}
                {dashboardData?.alerts?.pending_over_5_days || 0} requests
                pending for over 5 days
              </div>
              <span style={{ fontWeight: 400, fontSize: 12, color: "#8892A4" }}>
                &nbsp;
              </span>
            </div>
          </div>

          {/* LB + RECENT */}
          <div className="c-lb-card">
            <div className="c-lb-section">
              <div className="c-card-header" style={{ marginBottom: 10 }}>
                <span className="c-card-title">Recent Requests</span>
                <button
                  className="c-view-all"
                  onClick={() => navigate("/dashboard/requests")}
                >
                  View All ›
                </button>
              </div>
              <div className="c-lb-row c-lb-head">
                <span>SR Code</span>
                <span>Name</span>
                <span>Stage</span>
              </div>
              {recentRows.map((r, i) => (
                <div className="c-lb-row" key={i}>
                  <span className="c-lb-code">{r.code}</span>
                  <span>{r.name}</span>
                  <span
                    style={{ fontSize: 10, fontWeight: 600, color: "#1A1D2E" }}
                  >
                    {r.val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* OVERALL HISTORY */}
          <div className="c-card">
            <div className="c-card-header">
              <span className="c-card-title">Overall History</span>
              <div className="relative">
                <button
                  className="c-dots"
                  onClick={() => setHistoryMenuOpen((v) => !v)}
                >
                  ···
                </button>
                {historyMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    {periodOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setHistoryPeriod(opt.value);
                          setHistoryMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {certHistory.map((item, i) => {
                const colors = [
                  "#7C6FF7",
                  "#4899F7",
                  "#2DC78D",
                  "#F4A837",
                  "#F72D6B",
                ];
                const color = colors[i % colors.length];
                const pct = Math.round((item.count / maxHistory) * 100);
                return (
                  <div key={i}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 500, color: "#1A1D2E" }}>
                        {item.certificate_type}
                      </span>
                      <span style={{ fontWeight: 700, color }}>
                        {item.count}
                      </span>
                    </div>
                    <div
                      style={{
                        background: "#F4F6FA",
                        borderRadius: 999,
                        height: 7,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: color,
                          borderRadius: 999,
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 10,
                  borderTop: "1px solid #E8ECF2",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "#8892A4",
                }}
              >
                <span>Total Processed</span>
                <span style={{ fontWeight: 700, color: "#1A1D2E" }}>
                  {totalProcessed}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
