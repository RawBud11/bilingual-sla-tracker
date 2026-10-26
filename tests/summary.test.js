// Weekly summary: per category, per language, total; counts only.
import { expect, test } from "vitest";
import { src, check, NOW } from "./helpers.js";

const tickets = check([
  // Opened this week, answered in time (fees, English)
  { category: "Fees", created_at: "2026-10-21 09:00", first_response_at: "2026-10-21 10:00", status: "Resolved", subject: "Why was I charged a fee?" },
  // Opened this week, answered late (fees, Spanish)
  { category: "Fees", created_at: "2026-10-19 09:00", first_response_at: "2026-10-20 12:00", status: "Waiting on customer",
    last_update_at: "2026-10-20 12:00", subject: "¿Por qué me cobraron una comisión?" },
  // Opened last week: not in "Opened", but still open now
  { category: "Tax forms", created_at: "2026-10-12 09:00", first_response_at: "2026-10-12 10:00", status: "Open", subject: "Where is my 1099 form?" },
]);

test("rows: 9 categories, 4 languages, total", () => {
  const table = src.weeklySummary(tickets, NOW, "en");
  expect(table.length).toBe(2 + 9 + 4 + 1);
  expect(table[0][0]).toBe("Weekly summary, 2026-10-16 10:00 to 2026-10-23 10:00");
  expect(table[1]).toEqual(["Group", "Opened", "First response met", "First response missed", "Open now", "Stale follow-ups"]);
});

test("counts per category, language and total", () => {
  const rows = Object.fromEntries(src.weeklySummary(tickets, NOW, "en").slice(2).map((r) => [r[0], r.slice(1)]));
  expect(rows["Fees"]).toEqual([2, 1, 1, 1, 1]);
  expect(rows["Tax forms"]).toEqual([0, 0, 0, 1, 0]);
  expect(rows["English"]).toEqual([1, 1, 0, 1, 0]);
  expect(rows["Spanish"]).toEqual([1, 0, 1, 1, 1]);
  expect(rows["Total"]).toEqual([2, 1, 1, 2, 1]);
});

test("Spanish headers and labels", () => {
  const table = src.weeklySummary(tickets, NOW, "es");
  expect(table[1][0]).toBe("Grupo");
  expect(table[0][0]).toBe("Resumen semanal, del 2026-10-16 10:00 al 2026-10-23 10:00");
  expect(table.map((r) => r[0])).toContain("Comisiones");
  expect(table.map((r) => r[0])).toContain("Español");
});

test("the tracker's title has no sample-data label (it runs on real sheets)", () => {
  for (const lang of ["en", "es"]) {
    expect(src.weeklySummary(tickets, NOW, lang)[0][0]).not.toMatch(/sample data|datos de muestra/);
  }
});
