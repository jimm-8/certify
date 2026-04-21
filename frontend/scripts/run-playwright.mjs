import http from "node:http";
import { spawn } from "node:child_process";
import process from "node:process";

const HOST = "127.0.0.1";
const PORT = 5173;
const BASE_URL = `http://${HOST}:${PORT}`;
const STARTUP_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 1_000;

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isServerReachable = () =>
  new Promise((resolve) => {
    const request = http.get(BASE_URL, (response) => {
      response.resume();
      resolve(response.statusCode < 500);
    });

    request.on("error", () => resolve(false));
    request.setTimeout(2_000, () => {
      request.destroy();
      resolve(false);
    });
  });

const waitForServer = async (timeoutMs) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReachable()) {
      return true;
    }
    await wait(POLL_INTERVAL_MS);
  }

  return false;
};

const startDevServer = () =>
  spawn(
    npmCommand,
    ["run", "dev", "--", "--host", HOST, "--port", String(PORT)],
    {
      stdio: "inherit",
      shell: false,
    },
  );

const runPlaywright = (args) =>
  new Promise((resolve) => {
    const child = spawn(npmCommand, ["exec", "playwright", "test", ...args], {
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });

const shutdown = async (child) => {
  if (!child || child.killed) return;

  child.kill("SIGTERM");
  await wait(1_500);

  if (!child.killed) {
    child.kill("SIGKILL");
  }
};

const args = process.argv.slice(2);

let devServer = null;

try {
  const serverAlreadyRunning = await isServerReachable();

  if (!serverAlreadyRunning) {
    devServer = startDevServer();
    const ready = await waitForServer(STARTUP_TIMEOUT_MS);

    if (!ready) {
      await shutdown(devServer);
      console.error(`Dev server did not become ready at ${BASE_URL}.`);
      process.exit(1);
    }
  }

  const exitCode = await runPlaywright(args);
  await shutdown(devServer);
  process.exit(exitCode);
} catch (error) {
  await shutdown(devServer);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
