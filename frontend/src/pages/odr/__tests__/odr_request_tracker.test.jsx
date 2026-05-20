// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OdrRequestTracker from "../odr_request_tracker";
import requestService from "../../../services/requestService";

vi.mock("../../../services/requestService", () => ({
  default: {
    trackRequest: vi.fn(),
  },
}));

describe("OdrRequestTracker", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "setInterval");
    vi.spyOn(globalThis, "clearInterval");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("shows the live queue position and refreshes tracked requests", async () => {
    let refreshCallback = null;
    globalThis.setInterval.mockImplementation((callback) => {
      refreshCallback = callback;
      return 1;
    });

    requestService.trackRequest.mockResolvedValue({
      reference_number: "REF-123",
      status: "APPROVED",
      request_type: "certificate",
      request_label: "Certification",
      student_name: "Ada Lovelace",
      submitted_date: "2026-05-21T08:00:00Z",
      updated_date: "2026-05-21T08:01:00Z",
      queue_position: 2,
      queue_total: 5,
      queue_scope: "overall",
    });

    render(<OdrRequestTracker />);

    fireEvent.change(screen.getByPlaceholderText(/reference no\./i), {
      target: { value: "REF-123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/4 digit pin/i), {
      target: { value: "1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /track/i }));

    expect(
      await screen.findByText(/overall queue position: #2 of 5\./i),
    ).toBeInTheDocument();

    expect(refreshCallback).toEqual(expect.any(Function));
    await waitFor(() => {
      expect(
        globalThis.setInterval.mock.calls.some(([, delay]) => delay === 5000),
      ).toBe(true);
    });
  });
});
