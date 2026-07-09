import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const nodeCommand = process.execPath;

const run = (command, args) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });

let exitCode = 0;

const vitestCode = await run(nodeCommand, [
  "./node_modules/vitest/vitest.mjs",
  "run",
  "--reporter",
  "json",
  "--outputFile",
  "test-results.json",
]);
if (vitestCode !== 0) exitCode = vitestCode;

const playwrightCode = await run(nodeCommand, ["./scripts/run-playwright.mjs"]);
if (playwrightCode !== 0 && exitCode === 0) exitCode = playwrightCode;

const reportCode = await run(nodeCommand, ["./scripts/test-report-table.mjs"]);
if (reportCode !== 0 && exitCode === 0) exitCode = reportCode;

process.exit(exitCode);
