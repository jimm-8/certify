// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Tracker from "../tracker";
import requestService from "../../../services/requestService";
import paymentService from "../../../services/paymentService";

vi.mock("../../../utils/auth", () => ({
  getTokenPayload: vi.fn(() => ({ sub: "processor1" })),
}));

vi.mock("../../../services/requestService", () => ({
  default: {
    autoQueueApprovedRequests: vi.fn(),
    getAllRequests: vi.fn(),
    getCertificateTypes: vi.fn(),
    validateRequests: vi.fn(),
    generateCertificate: vi.fn(),
  },
}));

vi.mock("../../../services/paymentService", () => ({
  default: {
    getPaymentsByReferences: vi.fn(),
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
    requestService.autoQueueApprovedRequests.mockResolvedValue({});
    requestService.getCertificateTypes.mockResolvedValue([]);
    requestService.validateRequests.mockResolvedValue({ results: [] });
    paymentService.getPaymentsByReferences.mockResolvedValue({ items: [] });
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

  it("shows unpaid for releasing requests in tracker", async () => {
    const user = userEvent.setup();
    const request = {
      id: 11,
      status: "FOR_RELEASING",
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
    paymentService.getPaymentsByReferences.mockResolvedValue({ items: [] });

    render(<Tracker />);

    expect(await screen.findByText(/Awaiting Payment/i)).toBeInTheDocument();

    const action = await screen.findByTitle(/View Details/i);
    await user.click(action);

    await waitFor(() => {
      expect(screen.getByText(/Ada/i)).toBeInTheDocument();
    });
  });
});
