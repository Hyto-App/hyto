# Hyto

Milestone payments on Stellar. Someone with funds creates an event, locks the budget in a Trustless Work escrow, and pays USDC on testnet after a photo is reviewed. Production: https://hyto.vercel.app. Repo: [Hyto-App/hyto](https://github.com/Hyto-App/hyto).

This file is the short map. Agents and contributors should read [AGENTS.md](AGENTS.md) before changing anything. Stack detail is in [STACK.md](STACK.md).

## What it does

Login does not pick a global role. A signed-in user who can cover the budget plus a 1 USDC reserve creates an event and becomes that event's organizer. Other people join with a direct invite or a code `HYTO-` plus 12 characters. Invites expire in 7 days. Members see the tasks assigned to them. The organizer sees every task and assigns them at `/eventos/[id]/tareas`.

The shell is Events, Tasks, and Account (light and dark). Evidence is a photo. Groq describes it. Laya scores that description when `LAYA_URL` is set: it classifies the text, then asks only the work or receipt questions. The screen calls that scorer Mile. A failed score does not block the organizer. The organizer confirms a reimbursement amount, locks the budget, then pays. The AI never signs.

There is no successful real USDC payment on testnet in this repo yet (`tareas.hash_pago` is empty).

## Run it

```bash
npm ci
npm run dev
npm test
npx tsc --noEmit
npm run build
```

`npm test` runs the `*.test.ts` files under `lib/`, `scripts/backend-traspaso`, and two files in `tests/integracion`, with `tsx`. There is no ESLint and no `npm run lint`. `npm run test:integracion` talks to Postgres and is separate.

```bash
npm run db:local
npm run db:migrar
npm run db:semilla
npm run verificar:entorno
npm run hito
```

`db:migrar` applies `drizzle/*.sql` in filename order. `db:semilla` loads the ZEEK sample. Do not migrate or seed production without the database owner's go-ahead (`HYTO_CONFIRMAR_BASE_PRODUCCION=si` only when that is intended). `npm run hito` is a standalone escrow script; without `TRUSTLESS_API_KEY` it does not pay.

## Deploy

Vercel. A push to `main` deploys production. Every pull request gets a preview. Secrets live in Vercel only, never in the repo. The only `NEXT_PUBLIC_` variable is `NEXT_PUBLIC_CAVOS_APP_ID`.

## Environment

Names only. The full list, taken from `process.env` reads in the app, is in [AGENTS.md](AGENTS.md) and [.env.example](.env.example).

## Docs

| File | What it is |
|---|---|
| [AGENTS.md](AGENTS.md) | Current product, code map, open issues. Read this first. |
| [STACK.md](STACK.md) | Stack and how a payment moves. |
| [ROLES.md](ROLES.md) | Event membership and how the team splits work. |
| [PLAN.md](PLAN.md) | What is left. The September kickoff plan is retired. |
| [CHANGELOG.md](CHANGELOG.md) | What landed. |
| [docs/AUDIT-2026-09-30.md](docs/AUDIT-2026-09-30.md) | Audit against `db82b93`, with a status note for `1ee6f98`. |
