# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El integrante sube una foto, la IA recomienda y el admin aprueba cada pago en USDC.

El demo es un evento de ZEEK. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

## Estado al 28 de septiembre de 2026

En `main` están el PR #1 de Raúl (squash `3a000e0`), el PR #3 de Josué (squash `b2451a6`, el 28 de septiembre cerca de las 7:42 a.m., hora de Costa Rica) y el PR #7 de Abdiel Cole (squash `cff4512`, el 28 de septiembre a las 2:58 p.m., hora de Costa Rica). El esqueleto, el admin y la marca (Poppins y lima) están hechos. Siguen pendientes Esteban (base de datos, rutas `/api` y la revisión con IA), Sebas (el `appId` de Cavos, el escrow y la firma; el PR #8 está abierto y no está en `main`) y Abdiel (`LAYA_URL`).

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| Esqueleto y admin: bandeja en `/`, crear proyecto, revisión y aprobar, informe imprimible. Mis tareas sigue en `/mis-tareas`. Ejemplo de ZEEK. Fondear y Aprobar no firman en Stellar | Josué |
| Botón Entrar. Llama a Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID` | Josué |
| Marca: Poppins 400, 500 y 600, acento lima `#B7EE34` y texto del botón `#08090C` | Abdiel |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |

Las pantallas usan tres tareas de trabajo de US$20 y un reembolso de hasta US$15. Si la API no responde, se muestra ese ejemplo.

| Pendiente | Dueño |
|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` en Vercel. Sin eso, `/cuentas` no crea wallets y Entrar no llama a Cavos | Sebas |
| Escrow y módulo de firma. Acta solo después de un pago en USDC | Sebas |
| Base de datos, rutas `/api` y revisión con IA | Esteban |
| `LAYA_URL` en su PC Windows | Abdiel |
| Conectar la bandeja a esas rutas, y Fondear y Aprobar a la firma, cuando existan | Josué |
| El 30 de septiembre, subir Next.js a 16.3.7 | Josué |
| Cuatro cuentas de Cavos del demo, cuando exista el `appId` | Raúl |
| En `components/admin/Entrar.tsx:46`, `setDireccion` solo si `guardado.aviso` es null, para poder reintentar el guardado | Josué |

`--acento` es `#B7EE34` y `--sobre-acento` es `#08090C`, en `app/globals.css`. La tipografía es Poppins.

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
