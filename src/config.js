// Settings in one place: business hours, SLA targets, categories, columns.
// Puentara is a fictional company used for this demo.
//
// Why `var` and plain top-level declarations everywhere in src/: Google Apps
// Script loads every file into one shared global scope, with no import or
// require. The tests load these files the same way (see tests/load.js).

// --- Business hours (team time zone) --------------------------------------
// Mon-Fri 08:00-18:00. Days use JavaScript numbering: 0 = Sunday, 6 = Saturday.
var BUSINESS_DAYS = [1, 2, 3, 4, 5];
var BUSINESS_START_MINUTE = 8 * 60;  // 08:00
var BUSINESS_END_MINUTE = 18 * 60;   // 18:00
var BUSINESS_DAY_MINUTES = BUSINESS_END_MINUTE - BUSINESS_START_MINUTE;

// --- First-response SLA per priority --------------------------------------
// clock "24/7": wall-clock minutes, nights and weekends count (urgent cases
// like a lost card cannot wait for Monday). clock "business": only business
// minutes count.
var SLA_TARGETS = {
  urgent: { minutes: 60, clock: "24/7" },
  high: { minutes: 4 * 60, clock: "business" },
  normal: { minutes: 8 * 60, clock: "business" },
  low: { minutes: 16 * 60, clock: "business" },
};

// A ticket is "At risk" once 75% of its first-response time is used.
var AT_RISK_FRACTION = 0.75;

// "Waiting on customer" for more than this many business days: follow up or close.
var FOLLOW_UP_BUSINESS_DAYS = 2;

// --- Categories and priorities --------------------------------------------
// Same categories as the other Puentara projects (bilingual-ticket-triage).
var CATEGORIES = [
  "account_access",
  "identity_verification",
  "card_lost_stolen",
  "transfer_failed_pending",
  "charge_dispute",
  "fees",
  "tax_forms",
  "app_bug",
  "general_question",
];

var PRIORITIES = ["low", "normal", "high", "urgent"]; // lowest to highest

// Priority used when the Priority cell is empty or not recognized.
// Same defaults as the ROUTING table in bilingual-ticket-triage.
var CATEGORY_DEFAULT_PRIORITY = {
  card_lost_stolen: "urgent",
  charge_dispute: "high",
  account_access: "high",
  identity_verification: "high",
  transfer_failed_pending: "high",
  fees: "normal",
  tax_forms: "normal",
  app_bug: "normal",
  general_question: "low",
};
var FALLBACK_PRIORITY = "normal"; // category empty or unknown

// Minimum priority per category. Anyone can raise a priority, nobody can set
// it below this. A lost card marked "low" is still treated as urgent.
var CATEGORY_PRIORITY_FLOOR = {
  card_lost_stolen: "urgent",
  charge_dispute: "high",
  account_access: "high",
  identity_verification: "high",
  transfer_failed_pending: "high",
};

var TICKET_STATUSES = ["new", "open", "waiting", "resolved"];
var LANGUAGES = ["en", "es", "mixed", "other"];
var CHANNELS = ["email", "chat", "phone"];

// --- Columns ----------------------------------------------------------------
// Tickets tab. Each column is found by its English or Spanish header (from
// strings.js) or by one of these extra names, so a sheet with either set of
// headers works. Add your own header names here if they differ.
var TICKET_COLUMNS = [
  "ticket_id", "created_at", "customer_id", "channel", "language", "subject",
  "category", "priority", "status", "assignee", "first_response_at",
  "last_update_at", "sla_due", "sla_status", "last_alerted",
];
var REQUIRED_TICKET_COLUMNS = [
  "ticket_id", "created_at", "subject", "category", "priority", "status", "assignee",
];
var EXTRA_COLUMN_ALIASES = {
  ticket_id: ["id", "ticket", "ticket number", "numero de ticket"],
  created_at: ["created at", "created time", "fecha de creacion", "creado el"],
  customer_id: ["customer", "cliente"],
  assignee: ["owner", "agent", "responsable", "agente"],
  first_response_at: ["first reply", "primera respuesta el"],
  last_update_at: ["updated", "last updated", "actualizado"],
};

// Agents tab. Digests go only to the emails listed here, never to customers.
var AGENT_COLUMNS = ["name", "email", "language", "role"];
var EXTRA_AGENT_ALIASES = {
  email: ["e-mail", "correo electronico"],
};

// Rows in the digest that each category adds a fixed reminder for.
var CATEGORY_REMINDERS = {
  charge_dispute: "reminder.charge_dispute",
  card_lost_stolen: "reminder.urgent_human",
  account_access: "reminder.urgent_human",
  tax_forms: "reminder.tax_forms",
};

// Weekly summary covers the 7 days up to "now".
var SUMMARY_DAYS = 7;
