# Stack

Current as of `main` at `c17baf7` (8 October 2026). Product rules and the env table are in [AGENTS.md](AGENTS.md).

Hyto is the accountability layer for Stellar communities in Latin America. One Next.js app. Money sits in a Trustless Work v2 multi-release escrow, one contract per task, on Stellar testnet. Trustless Work is the base, not a product Hyto competes with. Evidence, the AI review, and the report stay off-chain. A receipt in colones is read from the photo and converted with a hand-updated rate. There is no mainnet payment and no recorded testnet hash yet.

Communities (`drizzle/0010` through `0013`) are the same story: a chapter, a bulletin, an account type, and a member profile. The flags `HYTO_COMUNIDADES`, `HYTO_TABLON`, `HYTO_TIPO_CUENTA`, and `HYTO_PERFIL_VOLUNTARIO` stay off.

## Layers

| Layer | Choice |
|---|---|
| App | Next.js 16.3.6, React 19.1.1, TypeScript, Tailwind 4. App Router. |
| UI | Poppins 400/500/600. `--acento` `#B7EE34`, `--sobre-acento` `#08090C`. Light and dark in `app/globals.css`. English and Spanish dictionaries in `lib/ui/diccionario.ts` (cookie `hyto_idioma`, English fallback). Figma: [Hyto – App](https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy), page "Nuevo diseño". |
| Shell | Events (`/eventos`), Tasks (`/mis-tareas`), Account (`/configuracion`). `/` sends an organizer, including the demo organizer, to `/eventos`, and everyone else to `/mis-tareas`. `/cuentas` redirects to `/configuracion`. |
| Host | Vercel. Push to `main` deploys https://hyto.vercel.app. Each PR gets a preview. |
| Data | Neon Postgres, Drizzle. Migrations `drizzle/0000_inicio.sql` through `drizzle/0013_tablon.sql`. `0004` was applied on 2026-10-01. `0009` adds the cover, the public description, and the AI-only context. `0010` through `0013` add communities, account type, the volunteer profile, and the bulletin. Those four stay behind their flags. |
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
3. Groq reads the image with the task condition in the prompt (`max_completion_tokens` 2048, reasoning off for `qwen/qwen3…`) and returns a structured reading. Laya, if `LAYA_URL` is set, answers the questionnaire on that whole reading. The code turns those answers into a grade from 0 to 100. The organizer still approves the payment.
4. For a reimbursement, the organizer confirms `monto_confirmado` before deploy. The amount cannot exceed the cap.
5. **Lock budget**: deploy, then fund. Platform fee is 0. Roles: organizer is approver, service provider, and release signer; platform, resolver, and admin come from env and must be distinct.
6. **Pay**: mark, approve, release milestone index 0, only after the indexed balance is positive. The HMAC token from prepare must match the signed XDR.
7. A confirmed release with a 64-hex hash sets `hash_pago` and `pagado`.

`npm run hito` (`scripts/hito-prueba.ts`) can repeat a 1 USDC milestone on v2 and, with `TRUSTLESS_API_KEY_V1`, on v1 (`https://dev.api.trustlesswork.com`). It is not the in-app flow. No payment hash from that script is stored in the repo.

A classic USDC balance requires a trustline. Trustless Work rejects deploy when the receiver lacks one (`ESCROW_RECEIVER_TRUSTLINE_MISSING`). Hyto does not check the receiver trustline before deploy. Get ready to be paid (`/api/usdc`) builds a self-paid `changeTrust` when the account's own XLM covers the new reserve and the fee. An account without XLM of its own gets a sponsored Cavos `addTrustline` instead, paid by the Cavos relayer. The signer pays the fee in XLM; fee-bumps are rejected. Testnet XLM comes from Friendbot.

## AI

| Step | Detail |
|---|---|
| Describe | Groq `qwen/qwen3.8-27b` (or `GROQ_VISION_MODEL`) at `https://api.groq.com/openai/v1`. JSON keys `tipo`, `pais`, `moneda`, `monto_original`, `monto_usd`, `fecha`, `comercio`, `articulos`, `texto_completo`, `legible`, `faltantes`, checked in `lib/revision/lectura.ts`. Colones convert to dollars with the hand-updated `CRC_POR_USD`. |
| Judge | `POST {LAYA_URL}/v1/systemone`, model `multilingual`. Optional `LAYA_API_KEY` as Bearer. |
| Verdict | Grade 0–100 in `lib/revision/pesos.ts`, stored in `veredictos.score`. Bands: under 50 Insufficient, 50–79 Partially completed, 80+ Completed. Grave faults cap at 49. An unreasonable expense, a reimbursement with no date, a currency Hyto cannot convert, or a dollar amount over the cap caps at 79. A reimbursement with no total caps at 40. |

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
