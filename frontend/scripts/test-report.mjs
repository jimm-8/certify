import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const reportPath = path.join(cwd, "test-results.json");
const outputPath = path.join(cwd, "..", "docs", "TEST_RESULTS.txt");

const loadReport = () => {
  if (!fs.existsSync(reportPath)) {
    throw new Error("test-results.json not found. Run vitest with --reporter json first.");
  }
  const raw = fs.readFileSync(reportPath, "utf8");
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
        failureMessages: t.failureMessages || t.errors || [],
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
        failureMessages: t.errors || [],
      }));
      return cases;
    });
  }

  return [];
};

const tests = normalizeTests(loadReport());

const entries = [
  {
    label: "Test for Processing Request - Bulk Approve",
    match: (t) =>
      t.file.includes("checking.test.jsx") &&
      t.title.toLowerCase().includes("processes approved requests in bulk"),
    passText: "approved requests move to PROCESSING",
  },
  {
    label: "Test for Processing Request - Single Update",
    match: (t) =>
      t.file.includes("tracker.test.jsx") &&
      t.title.toLowerCase().includes("moves approved request to processing"),
    passText: "APPROVED to PROCESSING action works",
  },
  {
    label: "Test for Certificate Preview / Creation",
    match: (t) =>
      t.file.includes("ready.test.jsx") &&
      t.title.toLowerCase().includes("downloads certificate"),
    passText: "downloadCertificate is triggered",
  },
  {
    label: "Test for Ready Email - Wet Signature Enabled",
    match: (t) =>
      t.file.includes("ready.test.jsx") &&
      t.title.toLowerCase().includes("sends ready email"),
    passText: "sendReadyEmail called",
  },
  {
    label: "Test for Release Completion",
    match: (t) =>
      t.file.includes("ready.test.jsx") &&
      t.title.toLowerCase().includes("marks request as released"),
    passText: "status updates to RELEASED",
  },
  {
    label: "Test for Checking - Empty State",
    match: (t) =>
      t.file.includes("checking.test.jsx") &&
      t.title.toLowerCase().includes("shows empty state"),
    passText: "shows no requests",
  },
  {
    label: "Test for Tracker - Empty State",
    match: (t) =>
      t.file.includes("tracker.test.jsx") &&
      t.title.toLowerCase().includes("shows empty state"),
    passText: "shows no requests",
  },
  {
    label: "Test for Ready - Empty State",
    match: (t) =>
      t.file.includes("ready.test.jsx") &&
      t.title.toLowerCase().includes("shows empty state"),
    passText: "shows no requests ready for releasing",
  },
  {
    label: "Test for Payment - Empty State",
    match: (t) =>
      t.file.includes("payment.test.jsx") &&
      t.title.toLowerCase().includes("shows empty state"),
    passText: "shows no requests",
  },
  {
    label: "Test for Request Modal - Null Render",
    match: (t) =>
      t.file.includes("requestModal.test.jsx") &&
      t.title.toLowerCase().includes("renders null"),
    passText: "modal renders null with no request",
  },
  {
    label: "Test for Request Modal - Suggested Decline Note",
    match: (t) =>
      t.file.includes("requestModal.test.jsx") &&
      t.title.toLowerCase().includes("suggested decline note"),
    passText: "suggested note inserted",
  },
  {
    label: "Test for Request Modal - Course Selection Required",
    match: (t) =>
      t.file.includes("requestModal.test.jsx") &&
      t.title.toLowerCase().includes("requires course selection"),
    passText: "approve disabled until selection",
  },
  {
    label: "Test for Request Modal - Rejection Email",
    match: (t) =>
      t.file.includes("requestModal.test.jsx") &&
      t.title.toLowerCase().includes("rejection email"),
    passText: "rejection email action fires",
  },
];

const lines = [];

for (const entry of entries) {
  const test = tests.find(entry.match);
  const status = test?.status === "passed" || test?.status === "pass" ? "PASS" : "FAIL";
  const message = status === "PASS" ? entry.passText : "failed - see test output";

  lines.push(`[${entry.label}]`);
  lines.push(`${status}: ${message}`);
  lines.push("");
}

fs.writeFileSync(outputPath, lines.join("\n"), "utf8");

console.log(`Wrote test labels to ${outputPath}`);
