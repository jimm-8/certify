import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import GlobalPrintQueue from "../global_print_queue";

vi.mock("../../../services/requestService", () => ({
  default: {
    getAllRequests: vi.fn(),
  },
}));

vi.mock("../../../utils/printQueue", () => ({
  getDefaultPrintQueueState: () => ({
    active: false,
    status: "idle",
    processed: 0,
    total: 0,
    failed: 0,
    lastPrintedAt: null,
  }),
  readPrintQueueState: () => ({
    active: false,
    status: "idle",
    processed: 0,
    total: 0,
    failed: 0,
    lastPrintedAt: null,
  }),
  subscribeToPrintQueue: () => () => {},
}));

import requestService from "../../../services/requestService";

describe("GlobalPrintQueue", () => {
  beforeAll(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 720,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 320;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return 220;
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("restores a saved position from local storage", async () => {
    requestService.getAllRequests.mockResolvedValue([]);
    window.localStorage.setItem(
      "certify.printQueue.position",
      JSON.stringify({ x: 120, y: 180 }),
    );

    render(<GlobalPrintQueue />);

    await screen.findByText(/Queue is clear/i);
    expect(screen.getByTestId("global-print-queue")).toHaveStyle({
      left: "120px",
      top: "180px",
    });
  });

  it("updates the queue position when dragged", async () => {
    requestService.getAllRequests.mockResolvedValue([]);

    render(<GlobalPrintQueue />);

    const queue = screen.getByTestId("global-print-queue");
    const dragHandle = screen.getByText("Print Job Status").closest("div");
    queue.getBoundingClientRect = vi.fn(() => ({
      left: 500,
      top: 400,
      right: 820,
      bottom: 620,
      width: 320,
      height: 220,
    }));

    fireEvent.pointerDown(dragHandle, {
      pointerId: 1,
      button: 0,
      clientX: 520,
      clientY: 420,
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 300,
      clientY: 250,
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
    });

    await waitFor(() => {
      expect(queue).toHaveStyle({
        left: "280px",
        top: "230px",
      });
    });

    expect(window.localStorage.getItem("certify.printQueue.position")).toBe(
      JSON.stringify({ x: 280, y: 230 }),
    );
  });
});
