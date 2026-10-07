/**
 * Turns 2x captures into README assets: 1x PNGs per screen and an animated tab-tour GIF,
 * for light and dark mode.
 */
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const SCREENS = ["01-onboarding", "02-first-prediction", "03-home", "04-log", "05-calendar", "06-insights", "07-profile"];
const TOUR = ["03-home", "04-log", "05-calendar", "06-insights", "07-profile"];
const FRAME_MS = 1800;

/** 2x → 1x with a 2×2 box filter. */
const halve = (png) => {
  const w = png.width >> 1;
  const h = png.height >> 1;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          sum += png.data[((y * 2 + dy) * png.width + x * 2 + dx) * 4 + c];
        }
        out.data[(y * w + x) * 4 + c] = Math.round(sum / 4);
      }
    }
  }
  return out;
};

const makeAssets = ({ captureDir, destDir, scheme }) => {
  const outDir = path.join(destDir, scheme);
  fs.mkdirSync(outDir, { recursive: true });
  const small = {};
  for (const name of SCREENS) {
    small[name] = halve(PNG.sync.read(fs.readFileSync(path.join(captureDir, `${name}.png`))));
    fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(small[name], { colorType: 2 }));
  }

  // One palette shared by every frame keeps colours steady from screen to screen.
  const { width, height } = small[TOUR[0]];
  const palette = quantize(Buffer.concat(TOUR.map((n) => small[n].data)), 256, { format: "rgb565" });
  const gif = GIFEncoder();
  for (const name of TOUR) {
    gif.writeFrame(applyPalette(small[name].data, palette, "rgb565"), width, height, { palette, delay: FRAME_MS });
  }
  gif.finish();
  fs.writeFileSync(path.join(destDir, `tour-${scheme}.gif`), Buffer.from(gif.bytes()));
};

module.exports = { makeAssets };
