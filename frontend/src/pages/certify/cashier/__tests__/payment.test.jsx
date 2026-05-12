import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import PaymentTagging from "../payment";
import requestService from "../../../../services/requestService";
import paymentService from "../../../../services/paymentService";

vi.mock("../../../../services/requestService", () => ({
  default: {
    getAllRequests: vi.fn(),
  },
}));

vi.mock("../../../../services/paymentService", () => ({
  default: {
    getUnpaidRequests: vi.fn(),
    getPaymentsByReferences: vi.fn(),
    createPayment: vi.fn(),
  },
}));

describe("Payment tagging page", () => {
  beforeEach(() => {
    requestService.getAllRequests.mockResolvedValue([]);
    paymentService.getUnpaidRequests.mockResolvedValue([]);
    paymentService.getPaymentsByReferences.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no requests", async () => {
    render(<PaymentTagging />);
    expect(await screen.findByText(/No requests found/i)).toBeInTheDocument();
  });

  it("shows loading then success feedback when recording payment", async () => {
    const user = userEvent.setup();
    let resolvePayment;

    requestService.getAllRequests.mockResolvedValue([
      {
        id: 10,
        reference_number: "REF-100",
        student_name: "Ada Lovelace",
        certificate_type_name: "Certification",
        created_at: new Date().toISOString(),
        status: "PROCESSING",
        request_cost: 30,
      },
    ]);
    paymentService.getUnpaidRequests.mockResolvedValue([{ id: 10 }]);
    paymentService.getPaymentsByReferences.mockResolvedValue({ items: [] });
    paymentService.createPayment.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePayment = resolve;
        }),
    );

    render(<PaymentTagging />);

    await user.click(await screen.findByRole("button", { name: /record payment/i }));
    const orInput = screen.getByPlaceholderText(/or number/i);
    const orModal = orInput.closest("div.w-full.max-w-sm");
    await user.type(orInput, "1900054");
    await user.click(
      within(orModal).getByRole("button", { name: /^record payment$/i }),
    );
    const confirmDialog = await screen.findByText(
      /please review the or number before submitting this payment/i,
    );
    const confirmModal = confirmDialog.closest("div[class*='max-w-sm']");
    expect(screen.getByText("1900054")).toBeInTheDocument();
    await user.click(
      within(confirmModal).getByRole("button", { name: /submit payment/i }),
    );

    expect(
      await screen.findByText(/please wait while the payment is being recorded/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/working\.\.\./i)).toBeInTheDocument();

    resolvePayment({});

    await waitFor(() => {
      expect(paymentService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: 10,
          or_number: "1900054",
        }),
      );
    });

    expect(
      await screen.findByText(/payment has been tagged successfully/i),
    ).toBeInTheDocument();
  });
});
