import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTO_VALIDATION_NOTIFICATION_ACTION,
  getForReleasingElapsedMs,
  getForReleasingStartedAtMs,
  getLocalNotifications,
  syncAutoValidationNotifications,
} from "../notificationCenter";

const createStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

const installWindowMock = () => {
  const localStorage = createStorage();
  vi.stubGlobal("window", {
    localStorage,
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal(
    "CustomEvent",
    class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
  );
  return localStorage;
};

describe("notificationCenter", () => {
  it("returns anomaly notifications from local storage with other local notifications", () => {
    const localStorage = installWindowMock();

    localStorage.setItem(
      "certify.notifications.localItems",
      JSON.stringify([
        {
          id: 181,
          action: AUTO_VALIDATION_NOTIFICATION_ACTION,
          field_name: "auto_validation",
          created_at: "2026-05-14T10:00:00.000Z",
          notes: "Auto-validation flagged this request for review: Missing student name.",
        },
        {
          id: 101,
          action: "FOR_RELEASE_DELAY_ALERT",
          field_name: "early",
          created_at: "2026-05-14T09:00:00.000Z",
          notes: "Delay alert",
        },
      ]),
    );

    expect(getLocalNotifications().map((item) => item.action)).toEqual([
      AUTO_VALIDATION_NOTIFICATION_ACTION,
      "FOR_RELEASE_DELAY_ALERT",
    ]);
  });

  it("syncs anomaly notifications into the local notification list", () => {
    installWindowMock();

    const nextItems = syncAutoValidationNotifications({
      requests: [
        {
          id: 42,
          request_label: "Certificate of Registration",
          student_name: "",
          program: "BSIT",
          certificate_type_name: "Registration",
          created_at: "2026-05-14T09:00:00.000Z",
          requestor_name: "Jane Doe",
          requestor_email: "jane@example.com",
        },
      ],
      validationMap: {},
    });

    expect(
      nextItems.some(
        (item) => item.action === AUTO_VALIDATION_NOTIFICATION_ACTION,
      ),
    ).toBe(true);
    expect(
      getLocalNotifications().some(
        (item) => item.action === AUTO_VALIDATION_NOTIFICATION_ACTION,
      ),
    ).toBe(true);
  });

  it("keeps a single anomaly notification per request across repeated syncs", () => {
    installWindowMock();

    const payload = {
      requests: [
        {
          id: 42,
          request_label: "Certificate of Registration",
          student_name: "",
          program: "BSIT",
          certificate_type_name: "Registration",
          created_at: "2026-05-14T09:00:00.000Z",
          requestor_name: "Jane Doe",
          requestor_email: "jane@example.com",
        },
      ],
      validationMap: {
        42: {
          flags: ["Missing student name.", "Invalid adviser record."],
        },
      },
    };

    syncAutoValidationNotifications(payload);
    const secondSyncItems = syncAutoValidationNotifications(payload);
    const anomalies = secondSyncItems.filter(
      (item) => item.action === AUTO_VALIDATION_NOTIFICATION_ACTION,
    );

    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].entity_id).toBe(42);
  });

  it("prefers stable release timestamps over updated_at", () => {
    const request = {
      created_at: "2026-04-25T00:46:24+08:00",
      for_releasing_started_at: null,
      auto_print_requested_at: "2026-04-25T01:00:00+08:00",
      updated_at: "2026-04-25T02:51:06+08:00",
    };

    expect(getForReleasingStartedAtMs(request)).toBe(
      new Date("2026-04-25T00:46:24+08:00").getTime(),
    );
  });

  it("falls back to created_at when there is no release timestamp", () => {
    const request = {
      for_releasing_started_at: null,
      auto_print_requested_at: null,
      ready_email_sent_at: null,
      created_at: "2026-04-25T00:46:24+08:00",
      updated_at: "2026-04-25T02:51:06+08:00",
    };

    expect(getForReleasingStartedAtMs(request)).toBe(
      new Date("2026-04-25T00:46:24+08:00").getTime(),
    );
  });

  it("computes elapsed time without resetting from updated_at churn", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T03:30:00+08:00"));

    const request = {
      for_releasing_started_at: null,
      auto_print_requested_at: "2026-04-25T01:00:00+08:00",
      created_at: "2026-04-25T00:46:24+08:00",
      updated_at: "2026-04-25T03:29:00+08:00",
      processing_hold_total_seconds: 0,
      processing_hold_active: false,
      release_hold_total_seconds: 0,
      release_hold_active: false,
    };

    expect(getForReleasingElapsedMs(request)).toBe(163.6 * 60 * 1000);

    vi.useRealTimers();
  });

  it("subtracts payment waiting hold time from the ready alert clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T03:30:00+08:00"));

    const request = {
      created_at: "2026-04-25T00:30:00+08:00",
      processing_hold_total_seconds: 60 * 60,
      processing_hold_active: false,
      release_hold_total_seconds: 0,
      release_hold_active: false,
    };

    expect(getForReleasingElapsedMs(request)).toBe(2 * 60 * 60 * 1000);

    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
