import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Checking from "../../pages/certify/checking";
import Tracker from "../../pages/certify/tracker";
import { server, http, HttpResponse } from "../msw/server";

const baseUrl = "http://localhost:8000/api/v1";

const makeRequest = (overrides = {}) => ({
  id: 1,
  status: "APPROVED",
  reference_number: "REF-001",
  certificate_type_name: "Certification",
  student_name: "Ada Lovelace",
  program: "BSCS",
  purpose: "Job",
  requestor_name: "Ada",
  requestor_email: "ada@example.com",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe("Integration: request processing flow", () => {
  it("moves approved requests to PROCESSING from Checking", async () => {
    const user = userEvent.setup();
    let requests = [makeRequest({ id: 1 }), makeRequest({ id: 2, reference_number: "REF-002" })];
    const patches = [];

    server.use(
      http.get(`${baseUrl}/requests/`, () => HttpResponse.json(requests)),
      http.patch(`${baseUrl}/requests/:id/status`, async ({ params, request }) => {
        const body = await request.json();
        const id = Number(params.id);
        patches.push({ id, status: body.new_status });
        requests = requests.map((r) =>
          r.id === id ? { ...r, status: body.new_status, updated_at: new Date().toISOString() } : r
        );
        return HttpResponse.json(requests.find((r) => r.id === id));
      })
    );

    render(<Checking />);

    const button = await screen.findByRole("button", { name: /process all/i });
    await user.click(button);

    await waitFor(() => {
      expect(patches).toHaveLength(2);
      expect(patches.every((p) => p.status === "PROCESSING")).toBe(true);
    });
  });

  it("moves PROCESSING request to FOR_RELEASING in Tracker", async () => {
    const user = userEvent.setup();
    let requests = [makeRequest({ status: "PROCESSING" })];

    server.use(
      http.get(`${baseUrl}/requests/`, () => HttpResponse.json(requests)),
      http.patch(`${baseUrl}/requests/:id/status`, async ({ params, request }) => {
        const body = await request.json();
        const id = Number(params.id);
        requests = requests.map((r) =>
          r.id === id ? { ...r, status: body.new_status, updated_at: new Date().toISOString() } : r
        );
        return HttpResponse.json(requests.find((r) => r.id === id));
      })
    );

    render(<Tracker />);

    const action = await screen.findByTitle(/Mark as For Releasing/i);
    await user.click(action);

    await waitFor(() => {
      expect(requests[0].status).toBe("FOR_RELEASING");
    });
  });
});
