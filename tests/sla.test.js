// SLA math: business hours Mon-Fri 08:00-18:00, urgent on a 24/7 clock.
// 2026-10-23 is a Friday, 2026-10-24/25 the weekend, 2026-10-26 a Monday.
import { describe, expect, test } from "vitest";
import { loadSrc } from "./load.js";

const s = loadSrc();

describe("time strings", () => {
  test("round trip, no time zone involved", () => {
    expect(s.fromMinutes(s.toMinutes("2026-10-23 10:00"))).toBe("2026-10-23 10:00");
    expect(s.fromMinutes(s.toMinutes("2026-10-23T07:05:59"))).toBe("2026-10-23 07:05");
  });

  test("bad dates give null, not a wrong date", () => {
    expect(s.toMinutes("")).toBeNull();
    expect(s.toMinutes("23/10/2026 10:00")).toBeNull();
    expect(s.toMinutes("2026-02-31 10:00")).toBeNull();
    expect(s.toMinutes("2026-10-23 25:00")).toBeNull();
  });
});

describe("business minutes", () => {
  const between = (a, b) => s.businessMinutesBetween(s.toMinutes(a), s.toMinutes(b));

  test("inside one business day", () => {
    expect(between("2026-10-23 09:00", "2026-10-23 10:30")).toBe(90);
  });

  test("before and after hours do not count", () => {
    expect(between("2026-10-23 06:00", "2026-10-23 08:00")).toBe(0);
    expect(between("2026-10-23 06:00", "2026-10-23 09:00")).toBe(60);
    expect(between("2026-10-23 17:00", "2026-10-23 22:00")).toBe(60);
  });

  test("the weekend does not count", () => {
    expect(between("2026-10-23 17:00", "2026-10-26 09:00")).toBe(120);
    expect(between("2026-10-24 09:00", "2026-10-25 17:00")).toBe(0);
  });

  test("end before start is zero", () => {
    expect(between("2026-10-23 10:00", "2026-10-23 09:00")).toBe(0);
  });
});

describe("due time", () => {
  test("high (4 business hours) on a normal morning", () => {
    expect(s.slaDue("2026-10-21 09:00", "high")).toBe("2026-10-21 13:00");
  });

  test("Friday 17:30, high: due Monday 11:30", () => {
    expect(s.slaDue("2026-10-16 17:30", "high")).toBe("2026-10-19 11:30");
  });

  test("created before hours: the clock starts at 08:00", () => {
    expect(s.slaDue("2026-10-22 06:15", "high")).toBe("2026-10-22 12:00");
  });

  test("created after hours: the clock starts next business morning", () => {
    expect(s.slaDue("2026-10-22 19:40", "normal")).toBe("2026-10-23 16:00");
  });

  test("created on Saturday: the clock starts Monday 08:00", () => {
    expect(s.slaDue("2026-10-24 11:00", "normal")).toBe("2026-10-26 16:00");
  });

  test("low (16 business hours) spans the weekend", () => {
    expect(s.slaDue("2026-10-22 14:00", "low")).toBe("2026-10-26 10:00");
  });

  test("urgent runs 24/7: Saturday 02:00 is due Saturday 03:00", () => {
    expect(s.slaDue("2026-10-24 02:00", "urgent")).toBe("2026-10-24 03:00");
    expect(s.slaDue("2026-10-23 17:30", "urgent")).toBe("2026-10-23 18:30");
  });

  test("bad created date gives an empty due time", () => {
    expect(s.slaDue("not a date", "high")).toBe("");
  });
});

describe("status: 75% at risk, 100% breached", () => {
  // High = 240 business minutes, created 2026-10-23 08:00.
  const created = "2026-10-23 08:00";

  test("under 75% is OK", () => {
    expect(s.slaStatus(created, "", "2026-10-23 10:59", "high")).toBe("ok");
  });

  test("exactly 75% is at risk", () => {
    expect(s.slaStatus(created, "", "2026-10-23 11:00", "high")).toBe("at_risk");
  });

  test("exactly 100% is breached", () => {
    expect(s.slaStatus(created, "", "2026-10-23 11:59", "high")).toBe("at_risk");
    expect(s.slaStatus(created, "", "2026-10-23 12:00", "high")).toBe("breached");
  });

  test("weekend time does not push a ticket toward breach", () => {
    // Friday 16:00, high: 120 minutes used by Friday 18:00; Sunday adds nothing.
    expect(s.slaStatus("2026-10-23 16:00", "", "2026-10-25 23:00", "high")).toBe("ok");
    expect(s.slaStatus("2026-10-23 16:00", "", "2026-10-26 09:00", "high")).toBe("at_risk");
  });

  test("urgent counts nights and weekends", () => {
    expect(s.slaStatus("2026-10-24 02:00", "", "2026-10-24 02:44", "urgent")).toBe("ok");
    expect(s.slaStatus("2026-10-24 02:00", "", "2026-10-24 02:45", "urgent")).toBe("at_risk");
    expect(s.slaStatus("2026-10-24 02:00", "", "2026-10-24 03:00", "urgent")).toBe("breached");
  });

  test("answered in time is met, late is missed", () => {
    expect(s.slaStatus("2026-10-16 17:30", "2026-10-19 11:30", "2026-10-23 10:00", "high")).toBe("met");
    expect(s.slaStatus("2026-10-16 17:30", "2026-10-19 11:31", "2026-10-23 10:00", "high")).toBe("missed");
  });

  test("bad dates are flagged, not guessed", () => {
    expect(s.slaStatus("", "", "2026-10-23 10:00", "high")).toBe("bad_date");
    expect(s.slaStatus("2026-10-23 08:00", "yesterday", "2026-10-23 10:00", "high")).toBe("bad_date");
    // A first response before the ticket was created is a typing mistake.
    expect(s.slaStatus("2026-10-23 08:00", "2026-10-22 08:00", "2026-10-23 10:00", "high")).toBe("bad_date");
  });

  test("unknown priority falls back to normal", () => {
    expect(s.slaDue("2026-10-21 08:00", "whatever")).toBe("2026-10-21 16:00");
  });
});
