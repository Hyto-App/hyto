# Hyto — project brief

Product behavior as of `main` at `c17baf7` is in [README.md](README.md) and [AGENTS.md](AGENTS.md). This file keeps the pitch. The 27 September write-up that said funding and approval did not sign is obsolete.

## Pitch

**One line.** Hyto is the accountability layer for communities funded from afar in Latin America: lock USDC per task, prove the spend with a photo, and a person releases the payment on a public Stellar trail.

**Three sentences.** Multichain communities in Latin America, especially ones headquartered abroad or not physically present, receive stipends, scholarships (becas), and funds to run events, and they always have to prove how that money was spent. Today that proof is loose screenshots and spreadsheets nobody can verify. Hyto is the accountability layer: the funder locks USDC in a Trustless Work escrow per task, the member proves the work with an in-place photo and receipts in colones, Mile reviews the evidence and recommends but never moves money, and a person approves so the payment is released on Stellar with a public trail anyone can audit. Sign-in is email, with no wallet and no crypto app. That trail is testnet only. There is no live payment yet.

**Spoken pitch (Josué, Spanish).** The app UI uses tú. This line keeps the voseo he wrote:

> Las comunidades multichain en Latinoamérica reciben stipends, becas y fondos para organizar eventos, y siempre les toca demostrar en qué se gastó esa plata. Hoy eso se hace con capturas sueltas y hojas de Excel que nadie puede verificar. Hyto es la capa de rendición de cuentas para esas comunidades. Quien financia bloquea USDC en un escrow de Trustless Work por cada tarea. El miembro hace el trabajo y lo prueba con una foto en el lugar y los recibos en colones. Mile, nuestra IA, revisa la evidencia y recomienda, pero nunca mueve la plata: una persona aprueba y el pago se libera en Stellar, con un rastro público que cualquiera puede auditar. Y todo se usa con un login de correo, sin wallet ni apps cripto. Hyto: mostrá el gasto, que quede registrado.

Stellar is the settlement rail, not the audience. Why USDC, and not SINPE or another local transfer: the money comes from abroad in dollars, and the funder demands proof of spending. Trustless Work is the escrow Hyto is built on. It is not the competition. Hyto is not a company spend card, not a microtask marketplace, and not an on-ramp.

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

A community in Latin America receives dollars from afar — often from a funder who is headquartered abroad or not physically there — and then has to show how the money was spent. Today that record is loose screenshots and a spreadsheet. At the end there is no public trail.

- The organizer cannot see what was spent or whether the task was done.
- The person who did the work has no committed payment.
- The funder cannot check how the funds were used.
