import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronLeft } from "react-icons/bs";
import requestService from "../../services/requestService";

const Notifications = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    requestService
      .getAllAuditLogs({ page: 1, limit: 200 })
      .then((data) => {
        if (!active) return;
        const all = Array.isArray(data) ? data : data.items || [];
        const filtered = all.filter(
          (log) => log.action === "REQUEST_REVIEW_REQUIRED",
        );
        setLogs(filtered);
      })
      .catch(() => {
        if (!active) return;
        setLogs([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const notifications = useMemo(
    () =>
      [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [logs],
  );

  return (
    <div className="bg-white rounded-md border border-gray-200 shadow-sm mt-3 mb-4 p-2 min-h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          onClick={() => navigate("/dashboard")}
          title="Back to Dashboard"
          className="text-lg font-bold text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors rounded"
        >
          <BsChevronLeft style={{ strokeWidth: "0.5" }} />
          <span>Notifications</span>
        </button>
        <div className="text-xs text-gray-500">
          Historical-record and review-required alerts
        </div>
      </div>

      {loading && (
        <div className="py-10 text-xs text-gray-400 flex items-center justify-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          Loading notifications...
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="py-10 text-xs text-gray-400 text-center">
          No notifications found.
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((log) => (
            <div
              key={log.id}
              className="border border-amber-200 bg-amber-50/40 rounded-md px-3 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  Historical Record Review Needed
                </div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-amber-700">
                  {log.old_value || "Certificate request"}
                </div>
                <div className="text-xs text-gray-500">
                  {log.entity_id ? `Request #${log.entity_id}` : "Certificate request"}
                </div>
                {log.notes && (
                  <div className="text-xs text-gray-700 mt-1">{log.notes}</div>
                )}
              </div>
              <div className="text-xs text-gray-500 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
