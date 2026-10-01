# Hyto — contexto para el equipo y para agentes

Leé esto antes de tocar el repo. Está escrito contra el código de `main` en `0d2c402` (1 de octubre de 2026, 3:33 p.m., hora de Costa Rica). Si un documento más viejo dice otra cosa, manda este archivo y el código.

La app en producción es Next.js en Vercel: https://hyto.vercel.app

## Stellar Raven (mandatory)

[Stellar Raven](https://raven.stellar.org) is Stellar's official MCP server: docs, live ecosystem data and playbooks. Sign-in is OAuth in the browser; no API keys.

- MCP endpoint: `https://raven.stellar.org/mcp`
- Cursor `mcp.json`: `{"mcpServers":{"stellar-raven":{"url":"https://raven.stellar.org/mcp"}}}`

**MANDATORY, not optional:** every new prompt or task by any teammate (Sebastián, Esteban, Abdiel, Raúl, Josué) or any AI agent must first consult Stellar Raven's documentation and use the Stellar MCP tools (Raven, plus Trustless Work where relevant) before starting any work.

## Code audit (2026-09-30)

Full report: [docs/AUDIT-2026-09-30.md](docs/AUDIT-2026-09-30.md) (against `main` at `db82b93`). Top P0 items:

1. **USDC trustline:** use Cavos's sponsored `wallet.addTrustline()` for the volunteer and check `wallet.status === "ready"` before `signXdr`; add a receiver-trustline and organizer-balance preflight before deploy/fund (Trustless Work v2 rejects deploy with `ESCROW_RECEIVER_TRUSTLINE_MISSING`).
2. **Contract id persistence:** save the predicted `contractId` and prepared hash in the DB at prepare time (not in the in-process `contratosPreparados` map) and confirm `INDEXER_LAGGING` submits via RPC.
3. **Wallet proof:** verify wallet ownership with a signed nonce; take `wallet_cobro` from the verified session wallet and lock it once the escrow is deployed.
4. **XSS:** reject SVG/unknown image types on evidence upload and add `nosniff`/CSP headers.
5. **JWT:** fail closed in production when `CAVOS_JWT_AUDIENCE` or `CAVOS_JWT_ISSUER` is empty, and set both in Vercel.
6. **CI:** add GitHub Actions (`npm ci`, `tsc --noEmit`, `npm test`) and fix the env-dependent test in `lib/api/rutas.test.ts:495`.

- Per-person task prompts for coding agents: [docs/AGENT-PROMPTS-2026-09-30.md](docs/AGENT-PROMPTS-2026-09-30.md)

After that report, PR #67 (Raúl, 1 de octubre, 2:43 a.m. Costa Rica time) closed the partial deploy/fund screen (audit item C5). PR #68 translated the remaining Spanish server messages and added a guard test. PR #77 (Josué Valles, 11:25 a.m. the same day) renamed the payment steps to plain language and hides **Approve and pay** until the budget is locked. PR #69 (Raúl, 3:33 p.m. the same day, with Josué Valles as co-author) closed audit item C6: a reimbursement is not deployed until the organizer confirms an amount within the limit. The six P0 items above are still open.

## Task ownership (rule for everyone)

- Task owners (in the Kanban, the audit prompts and docs/AGENT-PROMPTS-2026-09-30.md) are suggestions, not exclusive assignments. Nobody owns a task alone.
- Anyone who can take or help with a task may work on it.
- Whoever works on a task that was suggested for someone else must leave an entry in the mailbox (BUZON.md on the `buzon` branch) saying what they did, the PR/branch, and what's left, so the other person has the context.
- All coordination about tasks goes through the mailbox.

## Qué es Hyto

Hyto es control de gastos y pagos por hitos sobre Stellar. El organizador deja el presupuesto en un escrow multi-release de Trustless Work (V2, testnet). Cada tarea es un hito. El voluntario sube una foto. Una IA recomienda si la evidencia alcanzó. El organizador aprueba y el pago sale en USDC de testnet. Al cerrar, el informe compara presupuesto contra gasto y, si ya hay hash, enlaza el pago en Stellar.

El demo es un evento de ZEEK: tres tareas de trabajo de US$20 y un reembolso de comida de hasta US$15. Esos montos viven en la semilla y en el ejemplo local. Organización: [Hyto-App/hyto](https://github.com/Hyto-App/hyto).

Hay dos roles de producto, en la tabla `usuarios.rol`:

- **Organizador.** Crea el proyecto, ve la bandeja (`/`), la revisión (`/revision/[id]`) y el informe (`/informe`). Despliega y fondea el escrow, y aprueba y paga. Quien crea el proyecto queda en `proyectos.organizador_id` (`drizzle/0002_organizador_proyecto.sql`). Solo esa persona prepara el pago y revisa (`lib/api/organizador.ts`). El rol global `organizador` no autoriza el escrow de un proyecto ajeno.
- **Voluntario.** Ve sus tareas (`/mis-tareas`), sube la evidencia (`/tareas/[id]`) y, en `/cuentas`, prepara la wallet. La cuenta de cobro de la tarea (`wallet_cobro`) la fija el voluntario asignado al subir la foto.

La IA no firma ni mueve dinero. Un trabajo se paga por el monto de la tarea. Un reembolso se paga por el monto que el organizador confirmó, dentro del tope (PR #69).

## Stack y arquitectura

| Capa | Dónde está |
|---|---|
| App | Next.js 16.3.6 (App Router), React 19.1.1, TypeScript, Tailwind 4. Corre en Vercel. |
| Pantallas | Admin en `app/(admin)`: `/`, `/proyectos/nuevo`, `/revision/[id]`, `/informe`. Integrante en `app/(integrante)`: `/mis-tareas`, `/tareas/[id]`, `/cuentas`. |
| Marca | Poppins 400, 500 y 600. `--acento` `#B7EE34`, `--sobre-acento` `#08090C`. La fuente de verdad de la UI es el Figma de Abdiel, [Hyto – App](https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy). |
| API | Route Handlers en `app/api`. |
| Datos | Neon Postgres con Drizzle. El esquema declarado está en `lib/db/schema.ts`. Las migraciones son SQL en `drizzle/` (`0000_inicio.sql`, `0001_contrato_escrow.sql`, `0002_organizador_proyecto.sql`, `0003_monto_confirmado.sql`). `npm run db:migrar` las aplica en orden de nombre (`lib/db/aplicar.ts`). |
| Fotos | Vercel Blob, almacén privado (`access: "private"` en `lib/blob/fotos.ts`). En la base se guarda el identificador, no la URL pública. La pantalla recibe `GET /api/evidencias/:id/foto`. |
| Wallet | `@cavos/kit` 0.2.5, Stellar testnet, `appSalt` fijo `hyto` (`lib/integrante/identidades.ts`). |
| Escrow | Trustless Work V2, base `https://beta.api.trustlesswork.com` (`lib/escrow/cuerpos.ts`). Las llamadas salen del servidor con `TRUSTLESS_API_KEY`. El navegador solo firma el XDR. |
| USDC testnet | Emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. |
| IA | Groq, modelo `qwen/qwen3.8-27b`, y Laya si hay `LAYA_URL`. El veredicto lo arma el código. |

Rutas:

- `POST /api/sesion` y `DELETE /api/sesion` — abrir y cerrar sesión.
- `POST /api/sesion/wallet` — guardar la `G…` de la sesión.
- `GET` y `POST /api/sesion/demo` — modo demo.
- `GET` y `POST /api/tareas`, `POST /api/proyectos`, `GET /api/proyectos`, `GET /api/informe`.
- `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/evidencias/:id/foto`.
- `GET` y `POST /api/revision/:id` — el POST vuelve a revisar.
- `POST /api/revision/:id/monto` — el organizador confirma el monto a pagar de un reembolso.
- `POST /api/firma`, `POST /api/firma/enviar`, `GET /api/escrow/[contrato]`.

## Almacén: Neon y memoria

`Almacen` (`lib/db/almacen.ts`) es la interfaz de usuarios, proyectos, tareas, evidencias, veredictos y sesiones.

- **Neon.** `almacenNeon()` y `crearAlmacenNeon()` en `lib/db/neon.ts`. Si el host es Neon, usa el cliente HTTP. Si no, usa `pg` (Postgres local). Las rutas de producción entran por `conAlmacen` (`lib/api/base.ts`). Sin `DATABASE_URL` responden que la base no está configurada.
- **Memoria de servidor.** `crearMemoria()` en `lib/db/memoria.ts` guarda todo en `Map`. La usan las pruebas. No es el almacén de producción.
- **Memoria del navegador.** `lib/admin/memoria.ts` y `lib/integrante/almacen.ts` escriben en `localStorage`. La bandeja y Mis tareas arrancan con el ejemplo de ZEEK y, si la API responde y no es modo demo, lo reemplazan (`components/admin/usarVista.ts`). Crear proyecto (`components/admin/CrearProyecto.tsx`) todavía guarda el borrador en ese `localStorage`. El despliegue real del escrow no sale de ese botón: sale de la revisión.

Las fotos de prueba usan `crearFotosMemoria()`. En el servidor, `fotosBlob()` exige `BLOB_READ_WRITE_TOKEN`.

## Ingreso

El ingreso es Cavos (código al correo o Google) en `components/admin/Entrar.tsx`. El navegador manda el correo y el JWT a `POST /api/sesion`. El servidor verifica el JWT en `lib/sesion` (`lib/sesion/jwt.ts`, `lib/sesion/correo.ts`) y deja la cookie `hyto_sesion`.

La firma RS256 y el vencimiento salen de `CAVOS_JWT_JWK` o de `CAVOS_JWKS_URL`. Sin las dos no hay sesión, salvo `HYTO_PERMITIR_JWT_SIN_FIRMA=1`, y ese atajo no corre si `NODE_ENV` o `VERCEL_ENV` es `production`. `CAVOS_JWT_ISSUER` es una lista de `iss` separada por coma. Si `CAVOS_JWT_AUDIENCE` tiene valor, el `aud` tiene que coincidir. Vacío: no se comprueba la audiencia.

Desde el PR #41, un correo con login de Cavos válido que no está en `usuarios` se inserta solo, con rol `voluntario` (`lib/api/sesion.ts`). El rol `organizador` no se asigna en ese alta: queda solo si la fila ya existe con ese rol (la semilla trae `organizador@demo.hyto`) o si alguien lo escribe en la base.

La wallet del JWT, si viene, se guarda en la sesión. Si el JWT no trae la `G…`, `POST /api/sesion/wallet` acepta la dirección que manda el cliente. Eso no prueba que controle la clave. Al enviar un pago, la cuenta que firma tiene que ser la del XDR y la de `sesiones.wallet`.

## Modo demo

`HYTO_DEMO_LOGIN=1` enciende el demo (`lib/sesion/demo.ts`). Cualquier otro valor lo apaga y `POST /api/sesion/demo` responde 404.

Con el interruptor en 1, el ingreso muestra **Enter as demo** y un selector de organizador o voluntario. La sesión usa `demo-organizador@hyto.demo` o `demo-voluntario@hyto.demo`, sin billetera. Dentro del demo, los botones son **Switch to organizer** o **Switch to volunteer**, y **Leave demo** (`components/admin/Entrar.tsx`). Esa sesión no firma: `/api/firma` y `/api/firma/enviar` responden 403, «Demo mode can't send payments. Sign in with your email to continue.»

## Escrow en Stellar testnet

Trustless Work V2, multi-release. Un contrato por tarea. El id queda en `tareas.contrato_escrow` (`drizzle/0001_contrato_escrow.sql`). El hash del pago queda en `tareas.hash_pago`. **View on blockchain** arma `https://stellar.expert/explorer/testnet/tx/<hash>`.

Acciones que acepta `POST /api/firma` (`lib/escrow/cuerpos.ts`, `lib/api/firma.ts`): `desplegar`, `fondear`, `marcar`, `aprobar`, `liberar`, `disputar`, `resolver`. La prepara el servidor y devuelve un XDR sin firmar. El cliente lo firma con `wallet.signXdr` de Cavos (`lib/escrow/firmarCliente.ts`) y lo manda a `POST /api/firma/enviar`. El envío a Trustless es `POST /stellar/send-transaction`. Un fee-bump se rechaza: la cuenta que firma paga la comisión en XLM.

`GET /api/escrow/[contrato]` lee el escrow en Trustless. Solo el organizador. El saldo se mira en `balance`.

En la revisión, el organizador ve este orden (`components/admin/Revision.tsx`):

1. **Lock budget.** En pantalla ese es el primer paso del pago. `firmarPasos` corre `desplegar` y después `fondear`. Desplegar arma el contrato con la wallet del organizador, la `wallet_cobro` del voluntario, el monto y tres cuentas del servidor (`HYTO_ESCROW_ADMIN`, `HYTO_ESCROW_PLATFORM`, `HYTO_ESCROW_RESOLVER`). Esas tres tienen que ser distintas entre sí y distintas del organizador y de quien cobra. La comisión de plataforma va en 0. En un trabajo el monto es el de la tarea. En un reembolso es `evidencias.monto_confirmado`: sin un monto mayor que cero y dentro del tope, desplegar y fondear responden 409 (PR #69). El fondeo de un reembolso ignora el monto que manda el cliente. Si el despliegue sale bien y el fondeo falla, el botón pasa a **Finish locking** y solo corre `fondear` (PR #67; el texto es del PR #77).
2. **Approve and pay.** Solo se muestra si ya hay contrato y `fondeado === true` (`botonesRevision` en `lib/admin/remoto.ts`, PR #77). Corre `marcar`, `aprobar` y `liberar` (índice 0). Si un paso de esos falla, el botón reanuda desde ese paso. El rótulo incluye el monto.
3. **View on blockchain.** Aparece cuando la tarea queda `pagado` y hay `hash_pago`. Si el hash todavía no está, la pantalla dice que el enlace aparece cuando la red lo confirma.

`npm run hito` (`scripts/hito-prueba.ts`) es un script aparte. No sustituye este flujo en el navegador.

Para probar el flujo a mano en testnet, la wallet del organizador necesita XLM de testnet (la comisión) y USDC de testnet (el fondeo). Quien cobra necesita trustline de ese USDC.

## Variables de entorno

Solo nombres. Los valores no van al repo ni a estos documentos. `.env.example` lista las mismas lecturas, sin valores. La única que el código manda al navegador es `NEXT_PUBLIC_CAVOS_APP_ID`. No agregues otra `NEXT_PUBLIC_` sin avisar: queda en el bundle.

| Nombre | Para qué |
|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | Id de la app de Cavos en el cliente. Sin él no se llama a Cavos. |
| `TRUSTLESS_API_KEY` | Clave de Trustless Work, solo servidor. Sin ella la firma responde 503. |
| `TRUSTLESS_API_KEY_V1` | Clave distinta, solo para repetir el hito de prueba en v1. |
| `HYTO_ESCROW_ADMIN` | Cuenta `G…` admin del contrato. No puede repetir otro rol. |
| `HYTO_ESCROW_PLATFORM` | Cuenta `G…` de la plataforma. La comisión en Hyto es 0. |
| `HYTO_ESCROW_RESOLVER` | Cuenta `G…` que resuelve disputas. |
| `DATABASE_URL` | Postgres (Neon o local). Sin ella no hay almacén ni migración. |
| `HYTO_HOST_BASE_PRODUCCION` | Hosts de producción. `db:migrar` y `db:semilla` los comparan con `DATABASE_URL`. |
| `HYTO_CONFIRMAR_BASE_PRODUCCION` | El único valor que habilita migrar o sembrar esa base es `si`. |
| `BLOB_READ_WRITE_TOKEN` | Token del Blob privado. Sin él no se guardan ni se leen fotos. |
| `GROQ_API_KEY` | Groq, para describir la foto. Sin ella, la revisión queda en `origen: "error"`. |
| `LAYA_URL` | URL de Laya. Sin ella, después de Groq se usa el stub. |
| `LAYA_API_KEY` | Opcional. Si está, la revisión la manda a Laya como Bearer. |
| `CAVOS_JWKS_URL` | JWKS para verificar el JWT. |
| `CAVOS_JWT_ISSUER` | `iss` permitidos, separados por coma. Vacío: no se comprueba el emisor. |
| `CAVOS_JWT_AUDIENCE` | Si está, el `aud` tiene que coincidir. Vacío: no se comprueba. |
| `CAVOS_JWT_JWK` | JWK público. Tiene prioridad sobre `CAVOS_JWKS_URL`. |
| `HYTO_PERMITIR_JWT_SIN_FIRMA` | Solo fuera de producción, valor exacto `1`. Lee el JWT sin comprobar la firma. |
| `HYTO_DEMO_LOGIN` | Valor exacto `1` para el modo demo. |
| `NODE_ENV` | La pone Next.js. En `production` la cookie lleva `Secure`. |
| `VERCEL_ENV` | Si es `production`, también bloquea el JWT sin firma. |

`HYTO_PROBE_URL` la usan pruebas de integración, no la app.

## Cómo correrlo

```bash
npm ci
npm run dev
npm test
npx tsc --noEmit
npm run build
```

`npm test` corre los `*.test.ts` de `lib/`, `scripts/backend-traspaso` y dos pruebas de `tests/integracion`, con `tsx`. No hay ESLint ni `npm run lint`. `npm run test:integracion` es aparte y habla con Postgres.

Migraciones y semilla, solo con el visto bueno de quien es dueño de la base. No las corras contra producción por tu cuenta.

```bash
npm run db:migrar
npm run db:semilla
```

`db:migrar` aplica `drizzle/*.sql` en orden. `db:semilla` carga el proyecto ZEEK, los usuarios de demo y los veredictos de ejemplo. `npm run db:local` levanta Postgres en `127.0.0.1` si no hay `DATABASE_URL`. `npm run verificar:entorno` lista qué nombres faltan, sin imprimir valores. `npm run hito` es el script de escrow; sin `TRUSTLESS_API_KEY` no paga.

## Cómo trabaja el equipo

Un agente en la nube por tarea, y un pull request por agente. La rama sale de `main` actualizado. Nadie empuja a `main`.

Antes de mergear, se lee el diff a mano y se corren las pruebas. El merge es squash. No se suben secretos. No se agrega una variable `NEXT_PUBLIC_` nueva sin avisar. La UI sigue el Figma de Abdiel (Design (Figma)). No se corren migraciones de la base sin el visto bueno de quien es dueño.

## Design (Figma)

Abdiel owns UX/UI. The source of truth is the Figma file [Hyto – App](https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy). The current redesign lives on the page "Nuevo diseño".

Before merging any PR that changes the interface, compare it against that design and flag conflicts instead of overwriting his work.

## Estado actual y próximos pasos

`main` está en `0d2c402` (1 de octubre de 2026, 3:33 p.m., hora de Costa Rica). El ingreso con Cavos, el alta automática como voluntario, el modo demo, el Blob, Neon, las rutas y el flujo de firma en la revisión ya están en el código. Cada proyecto guarda su organizador. En el repositorio no hay un hash de un pago real en testnet. `CAVOS_JWT_AUDIENCE` y `CAVOS_JWT_ISSUER` siguen vacíos: si no tienen valor, el código no comprueba `aud` ni `iss`.

El 1 de octubre entraron cuatro cambios. Josué Valles mergeó los de Raúl y, a las 11:25 a.m., el suyo.

- **PR #69**, `0d2c402`, 3:33 p.m. Raúl (Milasur), con Josué Valles como coautor. En un reembolso, la lectura del comprobante se queda en `evidencias.monto`. Desplegar y fondear usan `evidencias.monto_confirmado`, que el organizador guarda con `POST /api/revision/:id/monto`. En la revisión, **Amount on the receipt** muestra la lectura y **Amount to pay** es obligatorio antes de **Lock budget**. Ese botón sigue deshabilitado hasta que el campo coincide con el monto guardado. Un monto en cero, mal escrito o por encima del tope se rechaza; no se recorta. Si una lectura nueva cambia el monto del comprobante, la confirmación anterior se borra. Con contrato ya desplegado, o con la tarea pagada, confirmar responde 409. Un trabajo sigue usando el monto de la tarea. La migración es `drizzle/0003_monto_confirmado.sql`. El SQL pide el visto bueno de Esteban antes de aplicarla en producción. El PR anota que esa columna ya estaba en la base de producción al mergear.
- **PR #77**, `3770819`, 11:25 a.m. Josué Valles. La revisión dice **Lock budget**, **Finish locking** y **Approve and pay**. Ese último solo aparece con el presupuesto bloqueado. El enlace del pago es **View on blockchain**. Preparar el cobro es **Get ready to be paid**. Crear proyecto es **Save project**. `lib/ui/claro.ts` convierte el error técnico en la siguiente acción. El prepare y el envío del escrow no cambiaron.
- **PR #67**, `2fa3bd5`, 2:43 a.m. Raúl (Milasur). Si **desplegar** sale bien y **fondear** falla, la revisión recarga el detalle y ofrece terminar el bloqueo del contrato que ya quedó guardado, en vez de volver a desplegar. `ErrorFirmaCliente` lleva ese id. Una lectura del indexador en `null` no borra, en la misma sesión, el estado «no fondeado» de ese contrato. Desde el PR #77 ese botón se llama **Finish locking**.
- **PR #68**, `b0926f3`, el mismo momento que el #67. Raúl (Milasur). Los avisos de servidor que seguían en español (escrow, entorno y el cruce de esquema) quedaron en inglés. `lib/escrow/ingles.test.ts` falla si un literal `aviso`, `mensaje` o `detail` vuelve a traer español. Siguen en español los comentarios, los valores de dominio (`en revisión`, `cumplió`) y algunas líneas de scripts que no son esos literales.

El paso principal que sigue es hacer que la IA revise la foto de verdad e integrar Laya. Antes hay que completar un pago en testnet. Los dueños de abajo son sugerencias de [docs/AGENT-PROMPTS-2026-09-30.md](docs/AGENT-PROMPTS-2026-09-30.md). Quien tome una tarea de otra persona deja nota en el buzón.

1. **Probar el escrow completo en testnet, con una wallet real de Cavos.** La wallet del organizador tiene que tener XLM de testnet y USDC de testnet. Quien cobra necesita trustline de ese USDC. En la revisión: **Lock budget**, después **Approve and pay**, y quedarse con el hash. Ese hash es el que llena `tareas.hash_pago` y habilita **View on blockchain**. Hasta que ese pago exista, el Acta no entra. El checklist está en los prompts de Josué.
2. **Seguir el código de la IA hasta que revise la foto de verdad.** Es el paso principal. Hoy `revisar()` (`lib/revision/revisar.ts`) hace esto:

   Al subir la foto (`lib/api/evidencias.ts`) y al abrir o forzar la revisión (`GET` y `POST /api/revision/:id`) se llama a `revisar()`.

   Groq describe la foto con `qwen/qwen3.8-27b` (`lib/revision/scout.ts`). Hace falta `GROQ_API_KEY`. El archivo y el `origen` `"scout"` conservan el nombre de Llama 4 Scout; el modelo que se pide es Qwen. El cuerpo pide JSON con `texto`, `monto` y `fecha`, `temperature: 0` y `max_completion_tokens: 1024`. `leerDescripcion` solo acepta un JSON con `texto`. Si no lo encuentra, la revisión queda en error.

   Sin foto, sin clave, o si Groq o Laya fallan, el resultado es `origen: "error"` y queda registrado (`registrarFallo`). `desdeGuion()` sigue en `lib/revision/armar.ts` para las pruebas; `revisar()` ya no la usa como reserva silenciosa. Sin `LAYA_URL`, si Groq respondió, entra el stub (`origen: "stub"`): en un trabajo el score es `parcial`. La revisión y el informe muestran el origen como **AI recommendation**, **Sample recommendation** o **Review failed** (`etiquetaOrigen`, PR #77). **Retry review** vuelve a llamar `POST /api/revision/:id` (PR #45).

   Laya está en `lib/revision/laya.ts`. `LAYA_URL` todavía no está configurada. Con esa URL, el `POST` va a `{LAYA_URL}/v1/systemone`, modelo `multilingual`, preguntas `choice`, `noul` y `score`. `LAYA_API_KEY`, si existe, va como Bearer. Si el `score` trae `probabilities`, el veredicto sale del índice más alto (0 insuficiente, 1 parcial, 2 cumplió). Eso ya está en `main` (PR #59) y cubre lo que pedía el PR #15.

   El código arma `cumplió`, `parcial` o `insuficiente`. La IA no firma ni mueve dinero. En un reembolso, un monto leído por encima del tope, o sin monto y fecha, baja a `insuficiente`. Esa lectura no es el monto del pago: el organizador confirma otro, dentro del tope, antes de **Lock budget** (PR #69). Si `noul` es falso, no queda `cumplió`. En la revisión real, el organizador paga con **Approve and pay**, y solo si el presupuesto ya está bloqueado. El botón local **Aprobar** y **Pedir otra foto** solo existen en la vista de ejemplo.

   Pendiente de este paso, en concreto:

   - Confirmar que Groq responde de verdad en producción, con `GROQ_API_KEY` y el modelo `qwen/qwen3.8-27b`, y que el JSON cabe en `max_completion_tokens: 1024`.
   - Levantar Laya: el servidor de Abdiel, publicado con Tailscale Funnel, y después poner `LAYA_URL`. Sin esa URL el stub sigue decidiendo.
   - Ensayar con una foto real y dejar un `origen` distinto de `stub`.

### UX del escrow que sigue abierta

El caso «desplegar bien y fondear mal» quedó cerrado en el PR #67. El botón **Approve and pay** quedó oculto hasta el fondeo en el PR #77. El monto de un reembolso lo confirma el organizador antes de desplegar (PR #69). En un reembolso, el fondeo usa ese monto guardado y no el que manda el cliente. En un trabajo, el fondeo todavía puede tomar el monto del pedido. Siguen estos dos:

- El saldo se lee de `GET /api/escrow/[contrato]`. El indexador de Trustless no es inmediato: `balance` puede seguir en 0 un momento, y `fondeado` queda `null` si el número no se lee. En la misma sesión, un fondeo exitoso fuerza el estado. El PR #67 evita que un `null` pise el «no fondeado» de un fondeo que acaba de fallar. Al recargar, manda lo que diga el indexador.
- `contratosPreparados` en `lib/api/firma.ts` es un `Map` del proceso. Si el envío cae en otra instancia, o el proceso se reinicia, se pierde el id que el prepare había guardado para cuando Trustless no devuelve el contrato. Guardarlo en la base es un P0 de Josué.

### Pendiente por persona

Al 1 de octubre de 2026. Dueños sugeridos, no exclusivos.

- **Raúl.** Hecho ese día: PR #67, PR #68 y, a las 3:33 p.m., el PR #69 (el organizador confirma el monto del reembolso). Abierto: PR #72 (la evidencia se toma con la cámara, rama `raul/camera-only-evidence`) y PR #80 (las preguntas de Laya miran el texto escrito, no la foto).
- **Josué.** Hecho a las 11:25 a.m.: PR #77, lenguaje llano del pago y **Approve and pay** solo con el presupuesto bloqueado. Sigue: trustline de USDC patrocinada por Cavos, preflight de trustline y de saldo antes de desplegar y fondear, guardar el `contractId` previsto en la base, prueba firmada de que la sesión controla la wallet, cargar `CAVOS_JWT_AUDIENCE` y `CAVOS_JWT_ISSUER` en Vercel, y el primer pago real en testnet. Después: calcular en el servidor el monto de fondeo de un trabajo (el del reembolso ya lo hace el PR #69), `approve-and-release`, la migración de índices y una sola passphrase de red. Next.js sigue en 16.3.6. Abierto, aparte: PR #18 (no perder el ingreso al volver de Google).
- **Abdiel.** Que la revisión llame a Groq y a Laya de verdad, y el resumen de monto, receptor y red antes de cada firma. Ocultar **Approve and pay** hasta el fondeo ya entró en el PR #77, de Josué. La UI sigue su Figma, página «Nuevo diseño». El PR #77 no rediseñó las pantallas hacia ese mockup.
- **Esteban.** Rechazar SVG y tipos de imagen que no sean JPEG, PNG, WebP o HEIC; cabeceras `nosniff` y CSP; JWT que falle cerrado en producción si falta audiencia o emisor; tope de subida acorde a los 4,5 MB de Vercel; no guardar el token de sesión en claro.
- **Sebastián.** Arreglar la prueba de `lib/api/rutas.test.ts` que consulta Neon cuando el envío no recibe un almacén de memoria, agregar GitHub Actions (`npm ci`, `tsc --noEmit`, `npm test`) y un límite de pedidos compartido entre instancias. El Acta sigue esperando un hash de pago real.

## Sugerencias del equipo (no son compromisos)

Ideas para considerar más adelante; no son trabajo planificado. Las decisiones y los pendientes viven en `BUZON.md` de la rama `buzon` (#005–#014).

- **Decisión (#005):** el MVP se queda en pagos con escrow; no se agregan features nuevas hasta que lo existente funcione.
- **Sugerencias:** auditar el código con IA y armar un plan de trabajo (#010); tema oscuro y animaciones con las plantillas de Abdiel (#011); después del MVP, integrar Luma, insignias y Stellar Passport (#013); Kanban en Notion (#014).
- **Preguntas abiertas a evaluar:** lógica de validación con IA (Grok describe, Laya decide; puntaje del organizador) (#006); foto de evidencia solo con cámara y riesgo de fraude (#012). Simplificar el flujo para gente sin experiencia en crypto (#007) entró el 1 de octubre en el PR #77: los pasos del pago ya se leen como **Lock budget**, **Finish locking** y **Approve and pay**.
