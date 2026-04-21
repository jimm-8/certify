import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronLeft } from "react-icons/bs";
import requestService from "../../services/requestService";
import { getTokenPayload } from "../../utils/auth";

const Activity = () => {
  const navigate = useNavigate();
  const payload = getTokenPayload();
  const username = payload?.sub || "User";
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const actionLabel = (log) => {
    const action = log.action || "";
    if (action === "AUTH_LOGIN") return "Signed in";
    if (action === "AUTH_PASSWORD_CHANGE") return "Changed password";
    if (action === "REQUEST_REVIEW_REQUIRED") {
      return "Historical record review required";
    }
    if (action === "REQUEST_PRINTED") {
      return "Document printed";
    }
    if (action === "API_PATCH") {
      const source = String(log.new_value || log.notes || "");
      const match = source.match(/\/requests\/(\d+)\/status/);
      if (match) {
        return `Updated request status for Request #${match[1]}`;
      }
      return "Updated a record";
    }
    if (action.includes("STATUS")) {
      const oldVal = log.old_value ? String(log.old_value) : null;
      const newVal = log.new_value ? String(log.new_value) : null;
      if (oldVal && newVal) {
        return `Updated status from ${oldVal} to ${newVal}`;
      }
      if (newVal) {
        return `Updated status to ${newVal}`;
      }
      return "Updated request status";
    }
    if (action.includes("NOTE")) return "Added a note";
    if (action.includes("CREATE")) return "Created a record";
    if (action.includes("UPDATE")) return "Updated details";
    return action
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const entityLabel = (log) => {
    if (log.entity_type === "certificate_request" && log.entity_id) {
      return `Request #${log.entity_id}`;
    }
    if (log.action === "API_PATCH") {
      const source = String(log.new_value || log.notes || "");
      const match = source.match(/\/requests\/(\d+)\/status/);
      if (match) {
        return `Request #${match[1]}`;
      }
    }
    if (log.entity_type) {
      return log.entity_type.replace(/_/g, " ");
    }
    return "System";
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    requestService
      .getAllAuditLogs({ page: 1, limit: 200 })
      .then((data) => {
        if (!active) return;
        const all = Array.isArray(data) ? data : data.items || [];
        const filtered = all.filter(
          (log) =>
            log.user_name === username ||
            log.action === "REQUEST_REVIEW_REQUIRED" ||
            log.action === "REQUEST_PRINTED",
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
  }, [username]);

  const timeline = useMemo(() => {
    return [...logs].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
  }, [logs]);

  return (
    <div className="bg-white rounded-md border border-gray-200 shadow-sm mt-3 mb-4 p-2 min-h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          onClick={() => navigate("/dashboard")}
          title="Back to Dashboard"
          className="text-lg font-bold text-gray-700 flex items-center gap-1 hover:text-[#B22222] transition-colors rounded"
        >
          <BsChevronLeft style={{ strokeWidth: "0.5" }} />
          <span>Activity</span>
        </button>
        <div className="text-xs text-gray-500">
          Showing recent activity for {username}
        </div>
      </div>

      {loading && (
        <div className="py-10 text-xs text-gray-400 flex items-center justify-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          Loading activity...
        </div>
      )}

      {!loading && timeline.length === 0 && (
        <div className="py-10 text-xs text-gray-400 text-center">
          No activity found yet.
        </div>
      )}

      {!loading && timeline.length > 0 && (
        <div className="space-y-2">
          {timeline.map((log) => (
            <div
              key={log.id}
              className="border border-gray-200 rounded-md px-3 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  {actionLabel(log)}
                </div>
                {log.action === "REQUEST_REVIEW_REQUIRED" && (
                  <div className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                    {log.old_value || "Certificate request"}
                  </div>
                )}
                {log.action === "REQUEST_PRINTED" && (
                  <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                    {log.old_value || "Certificate request"}
                  </div>
                )}
                <div className="text-xs text-gray-500">{entityLabel(log)}</div>
                {log.notes && (
                  <div className="text-xs text-gray-600">{log.notes}</div>
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

export default Activity;
