# Case study: a support spreadsheet that tells you which tickets are about to slip

**Demo scenario. Puentara is a fictional company.** All tickets, customers and agents are synthetic. No real customers, clients or results are described here.

## The situation

Puentara is a money app for freelancers and small businesses in the US and Latin America. Its support team is small: a lead and three agents. Two of the four prefer Spanish, two prefer English. They don't have a helpdesk yet. Tickets from email, chat and phone go into one Google Sheet, with a row per ticket: who it's from, what it's about, who owns it, and its status.

## The problem

The sheet works on a quiet day. On a busy one, it stops telling anyone what to do next.

Nobody can see, at a glance, that a stolen-card ticket came in at 6:40 in the morning and still has no owner. A customer waiting on a dispute reply gets marked "Waiting on customer" and then nobody follows up for a week. Someone types "Low" on a lost card. A first response that should take 4 business hours quietly takes two days, and the lead only finds out when the customer writes again, more upset than before.

The lead ends up scrolling the sheet every morning, doing date math in their head, and writing reminders to each agent. The Spanish-speaking agents get those reminders in English.

## The solution

The team keeps working in the same Google Sheet. The tracker adds a few columns and a menu.

- **Every ticket shows its first-response status:** OK, At risk once 75% of the time is used, Breached, or, once answered, Met or Missed. Breached and Missed turn red, At risk turns yellow.
- **The clock fits the ticket.** Urgent tickets get 1 hour, nights and weekends included. High, Normal and Low get 4, 8 and 16 business hours, Monday to Friday 08:00 to 18:00.
- **Some categories can't be marked low.** A lost or stolen card is always Urgent. Disputes, account access, identity checks and failed transfers are always at least High.
- **Forgotten follow-ups show up.** A ticket "Waiting on customer" for more than 2 business days is flagged "follow up or close".
- **Every morning, each agent gets a short email** with only their own tickets that need attention, in their language. The lead gets the team view, with unassigned urgent tickets at the top.
- **The email never repeats a card number, CVV, code or password** a customer typed into the subject. Those are masked.
- **The email reminds people of the rules:** lost cards and account access go to a person through the secure channel, disputes get no promised outcome, tax questions get no tax advice.
- **A weekly summary tab** shows tickets opened, first responses on time and late, open tickets and stale follow-ups, by category and by language.
- **Nothing is emailed until the lead is ready.** By default, digests go to a "Digest preview" tab to check first.

## What was built

- Google Apps Script, in plain JavaScript: a menu, a setup function, a daily trigger and email through Gmail's MailApp.
- All the rules (business-hours math, priority floors, digests, masking, summary) in small JavaScript files with no Google dependencies, so they can be tested on any computer.
- 149 automated tests with vitest, run locally with Node.js, including masking and safety checks in English and Spanish.
- A local demo that runs the same rules on CSV files, with no Google account.
- One file, `dist/Code.gs`, to paste into the Sheet's Apps Script editor.
- No AI. Every rule is plain code a person can read and change.

## What the demo shows (sample data)

All numbers below come from `npm run demo` on the repo's **synthetic sample data** (63 tickets, 4 agents), with the clock set to Friday 2026-10-23 at 10:00. They are not real-world results.

- **22 open tickets.** 5 are Breached, 3 are At risk, 3 are stale follow-ups, and 2 urgent tickets have no owner.
- **1 priority raised:** a lost card typed as "Low" became Urgent. With a 1-hour clock, it was already breached.
- **4 digests**, one per person with something to report: the lead (10 tickets, in Spanish), Mateo (3 tickets, in Spanish), and Sam and Jordan (2 each, in English).
- **4 masked items** in the lead's digest: a card number and a CVV in one subject, a password in another, a one-time code in a third.
- **No same-day repeat:** one breached ticket had already been alerted at 07:30 that morning, so it was left out. An unassigned stolen card that was also alerted at 07:30 was included again, because unassigned urgent tickets are alerted until someone takes them.
- **Weekly summary:** 47 tickets opened in the last 7 days (29 in English, 18 in Spanish). 33 first responses on time, 5 late.

The rules are tested. The Google Sheets part (setup, menu, colors, the preview tab and sending email through Gmail) was run once in a real Sheet on 2026-10-24, with synthetic tickets and emails to my own inbox. The daily trigger hasn't been tried yet, so I'd check it in a copy of a client's sheet first.

## How this would work for a real client

- **Your sheet:** the tracker finds columns by their English or Spanish names, and other header names can be added in one settings file. It writes only five columns: Priority (after the floor), Language (when empty), SLA due, SLA status and Last alerted. Subjects, owners, statuses and dates stay as your team typed them.
- **Your targets:** response times, business hours, the 75% warning line and the category floors are a few lines in `src/config.js`. If your team has holidays or works in more than one time zone, that needs adding.
- **Your categories and tone:** the categories, the digest wording and the reminders are plain English and Spanish text that can be rewritten in your words and your process.
- **Your helpdesk later:** if you move from a sheet to Zendesk or Freshdesk, the same rules can be reused, but that connection is not built.

Send me a copy of your sheet's column headers and your response-time targets, and I'll show you how this tracker would flag your tickets.
