# Google sign-in timing — 2026-10-07

Mailbox request #069 A point 3: "Sign in with Google takes 20–25 s."

Branch `agente/google-lento`, local only. No auth security check, cookie, or sign-in intent rule was changed.

**What is measured and what is estimated.** Only two numbers come from a real run (2026-10-06): `POST /api/sesion` about 1.3 s, and a 404 on the Stellar account lookup before `POST /api/sesion/wallet` returned 200. The query counts below were counted in code with a counting `Almacen`. Every other cost is an estimate from reading the code and the `@cavos/kit` 0.2.5 sources; nobody ran a browser trace. Take a HAR of one real Google sign-in on a preview to confirm the ranking.

## Timeline (Google, return page)

Each row is sequential unless it says otherwise. File:line is the state before the fixes, except where noted.

| # | What waits | Where | Est. cost |
|---|---|---|---|
| 1 | Click: `politicaSegura` (Cavos recovery policy, `GET cavos.xyz/api/recovery/social/config`). Already prefetched on mount, so normally cached. A cold fetch can wait up to 4 s. | `components/admin/Entrar.tsx:208`, `:605`; `lib/auth/enclave.ts:94,124` | 0 s warm, up to 4 s cold |
| 2 | Click: `crearAuth` (dynamic import of `@cavos/kit`), then `getGoogleOAuthUrl` (Cavos call), then redirect to Google. | `lib/auth/cliente.ts:15,131`; `Entrar.tsx:611-617` | 0.5–1.5 s |
| 3 | Google consent. | not ours | user time |
| 4 | Return to `/?cavos_auth_code=`: server renders `/` (one `sesiones` query, plus a Vercel cold start when the instance is cold), then the browser hydrates `Entrar`. | `app/(admin)/page.tsx:22`; `lib/sesion/vista.ts:9` | 0.3–1.5 s |
| 5 | `crearAuth` again: the `@cavos/kit` chunk is loaded from scratch on this new page. The policy fetch (row 1) restarts in parallel from the mount effect. | `Entrar.tsx:259,1272`; `cliente.ts:15` | 0.5–1.5 s |
| 6 | `handleCallback`: Cavos exchanges the one-time code. | `cliente.ts:164` (was `:145`) | 0.3–1 s |
| 7 | `POST /api/sesion`: JWT check, `asegurarSemilla`, user lookup, session insert. See the server breakdown below. | `lib/api/sesion.ts:39-76` | **1.3 s measured** |
| 8 | `conectarStellar`: kit import and policy (both ready) then `Cavos.connect`. The vault iframe `https://vault.cavos.xyz/vault` starts loading here (15 s load timeout), then the vault derives or restores the key, talks to the Cavos registry or enclave, and calls Horizon `loadAccount`. For an account that is not on the ledger yet that call is the **404** seen in the HAR. | `cliente.ts:40-58`; kit `chunk-MLO4WDTO.mjs:492,638`, `chunk-4FJFNEAP.mjs:120,735` | 2–6 s |
| 9 | `POST /api/sesion/wallet`: one `leerSesion`, one `guardarWallet`. | `cliente.ts:60`; `lib/api/sesion.ts:101-138` | 0.2–0.5 s |
| 10 | **Sign up only** (`debeProvisionar`): `POST /api/sesion/alta` (Horizon read, Friendbot up to 15 s, then up to 6 reads 400 ms apart), then `billetera.execute(1n)` (relayer deploys the account), a Horizon read, and `addTrustline` (another relayer transaction). All awaited before the page navigates. | `cliente.ts:164-168`; `lib/integrante/alta.ts:14-39`; `lib/api/alta.ts`; `lib/integrante/friendbot.ts:77-92`; `lib/integrante/usdc.ts:80-107` | 8–15 s |
| 11 | `window.location.assign("/")`: server renders `/`, which redirects a signed-in user to `/mis-tareas`, which renders again. | `Entrar.tsx:313,362`; `app/(admin)/page.tsx:22` | 0.6–2 s |

No fixed `setTimeout` or polling sits on the Google path. The 1.72 s success animation (`CELDAS_OK_MS`, `BARRA_MS`, `FUNDIDO_MS`) and the 600 ms `ENVIO_MINIMO_MS` belong to the email-code path only.

### Where `POST /api/sesion` goes (row 7)

| Step | Queries or calls | Notes |
|---|---|---|
| `verificarJwt` | 0 when `CAVOS_JWT_JWK` is set. One JWKS fetch on a cold instance when only `CAVOS_JWKS_URL` is set. | `lib/sesion/jwt.ts:201-234`. The JWKS **is** cached (10 min per instance, `TTL_MS`), so only the first sign-in on each instance pays; the fetch times out at 4 s. Failed or empty answers are not cached. |
| `asegurarSemilla` | **11 sequential queries** with demo off, **29** with `HYTO_DEMO_LOGIN=1` (warm database). Counted with a counting `Almacen`. | `lib/db/semilla.ts:133-`. It runs the same walk on almost every API route. |
| `usuarioPorEmail`, `crearSesion` | 2 | needed |

At 40–100 ms per Neon HTTP round trip, the seed walk alone is 0.5–1.2 s with demo off and more with demo on. That is most of the measured 1.3 s.

## Ranking of the 20–25 s

These are estimates; the first two together explain a new-account Google sign-up.

1. **Sign up provisioning, row 10: 8–15 s.** Friendbot, account deploy, trustline, all before navigating. Not on Sign in.
2. **Cavos vault and connect, row 8: 2–6 s.** Includes the Horizon 404, which comes from inside the kit (`CavosStellar.connect` calls `adapter.isDeployed`). Hyto code does not make that lookup and cannot skip it.
3. **Cold loads, rows 4, 5, 11: 1.5–5 s combined.** Two page renders plus a second redirect, a kit chunk, cold lambdas.
4. **`POST /api/sesion`, row 7: 1.3 s.**
5. Code exchange and click-side calls, rows 2 and 6: about 1 s each.

## Fixed in this branch

1. **Seed walk removed from the sign-in critical path** (`lib/api/sesion.ts`). A returning user is found with one `usuarioPorEmail` and gets a session with one `crearSesion`: 2 calls instead of 13 (demo off) or 31 (demo on). The seed still runs when the email is unknown, then the lookup repeats, so Sign in for a seeded identity on an empty database, Sign in 404, and Sign up behave as before. Every route that reads sample data still seeds on its own. Expected saving: 0.5–1.2 s on the 1.3 s. Tests: `lib/api/sesion-sin-semilla.test.ts`.
2. **Vault iframe starts loading before the code exchange** (`precalentarVault` in `lib/auth/cliente.ts`, called first in `entrarConGoogle`). `VaultClient.attach` keeps one iframe per app, and `Cavos.connect({ vault: true })` reuses it, so the iframe page load overlaps rows 6 and 7 instead of following them. It opens no wallet and creates no key, so a rejected Sign in leaves nothing behind but a hidden iframe. Expected saving: 0.5–2 s. Test: `lib/auth/cliente.test.ts`.

## Only documented (not changed)

- **Move Sign up provisioning after navigation (row 10).** Biggest single win (8–15 s), but it changes behavior: the page unmounts, so the work must restart on the next page, and the failure notice and `Get ready to be paid` flow need a decision from Abdiel. `completarAltaTestnet` is already safe to run again.
- **Set `CAVOS_JWT_JWK` in Vercel** to the Cavos public key. `CAVOS_JWT_JWK` wins over `CAVOS_JWKS_URL` (`jwt.ts:80`), which removes the cold-instance JWKS fetch (up to 4 s). Configuration only. Names only here, no values.
- **Make `asegurarSemilla` cheap for every route.** Parallelise the read-only loops and skip the demo-user upsert when demo is off. It touches demo code, which was out of scope.
- **Skip the redirect hop (row 11).** Navigating straight to the final page needs a decision on the landing rule.
- **Check regions.** `vercel.json` sets no region. If the Vercel function region is far from the Neon region, every query costs more than the 40–100 ms assumed above.

## Bugs noticed

- `AGENTS.md` says signed-in users on `/` go to `/eventos`, but `app/(admin)/page.tsx:22` redirects to `/mis-tareas`. The comment in `lib/sesion/retorno.ts` repeats the `/eventos` claim.
- `asegurarSemilla` upserts the two demo users on every call even when `HYTO_DEMO_LOGIN` is off (`semilla.ts:140-142`).
