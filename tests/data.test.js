// The sample data is reproducible and contains the cases the demo shows.
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { makeData } from "../scripts/make-tickets.js";
import { parseCsv } from "../scripts/csv.js";
import { ROOT } from "./load.js";
import { src } from "./helpers.js";

const read = (name) => fs.readFileSync(path.join(ROOT, "data", name), "utf-8").replace(/\r\n/g, "\n");
const NOW = "2026-10-23 10:00";

test("seed 42 regenerates data/ byte for byte", () => {
  const data = makeData(42);
  expect(read("sample_tickets.csv")).toBe(data.tickets);
  expect(read("agents.csv")).toBe(data.agents);
});

test("a different seed gives different data", () => {
  expect(makeData(7).tickets).not.toBe(makeData(42).tickets);
});

test("only fake contacts: agents @example.com, customers as IDs", () => {
  const tickets = read("sample_tickets.csv");
  expect(tickets).not.toMatch(/@/);
  for (const [, email] of parseCsv(read("agents.csv")).slice(1)) expect(email).toMatch(/@example\.com$/);
});

test("the demo cases are in the data", () => {
  const table = parseCsv(read("sample_tickets.csv"));
  const agents = src.readAgents(parseCsv(read("agents.csv")), "en");
  const tickets = src.checkTickets(table, agents, NOW, "en");
  expect(tickets.length).toBeGreaterThanOrEqual(55);
  expect(new Set(tickets.map((tk) => tk.category)).size).toBe(9);
  expect(tickets.filter((tk) => tk.unassignedUrgent).length).toBe(2);
  expect(tickets.filter((tk) => tk.raisedFrom === "low" && tk.category === "card_lost_stolen" && tk.sla === "breached").length).toBe(1);
  expect(tickets.filter((tk) => tk.maskedCount > 0).length).toBe(3);
  expect(tickets.filter((tk) => tk.stale).length).toBeGreaterThanOrEqual(2);
  const friday = tickets.find((tk) => tk.createdAt === "2026-10-16 17:30");
  expect([friday.slaDue, friday.sla]).toEqual(["2026-10-19 11:30", "met"]);
  const es = tickets.filter((tk) => tk.language === "es").length / tickets.length;
  expect(es).toBeGreaterThan(0.25);
  expect(es).toBeLessThan(0.55);
});
