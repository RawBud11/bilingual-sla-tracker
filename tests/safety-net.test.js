// Blank-category keyword safety net, duplicate agents, and digest order.
import { describe, expect, test } from "vitest";
import { src, check, AGENTS, AGENT_TABLE_EN, NOW } from "./helpers.js";

describe("blank or unknown category: guessed from the subject", () => {
  test.each([
    ["Me robaron la tarjeta", "card_lost_stolen", "urgent"],
    ["Perdí mi tarjeta en el aeropuerto", "card_lost_stolen", "urgent"],
    ["My card was stolen last night", "card_lost_stolen", "urgent"],
    ["Please block my card", "card_lost_stolen", "urgent"],
    ["I can't log in since yesterday", "account_access", "high"],
    ["Me hackearon la cuenta", "account_access", "high"],
    ["No puedo entrar a mi cuenta", "account_access", "high"],
    ["There is a fraudulent charge on my account", "charge_dispute", "high"],
    ["No reconozco un cobro de ayer", "charge_dispute", "high"],
  ])("%s -> %s, %s", (subject, category, priority) => {
    const [tk] = check([{ subject, category: "", priority: "" }]);
    expect(tk.category).toBe(category);
    expect(tk.categoryGuessed).toBe(true);
    expect(tk.priority).toBe(priority);
  });

  test("a priority typed too low is still raised to the guessed floor", () => {
    const [tk] = check([{ subject: "Lost my card", category: "", priority: "Low" }]);
    expect([tk.priority, tk.raisedFrom]).toEqual(["urgent", "low"]);
  });

  test("an unrecognized category label also gets the safety net", () => {
    const [tk] = check([{ subject: "Me robaron la tarjeta", category: "Tarjetas", priority: "" }]);
    expect(tk.category).toBe("card_lost_stolen");
  });

  test("a typed category always wins over the subject", () => {
    const [tk] = check([{ subject: "My card was stolen?", category: "General question", priority: "" }]);
    expect(tk.category).toBe("general_question");
    expect(tk.categoryGuessed).toBe(false);
  });

  test("ordinary subjects are not guessed", () => {
    const tickets = check([
      { subject: "My transfer is pending", category: "" },
      { subject: "How do I add a card to my wallet?", category: "" },
      { subject: "Lost my receipt", category: "" },
      { subject: "La app no carga", category: "" },
    ]);
    expect(tickets.map((tk) => tk.category)).toEqual(["", "", "", ""]);
    expect(tickets.every((tk) => tk.priority === "normal")).toBe(true);
  });

  test("an unassigned stolen card with no category reaches the lead as unassigned urgent", () => {
    const tickets = check([{ subject: "Me robaron la tarjeta", category: "", assignee: "", created_at: "2026-10-23 08:30" }]);
    expect(tickets[0].unassignedUrgent).toBe(true);
    const lead = AGENTS.find((a) => a.role === "lead");
    const d = src.buildDigest("lead", lead, tickets, NOW, "en");
    expect(d.text).toContain("Card lost or stolen (guessed from subject)");
    expect(d.text).toContain("Card lost or stolen, account access: urgent");
    const es = src.buildDigest("lead", lead, tickets, NOW, "es");
    expect(es.text).toContain("Tarjeta perdida o robada (según el asunto)");
  });
});

describe("Agents tab", () => {
  test("a repeated email gets one digest, not two", () => {
    const table = AGENT_TABLE_EN.concat([["Lucía again", "LUCIA.DEMO@example.com", "Spanish", "Lead"]]);
    const agents = src.readAgents(table, "en");
    expect(agents.length).toBe(AGENT_TABLE_EN.length - 1);
    const tickets = check([{ category: "card_lost_stolen", assignee: "" }]);
    expect(src.buildDigests(tickets, agents, NOW).map((d) => d.to)).toEqual(["lucia.demo@example.com"]);
  });
});

describe("digest order", () => {
  test("lead digests are built first, whatever the order on the Agents tab", () => {
    const agents = src.readAgents([
      ["Name", "Email address", "Language", "Role"],
      ["Sam Demo", "sam.demo@example.com", "English", "Agent"],
      ["Lucía Demo", "lucia.demo@example.com", "Spanish", "Lead"],
    ], "en");
    const tickets = check([{ category: "fees", created_at: "2026-10-21 09:00", assignee: "Sam Demo" }]);
    expect(src.buildDigests(tickets, agents, NOW).map((d) => d.kind)).toEqual(["lead", "agent"]);
  });

  test("tickets with unreadable dates come after the ones with a due time", () => {
    const sorted = src.sortForAttention([
      { id: "a", sla: "breached", slaDue: "" },
      { id: "b", sla: "breached", slaDue: "2026-10-23 09:00" },
    ]);
    expect(sorted.map((tk) => tk.id)).toEqual(["b", "a"]);
  });
});
