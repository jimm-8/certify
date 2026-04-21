const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { print, getPrinters } = require("pdf-to-printer");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");
const crypto = require("crypto");

const execFileAsync = promisify(execFile);
const app = express();
const PORT = process.env.PRINT_AGENT_PORT || 3100;
const JOB_DISCOVERY_TIMEOUT_MS = Number(
  process.env.PRINT_AGENT_JOB_DISCOVERY_TIMEOUT_MS || 15000,
);
const JOB_COMPLETION_TIMEOUT_MS = Number(
  process.env.PRINT_AGENT_JOB_COMPLETION_TIMEOUT_MS || 120000,
);
const JOB_POLL_INTERVAL_MS = Number(
  process.env.PRINT_AGENT_JOB_POLL_INTERVAL_MS || 1000,
);

const trackedJobs = new Map();

app.use(cors());
app.use(morgan("tiny"));

app.use(
  express.raw({
    type: ["application/pdf"],
    limit: "30mb",
  }),
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const escapePowerShell = (value) => String(value || "").replace(/'/g, "''");

const isFinalState = (state) => ["completed", "failed"].includes(state);

const createJobPayload = (job) => ({
  job_id: job.id,
  status: job.state,
  printer: job.printer,
  spooler_job_id: job.spoolerJobId,
  submitted_at: job.submittedAt,
  completed_at: job.completedAt,
  error: job.error,
  detail: job.detail,
});

async function runPowerShell(script) {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-Command", script],
    { windowsHide: true, timeout: 15000 },
  );
  return stdout.trim();
}

async function resolvePrinterName(preferredPrinter) {
  if (preferredPrinter) return preferredPrinter;

  const output = await runPowerShell(
    "(Get-CimInstance Win32_Printer | Where-Object {$_.Default -eq $true} | " +
      "Select-Object -First 1 -ExpandProperty Name)",
  );

  if (!output) {
    throw new Error("No default printer is configured.");
  }

  return output;
}

async function listPrintJobs(printerName) {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$jobs = Get-PrintJob -PrinterName '${escapePowerShell(printerName)}' -ErrorAction SilentlyContinue`,
    "if ($null -eq $jobs) { return '[]' }",
    "$jobs | Select-Object ID, DocumentName, JobStatus, SubmittedTime, PagesPrinted, TotalPages | ConvertTo-Json -Compress",
  ].join("; ");

  const output = await runPowerShell(script);
  if (!output) return [];

  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function normalizeJobStatus(value) {
  return String(value || "").toLowerCase();
}

function looksFailed(job) {
  const status = normalizeJobStatus(job?.JobStatus);
  return [
    "error",
    "offline",
    "paperout",
    "paper jam",
    "blocked",
    "user intervention",
    "deleted",
  ].some((flag) => status.includes(flag));
}

function markJobFailed(job, error) {
  if (isFinalState(job.state)) return;
  job.state = "failed";
  job.error = String(error?.message || error || "Print job failed");
  job.completedAt = new Date().toISOString();
}

function markJobCompleted(job, detail) {
  if (isFinalState(job.state)) return;
  job.state = "completed";
  job.error = null;
  job.detail = detail || job.detail;
  job.completedAt = new Date().toISOString();
}

async function observeTrackedJob(job, beforeIds) {
  const discoveryDeadline = Date.now() + JOB_DISCOVERY_TIMEOUT_MS;

  while (Date.now() < discoveryDeadline && !job.spoolerJobId) {
    try {
      const jobs = await listPrintJobs(job.printer);
      const newJob = jobs
        .filter((item) => !beforeIds.has(item.ID))
        .sort((a, b) => Number(b.ID || 0) - Number(a.ID || 0))[0];

      if (newJob) {
        job.spoolerJobId = newJob.ID;
        job.detail = `Tracking spooler job ${newJob.ID}`;
        break;
      }
    } catch (error) {
      markJobFailed(job, error);
      return;
    }

    await sleep(JOB_POLL_INTERVAL_MS);
  }

  if (!job.spoolerJobId) {
    job.detail =
      "Print command accepted, but a spooler job could not be matched yet.";
    return;
  }

  const completionDeadline = Date.now() + JOB_COMPLETION_TIMEOUT_MS;

  while (Date.now() < completionDeadline) {
    try {
      const jobs = await listPrintJobs(job.printer);
      const activeJob = jobs.find((item) => item.ID === job.spoolerJobId);

      if (!activeJob) {
        markJobCompleted(job, "Spooler job completed and left the queue.");
        return;
      }

      if (looksFailed(activeJob)) {
        markJobFailed(
          job,
          activeJob.JobStatus || "Printer reported a failed spooler job.",
        );
        return;
      }

      job.detail = activeJob.JobStatus || "Waiting for printer completion.";
    } catch (error) {
      markJobFailed(job, error);
      return;
    }

    await sleep(JOB_POLL_INTERVAL_MS);
  }

  job.detail = "Still waiting for printer completion.";
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/printers", async (req, res) => {
  try {
    const printers = await getPrinters();
    res.json({ printers });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get("/jobs/:jobId", (req, res) => {
  const job = trackedJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Print job not found." });
  }

  return res.json(createJobPayload(job));
});

app.post("/print", async (req, res) => {
  let tmpFile = null;

  try {
    if (!req.body || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: "PDF bytes required" });
    }

    const requestedPrinter = req.query.printer || undefined;
    const printer = await resolvePrinterName(requestedPrinter);
    const copies = Number(req.query.copies || 1);
    const beforeJobs = await listPrintJobs(printer);
    const beforeIds = new Set(beforeJobs.map((job) => job.ID));

    tmpFile = path.join(
      os.tmpdir(),
      `certify_print_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`,
    );
    fs.writeFileSync(tmpFile, req.body);

    const job = {
      id:
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `job_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      state: "sending",
      printer,
      spoolerJobId: null,
      submittedAt: null,
      completedAt: null,
      error: null,
      detail: "Sending print job to the local printer.",
    };
    trackedJobs.set(job.id, job);

    const options = {
      printer,
      copies: Number.isFinite(copies) && copies > 0 ? copies : 1,
    };

    await print(tmpFile, options);

    job.state = "submitted";
    job.submittedAt = new Date().toISOString();
    job.detail = "Print command accepted by the local print agent.";

    observeTrackedJob(job, beforeIds).catch((error) => {
      markJobFailed(job, error);
    });

    return res.status(202).json(createJobPayload(job));
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  } finally {
    if (tmpFile) {
      try {
        fs.unlinkSync(tmpFile);
      } catch (error) {
        // ignore cleanup errors
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`Print agent running on http://127.0.0.1:${PORT}`);
});
