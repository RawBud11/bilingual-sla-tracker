// Local demo: run the same tracker logic as the Google Sheet, on CSV files.
//   npm run demo
//   npm run demo -- --lang es
//   npm run demo -- --now "2026-10-26 09:00" --out output
// No Google account and no API key needed. Nothing is emailed (DRY RUN):
// digests are written to files in output/ instead.
import fs from "node:fs";
import path from "node:path";
import { loadSrc, ROOT } from "../tests/load.js"; // loads src/*.js like Apps Script does
import { parseCsv, toCsv } from "./csv.js";

const DEFAULT_NOW = "2026-10-23 10:00"; // a Friday, matches the sample data

function readArgs(argv) {
  const args = { now: DEFAULT_NOW, lang: "en", out: "output" };
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, "");
    if (!(name in args) || argv[i + 1] === undefined) {
      throw new Error(`Unknown or incomplete option "${argv[i]}". Use --now "YYYY-MM-DD HH:mm", --lang en|es, --out <folder>.`);
    }
    args[name] = argv[++i];
  }
  return args;
}

function readCsvFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${path.relative(ROOT, file)}. Run "npm run make-data" to create the sample data.`);
  }
  return parseCsv(fs.readFileSync(file, "utf-8"));
}

function slug(name) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// Print rows as aligned columns (each column as wide as its longest cell).
function printTable(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  rows.forEach((row) => console.log(row.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd()));
}

function main() {
  const args = readArgs(process.argv.slice(2));
  const src = loadSrc();
  const lang = args.lang;
  if (!["en", "es"].includes(lang)) throw new Error(`--lang must be "en" or "es", not "${lang}".`);
  if (src.toMinutes(args.now) === null) throw new Error(`--now must look like "2026-10-23 10:00", not "${args.now}".`);
  const now = src.fromMinutes(src.toMinutes(args.now));
  const outDir = path.resolve(ROOT, args.out);
  const outName = path.relative(ROOT, outDir).split(path.sep).join("/") + "/";

  const table = readCsvFile(path.join(ROOT, "data", "sample_tickets.csv"));
  const agents = src.readAgents(readCsvFile(path.join(ROOT, "data", "agents.csv")), lang);
  if (!agents.length) throw new Error(src.t(lang, "error.no_agents"));
  const sheetLang = src.sheetLanguage(table[0]);
  const tickets = src.checkTickets(table, agents, now, sheetLang);
  const real = tickets.filter((tk) => !tk.blank);

  console.log(src.t(lang, "console.banner"));
  console.log(src.t(lang, "console.now", { now }));
  console.log("");

  // Open tickets table, most urgent first.
  const open = src.sortForAttention(real.filter((tk) => tk.status !== "resolved"));
  const cols = [
    ["ticket_id", (tk) => tk.id],
    ["category", (tk) => src.t(lang, "category." + tk.category)],
    ["priority", (tk) => src.t(lang, "priority." + tk.priority) +
      (tk.raisedFrom ? " (" + src.t(lang, "digest.raised", { from: src.t(lang, "priority." + tk.raisedFrom) }) + ")" : "")],
    ["assignee", (tk) => (tk.owner ? tk.owner.name : src.t(lang, "digest.unassigned"))],
    ["sla_due", (tk) => tk.slaDue],
    ["sla_status", (tk) => [src.t(lang, "sla." + tk.sla)]
      .concat(tk.stale ? [src.t(lang, "console.follow_up")] : [])
      .concat(tk.alertedToday && !tk.alert ? [src.t(lang, "console.alerted_today")] : [])
      .join(", ")],
  ];
  const grid = [cols.map((c) => src.t(lang, "header." + c[0]))]
    .concat(open.map((tk) => cols.map((c) => c[1](tk))));
  console.log(src.t(lang, "console.open_tickets"));
  printTable(grid);
  console.log("");

  const count = (fn) => real.filter(fn).length;
  console.log(src.t(lang, "console.counts", {
    breached: count((tk) => tk.status !== "resolved" && tk.sla === "breached"),
    at_risk: count((tk) => tk.status !== "resolved" && tk.sla === "at_risk"),
    stale: count((tk) => tk.stale),
    unassigned: count((tk) => tk.unassignedUrgent),
  }));
  console.log(src.tCount(lang, "console.raised", count((tk) => tk.raisedFrom)));

  // Outputs: the checked sheet, digests (DRY RUN), weekly summary.
  fs.mkdirSync(outDir, { recursive: true });
  const written = [];
  const write = (name, text) => {
    fs.writeFileSync(path.join(outDir, name), text, "utf-8");
    written.push(outName + name);
  };
  const updates = src.columnUpdates(tickets, table, now, sheetLang, []);
  write("tracker_checked.csv", toCsv(src.applyColumnUpdates(table, updates, sheetLang)));

  const digests = src.buildDigests(tickets, agents, now);
  for (const d of digests) {
    const name = d.kind === "lead" ? "lead" : slug(d.name);
    write(`digest_${name}_${d.language}.txt`, `To: ${d.to}\nSubject: ${d.subject}\n\n${d.text}`);
  }
  // The lead digest in both languages and as HTML, so you can compare them.
  const lead = agents.find((a) => a.role === "lead");
  if (lead) {
    for (const other of ["en", "es"]) {
      const d = src.buildDigest("lead", lead, tickets, now, other);
      if (!d) continue;
      if (other !== lead.language) write(`digest_lead_${other}.txt`, `To: ${d.to}\nSubject: ${d.subject}\n\n${d.text}`);
      if (other === "es") write("digest_es.html", d.html);
    }
  }
  const summary = src.weeklySummary(tickets, now, lang);
  // The tracker's own title has no label (it runs on real sheets); the demo adds one.
  summary[0][0] += " " + src.t(lang, "console.sample_data");
  write("weekly_summary.csv", toCsv(summary));

  console.log(src.t(lang, "console.digests", { count: digests.length, dir: outName }));
  console.log("");

  console.log(src.t(lang, "console.summary"));
  console.log(summary[0][0]);
  // Short version on screen: header, the language rows and the total.
  const shown = [summary[1]].concat(summary.slice(2 + src.CATEGORIES.length)).map((row) => row.map(String));
  printTable(shown);
  console.log("");
  console.log(src.t(lang, "console.files"));
  written.forEach((f) => console.log("  " + f));
}

try {
  main();
} catch (err) {
  // A clear one-line message instead of a stack trace.
  console.error("Error: " + err.message);
  process.exit(1);
}
