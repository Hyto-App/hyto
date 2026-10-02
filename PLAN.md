# Plan

Current as of `main` at `2b9fad4` (2 October 2026). The 27–28 September kickoff (who codes first, "no backend", "login is broken", Fondear does not sign) described an older tree. It is not a task list. Behavior lives in [AGENTS.md](AGENTS.md) and [STACK.md](STACK.md).

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

One task, one branch, one pull request. Do not reuse a branch for unrelated work. Do not migrate production without the database owner's go-ahead.
