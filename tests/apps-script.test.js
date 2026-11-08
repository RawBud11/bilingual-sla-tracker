// The Apps Script layer (dist/Code.gs, the file people paste) run against an
// in-memory fake of Sheets, Gmail, the script lock and triggers. These repeat
// the README's manual "Real Sheet test" so it doesn't depend on one hand run.
// They don't prove Google behaves like the fake: the real-sheet run still matters.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { parseCsv } from "../scripts/csv.js";
import { ROOT } from "./load.js";
import { fakeGoogle } from "./fake-google.js";
import { AGENT_TABLE_EN } from "./helpers.js";

const csv = (name) => parseCsv(fs.readFileSync(path.join(ROOT, "data", name), "utf-8"));
const SAMPLE = { Tickets: csv("sample_tickets.csv"), Agents: csv("agents.csv") };
const AGENT_EMAILS = SAMPLE.Agents.slice(1).map((r) => r[1]);

function column(g, header) {
  const rows = g.tab("Tickets").values();
  const i = rows[0].indexOf(header);
  expect(i, header).not.toBe(-1);
  return rows.slice(1).map((r) => r[i] ?? "");
}

describe("checkSlas", () => {
  test("writes Priority, SLA due and SLA status, and the weekly summary; sends nothing", () => {
    const g = fakeGoogle({ tabs: SAMPLE });
    g.gs.checkSlas();
    const ids = column(g, "Ticket ID");
    const at = (id, header) => column(g, header)[ids.indexOf(id)];
    expect([at("T-1062", "Priority"), at("T-1062", "SLA status")]).toEqual(["Urgent", "Breached"]);
    expect(at("T-1063", "SLA status")).toBe("At risk");
    expect(column(g, "Last alerted").filter(Boolean).length).toBe(2); // only the two from the CSV
    expect(g.tab("Weekly summary").values()[0][0]).toMatch(/^Weekly summary, 2026-10-16 10:00 to 2026-10-23 10:00$/);
    expect(g.sent).toEqual([]);
  });
});

describe("sendDigests", () => {
  test("DRY_RUN (default): preview tab only, nothing emailed, Last alerted untouched", () => {
    const g = fakeGoogle({ tabs: SAMPLE });
    const before = column(g, "Last alerted");
    g.gs.sendDigests();
    expect(g.sent).toEqual([]);
    const preview = g.tab("Digest preview").values();
    expect(preview.length).toBe(5); // header + 4 digests, as in the demo
    expect(preview.slice(1).map((r) => r[0]).every((to) => AGENT_EMAILS.includes(to))).toBe(true);
    expect(column(g, "Last alerted")).toEqual(before);
    expect(g.lock).toMatchObject({ held: false, released: 1 });
  });

  test("DRY_RUN off: emails only Agents-tab addresses, stamps Last alerted, then repeats only the unassigned urgent", () => {
    const g = fakeGoogle({ tabs: SAMPLE });
    g.gs.DRY_RUN = false;
    g.gs.sendDigests();
    expect(g.sent.length).toBe(4);
    expect(g.sent.every((m) => AGENT_EMAILS.includes(m.to))).toBe(true);
    expect(g.sent[0].to).toBe("lucia.demo@example.com"); // the lead first
    expect(g.sent.map((m) => m.htmlBody).join("")).not.toMatch(/0000 1234|Girasol2024|482913/);
    const stamped = column(g, "Last alerted").filter((v) => v === "2026-10-23 10:00").length;
    expect(stamped).toBeGreaterThan(0);

    g.sent.length = 0;
    g.gs.sendDigests();
    expect(g.sent.map((m) => m.to)).toEqual(["lucia.demo@example.com"]);
    expect(g.sent[0].body).toMatch(/T-1061/);
  });

  test("an email failing partway: the rest still go, only sent digests are stamped, and the error says so", () => {
    const g = fakeGoogle({ tabs: SAMPLE, mailFailsOn: (msg) => msg.to === "lucia.demo@example.com" });
    g.gs.DRY_RUN = false;
    expect(() => g.gs.sendDigests())
      .toThrow(/3 of 4 digest\(s\) emailed; 1 failed: lucia\.demo@example\.com: Service invoked too many times/);
    expect(g.sent.map((m) => m.to)).toEqual(["mateo.demo@example.com", "sam.demo@example.com", "jordan.demo@example.com"]);
    const ids = column(g, "Ticket ID");
    const alerted = (id) => column(g, "Last alerted")[ids.indexOf(id)];
    expect(alerted("T-1059")).toBe("2026-10-23 10:00"); // in Mateo's digest, which went out
    expect(alerted("T-1045")).toBe(""); // owned by the lead, so only in the failed lead digest
    expect(g.lock.held).toBe(false);
  });

  test("when every email fails, nothing is stamped", () => {
    const g = fakeGoogle({ tabs: SAMPLE, mailFailsOn: () => true });
    g.gs.DRY_RUN = false;
    const before = column(g, "Last alerted");
    expect(() => g.gs.sendDigests()).toThrow(/0 of 4/);
    expect(column(g, "Last alerted")).toEqual(before);
  });

  test("another run holding the lock: stops with a clear error and sends nothing", () => {
    const g = fakeGoogle({ tabs: SAMPLE, lockFree: false });
    g.gs.DRY_RUN = false;
    expect(() => g.gs.sendDigests()).toThrow("Another run is sending digests right now");
    expect(g.sent).toEqual([]);
  });

  test("no lead on the Agents tab: stops before sending anything", () => {
    const agents = SAMPLE.Agents.map((r, i) => (i ? [r[0], r[1], r[2], "Agent"] : r));
    const g = fakeGoogle({ tabs: { Tickets: SAMPLE.Tickets, Agents: agents } });
    g.gs.DRY_RUN = false;
    expect(() => g.gs.sendDigests()).toThrow(/Role = Lead/);
    expect(g.sent).toEqual([]);
    expect(g.lock.held).toBe(false);
  });
});

describe("setupTracker", () => {
  test("an empty spreadsheet gets the four tabs with headers", () => {
    const g = fakeGoogle();
    g.gs.setupTracker();
    expect(g.tabNames().sort()).toEqual(["Agents", "Digest preview", "Tickets", "Weekly summary"]);
    expect(g.tab("Tickets").values()[0]).toContain("SLA status");
    expect(g.tab("Agents").values()[0]).toEqual(["Name", "Email address", "Language", "Role"]);
  });

  test("Spanish setup language gives Spanish tabs and headers", () => {
    const g = fakeGoogle();
    g.gs.SETUP_LANGUAGE = "es";
    g.gs.setupTracker();
    expect(g.tabNames().sort()).toEqual(["Agentes", "Resumen semanal", "Solicitudes", "Vista previa de resúmenes"]);
    expect(g.tab("Solicitudes").values()[0]).toContain("Estado del SLA");
  });

  test("an imported sheet without the tracker's columns gets them added, rows kept", () => {
    // Only the required columns, as a client's own sheet might have.
    const narrow = [
      ["Ticket ID", "Created", "Subject", "Category", "Priority", "Status", "Assignee"],
      ["T-9", "2026-10-23 08:00", "Why was I charged a fee?", "Fees", "", "Open", "Sam Demo"],
    ];
    const g = fakeGoogle({ tabs: { Tickets: narrow, Agents: AGENT_TABLE_EN } });
    g.gs.setupTracker();
    const rows = g.tab("Tickets").values();
    expect(rows[0]).toEqual(expect.arrayContaining(["Language", "SLA due", "SLA status", "Last alerted"]));
    expect(rows[1][0]).toBe("T-9");
  });
});

describe("installDailyTrigger", () => {
  test("replaces an earlier trigger and warns while DRY_RUN is on", () => {
    const g = fakeGoogle({ tabs: SAMPLE });
    g.gs.installDailyTrigger();
    g.gs.installDailyTrigger();
    expect(g.triggers.length).toBe(1);
    expect(g.toasts.at(-1)).toMatch(/DRY_RUN is still on/);
    g.gs.DRY_RUN = false;
    g.gs.installDailyTrigger();
    expect(g.toasts.at(-1)).not.toMatch(/DRY_RUN/);
  });
});
