/**
 * Database layer against real SQLite (better-sqlite3 behind the expo-sqlite API —
 * see tests/support). Run via `npm test`.
 */
import assert from "node:assert/strict";
import {
  closeCycle,
  createCycle,
  createSymptomEntry,
  deleteCycle,
  exportLocalDataSnapshot,
  generateInsights,
  persistAndRetireInsights,
  getAllCycles,
  getCycleEntries,
  getCyclePredictions,
  initDb,
  restoreLocalDataSnapshot,
  saveAppSetting,
  saveFlareEnd,
  seedInitialCycleFromOnboarding,
  updateCycle,
  wipeLocalDatabase,
} from "../database";
import { ensureDb, execSql, queryAll, queryFirst } from "../database/connection";
import { recomputeCycleLengths } from "../database/cycles";
import { webcrypto } from "node:crypto";
import { encryptedPersistStorage } from "../utils/encryptedPersistStorage";
import { decryptField, encryptField, FieldDecryptionError } from "../utils/fieldEncryption";
import { getOrCreateDbKey } from "../utils/secureKey";
import { __asyncStorage } from "./support/fake-async-storage";
import { useAppStore } from "../store";
import { currentTx } from "../utils/tone";
import { getCopy } from "../constants/copy";
import { resolveNotificationContent } from "../utils/notifications";

const DAY_MS = 86400000;
const day = (iso: string) => `${iso}T12:00:00.000Z`;
const addDaysISO = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * DAY_MS).toISOString();

const tests: [string, () => Promise<void>][] = [];
const test = (name: string, fn: () => Promise<void>) => tests.push([name, fn]);

test("schema and migration ledger are created", async () => {
  const migrations = await queryAll<{ id: number }>(`SELECT id FROM schema_migrations ORDER BY id;`);
  assert.deepEqual(migrations.map((m) => m.id), [1, 2, 3, 4]);
});

test("onboarding seed leaves the current cycle open", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 30);
  const cycles = await getAllCycles();
  assert.equal(cycles.length, 2);
  assert.equal(cycles[0].cycle_length, null, "in-progress cycle must not get a fabricated length");
  assert.equal(cycles[1].cycle_length, 30);
});

test("a new period closes the previous cycle with the real gap", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  await createCycle(day("2026-02-02"));
  const cycles = await getAllCycles();
  assert.equal(cycles.length, 3);
  assert.equal(cycles[0].cycle_length, null);
  assert.equal(cycles[1].cycle_length, 32);
  assert.equal(cycles[2].cycle_length, 28);
});

test("prediction feedback scores the prediction the user saw, not a re-run", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  // What the user saw before the next period: one completed 28-day cycle → Jan 29.
  const shown = await getCyclePredictions("standard");
  assert.equal(shown.mean, 28);
  await createCycle(day("2026-02-02"));
  const feedback = await queryAll<{ error_days: number }>(`SELECT error_days FROM prediction_feedback;`);
  assert.equal(feedback.length, 1);
  assert.equal(feedback[0].error_days, 4, "period came 4 days after the shown prediction");
});

test("retraining after a write uses the saved mode", async () => {
  await saveAppSetting("current_mode", "pcos");
  await seedInitialCycleFromOnboarding("2026-01-01", 35);
  const row = await queryFirst<{ current_mode: string }>(
    `SELECT current_mode FROM cycle_predictions ORDER BY generated_at DESC LIMIT 1;`,
  );
  assert.equal(row?.current_mode, "pcos");
});

test("deleting cycles keeps lengths consistent", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const middle = await createCycle(day("2026-01-29"));
  await createCycle(day("2026-02-26"));
  await deleteCycle(middle);
  let cycles = await getAllCycles();
  assert.deepEqual(cycles.map((c) => c.cycle_length), [null, 56, 28]);

  // Deleting the latest cycle reopens the one before it.
  await deleteCycle(cycles[0].id);
  cycles = await getAllCycles();
  assert.deepEqual(cycles.map((c) => c.cycle_length), [null, 28]);
});

test("editing a start date recomputes neighbouring lengths", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const latest = await createCycle(day("2026-01-29"));
  await updateCycle(latest, { start_date: day("2026-02-01") });
  const cycles = await getAllCycles();
  assert.deepEqual(cycles.map((c) => c.cycle_length), [null, 31, 28]);
});

test("closing a period records its length in calendar days", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const current = (await getAllCycles())[0];
  const length = await closeCycle(current.id, "2026-01-05T08:00:00.000Z");
  assert.equal(length, 5);
});

test("unanswered scores are stored as NULL, not invented defaults", async () => {
  const [cycle] = await (async () => { await seedInitialCycleFromOnboarding("2026-01-01", 28); return getAllCycles(); })();
  await createSymptomEntry({ cycle_id: cycle.id, logged_date: day("2026-01-03"), pain_score: 4 });
  const [entry] = await getCycleEntries(cycle.id);
  assert.equal(entry.pain_score, 4);
  assert.equal(entry.stress_score, null);
  assert.equal(entry.sleep_hours, null);
  assert.equal(entry.mood_score, null);
});

test("ending a flare updates the flare entry and encrypts the reflection", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const cycle = (await getAllCycles())[0];
  const flareDay = day("2026-01-10");
  await createSymptomEntry({ cycle_id: cycle.id, logged_date: flareDay, flare_start: flareDay, pain_score: 7 });
  await saveFlareEnd(cycle.id, flareDay, day("2026-01-12"), "heat pad helped", 3);
  const entries = await getCycleEntries(cycle.id);
  const flareEntry = entries.find((e) => e.flare_start === flareDay);
  assert.equal(flareEntry?.flare_end, day("2026-01-12"));
  assert.ok(flareEntry?.flare_reflection_encrypted?.startsWith("enc:v1:"));
  assert.equal(await decryptField(flareEntry!.flare_reflection_encrypted!), "heat pad helped");
});

test("insights find a real correlation and ignore unlogged values", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const cycle = (await getAllCycles())[0];
  for (let i = 0; i < 30; i++) {
    const stress = (i % 5) + 1;
    await createSymptomEntry({
      cycle_id: cycle.id,
      logged_date: addDaysISO(day("2026-01-01"), i),
      stress_score: stress,
      pain_score: stress * 2,
      // Sleep only logged on a few days: must not be treated as 0 hours elsewhere.
      sleep_hours: i < 5 ? 7 : undefined,
    });
  }
  const insights = await generateInsights("standard");
  const titles = insights.map((i) => i.title);
  assert.ok(titles.includes("Stress & Pain"), `expected Stress & Pain in ${JSON.stringify(titles)}`);
  assert.ok(!titles.some((t) => t.startsWith("Sleep")), "sleep logged on <20 days must not produce an insight");
});

test("pure noise produces no insights", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const cycle = (await getAllCycles())[0];
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let i = 0; i < 40; i++) {
    await createSymptomEntry({
      cycle_id: cycle.id,
      logged_date: addDaysISO(day("2026-01-01"), i),
      stress_score: 1 + Math.floor(rnd() * 5),
      pain_score: Math.floor(rnd() * 11),
      mood_score: 1 + Math.floor(rnd() * 5),
      sleep_hours: 5 + Math.floor(rnd() * 5),
      energy_score: Math.floor(rnd() * 11),
    });
  }
  const insights = await generateInsights("standard");
  assert.deepEqual(insights.filter((i) => i.correlation !== undefined), []);
});

test("migration 4 repairs a fabricated in-progress cycle length", async () => {
  await execSql(`INSERT INTO cycles (id, start_date, cycle_length, is_confirmed) VALUES ('a', ?, 28, 1);`, [day("2026-01-01")]);
  await execSql(`INSERT INTO cycles (id, start_date, cycle_length, is_confirmed) VALUES ('b', ?, 28, 1);`, [day("2026-01-31")]);
  await execSql(`DELETE FROM schema_migrations WHERE id = 4;`);
  await initDb();
  const cycles = await getAllCycles();
  assert.deepEqual(cycles.map((c) => c.cycle_length), [null, 30]);
});

test("export → restore round-trips the data", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const cycle = (await getAllCycles())[0];
  await createSymptomEntry({ cycle_id: cycle.id, logged_date: day("2026-01-02"), pain_score: 3, nausea: true });
  const snapshot = JSON.parse(JSON.stringify(await exportLocalDataSnapshot()));
  await wipeLocalDatabase();
  assert.equal((await getAllCycles()).length, 0);
  await restoreLocalDataSnapshot(snapshot);
  const restored = await getCycleEntries(cycle.id);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].pain_score, 3);
  assert.equal(restored[0].nausea, 1);
});

test("field encryption round-trips, uses fresh IVs and rejects tampering", async () => {
  const text = "Ibuprofen 400mg — ü 日本 🌸 " + "x".repeat(70000);
  const sealed = await encryptField(text);
  assert.ok(sealed.startsWith("enc:v1:"));
  assert.ok(!sealed.includes("Ibuprofen"));
  assert.equal(await decryptField(sealed), text);
  assert.notEqual(await encryptField("a"), await encryptField("a"));
  assert.equal(await decryptField("plain legacy note"), "plain legacy note");
  const tampered = sealed.slice(0, -4) + (sealed.endsWith("AAAA") ? "BBBB" : "AAAA");
  await assert.rejects(decryptField(tampered), FieldDecryptionError);
});

test("values written by the old WebCrypto code still decrypt", async () => {
  const raw = await getOrCreateDbKey();
  assert.match(raw, /^[A-Za-z0-9_-]{32}$/);
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(raw), "AES-GCM", false, ["encrypt"]);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode("legacy web")));
  const combined = new Uint8Array(12 + ct.length);
  combined.set(iv);
  combined.set(ct, 12);
  assert.equal(await decryptField(Buffer.from(combined).toString("base64")), "legacy web");
  const [a, b] = await Promise.all([getOrCreateDbKey(), getOrCreateDbKey()]);
  assert.equal(a, b);
});

test("persisted app state migrates legacy blobs and is stored encrypted", async () => {
  __asyncStorage.set("app", 'cycleiq:v1:{"state":{"userName":"A"}}');
  assert.equal(await encryptedPersistStorage.getItem("app"), '{"state":{"userName":"A"}}');
  await encryptedPersistStorage.setItem("app", '{"state":{"userName":"B"}}');
  const stored = __asyncStorage.get("app") ?? "";
  assert.ok(stored.startsWith("cycleiq:v2:enc:v1:"));
  assert.ok(!stored.includes("userName"));
  assert.equal(await encryptedPersistStorage.getItem("app"), '{"state":{"userName":"B"}}');
});

test("tone: chill and classic wording, shared copy", async () => {
  useAppStore.setState({ tone: "chill" });
  assert.equal(currentTx()("hey 👋", "Hello"), "hey 👋");
  assert.equal(getCopy("chill").options.flow.find((o) => typeof o !== "string" && o.value === "Very Heavy") !== undefined, true);
  useAppStore.setState({ tone: "classic" });
  assert.equal(currentTx()("hey 👋", "Hello"), "Hello");
  // Stored values never change with tone — only labels do.
  const classicFlow = getCopy("classic").options.flow.map((o) => (typeof o === "string" ? o : o.value));
  const chillFlow = getCopy("chill").options.flow.map((o) => (typeof o === "string" ? o : o.value));
  assert.deepEqual(classicFlow, chillFlow);
  useAppStore.setState({ tone: "chill" });
});

test("notifications: classic wording by id, discreet hides health details", async () => {
  useAppStore.setState({ tone: "classic", discreetNotifications: false });
  assert.deepEqual(
    resolveNotificationContent("period-reminder", ["period incoming 🩸", "chill body"]),
    ["Period expected soon", "Your next period is predicted in about 2 days."],
  );
  useAppStore.setState({ tone: "chill" });
  assert.deepEqual(resolveNotificationContent("period-reminder", ["period incoming 🩸", "chill body"]), ["period incoming 🩸", "chill body"]);
  useAppStore.setState({ discreetNotifications: true });
  for (const tone of ["chill", "classic"] as const) {
    useAppStore.setState({ tone });
    const [title, body] = resolveNotificationContent("pcos-d90", ["time for a doctor chat 💬", "90 days without a period"]);
    assert.equal(title, "CycleIQ");
    assert.ok(!/period|PCOS|pain|flare|ovulat|blood/i.test(`${title} ${body}`), `discreet text leaked details: ${body}`);
  }
  useAppStore.setState({ tone: "chill", discreetNotifications: false });
});

test("insights: classic descriptions and numeric flare onset day", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const cycle = (await getAllCycles())[0];
  for (let i = 0; i < 30; i++) {
    const stress = (i % 5) + 1;
    await createSymptomEntry({
      cycle_id: cycle.id,
      logged_date: addDaysISO(day("2026-01-01"), i),
      stress_score: stress,
      pain_score: stress * 2,
      flare_start: i % 6 === 0 ? addDaysISO(day("2026-01-01"), i) : undefined,
    });
  }
  const classic = await generateInsights("endo", "classic");
  const stressFlare = classic.find((i) => i.title === "Stress & Flare Severity");
  assert.equal(stressFlare?.description, "Higher stress tends to coincide with more severe flare pain.");
  const onset = classic.find((i) => i.title === "Flare Onset Pattern");
  assert.equal(typeof onset?.onsetDay, "number", "flare warnings rely on a numeric onset day, not parsing text");
});

test("prediction saves are de-duplicated when nothing changed", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const count = async () => (await queryFirst<{ n: number }>(`SELECT count(*) AS n FROM cycle_predictions;`))?.n ?? 0;
  await getCyclePredictions("standard");
  const before = await count();
  await getCyclePredictions("standard");
  await getCyclePredictions("standard");
  assert.equal(await count(), before, "re-reading an unchanged prediction must not add audit rows");
  await createCycle(day("2026-01-29"));
  assert.ok((await count()) > before, "a real change is recorded");
});

test("period start → prediction re-anchors on the new period", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const beforeStart = (await getCyclePredictions("standard")).predictedStartISO!;
  await createCycle(day("2026-02-02"));
  const after = await getCyclePredictions("standard");
  assert.notEqual(after.predictedStartISO, beforeStart);
  // Two completed cycles now (28 and 32 days) → next period ~4–5 weeks after Feb 2.
  const gap = Math.round((new Date(after.predictedStartISO!).getTime() - new Date(day("2026-02-02")).getTime()) / DAY_MS);
  assert.ok(gap >= 28 && gap <= 32, `predicted ${gap} days after the new start`);
});

test("symptom logs → correlations → stored insights (no duplicates on re-run)", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const cycle = (await getAllCycles())[0];
  for (let i = 0; i < 30; i++) {
    const stress = (i % 5) + 1;
    await createSymptomEntry({ cycle_id: cycle.id, logged_date: addDaysISO(day("2026-01-01"), i), stress_score: stress, pain_score: stress * 2 });
  }
  const first = await generateInsights("standard");
  await persistAndRetireInsights(first);
  await persistAndRetireInsights(await generateInsights("standard"));
  const rows = await queryAll<{ title: string; n: number }>(`SELECT title, n FROM user_correlations;`);
  assert.ok(rows.some((r) => r.title === "Stress & Pain" && r.n === 30));
  assert.equal(new Set(rows.map((r) => r.title)).size, rows.length, "insights are upserted, not duplicated");
});

test("performance: retraining on 5 years of cycles stays under 2 s", async () => {
  await seedInitialCycleFromOnboarding("2021-01-01", 28);
  let start = new Date(day("2021-01-01")).getTime();
  for (let i = 0; i < 60; i++) {
    start += (26 + (i % 6)) * DAY_MS;
    await execSql(`INSERT INTO cycles (id, start_date, is_confirmed) VALUES (?, ?, 1);`, [`perf-${i}`, new Date(start).toISOString()]);
  }
  await recomputeCycleLengths(await ensureDb());
  const t0 = performance.now();
  await getCyclePredictions("pcos");
  const elapsed = performance.now() - t0;
  console.log(`      retrain (60 cycles): ${elapsed.toFixed(0)} ms (budget 2000)`);
  assert.ok(elapsed < 2000, `retrain took ${elapsed.toFixed(0)} ms`);
});

test("performance: correlations over 90 days of logs stay under 3 s", async () => {
  await seedInitialCycleFromOnboarding("2026-01-01", 28);
  const cycle = (await getAllCycles())[0];
  for (let i = 0; i < 90; i++) {
    await createSymptomEntry({
      cycle_id: cycle.id,
      logged_date: addDaysISO(day("2026-01-01"), i),
      stress_score: (i % 5) + 1, pain_score: i % 11, mood_score: (i % 5) + 1, energy_score: (i * 3) % 11,
      brain_fog_score: (i * 7) % 11, sleep_hours: 5 + (i % 4), exercise_duration: (i % 3) * 15, bloating: ["None", "Mild", "Moderate", "Severe"][i % 4],
      extended_symptoms: { pcos: { acne: { severity: i % 4, locations: [] }, hair_thinning: "", hirsutism: false, weight: { dir: null, note: "" }, cravings: { int: i % 4, types: [] }, pelvic_pressure: null, sleep_disruption: [], anxiety_spike: i % 7 === 0 } },
    });
  }
  const t0 = performance.now();
  await generateInsights("pcos");
  const elapsed = performance.now() - t0;
  console.log(`      insights (90 days): ${elapsed.toFixed(0)} ms (budget 3000)`);
  assert.ok(elapsed < 3000, `insights took ${elapsed.toFixed(0)} ms`);
});

(async () => {
  await initDb();
  let failed = 0;
  for (const [name, fn] of tests) {
    await wipeLocalDatabase();
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (error) {
      failed++;
      console.error(`  ✗ ${name}\n`, error);
    }
  }
  if (failed > 0) {
    console.error(`${failed} database test(s) failed.`);
    process.exit(1);
  }
  console.log("All database tests passed.");
})();
