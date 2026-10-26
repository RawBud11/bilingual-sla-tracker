// Ticket subjects for the synthetic demo data, per category, in English and
// Spanish (tú register, neutral Latin American Spanish). Puentara is fictional.
// No real names, card numbers or codes here: the few subjects with fake card
// numbers, codes and passwords are added on purpose in make-tickets.js.

export const SUBJECTS = {
  account_access: {
    en: ["Can't log in to my account", "Locked out after too many tries", "Login page keeps loading", "The app logged me out and won't let me back in"],
    es: ["No puedo entrar a mi cuenta", "Mi cuenta quedó bloqueada", "La app no me deja iniciar sesión", "Me sacó de la cuenta y no puedo volver a entrar"],
  },
  identity_verification: {
    en: ["My ID photo was rejected", "Verification stuck on pending", "How long does identity check take?", "The selfie step fails every time"],
    es: ["Rechazaron la foto de mi documento", "La verificación sigue en revisión", "¿Cuánto tarda la verificación de identidad?", "Falla el paso de la selfie"],
  },
  card_lost_stolen: {
    en: ["I lost my debit card", "My card was stolen", "Can't find my card, please block it"],
    es: ["Perdí mi tarjeta de débito", "Me robaron la tarjeta", "No encuentro mi tarjeta, quiero bloquearla"],
  },
  transfer_failed_pending: {
    en: ["Transfer still pending after 2 days", "My transfer failed but money left my account", "Client says payment never arrived", "Transfer to Mexico is stuck"],
    es: ["Mi transferencia sigue pendiente", "La transferencia falló pero el dinero salió", "Mi cliente dice que no le llegó el pago", "La transferencia a Colombia no avanza"],
  },
  charge_dispute: {
    en: ["I don't recognize a charge", "Charged twice for the same order", "Merchant won't refund me", "Dispute a subscription charge"],
    es: ["No reconozco un cobro", "Me cobraron dos veces lo mismo", "El comercio no me quiere devolver el dinero", "Quiero disputar un cobro de suscripción"],
  },
  fees: {
    en: ["Why was I charged a fee?", "Question about the international transfer fee", "My monthly fee showed up twice"],
    es: ["¿Por qué me cobraron una comisión?", "Duda sobre la comisión por transferencia internacional", "Me salió dos veces la cuota mensual"],
  },
  tax_forms: {
    en: ["Where is my 1099 form?", "Need my yearly statement for taxes", "Wrong name on my tax form"],
    es: ["¿Dónde encuentro mi formulario 1099?", "Necesito el estado de cuenta anual para impuestos", "Mi nombre sale mal en el formulario fiscal"],
  },
  app_bug: {
    en: ["App crashes when I open invoices", "Balance doesn't update", "Can't upload receipts", "Dark mode text is unreadable"],
    es: ["La app se cierra al abrir facturas", "El saldo no se actualiza", "No puedo subir comprobantes", "En modo oscuro no se lee el texto"],
  },
  general_question: {
    en: ["How do I add a second user?", "Can I change my business name?", "Do you support invoices in pesos?"],
    es: ["¿Cómo agrego a otro usuario?", "¿Puedo cambiar el nombre de mi negocio?", "¿Puedo hacer facturas en pesos?"],
  },
};

// Hand-picked rows that show each rule in the demo. Times are in the team
// time zone; "now" for the demo is Friday 2026-10-23 10:00.
export const SPECIAL_TICKETS = [
  // Unassigned urgent, already alerted at 07:30: alerted again on every run until owned.
  { createdAt: "2026-10-23 06:40", category: "card_lost_stolen", lang: "es", subject: "Me robaron la tarjeta anoche y veo compras que no hice", priority: "urgent", status: "new", assignee: "", lastAlerted: "2026-10-23 07:30" },
  // Unassigned urgent, at risk (50 of 60 minutes used).
  { createdAt: "2026-10-23 09:10", category: "account_access", lang: "en", subject: "Someone changed my email and I can't log in", priority: "urgent", status: "new", assignee: "" },
  // Lost card typed as "Low": the floor makes it urgent, so it is breached.
  { createdAt: "2026-10-23 08:15", category: "card_lost_stolen", lang: "en", subject: "Lost my card at the airport", priority: "low", status: "open", assignee: "Sam Demo" },
  // Created Friday 17:30 with 4 business hours: due Monday 11:30, answered in time.
  { createdAt: "2026-10-16 17:30", category: "transfer_failed_pending", lang: "es", subject: "Mi transferencia sigue pendiente desde el viernes", priority: "high", status: "resolved", assignee: "Mateo Demo", firstResponseAt: "2026-10-19 09:40", lastUpdateAt: "2026-10-19 15:10" },
  // Subjects with fake sensitive data: the digests must show them masked.
  { createdAt: "2026-10-22 15:00", category: "charge_dispute", lang: "en", subject: "Charged twice on card 0000 1234 5678 9012, CVV 123 is on the back", priority: "high", status: "open", assignee: "Jordan Demo" },
  { createdAt: "2026-10-22 17:00", category: "identity_verification", lang: "es", subject: "El código es 482913 y la app dice que expiró", priority: "high", status: "open", assignee: "Mateo Demo" },
  { createdAt: "2026-10-22 16:30", category: "account_access", lang: "", subject: "No puedo entrar, mi contraseña es Girasol2024", priority: "high", status: "open", assignee: "Mateo Demo" },
  // Waiting on customer: three stale (over 2 business days), one recent.
  { createdAt: "2026-10-16 10:00", category: "tax_forms", lang: "en", subject: "Which tax form do I need as a freelancer?", priority: "normal", status: "waiting", assignee: "Jordan Demo", firstResponseAt: "2026-10-16 11:20", lastUpdateAt: "2026-10-19 11:00" },
  { createdAt: "2026-10-19 14:00", category: "fees", lang: "es", subject: "No entiendo la comisión de mi último retiro", priority: "normal", status: "waiting", assignee: "Mateo Demo", firstResponseAt: "2026-10-19 15:00", lastUpdateAt: "2026-10-20 09:00" },
  { createdAt: "2026-10-20 10:30", category: "charge_dispute", lang: "es", subject: "Quiero disputar un cobro de un hotel", priority: "high", status: "waiting", assignee: "Lucía Demo", firstResponseAt: "2026-10-20 11:15", lastUpdateAt: "2026-10-20 16:00" },
  { createdAt: "2026-10-21 09:00", category: "app_bug", lang: "en", subject: "Export to CSV gives an empty file", priority: "normal", status: "waiting", assignee: "Sam Demo", firstResponseAt: "2026-10-21 10:30", lastUpdateAt: "2026-10-21 14:00" },
  // Breached but already alerted today: skipped until tomorrow (no same-day repeats).
  { createdAt: "2026-10-21 09:00", category: "general_question", lang: "en", subject: "Can I schedule payments for next month?", priority: "low", status: "open", assignee: "Jordan Demo", lastAlerted: "2026-10-23 07:30" },
  // Sunday night ticket: the business clock starts Monday 08:00.
  { createdAt: "2026-10-18 21:00", category: "fees", lang: "en", subject: "Weekend transfer fee looks wrong", priority: "normal", status: "resolved", assignee: "Sam Demo", firstResponseAt: "2026-10-19 10:00", lastUpdateAt: "2026-10-19 12:00" },
];

export const AGENTS = [
  { name: "Lucía Demo", email: "lucia.demo@example.com", language: "es", role: "lead" },
  { name: "Mateo Demo", email: "mateo.demo@example.com", language: "es", role: "agent" },
  { name: "Sam Demo", email: "sam.demo@example.com", language: "en", role: "agent" },
  { name: "Jordan Demo", email: "jordan.demo@example.com", language: "en", role: "agent" },
];
