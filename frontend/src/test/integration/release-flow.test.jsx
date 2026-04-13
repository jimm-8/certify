import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Ready from "../../pages/certify/ready";
import { server, http, HttpResponse } from "../msw/server";

const baseUrl = "http://localhost:8000/api/v1";

const makeRequest = (overrides = {}) => ({
  id: 21,
  status: "FOR_RELEASING",
  reference_number: "REL-001",
  certificate_type_name: "Certification",
  student_name: "Alan Turing",
  program: "BSCS",
  purpose: "Employment",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ready_email_sent_at: new Date().toISOString(),
  ...overrides,
});

describe("Integration: release flow", () => {
  it("marks request as RELEASED from Ready page", async () => {
    const user = userEvent.setup();
    let requests = [makeRequest()];

    server.use(
      http.get(`${baseUrl}/requests/`, () => HttpResponse.json(requests)),
      http.patch(`${baseUrl}/requests/:id/status`, async ({ params }) => {
        const id = Number(params.id);
        requests = requests.map((r) =>
          r.id === id ? { ...r, status: "RELEASED", updated_at: new Date().toISOString() } : r
        );
        return HttpResponse.json(requests.find((r) => r.id === id));
      })
    );

    render(<Ready />);

    const releaseButton = await screen.findByTitle(/Mark as Released/i);
    await user.click(releaseButton);

    await waitFor(() => {
      expect(requests[0].status).toBe("RELEASED");
    });
  });
});
