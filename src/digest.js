// Daily digests: one per agent (their own tickets) and one per team lead
// (the whole team, unassigned urgent first), each in the reader's language.
// A digest is only built when there is something to report.
//
// Recipients come only from the Agents tab. Nothing in a ticket row (customer
// ID, subject, assignee text) is ever used as an email address.
// Subjects were already masked by checkTicket (card numbers, CVVs, codes,
// passwords), and every value is HTML-escaped in the HTML version.

var DIGEST_SECTIONS = ["unassigned_urgent", "breached", "at_risk", "stale", "bad_date"];
// Sections only the team lead sees.
var LEAD_ONLY_SECTIONS = ["unassigned_urgent", "bad_date"];

// Which section a ticket belongs to (each ticket appears once), or "".
function digestSection(ticket) {
  if (ticket.blank || !ticket.alert) return "";
  if (ticket.unassignedUrgent) return "unassigned_urgent";
  if (ticket.sla === "breached") return "breached";
  if (ticket.sla === "at_risk") return "at_risk";
  if (ticket.stale) return "stale";
  if (ticket.sla === "bad_date") return "bad_date";
  return "";
}

// True when only a lead digest can carry this ticket: no owner on the Agents
// tab, or a lead-only section (unassigned urgent, unreadable dates).
function leadOnly(ticket) {
  var section = digestSection(ticket);
  return !!section && (!ticket.owner || LEAD_ONLY_SECTIONS.indexOf(section) !== -1);
}

// "" when every alert can reach someone. Otherwise the error to show: with no
// lead on the Agents tab, lead-only tickets (like an unassigned lost card)
// would reach nobody, and "Nothing to report" would be false.
function missingLeadError(tickets, agents, lang) {
  var hasLead = agents.some(function (a) { return a.role === "lead"; });
  if (hasLead) return "";
  var stuck = tickets.filter(leadOnly);
  if (!stuck.length) return "";
  var urgent = stuck.filter(function (tk) { return tk.priority === "urgent"; }).length;
  return t(lang, "error.no_lead", { count: stuck.length, urgent: urgent });
}

// Data-row positions of every ticket in the digests that were sent, so Last
// alerted is stamped only on tickets someone was actually told about.
function alertedRows(digests) {
  var rows = [];
  digests.forEach(function (d) {
    d.rows.forEach(function (row) { if (rows.indexOf(row) === -1) rows.push(row); });
  });
  return rows;
}

// Group tickets into sections. kind "lead" sees every alerted ticket,
// kind "agent" only the ones they own (the unassigned section is lead-only).
function groupForDigest(tickets, kind, agent) {
  var groups = {};
  sortForAttention(tickets).forEach(function (tk) {
    var section = digestSection(tk);
    if (!section) return;
    var mine = tk.owner && tk.owner.email === agent.email;
    if (kind === "agent" && (!mine || LEAD_ONLY_SECTIONS.indexOf(section) !== -1)) return;
    (groups[section] = groups[section] || []).push(tk);
  });
  return DIGEST_SECTIONS
    .filter(function (key) { return groups[key]; })
    .map(function (key) { return { key: key, tickets: groups[key] }; });
}

// Fixed reminder lines for the categories in this digest, in a fixed order.
function remindersFor(tickets, lang) {
  var keys = [];
  CATEGORIES.forEach(function (category) {
    var key = CATEGORY_REMINDERS[category];
    if (!key || keys.indexOf(key) !== -1) return;
    if (tickets.some(function (tk) { return tk.category === category; })) keys.push(key);
  });
  return keys.map(function (key) { return t(lang, key); });
}

// The cells shown for one ticket, already in the reader's language.
function ticketCells(tk, lang) {
  var priority = t(lang, "priority." + tk.priority);
  if (tk.raisedFrom) {
    priority += " (" + t(lang, "digest.raised", { from: t(lang, "priority." + tk.raisedFrom) }) + ")";
  }
  return {
    id: tk.id,
    category: tk.category ? t(lang, "category." + tk.category) : maskSensitive(tk.categoryText).text,
    priority: priority,
    owner: tk.owner ? tk.owner.name : t(lang, "digest.unassigned"),
    due: t(lang, "digest.due", { due: tk.slaDue }),
    customer: tk.customerId,
    subject: tk.subject,
  };
}

// One digest for one recipient, or null when there is nothing to report.
// kind is "lead" or "agent"; lang defaults to the recipient's language.
function buildDigest(kind, recipient, tickets, now, lang) {
  lang = lang || recipient.language;
  var sections = groupForDigest(tickets, kind, recipient);
  if (!sections.length) return null;
  var listed = [];
  sections.forEach(function (s) { listed = listed.concat(s.tickets); });
  var date = String(now).slice(0, 10);
  var digest = {
    kind: kind,
    to: recipient.email,
    name: recipient.name,
    language: lang,
    subject: tCount(lang, "digest.subject", listed.length, { date: date }),
    intro: kind === "lead" ? t(lang, "digest.lead_intro") : tCount(lang, "digest.intro", listed.length),
    sections: sections.map(function (s) {
      return {
        title: t(lang, "digest.section." + s.key),
        rows: s.tickets.map(function (tk) { return ticketCells(tk, lang); }),
      };
    }),
    reminders: remindersFor(listed, lang),
    ticketIds: listed.map(function (tk) { return tk.id; }),
    rows: listed.map(function (tk) { return tk.row; }),
  };
  digest.text = digestText(digest, lang);
  digest.html = digestHtml(digest, lang);
  return digest;
}

// Every digest for today: each lead gets the team view, each agent their own.
function buildDigests(tickets, agents, now) {
  var digests = [];
  agents.forEach(function (agent) {
    var digest = buildDigest(agent.role === "lead" ? "lead" : "agent", agent, tickets, now);
    if (digest) digests.push(digest);
  });
  return digests;
}

function digestText(d, lang) {
  var lines = [t(lang, "digest.greeting", { name: d.name }), "", d.intro];
  d.sections.forEach(function (s) {
    lines.push("", s.title);
    s.rows.forEach(function (r) {
      lines.push("- " + [r.id, r.category, r.priority, r.owner, r.due, r.customer].join(" | "));
      lines.push("  \"" + r.subject + "\"");
    });
  });
  if (d.reminders.length) {
    lines.push("", t(lang, "digest.reminders"));
    d.reminders.forEach(function (r) { lines.push("- " + r); });
  }
  lines.push("", t(lang, "digest.footer"));
  return lines.join("\n") + "\n";
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function digestHtml(d, lang) {
  var e = escapeHtml;
  var cellStyle = ' style="border:1px solid #ccc;padding:4px 8px;text-align:left"';
  var headers = ["ticket_id", "category", "priority", "assignee", "sla_due", "customer_id", "subject"];
  var html = ['<!DOCTYPE html>', '<html lang="' + e(lang) + '"><head><meta charset="utf-8">',
    '<title>' + e(d.subject) + '</title></head>',
    '<body style="font-family:Arial,sans-serif;font-size:14px;color:#222">',
    '<h2>' + e(d.subject) + '</h2>',
    '<p>' + e(t(lang, "digest.greeting", { name: d.name })) + '</p>',
    '<p>' + e(d.intro) + '</p>'];
  d.sections.forEach(function (s) {
    html.push('<h3>' + e(s.title) + '</h3>', '<table style="border-collapse:collapse"><tr>');
    headers.forEach(function (h) { html.push('<th' + cellStyle + '>' + e(t(lang, "header." + h)) + '</th>'); });
    html.push('</tr>');
    s.rows.forEach(function (r) {
      html.push('<tr>' + [r.id, r.category, r.priority, r.owner, r.due, r.customer, r.subject]
        .map(function (v) { return '<td' + cellStyle + '>' + e(v) + '</td>'; }).join("") + '</tr>');
    });
    html.push('</table>');
  });
  if (d.reminders.length) {
    html.push('<h3>' + e(t(lang, "digest.reminders")) + '</h3><ul>');
    d.reminders.forEach(function (r) { html.push('<li>' + e(r) + '</li>'); });
    html.push('</ul>');
  }
  html.push('<p style="color:#666;font-size:12px">' + e(t(lang, "digest.footer")) + '</p>', '</body></html>');
  return html.join("\n") + "\n";
}
