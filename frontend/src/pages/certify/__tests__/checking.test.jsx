import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import Checking from "../checking";
import requestService from "../../../services/requestService";

vi.mock("../../../services/requestService", () => ({
  default: {
    getAllRequests: vi.fn(),
    getCertificateTypes: vi.fn(),
    validateRequests: vi.fn(),
    updateStatus: vi.fn(),
    sendRejectionEmail: vi.fn(),
  },
}));

vi.mock("../../../components/common/requestModal", () => ({
  default: ({ request, onApprove, onClose }) =>
    request ? (
      <div>
        <button type="button" onClick={() => onApprove?.(request)}>
          Modal Approve
        </button>
        <button type="button" onClick={() => onClose?.()}>
          Modal Close
        </button>
      </div>
    ) : null,
}));

describe("Checking page", () => {
  beforeEach(() => {
    requestService.getAllRequests.mockResolvedValue([]);
    requestService.getCertificateTypes.mockResolvedValue([]);
    requestService.validateRequests.mockResolvedValue({ results: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no approved requests", async () => {
    render(<Checking />);
    expect(await screen.findByText(/No requests found/i)).toBeInTheDocument();
  });

  it("processes approved requests in bulk", async () => {
    const user = userEvent.setup();
    const approved = [
      {
        id: 1,
        status: "APPROVED",
        certificate_type_name: "Certification",
        student_name: "Ada",
        program: "BSCS",
        created_at: new Date().toISOString(),
        requestor_name: "Ada",
        requestor_email: "ada@example.com",
      },
      {
        id: 2,
        status: "APPROVED",
        certificate_type_name: "Good Moral",
        student_name: "Grace",
        program: "BSIT",
        created_at: new Date().toISOString(),
        requestor_name: "Grace",
        requestor_email: "grace@example.com",
      },
    ];

    requestService.getAllRequests.mockResolvedValue(approved);
    requestService.validateRequests.mockResolvedValue({ results: [] });
    requestService.updateStatus.mockResolvedValue({});

    render(<Checking />);

    const button = await screen.findByRole("button", {
      name: /process all/i,
    });

    await user.click(button);

    await waitFor(() => {
      expect(requestService.updateStatus).toHaveBeenCalledTimes(2);
    });

    expect(requestService.updateStatus).toHaveBeenCalledWith(
      1,
      "PROCESSING",
      "Request moved to processing",
    );
    expect(requestService.updateStatus).toHaveBeenCalledWith(
      2,
      "PROCESSING",
      "Request moved to processing",
    );
  });

  it("closes the request modal after approval and shows loading then submitted feedback", async () => {
    const user = userEvent.setup();
    const approved = [
      {
        id: 1,
        status: "APPROVED",
        certificate_type_name: "Certification",
        student_name: "Ada",
        program: "BSCS",
        created_at: new Date().toISOString(),
        requestor_name: "Ada",
        requestor_email: "ada@example.com",
      },
    ];

    requestService.getAllRequests.mockResolvedValue(approved);
    requestService.validateRequests.mockResolvedValue({ results: [] });
    let resolveUpdate;
    requestService.updateStatus.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    render(<Checking />);

    await user.click(await screen.findByText("Ada"));
    await user.click(await screen.findByRole("button", { name: /modal approve/i }));

    expect(
      screen.queryByRole("button", { name: /modal approve/i }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText(/please wait while the certificate request is being submitted/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/working\.\.\./i)).toBeInTheDocument();

    resolveUpdate({});

    await waitFor(() => {
      expect(requestService.updateStatus).toHaveBeenCalledWith(
        1,
        "PROCESSING",
        "Request moved to processing",
      );
    });

    expect(
      await screen.findByText(/certificate request submitted successfully/i),
    ).toBeInTheDocument();
  });
});
