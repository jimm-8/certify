import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import Tracker from "../tracker";
import requestService from "../../../services/requestService";

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
  });

  it("moves approved request to processing", async () => {
    const user = userEvent.setup();
    const request = {
      id: 11,
      status: "APPROVED",
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
      status: "PROCESSING",
    });

    render(<Tracker />);

    const action = await screen.findByTitle(/Mark as Processing/i);
    await user.click(action);

    await waitFor(() => {
      expect(requestService.updateStatus).toHaveBeenCalledWith(
        request.id,
        "PROCESSING",
      );
    });
  });
});
