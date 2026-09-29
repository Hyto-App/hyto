# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El voluntario sube una foto, la IA recomienda y el organizador aprueba cada pago en USDC.

El demo es un evento de ZEEK. La app corre en https://hyto.vercel.app. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

El contexto para trabajar, incluido el de los agentes, está en [AGENTS.md](AGENTS.md). Este archivo no lo repite.

## Estado al 29 de septiembre de 2026

`main` está en `3778747`. Entran el esqueleto (PR #1), el admin (PR #3), la marca (PR #7), la auditoría del integrante (PR #4), el módulo de firma (PR #8), el backend de Neon, Blob y Cavos, el modo demo, el escrow V2 en la revisión (desplegar, fondear, aprobar y liberar), el alta automática del PR #41 y, desde el PR #44 de Josué Valles (29 de septiembre de 2026, 1:38 p.m., hora de Costa Rica), el organizador de cada proyecto. Un correo con login de Cavos válido que no existe se registra como voluntario. Quien crea un proyecto, con sesión real, queda en `proyectos.organizador_id`, aunque su rol sea voluntario. El rol de la tabla `usuarios` ya no abre el escrow ni la revisión. ZEEK nace sin dueño. Desde el PR #47 de Josué Valles (2:10 p.m., hora de Costa Rica), una sesión demo no crea proyectos.

La bandeja, la revisión y el informe leen la API cuando hay sesión y no es demo. Si la API no responde, siguen el ejemplo de ZEEK (tres trabajos de US$20 y un reembolso de hasta US$15). **Desplegar y fondear** y **Aprobar y pagar** están en la revisión y firman con Cavos. Fuera del demo, el botón Fondear de crear proyecto sigue guardando el borrador en el navegador. En el modo demo está deshabilitado, muestra «En el modo demo no se pueden crear proyectos.» y no guarda.

El paso principal que sigue es hacer que la IA revise la foto de verdad e integrar Laya. Antes, Esteban aplica `drizzle/0002_organizador_proyecto.sql`, asigna el dueño de ZEEK y se prueba el pago completo en testnet. El detalle y el orden están en [AGENTS.md](AGENTS.md). `CAVOS_JWT_AUDIENCE` está vacío. En el repo no hay hash de un pago real.

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| Esqueleto y admin: bandeja en `/`, crear proyecto, revisión, informe imprimible. El pago en Stellar se firma desde la revisión | Josué |
| Botón Entrar. Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. El ingreso pide el código al correo, o Google, y guarda la dirección solo si no hay aviso | Josué, ingreso de Esteban |
| Marca: Poppins 400, 500 y 600, acento lima `#B7EE34` y texto del botón `#08090C` | Abdiel |
| Módulo de firma (`lib/escrow`), `POST /api/firma`, `POST /api/firma/enviar`, `GET /api/escrow/[contrato]` y `npm run hito`. El hash de un pago real no está en el repositorio | Sebas |
| Neon con Drizzle, Blob privado, rutas de tareas, evidencias, informe, proyectos y revisión. Semilla de ZEEK. La revisión llama a Qwen y, sin `LAYA_URL`, al stub. Sin Groq, usa el guion fijo. Desde el PR #41, un correo nuevo entra como voluntario. Desde el PR #44, cada proyecto tiene su organizador | Esteban, organizador por proyecto de Josué |
| Auditoría del integrante: no mezcla tareas, no inventa US$0 ni corre el día de una fecha, abre USDC si la cuenta ya existe, y cierra fallos de la cámara | Josué (coautor), PR #4 |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |

| Pendiente | Dueño |
|---|---|
| Aplicar `drizzle/0002_organizador_proyecto.sql` y asignar `organizador_id` por email. La migración solo agrega la columna y no se corrió. ZEEK queda sin dueño hasta ese `UPDATE`. Sin dueño, la revisión y el pago responden 403 | Esteban |
| Cargar en el sitio la base, el almacén de fotos, la clave de la revisión y una de `CAVOS_JWT_JWK` o `CAVOS_JWKS_URL`. Si se usan código y Google, `CAVOS_JWT_ISSUER` lista los dos emisores. Correr `drizzle/0001_contrato_escrow.sql` si falta `contrato_escrow` | Esteban |
| Probar en testnet, con wallet real de Cavos, **Desplegar y fondear** y **Aprobar y pagar**, y guardar el hash. La wallet de quien organiza ese proyecto necesita XLM y USDC de testnet. El Acta solo después de ese pago. Hacen falta `HYTO_ESCROW_PLATFORM`, `HYTO_ESCROW_RESOLVER` y `HYTO_ESCROW_ADMIN` | Sebas |
| Hacer que la IA funcione. Es el paso principal. Groq (`qwen/qwen3.8-27b`) pide `GROQ_API_KEY`; si falla, `desdeGuion` entra en silencio y la UI no muestra `origen`. `LAYA_URL` no está: el stub deja las tareas de trabajo en `parcial`. Falta confirmar Groq en producción, mostrar `origen`, publicar Laya (Tailscale Funnel) y cerrar el PR #15 | Esteban, Abdiel |
| Dejar las cuatro cuentas de Cavos, con dirección `G…` y trustline de USDC. Un correo nuevo entra como voluntario y no hace falta cargarlo antes. Ese rol no lo hace dueño de ZEEK | Raúl |
| Fuera del demo, crear proyecto sigue en el navegador y no llama a `POST /api/proyectos`. En el modo demo, el PR #47 ya lo impide. Disputar y resolver no tienen botón. Los PR #18 y #45 siguen en borrador. El 30 de septiembre, subir Next.js a 16.3.7 cuando salga el parche | Josué |
| `CAVOS_JWT_AUDIENCE` sigue vacío: el código no comprueba el `aud` | Esteban |

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

`npm run dev` abre Next.js. `npm test` corre las pruebas de `lib/`, `scripts/backend-traspaso` y dos archivos de `tests/integracion` con `tsx`. `npx tsc --noEmit` revisa los tipos. `npm run hito` ejecuta `scripts/hito-prueba.ts`. Sin `TRUSTLESS_API_KEY` no paga. `npm run db:migrar` aplica `drizzle/*.sql` en orden, incluida `0002_organizador_proyecto.sql`. `npm run db:semilla` carga ZEEK sin dueño y, si el demo está prendido, el proyecto `demo`. Las dos necesitan `DATABASE_URL` y el visto bueno de quien es dueño de la base. No hay `npm run lint`.

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
| `CAVOS_JWT_AUDIENCE` | Si tiene valor, el `aud` tiene que coincidir. Hoy está vacío. |
| `HYTO_DEMO_LOGIN` | `1` enciende **Entrar como demo**, **Salir del demo** y **Cambiar a…**. |

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
