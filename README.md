# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El integrante sube una foto, la IA recomienda y el admin aprueba cada pago en USDC.

El demo es un evento de ZEEK. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

## Estado al 28 de septiembre de 2026

En `main` está el PR #1 de Raúl (squash `3a000e0`). La rama `josue/admin` agrega las pantallas del admin con datos fijos. No hay base de datos, Blob, escrow ni Laya en el repo.

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| `/` es la bandeja del admin. Mis tareas sigue en `/mis-tareas` | Josué |
| Datos de ejemplo de ZEEK hasta que respondan las rutas de abajo | Raúl |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |
| Bandeja del admin en `/`, crear proyecto, revisión e informe imprimible, con el ejemplo de ZEEK | Josué |
| Botón Entrar. Llama a Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID` | Josué |

Las pantallas usan tres tareas de trabajo de US$20 y un reembolso de hasta US$15. Si la API no responde, se muestra ese ejemplo.

| Pendiente | Dueño |
|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` en Vercel. Sin eso, `/cuentas` no crea wallets | Sebas |
| Script de escrow, módulo de firma y, solo después de un pago en USDC, el Acta | Sebas |
| Neon, Blob, rutas y revisión con Scout | Esteban |
| Seis pantallas, color de acento y `LAYA_URL` | Abdiel |
| Conectar la bandeja a las rutas de Esteban, y Fondear y Aprobar al módulo de firma de Sebas | Josué |
| El 30 de septiembre, subir Next.js a 16.3.7 | Josué |
| Cuatro cuentas de Cavos del demo, cuando exista el `appId` | Raúl |

`--acento` en `app/globals.css` es un placeholder (`#1c1c1c`) hasta que Abdiel lo defina.

## Cómo correrlo

```bash
npm ci
npm run dev
npm test
npm run build
```

`npm run dev` abre Next.js. `npm test` corre las pruebas de `lib/integrante` y `lib/admin` con `tsx`. No hay `npm run lint`.

## Variables de entorno

Solo nombres. Los valores van en Vercel, no en el repo. Hoy el código solo lee la primera.

| Nombre | Para qué | Dueño |
|---|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | App de Cavos. Sin valor, las cuentas del demo no se preparan | Sebas |
| `DATABASE_URL` | Neon. Aún no se usa en el código | Esteban |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob. Aún no se usa en el código | Esteban |
| `GROQ_API_KEY` | Llama 4 Scout. Aún no se usa en el código | Esteban |
| `LAYA_URL` | Laya en la PC de Abdiel. Aún no se usa en el código | Abdiel |

`.env.example` solo declara `NEXT_PUBLIC_CAVOS_APP_ID`.

## Fechas

- Meetup: miércoles 30 de septiembre de 2026, TEC Cartago.
- Ese día, subir Next.js a 16.3.7 cuando salga el parche.
- Cierre de entregas: lunes 5 de octubre de 2026, 4:00 p.m.
- El demo a mostrar sigue siendo el de ZEEK.

## Reglas del equipo

Todo el trabajo se hace en la nube (agentes de Cursor Cloud o Claude Code en la web). Cada cambio va en una rama `nombre/tarea` y entra por pull request a `main`. Nadie empuja a `main`. No se reutiliza la misma rama: la siguiente tarea sale de `main` ya actualizado.

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b nombre/tarea
```

## Documentos

- [PLAN.md](PLAN.md) — orden de trabajo, contrato de la API y bitácora.
- [STACK.md](STACK.md) — stack cerrado y reglas del dinero.
- [ROLES.md](ROLES.md) — qué hace cada persona.
- [Hyto-informe.md](Hyto-informe.md) — informe largo: premisa, demo y calendario.
