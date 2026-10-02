# Plan

Current as of `main` at `b3affce` (2 October 2026, 02:46 Costa Rica). The 27–28 September kickoff (who codes first, "no backend", "login is broken", Fondear does not sign) described an older tree. It is not a task list. Behavior lives in [AGENTS.md](AGENTS.md) and [STACK.md](STACK.md).

## Done in the repo

- Next.js app on Vercel, Cavos login, Neon, private Blob, English UI.
- One shell: Events, Tasks, Account. Dark and light, aligned to the Figma redesign (#82).
- Per-event organizer, team, and volunteer membership, plus invites (#85).
- Review screen signs deploy, fund, and release. Fund can resume after a successful deploy (#67). Pay waits until the indexed balance is positive. A failed review does not hide those buttons (#90, Josué Valles).
- Reimbursement amount must be confirmed before deploy (#69).
- Groq describes the photo. Mile answers a questionnaire about that text, by task type (#80, Raúl / Milasur). Failures are stored and can be retried. The event pending count uses the same rule as the inbox. The report has Print and the budget bar. The photo response sniffs JPEG, PNG, GIF, and WebP. The demo seed keeps one task pending for upload and one in review with a Met sample (#90).
- The payout account is the assigned member's session address. Lock budget can recover it from that session when a photo already exists (#94, Josué Valles).
- Prepare and submit carry an HMAC token (`HYTO_TOKEN_SECRET`).

## Not done

1. **A real testnet USDC payment.** No `hash_pago` from a successful payment is in the repo. Until one exists, "View payment" has nothing to open and Acta stays out.
2. **Security items still open** in [docs/AUDIT-2026-09-30.md](docs/AUDIT-2026-09-30.md): require Cavos JWT `aud` and `iss` in production, prove wallet ownership, stop SVG evidence XSS and add `nosniff`/CSP, add CI (`npm ci`, `tsc --noEmit`, `npm test`).
3. **Payout address after deploy.** #94 stores the session account and can fill an empty one at lock time. A later upload can still replace `wallet_cobro` after a contract exists. The session account is still not proven with a signature.
4. **Escrow preflight.** Check the receiver's USDC trustline before deploy (Trustless Work returns `ESCROW_RECEIVER_TRUSTLINE_MISSING`). Persist the predicted contract id in the database instead of the process map. The Account screen still uses the self-paid trustline route.
5. **Mile in the environment.** The code calls `LAYA_URL` when it is set and otherwise uses the stub. The screen says Mile. Whether that URL is set in Vercel is not visible in the repo.
6. **PR #93 is open.** Camera checks for work proof and file checks for receipts, including migration `drizzle/0005_evidencia_antifraude.sql`. That is not how upload works on `main`.

Who still has work, as a suggestion: [ROLES.md](ROLES.md). Short version: the missing testnet payment and the trustline preflight sit with Sebas. The open audit items (JWT audience and issuer, wallet proof, SVG, CI, and locking the payout address once a contract exists) sit with Esteban. Abdiel still compares UI with Figma; the five P0 items from the 2 October UI audit landed in #90. Raúl's questionnaire is on `main`. Josué's session payout account is on `main`.

The MVP stays on escrow payments. New product surfaces wait until a real payment and the open security items are done.

## How a change lands

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b name/task
```

One task, one branch, one pull request. Do not reuse a branch for unrelated work. Do not migrate production without the database owner's go-ahead.

## Bitácora

Times are Costa Rica (UTC−6, no daylight saving). Older landings stay in [CHANGELOG.md](CHANGELOG.md). This log starts at the 2 October 2026 commits that followed the docs refresh at `2b9fad4`.

### 2026-10-02

- **02:46** — #94, Josué Valles (`jxsu404`). The payout account comes from the assigned member's session. The upload form no longer sends a wallet. Lock budget can recover that account from the session when a photo is already stored. `main` moved to `b3affce`.
- **02:29** — #90, Josué Valles (`jxsu404`). The organizer can lock and pay when Mile has no score. The event pending count matches the inbox. The report, the Mile label, and the evidence photo were repaired. Demo login keeps a pending upload and a Met task in review. `main` moved to `1ee6f98`.
- **01:26** — #80, Raúl (Milasur). Laya classifies the written description, then asks only the work or receipt questions Raúl approved. The final score can only go down. A yes does not approve payment.
