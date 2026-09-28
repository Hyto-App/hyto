# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El integrante sube una foto, la IA recomienda y el admin aprueba cada pago en USDC.

El demo es un evento de ZEEK. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

## Estado al 28 de septiembre de 2026

En `main` están el PR #1 de Raúl (squash `3a000e0`), el PR #3 de Josué (squash `b2451a6`, el 28 de septiembre cerca de las 7:42 a.m., hora de Costa Rica), el PR #7 de Abdiel Cole (squash `cff4512`, a las 2:58 p.m.), la auditoría del integrante (PR #4, squash `bc94a9c`, a las 3:47 p.m.) y el PR #8 de Sebas (squash `ae10a9e`, a las 3:48 p.m.). Las horas son de Costa Rica. El esqueleto, el admin, la marca (Poppins y lima) y el módulo de firma están hechos. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel y es el correcto. Siguen pendientes Esteban (todo el backend: rutas, Neon y el login real de Cavos), Sebas (un pago en USDC; sin ese pago no hay Acta) y Abdiel (`LAYA_URL`). Fondear y Aprobar todavía no usan el módulo. Entrar falla: el diagnóstico está en [PLAN.md](PLAN.md).

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| Esqueleto y admin: bandeja en `/`, crear proyecto, revisión y aprobar, informe imprimible. Mis tareas sigue en `/mis-tareas`. Ejemplo de ZEEK. Fondear y Aprobar no firman en Stellar | Josué |
| Botón Entrar. Llama a Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. Ese valor ya está; el login real es de Esteban | Josué |
| Marca: Poppins 400, 500 y 600, acento lima `#B7EE34` y texto del botón `#08090C` | Abdiel |
| Módulo de firma (`lib/escrow`), `POST /api/firma`, `POST /api/firma/enviar` y el script `npm run hito`. Sin hash de pago en el repositorio | Sebas |
| Auditoría del integrante: no mezcla tareas, no inventa US$0 ni corre el día de una fecha, abre USDC si la cuenta ya existe, y cierra fallos de la cámara | Josué (coautor), PR #4 |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |

Las pantallas usan tres tareas de trabajo de US$20 y un reembolso de hasta US$15. Si la API no responde, se muestra ese ejemplo.

| Pendiente | Dueño |
|---|---|
| Un pago de prueba en USDC con `npm run hito` y `TRUSTLESS_API_KEY`. El Acta solo después de ese pago. El hash no está en el repositorio | Sebas |
| Todo el backend: `/api/tareas`, `/api/evidencias`, Neon (usuarios, email → rol, migraciones y seed), login real de Cavos contra la base, y revisión con IA. Entrar falla con `registry lookup skipped: no login token` (2026-09-28, diagnóstico en [PLAN.md](PLAN.md)) | Esteban |
| `LAYA_URL` en su PC Windows | Abdiel |
| Conectar la bandeja a las rutas de Esteban, y Fondear y Aprobar a `POST /api/firma` y `POST /api/firma/enviar` | Josué |
| El 30 de septiembre, subir Next.js a 16.3.7 | Josué |
| Cuatro cuentas de Cavos del demo. El `appId` ya está; el login real es de Esteban | Raúl |
| En `components/admin/Entrar.tsx:46`, `setDireccion` solo si `guardado.aviso` es null, para poder reintentar el guardado | Josué |

`--acento` es `#B7EE34` y `--sobre-acento` es `#08090C`, en `app/globals.css`. La tipografía es Poppins.

## Cómo correrlo

```bash
npm ci
npm run dev
npm test
npm run build
npm run hito
```

`npm run dev` abre Next.js. `npm test` corre las pruebas de `lib/integrante`, `lib/admin` y `lib/escrow` con `tsx`. `npm run hito` ejecuta `scripts/hito-prueba.ts`. Sin `TRUSTLESS_API_KEY` termina avisando que falta la clave y que no hay pago. No hay `npm run lint`.

## Variables de entorno

Solo nombres. Los valores van en Vercel, no en el repo. El código lee `NEXT_PUBLIC_CAVOS_APP_ID` y `TRUSTLESS_API_KEY`. Las demás todavía no.

| Nombre | Para qué | Dueño |
|---|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | App de Cavos. Ya está en Vercel y es el correcto | Sebas |
| `TRUSTLESS_API_KEY` | Trustless Work, solo en el servidor. La leen `npm run hito` y `/api/firma`. Sin ella no hay pago | Sebas |
| `DATABASE_URL` | Neon. Aún no se usa en el código | Esteban |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob. Aún no se usa en el código | Esteban |
| `GROQ_API_KEY` | Llama 4 Scout. Aún no se usa en el código | Esteban |
| `LAYA_URL` | Laya en la PC de Abdiel. Aún no se usa en el código | Abdiel |

`.env.example` declara `NEXT_PUBLIC_CAVOS_APP_ID` y `TRUSTLESS_API_KEY`.

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
