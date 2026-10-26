// First-response SLA math: due time and status (OK, At risk, Breached, Met, Missed).
//
// Times are plain local strings "YYYY-MM-DD HH:mm" in the team time zone.
// Why strings and not Date objects: a JavaScript Date carries the computer's
// time zone, so the same sheet could give different due times on a laptop in
// Bogotá and a server in the US. Here, Date.UTC is only used as a calendar
// calculator (minutes since 1970, weekday), never to convert time zones.
// Apps Script turns sheet dates into these strings with the script time zone.

var LOCAL_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/;

// "2026-10-23 10:00" -> minutes since 1970-01-01 00:00 (calendar math only).
// Returns null for anything that is not a valid date.
function toMinutes(text) {
  var m = LOCAL_TIME_RE.exec(String(text == null ? "" : text).trim());
  if (!m) return null;
  var y = +m[1], mo = +m[2], d = +m[3], h = +(m[4] || 0), mi = +(m[5] || 0);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  var ms = Date.UTC(y, mo - 1, d, h, mi);
  // Date.UTC rolls 2026-02-31 over to March; reject it instead.
  if (new Date(ms).getUTCDate() !== d) return null;
  return ms / 60000;
}

// Minutes since 1970 -> "YYYY-MM-DD HH:mm".
function fromMinutes(minutes) {
  var d = new Date(minutes * 60000);
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) +
    " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
}

function weekdayOf(minutes) {
  return new Date(minutes * 60000).getUTCDay(); // 0 = Sunday
}

function isBusinessDay(minutes) {
  return BUSINESS_DAYS.indexOf(weekdayOf(minutes)) !== -1;
}

// Start of the calendar day (00:00) that contains `minutes`.
function dayStart(minutes) {
  return minutes - (((minutes % 1440) + 1440) % 1440);
}

// Business minutes between two times: only Mon-Fri 08:00-18:00 count.
function businessMinutesBetween(startMin, endMin) {
  if (endMin <= startMin) return 0;
  var total = 0;
  for (var day = dayStart(startMin); day < endMin; day += 1440) {
    if (!isBusinessDay(day)) continue;
    var open = Math.max(day + BUSINESS_START_MINUTE, startMin);
    var close = Math.min(day + BUSINESS_END_MINUTE, endMin);
    if (close > open) total += close - open;
  }
  return total;
}

// The time when `minutes` business minutes have passed after `startMin`.
// A ticket created Friday 17:30 with 4 business hours is due Monday 11:30.
function addBusinessMinutes(startMin, minutes) {
  var cursor = startMin;
  var left = minutes;
  // Safety stop: 400 days is far more than any SLA in config.js.
  for (var guard = 0; guard < 400; guard++) {
    var day = dayStart(cursor);
    var open = day + BUSINESS_START_MINUTE;
    var close = day + BUSINESS_END_MINUTE;
    if (isBusinessDay(day) && cursor < close) {
      var from = Math.max(cursor, open);
      if (from + left <= close) return from + left;
      left -= close - from;
    }
    cursor = day + 1440; // next day, 00:00
  }
  throw new Error("addBusinessMinutes: SLA target too long");
}

// Minutes that count toward the SLA between two times, for this priority.
function slaMinutesBetween(priority, startMin, endMin) {
  var target = SLA_TARGETS[priority] || SLA_TARGETS[FALLBACK_PRIORITY];
  if (target.clock === "24/7") return Math.max(0, endMin - startMin);
  return businessMinutesBetween(startMin, endMin);
}

// Due time for the first response, "YYYY-MM-DD HH:mm", or "" for a bad date.
function slaDue(createdAt, priority) {
  var created = toMinutes(createdAt);
  if (created === null) return "";
  var target = SLA_TARGETS[priority] || SLA_TARGETS[FALLBACK_PRIORITY];
  var due = target.clock === "24/7"
    ? created + target.minutes
    : addBusinessMinutes(created, target.minutes);
  return fromMinutes(due);
}

// One of: "met", "missed" (already answered), "ok", "at_risk", "breached"
// (still waiting for a first response), or "bad_date".
// Breached means 100% or more of the time is used: at the due minute itself
// the target has passed.
function slaStatus(createdAt, firstResponseAt, now, priority) {
  var created = toMinutes(createdAt);
  if (created === null) return "bad_date";
  var target = (SLA_TARGETS[priority] || SLA_TARGETS[FALLBACK_PRIORITY]).minutes;

  if (String(firstResponseAt || "").trim()) {
    var answered = toMinutes(firstResponseAt);
    if (answered === null || answered < created) return "bad_date";
    return slaMinutesBetween(priority, created, answered) <= target ? "met" : "missed";
  }

  var nowMin = toMinutes(now);
  var used = slaMinutesBetween(priority, created, nowMin) / target;
  if (used >= 1) return "breached";
  if (used >= AT_RISK_FRACTION) return "at_risk";
  return "ok";
}
