// Ported from bilingual-faq-chatbot (chatbot/language.py) to JavaScript.
// Same word lists and rules; not imported across repos.
//
// Detect whether a ticket subject is English, Spanish, both, or neither.
// No extra library: count common English and Spanish words, and give Spanish
// a point for each word with an accent, ñ, ¿ or ¡. Words that exist in both
// languages ("no", "me", "a") are left out on purpose.
// Used to fill an empty Language column, so each ticket is counted in the
// right language in the weekly summary.

var EN_WORDS = toWordSet(
  "the and is are was were my i you your it its to of in for on with this that " +
  "have has had not cant can't dont don't didnt didn't doesnt doesn't wont won't " +
  "why what how when where do does did be been please thanks thank help hi hello " +
  "card account money charge charged payment transfer still yet never again from " +
  "at but there they we will would can get got know just an if or so after since " +
  "also need want which any all some it's im i'm sent pending login password");

var ES_WORDS = toWordSet(
  "el la los las del que y en un una es mi mis por para con se lo le su al pero " +
  "como cuando donde porque ya sin hay yo tu tengo puedo quiero necesito ayuda " +
  "tarjeta cuenta dinero cobro cargo pago transferencia gracias hola favor sigue " +
  "desde todavia nunca otra vez esta este estoy son fue muy mas hace dice pasa " +
  "dias cuanto cual tienen llega llego robaron perdi contrasena hicieron pedi");

var SPANISH_MARKS = "áéíóúñ¿¡";

function toWordSet(words) {
  var set = {};
  words.split(/\s+/).forEach(function (w) { if (w) set[w] = true; });
  return set;
}

// Lowercase and remove accents, so "Contraseña" and "contrasena" match.
function stripAccents(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// [englishScore, spanishScore] for a piece of text.
function languageScores(text) {
  var words = stripAccents(text).match(/[a-z']+/g) || [];
  var en = 0, es = 0;
  words.forEach(function (w) {
    if (EN_WORDS[w] === true) en++;
    if (ES_WORDS[w] === true) es++;
  });
  String(text || "").toLowerCase().split(/\s+/).forEach(function (w) {
    for (var i = 0; i < w.length; i++) {
      if (SPANISH_MARKS.indexOf(w[i]) !== -1) { es++; return; }
    }
  });
  return [en, es];
}

// "en", "es", "mixed" or "other".
function detectLanguage(text) {
  var scores = languageScores(text);
  var en = scores[0], es = scores[1];
  if (en === 0 && es === 0) return "other";
  // Mixed only when both languages are really there, not one borrowed word
  // like "me hicieron un charge" (that is Spanish with an English noun).
  if (Math.min(en, es) >= 2 && Math.min(en, es) / Math.max(en, es) >= 0.5) return "mixed";
  if (en === es) return "mixed";
  return en > es ? "en" : "es";
}
