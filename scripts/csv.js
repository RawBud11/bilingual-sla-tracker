// Tiny CSV reader and writer for the Node demo only (Apps Script reads the
// sheet directly, so this file is not part of dist/Code.gs).
// Handles quoted fields with commas, quotes ("") and line breaks, CRLF or LF
// line endings, and a UTF-8 BOM at the start (Excel adds one).

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (quoted) throw new Error("CSV has an unclosed quote. Check the file for a missing \".");
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Rows -> CSV text with LF line endings. Quotes only fields that need it.
export function toCsv(rows) {
  return rows.map((row) => row.map((value) => {
    const v = value == null ? "" : String(value);
    return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(",")).join("\n") + "\n";
}
