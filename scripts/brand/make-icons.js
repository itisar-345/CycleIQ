/**
 * `npm run icons` — regenerates every app icon in assets/images/ from one SVG mark (a cycle
 * ring with a droplet) in the brand colour. Renders with headless Chrome (CHROME_PATH if not
 * found). Afterwards run `node scripts/screenshots/play-assets.js` to refresh the Play icon
 * and feature graphic.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const { findChrome } = require("../screenshots/capture");

const TINT = "#B5462F"; // constants/theme.ts light tint
const OUT = path.resolve(__dirname, "../../assets/images");

/** The mark on a 100×100 canvas: an open ring (a cycle) around a droplet. */
const mark = (color) => `
  <circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"
          stroke-dasharray="205 46.3" transform="rotate(-62 50 50)"/>
  <path d="M50 8 C50 8 20 44 20 64 a30 30 0 0 0 60 0 C80 44 50 8 50 8 Z" fill="${color}"
        transform="translate(50 50) scale(0.42) translate(-50 -56)"/>`;

/** size px canvas; mark scaled to `scale` of it; optional solid background and corner radius. */
const svg = ({ size, scale, color, background, radius = 0 }) => {
  const m = (size * scale) / 100;
  const offset = (size - size * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${background ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>` : ""}
    <g transform="translate(${offset} ${offset}) scale(${m})">${mark(color)}</g></svg>`;
};

const ICONS = [
  // iOS / store icon: full-bleed, opaque.
  { file: "icon.png", size: 1024, scale: 0.62, color: "#FFFFFF", background: TINT },
  // Android adaptive icon: the launcher masks to a circle/squircle inside the central 66/108.
  { file: "android-icon-foreground.png", size: 1024, scale: 0.56, color: "#FFFFFF" },
  { file: "android-icon-background.png", size: 1024, scale: 0, color: TINT, background: TINT },
  { file: "android-icon-monochrome.png", size: 1024, scale: 0.56, color: "#FFFFFF" },
  // Splash (shown at 200 px on the theme background) and notification-free web favicon.
  { file: "splash-icon.png", size: 1024, scale: 0.9, color: TINT },
  { file: "favicon.png", size: 48, scale: 0.7, color: "#FFFFFF", background: TINT, radius: 10 },
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    for (const icon of ICONS) {
      await page.setViewport({ width: icon.size, height: icon.size, deviceScaleFactor: 1 });
      await page.setContent(`<html><body style="margin:0;background:transparent">${svg(icon)}</body></html>`);
      await page.screenshot({ path: path.join(OUT, icon.file), omitBackground: true, clip: { x: 0, y: 0, width: icon.size, height: icon.size } });
      console.log(icon.file);
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
