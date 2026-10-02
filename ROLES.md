# Roles

Current as of `main` at `1ee6f98` (2 October 2026, 02:29 Costa Rica). The September kickoff that assigned a global product role at login is retired. See [AGENTS.md](AGENTS.md).

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

## What each person still has

Suggestions, not assignments. Anything listed as a draft is not on `main`.

| Person | On `main` as of 2 Oct 2026 | Still open |
|---|---|---|
| Abdiel Cole | The five P0 items from the 2 Oct UI audit shipped in #90 (Josué): demo path, inbox count, report, Mile label, photo. | P1/P2 from that audit were left for a later pass. Compare the Mile label with the Figma page "Nuevo diseño". Whether `LAYA_URL` is set in Vercel is not in the repo. |
| Esteban | Review pipeline and data layer from earlier PRs. | Suggested: JWT `aud` and `iss` fail closed in production, prove wallet ownership, stop SVG evidence (JPEG/PNG/GIF/WebP are sniffed; other `image/*` still pass), add CI. |
| Sebas | Escrow module and `npm run hito` from earlier PRs. No payment hash in the repo. | A real testnet USDC `hash_pago`. Receiver trustline check before deploy. Save the predicted contract id. Sponsored trustline on Account. Check `wallet.status === "ready"` before `signXdr`. |
| Josué | #90. Lock and pay stay available when Mile fails. Pending count matches the inbox. Report, Mile label, and evidence photo repaired. | Draft #18 (keep the session when returning from Google) is not merged. |
| Raúl | #80. Laya asks the approved questionnaire on the written description. The UI name is Mile; the service is still Laya. | Draft #72 (camera only, no gallery) and draft #91 (a 0–100 review score) are not merged. |
