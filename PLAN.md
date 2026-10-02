# Plan

Current as of `main` at `d755229` (2 October 2026, 03:01 Costa Rica). The 27–28 September kickoff (who codes first, "no backend", "login is broken", Fondear does not sign) described an older tree. It is not a task list. Behavior lives in [AGENTS.md](AGENTS.md) and [STACK.md](STACK.md).

## Done in the repo

- Next.js app on Vercel, Cavos login, Neon, private Blob, English UI.
- One shell: Events, Tasks, Account. Dark and light, aligned to the Figma redesign (#82).
- Per-event organizer, team, and volunteer membership, plus invites (#85).
- Review screen signs deploy, fund, and release. Fund can resume after a successful deploy (#67). Pay waits until the indexed balance is positive. A failed review does not hide those buttons (#90, Josué Valles).
- Reimbursement amount must be confirmed before deploy (#69).
- Groq describes an image. Mile answers a questionnaire about that text, by task type (#80, Raúl / Milasur). The grade is an integer from 0 to 100 (#91, Raúl / Milasur). The screen says Mile. In production, a missing `LAYA_URL` is a review error (#93).
- Work proof is a live camera JPEG. A receipt is a PDF, JPEG, PNG, or WebP file, with an exact-duplicate rejection and a near-duplicate flag (#93, Josué Valles).
- The payout account is the assigned member's session address. Lock budget can recover it from that session when a photo already exists (#94, Josué Valles).
- Prepare and submit carry an HMAC token (`HYTO_TOKEN_SECRET`). The same secret signs the camera token.

## Not done

1. **A real testnet USDC payment.** No `hash_pago` from a successful payment is in the repo. Until one exists, "View payment" has nothing to open and Acta stays out.
2. **Security items still open** in [docs/AUDIT-2026-09-30.md](docs/AUDIT-2026-09-30.md): require Cavos JWT `aud` and `iss` in production, prove wallet ownership, and add CI (`npm ci`, `tsc --noEmit`, `npm test`). New uploads reject SVG. The photo route can still serve a stored `image/*`, the demo marker is still an SVG, and `next.config.ts` still sets no `nosniff` or CSP.
3. **Payout address after deploy.** #94 stores the session account and can fill an empty one at lock time. A later upload can still replace `wallet_cobro` after a contract exists. The session account is still not proven with a signature.
4. **Escrow preflight.** On `main`, deploy still does not check the receiver's USDC trustline (Trustless Work returns `ESCROW_RECEIVER_TRUSTLINE_MISSING`). Open PR #100 would read the account on testnet Horizon first. It is not merged. The predicted contract id is still a process map. The Account screen still uses the self-paid trustline route. `wallet.status === "ready"` is not checked before `signXdr`.
5. **Migration `0005`.** `drizzle/0005_evidencia_antifraude.sql` is in the repo. The file says not to apply it to production without approval. A new upload returns 503 until those columns exist. This plan does not record it as applied.
6. **Mile in the environment.** Outside production, a missing `LAYA_URL` still uses the stub. Whether that URL is set in Vercel is not visible in the repo. A single grave answer can still leave the 0–100 grade in the Met band (#91 left that cap out).

Who still has work, as a suggestion: [ROLES.md](ROLES.md).

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

- **03:01** — #93, Josué Valles (`jxsu404`). Work proof is a live camera JPEG bound to a short-lived token. Receipts accept PDF, JPEG, PNG, or WebP, reject an exact duplicate, and send a PDF to a person. `main` moved to `d755229`.
- **02:48** — #91, Raúl (Milasur). The review grade is a percentage from 0 to 100. A band is only a color. The percentage does not approve a payment.
- **02:46** — #94, Josué Valles (`jxsu404`). The payout account comes from the assigned member's session. The upload form no longer sends a wallet. Lock budget can recover that account from the session when a photo is already stored. `main` moved to `b3affce`.
- **02:29** — #90, Josué Valles (`jxsu404`). The organizer can lock and pay when Mile has no score. The event pending count matches the inbox. The report, the Mile label, and the evidence photo were repaired. Demo login keeps a pending upload and a Met task in review. `main` moved to `1ee6f98`.
- **01:26** — #80, Raúl (Milasur). Laya classifies the written description, then asks only the work or receipt questions Raúl approved. The final score can only go down. A yes does not approve payment.
