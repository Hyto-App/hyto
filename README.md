![Hyto. Proof before payout. The money waits for a photo taken on site and a person's yes.](docs/banner.svg)

**Hyto: proof before payout.** Funders lock USDC for each task on Stellar. Whoever does the work submits a photo taken on site with the app's camera, plus receipts. Mile, the AI assistant, compares that evidence and recommends. A person approves, and only then is the payment released. Sign-in is email through Cavos: there is no wallet app to install and no seed phrase to write down. This is a prototype built for Find Your Way. There are no pilots yet.

**En español.** Primero la prueba, después el pago. Quien financia reserva USDC por cada tarea en Stellar. Quien hace el trabajo sube una foto tomada en el lugar, con la cámara de la app, y los recibos. Mile compara y recomienda. Una persona aprueba y recién ahí se libera el pago. La versión completa está en [README.es.md](README.es.md).

## Who it is for

Communities in Latin America, including groups on any chain and groups that are not physically there. They receive stipends, grants, and event funds from far away, and they have to prove how that money was spent. Stellar is the payment rail.

## Screens

Demo mode, at a phone width. The sample event is local seed data. Demo mode does not create events and does not sign a payment.

![Events, with the demo event and one task in review](docs/screenshots/eventos.png)

![A member's tasks. Mile checks the photo before it goes on.](docs/screenshots/tareas.png)

![Evidence review for a work photo. Lock budget stays off in the demo.](docs/screenshots/revision.png)

## How it works

1. **Lock.** The organizer sets USDC aside for one task. Hyto opens one [Trustless Work](https://www.trustlesswork.com) v2 multi-release contract per task and funds it. The platform fee in Hyto is 0. Creating an event checks that the session wallet holds the task amounts plus a 1 USDC reserve.
2. **Prove.** A work task needs a fresh photo from the in-app camera, taken where the work happened. Photos from the gallery are rejected for that task. A reimbursement also takes the receipt, and the organizer confirms the amount before that task can be locked.
3. **Recommend.** Mile compares the photo and the receipts with what the task asked for, and recommends. He does not approve, and he does not move money.
4. **Release.** A person approves. Hyto marks the milestone, approves it, and releases the payment on Stellar. The link opens on stellar.expert when the transaction hash exists.

What this repository settles today is on Stellar testnet. A classic USDC balance needs a trustline before the account can hold it. The app can prepare that trustline for the session wallet.

## Tech stack

| Layer | What the app uses |
|---|---|
| App | Next.js 16.3.6, React 19.1.1, TypeScript, Tailwind 4. One App Router shell: Events, Tasks, Account. English by default, Spanish from the `hyto_idioma` cookie. |
| Host | Vercel. Production is [hyto.vercel.app](https://hyto.vercel.app). A push to `main` deploys it. Each pull request gets a preview. |
| Data | Neon Postgres through Drizzle. Migrations live in `drizzle/`. |
| Photos | Private Vercel Blob. The database stores the id. The screen loads the photo through the app. |
| Sign-in | Cavos email (`@cavos/kit` 0.2.5) on Stellar testnet. The browser does not ask anyone to install a wallet first. |
| Chain | Stellar and Soroban. The server builds the unsigned transaction with `@stellar/stellar-sdk`. The browser signs it with Cavos. |
| Payment | Trustless Work v2, `https://beta.api.trustlesswork.com`. One contract per task. The server prepares the transaction. The browser only signs. |
| USDC | Testnet USDC. The issuer in code is `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. |
| Mile | Groq vision describes the photo (`qwen/qwen3.8-27b`, or `GROQ_VISION_MODEL`). Gemini describes it only if Groq fails and `GEMINI_API_KEY` is set. Laya scores the description when `LAYA_URL` is set. The grade is 0–100. |

## Running locally

```bash
npm ci
npm run db:local
npm run dev
```

`npm run db:local` expects Postgres on `127.0.0.1:5432` (`postgres://hyto:hyto@127.0.0.1:5432/hyto`). If nothing is listening, it starts the Postgres service in `docker-compose.yml`, applies `drizzle/*.sql`, and loads the ZEEK sample. Copy [.env.example](.env.example) to `.env.local` and fill only the names you need. Do not commit secrets.

Demo login is `HYTO_DEMO_LOGIN=1`. The sign-in screen then offers an organizer and a volunteer. Those sessions cannot create events or sign.

```bash
npm test
npx tsc --noEmit
npm run build
```

`npm test` runs the `*.test.ts` files under `lib/`, `scripts/backend-traspaso`, and two files in `tests/integracion`, with `tsx`. `npm run test:integracion` talks to Postgres and is separate. Do not migrate or seed a production database unless the database owner sets `HYTO_CONFIRMAR_BASE_PRODUCCION=si`.

People changing the code should read [AGENTS.md](AGENTS.md) first. Stack detail is in [STACK.md](STACK.md).

## Testnet proof

The first end-to-end testnet payment on record is this `release_funds` transaction from 8 October 2026. Horizon reports it successful. The call is `release_funds` and the envelope carries USDC. It landed the same morning as the deploy fix in [#219](https://github.com/Hyto-App/hyto/pull/219).

[stellar.expert/explorer/testnet/tx/efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c](https://stellar.expert/explorer/testnet/tx/efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c)

`efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c`

This is testnet. It is practice money. The ZEEK amounts in the seed (three US$20 work tasks and a meal cap of US$15) are examples. They are not this transaction.

## Team

Names and focuses already written in [ROLES.md](ROLES.md):

| Person | Focus |
|---|---|
| Abdiel Cole | UX, the Figma file, Laya |
| Esteban | API, Neon, Blob, review pipeline |
| Sebas | Payments, Cavos, a real testnet payment |
| Josué | App shell, admin flows, docs |
| Raúl | Member tasks, evidence upload, accounts |

## Links

- App: https://hyto.vercel.app
- Landing: https://tryhyto.com
- This repository does not include a license file yet.
