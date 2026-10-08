# Hyto — project brief

Product behavior as of `main` at `c17baf7` is in [README.md](README.md) and [AGENTS.md](AGENTS.md). This file keeps the pitch. The 27 September write-up that said funding and approval did not sign is obsolete.

## Pitch

**One line.** Hyto is the accountability layer for Stellar communities in Latin America: lock USDC per task, prove the spend with a photo, and a person releases the payment on a public trail.

**Three sentences.** Stellar communities — ambassador programs, local chapters, and builder groups across Latin America — receive stipends, scholarships (becas), grants, and event sponsorship from abroad, and they have to show how that money was spent. Hyto is that record: the funder or organizer locks USDC in a Trustless Work escrow for each task, the member uploads an in-place photo or a receipt in colones, and Mile recommends a score without ever moving money. A person releases the payment on Stellar so the trail is public; today that trail is testnet only, sign-in is an email through Cavos, and there is no live payment yet.

Why USDC, and not SINPE or another local transfer: the money comes from abroad in dollars, and the funder demands proof of spending. Trustless Work is the escrow Hyto is built on. It is not the competition. Hyto is not a company spend card, not a microtask marketplace, and not an on-ramp.

Communities, the bulletin, account type, and the volunteer profile are part of this story. The flags `HYTO_COMUNIDADES`, `HYTO_TABLON`, `HYTO_TIPO_CUENTA`, and `HYTO_PERFIL_VOLUNTARIO` stay off.

The older line “Ramp gave companies control of spend” is retired. [Ramp](https://ramp.com) is a corporate card. [Ramp Network](https://rampnetwork.com) is a crypto on/off-ramp, researched in [docs/auditorias/2026-10-02-ramp-adaptation.md](docs/auditorias/2026-10-02-ramp-adaptation.md). Neither is the product. Ramp Network sells Circle mainnet USDC, not the testnet USDC Hyto locks, so it stays out of the demo and there is no mainnet cutover.

## Hackathon context (September 2026)

This is history, not a claim that a pilot shipped.

| | |
|---|---|
| Event | Find Your Way Hackathon: Costa Rica, Stellar (Tellus Cooperative / Stellar Chile), Stellar Passport. General Track. |
| Delivery | 5 October 2026, 4:00 p.m. The timezone was not confirmed; the team planned around 1:00 p.m. Costa Rica time. |
| Meetup | 30 September 2026, TEC Cartago. |
| Results | 12 October 2026. |
| Repo | https://github.com/Hyto-App/hyto |
| Team | Josué, Sebas, Abdiel Cole, Esteban, and Raúl. |

## How it works now

1. **Funding.** A signed-in user with enough testnet USDC creates an event for a community. Each task is its own escrow. The balance check is the task total plus 1 USDC.
2. **People.** The organizer invites members with a direct link or an `HYTO-` code. Members see their tasks. The organizer assigns work. Login is email. It does not ask for a wallet first.
3. **Evidence.** Work or reimbursement, same camera: a photo of the work where it happened, or a photo of the receipt, including one in colones.
4. **Review.** Groq describes the photo. Laya answers a questionnaire when `LAYA_URL` is set. The code turns those answers into a grade from 0 to 100. Mile recommends. Neither model moves money.
5. **Pay.** The organizer confirms a reimbursement amount, locks the budget, then pays. The link appears after a real transaction hash. That hash is not in the repo yet. See the Testnet proof section in the README.

## Problem

A Stellar community receives dollars from abroad and then has to show a sponsor, a foundation, or a program lead how the money was spent. Today that record is informal: a transfer, a chat message, a verbal reimbursement. At the end there is no public trail.

- The organizer cannot see what was spent or whether the task was done.
- The person who did the work has no committed payment.
- The funder cannot check how the funds were used.
