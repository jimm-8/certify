import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const reportPath = path.join(cwd, "test-results.json");
const playwrightPath = path.join(cwd, "playwright-results.json");

const loadReport = () => {
  if (!fs.existsSync(reportPath)) {
    throw new Error("test-results.json not found. Run vitest with --reporter json first.");
  }
  const raw = fs.readFileSync(reportPath, "utf8");
  return JSON.parse(raw);
};

const loadPlaywright = () => {
  if (!fs.existsSync(playwrightPath)) return null;
  const raw = fs.readFileSync(playwrightPath, "utf8");
  return JSON.parse(raw);
};

const normalizeTests = (report) => {
  if (Array.isArray(report?.testResults)) {
    return report.testResults.flatMap((suite) => {
      const file = suite.name || "";
      const results = suite.assertionResults || [];
      return results.map((t) => ({
        file,
        title: t.title || t.fullName || "",
        status: t.status || t.state || "unknown",
      }));
    });
  }

  if (Array.isArray(report?.files)) {
    return report.files.flatMap((file) => {
      const filePath = file.filepath || file.name || "";
      const cases = (file.tests || []).map((t) => ({
        file: filePath,
        title: t.name || t.title || "",
        status: t.result || t.status || "unknown",
      }));
      return cases;
    });
  }

  return [];
};

const entries = [
  {
    id: "TC-01",
    type: "Unit",
    desc: "Approve request (bulk)",
    expected: "Moves to Processing",
    match: (t) =>
      t.file.includes("checking.test.jsx") &&
      t.title.toLowerCase().includes("processes approved requests in bulk"),
  },
  {
    id: "TC-02",
    type: "Unit",
    desc: "Process request (single)",
    expected: "Moves to Processing",
    match: (t) =>
      t.file.includes("tracker.test.jsx") &&
      t.title.toLowerCase().includes("moves approved request to processing"),
  },
  {
    id: "TC-03",
    type: "Unit",
    desc: "Ready email send",
    expected: "Ready email is sent",
    match: (t) =>
      t.file.includes("ready.test.jsx") &&
      t.title.toLowerCase().includes("sends ready email"),
  },
  {
    id: "TC-04",
    type: "Unit",
    desc: "Release request",
    expected: "Status updates to Released",
    match: (t) =>
      t.file.includes("ready.test.jsx") &&
      t.title.toLowerCase().includes("marks request as released"),
  },
  {
    id: "TC-05",
    type: "Unit",
    desc: "Preview certificate",
    expected: "Certificate download triggered",
    match: (t) =>
      t.file.includes("ready.test.jsx") &&
      t.title.toLowerCase().includes("downloads certificate"),
  },
  {
    id: "TC-06",
    type: "Integration",
    desc: "Record payment",
    expected: "Request marked paid",
    match: (t) =>
      t.file.includes("payment-flow.test.jsx") &&
      t.title.toLowerCase().includes("records payment"),
  },
  {
    id: "TC-07",
    type: "Unit",
    desc: "Checking empty state",
    expected: "Shows no approved requests",
    match: (t) =>
      t.file.includes("checking.test.jsx") &&
      t.title.toLowerCase().includes("shows empty state"),
  },
  {
    id: "TC-08",
    type: "Unit",
    desc: "Tracker empty state",
    expected: "Shows no requests",
    match: (t) =>
      t.file.includes("tracker.test.jsx") &&
      t.title.toLowerCase().includes("shows empty state"),
  },
  {
    id: "TC-09",
    type: "Unit",
    desc: "Ready empty state",
    expected: "Shows no requests ready for releasing",
    match: (t) =>
      t.file.includes("ready.test.jsx") &&
      t.title.toLowerCase().includes("shows empty state"),
  },
  {
    id: "TC-10",
    type: "Unit",
    desc: "Payment empty state",
    expected: "Shows no requests",
    match: (t) =>
      t.file.includes("payment.test.jsx") &&
      t.title.toLowerCase().includes("shows empty state"),
  },
  {
    id: "TC-11",
    type: "Unit",
    desc: "Modal renders null",
    expected: "No modal rendered",
    match: (t) =>
      t.file.includes("requestModal.test.jsx") &&
      t.title.toLowerCase().includes("renders null"),
  },
  {
    id: "TC-12",
    type: "Unit",
    desc: "Decline note suggestion",
    expected: "Suggested note inserted",
    match: (t) =>
      t.file.includes("requestModal.test.jsx") &&
      t.title.toLowerCase().includes("suggested decline note"),
  },
  {
    id: "TC-13",
    type: "Unit",
    desc: "Course selection required",
    expected: "Approve disabled until selection",
    match: (t) =>
      t.file.includes("requestModal.test.jsx") &&
      t.title.toLowerCase().includes("requires course selection"),
  },
  {
    id: "TC-14",
    type: "Unit",
    desc: "Rejection email",
    expected: "Rejection email action fires",
    match: (t) =>
      t.file.includes("requestModal.test.jsx") &&
      t.title.toLowerCase().includes("rejection email"),
  },
  {
    id: "TC-15",
    type: "Integration",
    desc: "Processing to For Releasing",
    expected: "Status moves to For Releasing",
    match: (t) =>
      t.file.includes("processing-flow.test.jsx") &&
      t.title.toLowerCase().includes("for_releasing"),
  },
  {
    id: "TC-16",
    type: "Integration",
    desc: "Release flow integration",
    expected: "Status becomes Released",
    match: (t) =>
      t.file.includes("release-flow.test.jsx") &&
      t.title.toLowerCase().includes("marks request as released"),
  },
  {
    id: "TC-17",
    type: "E2E",
    desc: "E2E full workflow",
    expected: "Approve → Process → Pay → Release",
    match: (t) => t.file.includes("e2e/flow.spec.js"),
  },
];

const tests = normalizeTests(loadReport());
const playwright = loadPlaywright();
const e2eStats = playwright?.stats || null;
const e2eExpected = e2eStats ? Number(e2eStats.expected || 0) : 0;
const e2eUnexpected = e2eStats ? Number(e2eStats.unexpected || 0) : 0;
const e2ePassed = e2eExpected > 0 && e2eUnexpected === 0;
const e2eSkipped = e2eStats && e2eExpected === 0;

const rows = entries.map((e) => {
  const test = tests.find(e.match);
  let status = "FAIL";
  if (e.type === "E2E") {
    if (e2ePassed) status = "PASS";
    else if (e2eSkipped) status = "SKIPPED";
    else status = "FAIL";
  } else {
    const statusRaw = test?.status || "unknown";
    status = statusRaw === "passed" || statusRaw === "pass" ? "PASS" : "FAIL";
  }
  return [e.id, e.type, e.desc, e.expected, status];
});

const header = ["Test Case", "Type", "Description", "Expected Result", "Status"];

const widths = header.map((h, i) =>
  Math.max(h.length, ...rows.map((r) => String(r[i]).length))
);

const formatRow = (cols) =>
  cols
    .map((c, i) => String(c).padEnd(widths[i], " "))
    .join(" | ");

const divider = widths.map((w) => "-".repeat(w)).join("-|-" );

console.log(formatRow(header));
console.log(divider);
rows.forEach((r) => console.log(formatRow(r)));
