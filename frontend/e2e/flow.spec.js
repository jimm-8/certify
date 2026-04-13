import { test, expect } from "@playwright/test";

const baseApi = "http://localhost:8000/api/v1";

const createToken = () => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "e2e-user",
      role: "registrar_head",
      exp: 4102444800,
    })
  ).toString("base64");

  return `${header}.${payload}.signature`;
};

test("end-to-end flow: approve -> process -> pay -> release", async ({ page }) => {
  const token = createToken();

  const state = {
    requests: [
      {
        id: 100,
        status: "APPROVED",
        reference_number: "E2E-100",
        certificate_type_name: "Certification",
        student_name: "Ada Lovelace",
        program: "BSCS",
        purpose: "Employment",
        requestor_name: "Ada Lovelace",
        requestor_email: "ada@example.com",
        request_cost: 150,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    unpaidIds: new Set([100]),
    payments: [],
  };

  await page.addInitScript((value) => {
    localStorage.setItem("access_token", value);
  }, token);

  await page.route("**/certificate-types/", (route) =>
    route.fulfill({ json: [] })
  );

  await page.route("**/settings/wet-signature", (route) =>
    route.fulfill({ json: { use_wet_signature: true } })
  );

  await page.route("**/dashboard/summary*", (route) =>
    route.fulfill({
      json: {
        totals: {},
        changes: {},
        status_breakdown: {},
        requests_over_time: [],
        monthly_overview: [],
        recent_requests: [],
        certificate_history: [],
        alerts: { pending_over_5_days: 0 },
      },
    })
  );

  await page.route("**/requests/validate", (route) =>
    route.fulfill({ json: { results: [] } })
  );

  await page.route("**/requests/?*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ json: state.requests });
    } else {
      await route.fulfill({ status: 405 });
    }
  });

  await page.route(new RegExp(`${baseApi}/requests/\\d+/status`), async (route) => {
    const body = await route.request().postDataJSON();
    const id = Number(route.request().url().match(/requests\/(\d+)\/status/)?.[1]);
    state.requests = state.requests.map((r) =>
      r.id === id ? { ...r, status: body.new_status, updated_at: new Date().toISOString() } : r
    );
    const updated = state.requests.find((r) => r.id === id);
    await route.fulfill({ json: updated });
  });

  await page.route("**/payments/unpaid-requests*", async (route) => {
    const unpaid = state.requests.filter((r) => state.unpaidIds.has(r.id));
    await route.fulfill({ json: unpaid });
  });

  await page.route("**/payments/by-references", async (route) => {
    const body = await route.request().postDataJSON();
    const items = state.payments.filter((p) =>
      body.reference_numbers.includes(p.reference_number)
    );
    await route.fulfill({ json: { items } });
  });

  await page.route("**/payments/", async (route) => {
    const body = await route.request().postDataJSON();
    state.unpaidIds.delete(body.request_id);
    const reference = state.requests.find((r) => r.id === body.request_id)?.reference_number;
    state.payments.push({
      reference_number: reference,
      paid_at: new Date().toISOString(),
      or_number: body.or_number,
    });
    await route.fulfill({ json: { ok: true } });
  });

  await page.route(new RegExp(`${baseApi}/requests/\\d+/send-ready-email`), async (route) => {
    const id = Number(route.request().url().match(/requests\/(\d+)\/send-ready-email/)?.[1]);
    const now = new Date().toISOString();
    state.requests = state.requests.map((r) =>
      r.id === id
        ? { ...r, ready_email_sent_at: now, updated_at: now }
        : r
    );
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto("/login");
  await page.evaluate((value) => {
    localStorage.setItem("access_token", value);
    sessionStorage.setItem("access_token", value);
  }, token);
  await page.goto("/");

  await page.getByText("Certify");
  await page.getByRole("button", { name: /Received Request/i }).click();
  await page.getByRole("button", { name: /Process All/i }).click();
  await expect.poll(() => state.requests[0].status).toBe("PROCESSING");

  await page.goto("/payment-tagging");
  await page.getByRole("button", { name: /record payment/i }).click();
  await page.getByPlaceholder(/or number/i).fill("OR-2026");
  const modal = page.getByRole("heading", { name: /enter or number/i }).locator("..");
  await modal.getByRole("button", { name: /^Record Payment$/i }).click();
  await expect.poll(() => state.unpaidIds.has(100)).toBeFalsy();

  await page.goto("/");
  await page.getByRole("button", { name: /Under Processing/i }).click();
  await page.getByTitle(/Mark as For Releasing/i).click();
  await expect.poll(() => state.requests[0].status).toBe("FOR_RELEASING");

  await page.getByRole("button", { name: /For Release/i }).click();
  await page.getByTitle(/Send Ready Email/i).click();
  await page.getByTitle(/Mark as Released/i).click();

  await expect.poll(() => state.requests[0].status).toBe("RELEASED");
  await expect(page.getByText(/No requests ready for releasing/i)).toBeVisible();
});
