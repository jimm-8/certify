// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Tracker from "../tracker";
import requestService from "../../../services/requestService";

vi.mock("../../../utils/auth", () => ({
  getTokenPayload: vi.fn(() => ({ sub: "processor1" })),
}));

vi.mock("../../../services/requestService", () => ({
  default: {
    getAllRequests: vi.fn(),
    getCertificateTypes: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock("../../../components/common/requestModal", () => ({
  default: () => null,
}));

vi.mock("../../../components/common/bulkStatusModal", () => ({
  default: () => null,
}));

describe("Tracker page", () => {
  beforeEach(() => {
    requestService.getAllRequests.mockResolvedValue([]);
    requestService.getCertificateTypes.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no requests", async () => {
    render(<Tracker />);
    expect(await screen.findByText(/No requests found/i)).toBeInTheDocument();
    expect(requestService.getAllRequests).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
      ownerUsername: "processor1",
    });
  });

  it("moves processing request to for releasing", async () => {
    const user = userEvent.setup();
    const request = {
      id: 11,
      status: "PROCESSING",
      reference_number: "REF-11",
      certificate_type_name: "Certification",
      student_name: "Ada",
      program: "BSCS",
      purpose: "Job",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    requestService.getAllRequests.mockResolvedValue([request]);
    requestService.getCertificateTypes.mockResolvedValue([]);
    requestService.updateStatus.mockResolvedValue({
      ...request,
      status: "FOR_RELEASING",
    });

    render(<Tracker />);

    const action = await screen.findByTitle(/Mark as For Releasing/i);
    await user.click(action);

    await waitFor(() => {
      expect(requestService.updateStatus).toHaveBeenCalledWith(
        request.id,
        "FOR_RELEASING",
      );
    });
  });
});
