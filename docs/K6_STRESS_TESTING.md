# k6 Stress Testing

This project includes a reusable k6 script at [performance/k6/certify_stress.js](/c:/Users/Princess%20Janine/Desktop/THESIS/certify/performance/k6/certify_stress.js).

## What it can test

- Public read traffic against `/health`, `/api/v1/certificate-types/`, and `/api/v1/programs/by-campus/:campus`
- Authenticated read traffic against `/api/v1/users/me`, `/api/v1/dashboard/summary`, and `/api/v1/requests/`
- Write traffic that creates a certificate request and immediately tracks it
- Heavy workflow traffic that simulates real registrar processing:
  - create request
  - move request to `PROCESSING` to trigger PDF generation
  - optionally download the generated PDF
  - record payment
  - optionally re-download the certificate after payment regenerates the PDF
  - optionally send the ready email when wet signature mode is enabled

That last mode is the one to use when you want to answer: "How fast is the system when many requests are being processed at the same time?"

## Install k6 on Windows

If `k6 version` is not available yet, install it with either:

```powershell
winget install k6.k6
```

or

```powershell
choco install k6
```

## Start the backend

Run the API first. From the repo root:

```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

Default base URL expected by the script is `http://127.0.0.1:8000`.

## Required env vars

These are required for the default `daily_100` workflow scenario and other authenticated workflow scenarios:

```powershell
$env:K6_BASE_URL="http://127.0.0.1:8000"
$env:K6_USERNAME="admin"
$env:K6_PASSWORD="your-password"
```

Main switches:

```powershell
$env:K6_PROFILE="smoke"   # smoke | load | stress | burst
$env:K6_ENABLE_AUTH="true"
$env:K6_ENABLE_WRITES="false"
$env:K6_ENABLE_TEMPLATE_PREVIEW="false"
$env:K6_ENABLE_WORKFLOW="false"
```

Burst-mode tuning for hundreds or thousands of incoming read requests:

```powershell
$env:K6_REQUEST_RATE="300"
$env:K6_PREALLOCATED_VUS="100"
$env:K6_MAX_VUS="1000"
$env:K6_BURST_DURATION="2m"
```

Workflow tuning:

```powershell
$env:K6_WORKFLOW_DOWNLOAD_CERT="true"
$env:K6_WORKFLOW_FINAL_DOWNLOAD="true"
$env:K6_WORKFLOW_SEND_READY_EMAIL="true"
$env:K6_WORKFLOW_PAYMENT_METHOD="Cash"
$env:K6_WORKFLOW_USER_NAME="K6 Registrar"
```

Optional fixture overrides:

```powershell
$env:K6_CAMPUS="Alangilan"
$env:K6_GRADUATED_STUDENTS="21-00472"
$env:K6_STUDENTS="21-00472|Janine May Aguisanda,25-05148|Zyra Mae Garan"
$env:K6_CERTIFICATE_TYPES="Certificate of Enrollment,Certificate of Graduation,Certificate of ID Issuance,Certificate of NSTP Serial Number,Certificate of English Medium"
$env:K6_GRADUATE_ONLY_CERTIFICATE_TYPES="Certification of Completed Academic Requirements,Certificate of GWA,Certification of Honor Graduate,Certification of Earned Units"
```

## Run commands

Default daily-capacity simulation for `100` full request workflows:

```powershell
$env:K6_TEST_MODE="daily_100"
$env:K6_DAILY_REQUESTS="100"
$env:K6_DAILY_REQUESTS_PER_INTERVAL="2"
$env:K6_DAILY_REQUEST_INTERVAL_SECONDS="10"
$env:K6_DAILY_WORKFLOW_VUS="4"
$env:K6_DAILY_MAX_DURATION="30m"
$env:K6_SETUP_TIMEOUT="5m"
$env:K6_HTTP_TIMEOUT="30s"
$env:K6_DISABLE_THINK_TIME="true"
$env:K6_ENABLE_AUTH="true"
$env:K6_ENABLE_WRITES="true"
$env:K6_ENABLE_WORKFLOW="true"
$env:K6_USERNAME="admin"
$env:K6_PASSWORD="secret123"
k6 run .\performance\k6\certify_stress.js
```

This is the best mode to answer:

- Can the backend finish 100 requests in a day?
- What is the average and `p95` PDF generation time?
- What is the average and `p95` end-to-end processing time?

With `K6_DAILY_REQUESTS="100"`, `K6_DAILY_REQUESTS_PER_INTERVAL="2"`, and `K6_DAILY_REQUEST_INTERVAL_SECONDS="10"`, the script schedules `2` new requests every `10` seconds until it reaches `100` total requests. That is `50` intervals, or about `8m 20s` of scheduled arrivals.

The script prints a compact summary at the end with:

- completed workflows
- workflow failures
- configured arrival pattern
- average and `p95` workflow duration
- average and `p95` PDF generation duration
- projected hours needed to finish the configured daily request count at the observed average speed

If the run stops during `setup()`, raise `K6_SETUP_TIMEOUT` first. If setup reaches the backend but a single call hangs, lower or raise `K6_HTTP_TIMEOUT` depending on whether you want faster failure or more patience.

Public smoke test only:

```powershell
$env:K6_TEST_MODE="legacy"
$env:K6_PROFILE="smoke"
$env:K6_ENABLE_AUTH="false"
$env:K6_ENABLE_WRITES="false"
$env:K6_ENABLE_WORKFLOW="false"
k6 run .\performance\k6\certify_stress.js
```

Authenticated read-heavy load test:

```powershell
$env:K6_TEST_MODE="legacy"
$env:K6_PROFILE="load"
$env:K6_ENABLE_AUTH="true"
$env:K6_ENABLE_WRITES="false"
$env:K6_ENABLE_WORKFLOW="false"
$env:K6_USERNAME="admin"
$env:K6_PASSWORD="your-password"
k6 run .\performance\k6\certify_stress.js
```

Write load test for request submissions:

```powershell
$env:K6_TEST_MODE="legacy"
$env:K6_PROFILE="stress"
$env:K6_ENABLE_AUTH="true"
$env:K6_ENABLE_WRITES="true"
$env:K6_ENABLE_WORKFLOW="false"
$env:K6_USERNAME="admin"
$env:K6_PASSWORD="your-password"
k6 run .\performance\k6\certify_stress.js
```

Heavy workflow smoke test for PDF generation, payment recording, and ready email flow:

```powershell
$env:K6_TEST_MODE="legacy"
$env:K6_PROFILE="smoke"
$env:K6_ENABLE_AUTH="true"
$env:K6_ENABLE_WRITES="true"
$env:K6_ENABLE_WORKFLOW="true"
$env:K6_USERNAME="admin"
$env:K6_PASSWORD="your-password"
k6 run .\performance\k6\certify_stress.js
```

Heavy workflow load test with simultaneous processing:

```powershell
$env:K6_TEST_MODE="legacy"
$env:K6_PROFILE="load"
$env:K6_ENABLE_AUTH="true"
$env:K6_ENABLE_WRITES="true"
$env:K6_ENABLE_WORKFLOW="true"
$env:K6_WORKFLOW_DOWNLOAD_CERT="true"
$env:K6_WORKFLOW_FINAL_DOWNLOAD="true"
$env:K6_WORKFLOW_SEND_READY_EMAIL="true"
$env:K6_USERNAME="admin"
$env:K6_PASSWORD="your-password"
k6 run .\performance\k6\certify_stress.js
```

Heavy workflow stress test:

```powershell
$env:K6_TEST_MODE="legacy"
$env:K6_PROFILE="stress"
$env:K6_ENABLE_AUTH="true"
$env:K6_ENABLE_WRITES="true"
$env:K6_ENABLE_WORKFLOW="true"
$env:K6_WORKFLOW_DOWNLOAD_CERT="true"
$env:K6_WORKFLOW_FINAL_DOWNLOAD="true"
$env:K6_WORKFLOW_SEND_READY_EMAIL="true"
$env:K6_USERNAME="admin"
$env:K6_PASSWORD="your-password"
k6 run .\performance\k6\certify_stress.js
```

Controlled concurrency capacity test for registrar-side processing from the Checking queue:

```powershell
$env:K6_TEST_MODE="capacity_threshold"
$env:K6_ENABLE_AUTH="true"
$env:K6_ENABLE_WRITES="true"
$env:K6_ENABLE_WORKFLOW="true"
$env:K6_USERNAME="admin"
$env:K6_PASSWORD="your-password"
$env:K6_GRADUATED_STUDENTS="21-00472"
$env:K6_STUDENTS="22-07058|Jim Mariel Castillo,21-00472|Janine May Aguisanda,25-05148|Zyra Mae Garan"
$env:K6_CERTIFICATE_TYPES="Certificate of Enrollment,Certificate of Graduation,Certificate of ID Issuance,Certificate of NSTP Serial Number,Certificate of English Medium"
$env:K6_GRADUATE_ONLY_CERTIFICATE_TYPES="Certification of Completed Academic Requirements,Certificate of GWA,Certification of Honor Graduate,Certification of Earned Units"
$env:K6_CAPACITY_STAGE_1_TARGET="2"
$env:K6_CAPACITY_STAGE_2_TARGET="4"
$env:K6_CAPACITY_STAGE_3_TARGET="6"
$env:K6_CAPACITY_STAGE_4_TARGET="8"
$env:K6_CAPACITY_BACKLOG="200"
$env:K6_CAPACITY_REQUESTS_PER_VU="50"
k6 run .\performance\k6\certify_stress.js
```

This mode pre-creates an approved request backlog during `setup()` and then ramps registrar workers who move those requests from `APPROVED` to `PROCESSING`. It is intended to answer: “Up to what level can the system handle concurrent processing before performance degrades?”

Read-only burst test for hundreds of incoming requests:

```powershell
$env:K6_TEST_MODE="legacy"
$env:K6_PROFILE="burst"
$env:K6_ENABLE_WRITES="false"
$env:K6_ENABLE_AUTH="true"
$env:K6_ENABLE_WORKFLOW="false"
$env:K6_USERNAME="admin"
$env:K6_PASSWORD="your-password"
$env:K6_REQUEST_RATE="500"
$env:K6_PREALLOCATED_VUS="150"
$env:K6_MAX_VUS="1200"
$env:K6_BURST_DURATION="3m"
k6 run .\performance\k6\certify_stress.js
```

Export a machine-readable result:

```powershell
k6 run --summary-export .\docs\k6-summary.json .\performance\k6\certify_stress.js
```

## Metrics to watch

The workflow mode adds these custom timings:

- `workflow_duration`: full end-to-end request lifecycle per iteration
- `workflow_pdf_generation_duration`: time spent moving a request into `PROCESSING`, which triggers PDF generation
- `workflow_payment_duration`: time to record payment
- `workflow_download_duration`: time to download the generated or regenerated certificate
- `workflow_ready_email_duration`: time to trigger ready email sending
- `workflow_success_rate`: percent of full workflow iterations that completed successfully

The script also tags HTTP endpoints so you can see which API call slows down first.

For the `daily_100` mode, the most important numbers are:

- `workflow_pdf_generation_duration`: how long PDF generation takes
- `workflow_duration`: total time from request creation through processing, payment, and optional download/email steps
- `workflow_success_rate`: whether the full 100-request batch completes cleanly
- `http_req_duration{endpoint:requests_update_status_processing}`: the API call that most directly reflects the processing step that triggers PDF creation

## Notes

- Auth scenarios are enabled automatically when both `K6_USERNAME` and `K6_PASSWORD` are set, unless you explicitly set `K6_ENABLE_AUTH="false"`.
- The workflow scenario creates real request rows and payment rows. Use a dedicated test database if you want clean repeatable runs.
- `daily_100` is the default test mode. Set `K6_TEST_MODE="legacy"` if you want the older mixed scenarios back.
- Moving a request to `PROCESSING` triggers PDF generation inside the backend.
- Recording a payment clears the saved PDF path, so the final certificate download forces regeneration with payment details.
- Ready email sending in workflow mode is attempted only when wet signature mode is enabled and signing is available.
- If your chosen account lacks permissions like `requests.update_status`, `payments.create`, `certificates.generate`, or `signatures.manage`, parts of the workflow test will fail with `403`.
- In `burst` mode, `K6_REQUEST_RATE` is iterations per second. Each iteration sends 3 read requests in public mode, or 6 read requests when auth is enabled, so `K6_REQUEST_RATE=500` with auth enabled is about `3000` HTTP requests per second.
