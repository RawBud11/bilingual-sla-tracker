// Support-domain guardrails, English and Spanish:
// 1. No card numbers, CVVs, one-time codes or passwords in digests or the summary.
// 2. Digests go only to the Agents tab, never to a customer.
// 3. No text the tracker writes asks for a PIN, CVV, card number, password or code.
// 4. The dispute reminder promises no outcome.
// 5. The tax-forms reminder gives no advice and points to official resources.
import { describe, expect, test } from "vitest";
import { src, check, AGENTS, NOW } from "./helpers.js";

const SENSITIVE_SUBJECTS = {
  en: ["my card 0000 1234 5678 9012 was charged twice", "CVV 123 is on the back",
    "the code is 482913", "my password is Sunflower2024"],
  es: ["mi tarjeta 0000 1234 5678 9012 tiene dos cobros", "el CVV 123 está atrás",
    "el código es 482913", "mi contraseña es Girasol2024"],
};
const LEAKS = [
  /(?:\d[ .-]?){12,18}\d/, // a 13-19 digit run, with or without separators
  /cvv\s*123/i, /482913/, /Sunflower2024/, /Girasol2024/,
];

function everythingWritten(tickets, lang) {
  const texts = [];
  for (const agent of AGENTS) {
    for (const kind of ["lead", "agent"]) {
      const d = src.buildDigest(kind, agent, tickets, NOW, lang);
      if (d) texts.push(d.subject, d.text, d.html);
    }
  }
  texts.push(JSON.stringify(src.weeklySummary(tickets, NOW, lang)));
  return texts;
}

describe("1. no sensitive data in digests or the summary", () => {
  test.each(["en", "es"])("subjects in %s", (lang) => {
    const tickets = check(SENSITIVE_SUBJECTS[lang].map((subject, i) => ({
      ticket_id: "T-" + i, created_at: "2026-10-21 09:00", subject,
      assignee: i % 2 ? "Mateo Demo" : "", category: i % 2 ? "fees" : "card_lost_stolen",
    })), lang);
    const written = everythingWritten(tickets, lang);
    expect(written.join("\n")).toContain("[CARD NUMBER MASKED]");
    for (const text of written) {
      for (const leak of LEAKS) expect(text).not.toMatch(leak);
    }
  });
});

describe("2. digests never go to customers", () => {
  test("customer contact values never become recipients", () => {
    const customer = "cliente.demo42@example.com";
    const tickets = check([
      { customer_id: customer, assignee: customer, category: "card_lost_stolen", subject: `write to ${customer}` },
      { customer_id: "C-1042", assignee: "customer.demo7@example.com", created_at: "2026-10-21 09:00" },
      { customer_id: customer, assignee: "Sam Demo", created_at: "2026-10-21 09:00" },
    ]);
    const agentEmails = AGENTS.map((a) => a.email);
    const digests = src.buildDigests(tickets, AGENTS, NOW);
    expect(digests.length).toBeGreaterThan(0);
    for (const d of digests) expect(agentEmails).toContain(d.to);
    expect(digests.map((d) => d.to)).not.toContain(customer);
  });

  test("no agents, no digests", () => {
    const tickets = check([{ category: "card_lost_stolen", assignee: "" }]);
    expect(src.buildDigests(tickets, [], NOW)).toEqual([]);
  });
});

// Phrase-list check, same idea as bilingual-reply-assistant: a sentence fails
// when it has a request word AND a sensitive item. Accents are folded first.
const REQUEST = /\b(send|share|provide|give|tell|type|confirm|ask|request|reply with|what is|need)\b|\b(envia|envianos|manda|comparte|compartenos|dinos|dime|indicanos|escribe|confirma|pide|pidele|solicita|danos|dame|pasanos|necesitamos|cual es)\b/;
const SENSITIVE = /\b(pin|cvv2?|cvc|security code|password|passcode|one[- ]time code|code|otp|card number|full card|contrasena|clave|codigo|numero de (la |tu )?tarjeta)\b/;

function asksForSensitive(text) {
  return src.foldText(text).split(/[.!?\n¿¡:]+/)
    .filter((sentence) => REQUEST.test(sentence) && SENSITIVE.test(sentence));
}

describe("3. never asks for a PIN, CVV, card number, password or code", () => {
  test("the checker catches the obvious requests, EN and ES", () => {
    for (const bad of ["Ask the customer for their CVV.", "Send us your PIN.", "Pídele el código al cliente.",
      "Envíanos tu contraseña.", "Confirma el número de tu tarjeta."]) {
      expect(asksForSensitive(bad)).not.toEqual([]);
    }
  });

  test.each(["en", "es"])("every %s string in strings.js", (lang) => {
    for (const [key, value] of Object.entries(src.STRINGS[lang])) {
      expect(asksForSensitive(value), key).toEqual([]);
    }
  });

  test.each(["en", "es"])("every %s digest (customer subjects left out)", (lang) => {
    const tickets = check(["card_lost_stolen", "account_access", "identity_verification", "charge_dispute",
      "tax_forms", "fees"].map((category, i) => ({ ticket_id: "T-" + i, category, created_at: "2026-10-21 09:00",
      subject: "Subject " + i, assignee: i % 2 ? "Sam Demo" : "" })), lang);
    for (const agent of AGENTS) {
      for (const kind of ["lead", "agent"]) {
        const d = src.buildDigest(kind, agent, tickets, NOW, lang);
        if (!d) continue;
        const ours = d.text.split("\n").filter((line) => !line.startsWith('  "')).join("\n");
        expect(asksForSensitive(d.subject + "\n" + ours)).toEqual([]);
      }
    }
  });
});

describe("4. dispute reminder never promises an outcome", () => {
  const PROMISES = ["refund guaranteed", "guarantee", "we will refund", "you will get your money back",
    "will be refunded", "te devolveremos", "garantizamos", "garantizado", "reembolsaremos", "recuperaras"];

  test.each(["en", "es"])("%s", (lang) => {
    const text = src.foldText(src.t(lang, "reminder.charge_dispute"));
    for (const phrase of PROMISES) expect(text).not.toContain(phrase);
    // And it says the opposite, plainly.
    expect(text).toContain(lang === "en" ? "don't promise an outcome" : "no prometas un resultado");
  });
});

describe("5. tax forms: no advice, official resources", () => {
  test.each([["en", "official resources", "no tax advice"], ["es", "recursos oficiales", "no des asesoria fiscal"]])(
    "%s", (lang, resources, noAdvice) => {
      const text = src.foldText(src.t(lang, "reminder.tax_forms"));
      expect(text).toContain(resources);
      expect(text).toContain(noAdvice);
    });

  test("the reminder is in the digest when a tax ticket is", () => {
    const tickets = check([{ category: "Formularios fiscales", created_at: "2026-10-21 09:00" }], "es");
    const d = src.buildDigest("agent", AGENTS[2], tickets, NOW, "es");
    expect(d.text).toContain("Formularios fiscales: no des asesoría fiscal. Indica los recursos oficiales.");
  });
});

describe("lost cards and account takeover go to a person", () => {
  test.each([["en", "Card lost or stolen"], ["es", "Tarjeta perdida o robada"]])(
    "%s: urgent, alerted to the lead, reminder says a person handles it", (lang, category) => {
      const tickets = check([{ category, priority: lang === "en" ? "Low" : "Baja", assignee: "" }], lang);
      expect(tickets[0].priority).toBe("urgent");
      const d = src.buildDigest("lead", AGENTS[0], tickets, NOW, lang);
      expect(d.ticketIds).toEqual(["T-1"]);
      expect(d.reminders[0]).toContain(lang === "en" ? "a person handles this" : "lo atiende una persona");
    });
});
