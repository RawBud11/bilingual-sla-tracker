// Daily digests: who gets one, what is in it, language, HTML escaping.
// Guardrail tests (sensitive data, recipients, "never ask for") are in guardrails.test.js.
import { describe, expect, test } from "vitest";
import { src, check, AGENTS, NOW } from "./helpers.js";

const LUCIA = AGENTS[0]; // lead, Spanish
const MATEO = AGENTS[1]; // agent, Spanish
const SAM = AGENTS[2];   // agent, English

// A breached ticket for Sam, an unassigned urgent one, an at-risk one for Mateo.
function sampleTickets() {
  return check([
    { ticket_id: "T-1", created_at: "2026-10-21 09:00", assignee: "Sam Demo", subject: "Balance doesn't update" },
    { ticket_id: "T-2", created_at: "2026-10-23 09:30", category: "Card lost or stolen", assignee: "", subject: "Perdí mi tarjeta" },
    { ticket_id: "T-3", created_at: "2026-10-22 17:00", category: "Charge dispute", assignee: "Mateo Demo", subject: "No reconozco un cobro" },
    { ticket_id: "T-4", created_at: "2026-10-23 09:50", assignee: "Sam Demo", subject: "Fine, still OK" },
  ]);
}

describe("who gets a digest", () => {
  test("one per agent with something to report, one per lead", () => {
    const digests = src.buildDigests(sampleTickets(), AGENTS, NOW);
    expect(digests.map((d) => [d.kind, d.to])).toEqual([
      ["lead", "lucia.demo@example.com"],
      ["agent", "mateo.demo@example.com"],
      ["agent", "sam.demo@example.com"],
    ]);
  });

  test("nothing to report: no digest at all", () => {
    const quiet = check([{ created_at: "2026-10-23 09:50" }]);
    expect(src.buildDigests(quiet, AGENTS, NOW)).toEqual([]);
    expect(src.buildDigest("lead", LUCIA, quiet, NOW)).toBeNull();
  });

  test("an agent only sees their own tickets; OK tickets are left out", () => {
    const d = src.buildDigest("agent", SAM, sampleTickets(), NOW);
    expect(d.ticketIds).toEqual(["T-1"]);
  });

  test("lead digest: unassigned urgent first, then breached, then at risk", () => {
    const d = src.buildDigest("lead", LUCIA, sampleTickets(), NOW, "en");
    expect(d.sections.map((s) => s.title)).toEqual([
      "Unassigned urgent: assign now",
      "Breached: past the first-response target",
      "At risk: 75% of the response time used",
    ]);
    expect(d.ticketIds).toEqual(["T-2", "T-1", "T-3"]);
  });

  test("unassigned urgent appears only in the lead digest", () => {
    for (const agent of [MATEO, SAM]) {
      const d = src.buildDigest("agent", agent, sampleTickets(), NOW);
      expect(d.ticketIds).not.toContain("T-2");
    }
  });

  test("stale follow-ups get their own section", () => {
    const tickets = check([{ ticket_id: "T-8", created_at: "2026-10-19 08:00", status: "Waiting on customer", assignee: "Sam Demo",
      first_response_at: "2026-10-19 09:00", last_update_at: "2026-10-19 09:00" }]);
    const d = src.buildDigest("agent", SAM, tickets, NOW);
    expect(d.sections[0].title).toBe("Waiting on customer for over 2 business days: follow up or close");
  });
});

describe("language", () => {
  test("each person gets their own language: Mateo in Spanish, Sam in English", () => {
    const [lead, mateo, sam] = src.buildDigests(sampleTickets(), AGENTS, NOW);
    expect(lead.language).toBe("es");
    expect(lead.text).toContain("Hola, Lucía Demo:");
    expect(lead.text).toContain("Urgentes sin asignar: asígnalos ya");
    expect(mateo.subject).toBe("Soporte Puentara: 1 ticket necesita atención (2026-10-23)");
    expect(mateo.text).toContain("Tienes 1 ticket que necesita atención hoy.");
    expect(mateo.text).toContain("Disputa de cargo");
    expect(sam.subject).toBe("Puentara support: 1 ticket needs attention (2026-10-23)");
    expect(sam.text).toContain("You have 1 ticket that needs attention today.");
  });

  test("Spanish digest has no English labels, English digest no Spanish ones", () => {
    const es = src.buildDigest("lead", LUCIA, sampleTickets(), NOW, "es").text;
    const en = src.buildDigest("lead", LUCIA, sampleTickets(), NOW, "en").text;
    for (const word of ["Breached", "At risk", "Reminders", "unassigned", "due "]) expect(es).not.toContain(word);
    for (const word of ["Vencidos", "En riesgo", "Recordatorios", "sin asignar", "vence "]) expect(en).not.toContain(word);
  });

  test("plural forms: 3 tickets", () => {
    const d = src.buildDigest("lead", LUCIA, sampleTickets(), NOW, "es");
    expect(d.subject).toBe("Soporte Puentara: 3 tickets necesitan atención (2026-10-23)");
  });

  test("raised priority is shown: 'Urgente (subió desde Baja)'", () => {
    const tickets = check([{ category: "Tarjeta perdida o robada", priority: "Baja", created_at: "2026-10-23 08:15" }], "es");
    const d = src.buildDigest("agent", SAM, tickets, NOW, "es");
    expect(d.text).toContain("Urgente (subió desde Baja)");
  });
});

describe("reminders", () => {
  test("only for the categories in the digest", () => {
    const d = src.buildDigest("agent", MATEO, sampleTickets(), NOW, "en");
    expect(d.reminders).toEqual([
      "Charge dispute: collect the facts, explain next steps and timeline. Don't promise an outcome.",
    ]);
    const sam = src.buildDigest("agent", SAM, sampleTickets(), NOW, "en");
    expect(sam.reminders).toEqual([]);
    expect(sam.text).not.toContain("Reminders");
  });

  test("lost card and account access share one urgent line", () => {
    const tickets = check([
      { category: "card_lost_stolen", created_at: "2026-10-23 08:00" },
      { category: "account_access", created_at: "2026-10-22 08:00" },
    ]);
    const d = src.buildDigest("agent", SAM, tickets, NOW, "es");
    expect(d.reminders).toEqual([
      "Tarjeta perdida o robada, acceso a la cuenta: es urgente y lo atiende una persona. Usa el canal seguro.",
    ]);
  });
});

describe("HTML", () => {
  test("every cell value is escaped", () => {
    const tickets = check([{ created_at: "2026-10-21 09:00", subject: "<script>alert('x')</script> & \"quotes\"",
      customer_id: "<b>C-1</b>" }]);
    const html = src.buildDigest("agent", SAM, tickets, NOW).html;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>C-1</b>");
    expect(html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quotes&quot;");
  });

  test("Spanish HTML declares UTF-8 and keeps accents", () => {
    const html = src.buildDigest("lead", LUCIA, sampleTickets(), NOW, "es").html;
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<html lang="es">');
    expect(html).toContain("Perdí mi tarjeta");
  });
});
