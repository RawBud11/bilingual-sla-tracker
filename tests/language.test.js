import { expect, test } from "vitest";
import { loadSrc } from "./load.js";

const s = loadSrc();

test.each([
  ["My transfer is still pending", "en"],
  ["I can't log in to my account", "en"],
  ["No puedo entrar a mi cuenta", "es"],
  ["¿Dónde encuentro mi formulario 1099?", "es"],
  // Spanish typed without accents still counts as Spanish.
  ["no me llega el codigo y la contrasena no sirve", "es"],
  ["Hola, my card was charged twice y no sé por qué, please help", "mixed"],
  ["me hicieron un charge que no reconozco", "es"],
  ["1099", "other"],
  ["", "other"],
])("%s -> %s", (text, expected) => {
  expect(s.detectLanguage(text)).toBe(expected);
});
