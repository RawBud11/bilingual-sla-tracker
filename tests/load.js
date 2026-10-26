// Load every src/*.js file into one shared scope, the way Google Apps Script
// does (no import, no require). Returns that scope: ctx.slaDue(...), etc.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SRC_DIR = path.join(ROOT, "src");

export function srcFiles() {
  return fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".js")).sort();
}

export function loadSrc() {
  const ctx = vm.createContext({});
  for (const file of srcFiles()) {
    const code = fs.readFileSync(path.join(SRC_DIR, file), "utf-8");
    vm.runInContext(code, ctx, { filename: file });
  }
  return ctx;
}
