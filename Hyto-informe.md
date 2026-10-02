# Hyto — project brief

Product behavior as of `main` at `601d143` (PR #87 on top of `2b9fad4`) is in [README.md](README.md) and [AGENTS.md](AGENTS.md). This file keeps the pitch. The 27 September write-up that said funding and approval did not sign is obsolete.

## Pitch

Hyto is expense control and milestone payments for a team, on Stellar and Trustless Work. The person who creates the event locks the budget. Each task is a photo. An AI recommends whether the evidence is enough. The organizer pays the full amount in testnet USDC. The report compares budget with spend and, once a hash exists, links the payment on Stellar.

Positioning is teams and companies first. Volunteer events such as ZEEK are the demo the team knows.

**Line.** Ramp gave companies control of spend. Hyto takes the next step for any team: money committed before the work, every task checked, every payment recorded.

## Hackathon context (September 2026)

| | |
|---|---|
| Event | Find Your Way Hackathon: Costa Rica, Stellar (Tellus Cooperative / Stellar Chile), Stellar Passport. General Track. |
| Delivery | 5 October 2026, 4:00 p.m. The timezone was not confirmed; the team planned around 1:00 p.m. Costa Rica time. |
| Meetup | 30 September 2026, TEC Cartago. |
| Results | 12 October 2026. |
| Repo | https://github.com/Hyto-App/hyto |
| Team | Josué, Sebas, Abdiel Cole, Esteban, and Raúl. |

## How it works now

1. **Budget.** A signed-in user with enough USDC creates an event. Each task is its own escrow. The balance check is the task total plus 1 USDC.
2. **People.** Organizer invites teammates with a direct link or an `HYTO-` code. Members see their tasks. The organizer assigns work.
3. **Evidence.** Work or reimbursement, same camera: a photo of the work, or a photo of the receipt.
4. **Review.** Groq describes the photo. Laya scores that description when `LAYA_URL` is set. The code says cumplió, parcial, or insuficiente. Neither model moves money.
5. **Pay.** The organizer confirms a reimbursement amount, locks the budget, then pays. The link appears after a real transaction hash. That hash is not in the repo yet.

## Problem

In a lot of teams the money moves informally: a transfer, a chat message, a verbal reimbursement. At the end there is no report.

- The organizer cannot see what was spent or whether the task was done.
- The person who did the work has no committed payment.
- Sponsors cannot check how the funds were used.
