# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El voluntario sube una foto, la IA recomienda y el organizador aprueba cada pago en USDC.

El demo es un evento de ZEEK. La app corre en https://hyto.vercel.app. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

El contexto para trabajar, incluido el de los agentes, está en [AGENTS.md](AGENTS.md). Este archivo no lo repite.

## Estado al 1 de octubre de 2026

`main` está en `2fa3bd5` (2:43 a.m., hora de Costa Rica). Entran el esqueleto (PR #1), el admin (PR #3), la marca (PR #7), la auditoría del integrante (PR #4), el módulo de firma (PR #8), el backend de Neon, Blob y Cavos, el modo demo, el escrow V2 en la revisión (desplegar, fondear, aprobar y liberar) y el alta automática: desde el PR #41, un correo con login de Cavos válido que no existe se registra como voluntario. El rol organizador del escrow es por proyecto (`organizador_id`, PR #44), no el rol global.

El 1 de octubre, Raúl (Milasur) dejó dos arreglos. Los mergeó Josué Valles. El PR #67 recarga la revisión si desplegar sale bien y fondear falla, y ofrece **Fondear** el contrato ya guardado. El PR #68 pasa al inglés los avisos de servidor que seguían en español y agrega una prueba que lo vigila. El registro completo, con lo que entró desde el 29 de septiembre, está en [CHANGELOG.md](CHANGELOG.md).

La bandeja, la revisión y el informe leen la API cuando hay sesión y no es demo. Si la API no responde, siguen el ejemplo de ZEEK (tres trabajos de US$20 y un reembolso de hasta US$15). **Desplegar y fondear** y **Aprobar y pagar** están en la revisión y firman con Cavos. El botón Fondear de crear proyecto sigue guardando el borrador en el navegador.

El paso principal que sigue es hacer que la IA revise la foto de verdad e integrar Laya. Antes, hay que probar el pago completo en testnet. El detalle y el orden están en [AGENTS.md](AGENTS.md). `CAVOS_JWT_AUDIENCE` está vacío. En el repo no hay hash de un pago real.

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| Esqueleto y admin: bandeja en `/`, crear proyecto, revisión, informe imprimible. El pago en Stellar se firma desde la revisión | Josué |
| Botón Entrar. Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. El ingreso pide el código al correo, o Google, y guarda la dirección solo si no hay aviso | Josué, ingreso de Esteban |
| Marca: Poppins 400, 500 y 600, acento lima `#B7EE34` y texto del botón `#08090C` | Abdiel |
| Módulo de firma (`lib/escrow`), `POST /api/firma`, `POST /api/firma/enviar`, `GET /api/escrow/[contrato]` y `npm run hito`. El hash de un pago real no está en el repositorio | Sebas |
| Neon con Drizzle, Blob privado, rutas de tareas, evidencias, informe, proyectos y revisión. Semilla de ZEEK. La revisión llama a Qwen y, sin `LAYA_URL`, al stub. Si Groq o Laya fallan, el origen queda en `error`. Desde el PR #41, un correo nuevo entra como voluntario | Esteban |
| Auditoría del integrante: no mezcla tareas, no inventa US$0 ni corre el día de una fecha, abre USDC si la cuenta ya existe, y cierra fallos de la cámara | Josué (coautor), PR #4 |
| Si desplegar sale bien y fondear falla, la revisión ofrece **Fondear** el contrato ya guardado (PR #67, 1 de octubre de 2026, 2:43 a.m., hora de Costa Rica) | Raúl |
| Avisos de servidor del escrow, del entorno y del esquema en inglés, con una prueba que rechaza un aviso nuevo en español (PR #68, el mismo momento) | Raúl |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |

| Pendiente | Dueño sugerido |
|---|---|
| Probar en testnet, con wallet real de Cavos, **Desplegar y fondear** y **Aprobar y pagar**, y guardar el hash. La wallet del organizador necesita XLM y USDC de testnet. Quien cobra necesita trustline. El Acta solo después de ese pago | Josué |
| Hacer que la IA funcione. Es el paso principal. Groq (`qwen/qwen3.8-27b`, `max_completion_tokens: 1024`) pide `GROQ_API_KEY`. Si Groq o Laya fallan, el origen queda en `error` y la pantalla lo muestra (AI, simulated o error). Sin `LAYA_URL` el stub deja el trabajo en `parcial`. Falta confirmar Groq en producción y publicar Laya. El índice de `probabilities` ya está (PR #59) | Abdiel |
| Confirmar el monto de un reembolso antes de desplegar (PR #69, abierto) y la foto solo con cámara (PR #72, abierto). El PR #67 y el PR #68 ya entraron | Raúl |
| Trustline patrocinada, preflight de saldo, persistir el `contractId`, prueba de la wallet, y `CAVOS_JWT_AUDIENCE` / `CAVOS_JWT_ISSUER` en Vercel. Next.js sigue en 16.3.6 | Josué |
| Rechazar SVG, cabeceras `nosniff` y CSP, JWT cerrado en producción, tope de subida de 4,5 MB | Esteban |
| Arreglar la prueba de `lib/api/rutas.test.ts` que toca Neon, y agregar GitHub Actions | Sebastián |
| Ocultar **Aprobar y pagar** mientras el escrow no esté fondeado | Abdiel |

`--acento` es `#B7EE34` y `--sobre-acento` es `#08090C`, en `app/globals.css`. La tipografía es Poppins.

## Cómo correrlo

```bash
npm ci
npm run dev
npm test
npx tsc --noEmit
npm run build
npm run hito
npm run db:migrar
npm run db:semilla
```

`npm run dev` abre Next.js. `npm test` corre las pruebas de `lib/`, `scripts/backend-traspaso` y dos archivos de `tests/integracion` con `tsx`. `npx tsc --noEmit` revisa los tipos. `npm run hito` ejecuta `scripts/hito-prueba.ts`. Sin `TRUSTLESS_API_KEY` no paga. `npm run db:migrar` aplica `drizzle/*.sql` en orden. `npm run db:semilla` carga ZEEK. Las dos necesitan `DATABASE_URL` y el visto bueno de quien es dueño de la base. No hay `npm run lint`.

## Variables de entorno

Solo nombres. Los valores van en Vercel o en `.env` local, nunca en el repo. La lista completa y para qué sirve cada una está en [AGENTS.md](AGENTS.md). El código lee, entre otras, `NEXT_PUBLIC_CAVOS_APP_ID`, `TRUSTLESS_API_KEY`, `HYTO_ESCROW_ADMIN`, `HYTO_ESCROW_PLATFORM`, `HYTO_ESCROW_RESOLVER`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `GROQ_API_KEY`, `LAYA_URL`, `LAYA_API_KEY`, `CAVOS_JWKS_URL`, `CAVOS_JWT_ISSUER`, `CAVOS_JWT_AUDIENCE`, `CAVOS_JWT_JWK`, `HYTO_DEMO_LOGIN` y `HYTO_PERMITIR_JWT_SIN_FIRMA`.

| Nombre | Para qué |
|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | Id de la app de Cavos en el navegador. Es la única variable pública. |
| `TRUSTLESS_API_KEY` | Trustless Work, solo en el servidor. Sin ella no hay pago. |
| `HYTO_ESCROW_ADMIN` | Cuenta admin del contrato. No puede repetir otro rol. |
| `HYTO_ESCROW_PLATFORM` | Cuenta de la plataforma. La comisión en Hyto es 0. |
| `HYTO_ESCROW_RESOLVER` | Cuenta que resuelve disputas. |
| `DATABASE_URL` | Neon o Postgres local. La leen las rutas y la migración. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, almacén privado. |
| `GROQ_API_KEY` | Qwen 3.8 27B (`qwen/qwen3.8-27b`). Sin ella, la revisión usa el guion fijo. |
| `LAYA_URL` | Laya. Sin ella, la revisión usa el stub. |
| `CAVOS_JWKS_URL` | JWKS para verificar el JWT de Cavos. |
| `CAVOS_JWT_ISSUER` | Emisores permitidos, separados por coma. |
| `CAVOS_JWT_AUDIENCE` | Si tiene valor, el `aud` tiene que coincidir. Hoy está vacío, igual que `CAVOS_JWT_ISSUER`. |
| `HYTO_DEMO_LOGIN` | `1` enciende **Entrar como demo**, **Salir del demo** y **Cambiar a…**. |

`.env.example` declara los nombres, sin valores. `LAYA_API_KEY` es opcional: si está, la revisión la manda a Laya.

## Fechas

- Meetup: miércoles 30 de septiembre de 2026, TEC Cartago. Ya pasó. Next.js sigue en 16.3.6.
- Cierre de entregas: lunes 5 de octubre de 2026, 4:00 p.m.
- El demo a mostrar sigue siendo el de ZEEK.

## Reglas del equipo

Un agente en la nube por tarea y un pull request por agente. La rama sale de `main` actualizado. Nadie empuja a `main`. Antes de mergear se lee el diff a mano y se corren `npm test` y `npx tsc --noEmit`. El merge es squash. No se suben secretos. No se agrega una `NEXT_PUBLIC_` nueva sin avisar. La UI sigue el Figma de Abdiel. No se corren migraciones sin el visto bueno de quien es dueño de la base.

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b nombre/tarea
```

## Documentos

- [AGENTS.md](AGENTS.md) — contexto actual para el equipo y para los agentes.
- [PLAN.md](PLAN.md) — orden de trabajo, contrato de la API y bitácora.
- [STACK.md](STACK.md) — stack cerrado y reglas del dinero.
- [ROLES.md](ROLES.md) — qué hace cada persona.
- [Hyto-informe.md](Hyto-informe.md) — informe largo: premisa, demo y calendario.
- [CHANGELOG.md](CHANGELOG.md) — lo que entró a `main`, por fecha, con pull request y autor.
