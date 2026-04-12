import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentTagging from "../../pages/certify/cashier/payment";
import { server, http, HttpResponse } from "../msw/server";

const baseUrl = "http://localhost:8000/api/v1";

const makeRequest = (overrides = {}) => ({
  id: 10,
  status: "PROCESSING",
  reference_number: "PAY-001",
  certificate_type_name: "Certification",
  student_name: "Grace Hopper",
  program: "BSIT",
  requestor_name: "Grace",
  requestor_email: "grace@example.com",
  request_cost: 120,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe("Integration: payment tagging flow", () => {
  it("records payment and marks request as paid", async () => {
    const user = userEvent.setup();
    let requests = [makeRequest()];
    let unpaidIds = new Set([10]);
    let payments = [];

    server.use(
      http.get(`${baseUrl}/requests/`, () => HttpResponse.json(requests)),
      http.get(`${baseUrl}/payments/unpaid-requests`, () =>
        HttpResponse.json(requests.filter((r) => unpaidIds.has(r.id)))
      ),
      http.post(`${baseUrl}/payments/by-references`, async ({ request }) => {
        const body = await request.json();
        const items = payments.filter((p) => body.reference_numbers.includes(p.reference_number));
        return HttpResponse.json({ items });
      }),
      http.post(`${baseUrl}/payments/`, async ({ request }) => {
        const body = await request.json();
        unpaidIds.delete(body.request_id);
        payments.push({
          reference_number: requests.find((r) => r.id === body.request_id)?.reference_number,
          paid_at: new Date().toISOString(),
          or_number: body.or_number,
        });
        return HttpResponse.json({ ok: true });
      })
    );

    render(<PaymentTagging />);

    const [recordButton] = await screen.findAllByRole("button", {
      name: /record payment/i,
    });
    await user.click(recordButton);

    const input = await screen.findByPlaceholderText(/or number/i);
    await user.type(input, "OR-123");

    const modalTitle = await screen.findByRole("heading", {
      name: /enter or number/i,
    });
    const modal = modalTitle.closest("div");
    const confirm = within(modal).getByRole("button", {
      name: /record payment/i,
    });
    await user.click(confirm);

    await waitFor(
      () => {
        expect(payments.length).toBe(1);
        expect(unpaidIds.has(10)).toBe(false);
      },
      { timeout: 8000 }
    );
  }, 10000);
});
