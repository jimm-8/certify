import { render, screen } from "@testing-library/react";
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
});
