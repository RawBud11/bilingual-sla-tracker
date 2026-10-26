// Ported from bilingual-faq-chatbot (chatbot/mask.py) to JavaScript.
// Same patterns for card numbers, CVVs, one-time codes and labeled passwords;
// not imported across repos. Email and phone masking from mask.py are left
// out: tracker rows hold customer IDs, not contact details.
//
// Why: customers paste card numbers and codes into ticket subjects. The
// digest emails and the weekly summary must never repeat them, so every
// subject goes through maskSensitive() before it is written anywhere.
// Limits (same as mask.py): names, account numbers and passwords typed with
// no label ("Sunflower2024! log me in") are NOT masked. PASSWORD_RE also
// hides punctuation stuck to the password, and CODE_RE can hide harmless
// numbers ("error code 5003"). Hiding too much is safer than too little.
// JavaScript note: \b only knows ASCII letters, so accented words are written
// out in full in the patterns below.

var CARD_MASK = "[CARD NUMBER MASKED]";
var CODE_MASK = "[CODE MASKED]";
var PASSWORD_MASK = "[PASSWORD MASKED]";

// 13 to 19 digits, optionally split by spaces, dashes or dots ("0000 1234 ...").
var CARD_RE = /(?<!\d)(?:\d[ .-]?){12,18}\d(?!\d)/g;

// "CVV 123", "cvc: 1234", "código de seguridad 123".
var CVV_RE = /\b(cvv2?|cvc|security code|c[oó]digo de seguridad)\b(\D{0,12}?)(\d{3,4})(?!\d)/gi;

// "code 482913", "el código es 482913", "PIN 1234", "OTP: 9921",
// and codes typed in two groups: "código 123 456", "code 123-456".
var CODE_RE = new RegExp(
  "\\b(one[- ]time code|verification code|otp|code|c[oó]digo|clave|pin|passcode|token)(?![a-z])" +
  "(\\D{0,25}?)(\\d{3,4}[ -]\\d{3,4}|\\d{4,8})(?!\\d)", "gi");

// A password typed after a label ("my password is Sunflower2024!",
// "contraseña: Girasol2024", "mi clave es ..."). Only the next word is hidden.
// Common words after "is" / "es" are left alone, so "my password is wrong"
// and "mi contraseña es incorrecta" stay readable.
var NOT_A_PASSWORD =
  "wrong|incorrect|invalid|not|expired|correct|right|too|still|being|blocked|locked|the|a|an|my" +
  "|same|old|new|fine|ok|okay|good|bad|weak|strong|case|different|working|broken|gone|missing" +
  "|required|needed|and|but|or|in|on|for|that|this|it|also|very|already|now|no|never|reset" +
  "|incorrecta|incorrecto|correcta|correcto|invalida|inválida|mala|malo|muy|demasiado|la|el|una" +
  "|un|mi|igual|misma|mismo|bloqueada|vieja|nueva|diferente|otra|corta|larga|segura|debil|débil" +
  "|que|y|o|pero|para|de|en|ya|ahora|tambien|también|nunca";
// (?![\wáéíóúñ]) plays the role of Python's Unicode \b after the word.
var PASSWORD_RE = new RegExp(
  "\\b(password|passcode|pass word|pw|pwd|contrase[nñ]a|clave)" +
  "(\\s*[:=]\\s*|\\s+(?:is|es)\\s*:?\\s*)" +
  "(?!(?:" + NOT_A_PASSWORD + ")(?![\\wáéíóúñ]))(\\S{3,})", "gi");

// Returns { text: masked text, count: number of items masked }.
function maskSensitive(text) {
  var count = 0;
  function replaceWith(mask) {
    return function () { count++; return mask; };
  }
  function keepLabelAs(mask) {
    return function (whole, label, between) { count++; return label + between + mask; };
  }
  var out = String(text == null ? "" : text);
  // Cards first (longest digit runs), then CVVs, then passwords before codes,
  // so "mi clave es 4821" is hidden as a password.
  out = out.replace(CARD_RE, replaceWith(CARD_MASK));
  out = out.replace(CVV_RE, keepLabelAs(CODE_MASK));
  out = out.replace(PASSWORD_RE, keepLabelAs(PASSWORD_MASK));
  out = out.replace(CODE_RE, keepLabelAs(CODE_MASK));
  return { text: out, count: count };
}
