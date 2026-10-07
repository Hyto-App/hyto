# Hyto — project brief

Product behavior as of 7 October 2026 is in [README.md](README.md) and [AGENTS.md](AGENTS.md). This file keeps the pitch.

## Pitch

Hyto is expense control and milestone payments for a team, on Stellar and Trustless Work. The person who creates the event locks the budget. Each task is a photo. An AI recommends whether the evidence is enough. The organizer pays the full amount in testnet USDC. The report compares budget with spend and, once a hash exists, links the payment on Stellar.

Positioning is teams and organizations first. Volunteer events such as ZEEK are the demo the team knows.

**Who it fits best**

1. **Stipends, scholarships, and travel grants paid after the spend.** The organization sets a cap, the recipient spends and uploads the receipt, and Hyto pays what was really spent, up to the cap. This is the capped reimbursement task that already exists: Mile reads the total, the currency, and the date, the organizer confirms the amount, and the report shows every payment for the donor. It fits NGOs, universities, foundations, accelerators, and hackathon travel grants.
2. **Events and volunteering**: short tasks proved by a photo (ZEEK).
3. **Freelance work by deliverable**: proof of work, then payment per milestone.
4. **Grants and bounties** in the Stellar ecosystem: each milestone with its evidence.

**Line.** Ramp gave companies control of spend. Hyto takes the next step for any team: money committed before the work, every task checked, every payment recorded.

"Ramp" in this line is [Ramp](https://ramp.com), the corporate card and spend-control company. It is not [Ramp Network](https://rampnetwork.com), the crypto on/off-ramp. Ramp Network is researched in [docs/auditorias/2026-10-02-ramp-adaptation.md](docs/auditorias/2026-10-02-ramp-adaptation.md) (added by [#109](https://github.com/Hyto-App/hyto/pull/109)). It sells Circle mainnet USDC, not the testnet USDC Hyto locks, so it stays out of the Find Your Way / ZEEK demo and there is no mainnet cutover.

## Hackathon context (September 2026)

| | |
|---|---|
| Event | Find Your Way Hackathon: Costa Rica, Stellar (Tellus Cooperative / Stellar Chile), Stellar Passport. General Track. |
| Delivery | Moved to 12 October 2026 (it was 5 October). |
| Meetup | 30 September 2026, TEC Cartago. |
| Demo and results | 12 October 2026. |
| Repo | https://github.com/Hyto-App/hyto |
| Team | Josué, Sebas, Abdiel Cole, Esteban, and Raúl. |

## How it works now

1. **Budget.** A signed-in user with enough USDC creates an event. Each task is its own escrow. The balance check is the task total plus 1 USDC.
2. **People.** Organizer invites teammates with a direct link or an `HYTO-` code. Members see their tasks. The organizer assigns work.
3. **Evidence.** A live camera photo of the work, or for a reimbursement the receipt as a photo, PDF, HTML, or text file.
4. **Review.** Mile: Groq (or Gemini) reads the evidence, Laya answers a questionnaire, and the code turns those answers into a grade from 0 to 100 with reasons. No model moves money.
5. **Pay.** The organizer confirms a reimbursement amount, locks the budget, then pays. The link appears after a real transaction hash. That hash is not in the repo yet. The demo mode shows the same steps without a wallet.

## Problem

In a lot of teams the money moves informally: a transfer, a chat message, a verbal reimbursement. At the end there is no report.

- The organizer cannot see what was spent or whether the task was done.
- The person who did the work has no committed payment.
- Sponsors and donors cannot check how the funds were used.
- A scholarship or stipend is often paid up front with no receipts, or reimbursed weeks later by hand.
