// ---------------------------------------------------------------------------
// Apps Script layer: the only part that touches Google Sheets, Gmail and
// triggers. All the rules (SLA math, priority floors, digests, summary) are
// the plain functions from src/ above, tested locally with `npm test`.
// This layer is kept thin on purpose. It has no automated tests; it was run
// once by hand in a real Google Sheet (see "Real Sheet test" in the README).
// ---------------------------------------------------------------------------

// DRY_RUN = true: digests are written to the "Digest preview" tab and nothing
// is emailed. Set it to false only after the preview looks right.
var DRY_RUN = true;

// Language for new tabs, headers, dropdowns and the menu: "en" or "es".
// Once the Tickets tab exists, its header row decides the language instead.
var SETUP_LANGUAGE = "en";

// --- Menu ------------------------------------------------------------------

function onOpen() {
  var lang = currentLanguage_();
  SpreadsheetApp.getUi().createMenu(t(lang, "menu.title"))
    .addItem(t(lang, "menu.check"), "checkSlas")
    .addItem(t(lang, "menu.send"), "sendDigests")
    .addSeparator()
    .addItem(t(lang, "menu.trigger"), "installDailyTrigger")
    .addToUi();
}

// --- Setup -----------------------------------------------------------------

// Creates the tabs, headers, dropdowns and colors. Safe to run again:
// existing tabs and rows are kept.
function setupTracker() {
  var lang = currentLanguage_();
  var ss = SpreadsheetApp.getActive();
  var tickets = findTab_("tickets") || ss.insertSheet(t(lang, "tab.tickets"));
  if (!String(tickets.getRange(1, 1).getValue()).trim()) {
    var header = TICKET_COLUMNS.map(function (key) { return t(lang, "header." + key); });
    tickets.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
    tickets.setFrozenRows(1);
  }
  var map = mapColumns(tickets.getRange(1, 1, 1, tickets.getLastColumn()).getValues()[0],
    TICKET_COLUMNS, EXTRA_COLUMN_ALIASES, REQUIRED_TICKET_COLUMNS, lang);
  addDropdown_(tickets, map.category, labelsFor_("category", CATEGORIES, lang));
  addDropdown_(tickets, map.priority, labelsFor_("priority", PRIORITIES, lang));
  addDropdown_(tickets, map.status, labelsFor_("status", TICKET_STATUSES, lang));
  if ("language" in map) addDropdown_(tickets, map.language, labelsFor_("language", LANGUAGES, lang));
  if ("sla_status" in map) addSlaColors_(tickets, map.sla_status);

  var agents = findTab_("agents") || ss.insertSheet(t(lang, "tab.agents"));
  if (!String(agents.getRange(1, 1).getValue()).trim()) {
    var agentHeader = AGENT_COLUMNS.map(function (key) { return t(lang, "header." + key); });
    agents.getRange(1, 1, 1, agentHeader.length).setValues([agentHeader]).setFontWeight("bold");
    agents.setFrozenRows(1);
    addDropdown_(agents, 2, labelsFor_("language", ["en", "es"], lang));
    addDropdown_(agents, 3, labelsFor_("role", ["agent", "lead"], lang));
  }
  if (!findTab_("preview")) ss.insertSheet(t(lang, "tab.preview"));
  if (!findTab_("summary")) ss.insertSheet(t(lang, "tab.summary"));
  notify_(t(lang, "done.setup", { tab: agents.getName() }));
}

function labelsFor_(kind, ids, lang) {
  return ids.map(function (id) { return t(lang, kind + "." + id); });
}

// Every data row of one column (0-based index), down to the sheet's last row.
function dataColumn_(sheet, columnIndex) {
  return sheet.getRange(2, columnIndex + 1, Math.max(sheet.getMaxRows() - 1, 1), 1);
}

// Dropdown on one column. Other values only show a warning, so rows pasted
// with the other language's labels still work.
function addDropdown_(sheet, columnIndex, labels) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(labels, true).setAllowInvalid(true).build();
  dataColumn_(sheet, columnIndex).setDataValidation(rule);
}

// Red for Breached / Missed, yellow for At risk, in both languages.
// Added to the tab's existing rules: the client's own colors are kept, and
// our rules from an earlier setup are replaced instead of duplicated.
function addSlaColors_(sheet, columnIndex) {
  var range = dataColumn_(sheet, columnIndex);
  var colors = { breached: "#f4c7c3", missed: "#f4c7c3", at_risk: "#fce8b2" };
  var ours = [];
  var rules = [];
  Object.keys(colors).forEach(function (status) {
    ["en", "es"].forEach(function (lang) {
      ours.push(t(lang, "sla." + status));
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(t(lang, "sla." + status)).setBackground(colors[status])
        .setRanges([range]).build());
    });
  });
  var kept = sheet.getConditionalFormatRules().filter(function (rule) {
    var condition = rule.getBooleanCondition();
    return !(condition &&
      condition.getCriteriaType() === SpreadsheetApp.BooleanCriteria.TEXT_EQUAL_TO &&
      ours.indexOf(String(condition.getCriteriaValues()[0])) !== -1);
  });
  sheet.setConditionalFormatRules(kept.concat(rules));
}

// --- Check and send --------------------------------------------------------

// Fills Priority (category floor), Language (when empty), SLA due, SLA status,
// and rewrites the Weekly summary tab. Sends nothing.
function checkSlas() {
  var state = loadTracker_();
  writeColumns_(state, []);
  writeSummary_(state);
  notify_(tCount(state.lang, "done.check", state.tickets.filter(function (tk) { return !tk.blank; }).length));
  return state;
}

// Checks SLAs, then builds the digests. DRY_RUN: preview tab only.
// Recipients come only from the Agents tab (see buildDigests in src/digest.js).
function sendDigests() {
  var state = checkSlas();
  if (!state.agents.length) throw new Error(t(state.lang, "error.no_agents"));
  // No lead on the Agents tab: unassigned tickets would reach nobody. Stop
  // with a clear message instead of saying "Nothing to report".
  var noLead = missingLeadError(state.tickets, state.agents, state.lang);
  if (noLead) throw new Error(noLead);
  var digests = buildDigests(state.tickets, state.agents, state.now);
  if (!digests.length) {
    notify_(t(state.lang, "done.nothing"));
    return;
  }
  if (DRY_RUN) {
    var tab = findTab_("preview") || SpreadsheetApp.getActive().insertSheet(t(state.lang, "tab.preview"));
    var rows = [[t(state.lang, "preview.to"), t(state.lang, "header.subject"), t(state.lang, "preview.body")]];
    digests.forEach(function (d) { rows.push([d.to, d.subject, d.text]); });
    tab.clearContents();
    tab.getRange(1, 1, rows.length, 3).setValues(rows);
    // Last alerted is NOT updated in DRY_RUN, so you can preview again today.
    notify_(tCount(state.lang, "done.preview", digests.length, { tab: tab.getName() }));
    return;
  }
  // Daily email limits apply (MailApp quotas). See Google's quota page:
  // https://developers.google.com/apps-script/guides/services/quotas
  digests.forEach(function (d) {
    MailApp.sendEmail({ to: d.to, subject: d.subject, body: d.text, htmlBody: d.html });
  });
  // Stamp Last alerted only on tickets in the digests just sent: no same-day repeats.
  writeColumns_(state, alertedRows(digests));
  notify_(tCount(state.lang, "done.sent", digests.length));
}

// One trigger that runs sendDigests every day around 07:30 in the
// spreadsheet's time zone (Apps Script picks a minute within about 15 minutes of :30).
// Runs on weekends too: urgent tickets are on a 24/7 clock.
function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "sendDigests") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("sendDigests").timeBased().everyDays(1).atHour(7).nearMinute(30)
    .inTimezone(teamTimeZone_()).create();
  notify_(t(currentLanguage_(), "done.trigger"));
}

// --- Sheet helpers ---------------------------------------------------------

// The team time zone is the spreadsheet's (File > Settings), so business
// hours and "same day" dedupe follow the sheet, whoever owns the script.
function teamTimeZone_() {
  return SpreadsheetApp.getActive().getSpreadsheetTimeZone();
}

// A tab by its English or Spanish name, or null.
function findTab_(key) {
  var ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(t("en", "tab." + key)) || ss.getSheetByName(t("es", "tab." + key));
}

function currentLanguage_() {
  var tickets = findTab_("tickets");
  if (!tickets || tickets.getLastColumn() === 0) return SETUP_LANGUAGE;
  return sheetLanguage(tickets.getRange(1, 1, 1, tickets.getLastColumn()).getValues()[0]);
}

// All values of a tab as text. Date cells become "YYYY-MM-DD HH:mm" in the
// spreadsheet time zone, which is the format the src/ functions expect.
function readTable_(sheet) {
  var tz = teamTimeZone_();
  return sheet.getDataRange().getValues().map(function (row) {
    return row.map(function (value) {
      return value instanceof Date ? Utilities.formatDate(value, tz, "yyyy-MM-dd HH:mm") : value;
    });
  });
}

function loadTracker_() {
  var sheet = findTab_("tickets");
  if (!sheet) throw new Error(t(SETUP_LANGUAGE, "error.no_tickets_tab", { tab: t(SETUP_LANGUAGE, "tab.tickets") }));
  var table = readTable_(sheet);
  var lang = sheetLanguage(table[0] || []);
  var agentsTab = findTab_("agents");
  var agents = agentsTab ? readAgents(readTable_(agentsTab), lang) : [];
  var now = Utilities.formatDate(new Date(), teamTimeZone_(), "yyyy-MM-dd HH:mm");
  return {
    sheet: sheet, table: table, lang: lang, agents: agents, now: now,
    tickets: checkTickets(table, agents, now, lang),
  };
}

// Write the tracker's columns back, one column at a time, so the columns
// people type in (subject, assignee, dates) are never overwritten.
// rowsToStamp: data rows that get Last alerted = now ([] leaves it alone).
function writeColumns_(state, rowsToStamp) {
  if (state.table.length < 2) return;
  var updates = columnUpdates(state.tickets, state.table, state.now, state.lang, rowsToStamp);
  if (!rowsToStamp.length) delete updates.last_alerted;
  var cols = ensureColumns(state.table[0], Object.keys(updates), state.lang);
  if (cols.header.length > state.table[0].length) {
    var missing = cols.header.length - state.sheet.getMaxColumns();
    if (missing > 0) state.sheet.insertColumnsAfter(state.sheet.getMaxColumns(), missing);
    state.sheet.getRange(1, 1, 1, cols.header.length).setValues([cols.header]);
  }
  Object.keys(updates).forEach(function (key) {
    var values = updates[key].map(function (v) { return [v]; });
    state.sheet.getRange(2, cols.map[key] + 1, values.length, 1).setValues(values);
  });
}

function writeSummary_(state) {
  var tab = findTab_("summary") || SpreadsheetApp.getActive().insertSheet(t(state.lang, "tab.summary"));
  var table = weeklySummary(state.tickets, state.now, state.lang);
  var width = table[1].length;
  // setValues needs every row to have the same length.
  var rows = table.map(function (row) {
    var copy = row.slice();
    while (copy.length < width) copy.push("");
    return copy;
  });
  tab.clearContents();
  tab.getRange(1, 1, rows.length, width).setValues(rows);
}

// Message for the person at the sheet. Triggers have no UI, so it also goes
// to the execution log.
function notify_(message) {
  Logger.log(message);
  try {
    SpreadsheetApp.getActive().toast(message, t(currentLanguage_(), "menu.title"), 8);
  } catch (e) {
    // No spreadsheet UI (time-based trigger): the log line above is enough.
  }
}
