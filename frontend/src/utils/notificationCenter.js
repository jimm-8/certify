const LOCAL_NOTIFICATION_STORAGE_KEY = "certify.notifications.localItems";
const DELAY_ALERT_STAGE_STORAGE_KEY = "certify.delayAlerts.firedStages";

export const NOTIFICATION_STORAGE_KEY = "certify.notifications.lastSeenId";
export const DISMISSED_NOTIFICATION_STORAGE_KEY =
  "certify.notifications.dismissedIds";

export const STAGE_DEFINITIONS = {
  early: {
    key: "early",
    thresholdMs: 30 * 60 * 1000,
    severity: 1,
    title: "For Release Early Awareness",
    tone: "warning",
    badgeTone: "text-amber-700",
    containerTone: "border-amber-200 bg-amber-50/40",
  },
  safe: {
    key: "safe",
    thresholdMs: 60 * 60 * 1000,
    severity: 2,
    title: "For Release Still Safe",
    tone: "warning",
    badgeTone: "text-yellow-700",
    containerTone: "border-yellow-200 bg-yellow-50/40",
  },
  matters: {
    key: "matters",
    thresholdMs: 2 * 60 * 60 * 1000,
    severity: 3,
    title: "For Release Attention Needed",
    tone: "warning",
    badgeTone: "text-orange-700",
    containerTone: "border-orange-200 bg-orange-50/50",
  },
  critical: {
    key: "critical",
    thresholdMs: 2 * 60 * 60 * 1000 + 45 * 60 * 1000,
    severity: 4,
    title: "For Release Critical Warning",
    tone: "warning",
    badgeTone: "text-red-600",
    containerTone: "border-red-200 bg-red-50/40",
  },
  urgent: {
    key: "urgent",
    thresholdMs: 2 * 60 * 60 * 1000,
    severity: 3,
    title: "For Release Attention Needed",
    tone: "warning",
    badgeTone: "text-orange-700",
    containerTone: "border-orange-200 bg-orange-50/50",
  },
  breach: {
    key: "breach",
    thresholdMs: 3 * 60 * 60 * 1000,
    severity: 5,
    title: "For Release Breach Alert",
    tone: "error",
    badgeTone: "text-red-700",
    containerTone: "border-red-200 bg-red-50/50",
  },
};

export const NOTIFICATION_ACTIONS = [
  "REQUEST_REVIEW_REQUIRED",
  "REQUEST_PRINTED",
  "FOR_RELEASE_DELAY_ALERT",
  "REQUEST_DELAY_NOTICE_SENT",
];

const sortByNewest = (items) =>
  [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

const safeJsonParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const getDismissedNotificationIds = () => {
  if (typeof window === "undefined") return [];
  const parsed = safeJsonParse(
    window.localStorage.getItem(DISMISSED_NOTIFICATION_STORAGE_KEY),
    [],
  );
  return Array.isArray(parsed)
    ? parsed.map((value) => Number(value)).filter(Number.isFinite)
    : [];
};

export const getLocalNotifications = () => {
  if (typeof window === "undefined") return [];
  const parsed = safeJsonParse(
    window.localStorage.getItem(LOCAL_NOTIFICATION_STORAGE_KEY),
    [],
  );
  return Array.isArray(parsed) ? sortByNewest(parsed) : [];
};

export const saveLocalNotifications = (items) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    LOCAL_NOTIFICATION_STORAGE_KEY,
    JSON.stringify(sortByNewest(items)),
  );
};

export const appendLocalNotification = (notification) => {
  const current = getLocalNotifications();
  const exists = current.some((item) => item.id === notification.id);
  if (exists) return current;
  const next = sortByNewest([notification, ...current]);
  saveLocalNotifications(next);
  return next;
};

export const getDelayAlertStageMap = () => {
  if (typeof window === "undefined") return {};
  const parsed = safeJsonParse(
    window.localStorage.getItem(DELAY_ALERT_STAGE_STORAGE_KEY),
    {},
  );
  return parsed && typeof parsed === "object" ? parsed : {};
};

export const saveDelayAlertStageMap = (value) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DELAY_ALERT_STAGE_STORAGE_KEY, JSON.stringify(value));
};

export const clearNotificationStorage = () => {
  if (typeof window === "undefined") return;
  [
    LOCAL_NOTIFICATION_STORAGE_KEY,
    DELAY_ALERT_STAGE_STORAGE_KEY,
    NOTIFICATION_STORAGE_KEY,
    DISMISSED_NOTIFICATION_STORAGE_KEY,
  ].forEach((key) => {
    window.localStorage.removeItem(key);
  });
};

export const formatElapsedHours = (elapsedMs) => {
  const wholeHours = Math.floor(elapsedMs / (60 * 60 * 1000));
  const minutes = Math.floor((elapsedMs % (60 * 60 * 1000)) / (60 * 1000));
  if (minutes === 0) {
    return `${wholeHours} hour${wholeHours === 1 ? "" : "s"}`;
  }
  return `${wholeHours} hour${wholeHours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
};

export const formatRemainingMinutes = (remainingMs) =>
  Math.max(0, Math.ceil(remainingMs / (60 * 1000)));

export const getRequestHoldSecondsMs = (request, nowMs = Date.now()) => {
  const totalSeconds = Number(request?.release_hold_total_seconds || 0);
  let activeSeconds = 0;

  if (request?.release_hold_active && request?.release_hold_started_at) {
    const startedAt = new Date(request.release_hold_started_at).getTime();
    if (Number.isFinite(startedAt)) {
      activeSeconds = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
    }
  }

  return Math.max(0, (totalSeconds + activeSeconds) * 1000);
};

export const getForReleasingElapsedMs = (request, nowMs = Date.now()) => {
  const startedAtValue =
    request?.for_releasing_started_at || request?.updated_at || request?.created_at;
  if (!startedAtValue) return 0;

  const startedAt = new Date(startedAtValue).getTime();
  if (!Number.isFinite(startedAt)) return 0;

  const rawElapsed = Math.max(0, nowMs - startedAt);
  return Math.max(0, rawElapsed - getRequestHoldSecondsMs(request, nowMs));
};

export const buildDelayAlertMessage = ({
  count,
  elapsedMs,
  remainingMs,
  isBreach = false,
}) => {
  const elapsedLabel = formatElapsedHours(elapsedMs);

  if (isBreach) {
    if (count === 1) {
      return `This request has been in 'For Release' for ${elapsedLabel} and has now exceeded the 3-hour limit. Please send a delay notice immediately.`;
    }

    return `There are ${count} requests in 'For Release' for ${elapsedLabel}. They have now exceeded the 3-hour limit. Please send delay notices immediately.`;
  }

  const minutesRemaining = formatRemainingMinutes(remainingMs);
  if (count === 1) {
    return `This request has been in 'For Release' for ${elapsedLabel}. Only ${minutesRemaining} minutes remain before exceeding the 3-hour limit. Please take action to avoid delay.`;
  }

  return `There are ${count} requests in 'For Release' for ${elapsedLabel}. Only ${minutesRemaining} minutes remain before they exceed the 3-hour limit. Please take action to avoid delay.`;
};

export const createDelayAlertNotification = ({
  stage,
  requests,
  createdAt = new Date().toISOString(),
}) => {
  const stageMeta = STAGE_DEFINITIONS[stage];
  const highestElapsedMs = Math.max(
    ...requests.map((request) => getForReleasingElapsedMs(request)),
  );
  const remainingMs =
    STAGE_DEFINITIONS.breach.thresholdMs - highestElapsedMs;

  return {
    id: Date.now() * 10 + stageMeta.severity,
    action: "FOR_RELEASE_DELAY_ALERT",
    entity_type: "certificate_request",
    entity_id: requests.length === 1 ? requests[0].id : null,
    field_name: stage,
    old_value: `${requests.length} request${requests.length === 1 ? "" : "s"}`,
    new_value: requests.map((request) => request.reference_number).join(", "),
    user_name: "System",
    notes: buildDelayAlertMessage({
      count: requests.length,
      elapsedMs: highestElapsedMs,
      remainingMs,
      isBreach: stage === "breach",
    }),
    created_at: createdAt,
    localOnly: true,
  };
};

export const getNotificationMeta = (item) => {
  if (item.action === "REQUEST_PRINTED") {
    return {
      title: "Document Printed",
      badge: item.old_value || "Certificate request",
      message: item.notes,
      tone: "border-emerald-200 bg-emerald-50/40",
      badgeTone: "text-emerald-700",
    };
  }

  if (item.action === "REQUEST_REVIEW_REQUIRED") {
    return {
      title: "Historical Record Review Needed",
      badge: item.old_value || "Certificate request",
      message: item.notes,
      tone: "border-amber-200 bg-amber-50/40",
      badgeTone: "text-amber-700",
    };
  }

  if (item.action === "REQUEST_DELAY_NOTICE_SENT") {
    return {
      title: "Delay Notice Sent",
      badge: item.old_value || "For Release",
      message: item.notes,
      tone: "border-blue-200 bg-blue-50/40",
      badgeTone: "text-blue-700",
    };
  }

  const stageMeta = STAGE_DEFINITIONS[item.field_name] || STAGE_DEFINITIONS.early;
  return {
    title: stageMeta.title,
    badge: item.old_value || "For Release",
    message: item.notes,
    tone: stageMeta.containerTone,
    badgeTone: stageMeta.badgeTone,
  };
};

export const mergeNotifications = (remoteItems, localItems) =>
  sortByNewest([...(remoteItems || []), ...(localItems || [])]);
