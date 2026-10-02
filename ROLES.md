# Roles

Current as of `main` at `601d143` (2 October 2026, 12:17 a.m. Costa Rica, PR #87). Product behavior is still `2b9fad4`. The September kickoff that assigned a global product role at login is retired. See [AGENTS.md](AGENTS.md).

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

The per-person prompts in [docs/AGENT-PROMPTS-2026-09-30.md](docs/AGENT-PROMPTS-2026-09-30.md) described the 30 September audit against an older commit. Do not paste them into an agent as current instructions.

## Still open

Suggestions, not exclusive assignments. Detail is in [PLAN.md](PLAN.md).

| Person | Still open |
|---|---|
| Josué | Receiver-trustline preflight, persist the predicted contract id, wallet-ownership proof, sponsored trustline on Account. Draft PR #18 (Google return drops the session). |
| Abdiel | `LAYA_URL` is not visible in the repo. Open mailbox notes: PR #70, PR #79. |
| Esteban | SVG and unknown image types, `nosniff` and CSP, production fail-closed JWT audience and issuer. |
| Sebas | CI (`npm ci`, `tsc --noEmit`, `npm test`) and the env-dependent test in `lib/api/rutas.test.ts`. A real testnet payment, then Acta. |
| Raúl | Draft PR #72 (camera-only evidence) and draft PR #80 (Laya questionnaire). PR #67, PR #68, and PR #69 are on `main`. |
