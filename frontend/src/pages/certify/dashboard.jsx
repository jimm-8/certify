import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

// ─── tiny style helper ───────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  .certify * { box-sizing: border-box; margin: 0; padding: 0; }
  .certify {
    font-family: 'DM Sans', sans-serif;
    background: #F4F6FA;
    color: #1A1D2E;
    min-height: 100vh;
    font-size: 13px;
  }

  /* HEADER */
  .c-header {
    background: #F72D6B;
    padding: 0 24px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .c-logo { font-size: 22px; font-weight: 700; color: white; font-style: italic; letter-spacing: -0.5px; }
  .c-header-right { display: flex; align-items: center; gap: 12px; color: white; text-align: right; }
  .c-header-date { font-size: 13px; font-weight: 500; }
  .c-header-time { font-size: 12px; opacity: 0.85; }
  .c-avatar {
    width: 36px; height: 36px;
    background: rgba(255,255,255,0.25);
    border: 2px solid rgba(255,255,255,0.6);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; color: white;
  }

  /* NAV */
  .c-nav {
    background: white;
    border-bottom: 1px solid #E8ECF2;
    padding: 0 24px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .c-tab {
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 500;
    color: #8892A4;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
  }
  .c-tab:hover { color: #1A1D2E; }
  .c-tab.active { color: #F72D6B; border-bottom-color: #F72D6B; background: #fff5f8; }
  .c-tab-dots { margin-left: auto; color: #8892A4; font-size: 20px; letter-spacing: 2px; }

  /* MAIN */
  .c-main { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; }

  /* STATS */
  .c-stats { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; }
  .c-stat {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .c-stat-icon {
    width: 36px; height: 36px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .c-stat-num { font-size: 22px; font-weight: 700; line-height: 1; }
  .c-stat-label { font-size: 11px; color: #8892A4; margin-top: 3px; }
  .c-badge { font-size: 10px; font-weight: 600; color: #2DC78D; }
  .c-badge.red { color: #F74242; }

  /* MID ROW */
  .c-mid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 18px; }

  /* CARD */
  .c-card {
    background: white;
    border-radius: 12px;
    padding: 18px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  }
  .c-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .c-card-title { font-size: 14px; font-weight: 600; }
  .c-dots { color: #8892A4; font-size: 18px; cursor: pointer; letter-spacing: 2px; }

  /* DONUT */
  .c-donut-wrap { display: flex; align-items: center; gap: 20px; }
  .c-donut-canvas { position: relative; width: 160px; height: 160px; flex-shrink: 0; }
  .c-legend { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .c-legend-item { display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
  .c-legend-left { display: flex; align-items: center; gap: 7px; }
  .c-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .c-legend-val { font-weight: 700; font-size: 13px; }
  .c-legend-footer {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #E8ECF2;
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: #8892A4;
    flex-wrap: wrap;
  }

  /* LINE CHART */
  .c-line-wrap { position: relative; height: 190px; }
  .c-chart-legend { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
  .c-chart-legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #8892A4; }
  .c-chart-dot { width: 8px; height: 8px; border-radius: 50%; }

  /* BOTTOM ROW */
  .c-bottom { display: grid; grid-template-columns: 1.5fr 1fr 0.7fr; gap: 18px; }

  /* TABLE */
  .c-table-card { position: relative; overflow: hidden; }
  .c-table { width: 100%; border-collapse: collapse; }
  .c-table th {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: #8892A4;
    padding: 6px 8px;
    border-bottom: 1px solid #E8ECF2;
  }
  .c-table td { padding: 9px 8px; font-size: 12px; border-bottom: 1px solid #F4F6FA; }
  .c-table td:first-child { font-family: 'DM Mono', monospace; font-size: 11px; color: #8892A4; }

  .c-badge-pill {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .c-badge-pill.processing { background: #EBF4FF; color: #2E7CF7; }
  .c-badge-pill.review { background: #FFF3E0; color: #E6890A; }
  .c-badge-pill.releasing { background: #F0EEFF; color: #6B5EE4; }
  .c-badge-pill.completed { background: #E8FBF3; color: #1AAE7A; }

  .c-table-alert {
    background: #FFFBEB;
    border-top: 1px solid #FFE98A;
    padding: 10px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 600;
    color: #B45309;
  }

  /* LB + RECENT */
  .c-lb-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .c-lb-section { padding: 16px 18px; }
  .c-lb-section + .c-lb-section { border-top: 1px solid #E8ECF2; }
  .c-lb-row {
    display: grid;
    grid-template-columns: 80px 1fr 60px;
    padding: 8px 0;
    border-bottom: 1px solid #F4F6FA;
    font-size: 12px;
    align-items: center;
  }
  .c-lb-row:last-child { border-bottom: none; }
  .c-lb-code { font-family: 'DM Mono', monospace; font-size: 11px; color: #8892A4; }
  .c-lb-head { font-size: 11px; font-weight: 600; color: #8892A4; padding-bottom: 6px; border-bottom: 1px solid #E8ECF2; margin-bottom: 4px; }
  .c-view-all { font-size: 11px; color: #F72D6B; font-weight: 600; cursor: pointer; }

  /* PRIORITY */
  .c-priority-list { display: flex; flex-direction: column; gap: 12px; }
  .c-priority-item {
    background: #F9FAFC;
    border-radius: 10px;
    padding: 12px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .c-priority-item.yellow-bg { background: #FFF8E1; }
  .c-priority-icon {
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .c-priority-body { flex: 1; }
  .c-priority-title { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
  .c-priority-sub { font-size: 11px; color: #8892A4; }
  .c-priority-num { font-size: 18px; font-weight: 700; }
  .c-priority-num.red { color: #F74242; }
  .c-priority-num.yellow { color: #F4A837; }

  .c-btn {
    margin-top: 6px;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    color: white;
  }
  .c-btn.blue { background: #4899F7; }
  .c-btn.purple { background: #7C6FF7; }
  .c-btn.green { background: #2DC78D; }
`;

// ─── SVG icons ───────────────────────────────────────────────────────────────
const CalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4899F7" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const SearchIcon = ({ color = "#F4A837" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const DocIcon = ({ color = "#7C6FF7" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const PrintIcon = ({ color = "#2DC78D" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2DC78D" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" />
  </svg>
);
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F74242" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" /><path d="M20.5 15a9 9 0 1 1-2.2-8.3L23 10" />
  </svg>
);
const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
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
function DonutChart() {
  const ref = useRef(null);
  useEffect(() => {
    const chart = new Chart(ref.current, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [41, 27, 23, 43, 6],
          backgroundColor: ["#7C6FF7", "#F4A837", "#4899F7", "#2DC78D", "#F74242"],
          borderWidth: 3,
          borderColor: "#fff",
          hoverOffset: 4,
        }],
      },
      options: {
        cutout: "68%",
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: true,
      },
    });
    return () => chart.destroy();
  }, []);
  return <canvas ref={ref} width={160} height={160} />;
}

// ─── LINE CHART ───────────────────────────────────────────────────────────────
function LineChart() {
  const ref = useRef(null);
  useEffect(() => {
    const labels = ["Tue", "Wed", "Thu", "Fri", "Sac", "Sun", "Mon", "Tue", "Wed"];
    const chart = new Chart(ref.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Processing", data: [20, 45, 130, 90, 100, 120, 140, 155, 150], borderColor: "#7C6FF7", backgroundColor: "rgba(124,111,247,0.08)", tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: "#7C6FF7", borderWidth: 2 },
          { label: "For Review", data: [10, 25, 40, 60, 70, 90, 100, 120, 130], borderColor: "#4899F7", backgroundColor: "rgba(72,153,247,0.06)", tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: "#4899F7", borderWidth: 2 },
          { label: "For Releasing", data: [5, 15, 30, 45, 55, 70, 85, 105, 125], borderColor: "#2DC78D", backgroundColor: "rgba(45,199,141,0.06)", tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: "#2DC78D", borderWidth: 2 },
          { label: "Completed", data: [8, 20, 50, 80, 95, 110, 90, 100, 95], borderColor: "#F4A837", backgroundColor: "rgba(244,168,55,0.06)", tension: 0.4, fill: false, pointRadius: 4, pointBackgroundColor: "#F4A837", borderWidth: 2 },
          { label: "Rejected", data: [5, 10, 20, 30, 40, 60, 70, 90, 115], borderColor: "#F74242", backgroundColor: "rgba(247,66,66,0.06)", tension: 0.4, fill: false, pointRadius: 4, pointBackgroundColor: "#F74242", borderWidth: 2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: "#F0F2F7" }, ticks: { font: { size: 11 }, color: "#8892A4" } },
          y: { min: 0, max: 175, grid: { color: "#F0F2F7" }, ticks: { font: { size: 11 }, color: "#8892A4", stepSize: 25 } },
        },
      },
    });
    return () => chart.destroy();
  }, []);
  return <canvas ref={ref} />;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function CertifyDashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const tabs = [
    { name: "Dashboard", icon: <CalIcon /> },
    { name: "Checking of Request", icon: <LockIcon /> },
    { name: "Request Tracker", icon: <RefreshIcon /> },
    {
      name: "Ready", icon:
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
    },
    { name: "History", icon: <ClockIcon /> },
  ];

  const stats = [
    { num: "124", label: "Requests Today", badge: "▲ 11%", badgeCls: "", iconBg: "#EBF4FF", icon: <CalIcon /> },
    { num: "32", sup: "°", label: "Pending for Checking", badge: "", iconBg: "#FFF3E8", icon: <SearchIcon /> },
    { num: "18", label: "For Approval / Review", badge: "", iconBg: "#F0EEFF", icon: <DocIcon /> },
    { num: "9", label: "Ready for Printing", badge: "▲ 18%", iconBg: "#E8FBF3", icon: <PrintIcon /> },
    { num: "412", label: "Completed This Month", badge: "▲ 9%", iconBg: "#E5FAF2", icon: <CheckIcon /> },
    { num: "6", label: "Rejected", badge: "", iconBg: "#FFEBEB", icon: <XIcon /> },
  ];

  const legendItems = [
    { color: "#7C6FF7", label: "Processing", val: 41 },
    { color: "#F4A837", label: "For Review", val: 27 },
    { color: "#4899F7", label: "For Releasing", val: 23 },
    { color: "#2DC78D", label: "Completed", val: 43 },
    { color: "#F74242", label: "Rejected", val: 6 },
  ];

  const chartLegend = [
    { color: "#7C6FF7", label: "Processing" },
    { color: "#F4A837", label: "For Review" },
    { color: "#4899F7", label: "For Releasing" },
    { color: "#2DC78D", label: "Completed" },
    { color: "#F74242", label: "Rejected" },
  ];

  const tableRows = [
    { code: "22-00238", name: "Dela Cruz, Aaron M.", cert: "Certificate of ID issuance", status: "processing" },
    { code: "19-06784", name: "Santos, BiancalL.", cert: "Certificate of Earned Units", status: "review" },
    { code: "20-01234", name: "Ramirez, Carlos J.", cert: "Certificate of Graduation", status: "releasing" },
    { code: "22-16743", name: "Fiores, Danielle P.", cert: "Certificate of GWA", status: "completed" },
    { code: "26-10345", name: "Mendoza, Ethan R.", cert: "Certificate of Transfer Credentials", status: "" },
    { code: "14-07668", name: "Gutierrez, Marco D.", cert: "Certificate of GWA", status: "completed" },
  ];

  const statusLabel = { processing: "Processing", review: "For Review", releasing: "For Releasing", completed: "Completed" };

  const lbRows = [
    { code: "19-04519", name: "Saliza, Quentin R.", val: "" },
    { code: "23-13041", name: "Mr. Reyes", val: "-74" },
    { code: "22-10251", name: "Ms. Pangilinan", val: "-65" },
  ];

  const recentRows = [
    { code: "19-04519", name: "Saliza, Quentin R.", val: "" },
    { code: "28-13041", name: "Mr. Reyes", val: "-74" },
    { code: "22-00321", name: "Ms. Pangilinan", val: "65" },
  ];

  return (
    <div className="certify">
      <style>{css}</style>

      {/* MAIN */}
      <div className="c-main">

        {/* STATS */}
        <div className="c-stats">
          {stats.map((s, i) => (
            <div className="c-stat" key={i}>
              <div className="c-stat-icon" style={{ background: s.iconBg }}>{s.icon}</div>
              <div>
                <div className="c-stat-num">{s.num}{s.sup && <sup style={{ fontSize: 12, verticalAlign: "super" }}>{s.sup}</sup>}</div>
                <div className="c-stat-label">
                  {s.label}
                  {s.badge && <span className="c-badge"> {s.badge}</span>}
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
              <span className="c-dots">···</span>
            </div>
            <div className="c-donut-wrap">
              <div className="c-donut-canvas"><DonutChart /></div>
              <div className="c-legend">
                {legendItems.map((l, i) => (
                  <div className="c-legend-item" key={i}>
                    <div className="c-legend-left">
                      <div className="c-legend-dot" style={{ background: l.color }} />
                      {l.label}
                    </div>
                    <div className="c-legend-val">{l.val}</div>
                  </div>
                ))}
                <div className="c-legend-footer">
                  <span>● Processing <b>41</b> <span style={{ color: "#7C6FF7" }}>30.5%</span></span>
                  <span>● Rejected <b>6</b> <span style={{ color: "#F74242" }}>4.5%</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Line chart */}
          <div className="c-card">
            <div className="c-card-header">
              <span className="c-card-title">Requests Over Time</span>
              <span className="c-dots">···</span>
            </div>
            <div className="c-line-wrap"><LineChart /></div>
            <div className="c-chart-legend">
              {chartLegend.map((c, i) => (
                <div className="c-chart-legend-item" key={i}>
                  <div className="c-chart-dot" style={{ background: c.color }} />
                  {c.label}
                  {c.label === "Rejected" && <span style={{ color: "#F74242", fontWeight: 600, marginLeft: 2 }}>◉ 4.6%</span>}
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
                  <span style={{ marginLeft: 10, fontSize: 11, color: "#2DC78D", fontWeight: 600 }}>▲0.04▲</span>
                  <span style={{ fontSize: 11, color: "#8892A4", marginLeft: 6 }}>| Last poit year · past Month ›</span>
                </div>
              </div>
              <table className="c-table">
                <thead>
                  <tr>
                    <th>SR Code</th><th>Name</th><th>Certificate Type</th><th>Status</th>
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
                          <span className={`c-badge-pill ${r.status}`}>{statusLabel[r.status]}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="c-table-alert">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <WarnIcon size={14} /> 3 requests pending for over 5 days
              </div>
              <span style={{ fontWeight: 400, fontSize: 12, color: "#8892A4" }}>Settings ⚙</span>
            </div>
          </div>

          {/* LB + RECENT */}
          <div className="c-lb-card">
            <div className="c-lb-section">
              <div className="c-card-header" style={{ marginBottom: 10 }}>
                <span className="c-card-title">Performance Leaderboard</span>
                <span className="c-dots">···</span>
              </div>
              <div className="c-lb-row c-lb-head">
                <span>SR Code</span><span>Name</span><span>Status ›</span>
              </div>
              {lbRows.map((r, i) => (
                <div className="c-lb-row" key={i}>
                  <span className="c-lb-code">{r.code}</span>
                  <span>{r.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1D2E" }}>{r.val}</span>
                </div>
              ))}
            </div>
            <div className="c-lb-section">
              <div className="c-card-header" style={{ marginBottom: 10 }}>
                <span className="c-card-title">Recent Requests</span>
                <span className="c-view-all">View All ›</span>
              </div>
              <div className="c-lb-row c-lb-head">
                <span>SR Code</span><span>Name</span><span>Stage</span>
              </div>
              {recentRows.map((r, i) => (
                <div className="c-lb-row" key={i}>
                  <span className="c-lb-code">{r.code}</span>
                  <span>{r.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1D2E" }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* OVERALL HISTORY */}
          <div className="c-card">
            <div className="c-card-header">
              <span className="c-card-title">Overall History</span>
              <span className="c-dots">···</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Certificate of GWA", count: 87, color: "#7C6FF7", bg: "#F0EEFF" },
                { label: "Certificate of Graduation", count: 64, color: "#4899F7", bg: "#EBF4FF" },
                { label: "Certificate of Earned Units", count: 52, color: "#2DC78D", bg: "#E8FBF3" },
                { label: "Certificate of ID Issuance", count: 43, color: "#F4A837", bg: "#FFF3E0" },
                { label: "Certificate of Transfer Credentials", count: 31, color: "#F72D6B", bg: "#fff0f4" },
              ].map((item, i) => {
                const max = 87;
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, color: "#1A1D2E" }}>{item.label}</span>
                      <span style={{ fontWeight: 700, color: item.color }}>{item.count}</span>
                    </div>
                    <div style={{ background: "#F4F6FA", borderRadius: 999, height: 7, overflow: "hidden" }}>
                      <div style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: item.color,
                        borderRadius: 999,
                        transition: "width 0.6s ease"
                      }} />
                    </div>
                  </div>
                );
              })}
              <div style={{
                marginTop: 8,
                paddingTop: 10,
                borderTop: "1px solid #E8ECF2",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#8892A4"
              }}>
                <span>Total Processed</span>
                <span style={{ fontWeight: 700, color: "#1A1D2E" }}>277</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}