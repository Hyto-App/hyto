# Stack

Current as of `main` at `2b9fad4` (2 October 2026). Product rules and the env table are in [AGENTS.md](AGENTS.md).

One Next.js app. Money sits in a Trustless Work v2 multi-release escrow, one contract per task, on Stellar testnet. Evidence, the AI review, and the report stay off-chain.

## Layers

| Layer | Choice |
|---|---|
| App | Next.js 16.3.6, React 19.1.1, TypeScript, Tailwind 4. App Router. |
| UI | Poppins 400/500/600. `--acento` `#B7EE34`, `--sobre-acento` `#08090C`. Light and dark in `app/globals.css`. Figma: [Hyto – App](https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy), page "Nuevo diseño". |
| Shell | Events, Tasks, Account. Same chrome for organizers and members. |
| Host | Vercel. Push to `main` deploys https://hyto.vercel.app. Each PR gets a preview. |
| Data | Neon Postgres, Drizzle. Migrations `drizzle/0000_inicio.sql` through `drizzle/0004_miembros_invitaciones.sql`. `0004` was applied on 2026-10-01. |
| Files | Private Vercel Blob. The photo is not written on-chain. |
| Wallet | `@cavos/kit` 0.2.5. `chains: ["stellar"]`, `network: "testnet"`, `appSalt` `hyto`. Changing the salt later creates a different wallet. |
| Escrow | `https://beta.api.trustlesswork.com`. Unsigned XDR from the server, `wallet.signXdr` in the browser, `POST /stellar/send-transaction`. Not the Cavos `TrustlessWorkEscrow` wrapper. |
| USDC | Testnet issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. SAC id derived for testnet in `lib/escrow/desplegar.ts`. |
| AI | Groq vision, then Laya on the description. Neither signs. |
| Report | `/eventos/[id]/informe`. "View payment" links to stellar.expert testnet when `hash_pago` exists. |

`@stellar/stellar-sdk` is a dependency. The browser payment path uses Cavos, not the SDK, to sign.

## Payment path

1. Create an event. The server checks Horizon: session wallet USDC must cover the task total plus 1 USDC (`lib/escrow/saldo.ts`). Default Horizon is testnet. `HYTO_STELLAR_NETWORK=public` (or `mainnet`) switches that read only.
2. A member uploads a photo. The assigned member can set `wallet_cobro`. That field is not locked when a contract already exists.
3. Groq describes the image (`max_completion_tokens` 1024, reasoning off). Laya, if `LAYA_URL` is set, answers the questionnaire. The code turns those answers into a grade from 0 to 100. The organizer still approves the payment.
4. For a reimbursement, the organizer confirms `monto_confirmado` before deploy. The amount cannot exceed the cap.
5. **Lock budget**: deploy, then fund. Platform fee is 0. Roles: organizer is approver, service provider, and release signer; platform, resolver, and admin come from env and must be distinct.
6. **Pay**: mark, approve, release milestone index 0, only after the indexed balance is positive. The HMAC token from prepare must match the signed XDR.
7. A confirmed release with a 64-hex hash sets `hash_pago` and `pagado`.

`npm run hito` (`scripts/hito-prueba.ts`) can repeat a 1 USDC milestone on v2 and, with `TRUSTLESS_API_KEY_V1`, on v1 (`https://dev.api.trustlesswork.com`). It is not the in-app flow. No payment hash from that script is stored in the repo.

A classic USDC balance requires a trustline. Trustless Work rejects deploy when the receiver lacks one (`ESCROW_RECEIVER_TRUSTLINE_MISSING`). Hyto does not check the receiver trustline before deploy. The Account screen still builds a self-paid `changeTrust` (`/api/usdc`). The signer pays the fee in XLM; fee-bumps are rejected. Testnet XLM comes from Friendbot.

## AI

| Step | Detail |
|---|---|
| Describe | Groq `qwen/qwen3.8-27b` at `https://api.groq.com/openai/v1`. JSON keys `texto`, `monto`, `fecha`. |
| Judge | `POST {LAYA_URL}/v1/systemone`, model `multilingual`. Optional `LAYA_API_KEY` as Bearer. |
| Verdict | Grade 0–100 in `lib/revision/pesos.ts`, stored in `veredictos.score`. Bands: under 50 Insuficiente, 50–79 Parcialmente completado, 80+ Completado. Grave faults cap at 49, an unreasonable expense at 79, and a bad reimbursement at 40. |

No Groq key, or a failed call, stores `origen: "error"`. No `LAYA_URL` uses the stub (`origen: "stub"`). `desdeGuion()` remains in the tree for tests; the live review does not call it.

## Data

Tables: `usuarios`, `proyectos`, `tareas`, `evidencias`, `veredictos`, `sesiones`, `proyecto_miembros`, `proyecto_invitaciones`.

`usuarios.rol` is leftover from the global-role model. New signups are stored as `voluntario`. Access control uses `proyecto_miembros.rol` (`organizer`, `team`, `volunteer`).

## What this stack does not do

- Mainnet payments. The Trustless base in code is the testnet beta API.
- Partial milestone payouts, except through dispute resolution, which is stricter than the protocol in places (see the audit).
- An AI button that releases funds.
- Acta credentials. That waits on a real USDC payment. None is recorded yet.

## Rules that are in the code

- One escrow per task, one milestone (index 0), full amount.
- The organizer can pay against the AI recommendation. The AI has no contract role.
- Admin, platform, and resolver accounts must not collide with the organizer or the receiver.
- Demo sessions cannot create events or submit signatures.
