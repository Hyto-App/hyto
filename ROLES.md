# Roles

Current as of `main` at `d755229` (2 October 2026, 03:01 Costa Rica). The September kickoff that assigned a global product role at login is retired. See [AGENTS.md](AGENTS.md).

## In the product

Nobody picks "organizer" or "volunteer" at login. Membership is per event, in `proyecto_miembros`.

| Membership | How you get it | What you can do |
|---|---|---|
| Organizer | Create an event. The wallet must cover the budget plus 1 USDC. | See every task, invite people, assign tasks at `/eventos/[id]/tareas`, lock the budget, confirm a reimbursement, pay. |
| Team | Invite (`rol: "team"`), direct or code. | See and submit evidence only on tasks assigned to you. |
| Volunteer | Invite (`rol: "volunteer"`), or the default when the invite omits `team`. | Same visibility as team: assigned tasks only. |

Invites last 7 days. A direct invite is bound to one email and one use. A code looks like `HYTO-` plus 12 characters and can allow many uses (default 50, max 500).

`usuarios.rol` is still written (`voluntario` for a new Cavos user, `organizador` only if that row already says so, including the seed). Screens and escrow checks do not use it to decide who organizes an event.

Demo mode (`HYTO_DEMO_LOGIN=1`) is the leftover switch: **Enter as demo** chooses organizer or volunteer. Those sessions do not sign and cannot create events.

## On the team

Owners below are suggestions. Anyone can take a task. If you do, leave a short note with the branch, the PR, and what is left.

That note, and the rest of the coordination between people and agents, goes in the private repo [Hyto-App/hyto-private](https://github.com/Hyto-App/hyto-private). Do not copy that repo into Hyto or into committed docs.

| Person | Suggested focus |
|---|---|
| Abdiel Cole | UX, the Figma file, Laya |
| Esteban | API, Neon, Blob, review pipeline |
| Sebas | Escrow, Cavos, a real testnet payment |
| Josué | App shell, admin flows, docs |
| Raúl | Member tasks, evidence upload, accounts |

Work lands as a pull request from an updated `main`. Nobody pushes to `main`.

## Still open, by person

Suggestions only. The open pull requests below are not on `main`.

| Person | On `main` | Still open |
|---|---|---|
| Josué | #90 (demo review path, Mile label), #93 (camera and receipt checks), #94 (session payout account) | Apply `drizzle/0005_evidencia_antifraude.sql` only with his approval. Until then, a new upload returns 503. Open PR #100 would check the payout account on testnet Horizon before deploy. Draft #18 (return from Google) is still open. Camera-token reuse is process-local. |
| Raúl | #80 (questionnaire), #91 (grade 0–100) | A single grave answer can still show Met. Drafts #72 (camera-only; work tasks on `main` already require a camera, receipts still take a file), #96 (retry a failed review), #98 (account panel), and #99 (live inbox) are open. |
| Abdiel Cole | The five P0 items from the 2 October UI audit landed in #90. The screen says Mile. | Draft #89 is the audit note. Its P0 boxes are done in code. P1/P2 polish was left for a later pass. Whether `LAYA_URL` is set in Vercel is not in the repo. |
| Esteban | New uploads no longer accept SVG. | Empty `CAVOS_JWT_AUDIENCE` or `CAVOS_JWT_ISSUER` still skips that check. `POST /api/sesion/wallet` can still store a client-supplied `G…`. A later upload can still replace `wallet_cobro` after a contract exists. Stored files can still be served as `image/*`, the demo marker is still an SVG, and there are no `nosniff` or CSP headers. There is no CI. |
| Sebas | The in-app sign flow is on `main`. | No real testnet `hash_pago`, so Acta stays out. The receiver trustline is not checked on `main`. The predicted contract id is still process-local. Account still uses the self-paid trustline. `wallet.status === "ready"` is not checked before `signXdr`. |

The per-person prompts in [docs/AGENT-PROMPTS-2026-09-30.md](docs/AGENT-PROMPTS-2026-09-30.md) described the 30 September audit against an older commit. Do not paste them into an agent as current instructions.
