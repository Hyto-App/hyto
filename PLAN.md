# Plan

Current as of 7 October 2026: `main` at `31ebd33`, with #179 and #180 open. The 27–28 September kickoff plan is retired. Behavior lives in [AGENTS.md](AGENTS.md) and [STACK.md](STACK.md).

Find Your Way results and the demo are on **12 October 2026**.

## Done in the code

- Next.js app on Vercel, Cavos login (email code or Google), Neon, private Blob, English UI with Spanish.
- Redesigned shell with Mile, the animated review mascot (#146, #151, #155, #159), light and dark.
- Per-event organizer, team, and volunteer membership, and invites (#85).
- Evidence: live camera for work, receipts as photo, PDF, HTML, or text for a capped reimbursement. Anti-fraud by hash, perceptual hash, and capture freshness.
- Mile's review: Groq, with Gemini as fallback, then Laya and a grade from 0 to 100 with reasons and caps. Failures are stored and can be retried. Photo requirements with send-back are built behind `HYTO_MILE_REQUISITOS` and wait for migration 0007.
- Escrow: deploy and fund (resumes after a failed fund, #67), pay after a positive balance, HMAC-bound prepare and submit, receiver-trustline preflight, `wallet_cobro` fixed after deploy, RPC confirmation when a submit throws.
- Get ready to be paid can run again and uses a sponsored trustline when the account has no XLM of its own.

## In open pull requests

- **#179:** the demo reaches Paid, a gallery photo is allowed in demo, Sign in creates the account, and a database error shows on the sign-in screen.
- **#180:**
  - The demo locks and pays without a wallet.
  - A fund marker blocks the double lock (needs migration 0008).
  - Google sign-in is faster.
  - UX fixes from #052.
  - Fixes from the 7 October audit: a demo state flicker, the types the photo route serves, a rate limit on requirement suggestions, and security headers.
  - CI and a code map for cloud agents.
- **#162:** removes the duplicated navigation. **#177:** `/privacy` and a health check. **#160:** the passkey guide for a new device.

## Before 12 October

1. **A real testnet USDC payment** from the app, end to end, with its hash on the report. None exists yet.
2. Merge #179, #180, and #162, and test the demo on the preview with `HYTO_DEMO_LOGIN=1`.
3. Set `CAVOS_JWT_AUDIENCE` in Vercel. Recreate `HYTO_TOKEN_SECRET` and `BLOB_READ_WRITE_TOKEN` as Sensitive.
4. Make sure Laya is up on the day.
5. A person applies migration 0007, then 0008, to Neon.

## After 12 October

- A fiat on-ramp for organizers and an off-ramp for whoever gets paid.
- Move the seed off the request path. Use rate limits that hold across instances, a full CSP, and proof of wallet ownership (nonce).
- One escrow per event with several milestones, to cut per-task cost.
- Donor and sponsor reports (CSV or PDF with the payment hashes). Stipend and scholarship templates: cap, spend categories, and dates.
- Cavos key recovery: enclave (#161) once Cavos enables it, and passkeys (#160).

## How a change lands

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b name/task
```

One task, one branch, one pull request. Run `npx tsc --noEmit`, `npm test`, and `npm run build` before you push; CI runs them again. Update AGENTS.md, the CHANGELOG, and the docs in the same pull request as the code. Do not migrate production without the database owner's go-ahead.
