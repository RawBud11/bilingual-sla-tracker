// The 60-second demo runs offline and writes the documented files.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, expect, test } from "vitest";
import { ROOT } from "./load.js";

const tempDirs = [];
afterAll(() => tempDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

function runDemo(args) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "sla-demo-"));
  tempDirs.push(out);
  const stdout = execFileSync(process.execPath, ["scripts/demo.js", "--out", out, ...args],
    { cwd: ROOT, encoding: "utf-8" });
  return { stdout, out, files: fs.readdirSync(out).sort() };
}

test("English demo: DRY RUN line, counts, files", () => {
  const { stdout, out, files } = runDemo([]);
  expect(stdout).toContain("DRY RUN: nothing is emailed.");
  expect(stdout).toMatch(/4 digests written to .* \(DRY RUN, nothing emailed\)/);
  expect(stdout).toContain("Urgent (raised from Low)");
  expect(files).toEqual(expect.arrayContaining(["tracker_checked.csv", "digest_lead_en.txt", "digest_lead_es.txt",
    "digest_es.html", "weekly_summary.csv"]));
  const html = fs.readFileSync(path.join(out, "digest_es.html"), "utf-8");
  expect(html).toContain("[CARD NUMBER MASKED]");
  expect(html).not.toContain("0000 1234 5678 9012");
});

test("Spanish demo prints Spanish", () => {
  const { stdout } = runDemo(["--lang", "es"]);
  expect(stdout).toContain("SIMULACIÓN: no se envía ningún correo.");
  expect(stdout).toContain("Urgente (subió desde Baja)");
  expect(stdout).toContain("Resumen semanal (datos de muestra)");
  // The tracker's summary title has no label; the demo adds it to its numbers.
  expect(stdout).toContain("Resumen semanal, del 2026-10-16 10:00 al 2026-10-23 10:00 (datos de muestra)");
});

test("bad options give a one-line message, not a stack trace", () => {
  let error;
  try {
    execFileSync(process.execPath, ["scripts/demo.js", "--now", "tomorrow"], { cwd: ROOT, encoding: "utf-8", stdio: "pipe" });
  } catch (e) {
    error = e;
  }
  expect(error.status).toBe(1);
  expect(error.stderr.trim()).toBe('Error: --now must look like "2026-10-23 10:00", not "tomorrow".');
});
