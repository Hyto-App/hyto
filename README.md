![Hyto. Proof before payout. Funds remain locked until an on-site photo is submitted and a person approves.](docs/banner.svg)

**Hyto: proof before payout.** Funders lock USDC for each task on Stellar. The person who completes the work submits a photo taken on site with the application camera, together with receipts. Mile, the AI assistant, compares that evidence and recommends. A person approves, and only then is the payment released. Sign-in is by email through Cavos, without a separate wallet application or a seed phrase to store. This is a prototype built for Find Your Way. There are no pilots yet.

**En español.** Primero la prueba, después el pago. Quien aporta el dinero lo reserva para cada tarea, en dólares digitales, en la red Stellar. Quien realiza el trabajo envía una foto tomada en el lugar, con la cámara de la aplicación, y los recibos. Mile compara esa información y recomienda. Una persona aprueba, y solo entonces sale el pago. El texto completo, en la forma de usted, está en [README.es.md](README.es.md).

## Who it is for

Communities in Latin America, including groups that operate on any chain and groups that are not physically present. They receive stipends, grants, and event funds from a distance, and they must show how those funds were spent. Stellar is the settlement network.

## Screens

The images below show demo mode at a mobile width. The sample event comes from local seed data. In demo mode, creating an event and signing a payment require an email session.

![Events, with the demo event and one task in review](docs/screenshots/eventos.png)

![Assigned tasks. Mile reviews the photo before the submission continues.](docs/screenshots/tareas.png)

![Evidence review for a work photo. Lock budget remains unavailable in demo mode.](docs/screenshots/revision.png)

## How it works

1. **Lock.** The organizer reserves USDC for one task. Hyto opens one [Trustless Work](https://www.trustlesswork.com) v2 multi-release contract per task and funds it. The platform fee in Hyto is 0. Creating an event requires the session wallet to hold the task amounts plus a 1 USDC reserve.
2. **Prove.** A work task requires a new photo from the camera in the application, taken where the work took place. Gallery photos are rejected for that task. A reimbursement also requires the receipt. The organizer confirms the amount before that task can be locked.
3. **Recommend.** Mile compares the photo and the receipts with the task requirements and recommends. Mile does not approve the payment and does not move funds.
4. **Release.** A person approves. Hyto marks the milestone, approves it, and releases the payment on Stellar. The link opens on stellar.expert when the transaction hash is available.

Payments in this repository settle on Stellar testnet. A classic USDC balance requires a trustline before the account can hold the asset. The application can prepare that trustline for the session wallet.

## Tech stack

| Layer | What the application uses |
|---|---|
| App | Next.js 16.3.6, React 19.1.1, TypeScript, Tailwind 4. One App Router shell: Events, Tasks, Account. English by default; Spanish from the `hyto_idioma` cookie. |
| Host | Vercel. Production is [hyto.vercel.app](https://hyto.vercel.app). A push to `main` deploys production. Each pull request receives a preview. |
| Data | Neon Postgres through Drizzle. Migrations are in `drizzle/`. |
| Photos | Private Vercel Blob. The database stores the identifier. The screen loads the photo through the application. |
| Sign-in | Cavos email (`@cavos/kit` 0.2.5) on Stellar testnet. Sign-in does not require a separate wallet application. |
| Chain | Stellar and Soroban. The server builds the unsigned transaction with `@stellar/stellar-sdk`. The browser signs it with Cavos. |
| Payment | Trustless Work v2, `https://beta.api.trustlesswork.com`. One contract per task. The server prepares the transaction. The browser only signs it. |
| USDC | Testnet USDC. The issuer in the code is `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. |
| Mile | Groq vision describes the photo (`qwen/qwen3.8-27b`, or `GROQ_VISION_MODEL`). Gemini describes it only if the Groq call fails and `GEMINI_API_KEY` is set. Laya scores the description when `LAYA_URL` is set. The grade is 0–100. |

## Running locally

```bash
npm ci
npm run db:local
npm run dev
```

`npm run db:local` expects Postgres at `127.0.0.1:5432` (`postgres://hyto:hyto@127.0.0.1:5432/hyto`). If nothing is listening, it starts the Postgres service in `docker-compose.yml`, applies `drizzle/*.sql`, and loads the ZEEK sample. Copy [.env.example](.env.example) to `.env.local` and set only the variables required for the local run. Secrets stay out of the repository.

Demo login is `HYTO_DEMO_LOGIN=1`. The sign-in screen then offers an organizer account and a volunteer account. Those sessions cannot create events or sign a payment.

```bash
npm test
npx tsc --noEmit
npm run build
```

`npm test` runs the `*.test.ts` files under `lib/`, `scripts/backend-traspaso`, and two files in `tests/integracion`, with `tsx`. `npm run test:integracion` connects to Postgres and runs separately. A production database is migrated or seeded only when the database owner sets `HYTO_CONFIRMAR_BASE_PRODUCCION=si`.

Contributors should read [AGENTS.md](AGENTS.md) before changing the code. Further stack detail is in [STACK.md](STACK.md).

## Testnet proof

The first recorded end-to-end testnet payment is this `release_funds` transaction from 8 October 2026. Horizon reports it as successful. The invoked function is `release_funds`, and the transaction envelope includes USDC. It was submitted the same morning as the deploy fix in [#219](https://github.com/Hyto-App/hyto/pull/219).

[stellar.expert/explorer/testnet/tx/efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c](https://stellar.expert/explorer/testnet/tx/efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c)

`efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c`

The transaction is on testnet. The funds are test funds. The ZEEK amounts in the seed (three US$20 work tasks and a meal cap of US$15) are examples. They are separate from this transaction.

## Team

Names and areas of focus, as already listed in [ROLES.md](ROLES.md):

| Person | Focus |
|---|---|
| Abdiel Cole | UX, the Figma file, Laya |
| Esteban | API, Neon, Blob, review pipeline |
| Sebas | Payments, Cavos, a real testnet payment |
| Josué | Application shell, admin flows, documentation |
| Raúl | Member tasks, evidence upload, accounts |

## Links

- Application: https://hyto.vercel.app
- Landing page: https://tryhyto.com
- This repository does not yet include a license file.
