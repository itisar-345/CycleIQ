/**
 * `npm run screenshots` — regenerates docs/screenshots/ (README images and tab-tour GIFs).
 *
 * Starts the web preview with demo data (EXPO_PUBLIC_DEMO_DATA=1), walks through it in
 * headless Chrome in light and dark mode, then writes 1x PNGs and GIFs. Needs Chrome or
 * Chromium (set CHROME_PATH if it isn't found) and an internet connection (sql.js loads
 * from jsDelivr). Screens show sample data only.
 */
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { capture } = require("./capture");
const { makeAssets } = require("./make-assets");

const ROOT = path.resolve(__dirname, "../..");
const PORT = Number(process.env.PORT || 8099);
const URL = `http://localhost:${PORT}`;
const DEST = path.join(ROOT, "docs", "screenshots");

const waitForServer = async (timeoutMs = 240000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(URL)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Web preview didn't start on ${URL}`);
};

const stop = (child) => {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
  else process.kill(-child.pid, "SIGTERM");
};

(async () => {
  const server = spawn("npx", ["expo", "start", "--web", "--port", String(PORT), "--clear"], {
    cwd: ROOT,
    env: { ...process.env, EXPO_PUBLIC_DEMO_DATA: "1", CI: "1", BROWSER: "none" },
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
    stdio: "ignore",
  });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cycleiq-shots-"));
  try {
    console.log("Starting web preview with demo data…");
    await waitForServer();
    for (const scheme of ["light", "dark"]) {
      const captureDir = path.join(tmp, scheme);
      await capture({ url: URL, outDir: captureDir, scheme });
      makeAssets({ captureDir, destDir: DEST, scheme });
    }
    console.log(`Done → ${path.relative(ROOT, DEST)}`);
  } finally {
    stop(server);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
