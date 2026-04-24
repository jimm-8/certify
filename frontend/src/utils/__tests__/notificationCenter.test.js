import { describe, expect, it, vi } from "vitest";
import {
  getForReleasingElapsedMs,
  getForReleasingStartedAtMs,
} from "../notificationCenter";

describe("notificationCenter", () => {
  it("prefers stable release timestamps over updated_at", () => {
    const request = {
      for_releasing_started_at: null,
      auto_print_requested_at: "2026-04-25T01:00:00+08:00",
      created_at: "2026-04-25T00:46:24+08:00",
      updated_at: "2026-04-25T02:51:06+08:00",
    };

    expect(getForReleasingStartedAtMs(request)).toBe(
      new Date("2026-04-25T01:00:00+08:00").getTime(),
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
      release_hold_total_seconds: 0,
      release_hold_active: false,
    };

    expect(getForReleasingElapsedMs(request)).toBe(150 * 60 * 1000);

    vi.useRealTimers();
  });
});
