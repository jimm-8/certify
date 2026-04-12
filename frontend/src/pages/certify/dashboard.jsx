import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dashboardService from "../../services/dashboardService";
import StatusChartCard from "./analytics/StatusChartCard";
import TrendChartCard from "./analytics/TrendChartCard";
import OverallHistoryCard from "./analytics/OverallHistoryCard";
import {
  FaCalendarDays,
  FaFileLines,
  FaPrint,
  FaCircleCheck,
  FaClock,
  FaTriangleExclamation,
} from "react-icons/fa6";

export default function CertifyDashboard() {
  const navigate = useNavigate();
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
        sessionStorage.setItem("dashboard_summary_cache", JSON.stringify(data));
      } catch {
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

  const stats = [
    {
      num: String(totals.requests_today || 0),
      label: "Requests Today",
      badge: formatChangeBadge(changes.requests_today),
      badgeDown: changes.requests_today?.direction === "down",
      iconBg: "bg-blue-50",
      icon: <FaCalendarDays className="text-[#4899F7]" />,
    },
    {
      num: String(totals.for_approval_review || 0),
      label: "For Approval / Review",
      badge: "",
      iconBg: "bg-purple-50",
      icon: <FaFileLines className="text-[#7C6FF7]" />,
    },
    {
      num: String(totals.ready_for_printing || 0),
      label: "Ready for Printing",
      badge: formatChangeBadge(changes.ready_for_printing),
      badgeDown: changes.ready_for_printing?.direction === "down",
      iconBg: "bg-emerald-50",
      icon: <FaPrint className="text-[#2DC78D]" />,
    },
    {
      num: String(totals.released_this_month || 0),
      label: "Released This Month",
      badge: formatChangeBadge(changes.released_this_month),
      badgeDown: changes.released_this_month?.direction === "down",
      iconBg: "bg-orange-50",
      icon: <FaCircleCheck className="text-[#F4A837]" />,
    },
    {
      num: totals.avg_processing_time_label || "—",
      label: "Avg Processing Time",
      badge: "",
      iconBg: "bg-indigo-50",
      icon: <FaClock className="text-[#8892A4]" />,
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

  const statusPillClass = {
    processing: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
    review: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    releasing: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    released: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  };

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

  // ── Skeleton ──────────────────────────────────────────────────────────────
  const SkelCard = ({ className = "" }) => (
    <div
      className={`rounded border border-gray-200 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-[shimmer_1.4s_ease_infinite] ${className}`}
    />
  );

  return (
    <div className="text-[#1A1D2E] text-sm -mt-3">
      {/* MAIN */}
      <div className="flex flex-col gap-3 pb-3">
        {/* SKELETON */}
        {loading && !dashboardData && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkelCard key={i} className="h-[86px]" />
              ))}
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "1fr 1.5fr" }}
            >
              <SkelCard className="h-60" />
              <SkelCard className="h-60" />
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "1.5fr 1fr 0.7fr" }}
            >
              <SkelCard className="h-60" />
              <SkelCard className="h-[86px]" />
              <SkelCard className="h-[86px]" />
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-white border border-gray-200 rounded p-3 text-[#F74242]">
            {error}
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-5 gap-3 mb-0">
          {stats.map((s, i) => (
            <div
              key={i}
              className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-[0_8px_22px_rgba(15,23,42,0.05)] flex items-start gap-3"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg}`}
              >
                {s.icon}
              </div>
              <div>
                <div className="text-xl font-semibold leading-none text-[#0B1B3A]">
                  {s.num}
                </div>
                <div className="text-xs text-[#6B778C] mt-1">
                  {s.label}
                  {s.badge && (
                    <span
                      className={`text-xs font-semibold ml-1 ${s.badgeDown ? "text-[#B42318]" : "text-[#0F9D58]"}`}
                    >
                      {s.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MID ROW */}
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "1fr 1.5fr" }}
        >
          <StatusChartCard
            legendItems={legendItems}
            periodOptions={periodOptions}
            statusMenuOpen={statusMenuOpen}
            setStatusMenuOpen={setStatusMenuOpen}
            setStatusPeriod={setStatusPeriod}
          />
          <TrendChartCard
            trend={trend}
            chartLegend={chartLegend}
            periodOptions={periodOptions}
            trendMenuOpen={trendMenuOpen}
            setTrendMenuOpen={setTrendMenuOpen}
            setTrendPeriod={setTrendPeriod}
          />
        </div>

        {/* BOTTOM ROW */}
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "1.5fr 1fr 0.7fr" }}
        >
          {/* TABLE CARD */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-[0_10px_28px_rgba(15,23,42,0.06)] overflow-hidden">
            <div className="p-[18px_18px_12px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold">
                    Monthly Overview
                  </span>
                  <span className="text-[11px] font-semibold text-[#0F9D58] ml-2">
                    ▲0.04▲
                  </span>
                  <span className="text-[11px] text-[#7B8596] ml-1">
                    | Last year · past month ›
                  </span>
                </div>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["SR Code", "Name", "Certificate Type", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left text-[11px] font-semibold text-[#7B8596] px-2 py-1.5 border-b border-[#E6EAF0] uppercase tracking-[0.12em]"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <tr key={i}>
                      <td
                        className="px-2 py-2 text-[11px] text-[#7B8596] border-b border-[#F2F4F8]"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {r.code}
                      </td>
                      <td className="px-2 py-2 text-xs border-b border-[#F2F4F8] text-[#1F2A44]">
                        {r.name}
                      </td>
                      <td className="px-2 py-2 text-xs border-b border-[#F2F4F8] text-[#1F2A44]">
                        {r.cert}
                      </td>
                      <td className="px-2 py-2 text-xs border-b border-[#F2F4F8]">
                        {r.status && (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${statusPillClass[r.status]}`}
                          >
                            {statusLabel[r.status]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-[#FFF7E8] border-t border-[#F3D6A4] px-[18px] py-2.5 flex items-center justify-between text-xs font-semibold text-[#A66B11]">
              <div className="flex items-center gap-1.5">
                <FaTriangleExclamation className="text-[#F4A837]" size={13} />
                {dashboardData?.alerts?.pending_over_5_days || 0} requests
                pending for over 5 days
              </div>
            </div>
          </div>

          {/* RECENT REQUESTS */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-[0_10px_28px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-semibold text-[#0B1B3A]">
                  Recent Requests
                </span>
                <button
                  className="text-[11px] text-[#0B1B3A] font-semibold cursor-pointer bg-none border-none hover:text-[#C7A352]"
                  onClick={() => navigate("/dashboard/requests")}
                >
                  View All ›
                </button>
              </div>
              <div
                className="grid text-[11px] font-semibold text-[#7B8596] pb-1.5 border-b border-[#E6EAF0] mb-1 uppercase tracking-[0.12em]"
                style={{ gridTemplateColumns: "90px 1fr 90px" }}
              >
                <span>SR Code</span>
                <span>Name</span>
                <span>Stage</span>
              </div>
              {recentRows.map((r, i) => (
                <div
                  key={i}
                  className="grid items-center py-2 border-b border-[#F2F4F8] text-xs last:border-0"
                  style={{ gridTemplateColumns: "90px 1fr 90px" }}
                >
                  <span
                    className="text-[11px] text-[#7B8596]"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {r.code}
                  </span>
                  <span className="text-[#1F2A44]">{r.name}</span>
                  <span className="text-[10px] font-semibold text-[#1F2A44]">
                    {r.val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* OVERALL HISTORY */}
          <OverallHistoryCard
            certHistory={certHistory}
            maxHistory={maxHistory}
            totalProcessed={totalProcessed}
            periodOptions={periodOptions}
            historyMenuOpen={historyMenuOpen}
            setHistoryMenuOpen={setHistoryMenuOpen}
            setHistoryPeriod={setHistoryPeriod}
          />
        </div>
      </div>
    </div>
  );
}
