import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronLeft } from "react-icons/bs";
import requestService from "../../services/requestService";
import {
  getLocalNotifications,
  getNotificationMeta,
  mergeNotifications,
  NOTIFICATION_ACTIONS,
} from "../../utils/notificationCenter";

const Notifications = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [localLogs, setLocalLogs] = useState(() => getLocalNotifications());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    requestService
      .getAllAuditLogs({ page: 1, limit: 200 })
      .then((data) => {
        if (!active) return;
        const all = Array.isArray(data) ? data : data.items || [];
        const filtered = all.filter((log) =>
          NOTIFICATION_ACTIONS.includes(log.action),
        );
        setLogs(filtered);
        setLocalLogs(getLocalNotifications());
      })
      .catch(() => {
        if (!active) return;
        setLogs([]);
        setLocalLogs(getLocalNotifications());
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
    () => mergeNotifications(logs, localLogs),
    [localLogs, logs],
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
          {notifications.map((log) => {
            const meta = getNotificationMeta(log);

            return (
              <div
                key={log.id}
                className={`${meta.tone} rounded-md border px-2 py-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}
              >
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {meta.title}
                  </div>
                  <div
                    className={`mt-1 text-[11px] font-medium uppercase tracking-wide ${meta.badgeTone}`}
                  >
                    {meta.badge}
                  </div>
                  {meta.message && (
                    <div className="mt-1 text-xs text-gray-700">
                      {meta.message}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {log.entity_id
                      ? `Request #${log.entity_id}`
                      : "Certificate request"}
                  </div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
