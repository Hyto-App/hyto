# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El voluntario sube una foto, la IA recomienda y el organizador aprueba cada pago en USDC.

El demo es un evento de ZEEK. La app corre en https://hyto.vercel.app. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

El contexto para trabajar, incluido el de los agentes, está en [AGENTS.md](AGENTS.md). Este archivo no lo repite.

## Estado al 1 de octubre de 2026

`main` está en `2b9fad4`. Entran el esqueleto (PR #1), el admin (PR #3), la marca (PR #7), la auditoría del integrante (PR #4), el módulo de firma (PR #8), el backend de Neon, Blob y Cavos, el modo demo, el escrow V2 en la revisión y el alta automática: desde el PR #41, un correo con login de Cavos válido que no existe se registra como voluntario. Desde el PR #44 el organizador es de cada proyecto. El 1 de octubre Josué Valles dejó el shell de los mockups v2 (PR #82, 4:01 p.m. hora de Costa Rica) y, a las 6:22 p.m., la membresía por evento, las invitaciones y un solo shell (PR #85). Raúl (Milasur) dejó el reintento de fondeo (PR #67), el inglés que faltaba en el servidor (PR #68) y el monto confirmado del reembolso (PR #69). Josué también dejó el lenguaje llano del pago (PR #77).

Quien entra no elige un rol global. Crea un evento si su wallet cubre las tareas más 1 USDC, o se une con un código o una invitación. El organizador ve el evento y asigna. Cada integrante ve sus tareas. La revisión firma con Cavos: **Lock budget**, **Finish locking** si el fondeo quedó a medias, y **Approve and pay** solo con el escrow fondeado. El ejemplo de ZEEK (tres trabajos de US$20 y un reembolso de hasta US$15) queda para el demo. `drizzle/0004_miembros_invitaciones.sql` no se aplicó a Neon.

El paso principal que sigue es hacer que la IA revise la foto de verdad e integrar Laya. Antes, hay que probar el pago completo en testnet. El detalle y el orden están en [AGENTS.md](AGENTS.md). `CAVOS_JWT_AUDIENCE` está vacío. En el repo no hay hash de un pago real.

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| Esqueleto, shell v2 y, desde el PR #85, eventos, invitaciones y un solo shell (Events, Tasks, Account). El pago en Stellar se firma desde la revisión | Josué |
| Botón Entrar. Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. El ingreso pide el código al correo, o Google, y guarda la dirección solo si no hay aviso | Josué, ingreso de Esteban |
| Marca: Poppins 400, 500 y 600, acento lima `#B7EE34` y texto del botón `#08090C`. El shell v2 (claro y oscuro, barra lateral, pestañas) entró en el PR #82 | Abdiel (marca), Josué (PR #82) |
| Módulo de firma (`lib/escrow`), `POST /api/firma`, `POST /api/firma/enviar`, `GET /api/escrow/[contrato]` y `npm run hito`. El hash de un pago real no está en el repositorio. **Aprobar y pagar** espera contrato fondeado (PR #77). Un reembolso espera monto confirmado (PR #69) | Sebas, con UX de Josué y Raúl |
| Neon con Drizzle, Blob privado, rutas de tareas, evidencias, informe, proyectos y revisión. Semilla de ZEEK. Migraciones `0000` a `0003` aplicadas en el historial del repo; `0004` (miembros e invitaciones, PR #85) está escrita y no se corrió en Neon. La revisión llama a Qwen (`max_completion_tokens` 1024). Sin `LAYA_URL` usa el stub y `origen` `stub`. Si Groq o Laya fallan, el origen es `error`, queda registrado y la pantalla ofrece reintentar (PR #45). El `score` de Laya sale de la probabilidad más alta (PR #59). Desde el PR #41, un correo nuevo entra como voluntario | Esteban, con el arreglo de la revisión y la membresía de Josué |
| Auditoría del integrante: no mezcla tareas, no inventa US$0 ni corre el día de una fecha, abre USDC si la cuenta ya existe, y cierra fallos de la cámara | Josué (coautor), PR #4 |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |

| Pendiente | Dueño |
|---|---|
| Probar en testnet, con wallet real de Cavos, **Lock budget** y **Approve and pay**, y guardar el hash. La wallet del organizador necesita XLM y USDC de testnet; el saldo USDC ya se comprueba (PR #85). Quien cobra necesita trustline, y eso todavía no se preflight. El Acta solo después de ese pago. Siguen guardar el id de contrato en la base, la prueba de que la wallet es de quien entra, `HYTO_TOKEN_SECRET` en Vercel y aplicar `0004` | Josué (sugerido en la auditoría), Sebas en el pago |
| Publicar Laya (`LAYA_URL`) y hacer que la revisión muestre `origen`. El modelo sigue fijo en `qwen/qwen3.8-27b`. El error y el reintento ya están (PR #45). El PR #15 quedó cubierto por el PR #59 | Abdiel |
| Rechazar SVG, encabezados `nosniff` y CSP, y fallar en producción si `CAVOS_JWT_AUDIENCE` o `CAVOS_JWT_ISSUER` están vacíos. Hoy, vacío: no se comprueba el `aud` | Esteban |
| Arreglar la prueba de `lib/api/rutas.test.ts` que habla con Neon si no hay `DATABASE_URL`, y agregar GitHub Actions | Sebastián |
| Dejar listas las cuatro cuentas del demo para el ensayo. El código de sus tareas de auditoría ya está (PR #67, #68 y #69). Abiertos: PR #72 (foto solo con cámara) y PR #80 (preguntas de Laya) | Raúl |
| Next.js sigue en 16.3.6. El salto a 16.3.7 previsto para el 30 de septiembre no entró | Josué |

`--acento` es `#B7EE34` y `--sobre-acento` es `#08090C`, en `app/globals.css`. El tema claro es el de defecto; el oscuro se activa con `data-theme="dark"` en `<html>` y el botón de `components/ui/Marca.tsx`. La tipografía es Poppins. En el escritorio la navegación es una barra lateral; en el móvil, pestañas abajo (PR #82).

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

Solo nombres. Los valores van en Vercel o en `.env` local, nunca en el repo. La lista completa y para qué sirve cada una está en [AGENTS.md](AGENTS.md). El código lee, entre otras, `NEXT_PUBLIC_CAVOS_APP_ID`, `TRUSTLESS_API_KEY`, `HYTO_TOKEN_SECRET`, `HYTO_STELLAR_NETWORK`, `HYTO_ESCROW_ADMIN`, `HYTO_ESCROW_PLATFORM`, `HYTO_ESCROW_RESOLVER`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `GROQ_API_KEY`, `LAYA_URL`, `LAYA_API_KEY`, `CAVOS_JWKS_URL`, `CAVOS_JWT_ISSUER`, `CAVOS_JWT_AUDIENCE`, `CAVOS_JWT_JWK`, `HYTO_DEMO_LOGIN` y `HYTO_PERMITIR_JWT_SIN_FIRMA`.

| Nombre | Para qué |
|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | Id de la app de Cavos en el navegador. Es la única variable pública. |
| `TRUSTLESS_API_KEY` | Trustless Work, solo en el servidor. Sin ella no hay pago. |
| `HYTO_TOKEN_SECRET` | Secreto HMAC de los pagos preparados. Mínimo 32 caracteres. En producción, sin él no se prepara ni se confirma el pago (PR #85). |
| `HYTO_STELLAR_NETWORK` | `public` o `mainnet` lee Horizon público al comprobar USDC. Vacío: testnet. |
| `HYTO_ESCROW_ADMIN` | Cuenta admin del contrato. No puede repetir otro rol. |
| `HYTO_ESCROW_PLATFORM` | Cuenta de la plataforma. La comisión en Hyto es 0. |
| `HYTO_ESCROW_RESOLVER` | Cuenta que resuelve disputas. |
| `DATABASE_URL` | Neon o Postgres local. La leen las rutas y la migración. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, almacén privado. |
| `GROQ_API_KEY` | Qwen 3.8 27B (`qwen/qwen3.8-27b`). Sin ella, la revisión queda en origen `error` y se puede reintentar. |
| `LAYA_URL` | Laya. Sin ella, la revisión usa el stub. |
| `CAVOS_JWKS_URL` | JWKS para verificar el JWT de Cavos. |
| `CAVOS_JWT_ISSUER` | Emisores permitidos, separados por coma. |
| `CAVOS_JWT_AUDIENCE` | Si tiene valor, el `aud` tiene que coincidir. Hoy está vacío. |
| `HYTO_DEMO_LOGIN` | `1` enciende **Entrar como demo**, **Salir del demo** y **Cambiar a…**. |

`.env.example` declara los nombres, sin valores. `LAYA_API_KEY` es opcional: si está, la revisión la manda a Laya.

## Fechas

- Meetup: miércoles 30 de septiembre de 2026, TEC Cartago.
- Ese día estaba previsto subir Next.js a 16.3.7. Al cierre del 1 de octubre la app sigue en 16.3.6.
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
