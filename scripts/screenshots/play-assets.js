/**
 * Google Play listing graphics that don't come from screen captures: the 512×512 hi-res icon
 * (from assets/images/icon.png) and the 1024×500 feature graphic (rendered in headless Chrome).
 */
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const puppeteer = require("puppeteer-core");
const { findChrome } = require("./capture");

const TINT = "#B5462F"; // constants/theme.ts light tint
const BACKGROUND = "#FFF8F5";

/** 1024 → 512 with a 2×2 box filter (Play wants a 512×512 32-bit PNG). */
const halve = (png) => {
  const w = png.width >> 1;
  const h = png.height >> 1;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) sum += png.data[((y * 2 + dy) * png.width + x * 2 + dx) * 4 + c];
        out.data[(y * w + x) * 4 + c] = Math.round(sum / 4);
      }
    }
  }
  return out;
};

const featureGraphicHtml = (iconDataUri) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1024px; height: 500px; overflow: hidden; }
  body { background: linear-gradient(120deg, ${BACKGROUND} 0%, #F6E1D9 100%); font-family: "Segoe UI", Roboto, system-ui, sans-serif;
         display: flex; align-items: center; gap: 56px; padding: 0 88px; box-sizing: border-box; color: #2B2120; }
  img { width: 220px; height: 220px; border-radius: 48px; box-shadow: 0 18px 40px rgba(181, 70, 47, 0.25); flex: none; }
  h1 { margin: 0 0 14px; font-size: 76px; letter-spacing: -1.5px; color: ${TINT}; }
  p { margin: 0; font-size: 34px; line-height: 1.25; font-weight: 600; }
  small { display: block; margin-top: 18px; font-size: 24px; color: #6B5753; font-weight: 500; }
</style></head><body>
  <img src="${iconDataUri}" alt="">
  <div><h1>CycleIQ</h1><p>Private period, PCOS &amp; endo tracker</p><small>Your data never leaves your phone</small></div>
</body></html>`;

const makePlayAssets = async ({ root, destDir }) => {
  fs.mkdirSync(destDir, { recursive: true });
  const iconPath = path.join(root, "assets", "images", "icon.png");
  const icon = PNG.sync.read(fs.readFileSync(iconPath));
  const icon512 = icon.width === 1024 ? halve(icon) : icon;
  fs.writeFileSync(path.join(destDir, "icon-512.png"), PNG.sync.write(icon512));
  console.log("[play] icon-512.png");

  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
    const dataUri = `data:image/png;base64,${fs.readFileSync(iconPath).toString("base64")}`;
    await page.setContent(featureGraphicHtml(dataUri), { waitUntil: "load" });
    // Play rejects transparency in the feature graphic, so keep the page background opaque.
    await page.screenshot({ path: path.join(destDir, "feature-graphic.png"), omitBackground: false });
    console.log("[play] feature-graphic.png");
  } finally {
    await browser.close();
  }
};

module.exports = { makePlayAssets };

// `node scripts/screenshots/play-assets.js` makes just the icon and feature graphic.
if (require.main === module) {
  makePlayAssets({ root: path.resolve(__dirname, "../.."), destDir: path.resolve(__dirname, "../../docs/store/play") }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
