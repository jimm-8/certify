import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer(
  http.get("http://localhost:8000/api/v1/certificate-types/", () =>
    HttpResponse.json([])
  ),
  http.get("http://localhost:8000/api/v1/settings/wet-signature", () =>
    HttpResponse.json({ use_wet_signature: true })
  ),
  http.post("http://localhost:8000/api/v1/requests/validate", () =>
    HttpResponse.json({ results: [] })
  )
);

export { http, HttpResponse };
