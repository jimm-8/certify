import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, HelpCircle, Activity, Bell } from "lucide-react";
import authService from "../../services/authService";
import { getTokenPayload } from "../../utils/auth";
import requestService from "../../services/requestService";

const NOTIFICATION_STORAGE_KEY = "certify.notifications.lastSeenId";
const DISMISSED_NOTIFICATION_STORAGE_KEY = "certify.notifications.dismissedIds";
const NOTIFICATION_ACTIONS = ["REQUEST_REVIEW_REQUIRED", "REQUEST_PRINTED"];

const getNotificationMeta = (item) => {
  if (item.action === "REQUEST_PRINTED") {
    return {
      title: "Document Printed",
      badge: item.old_value || "Certificate request",
      message: item.notes,
    };
  }

  return {
    title: "Historical Record Review Needed",
    badge: item.old_value || "Certificate request",
    message: item.notes,
  };
};

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
          .filter((log) => NOTIFICATION_ACTIONS.includes(log.action))
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
      <div className="flex items-center justify-between bg-[var(--school-crimson)] px-6 py-2 text-white shadow-md">
        <div
          style={{ fontWeight: 900 }}
          className="text-4xl font-poppins font-bold italic"
        >
          Certify
        </div>

        <div className="flex items-center gap-2 relative" ref={dropdownRef}>
          <div className="text-right">
            <div className="text-sm font-medium">{formattedDate}</div>
            <div className="text-lg font-semibold">{formattedTime}</div>
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
                className="relative rounded-full p-2 text-white transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Open notifications"
              >
                <Bell className="h-8 w-8" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-[var(--school-gold)] px-1 text-center text-[10px] font-semibold text-[var(--school-ink)]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-96 overflow-hidden rounded-xl border border-[var(--school-border)] bg-white text-gray-700 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[var(--school-border)] bg-[var(--school-ivory)] px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--school-ink)]">
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
                      className="text-xs font-medium text-[var(--school-crimson)] hover:underline"
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
                      visibleNotifications.slice(0, 8).map((item) => {
                        const meta = getNotificationMeta(item);
                        const badgeClass =
                          item.action === "REQUEST_PRINTED"
                            ? "text-emerald-700"
                            : "text-amber-700";

                        return (
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
                            <div className="text-sm font-semibold text-[var(--school-ink)]">
                              {meta.title}
                            </div>
                            <div
                              className={`mt-1 text-[11px] font-medium uppercase tracking-wide ${badgeClass}`}
                            >
                              {meta.badge}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-gray-600">
                              {meta.message}
                            </div>
                            <div className="mt-2 text-[11px] text-gray-400">
                              {new Date(item.created_at).toLocaleString()}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <div
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-white text-[var(--school-crimson)] shadow-md"
          >
            {initials || "U"}
          </div>

          {open && (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-[var(--school-border)] bg-white py-2 text-gray-700 shadow-xl">
              <div className="border-b border-[var(--school-border)] bg-[var(--school-ivory)] px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--school-crimson)] text-sm font-semibold text-white">
                    {initials || "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--school-ink)]">
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
                    className="flex w-full items-center gap-2 px-4 py-1 text-left text-sm hover:bg-[var(--school-ivory)]"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/activity");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-1 text-left text-sm hover:bg-[var(--school-ivory)]"
                  >
                    <Activity className="w-4 h-4" />
                    Activity
                  </button>

                  <button
                    onClick={() => {
                      setHelpOpen(true);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-1 text-left text-sm hover:bg-[var(--school-ivory)]"
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
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--school-crimson)] hover:bg-[var(--school-ivory)]"
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
          <div className="relative w-full max-w-xl rounded-xl border border-[var(--school-border)] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--school-ink)]">
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
                  className="rounded-lg border border-[var(--school-border)] bg-[var(--school-ivory)]/30 p-3"
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
                className="rounded-md bg-[var(--school-crimson)] px-4 py-2 text-sm text-white transition-colors hover:bg-[#b61d24]"
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
