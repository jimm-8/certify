import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import Ready from "../ready";
import requestService from "../../../services/requestService";
import settingsService from "../../../services/settingsService";
import paymentService from "../../../services/paymentService";

vi.mock("../../../services/requestService", () => ({
  default: {
    getAllRequests: vi.fn(),
    getCertificateTypes: vi.fn(),
    sendReadyEmail: vi.fn(),
    updateStatus: vi.fn(),
    downloadCertificate: vi.fn(),
  },
}));

vi.mock("../../../services/settingsService", () => ({
  default: {
    getWetSignature: vi.fn(),
  },
}));

vi.mock("../../../services/paymentService", () => ({
  default: {
    getPaymentsByReferences: vi.fn(),
  },
}));

describe("Ready page", () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("shows empty state when no requests", async () => {
    requestService.getAllRequests.mockResolvedValue([]);
    requestService.getCertificateTypes.mockResolvedValue([]);
    paymentService.getPaymentsByReferences.mockResolvedValue({ items: [] });
    settingsService.getWetSignature.mockResolvedValue({ use_wet_signature: false });

    render(<Ready />);

    expect(
      await screen.findByText(/No requests ready for releasing/i)
    ).toBeInTheDocument();
  });

  it("sends ready email when wet signature enabled", async () => {
    const user = userEvent.setup();
    const request = {
      id: 10,
      status: "FOR_RELEASING",
      reference_number: "REF-100",
      certificate_type_name: "Certification",
      student_name: "Ada Lovelace",
      program: "BSCS",
      purpose: "Job",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    requestService.getAllRequests.mockResolvedValue([request]);
    requestService.getCertificateTypes.mockResolvedValue([]);
    requestService.sendReadyEmail.mockResolvedValue({});
    requestService.downloadCertificate.mockResolvedValue(
      new Blob(["test"], { type: "application/pdf" }),
    );
    paymentService.getPaymentsByReferences.mockResolvedValue({ items: [] });
    settingsService.getWetSignature.mockResolvedValue({ use_wet_signature: true });

    render(<Ready />);

    await screen.findByText(/REF-100/i);
    const sendButton = await screen.findByTitle(/Send Ready Email/i);
    await user.click(sendButton);

    expect(requestService.sendReadyEmail).toHaveBeenCalledWith(request.id);
  });

  it("marks request as released after ready email sent", async () => {
    const user = userEvent.setup();
    const request = {
      id: 12,
      status: "FOR_RELEASING",
      reference_number: "REF-120",
      certificate_type_name: "Certification",
      student_name: "Grace",
      program: "BSIT",
      purpose: "Employment",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ready_email_sent_at: new Date().toISOString(),
    };

    requestService.getAllRequests.mockResolvedValue([request]);
    requestService.getCertificateTypes.mockResolvedValue([]);
    requestService.updateStatus.mockResolvedValue({
      ...request,
      status: "RELEASED",
    });
    paymentService.getPaymentsByReferences.mockResolvedValue({ items: [] });
    settingsService.getWetSignature.mockResolvedValue({ use_wet_signature: true });

    render(<Ready />);

    const releaseButton = await screen.findByTitle(/Mark as Released/i);
    await user.click(releaseButton);

    expect(requestService.updateStatus).toHaveBeenCalledWith(
      request.id,
      "RELEASED",
    );
  });

  it("downloads certificate when preview is opened", async () => {
    const user = userEvent.setup();
    const request = {
      id: 13,
      status: "FOR_RELEASING",
      reference_number: "REF-130",
      certificate_type_name: "Certification",
      student_name: "Alan",
      program: "BSCS",
      purpose: "Scholarship",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    requestService.getAllRequests.mockResolvedValue([request]);
    requestService.getCertificateTypes.mockResolvedValue([]);
    requestService.downloadCertificate.mockResolvedValue(
      new Blob(["test"], { type: "application/pdf" }),
    );
    paymentService.getPaymentsByReferences.mockResolvedValue({ items: [] });
    settingsService.getWetSignature.mockResolvedValue({ use_wet_signature: false });

    render(<Ready />);

    const viewButton = await screen.findByTitle(/View Details/i);
    await user.click(viewButton);

    expect(requestService.downloadCertificate).toHaveBeenCalledWith(request.id);
  });
});
