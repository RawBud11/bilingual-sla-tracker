import { expect, test } from "vitest";
import { parseCsv, toCsv } from "../scripts/csv.js";

test("quoted commas, quotes, line breaks, accents", () => {
  const rows = [["Asunto", "Notas"], ["No encuentro mi tarjeta, quiero bloquearla", 'dijo "ya"\nluego colgó']];
  expect(parseCsv(toCsv(rows))).toEqual(rows);
});

test("CRLF line endings and an Excel BOM", () => {
  expect(parseCsv("﻿a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
});

test("empty fields and a last line without newline", () => {
  expect(parseCsv("a,,c\n,,")).toEqual([["a", "", "c"], ["", "", ""]]);
});

test("unclosed quote gives a clear error", () => {
  expect(() => parseCsv('a,"b\n')).toThrow("unclosed quote");
});
