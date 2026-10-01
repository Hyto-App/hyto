# Coding-agent prompts — Hyto audit tasks (2026-09-30)

One ready-to-paste prompt per person. Each prompt is self-contained: copy everything inside the fenced block into your coding agent (Cursor or similar).

Status on 1 October 2026, 3:33 p.m. Costa Rica time (`main` at `0d2c402`). Owners below are suggestions. Whoever takes someone else's task leaves a note in the mailbox.

| Person | Landed since these prompts | Still open |
|---|---|---|
| Raúl | P1-1 English server messages (PR #68), P1-2 resume after a partial deploy/fund (PR #67), and P1-3 confirmed reimbursement amount (PR #69, 3:33 p.m., Josué Valles co-author). The resume button reads **Finish locking** (PR #77) | Nothing from this list. Camera-only evidence is open PR #72, and Laya questions about the written description are open PR #80. Neither was one of these prompts |
| Josué | Plain-language payment steps and **Approve and pay** only when the budget is locked (PR #77, 11:25 a.m.). Not from the P0 list. Reimbursement fund amount is now the stored confirmation (Raúl's PR #69) | Sponsored trustline, preflight, persist `contractId`, wallet proof, JWT vars in Vercel, first testnet payment, then the remaining P1s. A work-task fund can still use the client amount. Next.js is still 16.3.6. Open PR #18 (Google return) |
| Abdiel | The review shows **AI recommendation**, **Sample recommendation**, or **Review failed**. A Groq or Laya failure is `origen: "error"`, not the fixed script. Laya's score index landed earlier (PR #59). Hiding **Approve and pay** until funded landed in Josué's PR #77 | Model check in production, `LAYA_URL`, pre-sign summary |
| Esteban | Nothing from this list | Image allow-list, security headers, strict JWT, upload limit, session hash |
| Sebastián | Nothing from this list | The env-dependent test in `lib/api/rutas.test.ts`, GitHub Actions, shared rate limit. Acta still waits on a real payment hash |

Kanban: https://app.notion.com/p/2d5d21fae61440d7861d5ce924a6f29c

---

## Josué

```text
You are working on the repo Hyto-App/hyto (https://github.com/Hyto-App/hyto). I am Josué, owner of backend and Stellar/escrow.

BEFORE ANY WORK
1. Read AGENTS.md and docs/AUDIT-2026-09-30.md in full.
2. Read the "Stellar Raven (mandatory)" section of AGENTS.md and connect the Stellar Raven MCP (https://raven.stellar.org/mcp). Use Raven (docs + the trustless-work and stellar-dev skills) to validate EVERYTHING Stellar-related before writing code: trustlines, Cavos addTrustline, Trustless Work v2 endpoints and error codes, SEP-10 / signed messages, RPC getTransaction, network passphrases. Cite what you checked in each PR.

RULES
- Everything in English: code, identifiers you add, user-facing messages, commits, PR titles and descriptions.
- Do NOT edit CHANGELOG.md or any .md file (the docs automation handles documentation). Put explanations in the PR description.
- One small PR per task, from a branch off an up-to-date main named `josue/<task>` (branch names below).
- `npm test` and `npx tsc --noEmit` must be green on every PR. Add tests for the new behaviour.
- No secrets in the repo. Never use a `NEXT_PUBLIC_` variable for a secret, and don't add any new `NEXT_PUBLIC_` variable.
- Do not merge. Open the PR and stop.
- Any UI change must respect Abdiel's Figma (https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy, page "Nuevo diseño"); flag conflicts instead of overwriting his design.
- Do not run DB migrations against production; include them in the PR for the DB owner to apply.

TASKS (P0 first; do them in this order)

P0-1 Sponsored USDC trustline — branch `josue/sponsored-trustline`
- In /cuentas, for real sessions, use Cavos's sponsored `wallet.addTrustline({code, issuer})` instead of the self-paid classic changeTrust built on the server and signed with signXdr. The sponsored path already exists in lib/integrante/usdc.ts:30-58 (only CuentasDemo uses it). Keep the server route only as a read (GET /api/usdc).
- Check `wallet.status === "ready"` before any signXdr; otherwise show "Approve this device". Surface the kit's error text in development.
- Files: lib/api/usdc.ts, lib/integrante/prepararUsdc.ts:23-40, lib/integrante/trustline.ts:16-25, lib/escrow/firmarCliente.ts:149-157, lib/integrante/usdc.ts:30-58, components/sesion/PrepararUsdc.tsx.
- Acceptance: a brand-new Cavos testnet account gets a USDC trustline from /cuentas without holding XLM first (USDC balance line visible on Horizon); a needs-device-approval wallet sees "Approve this device", not "Could not sign"; tests + tsc green.

P0-2 Receiver-trustline and balance preflight — branch `josue/escrow-preflight`
- Before prepararDespliegue, read Horizon /accounts/{wallet_cobro} and require a USDC balance line. Before fondear, check the organizer's XLM and USDC.
- Map ESCROW_RECEIVER_TRUSTLINE_MISSING, TOKEN_TRUSTLINE_MISSING (422) and TOKEN_BALANCE_INSUFFICIENT (409) to clear English messages.
- Files: lib/api/firma.ts:144-194, lib/escrow/modulo.ts:148-160, lib/escrow/cuerpos.ts:6-10.
- Acceptance: deploy is refused with a clear message (no Trustless Work call) when wallet_cobro lacks the trustline; fund is refused when the organizer lacks USDC/XLM; the three codes have unit tests; tests + tsc green.

P0-3 Persist predicted contractId — branch `josue/persist-contract-id`
- Replace the in-process `contratosPreparados` Map: save `contrato_escrow_pendiente` + `hash_preparado` in `tareas` at prepare time (new migration in drizzle/). On STELLAR_TX_SUBMITTED_INDEXER_LAGGING ("do not retry"), confirm with RPC getTransaction(hash) and promote it to contrato_escrow.
- Files: lib/api/firma.ts:19,189,263-273, lib/db/schema.ts, drizzle/.
- Acceptance: a submit handled with a fresh store/instance after prepare still saves the contract id (test); INDEXER_LAGGING never allows a second deploy of the same task; tests + tsc green.

P0-4 Wallet ownership proof and locked wallet_cobro — branch `josue/wallet-proof`
- POST /api/sesion/wallet: the server issues a nonce, the Cavos wallet signs it with signMessage() (per @cavos/kit 0.2.5 typings: ed25519 over "Cavos Signed Message:\n<len>\n" + message, verify with Keypair.fromPublicKey(addr).verify), the server verifies before storing. Validate this format with Raven/the kit typings first.
- wallet_cobro = the verified session wallet (not a form field); refuse changes once contrato_escrow is set; validate with StrKey.isValidEd25519PublicKey instead of the regex in esCuenta.
- Files: lib/api/sesion.ts:97-112, lib/sesion/correo.ts:25-26, lib/sesion/exigir.ts:24-33, lib/api/evidencias.ts:98,106-108,126, lib/api/firma.ts:177-185, lib/escrow/cuerpos.ts (esCuenta).
- Acceptance: an unsigned or wrongly signed wallet is rejected (test); new evidence after deploy does not change wallet_cobro (test); bad-checksum address rejected; tests + tsc green.

P0-5 CAVOS_JWT_AUDIENCE / CAVOS_JWT_ISSUER in Vercel (no code; manual checklist)
- Remind me to set both in Vercel production (value = Hyto's Cavos app id for aud; confirm with Cavos) BEFORE Esteban's strict-JWT PR is deployed. Never write the values in the repo.
- Acceptance: both set; real Cavos sign-in still works after redeploy.

P0-6 First 20 testnet USDC payment (manual run after P0-1 and P0-2 are merged)
- Give me a step-by-step checklist: organizer wallet with testnet XLM + USDC, volunteer wallet_cobro with trustline, Deploy and fund → Approve and pay on a US$20 task.
- Acceptance: tareas.hash_pago holds a real testnet hash, "See payment" opens it on stellar.expert, milestone released.

P1-1 Server-side fund amount — branch `josue/server-fund-amount`
- On fondear, load the task and recompute montoDeTarea server-side; ignore (or reject a mismatched) body monto.
- Files: lib/escrow/cuerpos.ts (leerEntrada), components/admin/Revision.tsx:131.
- Acceptance: a tampered monto cannot underfund (test); tests + tsc green.

P1-2 approve-and-release + volunteer as serviceProvider — branch `josue/approve-and-release`
- Use Trustless Work v2 POST /approve-and-release-milestones; make the volunteer the serviceProvider (today proveedor: opciones.firmante = organizer).
- Files: lib/escrow/firmarCliente.ts:17, lib/escrow/desplegar.ts:76-81, lib/escrow/cuerpos.ts:101-107.
- Acceptance: fewer organizer signatures than today's 3, validated against the Trustless Work v2 docs via Raven; tests + tsc green.

P1-3 Schema migration 0003 + indexed queries — branch `josue/schema-0003`
- Indexes on tareas(proyecto_id), tareas(miembro_id), UNIQUE(contrato_escrow), sesiones(expira_en); numeric(20,7) amounts; timestamptz; FKs for sesiones.usuario_id and veredictos.tarea_id; CHECKs on rol/estado. Add tareaPorContrato and tareasDeUsuario queries.
- Files: lib/db/schema.ts, drizzle/0000_inicio.sql (new drizzle/0003_*.sql), lib/api/organizador.ts:8,32, lib/api/alcance.ts:26-77, app/api/escrow/[contrato]/route.ts:19.
- Acceptance: migration applies on a local Postgres (npm run db:local + db:migrar); no full-table scan to find a task by contract; tests + tsc green.

P1-4 Pin network passphrase + escrow config — branch `josue/network-config`
- Single NETWORK_PASSPHRASE from config, reject other networks with "network mismatch"; Trustless Work base URL, network and USDC issuer from config (testnet defaults).
- Files: lib/escrow/xdr.ts:47-58, lib/api/firma.ts:300-322, lib/escrow/cuerpos.ts:3.
- Acceptance: a PUBLIC-network XDR is rejected (test); tests + tsc green.

CLOSING REPORT
When done, reply with: for each task, the PR link, branch, what changed (files), how you validated it with Stellar Raven, test/tsc results, and anything left open or blocked.
```

---

## Abdiel

P1-1 below (hide **Approve and pay** until funded) landed on 1 October 2026 at 11:25 a.m. Costa Rica time in Josué Valles's PR #77. `botonesRevision` already requires `conContrato && fondeado === true`. Do not reopen it. Start at the AI tasks and at P1-2.

```text
You are working on the repo Hyto-App/hyto (https://github.com/Hyto-App/hyto). I am Abdiel (GitHub abdxcole). I am the single owner of the WHOLE AI evidence flow plus Laya, end to end, and the UX/Figma owner.

BEFORE ANY WORK
1. Read AGENTS.md and docs/AUDIT-2026-09-30.md in full (especially AGENTS.md "Estado actual y próximos pasos", step 2, which describes today's AI code).
2. Read the "Stellar Raven (mandatory)" section of AGENTS.md and connect the Stellar Raven MCP (https://raven.stellar.org/mcp). Consult Raven before starting, and use it to validate anything Stellar-related you touch (escrow state, funding, signing UX).

RULES
- Everything in English: code, identifiers you add, user-facing messages, commits, PR titles and descriptions.
- Do NOT edit CHANGELOG.md or any .md file (the docs automation handles documentation). Document decisions and the flow in the PR description.
- One small PR per task, from a branch off an up-to-date main named `abdiel/<task>` (branch names below).
- `npm test` and `npx tsc --noEmit` must be green on every PR. Add tests for the new behaviour.
- No secrets in the repo (GROQ_API_KEY, LAYA_URL, LAYA_API_KEY live only in Vercel / .env.local). Never use `NEXT_PUBLIC_` for a secret; don't add any new `NEXT_PUBLIC_` variable.
- Do not merge. Open the PR and stop.
- UI must follow my Figma (https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy, page "Nuevo diseño").

THE FLOW YOU OWN (end to end)
Evidence photo upload (lib/api/evidencias.ts) → AI review (revisar() in lib/revision/revisar.ts; Groq call in lib/revision/scout.ts) → Laya decision (lib/revision/laya.ts, POST {LAYA_URL}/v1/systemone, model "multilingual", questions choice/noul/score, LAYA_API_KEY as Bearer) → verdict built by armarVeredicto (cumplió / parcial / insuficiente) → shown in the review (components/admin/Revision.tsx via lib/api/informe.ts) with a retry (POST /api/revision/:id re-runs it).
Known problems today (AGENTS.md + audit): every failure silently falls back to desdeGuion() with origen "guion" and no log; the UI never shows origen, so a scripted verdict looks like a real one; without LAYA_URL the stub always answers "parcial"; the code calls qwen/qwen3.8-27b although names say "Llama 4 Scout" (C8); reimbursement amounts come from the model's OCR (C6).

TASKS (P0 first; do them in this order)

P0-1 Pick and configure the AI model — branch `abdiel/ai-model`
- Decide Qwen (qwen/qwen3.8-27b, what the code calls) vs Llama 4 Scout. Make the model id a server-only env var with the chosen default. Confirm the response JSON with `texto` parses within max_completion_tokens (code uses 1024) and isn't cut by model thinking.
- Files: lib/revision/scout.ts:5,7,9-10, lib/revision/revisar.ts.
- Acceptance: one model, read from an env var; a real photo returns a parsed description; decision + reasoning written in the PR description; tests + tsc green.

P0-2 Connect Laya — branch `abdiel/laya-connect` (code part, if any) + manual checklist
- Laya runs on my Arcole-PC (Tailscale Funnel). Checklist for me: LAYA_URL in Vercel points to it; LAYA_API_KEY on the Laya server equals the Vercel value. Code: when Laya returns non-2xx (e.g. 401 wrong key) log it clearly and propagate an error instead of silently using the stub. Check whether PR #15 (score index) is superseded by merged #59.
- Files: lib/revision/laya.ts, lib/revision/revisar.ts.
- Acceptance: a production review calls Laya (not stubLaya) with the Bearer key and gets 200; a wrong key produces a logged, visible error; tests + tsc green.

P0-3 Full flow with real error handling, result and retry — branch `abdiel/ai-flow-e2e`
- Replace silent fallbacks with explicit, logged errors per stage (no key, no photo, Groq down, bad JSON, Laya down). Carry `origen` through lib/api/informe.ts and show it in the review. Show clear English messages and a working "Retry review" in the UI (POST /api/revision/:id). Keep the upload response fast (current 2.8 s wait) and store the verdict afterwards as today.
- Test with a real photo (work task and reimbursement) against production keys.
- Files: lib/api/evidencias.ts, lib/revision/revisar.ts, lib/revision/scout.ts, lib/revision/laya.ts, app/api/revision/[id], lib/api/informe.ts, components/admin/Revision.tsx.
- Acceptance: a real photo gets a Groq + Laya verdict with origen not "guion", visible in the review; any stage failure shows an English error + retry and is logged; unit tests cover every failure path; PR description documents the whole flow (stages, env vars, fallbacks, messages); tests + tsc green.
- Coordinate: Esteban is changing upload validation (image allow-list) and the 4.5 MB limit in lib/api/evidencias.ts; rebase on his PRs and don't duplicate that work.

P1-1 Hide "Approve and pay" until funded — branch `abdiel/hide-pay-unfunded`
- pagar is `!bloqueado && estado === "en revisión"`; require `conContrato && fondeado === true`.
- Files: lib/admin/remoto.ts:77 (botonesRevision).
- Acceptance: button hidden without a contract or funding (unit test); matches Figma; tests + tsc green.

P1-2 Pre-sign summary and per-step status — branch `abdiel/presign-summary`
- Figma first, then code: before each signature show amount, receiver G…, contract C…, network; then a pending → confirmed stepper per step; network-mismatch message.
- Files: components/admin/Revision.tsx, lib/escrow/firmarCliente.ts.
- Acceptance: organizer sees the summary before deploy/fund/pay and each step's status after; matches Figma; tests + tsc green.

CLOSING REPORT
When done, reply with: for each task, the PR link, branch, files changed, the model decision, a description of the end-to-end flow as implemented, the real-photo test result (verdict + origen), what you validated with Raven, test/tsc results, and anything left open (e.g. Laya uptime).
```

---

## Esteban

```text
You are working on the repo Hyto-App/hyto (https://github.com/Hyto-App/hyto). I am Esteban (Psybre), owner of security.

BEFORE ANY WORK
1. Read AGENTS.md and docs/AUDIT-2026-09-30.md in full (section 3.1 Security).
2. Read the "Stellar Raven (mandatory)" section of AGENTS.md and connect the Stellar Raven MCP (https://raven.stellar.org/mcp). Consult Raven before starting and use it to validate anything Stellar-related you touch.

RULES
- Everything in English: code, identifiers you add, user-facing messages, commits, PR titles and descriptions.
- Do NOT edit CHANGELOG.md or any .md file (the docs automation handles documentation). Explain in the PR description.
- One small PR per task, from a branch off an up-to-date main named `esteban/<task>` (branch names below).
- `npm test` and `npx tsc --noEmit` must be green on every PR. Add tests for the new behaviour.
- No secrets in the repo. Never use `NEXT_PUBLIC_` for a secret; don't add any new `NEXT_PUBLIC_` variable.
- Do not merge. Open the PR and stop.
- Any UI change must respect Abdiel's Figma (https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy, page "Nuevo diseño").
- Do not run DB migrations against production.

TASKS (P0 first; do them in this order)

P0-1 Block SVG / image allow-list — branch `esteban/image-allowlist`
- esImagen accepts any image/* (incl. image/svg+xml) and an empty type. Allow only image/jpeg, image/png, image/webp, image/heic, verified by magic bytes; store and serve the sniffed type, not the client's.
- Files: lib/api/evidencias.ts:195-198 (accept), :69-71 (serve), lib/blob/fotos.ts:45.
- Acceptance: SVG, empty-type and mismatched-bytes uploads are rejected with a clear English error (tests); JPEG/PNG/WebP/HEIC still work; tests + tsc green.

P0-2 nosniff + CSP headers — branch `esteban/security-headers`
- Photo route GET /api/evidencias/:id/foto: X-Content-Type-Options: nosniff, Content-Disposition: inline; filename=…, Content-Security-Policy: default-src 'none'; img-src 'self'. Global security headers in next.config.ts without breaking Cavos, Vercel Blob or Trustless Work calls.
- Files: lib/api/evidencias.ts:69-71, next.config.ts.
- Acceptance: curl -I shows the headers on the photo route and pages; sign-in and the escrow flow still work on a preview deploy; tests + tsc green.

P0-3 Strict JWT in production — branch `esteban/strict-jwt`
- In production (NODE_ENV or VERCEL_ENV = production), fail closed when CAVOS_JWT_AUDIENCE or CAVOS_JWT_ISSUER is empty. Tests: "prod + empty aud ⇒ reject" and the same for iss. Optional (D3): add the Cavos JWT vars and HYTO_DEMO_LOGIN to VARIABLES_SERVIDOR in lib/config/entorno.ts.
- Files: lib/sesion/jwt.ts:63-64,95-99, lib/config/entorno.ts:32-95, .env.example (names only, never values).
- Acceptance: tests pass; dev behaviour unchanged; PR description warns that Josué must set both vars in Vercel before deploy.

P1-1 4.5 MB upload limit — branch `esteban/upload-limit`
- Code allows 8 MB (lib/api/evidencias.ts:10) but Vercel rejects bodies > 4.5 MB with 413 FUNCTION_PAYLOAD_TOO_LARGE. Compress on the client (canvas, ~2 MB JPEG) or use Vercel Blob client uploads (@vercel/blob/client upload()); align the server limit. Coordinate with Abdiel (he owns the upload step of the AI flow).
- Acceptance: a 6–8 MB phone photo uploads; an over-limit file shows Hyto's English message, never a raw 413; tests + tsc green.

P1-2 Session token hardening — branch `esteban/session-hash`
- Store sha256(token) in sesiones and look up by hash; purge expired sessions (migration included in the PR, not run on prod); remove the localStorage mirror of the Cavos token (keep sessionStorage only).
- Files: lib/db/schema.ts:63-70, lib/api/sesion.ts:51-58, lib/auth/cavosSesion.ts:29-39,55-63.
- Acceptance: no raw token in the DB (test); no Cavos token in localStorage; tests + tsc green.

CLOSING REPORT
When done, reply with: for each task, the PR link, branch, files changed, how you tested the security fix (including negative tests), test/tsc results, and anything left open.
```

---

## Sebastián

```text
You are working on the repo Hyto-App/hyto (https://github.com/Hyto-App/hyto). I am Sebastián, owner of CI and tests.

BEFORE ANY WORK
1. Read AGENTS.md and docs/AUDIT-2026-09-30.md in full (section 3.6 Tests, section 3.1 S7, section 3.3 E9).
2. Read the "Stellar Raven (mandatory)" section of AGENTS.md and connect the Stellar Raven MCP (https://raven.stellar.org/mcp). Consult Raven before starting and use it to validate anything Stellar-related (e.g. Trustless Work rate limits).

RULES
- Everything in English: code, identifiers you add, messages, commits, PR titles and descriptions.
- Do NOT edit CHANGELOG.md or any .md file (the docs automation handles documentation). Explain in the PR description.
- One small PR per task, from a branch off an up-to-date main named `sebastian/<task>` (branch names below).
- `npm test` and `npx tsc --noEmit` must be green on every PR.
- No secrets in the repo or in workflow files. Never use `NEXT_PUBLIC_` for a secret; don't add any new `NEXT_PUBLIC_` variable.
- Do not merge. Open the PR and stop.
- Any UI change must respect Abdiel's Figma (https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy).

TASKS (P0 first; do them in this order)

P0-1 Fix the env-dependent failing test — branch `sebastian/fix-rutas-test`
- npm test in a clean checkout: 287 tests, 1 fails at lib/api/rutas.test.ts:495 ("el envío de resolve_dispute usa el firmante del XDR…"). enviarFirmaHttp is called without an almacen, falls back to almacenNeon() and runs a real select on "tareas" (lib/api/firma.ts:104 → lib/api/organizador.ts:32 → lib/db/neon.ts:118). Pass an in-memory store (crearMemoria()) so it never touches Neon.
- Acceptance: npm test passes 287/287 in a clean checkout with no DATABASE_URL, in any order.

P0-2 GitHub Actions CI — branch `sebastian/ci`
- Add .github/workflows/ci.yml running on pull_request and push to main: npm ci, npx tsc --noEmit, npm test (Node version from package.json/engines or the one Vercel uses). No secrets needed.
- Acceptance: the workflow runs on every PR and is green once P0-1 is merged; a type error or failing test turns it red.

P1-1 Distributed rate limit — branch `sebastian/shared-rate-limit`
- lib/escrow/limite.ts is an in-memory Map per instance keyed on the first x-forwarded-for entry. Move it to a shared store (Vercel KV/Upstash or a Neon table, or Vercel Firewall rules). Add a global limiter per Trustless Work API key (50 req/60 s; confirm via Raven) with backoff on 429.
- Files: lib/escrow/limite.ts:2-3,7-28.
- Acceptance: two instances share counters (test with the store mocked); a Trustless Work 429 triggers backoff, not a user error; tests + tsc green.

CLOSING REPORT
When done, reply with: for each task, the PR link, branch, files changed, a link to a green CI run, test/tsc results, and anything left open.
```

---

## Raúl

P1-1, P1-2, and P1-3 below already landed on 1 October 2026 (PR #68, PR #67, and PR #69 at 3:33 p.m. Costa Rica time). The resume button reads **Finish locking** (PR #77). Do not reopen the English-message guard, the partial-deploy reload, or the reimbursement confirmation. The receipt reading stays in `evidencias.monto`. Deploy and fund use `evidencias.monto_confirmado`.

```text
You are working on the repo Hyto-App/hyto (https://github.com/Hyto-App/hyto). I am Raúl, working on English-only strings and P1 UX/frontend items.

BEFORE ANY WORK
1. Read AGENTS.md and docs/AUDIT-2026-09-30.md in full (sections 3.2 C5/C6 and 3.4 U3).
2. Read the "Stellar Raven (mandatory)" section of AGENTS.md and connect the Stellar Raven MCP (https://raven.stellar.org/mcp). Consult Raven before starting and use it to validate anything Stellar-related (escrow deploy/fund steps, Trustless Work error meanings when translating messages).

RULES
- Everything in English: code, identifiers you add, user-facing messages, commits, PR titles and descriptions.
- Do NOT edit CHANGELOG.md or any .md file (the docs automation handles documentation). Explain in the PR description.
- One small PR per task, from a branch off an up-to-date main named `raul/<task>` (branch names below).
- `npm test` and `npx tsc --noEmit` must be green on every PR. Update tests that assert strings you change; add tests for new behaviour.
- No secrets in the repo. Never use `NEXT_PUBLIC_` for a secret; don't add any new `NEXT_PUBLIC_` variable.
- Do not merge. Open the PR and stop.
- Every UI change must follow Abdiel's Figma (https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy, page "Nuevo diseño"); flag conflicts instead of overwriting his design.

TASKS (all P1; do them in this order)

P1-1 Translate remaining Spanish messages + guard test — branch `raul/english-messages`
- Translate user-facing Spanish strings, e.g. "Trustless Work no autorizó la clave del servidor…", "Trustless Work rechazó la solicitud." (lib/escrow/modulo.ts:62,143,160), "Faltan el contrato y la cuenta que firma." (lib/escrow/cuerpos.ts:328), "Falta … en el servidor…" / "… no es una cuenta de Stellar." (lib/escrow/desplegar.ts:96-97), resolver messages such as "Ese hito no está en disputa." (lib/escrow/resolver.ts). Search lib/ for the rest.
- Add a test that fails on non-ASCII Spanish in aviso/mensaje strings under lib/ (outside comments).
- Acceptance: no Spanish text reaches users from those paths; guard test passes and would fail on a new Spanish message; existing tests updated, not deleted; tests + tsc green.

P1-2 Resume after a partial deploy/fund — branch `raul/resume-partial-deploy`
- If deploy succeeds and fund fails, firmarPasos throws before the detail reloads, so the UI can keep offering "Deploy and fund". Reload the detail in a finally and resume from fondear when contrato_escrow is set.
- Files: lib/escrow/firmarCliente.ts:91-122, components/admin/Revision.tsx:120-160.
- Acceptance: after a simulated fund failure the screen offers "Fund" and retrying funds the existing contract (test); matches Figma; tests + tsc green.

P1-3 Organizer confirms reimbursement amount — branch `raul/confirm-reimbursement`
- For reembolso, the escrow amount is evidencia.monto from the model's OCR, capped at tope, never confirmed. Add an editable, required confirmation field before "Deploy and fund" and store the confirmed amount separately. Coordinate with Abdiel (he owns the AI output and the Figma).
- Files: lib/escrow/desplegar.ts:31-40, lib/api/evidencias.ts:172, lib/revision/scout.ts:9-10.
- Acceptance: deploy of a reimbursement is blocked until an amount ≤ tope is confirmed, and the escrow uses it (test); matches Figma; tests + tsc green.

CLOSING REPORT
When done, reply with: for each task, the PR link, branch, files changed, the list of strings translated, screenshots vs. Figma for UI changes, test/tsc results, and anything left open.
```
