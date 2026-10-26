// Make the synthetic demo data: data/sample_tickets.csv and data/agents.csv.
//   node scripts/make-tickets.js --seed 42
// Same seed, same files, byte for byte (a test checks this).
// All data is synthetic. Puentara is a fictional company. Customers are only
// IDs like C-1042: no names, emails, card numbers or account numbers.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadSrc, ROOT } from "../tests/load.js";
import { toCsv } from "./csv.js";
import { SUBJECTS, SPECIAL_TICKETS, AGENTS } from "./templates.js";

const RANDOM_TICKETS = 50;
const FIRST_DAY = Date.UTC(2026, 9, 12) / 60000; // Monday 2026-10-12, in minutes
const DEMO_NOW = "2026-10-23 10:00";             // Friday, the demo clock

// mulberry32: a tiny seeded random generator, so the data repeats exactly.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeData(seed) {
  const src = loadSrc(); // strings, priorities and time helpers from src/
  const rand = mulberry32(seed);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const nowMin = src.toMinutes(DEMO_NOW);

  // Move a time that falls outside business hours to the next business morning.
  function nextBusinessTime(min) {
    const day = src.dayStart(min);
    const minuteOfDay = min - day;
    if (src.isBusinessDay(day) && minuteOfDay >= 8 * 60 && minuteOfDay < 18 * 60) return min;
    let next = minuteOfDay < 8 * 60 ? day : day + 1440;
    while (!src.isBusinessDay(next)) next += 1440;
    return next + 8 * 60 + int(0, 50);
  }

  const tickets = [];
  for (let i = 0; i < RANDOM_TICKETS; i++) {
    const category = i < src.CATEGORIES.length ? src.CATEGORIES[i] : pick(src.CATEGORIES);
    const lang = rand() < 0.6 ? "en" : "es";
    // Mostly weekdays 08:00-17:55, about 1 in 10 at night or on the weekend.
    let day = FIRST_DAY + int(0, 10) * 1440;
    let minuteOfDay = int(8 * 12, 17 * 12 + 11) * 5;
    if (rand() < 0.1) minuteOfDay = int(19 * 12, 22 * 12) * 5;
    if (!src.isBusinessDay(day) && rand() < 0.5) day += 2 * 1440;
    const created = day + minuteOfDay;
    const recent = created >= src.toMinutes("2026-10-22 00:00");

    let priority = src.CATEGORY_DEFAULT_PRIORITY[category];
    if (rand() < 0.15 && priority !== "urgent") priority = src.PRIORITIES[src.PRIORITIES.indexOf(priority) + 1];
    const target = src.SLA_TARGETS[priority];

    let status;
    const r = rand();
    if (!recent) status = r < 0.85 ? "resolved" : "waiting";
    else status = r < 0.25 ? "resolved" : r < 0.75 ? "open" : "new";

    // First response: sometimes inside the target, sometimes late.
    let firstResponse = "";
    let lastUpdate = "";
    if (status !== "new") {
      const delay = Math.max(10, Math.round((rand() * 1.4 * target.minutes) / 5) * 5);
      let answered = created + delay;
      if (target.clock !== "24/7") answered = nextBusinessTime(answered);
      if (answered < nowMin) {
        firstResponse = src.fromMinutes(answered);
        lastUpdate = firstResponse;
        if (status === "resolved") lastUpdate = src.fromMinutes(Math.min(nowMin - 5, answered + int(30, 600)));
        // Recent updates only, so the stale follow-ups are the hand-picked ones.
        if (status === "waiting") lastUpdate = src.fromMinutes(Math.max(answered, src.toMinutes("2026-10-21 12:00") + int(0, 300)));
      } else if (status !== "open") {
        status = "open";
      }
    }
    // Urgent tickets always have an owner in the random rows; the two
    // unassigned urgent tickets are hand-picked.
    const assignee = status === "new" && priority !== "urgent" && rand() < 0.6
      ? "" : pick(AGENTS).name;
    tickets.push({
      createdAt: src.fromMinutes(created), category, lang: rand() < 0.3 ? "" : lang,
      subject: pick(SUBJECTS[category][lang]), priority, status, assignee,
      firstResponseAt: firstResponse, lastUpdateAt: lastUpdate,
    });
  }
  SPECIAL_TICKETS.forEach((special) => tickets.push({ ...special }));

  // Oldest first; IDs and customer IDs follow that order.
  tickets.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  const en = (key) => src.t("en", key);
  const header = src.TICKET_COLUMNS.map((key) => en("header." + key));
  const rows = tickets.map((tk, i) => [
    "T-" + (1001 + i),
    tk.createdAt,
    "C-" + (1000 + int(1, 899)),
    en("channel." + pick(src.CHANNELS)),
    tk.lang ? en("language." + tk.lang) : "",
    tk.subject,
    en("category." + tk.category),
    en("priority." + tk.priority),
    en("status." + tk.status),
    tk.assignee,
    tk.firstResponseAt || "",
    tk.lastUpdateAt || "",
    "", // SLA due: filled by the tracker
    "", // SLA status: filled by the tracker
    tk.lastAlerted || "",
  ]);
  const agentRows = [["name", "email", "language", "role"].map((key) => en("header." + key))]
    .concat(AGENTS.map((a) => [a.name, a.email, en("language." + a.language), en("role." + a.role)]));
  return { tickets: toCsv([header].concat(rows)), agents: toCsv(agentRows) };
}

function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf("--seed");
  const seed = at === -1 ? 42 : Number(args[at + 1]);
  if (!Number.isInteger(seed)) {
    console.error("--seed needs a whole number, for example: node scripts/make-tickets.js --seed 42");
    process.exit(1);
  }
  const data = makeData(seed);
  const dir = path.join(ROOT, "data");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "sample_tickets.csv"), data.tickets, "utf-8");
  fs.writeFileSync(path.join(dir, "agents.csv"), data.agents, "utf-8");
  const count = data.tickets.trim().split("\n").length - 1;
  console.log(`Wrote ${count} synthetic tickets to data/sample_tickets.csv and 4 agents to data/agents.csv (seed ${seed}).`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
