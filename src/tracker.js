// Read the Tickets and Agents tabs (as plain 2D arrays) and check every ticket:
// priority floor, SLA due and status, stale follow-ups, who to alert today.
// The same functions run in Apps Script and in the Node demo and tests.

// Header names accepted for each column: English, Spanish, the id itself
// and the extra names from config.js, all folded (no accents, lowercase).
function columnAliases(key, extra) {
  var names = [key, STRINGS.en["header." + key], STRINGS.es["header." + key]]
    .concat((extra && extra[key]) || []);
  return names.map(foldText);
}

// headerRow -> { key: columnIndex }. Throws a clear error naming the missing
// columns in the sheet's language, so the user knows what to add.
function mapColumns(headerRow, keys, extra, required, lang) {
  var folded = headerRow.map(foldText);
  var map = {};
  keys.forEach(function (key) {
    var aliases = columnAliases(key, extra);
    for (var i = 0; i < folded.length; i++) {
      if (aliases.indexOf(folded[i]) !== -1) { map[key] = i; return; }
    }
  });
  var missing = (required || []).filter(function (key) { return !(key in map); });
  if (missing.length) {
    var names = missing.map(function (key) { return t(lang, "header." + key); });
    throw new Error(t(lang, "error.missing_columns", { columns: names.join(", ") }));
  }
  return map;
}

// "es" when most known headers are the Spanish ones, else "en". New values
// (priority, SLA status) are written in the language the sheet already uses.
function sheetLanguage(headerRow) {
  var en = 0, es = 0;
  headerRow.map(foldText).forEach(function (h) {
    TICKET_COLUMNS.forEach(function (key) {
      if (h === foldText(STRINGS.en["header." + key])) en++;
      if (h === foldText(STRINGS.es["header." + key])) es++;
    });
  });
  return es > en ? "es" : "en";
}

// Add any missing columns at the end of the header row, with headers in `lang`.
// Returns { header: new header row, map: { key: columnIndex } }.
function ensureColumns(headerRow, keys, lang) {
  var header = headerRow.slice();
  var map = mapColumns(header, TICKET_COLUMNS, EXTRA_COLUMN_ALIASES, [], lang);
  keys.forEach(function (key) {
    if (!(key in map)) {
      map[key] = header.length;
      header.push(t(lang, "header." + key));
    }
  });
  return { header: header, map: map };
}

function cell(row, map, key) {
  if (!(key in map)) return "";
  var value = row[map[key]];
  return value == null ? "" : String(value).trim();
}

// Agents tab -> [{ name, email, language, role }]. Rows without a valid email
// are skipped: a digest needs somewhere to go.
function readAgents(table, lang) {
  if (!table.length) return [];
  var map = mapColumns(table[0], AGENT_COLUMNS, EXTRA_AGENT_ALIASES, ["name", "email"], lang);
  var agents = [];
  table.slice(1).forEach(function (row) {
    var email = cell(row, map, "email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    agents.push({
      name: cell(row, map, "name"),
      email: email,
      language: idFromLabel("language", cell(row, map, "language"), ["en", "es"]) || "en",
      role: idFromLabel("role", cell(row, map, "role"), ["agent", "lead"]) || "agent",
    });
  });
  return agents;
}

// The agent behind an Assignee cell (by name or email), or null.
function findAgent(assignee, agents) {
  var folded = foldText(assignee);
  if (!folded) return null;
  for (var i = 0; i < agents.length; i++) {
    if (foldText(agents[i].name) === folded || foldText(agents[i].email) === folded) return agents[i];
  }
  return null;
}

function priorityRank(priority) {
  return PRIORITIES.indexOf(priority);
}

// Priority after the category floor. An empty or unknown Priority cell uses
// the category default. raisedFrom is set only when a typed priority was
// below the floor (for example a lost card marked "Low").
function effectivePriority(category, priorityCell) {
  var typed = idFromLabel("priority", priorityCell, PRIORITIES);
  var priority = typed || CATEGORY_DEFAULT_PRIORITY[category] || FALLBACK_PRIORITY;
  var floor = CATEGORY_PRIORITY_FLOOR[category];
  if (floor && priorityRank(priority) < priorityRank(floor)) {
    return { priority: floor, raisedFrom: priority };
  }
  return { priority: priority, raisedFrom: "" };
}

// "Waiting on customer" with no update for more than 2 business days.
function isStaleFollowUp(status, lastUpdateAt, now) {
  if (status !== "waiting") return false;
  var since = toMinutes(lastUpdateAt);
  if (since === null) return false;
  return businessMinutesBetween(since, toMinutes(now)) >
    FOLLOW_UP_BUSINESS_DAYS * BUSINESS_DAY_MINUTES;
}

// Check one data row. `now` is "YYYY-MM-DD HH:mm" in the team time zone.
function checkTicket(row, map, agents, now) {
  var category = idFromLabel("category", cell(row, map, "category"), CATEGORIES);
  var status = idFromLabel("status", cell(row, map, "status"), TICKET_STATUSES) || "open";
  var p = effectivePriority(category, cell(row, map, "priority"));
  var createdAt = cell(row, map, "created_at");
  var firstResponseAt = cell(row, map, "first_response_at");
  var lastUpdateAt = cell(row, map, "last_update_at");
  var subject = cell(row, map, "subject");
  var typedLanguage = idFromLabel("language", cell(row, map, "language"), LANGUAGES);
  var masked = maskSensitive(subject);

  // Resolving a ticket counts as its first response when none was logged.
  var answeredAt = firstResponseAt || (status === "resolved" ? lastUpdateAt : "");
  var sla = status === "resolved" && !answeredAt
    ? ""
    : slaStatus(createdAt, answeredAt, now, p.priority);

  var owner = findAgent(cell(row, map, "assignee"), agents);
  var open = status !== "resolved";
  // A name that is not on the Agents tab cannot receive a digest, so the
  // ticket counts as unowned.
  var unassignedUrgent = open && !owner && p.priority === "urgent";
  var stale = open && isStaleFollowUp(status, lastUpdateAt || firstResponseAt || createdAt, now);
  var lastAlerted = cell(row, map, "last_alerted");
  var alertedToday = lastAlerted.slice(0, 10) === String(now).slice(0, 10);
  // An open ticket whose dates can't be read has no SLA: the lead must fix it.
  var needsAttention = open && (sla === "breached" || sla === "at_risk" || sla === "bad_date" || stale);

  return {
    id: cell(row, map, "ticket_id"),
    createdAt: createdAt,
    customerId: cell(row, map, "customer_id"),
    subject: masked.text, // only the masked subject is kept
    maskedCount: masked.count,
    category: category,
    categoryText: cell(row, map, "category"),
    priority: p.priority,
    raisedFrom: p.raisedFrom,
    status: status,
    assignee: cell(row, map, "assignee"),
    owner: owner,
    language: typedLanguage || detectLanguage(subject),
    languageDetected: !typedLanguage,
    firstResponseAt: firstResponseAt,
    slaDue: slaDue(createdAt, p.priority),
    sla: sla,
    stale: stale,
    unassignedUrgent: unassignedUrgent,
    alertedToday: alertedToday,
    // Same-day repeats are skipped, except unassigned urgent tickets: those
    // are alerted on every run until someone owns them.
    alert: unassignedUrgent || (needsAttention && !alertedToday),
  };
}

// Tickets tab (header row + data rows) -> checked tickets, one per data row.
function checkTickets(table, agents, now, lang) {
  if (!table.length) return [];
  var map = mapColumns(table[0], TICKET_COLUMNS, EXTRA_COLUMN_ALIASES, REQUIRED_TICKET_COLUMNS, lang);
  // Empty rows stay in the list (marked blank) so results line up with sheet rows.
  // `row` is the data-row position (0 = first row under the header), used to
  // stamp Last alerted on exactly the rows that went out in a digest.
  return table.slice(1).map(function (row, i) {
    var blank = !row.some(function (v) { return String(v == null ? "" : v).trim(); });
    var ticket = blank ? { blank: true, alert: false } : checkTicket(row, map, agents, now);
    ticket.row = i;
    return ticket;
  });
}

// Order for people: unassigned urgent, breached, at risk, stale, the rest;
// then by due time.
function attentionRank(ticket) {
  if (ticket.unassignedUrgent) return 0;
  if (ticket.sla === "breached") return 1;
  if (ticket.sla === "at_risk") return 2;
  if (ticket.stale) return 3;
  return 4;
}

function sortForAttention(tickets) {
  return tickets.slice().sort(function (a, b) {
    return attentionRank(a) - attentionRank(b) || (a.slaDue < b.slaDue ? -1 : a.slaDue > b.slaDue ? 1 : 0);
  });
}

// Values the tracker writes back, one array per column, in data-row order.
// Priority is always written (floor applied), Language only when it was empty.
// alertedRows: data-row positions that were in a digest actually sent (see
// alertedRows() in digest.js); those get Last alerted = now. [] keeps it as is.
function columnUpdates(tickets, table, now, lang, alertedRows) {
  var map = mapColumns(table[0], TICKET_COLUMNS, EXTRA_COLUMN_ALIASES, [], lang);
  var rows = table.slice(1);
  // Blank rows get blank values, so nothing is written into empty lines.
  function column(fn) {
    return tickets.map(function (tk, i) { return tk.blank ? "" : fn(tk, rows[i]); });
  }
  return {
    priority: column(function (tk) { return t(lang, "priority." + tk.priority); }),
    language: column(function (tk, row) {
      return tk.languageDetected ? t(lang, "language." + tk.language) : cell(row, map, "language");
    }),
    sla_due: column(function (tk) { return tk.slaDue; }),
    sla_status: column(function (tk) { return tk.sla ? t(lang, "sla." + tk.sla) : ""; }),
    last_alerted: column(function (tk, row) {
      return (alertedRows || []).indexOf(tk.row) !== -1 ? now : cell(row, map, "last_alerted");
    }),
  };
}

// The whole table with columnUpdates applied (used by the Node demo to write
// output/tracker_checked.csv). Missing columns are added at the end.
function applyColumnUpdates(table, updates, lang) {
  var cols = ensureColumns(table[0], Object.keys(updates), lang);
  var out = [cols.header];
  table.slice(1).forEach(function (row, i) {
    var copy = row.slice();
    while (copy.length < cols.header.length) copy.push("");
    Object.keys(updates).forEach(function (key) { copy[cols.map[key]] = updates[key][i]; });
    out.push(copy);
  });
  return out;
}
