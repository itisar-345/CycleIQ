/**
 * Drives the web preview (with demo data) like a user — onboarding, then every tab — and saves
 * phone-sized 2x screenshots. Used by `npm run screenshots`; see scripts/screenshots/run.js.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const findChrome = () => {
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error("Chrome/Chromium not found — set CHROME_PATH to its executable.");
  return found;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Tab title → output file name, in tab-bar order. */
const TABS = [["Log", "04-log"], ["Calendar", "05-calendar"], ["Insights", "06-insights"], ["You", "07-profile"]];

const capture = async ({ url, outDir, scheme }) => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    page.on("pageerror", (e) => console.warn(`[${scheme}] page error:`, e.message));

    const tapText = async (text) => {
      const el = await page.waitForSelector(`::-p-text(${text})`, { timeout: 30000, visible: true });
      await el.click();
      await sleep(900);
    };
    const shot = async (name) => {
      await sleep(1200);
      await page.screenshot({ path: path.join(outDir, `${name}.png`) });
      console.log(`[${scheme}] ${name}`);
    };

    await page.goto(url, { waitUntil: "networkidle2", timeout: 180000 });
    await page.waitForSelector("::-p-text(Just track my cycle)", { timeout: 180000 });
    await shot("01-onboarding");

    await tapText("Just track my cycle");
    await tapText("~1 week ago");
    await tapText("Show my prediction");
    await page.waitForSelector("::-p-text(let's go)", { timeout: 30000 });
    await shot("02-first-prediction");
    await tapText("let's go");

    await page.waitForSelector("::-p-text(where you're at)", { timeout: 60000 });
    await shot("03-home");

    for (const [label, name] of TABS) {
      const tab = await page.waitForSelector(`[role="tab"] ::-p-text(${label})`, { timeout: 20000 });
      await tab.click();
      await sleep(2500);
      await shot(name);
    }
  } finally {
    await browser.close();
  }
};

module.exports = { capture };
