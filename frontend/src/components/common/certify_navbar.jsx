import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, HelpCircle, Activity, Bell } from "lucide-react";
import authService from "../../services/authService";
import { getTokenPayload } from "../../utils/auth";
import requestService from "../../services/requestService";

const NOTIFICATION_STORAGE_KEY = "certify.notifications.lastSeenId";
const DISMISSED_NOTIFICATION_STORAGE_KEY = "certify.notifications.dismissedIds";

const CertifyNavbar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const navigate = useNavigate();

  // Real-time clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const payload = getTokenPayload();
  const username = payload?.sub || "User";
  const roleLabel = payload?.role
    ? payload.role.replace("_", " ").toUpperCase()
    : "USER";
  const isCashier = payload?.role === "cashier";
  const initials = username
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    if (isCashier) return undefined;

    let active = true;

    const loadNotifications = async () => {
      try {
        const data = await requestService.getAllAuditLogs({
          page: 1,
          limit: 50,
        });
        if (!active) return;
        const all = Array.isArray(data) ? data : data.items || [];
        const items = all
          .filter((log) => log.action === "REQUEST_REVIEW_REQUIRED")
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setNotifications(items);
      } catch (error) {
        if (!active) return;
        setNotifications([]);
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isCashier]);

  const getDismissedNotificationIds = () => {
    try {
      const stored = window.localStorage.getItem(
        DISMISSED_NOTIFICATION_STORAGE_KEY,
      );
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed)
        ? parsed.map((value) => Number(value)).filter(Number.isFinite)
        : [];
    } catch {
      return [];
    }
  };

  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(() =>
    getDismissedNotificationIds(),
  );

  const visibleNotifications = notifications.filter(
    (item) => !dismissedNotificationIds.includes(item.id),
  );

  const lastSeenNotificationId = Number.parseInt(
    window.localStorage.getItem(NOTIFICATION_STORAGE_KEY) || "0",
    10,
  );
  const unreadCount = visibleNotifications.filter(
    (item) => item.id > lastSeenNotificationId,
  ).length;

  const markNotificationsSeen = () => {
    const highestId = visibleNotifications[0]?.id;
    if (!highestId) return;
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, String(highestId));
  };

  const dismissNotification = (notificationId) => {
    setDismissedNotificationIds((current) => {
      if (current.includes(notificationId)) return current;
      const next = [...current, notificationId];
      window.localStorage.setItem(
        DISMISSED_NOTIFICATION_STORAGE_KEY,
        JSON.stringify(next),
      );
      return next;
    });
  };

  const supportContacts = [
    {
      label: "Registrar Head",
      name: "Office of the Registrar",
      email: "registrar@batstate-u.edu.ph",
      phone: "(043) 980-0385",
    },
    {
      label: "Records Processing",
      name: "Records Section",
      email: "records@batstate-u.edu.ph",
      phone: "(043) 980-0386",
    },
    {
      label: "Payments & Cashier",
      name: "Cashier Office",
      email: "cashier@batstate-u.edu.ph",
      phone: "(043) 980-0387",
    },
    {
      label: "ICT Support",
      name: "ICT Helpdesk",
      email: "ictsupport@batstate-u.edu.ph",
      phone: "(043) 980-0390",
    },
  ];

  return (
    <div className="w-full">
      <div className="bg-[#343A3F] text-white px-6 py-2 flex justify-between items-center shadow-md">
        <div
          style={{ fontWeight: 900 }}
          className="text-4xl font-inter font-black italic"
        >
          Certify
        </div>

        <div className="flex items-center gap-2 relative" ref={dropdownRef}>
          <div className="text-right">
            <div className="text-sm">{formattedDate}</div>
            <div className="text-lg font-medium">{formattedTime}</div>
          </div>
          {!isCashier && (
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => {
                  const nextOpen = !notificationsOpen;
                  setNotificationsOpen(nextOpen);
                  setOpen(false);
                  if (nextOpen) markNotificationsSeen();
                }}
                className="relative rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Open notifications"
              >
                <Bell className="h-8 w-8" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-[#ee1133] px-1 text-center text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-96 overflow-hidden rounded-xl border border-gray-100 bg-white text-gray-700 shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        Notifications
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Review-required requests from ODR
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate("/notifications");
                      }}
                      className="text-xs font-medium text-[#ee1133] hover:underline"
                    >
                      View all
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {visibleNotifications.length === 0 ? (
                      <div className="px-4 text-center py-6 text-xs text-gray-500">
                        No notifications right now.
                      </div>
                    ) : (
                      visibleNotifications.slice(0, 8).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            dismissNotification(item.id);
                            setNotificationsOpen(false);
                            navigate("/notifications");
                          }}
                          className="w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                        >
                          <div className="text-sm font-semibold text-gray-800">
                            Historical Record Review Needed
                          </div>
                          <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-amber-700">
                            {item.old_value || "Certificate request"}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-gray-600">
                            {item.notes}
                          </div>
                          <div className="mt-2 text-[11px] text-gray-400">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <div
            onClick={() => setOpen(!open)}
            className="w-10 h-10 rounded-full bg-white text-[#ee1133] flex items-center justify-center font-semibold shadow-md cursor-pointer"
          >
            {initials || "U"}
          </div>

          {open && (
            <div className="absolute right-0 top-12 w-56 bg-white text-gray-700 rounded-xl shadow-xl border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#ee1133] text-white flex items-center justify-center text-sm font-semibold">
                    {initials || "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {username}
                    </div>
                    <div className="text-[11px] text-gray-500">{roleLabel}</div>
                  </div>
                </div>
              </div>

              {!isCashier && (
                <>
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/settings");
                    }}
                    className="flex items-center gap-2 w-full px-4 py-1 hover:bg-gray-100 text-sm text-left"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/activity");
                    }}
                    className="flex items-center gap-2 w-full px-4 py-1 hover:bg-gray-100 text-sm text-left"
                  >
                    <Activity className="w-4 h-4" />
                    Activity
                  </button>

                  <button
                    onClick={() => {
                      setHelpOpen(true);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-1 hover:bg-gray-100 text-sm text-left"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Get Help
                  </button>

                  <div className="border-t my-2"></div>
                </>
              )}

              <button
                onClick={() => {
                  authService.logout();
                  setOpen(false);
                  navigate("/login");
                }}
                className="flex items-center gap-2 w-full px-4 py-2 hover:bg-red-50 text-red-600 text-sm text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign-out
              </button>
            </div>
          )}
        </div>
      </div>

      {helpOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setHelpOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Help & Contacts
                </h3>
                <p className="text-sm text-gray-500">
                  Reach out to the registrar team or ICT support for assistance.
                </p>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {supportContacts.map((contact) => (
                <div
                  key={contact.label}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    {contact.label}
                  </div>
                  <div className="text-sm font-semibold text-gray-800 mt-1">
                    {contact.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {contact.email}
                  </div>
                  <div className="text-xs text-gray-500">{contact.phone}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setHelpOpen(false)}
                className="px-4 py-2 text-sm rounded-md bg-[#ee1133] text-white hover:bg-[#c50f2a]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertifyNavbar;
