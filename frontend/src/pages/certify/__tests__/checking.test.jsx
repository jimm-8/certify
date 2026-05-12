// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

    const button = (await screen.findAllByRole("button", {
      name: /process all/i,
    })).find((item) => !item.disabled);

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

  it("closes the request modal only after approval succeeds and shows loading then submitted feedback", async () => {
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

    const adaCell = (await screen.findAllByText("Ada"))[0];
    await user.click(adaCell);
    await user.click(await screen.findByRole("button", { name: /modal approve/i }));

    expect(screen.getByRole("button", { name: /modal approve/i })).toBeInTheDocument();
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

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /modal approve/i }),
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText(/certificate request submitted successfully/i),
    ).toBeInTheDocument();
  });

  it("shows backend conflict details in feedback dialog when approval claim is lost", async () => {
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
    requestService.updateStatus.mockRejectedValue({
      response: {
        data: {
          detail: "Request was already claimed by janine_aguisanda.",
        },
      },
    });

    render(<Checking />);

    const adaCell = (await screen.findAllByText("Ada"))[0];
    await user.click(adaCell);
    await user.click(await screen.findByRole("button", { name: /modal approve/i }));

    expect(
      await screen.findByText(/request was already claimed by janine_aguisanda\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
  });

  it("shows needs review when auto validation returns graduation-related flags", async () => {
    const approved = [
      {
        id: 7,
        status: "APPROVED",
        certificate_type_name: "Certification of GWA",
        student_name: "Ada",
        program: "BSCS",
        created_at: new Date().toISOString(),
        requestor_name: "Ada",
        requestor_email: "ada@example.com",
      },
    ];

    requestService.getAllRequests.mockResolvedValue(approved);
    requestService.validateRequests.mockResolvedValue({
      results: [
        {
          request_id: 7,
          exists: true,
          flags: [
            "Student is not yet graduated for the requested GWA certificate.",
          ],
        },
      ],
    });

    render(<Checking />);

    expect((await screen.findAllByText(/needs review/i)).length).toBeGreaterThan(
      0,
    );
  });
});
