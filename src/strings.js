// Every text the tracker shows, in English and Spanish, in one place.
// Spanish: neutral Latin American Spanish, "tú" for the Puentara team.
// Keys are the same in both languages (a test checks this).
// "{name}" placeholders are filled by t(). Keys ending in "_one" / "_other"
// are singular / plural forms picked by tCount().

var STRINGS = {
  en: {
    "category.account_access": "Account access",
    "category.identity_verification": "Identity verification",
    "category.card_lost_stolen": "Card lost or stolen",
    "category.transfer_failed_pending": "Failed or pending transfer",
    "category.charge_dispute": "Charge dispute",
    "category.fees": "Fees",
    "category.tax_forms": "Tax forms",
    "category.app_bug": "App bug",
    "category.general_question": "General question",

    "priority.low": "Low",
    "priority.normal": "Normal",
    "priority.high": "High",
    "priority.urgent": "Urgent",

    "status.new": "New",
    "status.open": "Open",
    "status.waiting": "Waiting on customer",
    "status.resolved": "Resolved",

    "sla.ok": "OK",
    "sla.at_risk": "At risk",
    "sla.breached": "Breached",
    "sla.met": "Met",
    "sla.missed": "Missed",
    "sla.bad_date": "Check dates",

    "language.en": "English",
    "language.es": "Spanish",
    "language.mixed": "Mixed",
    "language.other": "Other",

    "channel.email": "Email",
    "channel.chat": "Chat",
    "channel.phone": "Phone",

    "role.agent": "Agent",
    "role.lead": "Lead",

    "header.ticket_id": "Ticket ID",
    "header.created_at": "Created",
    "header.customer_id": "Customer ID",
    "header.channel": "Channel",
    "header.language": "Language",
    "header.subject": "Subject",
    "header.category": "Category",
    "header.priority": "Priority",
    "header.status": "Status",
    "header.assignee": "Assignee",
    "header.first_response_at": "First response",
    "header.last_update_at": "Last update",
    "header.sla_due": "SLA due",
    "header.sla_status": "SLA status",
    "header.last_alerted": "Last alerted",
    "header.name": "Name",
    "header.email": "Email address",
    "header.role": "Role",

    "tab.tickets": "Tickets",
    "tab.agents": "Agents",
    "tab.preview": "Digest preview",
    "tab.summary": "Weekly summary",
    "preview.to": "To",
    "preview.body": "Message",

    "menu.title": "Puentara Support",
    "menu.check": "Check SLAs now",
    "menu.send": "Send digests",
    "menu.trigger": "Install daily trigger",

    "digest.subject_one": "Puentara support: 1 ticket needs attention ({date})",
    "digest.subject_other": "Puentara support: {count} tickets need attention ({date})",
    "digest.greeting": "Hi {name},",
    "digest.intro_one": "You have 1 ticket that needs attention today.",
    "digest.intro_other": "You have {count} tickets that need attention today.",
    "digest.lead_intro": "Team view for today. Unassigned urgent tickets come first.",
    "digest.section.unassigned_urgent": "Unassigned urgent: assign now",
    "digest.section.breached": "Breached: past the first-response target",
    "digest.section.at_risk": "At risk: 75% of the response time used",
    "digest.section.stale": "Waiting on customer for over 2 business days: follow up or close",
    "digest.section.bad_date": "Check the dates: Created or First response can't be read",
    "digest.due": "due {due}",
    "digest.unassigned": "unassigned",
    "digest.raised": "raised from {from}",
    "digest.reminders": "Reminders",
    "digest.footer": "Sent by the Puentara support tracker (fictional demo company). Times are in the team time zone.",

    "reminder.charge_dispute": "Charge dispute: collect the facts, explain next steps and timeline. Don't promise an outcome.",
    "reminder.urgent_human": "Card lost or stolen, account access: urgent, a person handles this. Use the secure channel.",
    "reminder.tax_forms": "Tax forms: no tax advice. Point to official resources.",

    "summary.title": "Weekly summary, {start} to {end}",
    "summary.group": "Group",
    "summary.opened": "Opened",
    "summary.met": "First response met",
    "summary.missed": "First response missed",
    "summary.open_now": "Open now",
    "summary.stale": "Stale follow-ups",
    "summary.total": "Total",

    "console.banner": "DRY RUN: nothing is emailed. Puentara is a fictional company and all data is synthetic.",
    "console.now": "Clock: {now} (team time zone)",
    "console.open_tickets": "Open tickets, most urgent first",
    "console.counts": "Breached: {breached}   At risk: {at_risk}   Stale follow-ups: {stale}   Unassigned urgent: {unassigned}",
    "console.follow_up": "follow up or close",
    "console.alerted_today": "already alerted today",
    "console.raised_one": "1 ticket had its priority raised to the category minimum.",
    "console.raised_other": "{count} tickets had their priority raised to the category minimum.",
    "console.digests": "{count} digests written to {dir} (DRY RUN, nothing emailed)",
    "console.files": "Files written:",
    "console.summary": "Weekly summary (sample data)",
    "console.sample_data": "(sample data)",

    "error.missing_columns": "Missing column(s): {columns}. Add them to the header row (English or Spanish names both work).",
    "error.no_tickets_tab": "No \"{tab}\" tab found. Run setupTracker from the Apps Script editor first.",
    "error.no_lead": "No one on the Agents tab has Role = Lead, so {count} ticket(s) without an owner or with unreadable dates ({urgent} urgent) can't be alerted. Set Role to Lead for at least one person.",
    "error.no_agents": "The Agents tab has no rows. Add at least one agent with an email address.",
    "done.check_one": "SLAs checked: 1 ticket.",
    "done.check_other": "SLAs checked: {count} tickets.",
    "done.preview_one": "DRY RUN: 1 digest written to the \"{tab}\" tab. Nothing was emailed.",
    "done.preview_other": "DRY RUN: {count} digests written to the \"{tab}\" tab. Nothing was emailed.",
    "done.sent_one": "1 digest emailed.",
    "done.sent_other": "{count} digests emailed.",
    "done.nothing": "Nothing to report today. No digests.",
    "done.trigger": "Daily trigger installed: digests run every day around 07:30 (team time zone).",
    "done.setup": "Tracker set up. Add your agents on the \"{tab}\" tab.",
  },

  es: {
    "category.account_access": "Acceso a la cuenta",
    "category.identity_verification": "Verificación de identidad",
    "category.card_lost_stolen": "Tarjeta perdida o robada",
    "category.transfer_failed_pending": "Transferencia fallida o pendiente",
    "category.charge_dispute": "Disputa de cargo",
    "category.fees": "Comisiones",
    "category.tax_forms": "Formularios fiscales",
    "category.app_bug": "Error en la app",
    "category.general_question": "Pregunta general",

    "priority.low": "Baja",
    "priority.normal": "Media",
    "priority.high": "Alta",
    "priority.urgent": "Urgente",

    "status.new": "Nuevo",
    "status.open": "Abierto",
    "status.waiting": "Esperando al cliente",
    "status.resolved": "Resuelto",

    "sla.ok": "A tiempo",
    "sla.at_risk": "En riesgo",
    "sla.breached": "Vencido",
    "sla.met": "Cumplido",
    "sla.missed": "No cumplido",
    "sla.bad_date": "Revisa las fechas",

    "language.en": "Inglés",
    "language.es": "Español",
    "language.mixed": "Mixto",
    "language.other": "Otro",

    "channel.email": "Correo",
    "channel.chat": "Chat en vivo",
    "channel.phone": "Teléfono",

    "role.agent": "Agente",
    "role.lead": "Líder",

    "header.ticket_id": "ID del ticket",
    "header.created_at": "Creado",
    "header.customer_id": "ID del cliente",
    "header.channel": "Canal",
    "header.language": "Idioma",
    "header.subject": "Asunto",
    "header.category": "Categoría",
    "header.priority": "Prioridad",
    "header.status": "Estado",
    "header.assignee": "Asignado a",
    "header.first_response_at": "Primera respuesta",
    "header.last_update_at": "Última actualización",
    "header.sla_due": "Vence el SLA",
    "header.sla_status": "Estado del SLA",
    "header.last_alerted": "Última alerta",
    "header.name": "Nombre",
    "header.email": "Correo electrónico",
    "header.role": "Rol",

    "tab.tickets": "Solicitudes",
    "tab.agents": "Agentes",
    "tab.preview": "Vista previa de resúmenes",
    "tab.summary": "Resumen semanal",
    "preview.to": "Para",
    "preview.body": "Mensaje",

    "menu.title": "Soporte Puentara",
    "menu.check": "Revisar SLA ahora",
    "menu.send": "Enviar resúmenes",
    "menu.trigger": "Activar envío diario",

    "digest.subject_one": "Soporte Puentara: 1 ticket necesita atención ({date})",
    "digest.subject_other": "Soporte Puentara: {count} tickets necesitan atención ({date})",
    "digest.greeting": "Hola, {name}:",
    "digest.intro_one": "Tienes 1 ticket que necesita atención hoy.",
    "digest.intro_other": "Tienes {count} tickets que necesitan atención hoy.",
    "digest.lead_intro": "Vista del equipo para hoy. Primero van los tickets urgentes sin asignar.",
    "digest.section.unassigned_urgent": "Urgentes sin asignar: asígnalos ya",
    "digest.section.breached": "Vencidos: pasaron el tiempo de primera respuesta",
    "digest.section.at_risk": "En riesgo: ya se usó el 75 % del tiempo de respuesta",
    "digest.section.stale": "Esperando al cliente hace más de 2 días hábiles: responde o cierra",
    "digest.section.bad_date": "Revisa las fechas: no se puede leer Creado o Primera respuesta",
    "digest.due": "vence {due}",
    "digest.unassigned": "sin asignar",
    "digest.raised": "subió desde {from}",
    "digest.reminders": "Recordatorios",
    "digest.footer": "Enviado por la hoja de seguimiento de soporte de Puentara (empresa ficticia de demostración). Las horas están en la zona horaria del equipo.",

    "reminder.charge_dispute": "Disputa de cargo: reúne los hechos y explica los próximos pasos y los plazos. No prometas un resultado.",
    "reminder.urgent_human": "Tarjeta perdida o robada, acceso a la cuenta: es urgente y lo atiende una persona. Usa el canal seguro.",
    "reminder.tax_forms": "Formularios fiscales: no des asesoría fiscal. Indica los recursos oficiales.",

    "summary.title": "Resumen semanal, del {start} al {end}",
    "summary.group": "Grupo",
    "summary.opened": "Recibidos",
    "summary.met": "Primera respuesta a tiempo",
    "summary.missed": "Primera respuesta tarde",
    "summary.open_now": "Pendientes ahora",
    "summary.stale": "Seguimientos atrasados",
    "summary.total": "Total general",

    "console.banner": "SIMULACIÓN: no se envía ningún correo. Puentara es una empresa ficticia y todos los datos son sintéticos.",
    "console.now": "Reloj: {now} (zona horaria del equipo)",
    "console.open_tickets": "Tickets pendientes, los más urgentes primero",
    "console.counts": "Vencidos: {breached}   En riesgo: {at_risk}   Seguimientos atrasados: {stale}   Urgentes sin asignar: {unassigned}",
    "console.follow_up": "responde o cierra",
    "console.alerted_today": "ya se avisó hoy",
    "console.raised_one": "A 1 ticket se le subió la prioridad al mínimo de su categoría.",
    "console.raised_other": "A {count} tickets se les subió la prioridad al mínimo de su categoría.",
    "console.digests": "{count} resúmenes guardados en {dir} (SIMULACIÓN, no se envió ningún correo)",
    "console.files": "Archivos generados:",
    "console.summary": "Resumen semanal (datos de muestra)",
    "console.sample_data": "(datos de muestra)",

    "error.missing_columns": "Faltan columnas: {columns}. Agrégalas a la fila de encabezados (sirven los nombres en inglés o en español).",
    "error.no_tickets_tab": "No se encontró la pestaña \"{tab}\". Primero ejecuta setupTracker desde el editor de Apps Script.",
    "error.no_lead": "Nadie en la pestaña Agentes tiene Rol = Líder, así que {count} ticket(s) sin responsable o con fechas ilegibles (urgentes: {urgent}) no se pueden avisar. Pon Rol = Líder a al menos una persona.",
    "error.no_agents": "La pestaña Agentes está vacía. Agrega al menos un agente con su correo.",
    "done.check_one": "SLA revisados: 1 ticket.",
    "done.check_other": "SLA revisados: {count} tickets.",
    "done.preview_one": "SIMULACIÓN: 1 resumen en la pestaña \"{tab}\". No se envió ningún correo.",
    "done.preview_other": "SIMULACIÓN: {count} resúmenes en la pestaña \"{tab}\". No se envió ningún correo.",
    "done.sent_one": "Se envió 1 resumen por correo.",
    "done.sent_other": "Se enviaron {count} resúmenes por correo.",
    "done.nothing": "Hoy no hay nada que reportar. No se generaron resúmenes.",
    "done.trigger": "Envío diario activado: los resúmenes salen todos los días hacia las 07:30 (zona horaria del equipo).",
    "done.setup": "Hoja lista. Agrega a tu equipo en la pestaña \"{tab}\".",
  },
};

// Return the text for `key` in `lang` ("en" or "es"), with {placeholders} filled.
// Unknown languages fall back to English; a missing key shows the key itself
// so the gap is visible instead of crashing a daily run.
function t(lang, key, vars) {
  var table = STRINGS[lang] || STRINGS.en;
  var text = key in table ? table[key] : key;
  return text.replace(/\{(\w+)\}/g, function (whole, name) {
    return vars && name in vars ? String(vars[name]) : whole;
  });
}

// Singular or plural form: tCount("en", "digest.intro", 3) uses "digest.intro_other".
function tCount(lang, key, count, vars) {
  var all = Object.assign({ count: count }, vars || {});
  return t(lang, key + (count === 1 ? "_one" : "_other"), all);
}

// Lowercase, no accents, single spaces: "Categoría " and "categoria" match.
function foldText(text) {
  return String(text == null ? "" : text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Find the id behind a cell value: "Tarjeta perdida o robada", "card lost or
// stolen" and "card_lost_stolen" all give "card_lost_stolen". Returns "" when
// nothing matches.
function idFromLabel(kind, value, ids) {
  var folded = foldText(value);
  if (!folded) return "";
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if (folded === id || folded === foldText(STRINGS.en[kind + "." + id]) ||
        folded === foldText(STRINGS.es[kind + "." + id])) {
      return id;
    }
  }
  return "";
}
