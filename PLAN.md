# Plan

Current as of `main` at `601d143` (2 October 2026, 12:17 a.m. Costa Rica). That commit is PR #87 (Josué Valles): docs, `.env.example`, the `0004` comment, and the schema inventory hash. Product behavior is still the tree of `2b9fad4`. The 27–28 September kickoff (who codes first, "no backend", "login is broken", Fondear does not sign) described an older tree. It is not a task list. Behavior lives in [AGENTS.md](AGENTS.md) and [STACK.md](STACK.md).

## Done in the repo

- Next.js app on Vercel, Cavos login, Neon, private Blob, English UI.
- One shell: Events, Tasks, Account. Dark and light, aligned to the Figma redesign (#82).
- Per-event organizer, team, and volunteer membership, plus invites (#85).
- Review screen signs deploy, fund, and release. Fund can resume after a successful deploy (#67). Pay waits until the indexed balance is positive.
- Reimbursement amount must be confirmed before deploy (#69).
- Groq describes the photo. Failures are stored and can be retried. Laya's score can come from probability indexes (#59).
- Prepare and submit carry an HMAC token (`HYTO_TOKEN_SECRET`).

## Not done

1. **A real testnet USDC payment.** No `hash_pago` from a successful payment is in the repo. Until one exists, "View payment" has nothing to open and Acta stays out.
2. **Security items still open** in [docs/AUDIT-2026-09-30.md](docs/AUDIT-2026-09-30.md): require Cavos JWT `aud` and `iss` in production, prove wallet ownership, stop SVG evidence XSS and add `nosniff`/CSP, add CI (`npm ci`, `tsc --noEmit`, `npm test`).
3. **Escrow preflight.** Check the receiver's USDC trustline before deploy (Trustless Work returns `ESCROW_RECEIVER_TRUSTLINE_MISSING`). Persist the predicted contract id in the database instead of the process map. The Account screen still uses the self-paid trustline route.
4. **Laya in the environment.** The code calls `LAYA_URL` when it is set and otherwise uses the stub. Whether that URL is set in Vercel is not visible in the repo.

The MVP stays on escrow payments. New product surfaces wait until a real payment and the open security items are done.

## How a change lands

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b name/task
```

One task, one branch, one pull request. Do not reuse a branch for unrelated work. Do not migrate production without the database owner's go-ahead. `0004_miembros_invitaciones.sql` is already marked applied on Neon (2026-10-01, backup branch `pre-0004-backup`).

## Still open, by person

Owners are suggestions. Anyone can take an item. Open drafts are not on `main`.

- **Josué.** Receiver-trustline check before deploy, save the predicted contract id in the database, prove wallet ownership, and use the sponsored trustline on Account. Draft PR #18: Google return drops the session.
- **Abdiel.** Whether `LAYA_URL` is set in Vercel is not in the repo. The review stub still runs when it is unset. Open mailbox notes: PR #70 and PR #79.
- **Esteban.** Reject SVG and other non-photo image types, add `nosniff` and CSP, and fail closed in production when `CAVOS_JWT_AUDIENCE` or `CAVOS_JWT_ISSUER` is empty.
- **Sebas.** GitHub Actions (`npm ci`, `tsc --noEmit`, `npm test`) and the env-dependent test in `lib/api/rutas.test.ts`. A real testnet USDC payment is still missing, so Acta stays out.
- **Raúl.** Draft PR #72 (camera-only evidence) and draft PR #80 (Laya questionnaire). PR #67, PR #68, and PR #69 are already on `main`.

## Bitácora

### 2026-10-02

12:17 a.m., Costa Rica. PR #87 (Josué Valles, squash `601d143`) reached `main`. It rewrote the project docs against `2b9fad4` (roleless events, one shell, the env names the code reads), rewrote `.env.example` in English, marked migration `0004` as applied on Neon on 2026-10-01, and refreshed the schema inventory hash so the inventory test still matches that comment. No product behavior changed.

What is still open is the list above. Earlier landings, with PR number and author, are in [CHANGELOG.md](CHANGELOG.md). The September kickoff log is not a task list.
