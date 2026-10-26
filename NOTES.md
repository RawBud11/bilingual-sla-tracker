# Notes: limits and ideas (not in scope)

## Known limits
- **No holidays.** Business days are Mon-Fri 08:00-18:00 in one team time zone (`src/config.js`). A public holiday counts as a business day.
- **One time zone, no per-agent time zones.** Times are read in the spreadsheet's time zone (File > Settings in the Sheet), which also sets the daily trigger time and "same day" for dedupe. The local demo uses plain "YYYY-MM-DD HH:mm" strings with no time zone.
- **First-response SLA only.** No resolution-time SLA and no SLA pause while "Waiting on customer".
- **Resolved with no first response logged:** the Last update time counts as the first response.
- **Stale follow-up** is measured from Last update (or First response, or Created, if Last update is empty).
- **Dedupe is per calendar day.** "Last alerted" is only written when real emails go out (DRY_RUN off), so you can preview many times a day, and only on tickets that were in a digest actually sent. Unassigned urgent tickets are alerted on every run until someone owns them.
- **An assignee not on the Agents tab counts as unassigned** (it can't receive a digest). A typo in a name makes an urgent ticket show as unassigned in the lead digest.
- **At least one Lead is required** when any alert has no owner (or has unreadable dates): otherwise "Send digests" stops with a clear EN/ES error instead of sending nothing.
- **Masking limits inherited from bilingual-faq-chatbot:** `PASSWORD_RE` hides punctuation stuck to a password ("Girasol2024," hides the comma too); `CODE_RE` over-masks harmless numbers after "code", e.g. "error code 5003". Passwords typed with no label, names and account numbers are not masked. JavaScript `\w` and `\b` are ASCII-only, so accented words are spelled out in the patterns.
- **Language detection** is word counting (ported from bilingual-faq-chatbot). Very short subjects can come out as "other".
- **The Apps Script layer has no automated tests; it was run once by hand in a real Google Sheet (2026-10-24).** Checked: `setupTracker` and its authorization, the menu, "Check SLAs now" (columns, colors, weekly summary, date cells in the sheet's time zone), and "Send digests" with DRY_RUN on (preview tab) and off (4 HTML emails to Gmail aliases, Last alerted stamped, second send repeated only the unassigned urgent ticket). Not tried yet: "Install daily trigger", a sheet with Spanish headers and tabs, and the two wording fixes made after the run (summary title without "(sample data)", singular "1 digest" messages), which are tested locally only.
- **Trigger time:** Apps Script runs the daily trigger near 07:30 (within about 15 minutes), every day including weekends (urgent tickets are 24/7).
- **MailApp quotas** apply when DRY_RUN is off; see https://developers.google.com/apps-script/guides/services/quotas. No numbers are stated in the project on purpose.
- **Sheet import:** the code looks for tabs named "Tickets"/"Solicitudes" and "Agents"/"Agentes". After File > Import of `data/sample_tickets.csv`, rename the tab to "Tickets" (or import into the tab `setupTracker` created).
- Output CSVs have no BOM. Google Sheets reads them fine; Excel on Windows may show accents wrong unless imported as UTF-8.
- npm 11 prints a warning that it skipped esbuild's install script; vitest still runs (the esbuild binary comes as an optional dependency).

## Ideas for later (not built)
- Holiday calendar tab.
- Resolution-time SLA and SLA pause while waiting on the customer.
- clasp setup as an alternative to pasting `dist/Code.gs`.
- A "snooze until" column for follow-ups the customer asked to delay.
