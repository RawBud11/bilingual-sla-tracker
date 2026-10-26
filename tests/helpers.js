// Small builders for test sheets, so each test only lists what it cares about.
import { loadSrc } from "./load.js";

export const src = loadSrc();
export const NOW = "2026-10-23 10:00"; // Friday

export const AGENT_TABLE_EN = [
  ["Name", "Email address", "Language", "Role"],
  ["Lucía Demo", "lucia.demo@example.com", "Spanish", "Lead"],
  ["Mateo Demo", "mateo.demo@example.com", "Spanish", "Agent"],
  ["Sam Demo", "sam.demo@example.com", "English", "Agent"],
];
export const AGENTS = src.readAgents(AGENT_TABLE_EN, "en");

// Build a Tickets table. `rows` are objects keyed by column id, for example
// { ticket_id: "T-1", category: "fees" }. Headers in `lang`.
export function ticketTable(rows, lang = "en") {
  const header = src.TICKET_COLUMNS.map((key) => src.t(lang, "header." + key));
  const defaults = {
    ticket_id: "T-1", created_at: "2026-10-23 08:00", customer_id: "C-1001",
    channel: "Email", language: "", subject: "My transfer is pending",
    category: "general_question", priority: "", status: "Open", assignee: "Sam Demo",
    first_response_at: "", last_update_at: "", sla_due: "", sla_status: "", last_alerted: "",
  };
  return [header].concat(rows.map((row) => {
    const full = { ...defaults, ...row };
    return src.TICKET_COLUMNS.map((key) => full[key]);
  }));
}

export function check(rows, lang = "en", now = NOW) {
  return src.checkTickets(ticketTable(rows, lang), AGENTS, now, lang);
}
