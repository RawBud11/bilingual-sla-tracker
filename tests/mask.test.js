// Masking card numbers, CVVs, one-time codes and labeled passwords, EN and ES.
import { describe, expect, test } from "vitest";
import { loadSrc } from "./load.js";

const s = loadSrc();
const mask = (text) => s.maskSensitive(text).text;

describe("masks sensitive data", () => {
  test.each([
    ["my card 0000 1234 5678 9012", "my card [CARD NUMBER MASKED]"],
    ["mi tarjeta 0000-1234-5678-9012 no sirve", "mi tarjeta [CARD NUMBER MASKED] no sirve"],
    ["CVV 123", "CVV [CODE MASKED]"],
    ["el cvc es 1234", "el cvc es [CODE MASKED]"],
    ["código de seguridad: 987", "código de seguridad: [CODE MASKED]"],
    ["el código es 482913", "el código es [CODE MASKED]"],
    ["my verification code is 123 456", "my verification code is [CODE MASKED]"],
    ["PIN: 4821", "PIN: [CODE MASKED]"],
    ["mi contraseña es Girasol2024", "mi contraseña es [PASSWORD MASKED]"],
    ["my password is Sunflower2024!", "my password is [PASSWORD MASKED]"],
    ["contrasena: Girasol2024", "contrasena: [PASSWORD MASKED]"],
  ])("%s", (input, expected) => {
    expect(mask(input)).toBe(expected);
  });

  test("counts every item masked", () => {
    expect(s.maskSensitive("card 0000 1234 5678 9012, CVV 123, code 482913").count).toBe(3);
  });
});

describe("leaves normal text alone", () => {
  test.each([
    "Transfer of $1,250.00 still pending",
    "Ticket T-1042 for customer C-1042",
    "Where is my 1099 form?",
    "my password is wrong",
    "mi contraseña es incorrecta",
    "No me llega el código",
    "",
  ])("%s", (input) => {
    expect(mask(input)).toBe(input);
  });

  test("known limit kept from mask.py: 'error code 5003' is masked too", () => {
    // Hiding too much is safer than too little (see NOTES.md).
    expect(mask("error code 5003")).toBe("error code [CODE MASKED]");
  });

  test("null and numbers do not crash", () => {
    expect(mask(null)).toBe("");
    expect(mask(12345)).toBe("12345");
  });
});
