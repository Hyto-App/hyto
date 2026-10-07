# Roles

Current as of 7 October 2026. The September kickoff that assigned a global product role at login is retired. See [AGENTS.md](AGENTS.md).

## In the product

Nobody picks "organizer" or "volunteer" at login. Membership is per event, in `proyecto_miembros`.

| Membership | How you get it | What you can do |
|---|---|---|
| Organizer | Create an event. The wallet must cover the budget plus 1 USDC. | See every task, invite people, assign tasks at `/eventos/[id]/tareas`, lock the budget, confirm a reimbursement, pay. |
| Team | Invite (`rol: "team"`), direct or code. | See and submit evidence only on tasks assigned to you. |
| Volunteer | Invite (`rol: "volunteer"`), or the default when the invite omits `team`. | Same visibility as team: assigned tasks only. |

Invites last 7 days. A direct invite is bound to one email and one use. A code looks like `HYTO-` plus 12 characters and can allow many uses (default 50, max 500).

`usuarios.rol` is still written (`voluntario` for a new Cavos user, `organizador` only if that row already says so, including the seed). Screens and escrow checks do not use it to decide who organizes an event.

Demo mode (`HYTO_DEMO_LOGIN=1`) is the leftover switch: **Enter as demo** chooses organizer or volunteer. Those sessions do not sign and cannot create events. On the demo event the organizer still walks Lock budget and Pay, simulated without a wallet, and the volunteer may pick a gallery photo (#179, #180). Each demo sign-in resets the demo payments.

## On the team

Owners below are suggestions. Anyone can take a task. If you do, leave a short note with the branch, the PR, and what is left.

That note, and the rest of the coordination between people and agents, goes in the private repo [Hyto-App/hyto-private](https://github.com/Hyto-App/hyto-private). Do not copy that repo into Hyto or into committed docs.

| Person | Suggested focus |
|---|---|
| Josué Valles | PM, admin flows and backend, merges and deploys, docs |
| Abdiel Cole | UX, UI, the Figma file, brand, Laya's server |
| Sebas | Escrow, Cavos, the landing tryhyto.com, a real testnet payment |
| Raúl | Member tasks, evidence upload, demo accounts |
| Esteban | API, Neon, review pipeline |

Each person works with AI agents. Their names and roles are in the private repo. Merges wait for Josué's go-ahead.

Work lands as a pull request from an updated `main`. Nobody pushes to `main`.

The per-person prompts in [docs/AGENT-PROMPTS-2026-09-30.md](docs/AGENT-PROMPTS-2026-09-30.md) described the 30 September audit against an older commit. Do not paste them into an agent as current instructions.
