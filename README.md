# Hyto

Hyto removes the distrust from paying for work you cannot check yourself. The payer's money is locked in a contract on Stellar before the work, the person doing it uploads photos, a PDF, or receipts as proof, Mile (the AI) reviews them, and the payment is released when the proof checks out and the organizer approves. Nobody pays blindly up front, and nobody works without knowing they will be paid. Today it runs on Stellar testnet with USDC, through a Trustless Work escrow per task. Production: https://hyto.vercel.app. Repo: [Hyto-App/hyto](https://github.com/Hyto-App/hyto).

This file is the short map. Agents and contributors read [AGENTS.md](AGENTS.md) before changing anything. Stack detail is in [STACK.md](STACK.md).

## What it does

Login does not pick a global role. A signed-in user whose wallet covers the budget plus a 1 USDC reserve creates an event and becomes that event's organizer. Other people join with a direct invite or a code `HYTO-` plus 12 characters. Invites expire in 7 days. Members see the tasks assigned to them. The organizer sees every task and assigns them at `/eventos/[id]/tareas`.

The shell is My tasks, Events, and Account (light and dark, English with Spanish). Evidence is a live camera photo for work, or a receipt (photo, PDF, HTML, or text) for a reimbursement with a cap. Mile, the review, has Groq (or Gemini when Groq fails) read it and Laya score it, then shows a grade from 0 to 100 with reasons. The organizer confirms a reimbursement amount, locks the budget, then pays. The AI never signs.

Who it is for: anyone paying for work they cannot see in person. That includes:

- companies and blockchain ecosystems that fund communities to run events;
- organizations that pay travel expenses (viáticos), stipends, or scholarships after the spend;
- volunteer programs (the ZEEK demo);
- someone hiring a job at home, such as cleaning, painting, or a repair.

Demo mode (`HYTO_DEMO_LOGIN=1`) walks the whole flow without a wallet: lock and pay are simulated and nothing reaches Stellar (#179, #180).

There is no successful real USDC payment on testnet in this repo yet (`tareas.hash_pago` is empty).

## Run it

```bash
npm ci
npm run dev
npm test
npx tsc --noEmit
npm run build
```

`npm test` runs the `*.test.ts` files under `lib/`, `scripts/`, and two files in `tests/integracion`, with `tsx`. There is no ESLint and no `npm run lint`. CI (`.github/workflows/ci.yml`) runs typecheck, tests, and build on every pull request. `npm run test:integracion` talks to Postgres and is separate.

```bash
npm run db:local
npm run db:migrar
npm run db:semilla
npm run verificar:entorno
npm run hito
```

`db:migrar` applies every file in `drizzle/` in filename order, each time, so every statement must be safe to run twice. `db:semilla` loads the ZEEK sample and the demo event. Do not migrate or seed production without the database owner's go-ahead (`HYTO_CONFIRMAR_BASE_PRODUCCION=si` only when that is intended). `npm run hito` is a standalone escrow script; without `TRUSTLESS_API_KEY` it does not pay.

To try the app locally without Neon: a local Postgres at `postgres://hyto:hyto@127.0.0.1:5432/hyto`, `npm run db:migrar`, then `HYTO_DEMO_LOGIN=1 HYTO_TEST_SESSION_KEY=<any 32+ chars> npm run dev`. Uploads need `BLOB_READ_WRITE_TOKEN`; the review needs `GROQ_API_KEY`.

## Deploy

Vercel. A push to `main` deploys production. Every pull request gets a preview. Secrets live in Vercel only, stored as Sensitive, never in the repo. The only `NEXT_PUBLIC_` variable is `NEXT_PUBLIC_CAVOS_APP_ID`. The Hobby plan allows 100 deploys a day: group changes into few pull requests.

## Environment

Names only. The full list, taken from `process.env` reads in the app, is in [AGENTS.md](AGENTS.md) and [.env.example](.env.example).

## Docs

| File | What it is |
|---|---|
| [AGENTS.md](AGENTS.md) | Current product, code map, open issues. Read this first. |
| [STACK.md](STACK.md) | Stack and how a payment moves. |
| [ROLES.md](ROLES.md) | Event membership and how the team splits work. |
| [PLAN.md](PLAN.md) | What is done and what is left before and after 12 October. |
| [Hyto-informe.md](Hyto-informe.md) | Pitch, problem, and who it is for. |
| [CHANGELOG.md](CHANGELOG.md) | What landed. |
| [brand/](brand/README.md) | Logo, palette, and type. |
| [docs/rediseno/SPEC.md](docs/rediseno/SPEC.md) | The approved redesign spec (built in #146, #151, #155, #159). |
| [docs/mile-animada/LEEME.md](docs/mile-animada/LEEME.md) | Mile's animation rig. |
| [docs/AUDIT-2026-09-30.md](docs/AUDIT-2026-09-30.md) | Security audit against `db82b93`. Its open items are tracked in AGENTS.md (Status). |
| [docs/auditorias/](docs/auditorias/) | Dated audits: the 2 October app, UI, and pitch audits, the Ramp Network note, and the 7 October Google sign-in timing. |

Cloud agents get a code map at session start (`graphify-out/GRAPH_REPORT.md`, see AGENTS.md). Team context lives in the private repo [Hyto-App/hyto-private](https://github.com/Hyto-App/hyto-private).
