// Reading the sheet in English or Spanish, priority floors, follow-ups, dedupe.
import { describe, expect, test } from "vitest";
import { src, check, ticketTable, AGENTS, NOW } from "./helpers.js";

describe("headers in either language", () => {
  test("English and Spanish headers map to the same columns", () => {
    const en = src.mapColumns(ticketTable([], "en")[0], src.TICKET_COLUMNS, src.EXTRA_COLUMN_ALIASES, [], "en");
    const es = src.mapColumns(ticketTable([], "es")[0], src.TICKET_COLUMNS, src.EXTRA_COLUMN_ALIASES, [], "es");
    expect(es).toEqual(en);
  });

  test("headers match without accents or case: 'CATEGORIA', 'ultima alerta'", () => {
    const header = ["id del ticket", "CREADO", "Asunto", "CATEGORIA", "prioridad", "estado", "asignado a", "ultima alerta"];
    const map = src.mapColumns(header, src.TICKET_COLUMNS, src.EXTRA_COLUMN_ALIASES, src.REQUIRED_TICKET_COLUMNS, "es");
    expect(map.category).toBe(3);
    expect(map.last_alerted).toBe(7);
  });

  test("missing columns: a clear message in the sheet's language", () => {
    const header = ["Ticket ID", "Subject"];
    expect(() => src.checkTickets([header], AGENTS, NOW, "en"))
      .toThrow("Missing column(s): Created, Category, Priority, Status, Assignee.");
    expect(() => src.checkTickets([["ID del ticket", "Asunto"]], AGENTS, NOW, "es"))
      .toThrow("Faltan columnas: Creado, Categoría, Prioridad, Estado, Asignado a.");
  });

  test("sheetLanguage reads the header row", () => {
    expect(src.sheetLanguage(ticketTable([], "es")[0])).toBe("es");
    expect(src.sheetLanguage(ticketTable([], "en")[0])).toBe("en");
  });
});

describe("priority floor: can't be set below the category minimum", () => {
  test.each([
    ["en", "Card lost or stolen", "Low", "urgent"],
    ["es", "Tarjeta perdida o robada", "Baja", "urgent"],
    ["en", "Charge dispute", "Normal", "high"],
    ["es", "Disputa de cargo", "Media", "high"],
    ["en", "Account access", "Low", "high"],
    ["es", "Verificación de identidad", "Baja", "high"],
    ["es", "Transferencia fallida o pendiente", "Media", "high"],
  ])("%s: %s typed as %s becomes %s", (lang, category, priority, expected) => {
    const [tk] = check([{ category, priority }], lang);
    expect(tk.priority).toBe(expected);
    expect(tk.raisedFrom).not.toBe("");
  });

  test("raising above the floor is kept", () => {
    const [tk] = check([{ category: "Fees", priority: "Urgent" }]);
    expect(tk.priority).toBe("urgent");
    expect(tk.raisedFrom).toBe("");
  });

  test("empty or unknown priority uses the category default", () => {
    const [a, b, c] = check([
      { category: "card_lost_stolen", priority: "" },
      { category: "Tax forms", priority: "asap!!" },
      { category: "something new", priority: "" },
    ]);
    expect([a.priority, b.priority, c.priority]).toEqual(["urgent", "normal", "normal"]);
    expect(a.raisedFrom).toBe(""); // nothing was typed, so nothing was "raised"
  });

  test("the lost card marked Low is on the 24/7 clock", () => {
    // Created Friday 17:30: as urgent it is due at 18:30, not on Monday.
    const [tk] = check([{ category: "Card lost or stolen", priority: "Low", created_at: "2026-10-23 17:30" }],
      "en", "2026-10-23 18:40");
    expect(tk.slaDue).toBe("2026-10-23 18:30");
    expect(tk.sla).toBe("breached");
  });

  test("the written-back Priority column shows the floor, in the sheet's language", () => {
    const table = ticketTable([{ category: "Tarjeta perdida o robada", priority: "Baja" }], "es");
    const tickets = src.checkTickets(table, AGENTS, NOW, "es");
    expect(src.columnUpdates(tickets, table, NOW, "es", []).priority).toEqual(["Urgente"]);
  });
});

describe("follow-ups", () => {
  test("waiting on customer over 2 business days is stale", () => {
    const [stale, fresh] = check([
      { status: "Waiting on customer", first_response_at: "2026-10-20 09:00", last_update_at: "2026-10-20 09:00" },
      { status: "Waiting on customer", first_response_at: "2026-10-21 09:00", last_update_at: "2026-10-21 14:00" },
    ]);
    expect(stale.stale).toBe(true);
    expect(fresh.stale).toBe(false);
  });

  test("a weekend does not make a follow-up stale", () => {
    // Friday 10:00 to Tuesday 10:00 is exactly 2 business days: not over.
    const [tk] = check([{ status: "Esperando al cliente", first_response_at: "2026-10-23 10:00",
      last_update_at: "2026-10-23 10:00" }], "es", "2026-10-27 10:00");
    expect(tk.stale).toBe(false);
  });

  test("only Waiting on customer can be stale", () => {
    const [tk] = check([{ status: "Open", first_response_at: "2026-10-12 09:00", last_update_at: "2026-10-12 09:00" }]);
    expect(tk.stale).toBe(false);
  });
});

describe("who gets alerted today", () => {
  test("breached and alerted earlier today: skipped (no same-day repeats)", () => {
    const [tk] = check([{ created_at: "2026-10-21 09:00", last_alerted: "2026-10-23 07:30" }]);
    expect(tk.sla).toBe("breached");
    expect(tk.alert).toBe(false);
  });

  test("alerted yesterday: alerted again today", () => {
    const [tk] = check([{ created_at: "2026-10-21 09:00", last_alerted: "2026-10-22 07:30" }]);
    expect(tk.alert).toBe(true);
  });

  test("unassigned urgent bypasses dedupe, in English and Spanish", () => {
    const tickets = [
      ...check([{ category: "Card lost or stolen", assignee: "", last_alerted: "2026-10-23 07:30" }], "en"),
      ...check([{ category: "Tarjeta perdida o robada", assignee: "", last_alerted: "2026-10-23 07:30" }], "es"),
    ];
    for (const tk of tickets) {
      expect(tk.unassignedUrgent).toBe(true);
      expect(tk.alert).toBe(true);
    }
  });

  test("an assignee that is not on the Agents tab counts as unassigned", () => {
    const [tk] = check([{ category: "card_lost_stolen", assignee: "cliente.demo42@example.com" }]);
    expect(tk.owner).toBeNull();
    expect(tk.unassignedUrgent).toBe(true);
  });

  test("resolved tickets are never alerted", () => {
    const [tk] = check([{ category: "card_lost_stolen", assignee: "", status: "Resolved", last_update_at: "2026-10-23 08:30" }]);
    expect(tk.alert).toBe(false);
    expect(tk.sla).toBe("met"); // resolving counts as the first response
  });

  test("Last alerted is stamped only on the rows passed in (rows in sent digests)", () => {
    const table = ticketTable([
      { ticket_id: "T-1", created_at: "2026-10-21 09:00" },
      { ticket_id: "T-2", created_at: "2026-10-23 09:55" },
      { ticket_id: "T-3", created_at: "2026-10-21 09:00", last_alerted: "2026-10-22 07:30" },
    ]);
    const tickets = src.checkTickets(table, AGENTS, NOW, "en");
    expect(tickets.map((tk) => tk.alert)).toEqual([true, false, true]);
    // T-3 is alerted but was not in a sent digest: it keeps its old value.
    expect(src.columnUpdates(tickets, table, NOW, "en", [0]).last_alerted).toEqual([NOW, "", "2026-10-22 07:30"]);
    expect(src.columnUpdates(tickets, table, NOW, "en", []).last_alerted).toEqual(["", "", "2026-10-22 07:30"]);
  });
});

describe("rows and agents", () => {
  test("blank rows are kept in place but ignored", () => {
    const table = ticketTable([{ ticket_id: "T-1" }]);
    table.push(src.TICKET_COLUMNS.map(() => ""));
    const tickets = src.checkTickets(table, AGENTS, NOW, "en");
    expect(tickets.length).toBe(2);
    expect(tickets[1].blank).toBe(true);
    expect(src.columnUpdates(tickets, table, NOW, "en", [0]).sla_status).toEqual(["OK", ""]);
  });

  test("agents without a valid email are skipped; roles and languages in ES", () => {
    const agents = src.readAgents([
      ["Nombre", "Correo electrónico", "Idioma", "Rol"],
      ["Ana Demo", "ana.demo@example.com", "Español", "Líder"],
      ["Sin Correo", "", "Español", "Agente"],
      ["Bad Email", "not-an-email", "Inglés", "Agente"],
    ], "es");
    expect(agents).toEqual([{ name: "Ana Demo", email: "ana.demo@example.com", language: "es", role: "lead" }]);
  });

  test("findAgent matches by name or email, ignoring accents and case", () => {
    expect(src.findAgent("lucia demo", AGENTS).email).toBe("lucia.demo@example.com");
    expect(src.findAgent("SAM.DEMO@EXAMPLE.COM", AGENTS).name).toBe("Sam Demo");
    expect(src.findAgent("", AGENTS)).toBeNull();
  });

  test("empty Language is filled from the subject", () => {
    const table = ticketTable([
      { subject: "No puedo entrar a mi cuenta", language: "" },
      { subject: "My card was stolen", language: "Spanish" }, // typed value wins
    ]);
    const tickets = src.checkTickets(table, AGENTS, NOW, "en");
    expect(tickets.map((tk) => tk.language)).toEqual(["es", "es"]);
    expect(src.columnUpdates(tickets, table, NOW, "en", []).language).toEqual(["Spanish", "Spanish"]);
  });

  test("applyColumnUpdates adds missing columns at the end", () => {
    const table = [["Ticket ID", "Created", "Subject", "Category", "Priority", "Status", "Assignee"],
      ["T-9", "2026-10-23 08:00", "Hi", "Fees", "", "Open", "Sam Demo"]];
    const tickets = src.checkTickets(table, AGENTS, NOW, "en");
    const out = src.applyColumnUpdates(table, src.columnUpdates(tickets, table, NOW, "en", []), "en");
    expect(out[0].slice(7)).toEqual(["Language", "SLA due", "SLA status", "Last alerted"]);
    expect(out[1].slice(7, 10)).toEqual(["English", "2026-10-23 16:00", "OK"]);
  });
});
