// Weekly summary tab: one row per category and per language, plus a total.
//
// What each column counts:
// - Opened: tickets created in the 7 days up to "now".
// - First response met / missed: of those opened tickets, how many got their
//   first response inside / outside the SLA target.
// - Open now: tickets not resolved yet, whenever they were created.
// - Stale follow-ups: "Waiting on customer" for over 2 business days, now.
// Subjects are never part of the summary, only counts.

function summaryCounts(tickets, startMin, nowMin) {
  var counts = { opened: 0, met: 0, missed: 0, open_now: 0, stale: 0 };
  tickets.forEach(function (tk) {
    var created = toMinutes(tk.createdAt);
    if (created !== null && created >= startMin && created <= nowMin) {
      counts.opened++;
      if (tk.sla === "met") counts.met++;
      if (tk.sla === "missed") counts.missed++;
    }
    if (tk.status !== "resolved") counts.open_now++;
    if (tk.stale) counts.stale++;
  });
  return counts;
}

// Returns a 2D array: title row, header row, then one row per group.
function weeklySummary(tickets, now, lang) {
  var nowMin = toMinutes(now);
  var startMin = nowMin - SUMMARY_DAYS * 1440;
  var real = tickets.filter(function (tk) { return !tk.blank; });
  var columns = ["opened", "met", "missed", "open_now", "stale"];

  function row(label, subset) {
    var c = summaryCounts(subset, startMin, nowMin);
    return [label].concat(columns.map(function (key) { return c[key]; }));
  }

  var table = [
    [t(lang, "summary.title", { start: fromMinutes(startMin), end: now })],
    [t(lang, "summary.group")].concat(columns.map(function (key) { return t(lang, "summary." + key); })),
  ];
  CATEGORIES.forEach(function (category) {
    table.push(row(t(lang, "category." + category),
      real.filter(function (tk) { return tk.category === category; })));
  });
  LANGUAGES.forEach(function (language) {
    table.push(row(t(lang, "language." + language),
      real.filter(function (tk) { return tk.language === language; })));
  });
  table.push(row(t(lang, "summary.total"), real));
  return table;
}
