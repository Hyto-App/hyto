# Hyto — context for the team and for agents

Read this before touching the repo. It describes `main` at `2b9fad4` (2 October 2026): roleless events, invites, and one app shell. If an older doc disagrees, this file and the code win.

Production is Next.js on Vercel: https://hyto.vercel.app. A push to `main` deploys production. Every pull request gets a preview. Secrets live in Vercel only.

## Stellar Raven (mandatory)

[Stellar Raven](https://raven.stellar.org) is Stellar's official MCP server. Sign-in is OAuth in the browser. No API keys.

- MCP endpoint: `https://raven.stellar.org/mcp`
- Cursor `mcp.json`: `{"mcpServers":{"stellar-raven":{"url":"https://raven.stellar.org/mcp"}}}`

Every new task must consult Stellar Raven (and Trustless Work docs where the escrow is involved) before the work starts.

Facts that bound this app, checked on 2026-10-02:

- A classic Stellar asset such as USDC needs a trustline before an account can hold it ([Stellar docs, anatomy of an asset](https://developers.stellar.org/docs/tokens/anatomy-of-an-asset)). Friendbot funds testnet XLM ([networks](https://developers.stellar.org/docs/networks#friendbot)).
- Trustless Work v2 multi-release deploys at `https://beta.api.trustlesswork.com`. Deploy is rejected with `ESCROW_RECEIVER_TRUSTLINE_MISSING` when a milestone receiver cannot hold the escrow token. Hyto does not run that preflight yet.
- Testnet USDC issuer in code: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. The SAC id is derived in `lib/escrow/desplegar.ts` (`USDC_SAC_TESTNET`).

## What Hyto is

Hyto locks a budget and pays milestones on Stellar testnet. One Trustless Work v2 multi-release contract per task. The organizer locks USDC, a member uploads a photo, Groq describes it, Laya scores that text when configured, and the organizer pays the full milestone. The AI does not sign or move money.

The sample event is ZEEK: three US$20 work tasks and a meal reimbursement up to US$15. Those amounts live in the seed and the local example.

### Membership (per event, not a login role)

Login does not ask for a role. Creating an event requires a session wallet whose USDC balance covers the sum of the task amounts plus a 1 USDC reserve (`lib/escrow/saldo.ts`, `RESERVA_USDC`). The creator is stored as `organizer` on `proyecto_miembros` and on `proyectos.organizador_id`.

People join by direct invite (email-bound, one use) or a code `HYTO-` plus 12 characters from a no-lookalike alphabet (`lib/api/invitaciones.ts`). Both expire in 7 days. After five failed attempts in 15 minutes, the next try returns 429. That counter is an in-memory map, so it does not hold across Vercel instances. Invite roles are `team` or `volunteer`.

Who can see what (`lib/api/alcance.ts`):

- **Organizer** of that event sees every task, invites people, assigns tasks at `/eventos/[id]/tareas`, locks the budget, and pays.
- **Team and volunteer** see only tasks assigned to them (`tareas.miembro_id`). The `team` value is stored; it does not grant a wider view.

`usuarios.rol` still exists. A new Cavos email is inserted as `voluntario` (`lib/api/sesion.ts`). Event authorization does not read that column. Demo mode is the exception: `HYTO_DEMO_LOGIN=1` still offers organizer or volunteer, and those sessions cannot create events or sign.

## App shell

One shell (`components/admin/Marco.tsx`): **Events** (`/eventos`), **Tasks** (`/mis-tareas`), **Account** (`/cuentas`). Light and dark tokens are in `app/globals.css`. Accent `#B7EE34`, button text `#08090C`. Poppins 400, 500, 600. UI source of truth is Abdiel's Figma, [Hyto – App](https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy), page "Nuevo diseño". Flag conflicts with that file instead of overwriting it.

| Route | What it is |
|---|---|
| `/` | Landing. Signed-in users go to `/eventos`. |
| `/eventos`, `/eventos/nuevo`, `/eventos/[id]` | List, create, event home. |
| `/eventos/[id]/tareas` | Organizer assigns tasks. |
| `/eventos/[id]/informe` | Printable report. `/informe` redirects to the first event. |
| `/revision/[id]` | Photo review and payment. |
| `/join`, `/join/[secreto]` | Redeem an invite. |
| `/mis-tareas`, `/tareas/[id]` | Assigned tasks and evidence upload. |
| `/cuentas`, `/cuentas/preparar` | Wallet and USDC setup. |
| `/proyectos/nuevo` | Redirects to `/eventos/nuevo`. |

User-facing copy defaults to English. Spanish is optional: cookie `hyto_idioma` (`en` or `es`) and the dictionaries in `lib/ui/diccionario.ts`. Screens that are not wired yet stay in English.

## Stack

| Layer | Where |
|---|---|
| App | Next.js 16.3.6 (App Router), React 19.1.1, TypeScript, Tailwind 4. |
| API | Route handlers in `app/api`. |
| Data | Neon Postgres via Drizzle. Schema: `lib/db/schema.ts`. SQL: `drizzle/0000` through `drizzle/0004`. `npm run db:migrar` applies them in name order. `0004_miembros_invitaciones.sql` was applied to Neon on 2026-10-01 (backup branch `pre-0004-backup`). |
| Photos | Private Vercel Blob (`lib/blob/fotos.ts`). The DB stores the id. The screen loads `GET /api/evidencias/:id/foto`. |
| Wallet | `@cavos/kit` 0.2.5, Stellar testnet, `appSalt` `hyto` (`lib/integrante/identidades.ts`). |
| Escrow | Trustless Work v2, base `https://beta.api.trustlesswork.com` (`lib/escrow/cuerpos.ts`). The server calls it with `TRUSTLESS_API_KEY`. The browser only signs the XDR. |
| AI | Groq `qwen/qwen3.8-27b` describes the image (`lib/revision/scout.ts`). Laya scores the description (`lib/revision/laya.ts`). The code builds the verdict (`lib/revision/armar.ts`). |

`Almacen` (`lib/db/almacen.ts`) is the data interface. Production uses `almacenNeon()` (`lib/db/neon.ts`): Neon HTTP when the host is Neon, `pg` otherwise. Routes enter through `conAlmacen` (`lib/api/base.ts`). Without `DATABASE_URL` they say the database is not configured. Tests use `crearMemoria()`. Browser `localStorage` helpers still exist for the sample view.

## API

- `GET`, `POST`, `DELETE /api/sesion` — read, open, and close a session. `POST /api/sesion/wallet` stores a `G…`.
- `GET`, `POST /api/sesion/demo` — demo mode. Anything other than `HYTO_DEMO_LOGIN=1` makes `POST` return 404.
- `GET`, `POST /api/proyectos` — list visible events; create one (demo sessions get 403).
- `GET`, `POST /api/tareas`. `POST /api/tareas/[id]/asignar` — organizer assigns a member.
- `POST /api/eventos/[id]/invitaciones` — organizer creates an invite. `POST /api/join` redeems one.
- `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/evidencias/:id/foto`.
- `GET`, `POST /api/revision/:id` — read or force a review. `POST /api/revision/:id/pedir` asks for another photo. `POST /api/revision/:id/monto` stores `monto_confirmado`.
- `GET /api/informe`.
- `POST /api/firma`, `POST /api/firma/enviar`, `GET /api/escrow/[contrato]`.
- `GET`, `POST /api/usdc` — read or prepare a classic `changeTrust` for the session wallet.

## Sign-in

Cavos (email code or Google) in `components/admin/Entrar.tsx`. The browser sends the email and the JWT to `POST /api/sesion`. The server checks RS256 and expiry (`lib/sesion/jwt.ts`) and sets the `hyto_sesion` cookie (HttpOnly, SameSite=Lax, Secure in production, capped at 24 hours).

`CAVOS_JWT_JWK` wins over `CAVOS_JWKS_URL`. `HYTO_PERMITIR_JWT_SIN_FIRMA=1` skips the signature only outside production. `CAVOS_JWT_ISSUER` is a comma-separated issuer list. `CAVOS_JWT_AUDIENCE`, when set, must match `aud`. **When either is empty, that check is skipped.** That is still open. See the audit note below.

If the JWT carries a `G…`, it is stored. If it does not, `POST /api/sesion/wallet` accepts the address the client sends. The code says that does not prove the client holds the key. On submit, the signer is read from the XDR and must match `sesiones.wallet`.

## Evidence and AI

Upload and review call `revisar()` (`lib/revision/revisar.ts`).

1. Groq (`qwen/qwen3.8-27b`) returns JSON with `texto`, `monto`, and `fecha`. The request uses `max_completion_tokens: 1024`, `reasoning_effort: "none"`, and `reasoning_format: "hidden"`. The file name `scout.ts` and the column `texto_scout` are old names.
2. If `LAYA_URL` is set, `POST {LAYA_URL}/v1/systemone` (model `multilingual`) asks one classification question, then the work questions or the invoice questions (`lib/revision/laya-preguntas.ts`). `LAYA_API_KEY` is sent as Bearer when set. Classification `otra` scores 0 and does not ask the second set.
3. The result is an integer grade from 0 to 100 (`lib/revision/pesos.ts`). It is the sum of each question's weight times its credit. Weights are `PESOS_PREGUNTAS` and each path sums to 100. Ordered answers get half credit on the middle step. A yes/no question scores its weight only when the answer supports a valid task; for "is something missing", that answer is no. The grade is stored in `veredictos.score`. A display band is derived from it: under 50 `insuficiente`, 50–79 `parcial`, 80–100 `cumplió`. The screen shows those bands as Insuficiente, Parcialmente completado, and Completado, next to the percentage (`64% · Parcialmente completado`). `calificar` applies the caps and does not change the weights: 49 for classification `otra`, work that does not match, work that has not started, or a different kind of expense; 79 when the expense is not reasonable; 40 when a reimbursement has no positive amount, no date, or is over the task cap. The lowest cap wins. Reason tags are recomputed from the stored answers and do not approve or sign a payment.

Missing `GROQ_API_KEY`, a Groq failure, or a Laya failure is stored as `origen: "error"` and logged (`lib/revision/fallo.ts`). The fixed script `desdeGuion()` is not on this path. Without `LAYA_URL`, the stub runs and the origin is `"stub"`. The review screen labels origins (`lib/admin/vista.ts`: AI recommendation, sample recommendation, review failed). On upload, if Groq is configured, the handler waits 2.8 seconds and saves the verdict later if that is not enough.

For a reimbursement, deploy and fund require `evidencias.monto_confirmado` (`POST /api/revision/:id/monto`). The receipt reading stays in `monto`.

## Escrow

Actions on `POST /api/firma`: `desplegar`, `fondear`, `marcar`, `aprobar`, `liberar`, `disputar`, `resolver`. The server returns an unsigned XDR plus an HMAC token (`lib/api/preparado.ts`, `HYTO_TOKEN_SECRET`, 10 minutes). The client signs with `wallet.signXdr` and posts to `POST /api/firma/enviar`. Submit is `POST /stellar/send-transaction`. Fee-bumps are rejected. The token binds the XDR fingerprint, action, task, and amount.

Deploy uses the organizer wallet, `wallet_cobro`, the task amount, and three server accounts (`HYTO_ESCROW_ADMIN`, `HYTO_ESCROW_PLATFORM`, `HYTO_ESCROW_RESOLVER`). Those three must differ from each other and from the organizer and the receiver. Platform fee is 0.

On the review screen (`lib/admin/remoto.ts`):

1. **Lock budget** deploys, then funds. If deploy succeeds and fund fails, the button resumes at fund (`fondear` when a contract exists and the indexed balance is still zero).
2. **Pay** runs mark, approve, and release (index 0). It is shown only when the task is in review, a contract exists, and the indexed balance is positive.
3. **View payment** when the task is `pagado` and `hash_pago` is set (`https://stellar.expert/explorer/testnet/tx/<hash>`).

The organizer's USDC balance is checked again before deploy, fund, and submit (amount plus 1 USDC). The indexer can lag: `STELLAR_TX_SUBMITTED_INDEXER_LAGGING` is treated as submitted. The predicted contract id from the deploy prepare is carried inside the HMAC token (`contrato`), and submit saves it to `tareas.contrato_escrow` even when the indexer lags, so no instance offers a second deploy. On release, the server polls the escrow read (`lib/escrow/indexador.ts`) until milestone 0 is released. If it times out, it keeps `hash_pago` with the task unpaid, hides fund and pay, and `GET /api/revision/:id` marks it `pagado` once the read shows the release.

`npm run hito` does not replace the browser flow. The organizer needs testnet XLM (fees) and testnet USDC. The receiver needs a USDC trustline. Account setup still prepares a self-paid `changeTrust` through `/api/usdc`. `asegurarCobroUsdc` can call Cavos `addTrustline`, and that is not the path `PrepararUsdc` uses. There is no receiver-trustline check before deploy.

## Environment

Names only. No values in the repo. `.env.example` lists the same reads.

| Name | Use |
|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | Cavos app id in the browser. The only public variable. |
| `TRUSTLESS_API_KEY` | Trustless Work, server only. Without it, signing returns 503. |
| `TRUSTLESS_API_KEY_V1` | Separate key for the v1 retry in `npm run hito`. |
| `HYTO_TOKEN_SECRET` | HMAC secret for prepare/submit. At least 32 characters. In production, prepare and submit return 503 without it. |
| `HYTO_TEST_SESSION_KEY` | Outside production, used as the HMAC secret when `HYTO_TOKEN_SECRET` is unset. Not for production. |
| `HYTO_ESCROW_ADMIN` | Contract admin `G…`. Must not repeat another role. |
| `HYTO_ESCROW_PLATFORM` | Platform `G…`. Fee in Hyto is 0. |
| `HYTO_ESCROW_RESOLVER` | Dispute resolver `G…`. |
| `DATABASE_URL` | Neon or local Postgres. |
| `HYTO_HOST_BASE_PRODUCCION` | Production DB hosts. `db:migrar` and `db:semilla` compare them to `DATABASE_URL`. |
| `HYTO_CONFIRMAR_BASE_PRODUCCION` | Only `si` allows migrate or seed against those hosts. |
| `BLOB_READ_WRITE_TOKEN` | Private Blob token. |
| `GROQ_API_KEY` | Groq. Without it, review is stored as an error. |
| `LAYA_URL` | Laya base URL. Without it, the stub scores the description. |
| `LAYA_API_KEY` | Optional Bearer token for Laya. |
| `CAVOS_JWKS_URL` | JWKS for the Cavos JWT. |
| `CAVOS_JWT_ISSUER` | Allowed `iss` values, comma-separated. Empty: issuer is not checked. |
| `CAVOS_JWT_AUDIENCE` | When set, `aud` must match. Empty: audience is not checked. |
| `CAVOS_JWT_JWK` | Public JWK. Wins over `CAVOS_JWKS_URL`. |
| `HYTO_PERMITIR_JWT_SIN_FIRMA` | Exact `1`, and never in production. |
| `HYTO_DEMO_LOGIN` | Exact `1` turns demo login on. |
| `HYTO_STELLAR_NETWORK` | `public` or `mainnet` points the USDC balance read at public Horizon. Anything else, including unset, is testnet. The escrow API stays on the Trustless testnet base. |
| `HYTO_PROBE_URL` | Integration tests only. |
| `NODE_ENV` | Set by Next.js. `production` marks the cookie Secure. |
| `VERCEL_ENV` | `production` also blocks the unsigned-JWT shortcut. |
| `NODE_TEST_CONTEXT` | Set by the test runner. Allows the HMAC test fallback when `NODE_ENV` is `production`. |

`npm run verificar:entorno` prints which of the names in `lib/config/entorno.ts` are missing. It does not print values, and it does not list every name in the table above.

## How to run

```bash
npm ci
npm run dev
npm test
npx tsc --noEmit
npm run build
```

Do not run migrations against production on your own.

## How the team works

One cloud agent per task, one pull request per agent. Branch from updated `main`. Nobody pushes to `main`. Squash-merge after a human reads the diff and the tests pass. No secrets. No new `NEXT_PUBLIC_` variable without saying so. UI follows Abdiel's Figma.

Task owners in old prompts are suggestions. Anyone may take a task. If you do work that was suggested for someone else, leave a note so they have the branch, the PR, and what is left.

Team communication, including that note, lives in the private repo [Hyto-App/hyto-private](https://github.com/Hyto-App/hyto-private). Do not copy its contents into this repo or into chat logs that get committed.

## Status

`main` is `2b9fad4`. Cavos login, Neon, private Blob, the review and sign flow, per-event membership, invites, the Figma shell, English UI, reimbursement confirmation, and fund retry are in the code.

There is still no real testnet USDC payment hash in the repo.

Open items from [docs/AUDIT-2026-09-30.md](docs/AUDIT-2026-09-30.md), still open in this commit unless noted there:

1. **JWT audience and issuer.** Empty `CAVOS_JWT_AUDIENCE` or `CAVOS_JWT_ISSUER` skips that check. Production does not fail closed.
2. **Wallet ownership.** `POST /api/sesion/wallet` can store a client-supplied `G…` when the JWT has none. `wallet_cobro` still comes from the upload and can change after deploy.
3. **SVG upload.** `esImagen` accepts any `image/*`, including SVG, and the photo route serves the stored type. `next.config.ts` sets no `nosniff` or CSP headers. The demo seed marker is an SVG on purpose.
4. **No CI.** There is no `.github/` workflow.

Also still open: receiver-trustline preflight before deploy and a sponsored trustline on the Account screen (the self-paid `/api/usdc` path is what that screen calls). `wallet.status === "ready"` is not checked before `signXdr`.

Addressed since the audit, in code: English server messages (#68), fund resumes when deploy succeeded and fund failed (#67), pay stays hidden until the escrow balance is positive, reimbursement amount must be confirmed before deploy (#69), Laya score follows the probability index (#59), prepare and submit are bound by an HMAC token (`lib/api/preparado.ts`), and review failures are stored instead of the silent script.

## Design

Abdiel owns UX. Before merging a UI change, compare it with the Figma page "Nuevo diseño" and flag conflicts.
