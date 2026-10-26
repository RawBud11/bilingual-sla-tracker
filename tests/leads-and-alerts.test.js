// No lead on the Agents tab, Last alerted only for sent
// digests, unreadable dates reach the lead. English and Spanish.
import { describe, expect, test } from "vitest";
import { src, check, AGENTS, NOW } from "./helpers.js";

// Agents tab with only Name and Email: Role is blank, so everyone is an agent.
const NO_LEAD_EN = src.readAgents([
  ["Name", "Email address"],
  ["Sam Demo", "sam.demo@example.com"],
  ["Mateo Demo", "mateo.demo@example.com"],
], "en");
const NO_LEAD_ES = src.readAgents([
  ["Nombre", "Correo electrónico", "Rol"],
  ["Sam Demo", "sam.demo@example.com", ""],
  ["Mateo Demo", "mateo.demo@example.com", "Agente"],
], "es");

describe("no lead on the Agents tab", () => {
  test("EN: unassigned breached lost card gives a clear error, never 'Nothing to report'", () => {
    const tickets = src.checkTickets(
      [src.TICKET_COLUMNS.map((k) => src.t("en", "header." + k)),
        src.TICKET_COLUMNS.map((k) => ({ ticket_id: "T-1", created_at: "2026-10-23 07:00", subject: "I lost my card",
          category: "Card lost or stolen", status: "New" })[k] || "")],
      NO_LEAD_EN, NOW, "en");
    expect(src.buildDigests(tickets, NO_LEAD_EN, NOW)).toEqual([]); // why the check is needed
    expect(src.missingLeadError(tickets, NO_LEAD_EN, "en")).toBe(
      "No one on the Agents tab has Role = Lead, so 1 ticket(s) without an owner or with unreadable dates " +
      "(1 urgent) can't be alerted. Set Role to Lead for at least one person.");
  });

  test("ES: the same check in Spanish, with tú", () => {
    const tickets = check([
      { category: "Tarjeta perdida o robada", assignee: "", status: "Nuevo" },
      { category: "Comisiones", assignee: "alguien.que.no.esta@example.com", created_at: "2026-10-21 09:00" },
    ], "es");
    expect(src.missingLeadError(tickets, NO_LEAD_ES, "es")).toBe(
      "Nadie en la pestaña Agentes tiene Rol = Líder, así que 2 ticket(s) sin responsable o con fechas ilegibles " +
      "(urgentes: 1) no se pueden avisar. Pon Rol = Líder a al menos una persona.");
  });

  test("with a lead, or when every alert has an owner, there is no error", () => {
    const unassigned = check([{ category: "card_lost_stolen", assignee: "" }]);
    expect(src.missingLeadError(unassigned, AGENTS, "en")).toBe("");
    const owned = check([{ created_at: "2026-10-21 09:00", assignee: "Sam Demo" }]);
    expect(src.missingLeadError(owned, NO_LEAD_EN, "en")).toBe("");
    expect(src.buildDigests(owned, NO_LEAD_EN, NOW).map((d) => d.to)).toEqual(["sam.demo@example.com"]);
  });

  test("an unreadable date with no lead also blocks", () => {
    const tickets = check([{ created_at: "ayer", assignee: "Sam Demo" }], "es");
    expect(src.missingLeadError(tickets, NO_LEAD_ES, "es")).toContain("1 ticket(s)");
  });
});

describe("Last alerted only for tickets in sent digests", () => {
  test.each(["en", "es"])("%s: alertedRows lists the rows of every digest, once", (lang) => {
    const tickets = check([
      { ticket_id: "T-1", created_at: "2026-10-21 09:00", assignee: "Sam Demo" },  // Sam + lead
      { ticket_id: "T-2", created_at: "2026-10-23 09:55", assignee: "Sam Demo" },  // OK: in no digest
      { ticket_id: "T-3", category: "card_lost_stolen", assignee: "" },              // lead only
    ], lang);
    const digests = src.buildDigests(tickets, AGENTS, NOW);
    expect(src.alertedRows(digests).sort()).toEqual([0, 2]);
    // Only Sam's digest sent (say the lead's failed): only row 0 is stamped.
    const samOnly = digests.filter((d) => d.to === "sam.demo@example.com");
    const table = [src.TICKET_COLUMNS.map((k) => src.t(lang, "header." + k))].concat(tickets.map(() => src.TICKET_COLUMNS.map(() => "")));
    expect(src.columnUpdates(tickets, table, NOW, lang, src.alertedRows(samOnly)).last_alerted).toEqual([NOW, "", ""]);
  });
});

describe("open tickets with unreadable dates go to the lead", () => {
  test.each([
    ["en", "Check the dates: Created or First response can't be read", "Check dates"],
    ["es", "Revisa las fechas: no se puede leer Creado o Primera respuesta", "Revisa las fechas"],
  ])("%s", (lang, section, status) => {
    const tickets = check([
      { ticket_id: "T-9", created_at: lang === "en" ? "yesterday" : "ayer", assignee: "Sam Demo" },
      { ticket_id: "T-10", created_at: "", status: "Resolved", assignee: "Sam Demo" }, // resolved: ignored
    ], lang);
    expect(tickets[0].sla).toBe("bad_date");
    const lead = src.buildDigest("lead", AGENTS[0], tickets, NOW, lang);
    expect(lead.sections.map((s) => s.title)).toEqual([section]);
    expect(lead.ticketIds).toEqual(["T-9"]);
    // Lead-only: the owner's own digest does not repeat it.
    expect(src.buildDigest("agent", AGENTS[2], tickets, NOW, lang)).toBeNull();
    expect(src.t(lang, "sla.bad_date")).toBe(status);
  });

  test("dedupe applies: already alerted today, not listed again", () => {
    const tickets = check([{ created_at: "not a date", last_alerted: "2026-10-23 07:30" }]);
    expect(src.buildDigest("lead", AGENTS[0], tickets, NOW, "en")).toBeNull();
  });
});

describe("Spanish output has no English 'tracker'", () => {
  test("footer and setup message", () => {
    for (const value of Object.values(src.STRINGS.es)) {
      expect(value.replace(/setupTracker/g, "")).not.toMatch(/tracker/i);
    }
    expect(src.t("es", "digest.footer")).toContain("la hoja de seguimiento de soporte de Puentara");
    expect(src.t("es", "done.setup", { tab: "Agentes" })).toBe("Hoja lista. Agrega a tu equipo en la pestaña \"Agentes\".");
  });
});
