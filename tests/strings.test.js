// Every text exists in English and Spanish, and Spanish is really translated.
import { expect, test } from "vitest";
import { loadSrc } from "./load.js";

const s = loadSrc();
const en = s.STRINGS.en;
const es = s.STRINGS.es;

// Keys allowed to have the same text in both languages. None today: add a
// key here only when the word really is the same in Spanish.
const SAME_IN_BOTH = [];

test("same keys in English and Spanish", () => {
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
});

test("no Spanish value is a copy of the English one", () => {
  const copies = Object.keys(en).filter((key) => en[key] === es[key] && !SAME_IN_BOTH.includes(key));
  expect(copies).toEqual([]);
});

test("same placeholders in both languages", () => {
  const names = (text) => (text.match(/\{\w+\}/g) || []).sort();
  for (const key of Object.keys(en)) expect(names(es[key]), key).toEqual(names(en[key]));
});

test("every category, priority, status and SLA status has a label", () => {
  const ids = [
    ...s.CATEGORIES.map((id) => "category." + id), ...s.PRIORITIES.map((id) => "priority." + id),
    ...s.TICKET_STATUSES.map((id) => "status." + id), ...s.LANGUAGES.map((id) => "language." + id),
    ...s.TICKET_COLUMNS.map((id) => "header." + id), ...s.AGENT_COLUMNS.map((id) => "header." + id),
    ...["ok", "at_risk", "breached", "met", "missed", "bad_date"].map((id) => "sla." + id),
  ];
  for (const key of ids) {
    expect(en[key], key).toBeTruthy();
    expect(es[key], key).toBeTruthy();
  }
});

test("Spanish keeps its accents and uses tú", () => {
  expect(es["digest.intro_other"]).toBe("Tienes {count} tickets que necesitan atención hoy.");
  expect(es["digest.section.stale"]).toContain("responde o cierra");
  expect(es["category.identity_verification"]).toBe("Verificación de identidad");
  const all = Object.values(es).join(" ");
  expect(all).not.toMatch(/\busted\b/i); // tú register, never usted
});

test("t() fills placeholders and falls back to English", () => {
  expect(s.t("es", "console.digests", { count: 4, dir: "output/" }))
    .toBe("4 resúmenes guardados en output/ (SIMULACIÓN, no se envió ningún correo)");
  expect(s.t("pt", "menu.title")).toBe("Puentara Support");
  expect(s.t("en", "no.such.key")).toBe("no.such.key");
});

test("sheet messages use singular for 1 and plural otherwise", () => {
  expect(s.tCount("en", "done.sent", 1)).toBe("1 digest emailed.");
  expect(s.tCount("en", "done.sent", 4)).toBe("4 digests emailed.");
  expect(s.tCount("es", "done.sent", 1)).toBe("Se envió 1 resumen por correo.");
  expect(s.tCount("es", "done.sent", 4)).toBe("Se enviaron 4 resúmenes por correo.");
  expect(s.tCount("en", "done.check", 1)).toBe("SLAs checked: 1 ticket.");
  expect(s.tCount("es", "done.check", 11)).toBe("SLA revisados: 11 tickets.");
  expect(s.tCount("en", "done.preview", 1, { tab: "Digest preview" }))
    .toBe("DRY RUN: 1 digest written to the \"Digest preview\" tab. Nothing was emailed.");
  expect(s.tCount("es", "done.preview", 1, { tab: "Vista previa de resúmenes" }))
    .toBe("SIMULACIÓN: 1 resumen en la pestaña \"Vista previa de resúmenes\". No se envió ningún correo.");
});
