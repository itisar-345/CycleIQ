/** `npm run web:demo` — the web preview filled with sample data (in memory only). */
const { spawn } = require("child_process");

spawn("npx", ["expo", "start", "--web", ...process.argv.slice(2)], {
  env: { ...process.env, EXPO_PUBLIC_DEMO_DATA: "1" },
  shell: process.platform === "win32",
  stdio: "inherit",
}).on("exit", (code) => process.exit(code ?? 0));
