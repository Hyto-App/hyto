# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El integrante sube una foto, la IA recomienda y el admin aprueba cada pago en USDC.

El demo es un evento de ZEEK. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

## Estado al 29 de septiembre de 2026

En `main` están el PR #1 de Raúl (squash `3a000e0`), el PR #3 de Josué (squash `b2451a6`, el 28 de septiembre cerca de las 7:42 a.m., hora de Costa Rica), el PR #7 de Abdiel Cole (squash `cff4512`, a las 2:58 p.m.), la auditoría del integrante (PR #4, squash `bc94a9c`, a las 3:47 p.m.) y el PR #8 de Sebas (squash `ae10a9e`, a las 3:48 p.m.). Las horas son de Costa Rica. El esqueleto, el admin, la marca (Poppins y lima) y el módulo de firma están hechos. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel y es el correcto. El backend de Esteban está en el código: Neon, Blob, las rutas, la revisión y el ingreso con Cavos. Falta poner `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` y `GROQ_API_KEY` en Vercel y correr `npm run db:migrar` y `npm run db:semilla`. Sin eso las rutas responden 503 y las pantallas siguen con el ejemplo. Siguen pendientes Sebas (un pago en USDC; sin ese pago no hay Acta), Abdiel (`LAYA_URL`) y Josué (conectar la bandeja, Fondear y Aprobar). Fondear y Aprobar todavía no usan el módulo.

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| Esqueleto y admin: bandeja en `/`, crear proyecto, revisión y aprobar, informe imprimible. Mis tareas sigue en `/mis-tareas`. Ejemplo de ZEEK. Fondear y Aprobar no firman en Stellar | Josué |
| Botón Entrar. Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. El ingreso pide el código al correo, o Google, y guarda la dirección solo si no hay aviso | Josué, ingreso de Esteban |
| Marca: Poppins 400, 500 y 600, acento lima `#B7EE34` y texto del botón `#08090C` | Abdiel |
| Módulo de firma (`lib/escrow`), `POST /api/firma`, `POST /api/firma/enviar` y el script `npm run hito`. Sin hash de pago en el repositorio. Esas dos rutas exigen la sesión del organizador | Sebas, sesión de Esteban |
| Neon con Drizzle, Blob privado, `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/informe`, `POST /api/proyectos` y `GET /api/revision/:id`. Seed de ZEEK. Revisión con Qwen 3.8 27B, stub de Laya y guion fijo. Entrar usa CavosAuth y busca el rol por correo | Esteban |
| Auditoría del integrante: no mezcla tareas, no inventa US$0 ni corre el día de una fecha, abre USDC si la cuenta ya existe, y cierra fallos de la cámara | Josué (coautor), PR #4 |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |

Las pantallas usan tres tareas de trabajo de US$20 y un reembolso de hasta US$15. Si la API no responde, se muestra ese ejemplo.

| Pendiente | Dueño |
|---|---|
| Un pago de prueba en USDC con `npm run hito` y `TRUSTLESS_API_KEY`. El Acta solo después de ese pago. El hash no está en el repositorio | Sebas |
| Poner en Vercel `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` y `GROQ_API_KEY`, y correr la migración y la semilla. El código ya las lee | Esteban |
| `LAYA_URL` en su PC Windows | Abdiel |
| Conectar la bandeja, la revisión y el informe a `GET /api/informe` y `GET /api/revision/:id`, y Fondear y Aprobar a `POST /api/firma` y `POST /api/firma/enviar`. Esas dos rutas ya piden la sesión del organizador | Josué |
| El 30 de septiembre, subir Next.js a 16.3.7 | Josué |
| Cuatro cuentas de Cavos del demo. El ingreso pide el código del correo de cada cuenta. La base tiene que estar sembrada | Raúl |

`--acento` es `#B7EE34` y `--sobre-acento` es `#08090C`, en `app/globals.css`. La tipografía es Poppins.

## Cómo correrlo

```bash
npm ci
npm run dev
npm test
npm run build
npm run hito
npm run db:migrar
npm run db:semilla
```

`npm run dev` abre Next.js. `npm test` corre las pruebas de `lib/integrante`, `lib/admin`, `lib/escrow`, `lib/revision`, `lib/db`, `lib/sesion` y `lib/api` con `tsx`. `npm run hito` ejecuta `scripts/hito-prueba.ts`. Sin `TRUSTLESS_API_KEY` termina avisando que falta la clave y que no hay pago. `npm run db:migrar` y `npm run db:semilla` necesitan `DATABASE_URL`. No hay `npm run lint`.

## Variables de entorno

Solo nombres. Los valores van en Vercel, no en el repo. El código lee `NEXT_PUBLIC_CAVOS_APP_ID`, `TRUSTLESS_API_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `GROQ_API_KEY`, `LAYA_URL` y, si existe, `LAYA_API_KEY`.

| Nombre | Para qué | Dueño |
|---|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | App de Cavos. Ya está en Vercel y es el correcto | Sebas |
| `TRUSTLESS_API_KEY` | Trustless Work, solo en el servidor. La leen `npm run hito` y `/api/firma`. Sin ella no hay pago | Sebas |
| `DATABASE_URL` | Neon. La leen las rutas y `npm run db:migrar` | Esteban |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, almacén privado. La lee `POST /api/evidencias` | Esteban |
| `GROQ_API_KEY` | Qwen 3.8 27B (`qwen/qwen3.8-27b`). Sin ella, o si Groq falla, la revisión usa el guion fijo | Esteban |
| `LAYA_URL` | Laya en la PC de Abdiel. Sin ella, la revisión usa el stub | Abdiel |

`.env.example` declara los nombres. `LAYA_API_KEY` es opcional: si está, la revisión la manda a Laya.

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
