# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flow.spec.js >> end-to-end flow: approve -> process -> pay -> release
- Location: e2e\flow.spec.js:18:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/
Call log:
  - navigating to "http://127.0.0.1:5173/", waiting until "load"

```

# Test source

```ts
  33  |         request_cost: 150,
  34  |         created_at: new Date().toISOString(),
  35  |         updated_at: new Date().toISOString(),
  36  |       },
  37  |     ],
  38  |     unpaidIds: new Set([100]),
  39  |     payments: [],
  40  |   };
  41  | 
  42  |   await page.addInitScript((value) => {
  43  |     localStorage.setItem("access_token", value);
  44  |   }, token);
  45  | 
  46  |   await page.route("**/certificate-types/", (route) =>
  47  |     route.fulfill({ json: [] })
  48  |   );
  49  | 
  50  |   await page.route("**/settings/wet-signature", (route) =>
  51  |     route.fulfill({ json: { use_wet_signature: true } })
  52  |   );
  53  | 
  54  |   await page.route("**/dashboard/summary*", (route) =>
  55  |     route.fulfill({
  56  |       json: {
  57  |         totals: {},
  58  |         changes: {},
  59  |         status_breakdown: {},
  60  |         requests_over_time: [],
  61  |         monthly_overview: [],
  62  |         recent_requests: [],
  63  |         certificate_history: [],
  64  |         alerts: { pending_over_5_days: 0 },
  65  |       },
  66  |     })
  67  |   );
  68  | 
  69  |   await page.route("**/requests/validate", (route) =>
  70  |     route.fulfill({ json: { results: [] } })
  71  |   );
  72  | 
  73  |   await page.route("**/requests/?*", async (route) => {
  74  |     const method = route.request().method();
  75  |     if (method === "GET") {
  76  |       await route.fulfill({ json: state.requests });
  77  |     } else {
  78  |       await route.fulfill({ status: 405 });
  79  |     }
  80  |   });
  81  | 
  82  |   await page.route(new RegExp(`${baseApi}/requests/\\d+/status`), async (route) => {
  83  |     const body = await route.request().postDataJSON();
  84  |     const id = Number(route.request().url().match(/requests\/(\d+)\/status/)?.[1]);
  85  |     state.requests = state.requests.map((r) =>
  86  |       r.id === id ? { ...r, status: body.new_status, updated_at: new Date().toISOString() } : r
  87  |     );
  88  |     const updated = state.requests.find((r) => r.id === id);
  89  |     await route.fulfill({ json: updated });
  90  |   });
  91  | 
  92  |   await page.route("**/payments/unpaid-requests*", async (route) => {
  93  |     const unpaid = state.requests.filter((r) => state.unpaidIds.has(r.id));
  94  |     await route.fulfill({ json: unpaid });
  95  |   });
  96  | 
  97  |   await page.route("**/payments/by-references", async (route) => {
  98  |     const body = await route.request().postDataJSON();
  99  |     const items = state.payments.filter((p) =>
  100 |       body.reference_numbers.includes(p.reference_number)
  101 |     );
  102 |     await route.fulfill({ json: { items } });
  103 |   });
  104 | 
  105 |   await page.route("**/payments/", async (route) => {
  106 |     const body = await route.request().postDataJSON();
  107 |     state.unpaidIds.delete(body.request_id);
  108 |     const reference = state.requests.find((r) => r.id === body.request_id)?.reference_number;
  109 |     state.payments.push({
  110 |       reference_number: reference,
  111 |       paid_at: new Date().toISOString(),
  112 |       or_number: body.or_number,
  113 |     });
  114 |     await route.fulfill({ json: { ok: true } });
  115 |   });
  116 | 
  117 |   await page.route(new RegExp(`${baseApi}/requests/\\d+/send-ready-email`), async (route) => {
  118 |     const id = Number(route.request().url().match(/requests\/(\d+)\/send-ready-email/)?.[1]);
  119 |     const now = new Date().toISOString();
  120 |     state.requests = state.requests.map((r) =>
  121 |       r.id === id
  122 |         ? { ...r, ready_email_sent_at: now, updated_at: now }
  123 |         : r
  124 |     );
  125 |     await route.fulfill({ json: { ok: true } });
  126 |   });
  127 | 
  128 |   await page.goto("/login");
  129 |   await page.evaluate((value) => {
  130 |     localStorage.setItem("access_token", value);
  131 |     sessionStorage.setItem("access_token", value);
  132 |   }, token);
> 133 |   await page.goto("/");
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/
  134 | 
  135 |   await page.getByText("Certify");
  136 |   await page.getByRole("button", { name: /Received Request/i }).click();
  137 |   await page.getByRole("button", { name: /Process All/i }).click();
  138 |   await expect.poll(() => state.requests[0].status).toBe("PROCESSING");
  139 | 
  140 |   await page.goto("/payment-tagging");
  141 |   await page.getByRole("button", { name: /record payment/i }).click();
  142 |   await page.getByPlaceholder(/or number/i).fill("OR-2026");
  143 |   const modal = page.getByRole("heading", { name: /enter or number/i }).locator("..");
  144 |   await modal.getByRole("button", { name: /^Record Payment$/i }).click();
  145 |   await expect.poll(() => state.unpaidIds.has(100)).toBeFalsy();
  146 | 
  147 |   await page.goto("/");
  148 |   await page.getByRole("button", { name: /Under Processing/i }).click();
  149 |   await page.getByTitle(/Mark as For Releasing/i).click();
  150 |   await expect.poll(() => state.requests[0].status).toBe("FOR_RELEASING");
  151 | 
  152 |   await page.getByRole("button", { name: /For Release/i }).click();
  153 |   await page.getByTitle(/Send Ready Email/i).click();
  154 |   await page.getByTitle(/Mark as Released/i).click();
  155 | 
  156 |   await expect.poll(() => state.requests[0].status).toBe("RELEASED");
  157 |   await expect(page.getByText(/No requests ready for releasing/i)).toBeVisible();
  158 | });
  159 | 
```