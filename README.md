# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El voluntario sube una foto, la IA recomienda y el organizador aprueba cada pago en USDC.

El demo es un evento de ZEEK. La app corre en https://hyto.vercel.app. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

El contexto para trabajar, incluido el de los agentes, está en [AGENTS.md](AGENTS.md). Este archivo no lo repite.

## Estado al 29 de septiembre de 2026, 7:46 p.m.

`main` está en `687dc3d`. Entran el esqueleto (PR #1), el admin (PR #3), la marca (PR #7), la auditoría del integrante (PR #4), el módulo de firma (PR #8), el backend de Neon, Blob y Cavos, el modo demo, el escrow V2 en la revisión y el alta automática: desde el PR #41, un correo con login de Cavos válido que no existe se registra como voluntario. El rol organizador solo queda si ya está escrito en la base. Quien crea un proyecto queda en `proyectos.organizador_id` (PR #44, Josué Valles). La interfaz y los avisos están en inglés desde el PR #56. El PR #59, de Josué Valles, toma el veredicto de Laya del índice de `score.probabilities`.

La bandeja, la revisión y el informe leen la API cuando hay sesión y no es demo. Si la API no responde, siguen el ejemplo de ZEEK (tres trabajos de US$20 y un reembolso de hasta US$15). **Deploy and fund** y **Approve and pay** están en la revisión y firman con Cavos. Crear proyecto, en demo, no guarda: el demo no crea proyectos (PR #47).

Lo que sigue es un pago real en testnet y publicar `LAYA_URL`. Groq ya no cae en silencio al guion fijo: un fallo queda en `origen` `error` y la pantalla ofrece **Retry review** (PR #45). El detalle está en [AGENTS.md](AGENTS.md). `CAVOS_JWT_AUDIENCE` está vacío. En el repo no hay hash de un pago real.

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| Esqueleto y admin: bandeja en `/`, crear proyecto, revisión, informe imprimible. El pago en Stellar se firma desde la revisión (**Deploy and fund**, **Approve and pay**) | Josué |
| Botón **Sign in**. Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. El ingreso pide el código al correo, o Google. La sesión sigue el `exp` del JWT, tope 24 h (PR #54) | Josué |
| Marca: Poppins 400, 500 y 600, acento lima `#B7EE34` y texto del botón `#08090C`. El Figma es la fuente de la UI (PR #58) | Abdiel |
| Módulo de firma (`lib/escrow`), `POST /api/firma`, `POST /api/firma/enviar`, `GET /api/escrow/[contrato]`, `GET` y `POST /api/usdc`, y `npm run hito`. El hash de un pago real no está en el repositorio | Sebas |
| Neon con Drizzle, Blob privado, rutas de tareas, evidencias, informe, proyectos y revisión. Semilla de ZEEK. Dueño del proyecto en `organizador_id` (PR #44). La revisión llama a Qwen; sin `LAYA_URL`, al stub. Si Groq o Laya fallan, `origen` `error` y **Retry review** (PR #45). Con Laya, el veredicto sale del índice de probabilidades (PR #59). Desde el PR #41, un correo nuevo entra como voluntario | Esteban, el #59 lo mergeó Josué |
| Auditoría del integrante: no mezcla tareas, no inventa US$0 ni corre el día de una fecha, abre USDC si la cuenta ya existe, y cierra fallos de la cámara | Josué (coautor), PR #4 |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |

| Pendiente | Dueño |
|---|---|
| Probar en testnet, con wallet real de Cavos, **Deploy and fund** y **Approve and pay**, y guardar el hash. La wallet del organizador necesita XLM y USDC de testnet. El Acta solo después de ese pago | Sebas |
| Confirmar Groq en producción. Asignar `organizador_id` a mano fuera del demo. `CAVOS_JWT_AUDIENCE` sigue vacío | Esteban |
| Publicar `LAYA_URL` (Tailscale Funnel). Sin esa URL el stub deja el trabajo en `parcial`. El borrador #49 sigue abierto | Abdiel |
| El 30 de septiembre, subir Next.js a 16.3.7 cuando salga el parche. Recargar si fondear falla y ocultar **Approve and pay** sin fondeo. El borrador #18 sigue abierto | Josué |
| Las cuatro cuentas del demo | Raúl |

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
| `GROQ_API_KEY` | Qwen 3.8 27B (`qwen/qwen3.8-27b`). Sin ella, una revisión real queda en `origen` `error`. |
| `LAYA_URL` | Laya. Sin ella, la revisión usa el stub. |
| `CAVOS_JWKS_URL` | JWKS para verificar el JWT de Cavos. |
| `CAVOS_JWT_ISSUER` | Emisores permitidos, separados por coma. |
| `CAVOS_JWT_AUDIENCE` | Si tiene valor, el `aud` tiene que coincidir. Hoy está vacío. |
| `HYTO_DEMO_LOGIN` | `1` enciende **Enter as demo**, **Leave demo** y **Switch to…**. El demo no crea proyectos ni firma. |

`.env.example` declara los nombres, sin valores. `LAYA_API_KEY` es opcional: si está, la revisión la manda a Laya.

## Fechas

- Meetup: miércoles 30 de septiembre de 2026, TEC Cartago.
- Ese día, subir Next.js a 16.3.7 cuando salga el parche.
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
