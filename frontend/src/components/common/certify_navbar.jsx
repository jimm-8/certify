import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, Settings, HelpCircle, Activity, Bell } from "lucide-react";
import authService from "../../services/authService";
import { getTokenPayload } from "../../utils/auth";
import requestService from "../../services/requestService";
import FeedbackDialog from "./feedbackDialog";
import {
  NOTIFICATION_STORAGE_KEY,
  DISMISSED_NOTIFICATION_STORAGE_KEY,
  NOTIFICATION_ACTIONS,
  appendLocalNotification,
  buildDelayAlertMessage,
  createDelayAlertNotification,
  getForReleasingElapsedMs,
  getDelayAlertStageMap,
  getDismissedNotificationIds,
  getLocalNotifications,
  getNotificationMeta,
  mergeNotifications,
  saveDelayAlertStageMap,
  STAGE_DEFINITIONS,
} from "../../utils/notificationCenter";

const playSuccessNotification = () => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  [
    [523, 0],
    [659, 0.12],
    [784, 0.24],
  ].forEach(([freq, delay]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + delay + 0.5,
    );
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.5);
  });

  window.setTimeout(() => {
    ctx.close().catch(() => {});
  }, 900);
};

const playCriticalAlert = () => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  [0, 0.12, 0.24, 0.36].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(1200, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + delay + 0.09,
    );
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.1);
  });

  window.setTimeout(() => {
    ctx.close().catch(() => {});
  }, 800);
};

const createCriticalAlertLoop = () => {
  let intervalId = null;

  return {
    start() {
      if (intervalId !== null) return;
      playCriticalAlert();
      intervalId = window.setInterval(() => {
        playCriticalAlert();
      }, 900);
    },
    stop() {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    },
  };
};

const getHighestDelayStage = (elapsedMs) => {
  if (elapsedMs >= STAGE_DEFINITIONS.breach.thresholdMs) return "breach";
  if (elapsedMs >= STAGE_DEFINITIONS.critical.thresholdMs) return "critical";
  if (elapsedMs >= STAGE_DEFINITIONS.matters.thresholdMs) return "matters";
  if (elapsedMs >= STAGE_DEFINITIONS.safe.thresholdMs) return "safe";
  if (elapsedMs >= STAGE_DEFINITIONS.early.thresholdMs) return "early";
  return null;
};

const FOR_RELEASE_NOTICE_ACTIONS = [
  "FOR_RELEASE_DELAY_ALERT",
  "REQUEST_DELAY_NOTICE_SENT",
];

const CertifyNavbar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [localNotifications, setLocalNotifications] = useState(() =>
    getLocalNotifications(),
  );
  const [delayAlertModal, setDelayAlertModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "warning",
    requests: [],
    stage: "early",
  });
  const [delayNoticeSending, setDelayNoticeSending] = useState(false);
  const [holdTriggering, setHoldTriggering] = useState(false);
  const [delayAlertMuted, setDelayAlertMuted] = useState(false);
  const [delayNoticeComposerOpen, setDelayNoticeComposerOpen] = useState(false);
  const [delayNoticeReason, setDelayNoticeReason] = useState("");
  const [delayNoticeReasonError, setDelayNoticeReasonError] = useState("");
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const latestNotificationIdRef = useRef(0);
  const hasLoadedNotificationsRef = useRef(false);
  const criticalAlertLoopRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  if (!criticalAlertLoopRef.current) {
    criticalAlertLoopRef.current = createCriticalAlertLoop();
  }

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
  const suppressForReleaseNotices = location.pathname === "/payment-tagging";
  const initials = username
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    if (isCashier || suppressForReleaseNotices) return undefined;

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
        const newestId = Number(items[0]?.id || 0);
        if (
          hasLoadedNotificationsRef.current &&
          newestId > latestNotificationIdRef.current
        ) {
          playSuccessNotification();
        }
        latestNotificationIdRef.current = newestId;
        hasLoadedNotificationsRef.current = true;
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
  }, [isCashier, suppressForReleaseNotices]);

  useEffect(() => {
    const shouldPlayLoop =
      delayAlertModal.open &&
      delayAlertModal.requests.length > 0 &&
      !delayAlertMuted;

    if (shouldPlayLoop) {
      criticalAlertLoopRef.current?.start();
    } else {
      criticalAlertLoopRef.current?.stop();
    }

    return () => {
      criticalAlertLoopRef.current?.stop();
    };
  }, [delayAlertModal.open, delayAlertModal.requests.length, delayAlertMuted]);

  const closeDelayAlertModal = () => {
    criticalAlertLoopRef.current?.stop();
    setDelayNoticeComposerOpen(false);
    setDelayNoticeReason("");
    setDelayNoticeReasonError("");
    setDelayAlertModal((current) => ({ ...current, open: false }));
  };

  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(() =>
    getDismissedNotificationIds(),
  );

  useEffect(() => {
    if (isCashier) return undefined;

    let active = true;

    const evaluateDelayAlerts = async () => {
      try {
        const data = await requestService.getAllRequests({
          page: 1,
          limit: 100,
        });
        if (!active) return;

        const all = Array.isArray(data) ? data : data.items || [];
        const releasing = all.filter(
          (item) =>
            item.status === "FOR_RELEASING" &&
            (item.for_releasing_started_at || item.updated_at),
        );
        const stageMap = getDelayAlertStageMap();
        const stageBuckets = {
          breach: [],
          critical: [],
          matters: [],
          safe: [],
          early: [],
        };

        releasing.forEach((item) => {
          const elapsedMs = getForReleasingElapsedMs(item);
          const stage = getHighestDelayStage(elapsedMs);
          if (!stage) return;
          const previousStage = stageMap[item.id];
          const previousSeverity = previousStage
            ? STAGE_DEFINITIONS[previousStage]?.severity || 0
            : 0;
          const currentSeverity = STAGE_DEFINITIONS[stage].severity;
          if (currentSeverity <= previousSeverity) return;
          stageBuckets[stage].push(item);
        });

        const nextStage =
          ["breach", "critical", "matters", "safe", "early"].find(
            (stage) => stageBuckets[stage].length > 0,
          ) || null;

        if (!nextStage) return;

        const triggeredRequests = stageBuckets[nextStage];
        const nextStageMap = { ...stageMap };
        triggeredRequests.forEach((item) => {
          nextStageMap[item.id] = nextStage;
        });
        saveDelayAlertStageMap(nextStageMap);

        const highestElapsedMs = Math.max(
          ...triggeredRequests.map((item) => getForReleasingElapsedMs(item)),
        );
        const message = buildDelayAlertMessage({
          count: triggeredRequests.length,
          elapsedMs: highestElapsedMs,
          remainingMs: STAGE_DEFINITIONS.breach.thresholdMs - highestElapsedMs,
          isBreach: nextStage === "breach",
        });

        const nextLocalNotifications = appendLocalNotification(
          createDelayAlertNotification({
            stage: nextStage,
            requests: triggeredRequests,
          }),
        );
        setLocalNotifications(nextLocalNotifications);
        playCriticalAlert();
        setDelayAlertModal({
          open: true,
          title: STAGE_DEFINITIONS[nextStage].title,
          message,
          tone: nextStage === "breach" ? "error" : "warning",
          requests: triggeredRequests,
          stage: nextStage,
        });
      } catch (error) {
        // Ignore alert polling failures so the navbar remains usable.
      }
    };

    evaluateDelayAlerts();
    const intervalId = window.setInterval(evaluateDelayAlerts, 60000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isCashier, suppressForReleaseNotices]);

  useEffect(() => {
    if (!suppressForReleaseNotices) return;
    criticalAlertLoopRef.current?.stop();
    setDelayNoticeComposerOpen(false);
    setDelayAlertMuted(false);
    setDelayAlertModal((current) => ({ ...current, open: false }));
  }, [suppressForReleaseNotices]);

  const mergedNotifications = mergeNotifications(
    notifications,
    localNotifications,
  );

  const routeNotifications = suppressForReleaseNotices
    ? mergedNotifications.filter(
        (item) => !FOR_RELEASE_NOTICE_ACTIONS.includes(item.action),
      )
    : mergedNotifications;

  const visibleNotifications = routeNotifications.filter(
    (item) => !dismissedNotificationIds.includes(item.id),
  );

  const lastSeenNotificationAt = Number.parseInt(
    window.localStorage.getItem(NOTIFICATION_STORAGE_KEY) || "0",
    10,
  );
  const unreadCount = visibleNotifications.filter(
    (item) => new Date(item.created_at).getTime() > lastSeenNotificationAt,
  ).length;

  const markNotificationsSeen = () => {
    const newestCreatedAt = visibleNotifications[0]?.created_at;
    if (!newestCreatedAt) return;
    window.localStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      String(new Date(newestCreatedAt).getTime()),
    );
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

  const handleSendDelayNotice = async () => {
    criticalAlertLoopRef.current?.stop();

    if (delayAlertModal.requests.length === 0) {
      closeDelayAlertModal();
      return;
    }

    if (!delayNoticeComposerOpen) {
      setDelayNoticeComposerOpen(true);
      setDelayNoticeReasonError("");
      return;
    }

    const trimmedReason = delayNoticeReason.trim();
    if (!trimmedReason) {
      setDelayNoticeReasonError("Please enter the reason for delay.");
      return;
    }

    setDelayNoticeSending(true);
    setDelayNoticeReasonError("");
    try {
      await Promise.all(
        delayAlertModal.requests.map((item) =>
          requestService.sendDelayNotice(item.id, trimmedReason),
        ),
      );
      setDelayAlertModal({
        open: true,
        title: "Delay Notice Sent",
        message:
          delayAlertModal.requests.length === 1
            ? "The notice is sent successfully."
            : "The delay notices were sent successfully.",
        tone: "success",
        requests: [],
        stage: delayAlertModal.stage,
      });
      setDelayNoticeComposerOpen(false);
      setDelayNoticeReason("");
      setDelayNoticeReasonError("");
      const refreshed = await requestService.getAllAuditLogs({
        page: 1,
        limit: 50,
      });
      const all = Array.isArray(refreshed) ? refreshed : refreshed.items || [];
      setNotifications(
        all
          .filter((log) => NOTIFICATION_ACTIONS.includes(log.action))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      );
    } catch (error) {
      setDelayAlertModal((current) => ({
        ...current,
        title: "Send Failed",
        message:
          error?.response?.data?.detail ||
          "Failed to send the delay notice. Please try again.",
        tone: "error",
      }));
    } finally {
      setDelayNoticeSending(false);
    }
  };

  const handleTriggerNoPickupHold = async () => {
    criticalAlertLoopRef.current?.stop();

    if (delayAlertModal.requests.length === 0) {
      closeDelayAlertModal();
      return;
    }

    setHoldTriggering(true);
    try {
      await Promise.all(
        delayAlertModal.requests.map((item) =>
          requestService.holdRequestorNoPickup(item.id),
        ),
      );
      setDelayAlertModal({
        open: true,
        title: "Hold Started",
        message:
          delayAlertModal.requests.length === 1
            ? "The release timer is now paused because the requestor did not pick up."
            : "The release timers are now paused because the requestors did not pick up.",
        tone: "success",
        requests: [],
        stage: delayAlertModal.stage,
      });
      setDelayNoticeComposerOpen(false);
      setDelayNoticeReason("");
      setDelayNoticeReasonError("");
    } catch (error) {
      setDelayAlertModal((current) => ({
        ...current,
        title: "Hold Failed",
        message: "Failed to start the hold. Please try again.",
        tone: "error",
      }));
    } finally {
      setHoldTriggering(false);
    }
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
          {!isCashier && !suppressForReleaseNotices && (
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
                  <div className="flex items-center justify-between border-b border-[var(--school-border)] px-4 py-3">
                    <div>
                      <div className="text-sm  font-semibold text-[var(--school-ink)]">
                        Notifications
                      </div>
                      <div className="text-[11px] text-gray-500">
                        System and release alerts
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
                              className={`mt-1 text-[11px] font-medium uppercase tracking-wide ${meta.badgeTone}`}
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

      <FeedbackDialog
        open={delayAlertModal.open}
        title={delayAlertModal.title}
        message={delayAlertModal.message}
        tone={delayAlertModal.tone}
        loading={delayNoticeSending || holdTriggering}
        confirmLabel={
          delayAlertModal.requests.length > 0
            ? delayNoticeComposerOpen
              ? "Send Delay Notice"
              : "Compose Delay Notice"
            : "Got it"
        }
        cancelLabel={delayAlertModal.requests.length > 0 ? "Cancel" : ""}
        showSoundToggle={delayAlertModal.requests.length > 0}
        soundMuted={delayAlertMuted}
        onConfirm={
          delayAlertModal.requests.length > 0
            ? handleSendDelayNotice
            : undefined
        }
        onClose={closeDelayAlertModal}
        onSoundToggle={() => {
          setDelayAlertMuted((current) => !current);
        }}
      >
        {delayAlertModal.requests.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleTriggerNoPickupHold}
              disabled={holdTriggering || delayNoticeSending}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-[var(--school-ivory)] disabled:opacity-50"
            >
              {holdTriggering
                ? "Starting hold..."
                : delayAlertModal.requests.length === 1
                  ? "Requestor Did Not Pick Up"
                  : "Requestors Did Not Pick Up"}
            </button>
            <div className="text-[11px] text-gray-500 text-nowrap">
              This pauses the release timer without sending a delay notice.
            </div>
            {delayNoticeComposerOpen && (
              <>
                <label className="block text-xs font-medium text-gray-600">
                  Reason for delay
                </label>
                <textarea
                  value={delayNoticeReason}
                  onChange={(event) => {
                    setDelayNoticeReason(event.target.value);
                    if (delayNoticeReasonError) {
                      setDelayNoticeReasonError("");
                    }
                  }}
                  rows={4}
                  placeholder="Type the reason that will be sent to the requester."
                  className="w-full rounded-md border border-[var(--school-border)] px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--school-crimson)]"
                />
                {delayNoticeReasonError && (
                  <div className="text-[11px] text-[var(--school-crimson)]">
                    {delayNoticeReasonError}
                  </div>
                )}
                <div className="text-[11px] text-gray-500">
                  Sending a delay notice with a custom reason will also pause the
                  release timer.
                </div>
              </>
            )}
          </div>
        )}
      </FeedbackDialog>
    </div>
  );
};

export default CertifyNavbar;
