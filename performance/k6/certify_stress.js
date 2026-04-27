import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.K6_BASE_URL || "http://127.0.0.1:8000").replace(
  /\/+$/,
  "",
);
const TEST_MODE = (__ENV.K6_TEST_MODE || "daily_100").toLowerCase();
const PROFILE = (__ENV.K6_PROFILE || "load").toLowerCase();
const CAMPUS = __ENV.K6_CAMPUS || "Alangilan";
const ENABLE_WRITES = toBool(__ENV.K6_ENABLE_WRITES, TEST_MODE === "daily_100");
const ENABLE_AUTH = toBool(
  __ENV.K6_ENABLE_AUTH,
  TEST_MODE === "daily_100" || Boolean(__ENV.K6_USERNAME && __ENV.K6_PASSWORD),
);
const ENABLE_TEMPLATE_PREVIEW = toBool(__ENV.K6_ENABLE_TEMPLATE_PREVIEW, false);
const ENABLE_WORKFLOW = toBool(
  __ENV.K6_ENABLE_WORKFLOW,
  TEST_MODE === "daily_100",
);
const WORKFLOW_DOWNLOAD_CERT = toBool(__ENV.K6_WORKFLOW_DOWNLOAD_CERT, true);
const WORKFLOW_SEND_READY_EMAIL = toBool(
  __ENV.K6_WORKFLOW_SEND_READY_EMAIL,
  true,
);
const WORKFLOW_FINAL_DOWNLOAD = toBool(__ENV.K6_WORKFLOW_FINAL_DOWNLOAD, true);
const REQUEST_RATE = toInt(__ENV.K6_REQUEST_RATE, 300);
const PREALLOCATED_VUS = toInt(__ENV.K6_PREALLOCATED_VUS, 100);
const MAX_VUS = toInt(__ENV.K6_MAX_VUS, 1000);
const BURST_DURATION = __ENV.K6_BURST_DURATION || "2m";
const WORKFLOW_PAYMENT_METHOD = __ENV.K6_WORKFLOW_PAYMENT_METHOD || "Cash";
const WORKFLOW_USER_NAME = __ENV.K6_WORKFLOW_USER_NAME || "K6 Registrar";
const DAILY_REQUESTS = toInt(__ENV.K6_DAILY_REQUESTS, 100);
const DAILY_REQUESTS_PER_INTERVAL = toInt(
  __ENV.K6_DAILY_REQUESTS_PER_INTERVAL,
  2,
);
const DAILY_WORKFLOW_VUS = toInt(__ENV.K6_DAILY_WORKFLOW_VUS, 4);
const DAILY_MAX_DURATION = __ENV.K6_DAILY_MAX_DURATION || "30m";
const DAILY_REQUEST_INTERVAL_SECONDS = toInt(
  __ENV.K6_DAILY_REQUEST_INTERVAL_SECONDS,
  10,
);
const SETUP_TIMEOUT = __ENV.K6_SETUP_TIMEOUT || "5m";
const HTTP_TIMEOUT = __ENV.K6_HTTP_TIMEOUT || "30s";
const CAPACITY_STAGE_1_TARGET = toInt(__ENV.K6_CAPACITY_STAGE_1_TARGET, 2);
const CAPACITY_STAGE_2_TARGET = toInt(__ENV.K6_CAPACITY_STAGE_2_TARGET, 4);
const CAPACITY_STAGE_3_TARGET = toInt(__ENV.K6_CAPACITY_STAGE_3_TARGET, 6);
const CAPACITY_STAGE_4_TARGET = toInt(__ENV.K6_CAPACITY_STAGE_4_TARGET, 8);
const CAPACITY_BACKLOG = toInt(__ENV.K6_CAPACITY_BACKLOG, 200);
const CAPACITY_REQUESTS_PER_VU = toInt(__ENV.K6_CAPACITY_REQUESTS_PER_VU, 50);
const CERTIFICATE_TYPE_NAMES = parseCertificateTypeNames(
  __ENV.K6_CERTIFICATE_TYPES,
);
const GRADUATE_ONLY_CERTIFICATE_TYPE_NAMES =
  parseGraduateOnlyCertificateTypeNames(
    __ENV.K6_GRADUATE_ONLY_CERTIFICATE_TYPES,
  );
const SEEDED_STUDENTS = parseSeededStudents(__ENV.K6_STUDENTS);
const GRADUATED_STUDENT_CODES = parseGraduatedStudentCodes(
  __ENV.K6_GRADUATED_STUDENTS,
);
const DISABLE_THINK_TIME = toBool(
  __ENV.K6_DISABLE_THINK_TIME,
  TEST_MODE === "daily_100",
);

const DEFAULT_HEADERS = {
  Accept: "application/json",
};

const workflowDuration = new Trend("workflow_duration", true);
const workflowPdfGenerationDuration = new Trend(
  "workflow_pdf_generation_duration",
  true,
);
const workflowPaymentDuration = new Trend("workflow_payment_duration", true);
const workflowDownloadDuration = new Trend("workflow_download_duration", true);
const workflowReadyEmailDuration = new Trend(
  "workflow_ready_email_duration",
  true,
);
const workflowSuccessRate = new Rate("workflow_success_rate");
const workflowFailures = new Counter("workflow_failures");
const workflowCompleted = new Counter("workflow_completed");
const capacityProcessingDuration = new Trend(
  "capacity_processing_duration",
  true,
);
const capacityProcessed = new Counter("capacity_processed");
const capacityFailures = new Counter("capacity_failures");
const capacitySuccessRate = new Rate("capacity_success_rate");

export const options = buildOptions();

export function setup() {
  const healthRes = http.get(`${BASE_URL}/health`, {
    timeout: HTTP_TIMEOUT,
    tags: { endpoint: "health" },
  });
  check(healthRes, {
    "health check ok": (res) => res.status === 200,
  });
  ensureHttpOk(healthRes, "health check");

  const certTypesRes = http.get(`${BASE_URL}/api/v1/certificate-types/`, {
    headers: DEFAULT_HEADERS,
    timeout: HTTP_TIMEOUT,
    tags: { endpoint: "certificate_types" },
  });
  check(certTypesRes, {
    "certificate types ok": (res) => res.status === 200,
    "certificate types returned data": (res) =>
      Array.isArray(res.json()) && res.json().length > 0,
  });
  ensureHttpOk(certTypesRes, "certificate types lookup");

  const programsRes = http.get(
    `${BASE_URL}/api/v1/programs/by-campus/${encodeURIComponent(CAMPUS)}`,
    {
      headers: DEFAULT_HEADERS,
      timeout: HTTP_TIMEOUT,
      tags: { endpoint: "programs_by_campus" },
    },
  );
  check(programsRes, {
    "programs by campus ok": (res) => res.status === 200,
  });
  ensureHttpOk(programsRes, `program lookup for campus '${CAMPUS}'`);

  const certificateTypes = safeJsonArray(certTypesRes);
  const programs = safeJsonArray(programsRes);
  const selectedCertificateTypes = selectCertificateTypes(
    certificateTypes,
    CERTIFICATE_TYPE_NAMES,
  );
  const selectedGraduateOnlyCertificateTypes = selectCertificateTypes(
    certificateTypes,
    GRADUATE_ONLY_CERTIFICATE_TYPE_NAMES,
  );
  const selectedProgram = selectProgram(programs);

  if (!selectedCertificateTypes.length) {
    throw new Error(
      `None of the requested certificate types were returned by /api/v1/certificate-types/: ${CERTIFICATE_TYPE_NAMES.join(", ")}`,
    );
  }

  if (!selectedProgram) {
    throw new Error(`No programs were returned for campus '${CAMPUS}'.`);
  }

  const setupData = {
    certificateTypes: selectedCertificateTypes,
    certificateTypeNames: selectedCertificateTypes.map((item) => item.name),
    graduateOnlyCertificateTypes: selectedGraduateOnlyCertificateTypes,
    graduateOnlyCertificateTypeNames:
      selectedGraduateOnlyCertificateTypes.map((item) => item.name),
    program: selectedProgram,
    auth: {
      enabled: ENABLE_AUTH,
      token: null,
      username: __ENV.K6_USERNAME || null,
    },
    settings: {
      useWetSignature: false,
      signingAvailable: true,
    },
  };

  if (ENABLE_AUTH) {
    const loginRes = http.post(
      `${BASE_URL}/api/v1/auth/token`,
      {
        username: __ENV.K6_USERNAME,
        password: __ENV.K6_PASSWORD,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        timeout: HTTP_TIMEOUT,
        tags: { endpoint: "auth_token" },
      },
    );

    check(loginRes, {
      "login ok": (res) => res.status === 200,
      "login returned access token": (res) => Boolean(res.json("access_token")),
    });

    if (loginRes.status !== 200) {
      throw new Error(
        `Login failed with status ${loginRes.status}: ${loginRes.body}`,
      );
    }

    setupData.auth.token = loginRes.json("access_token");

    const settingsHeaders = authHeaders(setupData.auth.token);
    const wetSignatureRes = http.get(
      `${BASE_URL}/api/v1/settings/wet-signature`,
      {
        headers: settingsHeaders,
        timeout: HTTP_TIMEOUT,
        tags: { endpoint: "settings_wet_signature" },
      },
    );
    if (wetSignatureRes.status === 200) {
      setupData.settings.useWetSignature = Boolean(
        wetSignatureRes.json("use_wet_signature"),
      );
    }

    const signingAvailabilityRes = http.get(
      `${BASE_URL}/api/v1/settings/signing-availability`,
      {
        headers: settingsHeaders,
        timeout: HTTP_TIMEOUT,
        tags: { endpoint: "settings_signing_availability" },
      },
    );
    if (signingAvailabilityRes.status === 200) {
      setupData.settings.signingAvailable = Boolean(
        signingAvailabilityRes.json("signing_available"),
      );
    }
  }

  if (TEST_MODE === "capacity_threshold") {
    setupData.capacity = createCapacityBacklog(setupData);
  }

  return setupData;
}

export function public_browse(data) {
  group("public browse", () => {
    const responses = http.batch([
      [
        "GET",
        `${BASE_URL}/health`,
        null,
        { headers: DEFAULT_HEADERS, tags: { endpoint: "health" } },
      ],
      [
        "GET",
        `${BASE_URL}/api/v1/certificate-types/`,
        null,
        { headers: DEFAULT_HEADERS, tags: { endpoint: "certificate_types" } },
      ],
      [
        "GET",
        `${BASE_URL}/api/v1/programs/by-campus/${encodeURIComponent(CAMPUS)}`,
        null,
        { headers: DEFAULT_HEADERS, tags: { endpoint: "programs_by_campus" } },
      ],
    ]);

    check(responses[0], { "public health 200": (res) => res.status === 200 });
    check(responses[1], {
      "public certificate types 200": (res) => res.status === 200,
    });
    check(responses[2], { "public programs 200": (res) => res.status === 200 });

    if (ENABLE_TEMPLATE_PREVIEW && data?.certificateTypes?.length) {
      const previewCertificateType = pickCertificateType(data.certificateTypes);
      const previewRes = http.get(
        `${BASE_URL}/api/v1/certificate-types/preview/${encodeURIComponent(previewCertificateType.name)}`,
        {
          headers: { Accept: "text/html" },
          tags: { endpoint: "certificate_preview" },
        },
      );
      check(previewRes, {
        "template preview ok": (res) => res.status === 200,
      });
    }
  });

  sleepIfEnabled(0.5, 1.5);
}

export function auth_read(data) {
  if (!data?.auth?.token) {
    sleep(1);
    return;
  }

  const headers = authHeaders(data.auth.token);

  group("authenticated reads", () => {
    const responses = http.batch([
      [
        "GET",
        `${BASE_URL}/api/v1/users/me`,
        null,
        { headers, tags: { endpoint: "users_me" } },
      ],
      [
        "GET",
        `${BASE_URL}/api/v1/dashboard/summary?period=last_30_days`,
        null,
        { headers, tags: { endpoint: "dashboard_summary" } },
      ],
      [
        "GET",
        `${BASE_URL}/api/v1/requests/?skip=0&limit=10`,
        null,
        { headers, tags: { endpoint: "requests_list" } },
      ],
    ]);

    check(responses[0], { "users/me 200": (res) => res.status === 200 });
    check(responses[1], {
      "dashboard summary readable": (res) =>
        res.status === 200 || res.status === 403,
    });
    check(responses[2], {
      "requests list readable": (res) =>
        res.status === 200 || res.status === 403,
    });
  });

  sleepIfEnabled(0.25, 1);
}

export function public_submit_track(data) {
  if (!ENABLE_WRITES) {
    sleep(1);
    return;
  }

  const payload = buildRequestPayload(data);

  group("public submit and track", () => {
    const createRes = http.post(
      `${BASE_URL}/api/v1/requests/`,
      JSON.stringify(payload),
      {
        headers: jsonHeaders(),
        tags: { endpoint: "requests_create" },
      },
    );

    check(createRes, {
      "request creation 201": (res) => res.status === 201,
      "request creation returned tracking": (res) =>
        Boolean(res.json("reference_number")) && Boolean(res.json("pin")),
    });

    if (createRes.status !== 201) {
      return;
    }

    const createdReference = createRes.json("reference_number");
    const createdPin = createRes.json("pin");

    const trackRes = http.get(
      `${BASE_URL}/api/v1/requests/track?reference_number=${encodeURIComponent(createdReference)}&pin=${encodeURIComponent(createdPin)}`,
      {
        headers: DEFAULT_HEADERS,
        tags: { endpoint: "requests_track" },
      },
    );

    check(trackRes, {
      "tracking lookup 200": (res) => res.status === 200,
      "tracking returned same reference": (res) =>
        res.json("reference_number") === createdReference,
    });
  });

  sleepIfEnabled(1, 2);
}

export function auth_workflow_heavy(data) {
  if (!data?.auth?.token || !ENABLE_WRITES || !ENABLE_WORKFLOW) {
    sleep(1);
    return;
  }

  const authJsonHeaders = authHeaders(data.auth.token, {
    "Content-Type": "application/json",
  });
  const startedAt = Date.now();
  let workflowPassed = false;

  group("authenticated heavy workflow", () => {
    const payload = buildRequestPayload(data);
    const createRes = http.post(
      `${BASE_URL}/api/v1/requests/`,
      JSON.stringify(payload),
      {
        headers: jsonHeaders(),
        tags: { endpoint: "requests_create" },
      },
    );

    const createOk = check(createRes, {
      "workflow request creation 201": (res) => res.status === 201,
      "workflow request has reference": (res) =>
        Boolean(res.json("reference_number")),
      "workflow request has pin": (res) => Boolean(res.json("pin")),
    });

    if (!createOk || createRes.status !== 201) {
      workflowFailures.add(1);
      workflowSuccessRate.add(false);
      return;
    }

    const referenceNumber = createRes.json("reference_number");
    const pin = createRes.json("pin");

    const trackRes = http.get(
      `${BASE_URL}/api/v1/requests/track?reference_number=${encodeURIComponent(referenceNumber)}&pin=${encodeURIComponent(pin)}`,
      {
        headers: DEFAULT_HEADERS,
        tags: { endpoint: "requests_track" },
      },
    );

    const trackOk = check(trackRes, {
      "workflow tracking 200": (res) => res.status === 200,
      "workflow tracking matches reference": (res) =>
        res.json("reference_number") === referenceNumber,
    });
    if (!trackOk) {
      workflowFailures.add(1);
      workflowSuccessRate.add(false);
      return;
    }

    const lookupRes = http.get(
      `${BASE_URL}/api/v1/payments/lookup?reference_number=${encodeURIComponent(referenceNumber)}`,
      {
        headers: DEFAULT_HEADERS,
        tags: { endpoint: "payments_lookup" },
      },
    );

    const lookupOk = check(lookupRes, {
      "workflow lookup 200": (res) => res.status === 200,
      "workflow lookup has request id": (res) =>
        Number.isInteger(res.json("id")),
    });
    if (!lookupOk) {
      workflowFailures.add(1);
      workflowSuccessRate.add(false);
      return;
    }

    const requestId = lookupRes.json("id");

    const processingStartedAt = Date.now();
    const processingRes = http.patch(
      `${BASE_URL}/api/v1/requests/${requestId}/status`,
      JSON.stringify({
        new_status: "PROCESSING",
        user_name: WORKFLOW_USER_NAME,
        notes: "k6 workflow load test to trigger PDF generation",
      }),
      {
        headers: authJsonHeaders,
        tags: { endpoint: "requests_update_status_processing" },
      },
    );
    workflowPdfGenerationDuration.add(Date.now() - processingStartedAt);

    const processingOk = check(processingRes, {
      "workflow processing status ok": (res) => res.status === 200,
      "workflow moved to processing": (res) =>
        res.json("status") === "PROCESSING",
    });
    if (!processingOk) {
      workflowFailures.add(1);
      workflowSuccessRate.add(false);
      return;
    }

    if (WORKFLOW_DOWNLOAD_CERT) {
      const initialDownloadStartedAt = Date.now();
      const initialDownloadRes = http.get(
        `${BASE_URL}/api/v1/requests/${requestId}/download-certificate`,
        {
          headers: authHeaders(data.auth.token, {
            Accept: "application/pdf",
          }),
          responseType: "binary",
          tags: { endpoint: "requests_download_certificate" },
        },
      );
      workflowDownloadDuration.add(Date.now() - initialDownloadStartedAt);

      const initialDownloadOk = check(initialDownloadRes, {
        "workflow initial download ok": (res) => res.status === 200,
        "workflow initial download is pdf": (res) =>
          String(res.headers["Content-Type"] || "").includes("application/pdf"),
      });
      if (!initialDownloadOk) {
        workflowFailures.add(1);
        workflowSuccessRate.add(false);
        return;
      }
    }

    const paymentStartedAt = Date.now();
    // Use /by-reference endpoint which doesn't require payments.create permission
    const paymentRes = http.post(
      `${BASE_URL}/api/v1/payments/by-reference`,
      JSON.stringify({
        reference_number: referenceNumber,
        amount: 50.0, // Explicit amount to avoid 400 error
        payment_method: WORKFLOW_PAYMENT_METHOD,
        payment_status: "PAID",
        or_number: buildOrNumber(),
      }),
      {
        headers: jsonHeaders(),
        tags: { endpoint: "payments_create" },
      },
    );
    workflowPaymentDuration.add(Date.now() - paymentStartedAt);

    // Debug: Log payment response for troubleshooting
    if (paymentRes.status !== 201 && paymentRes.status !== 200) {
      console.log(
        `Payment creation failed: status=${paymentRes.status}, body=${paymentRes.body}`,
      );
    } else {
      console.log(
        `Payment created successfully: id=${paymentRes.json("id")}, status=${paymentRes.json("payment_status")}`,
      );
    }

    const paymentOk = check(paymentRes, {
      "workflow payment created": (res) =>
        res.status === 201 || res.status === 200,
      "workflow payment has id": (res) => Number.isInteger(res.json("id")),
    });
    if (!paymentOk) {
      workflowFailures.add(1);
      workflowSuccessRate.add(false);
      return;
    }

    const paymentInfoRes = http.post(
      `${BASE_URL}/api/v1/payments/by-references`,
      JSON.stringify({ reference_numbers: [referenceNumber] }),
      {
        headers: authJsonHeaders,
        tags: { endpoint: "payments_by_references" },
      },
    );
    check(paymentInfoRes, {
      "workflow payment info readable": (res) => res.status === 200,
    });

    const requestAfterPaymentRes = http.get(
      `${BASE_URL}/api/v1/requests/${requestId}`,
      {
        headers: authHeaders(data.auth.token),
        tags: { endpoint: "requests_detail" },
      },
    );

    const requestAfterPaymentOk = check(requestAfterPaymentRes, {
      "workflow request detail after payment ok": (res) => res.status === 200,
      "workflow auto advanced for releasing": (res) =>
        ["FOR_RELEASING", "RELEASED"].includes(res.json("status")),
    });
    if (!requestAfterPaymentOk) {
      workflowFailures.add(1);
      workflowSuccessRate.add(false);
      return;
    }

    const shouldSendReadyEmail =
      WORKFLOW_SEND_READY_EMAIL &&
      data?.settings?.signingAvailable !== false &&
      data?.settings?.useWetSignature === true;

    if (shouldSendReadyEmail) {
      const emailStartedAt = Date.now();
      const readyEmailRes = http.post(
        `${BASE_URL}/api/v1/requests/${requestId}/send-ready-email`,
        null,
        {
          headers: authHeaders(data.auth.token),
          tags: { endpoint: "requests_send_ready_email" },
        },
      );
      workflowReadyEmailDuration.add(Date.now() - emailStartedAt);

      const readyEmailOk = check(readyEmailRes, {
        "workflow ready email sent": (res) => res.status === 200,
      });
      if (!readyEmailOk) {
        workflowFailures.add(1);
        workflowSuccessRate.add(false);
        return;
      }
    }

    if (WORKFLOW_FINAL_DOWNLOAD) {
      const finalDownloadStartedAt = Date.now();
      const finalDownloadRes = http.get(
        `${BASE_URL}/api/v1/requests/${requestId}/download-certificate`,
        {
          headers: authHeaders(data.auth.token, {
            Accept: "application/pdf",
          }),
          responseType: "binary",
          tags: { endpoint: "requests_download_certificate" },
        },
      );
      workflowDownloadDuration.add(Date.now() - finalDownloadStartedAt);

      const finalDownloadOk = check(finalDownloadRes, {
        "workflow final download ok": (res) => res.status === 200,
        "workflow final download is pdf": (res) =>
          String(res.headers["Content-Type"] || "").includes("application/pdf"),
      });
      if (!finalDownloadOk) {
        workflowFailures.add(1);
        workflowSuccessRate.add(false);
        return;
      }
    }

    workflowPassed = true;
    workflowCompleted.add(1);
  });

  workflowDuration.add(Date.now() - startedAt);
  workflowSuccessRate.add(workflowPassed);

  sleepIfEnabled(0.25, 1);
}

export function auth_process_existing(data) {
  if (!data?.auth?.token || !ENABLE_AUTH) {
    sleep(1);
    return;
  }

  const requestId = pickCapacityRequestId(data?.capacity?.requestIds || []);
  if (!requestId) {
    sleepIfEnabled(0.25, 0.5);
    return;
  }

  const startedAt = Date.now();
  const processingRes = http.patch(
    `${BASE_URL}/api/v1/requests/${requestId}/status`,
    JSON.stringify({
      new_status: "PROCESSING",
      user_name: WORKFLOW_USER_NAME,
      notes: "k6 capacity threshold test from checking queue",
    }),
    {
      headers: authHeaders(data.auth.token, {
        "Content-Type": "application/json",
      }),
      timeout: HTTP_TIMEOUT,
      tags: { endpoint: "requests_update_status_processing" },
    },
  );
  const duration = Date.now() - startedAt;

  capacityProcessingDuration.add(duration);
  workflowPdfGenerationDuration.add(duration);

  const ok = check(processingRes, {
    "capacity processing status ok": (res) => res.status === 200,
    "capacity moved to processing": (res) => res.json("status") === "PROCESSING",
  });

  if (!ok) {
    capacityFailures.add(1);
    capacitySuccessRate.add(false);
    return;
  }

  capacityProcessed.add(1);
  capacitySuccessRate.add(true);
  sleepIfEnabled(0.1, 0.5);
}

export function read_only_burst(data) {
  group("read only burst", () => {
    const requests = [
      [
        "GET",
        `${BASE_URL}/health`,
        null,
        { headers: DEFAULT_HEADERS, tags: { endpoint: "health" } },
      ],
      [
        "GET",
        `${BASE_URL}/api/v1/certificate-types/`,
        null,
        { headers: DEFAULT_HEADERS, tags: { endpoint: "certificate_types" } },
      ],
      [
        "GET",
        `${BASE_URL}/api/v1/programs/by-campus/${encodeURIComponent(CAMPUS)}`,
        null,
        { headers: DEFAULT_HEADERS, tags: { endpoint: "programs_by_campus" } },
      ],
    ];

    if (data?.auth?.token) {
      const headers = authHeaders(data.auth.token);
      requests.push(
        [
          "GET",
          `${BASE_URL}/api/v1/users/me`,
          null,
          { headers, tags: { endpoint: "users_me" } },
        ],
        [
          "GET",
          `${BASE_URL}/api/v1/dashboard/summary?period=last_30_days`,
          null,
          { headers, tags: { endpoint: "dashboard_summary" } },
        ],
        [
          "GET",
          `${BASE_URL}/api/v1/requests/?skip=0&limit=10`,
          null,
          { headers, tags: { endpoint: "requests_list" } },
        ],
      );
    }

    const responses = http.batch(requests);

    check(responses[0], { "burst health 200": (res) => res.status === 200 });
    check(responses[1], {
      "burst certificate types 200": (res) => res.status === 200,
    });
    check(responses[2], { "burst programs 200": (res) => res.status === 200 });

    if (data?.auth?.token) {
      check(responses[3], {
        "burst users/me 200": (res) => res.status === 200,
      });
      check(responses[4], {
        "burst dashboard readable": (res) =>
          res.status === 200 || res.status === 403,
      });
      check(responses[5], {
        "burst requests readable": (res) =>
          res.status === 200 || res.status === 403,
      });
    }
  });
}

function buildOptions() {
  if (TEST_MODE === "capacity_threshold") {
    const stage1 = Math.max(1, CAPACITY_STAGE_1_TARGET);
    const stage2 = Math.max(stage1, CAPACITY_STAGE_2_TARGET);
    const stage3 = Math.max(stage2, CAPACITY_STAGE_3_TARGET);
    const stage4 = Math.max(stage3, CAPACITY_STAGE_4_TARGET);

    return {
      scenarios: {
        capacity_test: {
          executor: "ramping-vus",
          exec: "auth_process_existing",
          stages: [
            { duration: "2m", target: stage1 },
            { duration: "2m", target: stage2 },
            { duration: "2m", target: stage3 },
            { duration: "2m", target: stage4 },
          ],
          gracefulStop: "30s",
        },
      },

      setupTimeout: SETUP_TIMEOUT,
      thresholds: buildThresholds(),

      summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "max"],
    };
  }

  if (TEST_MODE === "daily_100") {
    const requestsPerInterval = Math.max(1, DAILY_REQUESTS_PER_INTERVAL);
    const requestIntervalSeconds = Math.max(1, DAILY_REQUEST_INTERVAL_SECONDS);
    const intervalCount = Math.max(
      1,
      Math.ceil(DAILY_REQUESTS / requestsPerInterval),
    );
    const scheduledDurationSeconds = intervalCount * requestIntervalSeconds;

    return {
      scenarios: {
        daily_100_requests_end_to_end: {
          executor: "constant-arrival-rate",
          exec: "auth_workflow_heavy",
          rate: requestsPerInterval,
          timeUnit: `${requestIntervalSeconds}s`,
          duration: `${scheduledDurationSeconds}s`,
          preAllocatedVUs: DAILY_WORKFLOW_VUS,
          maxVUs: DAILY_WORKFLOW_VUS,
        },
      },

      setupTimeout: SETUP_TIMEOUT,
      thresholds: buildThresholds(),

      summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "max"],
    };
  }

  return {
    scenarios: {
      realistic_daily_load: {
        executor: "constant-arrival-rate",

        rate: toInt(__ENV.K6_REQUEST_RATE, 10), // default 10 req/sec

        timeUnit: "1s",
        duration: __ENV.K6_DURATION || "2m",

        preAllocatedVUs: 50,
        maxVUs: 200,

        exec: "public_submit_track", // focus on request submission
      },

      workflow_processing: {
        executor: "constant-arrival-rate",

        // lower rate because this is heavy (PDF + DB)
        rate: toInt(__ENV.K6_WORKFLOW_RATE, 3),

        timeUnit: "1s",
        duration: __ENV.K6_DURATION || "2m",

        preAllocatedVUs: 20,
        maxVUs: 100,

        exec: "auth_workflow_heavy",
      },
    },

    setupTimeout: SETUP_TIMEOUT,
    thresholds: buildThresholds(),

    summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "max"],
  };
}

function buildThresholds() {
  if (TEST_MODE === "capacity_threshold") {
    return {
      http_req_failed: ["rate<0.05"],
      checks: ["rate>0.95"],
      capacity_success_rate: ["rate>0.90"],
      "http_req_duration{endpoint:requests_update_status_processing}": [
        "p(95)<15000",
      ],
      capacity_processing_duration: ["p(95)<15000"],
      workflow_pdf_generation_duration: ["p(95)<15000"],
    };
  }

  return {
    http_req_failed: ["rate<0.05"],
    checks: ["rate>0.95"],
    workflow_success_rate: ["rate>0.90"],
    "http_req_duration{endpoint:health}": ["p(95)<500"],
    "http_req_duration{endpoint:certificate_types}": ["p(95)<1500"],
    "http_req_duration{endpoint:programs_by_campus}": ["p(95)<1500"],
    "http_req_duration{endpoint:auth_token}": ["p(95)<1500"],
    "http_req_duration{endpoint:users_me}": ["p(95)<1500"],
    "http_req_duration{endpoint:dashboard_summary}": ["p(95)<2500"],
    "http_req_duration{endpoint:requests_list}": ["p(95)<2500"],
    "http_req_duration{endpoint:requests_create}": ["p(95)<2500"],
    "http_req_duration{endpoint:requests_track}": ["p(95)<1500"],
    "http_req_duration{endpoint:payments_lookup}": ["p(95)<1500"],
    "http_req_duration{endpoint:requests_update_status_processing}": [
      "p(95)<15000",
    ],
    "http_req_duration{endpoint:payments_create}": ["p(95)<4000"],
    "http_req_duration{endpoint:payments_by_references}": ["p(95)<2000"],
    "http_req_duration{endpoint:requests_detail}": ["p(95)<2000"],
    "http_req_duration{endpoint:requests_send_ready_email}": ["p(95)<5000"],
    "http_req_duration{endpoint:requests_download_certificate}": [
      "p(95)<15000",
    ],
    "http_req_duration{endpoint:certificate_preview}": ["p(95)<4000"],
    workflow_duration: ["p(95)<30000"],
    workflow_pdf_generation_duration: ["p(95)<15000"],
    workflow_payment_duration: ["p(95)<4000"],
    workflow_download_duration: ["p(95)<15000"],
    workflow_ready_email_duration: ["p(95)<5000"],
  };
}

function profileScenario(profile, exec, gracefulStop) {
  if (profile === "smoke") {
    return {
      executor: "constant-vus",
      exec,
      vus: exec === "public_browse" ? 2 : 1,
      duration: exec === "public_submit_track" ? "30s" : "45s",
      gracefulStop,
    };
  }

  if (profile === "stress") {
    if (exec === "public_browse") {
      return {
        executor: "ramping-vus",
        exec,
        stages: [
          { duration: "2m", target: 20 },
          { duration: "3m", target: 40 },
          { duration: "3m", target: 70 },
          { duration: "2m", target: 0 },
        ],
        gracefulStop,
      };
    }

    if (exec === "auth_read") {
      return {
        executor: "ramping-vus",
        exec,
        stages: [
          { duration: "2m", target: 5 },
          { duration: "3m", target: 12 },
          { duration: "3m", target: 20 },
          { duration: "2m", target: 0 },
        ],
        gracefulStop,
      };
    }

    return {
      executor: "ramping-vus",
      exec,
      stages: [
        { duration: "2m", target: 2 },
        { duration: "3m", target: 5 },
        { duration: "3m", target: 8 },
        { duration: "2m", target: 0 },
      ],
      gracefulStop,
    };
  }

  if (exec === "public_browse") {
    return {
      executor: "ramping-vus",
      exec,
      stages: [
        { duration: "1m", target: 10 },
        { duration: "3m", target: 20 },
        { duration: "1m", target: 0 },
      ],
      gracefulStop,
    };
  }

  if (exec === "auth_read") {
    return {
      executor: "ramping-vus",
      exec,
      stages: [
        { duration: "1m", target: 4 },
        { duration: "3m", target: 8 },
        { duration: "1m", target: 0 },
      ],
      gracefulStop,
    };
  }

  return {
    executor: "ramping-vus",
    exec,
    stages: [
      { duration: "1m", target: 1 },
      { duration: "3m", target: 3 },
      { duration: "1m", target: 0 },
    ],
    gracefulStop,
  };
}

function workflowScenario(profile) {
  if (profile === "smoke") {
    return {
      executor: "constant-vus",
      exec: "auth_workflow_heavy",
      vus: 1,
      duration: "45s",
      gracefulStop: "30s",
    };
  }

  if (profile === "stress") {
    return {
      executor: "ramping-vus",
      exec: "auth_workflow_heavy",
      stages: [
        { duration: "2m", target: 2 },
        { duration: "3m", target: 5 },
        { duration: "3m", target: 8 },
        { duration: "2m", target: 0 },
      ],
      gracefulStop: "45s",
    };
  }

  return {
    executor: "ramping-vus",
    exec: "auth_workflow_heavy",
    stages: [
      { duration: "1m", target: 1 },
      { duration: "3m", target: 3 },
      { duration: "1m", target: 0 },
    ],
    gracefulStop: "30s",
  };
}

function selectCertificateTypes(items, requestedNames) {
  if (!Array.isArray(items) || !items.length) {
    return [];
  }

  const selected = [];

  for (const requestedName of requestedNames) {
    const match = items.find(
      (item) => normalizeCertificateName(item?.name) === requestedName,
    );
    if (match) {
      selected.push(match);
    }
  }

  return selected;
}

function selectProgram(items) {
  if (!Array.isArray(items) || !items.length) {
    return null;
  }

  const preferred = items.find((item) =>
    String(item?.name || "")
      .toLowerCase()
      .includes("computer engineering"),
  );
  return preferred || items[0];
}

function buildRequestPayload(data) {
  return buildRequestPayloadForIndex(data, __VU + __ITER);
}

function pickCertificateType(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("No certificate types configured for this k6 run.");
  }

  return items[(__ITER + __VU) % items.length];
}

function pickCertificateTypeForStudent(data, student) {
  const baseTypes = Array.isArray(data?.certificateTypes)
    ? data.certificateTypes
    : [];
  const graduateOnlyTypes = Array.isArray(data?.graduateOnlyCertificateTypes)
    ? data.graduateOnlyCertificateTypes
    : [];
  const availableTypes = isGraduatedStudent(student)
    ? [...baseTypes, ...graduateOnlyTypes]
    : baseTypes;

  return pickCertificateType(availableTypes);
}

function pickSeededStudent() {
  if (!Array.isArray(SEEDED_STUDENTS) || !SEEDED_STUDENTS.length) {
    throw new Error("No seeded students configured for this k6 run.");
  }

  return SEEDED_STUDENTS[(__ITER + __VU) % SEEDED_STUDENTS.length];
}

function pickCapacityRequestId(requestIds) {
  if (!Array.isArray(requestIds) || !requestIds.length) {
    return null;
  }

  const sliceSize = Math.max(1, CAPACITY_REQUESTS_PER_VU);
  const index = (__VU - 1) * sliceSize + __ITER;
  return requestIds[index] || null;
}

function parseCertificateTypeNames(value) {
  const fallback = [
    "certificate of enrollment",
    "certificate of graduation",
    "certificate of id issuance",
    "certificate of nstp serial number",
    "certificate of english medium",
  ];

  const rawItems = String(value || "")
    .split(",")
    .map((item) => normalizeCertificateName(item))
    .filter(Boolean);

  return rawItems.length ? Array.from(new Set(rawItems)) : fallback;
}

function parseGraduateOnlyCertificateTypeNames(value) {
  const fallback = [
    "certification of completed academic requirements",
    "certificate of gwa",
    "certification of honor graduate",
    "certification of earned units",
  ];

  const rawItems = String(value || "")
    .split(",")
    .map((item) => normalizeCertificateName(item))
    .filter(Boolean);

  return rawItems.length ? Array.from(new Set(rawItems)) : fallback;
}

function parseSeededStudents(value) {
  const fallback = [
    {
      sr_code: __ENV.K6_SR_CODE || "22-07058",
      student_name: __ENV.K6_STUDENT_NAME || "Jim Mariel Castillo",
    },
  ];

  if (!value) {
    return fallback;
  }

  const parsed = String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [srCode, studentName] = entry.split("|").map((part) => part.trim());
      if (!srCode || !studentName) {
        return null;
      }

      return {
        sr_code: srCode,
        student_name: studentName,
      };
    })
    .filter(Boolean);

  return parsed.length ? parsed : fallback;
}

function parseGraduatedStudentCodes(value) {
  const fallback = ["21-00472"];
  const parsed = String(value || "")
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return parsed.length ? Array.from(new Set(parsed)) : fallback;
}

function isGraduatedStudent(student) {
  return (
    Boolean(student?.sr_code) &&
    GRADUATED_STUDENT_CODES.includes(student.sr_code)
  );
}

function createCapacityBacklog(data) {
  const requestIds = [];

  for (let index = 0; index < CAPACITY_BACKLOG; index += 1) {
    const payload = buildRequestPayloadForIndex(data, index, true);
    const createRes = http.post(
      `${BASE_URL}/api/v1/requests/`,
      JSON.stringify(payload),
      {
        headers: jsonHeaders(),
        timeout: HTTP_TIMEOUT,
        tags: { endpoint: "requests_create" },
      },
    );

    const ok = check(createRes, {
      "capacity backlog request creation 201": (res) => res.status === 201,
      "capacity backlog request has reference": (res) =>
        Boolean(res.json("reference_number")),
    });

    if (!ok || createRes.status !== 201) {
      throw new Error(
        `Capacity backlog creation failed at index ${index} with status ${createRes.status}: ${createRes.body}`,
      );
    }

    const referenceNumber = createRes.json("reference_number");
    const lookupRes = http.get(
      `${BASE_URL}/api/v1/payments/lookup?reference_number=${encodeURIComponent(referenceNumber)}`,
      {
        headers: DEFAULT_HEADERS,
        timeout: HTTP_TIMEOUT,
        tags: { endpoint: "payments_lookup" },
      },
    );

    const lookupOk = check(lookupRes, {
      "capacity backlog lookup 200": (res) => res.status === 200,
      "capacity backlog lookup has request id": (res) =>
        Number.isInteger(res.json("id")),
    });

    if (!lookupOk || lookupRes.status !== 200) {
      throw new Error(
        `Capacity backlog lookup failed at index ${index} with status ${lookupRes.status}: ${lookupRes.body}`,
      );
    }

    requestIds.push(lookupRes.json("id"));
  }

  return { requestIds };
}

function buildRequestPayloadForIndex(data, index, setupMode = false) {
  const now = Date.now();
  const alias = setupMode
    ? `setup-${index}-${now}`
    : `${__VU}-${__ITER}-${now}`;
  const student = pickSeededStudentByIndex(index);
  const certificateType = pickCertificateTypeForStudentByIndex(data, student, index);

  return {
    request_type: "certificate",
    certificate_type_id: certificateType.id,
    requestor_name: `K6 Requestor ${alias}`,
    requestor_address: "Golden Country Homes, Alangilan, Batangas City",
    requestor_relationship: "Self",
    requestor_contact: "09123456789",
    requestor_email: `k6-requestor-${alias}@example.com`,
    purpose: "Stress test submission",
    sr_code: student.sr_code,
    student_name: student.student_name,
    program: data.program.name,
    major: data.program.major || "",
  };
}

function pickSeededStudentByIndex(index) {
  if (!Array.isArray(SEEDED_STUDENTS) || !SEEDED_STUDENTS.length) {
    throw new Error("No seeded students configured for this k6 run.");
  }

  return SEEDED_STUDENTS[index % SEEDED_STUDENTS.length];
}

function pickCertificateTypeForStudentByIndex(data, student, index) {
  const baseTypes = Array.isArray(data?.certificateTypes)
    ? data.certificateTypes
    : [];
  const graduateOnlyTypes = Array.isArray(data?.graduateOnlyCertificateTypes)
    ? data.graduateOnlyCertificateTypes
    : [];
  const availableTypes = isGraduatedStudent(student)
    ? [...baseTypes, ...graduateOnlyTypes]
    : baseTypes;

  return availableTypes[index % availableTypes.length];
}

function normalizeCertificateName(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/certification of english medium/g, "certificate of english medium")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

function buildOrNumber() {
  return String((__VU * 1000 + __ITER) % 100000).padStart(5, "0");
}

function authHeaders(token, extraHeaders = {}) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...extraHeaders,
  };
}

function jsonHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function safeJsonArray(response) {
  try {
    const value = response.json();
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function toInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function sleepIfEnabled(min, max) {
  if (DISABLE_THINK_TIME) {
    return;
  }
  sleep(randomBetween(min, max));
}

function ensureHttpOk(response, label) {
  if (!response || response.error) {
    throw new Error(
      `${label} failed: ${response?.error || "request error without response"}`,
    );
  }
}

export function handleSummary(data) {
  const completed = metricCount(data, "workflow_completed");
  const failed = metricCount(data, "workflow_failures");
  const capacityCompleted = metricCount(data, "capacity_processed");
  const capacityFailed = metricCount(data, "capacity_failures");
  const workflowAvg = metricValue(data, "workflow_duration", "avg");
  const workflowP95 = metricValue(data, "workflow_duration", "p(95)");
  const pdfAvg = metricValue(data, "workflow_pdf_generation_duration", "avg");
  const pdfP95 = metricValue(data, "workflow_pdf_generation_duration", "p(95)");
  const capacityAvg = metricValue(data, "capacity_processing_duration", "avg");
  const capacityP95 = metricValue(data, "capacity_processing_duration", "p(95)");
  const checkRate = metricValue(data, "checks", "rate");
  const httpFailedRate = metricValue(data, "http_req_failed", "rate");

  const lines = [
    "",
    "=== Certify k6 Summary ===",
    `Mode: ${TEST_MODE}`,
    `Certificate mix: ${CERTIFICATE_TYPE_NAMES.join(", ")}`,
    `Graduate-only certificate mix: ${GRADUATE_ONLY_CERTIFICATE_TYPE_NAMES.join(", ")}`,
    `Graduated students: ${GRADUATED_STUDENT_CODES.join(", ")}`,
    `Student pool: ${SEEDED_STUDENTS.map((student) => `${student.sr_code} ${student.student_name}`).join(", ")}`,
  ];

  if (TEST_MODE === "capacity_threshold") {
    lines.push(
      `Capacity backlog: ${CAPACITY_BACKLOG}`,
      `Capacity stage targets: ${CAPACITY_STAGE_1_TARGET}, ${CAPACITY_STAGE_2_TARGET}, ${CAPACITY_STAGE_3_TARGET}, ${CAPACITY_STAGE_4_TARGET} VUs`,
      `Processed queue items: ${capacityCompleted}`,
      `Processing failures: ${capacityFailed}`,
      `Processing duration avg: ${formatMs(capacityAvg)}`,
      `Processing duration p95: ${formatMs(capacityP95)}`,
      `PDF generation avg: ${formatMs(pdfAvg)}`,
      `PDF generation p95: ${formatMs(pdfP95)}`,
      `Check pass rate: ${formatRate(checkRate)}`,
      `HTTP failure rate: ${formatRate(httpFailedRate)}`,
    );
  } else {
    lines.push(
      `Target requests: ${DAILY_REQUESTS}`,
      `Arrival pattern: ${DAILY_REQUESTS_PER_INTERVAL} request(s) every ${DAILY_REQUEST_INTERVAL_SECONDS} second(s)`,
      `Completed workflows: ${completed}`,
      `Workflow failures: ${failed}`,
      `Workflow duration avg: ${formatMs(workflowAvg)}`,
      `Workflow duration p95: ${formatMs(workflowP95)}`,
      `PDF generation avg: ${formatMs(pdfAvg)}`,
      `PDF generation p95: ${formatMs(pdfP95)}`,
      `Check pass rate: ${formatRate(checkRate)}`,
      `HTTP failure rate: ${formatRate(httpFailedRate)}`,
    );
  }

  if (TEST_MODE === "daily_100" && workflowAvg > 0) {
    const projectedDailySeconds = (workflowAvg / 1000) * DAILY_REQUESTS;
    const projectedHours = projectedDailySeconds / 3600;
    lines.push(
      `Projected processing time for ${DAILY_REQUESTS} workflows at avg speed: ${projectedHours.toFixed(2)} hours`,
    );
  }

  return {
    stdout: `${lines.join("\n")}\n`,
  };
}

function metricValue(data, metricName, field) {
  return Number(data?.metrics?.[metricName]?.values?.[field] || 0);
}

function metricCount(data, metricName) {
  return Number(data?.metrics?.[metricName]?.values?.count || 0);
}

function formatMs(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "n/a";
  }
  if (value < 1000) {
    return `${value.toFixed(0)} ms`;
  }
  return `${(value / 1000).toFixed(2)} s`;
}

function formatRate(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return `${(value * 100).toFixed(2)}%`;
}
