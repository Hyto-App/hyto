# Hyto — contexto para el equipo y para agentes

Leé esto antes de tocar el repo. Está escrito contra el código de `main` en `7d1f0a0` (29 de septiembre de 2026, 4:37 p.m., hora de Costa Rica). Si un documento más viejo dice otra cosa, manda este archivo y el código.

La app en producción es Next.js en Vercel: https://hyto.vercel.app

## Qué es Hyto

Hyto es control de gastos y pagos por hitos sobre Stellar. El organizador deja el presupuesto en un escrow multi-release de Trustless Work (V2, testnet). Cada tarea es un hito. El voluntario sube una foto. Una IA recomienda si la evidencia alcanzó. El organizador aprueba y el pago sale en USDC de testnet. Al cerrar, el informe compara presupuesto contra gasto y, si ya hay hash, enlaza el pago en Stellar.

El demo es un evento de ZEEK: tres tareas de trabajo de US$20 y un reembolso de comida de hasta US$15. Esos montos viven en la semilla y en el ejemplo local. Organización: [Hyto-App/hyto](https://github.com/Hyto-App/hyto).

Hay dos roles de producto, en la tabla `usuarios.rol`:

- **Organizador.** Crea el proyecto, ve la bandeja (`/`), la revisión (`/revision/[id]`) y el informe (`/informe`). Despliega y fondea el escrow, y aprueba y paga. Desde el PR #44 de Josué Valles, el dueño queda en `proyectos.organizador_id` (`drizzle/0002_organizador_proyecto.sql`). Quien crea el proyecto se guarda ahí. Escrow, revisión, bandeja, tareas e informe miran ese dueño, o las tareas asignadas a la sesión. La migración solo agrega la columna: nace vacía y el dueño de un proyecto ya creado se asigna a mano en Neon, por email. La semilla no escribe `organizador_id` en ZEEK. Con el demo prendido existe el proyecto demo, a nombre de `demo-organizador`.
- **Voluntario.** Ve sus tareas (`/mis-tareas`), sube la evidencia (`/tareas/[id]`) y, en `/cuentas`, prepara la wallet. La cuenta de cobro de la tarea (`wallet_cobro`) la fija el voluntario asignado al subir la foto. Una sesión demo puede subir evidencia solo a tareas del proyecto demo, y la wallet de cobro que mande se ignora (PR #50, Josué Valles).

La IA no firma ni mueve dinero. El pago de un hito es el monto completo.

## Idioma de la interfaz

Desde el PR #56 de Josué Valles (29 de septiembre de 2026, 4:37 p.m., hora de Costa Rica, `7d1f0a0`), lo que ve la persona está en inglés. `<html lang="en">`. Fechas y montos usan `en-US`. El veredicto se muestra **Met**, **Partial** o **Insufficient**. El estado se muestra **Pending**, **In review** o **Paid**. El tipo se muestra **Work** o **Reimbursement**. El pedido a Groq pide la descripción en inglés y el JSON sigue con las claves `texto`, `monto` y `fecha`.

Los valores guardados siguen en español (`pendiente`, `en revisión`, `pagado`, `cumplió`, `parcial`, `insuficiente`, `trabajo`, `reembolso`, `organizador`, `voluntario`). `lib/ui/etiquetas.ts` los traduce al dibujar, junto con los textos conocidos de la semilla vieja de ZEEK. No hubo migración. Un título que alguien escribió y no está en ese mapa se muestra tal cual. Las rutas, las columnas, los comentarios y la salida de los scripts siguen como estaban. Las claves de JSON y de Laya siguen `texto`, `monto`, `fecha`, `trabajo`, `factura`, `otra`, `insuficiente`, `parcial` y `cumplió`.

## Stack y arquitectura

| Capa | Dónde está |
|---|---|
| App | Next.js 16.3.6 (App Router), React 19.1.1, TypeScript, Tailwind 4. Corre en Vercel. |
| Pantallas | Admin en `app/(admin)`: `/`, `/proyectos/nuevo`, `/revision/[id]`, `/informe`. Integrante en `app/(integrante)`: `/mis-tareas`, `/tareas/[id]`, `/cuentas`. |
| Marca | Poppins 400, 500 y 600. `--acento` `#B7EE34`, `--sobre-acento` `#08090C`. La fuente de verdad de la UI es el Figma de Abdiel. |
| API | Route Handlers en `app/api`. |
| Datos | Neon Postgres con Drizzle. El esquema declarado está en `lib/db/schema.ts`. Las migraciones son SQL en `drizzle/` (`0000_inicio.sql`, `0001_contrato_escrow.sql`, `0002_organizador_proyecto.sql`). `npm run db:migrar` las aplica en orden de nombre (`lib/db/aplicar.ts`). |
| Fotos | Vercel Blob, almacén privado (`access: "private"` en `lib/blob/fotos.ts`). En la base se guarda el identificador, no la URL pública. La pantalla recibe `GET /api/evidencias/:id/foto`. |
| Wallet | `@cavos/kit` 0.2.5, Stellar testnet, `appSalt` fijo `hyto` (`lib/integrante/identidades.ts`). |
| Escrow | Trustless Work V2, base `https://beta.api.trustlesswork.com` (`lib/escrow/cuerpos.ts`). Las llamadas salen del servidor con `TRUSTLESS_API_KEY`. El navegador solo firma el XDR. |
| USDC testnet | Emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. |
| IA | Groq, modelo `qwen/qwen3.8-27b`, y Laya si hay `LAYA_URL`. El veredicto lo arma el código. Si Groq o Laya fallan, el origen queda `error` y no se usa el guion fijo (PR #45, Josué Valles). Sin `LAYA_URL`, después de Groq se usa el stub. |

Rutas:

- `POST /api/sesion` y `DELETE /api/sesion` — abrir y cerrar sesión.
- `POST /api/sesion/wallet` — guardar la `G…` de la sesión.
- `GET` y `POST /api/sesion/demo` — modo demo.
- `GET` y `POST /api/tareas`, `POST /api/proyectos`, `GET /api/proyectos`, `GET /api/informe`.
- `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/evidencias/:id/foto`.
- `GET` y `POST /api/revision/:id` — el POST vuelve a revisar.
- `POST /api/firma`, `POST /api/firma/enviar`, `GET /api/escrow/[contrato]`.
- `GET` y `POST /api/usdc` — leer y preparar la trustline de USDC de testnet de la wallet de la sesión (PR #50). El demo responde 403.

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

Desde el PR #54 de Josué Valles, la cookie y `sesiones.expira_en` siguen el `exp` del JWT ya verificado, con tope de 24 horas (`TOPE_SESION_SEGUNDOS` en `lib/sesion/cookie.ts`). Si el JWT no trae `exp`, la sesión dura 8 horas. El demo usa esas 8 horas. Una sesión vencida responde 401 con el texto de `AVISO_ENTRAR` (`Sign in to continue.`, `lib/sesion/avisos.ts`) y `VigilarSesion` abre el ingreso en `/` con `signin=1`.

Desde el PR #52, **Sign out** (`components/sesion/Salir.tsx`) cierra la sesión del servidor, la sesión de wallet de Cavos y la wallet guardada en el navegador, aunque la sesión ya esté vencida. Preparar USDC y firmar reutilizan un token de Cavos todavía válido entre pestañas. Si ese token no se puede renovar, la pantalla ofrece entrar de nuevo.

## Modo demo

`HYTO_DEMO_LOGIN=1` enciende el demo (`lib/sesion/demo.ts`). Cualquier otro valor lo apaga y `POST /api/sesion/demo` responde 404.

Con el interruptor en 1, el ingreso muestra **Enter as demo** y un selector de organizador o voluntario. La sesión usa `demo-organizador@hyto.demo` o `demo-voluntario@hyto.demo`, sin billetera. Dentro del demo, los botones son **Switch to organizer** o **Switch to volunteer**, y **Leave demo** (`components/admin/Entrar.tsx`, `components/sesion/SalirDemo.tsx`). La insignia dice **Demo mode**. Esa sesión no firma: `/api/firma` y `/api/firma/enviar` responden 403, `Demo mode: signatures are off`. `POST /api/usdc` también responde 403. `POST /api/proyectos` en demo responde `Demo mode cannot create projects.`

Desde el PR #47 de Josué Valles, una sesión demo o un pedido sin sesión no puede hacer `POST /api/proyectos`. La pantalla de crear proyecto muestra «En el modo demo no se pueden crear proyectos.» y no guarda. Desde el PR #50, el voluntario demo sí puede subir evidencia, solo en tareas del proyecto demo.

## Escrow en Stellar testnet

Trustless Work V2, multi-release. Un contrato por tarea. El id queda en `tareas.contrato_escrow` (`drizzle/0001_contrato_escrow.sql`). El hash del pago queda en `tareas.hash_pago`. **View payment** arma `https://stellar.expert/explorer/testnet/tx/<hash>`.

Acciones que acepta `POST /api/firma` (`lib/escrow/cuerpos.ts`, `lib/api/firma.ts`): `desplegar`, `fondear`, `marcar`, `aprobar`, `liberar`, `disputar`, `resolver`. La prepara el servidor y devuelve un XDR sin firmar. El cliente lo firma con `wallet.signXdr` de Cavos (`lib/escrow/firmarCliente.ts`) y lo manda a `POST /api/firma/enviar`. El envío a Trustless es `POST /stellar/send-transaction`. Un fee-bump se rechaza: la cuenta que firma paga la comisión en XLM.

`GET /api/escrow/[contrato]` lee el escrow en Trustless. Lo ve quien organiza ese proyecto. El saldo se mira en `balance`.

En la revisión, el organizador ve este orden (`components/admin/Revision.tsx`):

1. **Deploy and fund.** `firmarPasos` corre `desplegar` y después `fondear`. Desplegar arma el contrato con la wallet del organizador, la `wallet_cobro` del voluntario, el monto de la tarea y tres cuentas del servidor (`HYTO_ESCROW_ADMIN`, `HYTO_ESCROW_PLATFORM`, `HYTO_ESCROW_RESOLVER`). Esas tres tienen que ser distintas entre sí y distintas del organizador y de quien cobra. La comisión de plataforma va en 0. Si el contrato ya existe y no está fondeado, el botón que queda es **Fund**.
2. **Approve and pay.** Corre `marcar`, `aprobar` y `liberar` (índice 0). Si un paso de esos falla, el botón reanuda desde ese paso.
3. **View payment.** Aparece cuando la tarea queda `pagado` y hay `hash_pago`.

`npm run hito` (`scripts/hito-prueba.ts`) es un script aparte. No sustituye este flujo en el navegador.

Para probar el flujo a mano en testnet, la wallet del organizador necesita XLM de testnet (la comisión) y USDC de testnet (el fondeo). Quien cobra necesita trustline de ese USDC. Desde el PR #50, una sesión real puede prepararla en la revisión: `POST /api/usdc` arma el `changeTrust` solo para la wallet de la sesión y el navegador lo firma con el mismo `signXdr` del escrow (`components/sesion/PrepararUsdc.tsx`).

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
| `GROQ_API_KEY` | Groq, para describir la foto. Sin ella, la revisión guarda origen `error` y no usa el guion fijo. |
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

Antes de mergear, se lee el diff a mano y se corren las pruebas. El merge es squash. No se suben secretos. No se agrega una variable `NEXT_PUBLIC_` nueva sin avisar. La UI sigue el Figma de Abdiel. No se corren migraciones de la base sin el visto bueno de quien es dueño.

## Estado actual y próximos pasos

`main` está en `7d1f0a0`. Lo empujó Josué Valles el 29 de septiembre de 2026, a las 4:37 p.m., hora de Costa Rica: el PR #56 deja en inglés la interfaz y los avisos de la API. Los valores guardados siguen en español y `lib/ui/etiquetas.ts` los traduce al dibujar, sin migración. En el mismo día, también de Josué, entraron el organizador por proyecto (PR #44, 1:38 p.m.), el demo que no crea proyectos (PR #47, 2:10 p.m.), la evidencia del demo y la trustline de USDC (PR #50, 3:02 p.m.), **Sign out** y la sesión de firma de Cavos (PR #52, 4:10 p.m.), la cookie que sigue el vencimiento del JWT (PR #54, 4:18 p.m.) y el error real de la revisión con **Retry review** (PR #45, 4:22 p.m.). El ingreso con Cavos, el alta automática como voluntario, el modo demo, el Blob, Neon, las rutas y el flujo de firma en la revisión ya estaban. En el repositorio no hay un hash de un pago real en testnet. `CAVOS_JWT_AUDIENCE` sigue vacío: el código no comprueba el `aud`.

### Qué hace la revisión ahora

Al subir la foto (`lib/api/evidencias.ts`) y al abrir o forzar la revisión (`GET` y `POST /api/revision/:id`) se llama a `revisar()` (`lib/revision/revisar.ts`).

La foto la describe Groq con el modelo `qwen/qwen3.8-27b` (`lib/revision/scout.ts`). Hace falta `GROQ_API_KEY`. El archivo, la columna `texto_scout` y el `origen` `"scout"` son nombres viejos de Llama 4 Scout; el modelo que se pide es Qwen. El cuerpo manda `temperature: 0`, `max_completion_tokens: 1024`, `reasoning_effort: "none"` y `reasoning_format: "hidden"`. `leerDescripcion` acepta un JSON con `texto`, y lee `monto` y `fecha` si vienen. Si el JSON no se lee, o Groq responde mal, lanza `FalloRevision`.

Un fallo ya no cae al guion fijo. `desdeGuion()` sigue en `lib/revision/armar.ts` y lo usan pruebas; `revisar()` no lo llama. El resultado lleva `origen: "error"`, `codigo` (`sin_clave`, `cupo`, `tiempo`, `proveedor`, `respuesta` o `sin_foto`) y la frase en inglés de `lib/revision/fallo.ts` (por ejemplo `AI review is not configured`). `registrarFallo` escribe en el log `[revision]` el código, el estado y el proveedor, con secretos redactados. La revisión y el informe muestran la etiqueta `AI`, `simulated` o `error` (`etiquetaOrigen` en `lib/admin/vista.ts`). Si el origen es `error`, la frase va en un aviso y aparece **Retry review**.

Sin `LAYA_URL`, después de una descripción válida se usa `stubLaya()` y el origen queda `stub` (etiqueta `simulated`): en trabajo, `parcial` y `stand`; en reembolso, `factura` y `cumplió`. Con `LAYA_URL`, el `POST` va a `{LAYA_URL}/v1/systemone`, modelo `multilingual`, preguntas `choice`, `noul` y `score`. `LAYA_API_KEY`, si existe, va como Bearer. Si Laya no responde o el veredicto no se arma, el origen queda `error`.

El código arma `cumplió`, `parcial` o `insuficiente` (`armarVeredicto`). En pantalla se leen **Met**, **Partial** e **Insufficient**. En un error el veredicto guardado es `insuficiente`, pero no se tocan el monto ni la fecha de la evidencia. En un reembolso, un monto por encima del tope, o sin monto y fecha, baja a `insuficiente`. Si `noul` es falso, no queda `cumplió`. La IA no firma ni mueve dinero. En la revisión real, el organizador paga con **Approve and pay**. **Approve** y **Ask for another photo** solo existen en la vista de ejemplo.

Un origen `error`, o un reembolso sin monto revisado, oculta **Deploy and fund**, **Fund** y **Approve and pay**. El servidor responde 409, `Review pending`. El reintento (`POST` con forzar) solo corre si el veredicto es un error. Si la tarea está `pagado` o ya tiene escrow, responde 409, `This task can no longer be reviewed.` Entre llamadas hay 30 segundos (`reservarRevision`); si no pasó, responde 429, `Wait a moment before reviewing again.` Ese candado es un `Set` del proceso.

### Pendiente por persona

1. **Sebas.** Probar el escrow completo en testnet, con una wallet real de Cavos. La wallet del organizador necesita XLM y USDC de testnet. En la revisión: **Deploy and fund**, después **Approve and pay**, y quedarse con el hash. Ese hash llena `tareas.hash_pago` y habilita **View payment**. Hasta que ese pago exista, el Acta no entra. La trustline de quien cobra ya se puede preparar en la app (PR #50), fuera del demo.
2. **Esteban.** Confirmar que Groq responde de verdad en producción, con `GROQ_API_KEY` y `qwen/qwen3.8-27b`. Cerrar el PR #15 (borrador, `esteban/laya-ajustes`): si `score` trae `probabilities`, el veredicto sale del índice más alto (0 insuficiente, 1 parcial, 2 cumplió). En `main` eso todavía no está. `CAVOS_JWT_AUDIENCE` sigue vacío. En Neon, asignar `organizador_id` a mano en los proyectos reales: la columna del PR #44 nace vacía. La migración no se corre sin el visto bueno de quien es dueño de la base.
3. **Abdiel.** Levantar Laya en su servidor, publicarla con Tailscale Funnel y dejar `LAYA_URL`. Sin esa URL el stub sigue después de Groq. Tiene abierto el borrador #49 (`abdiel/buzon`): un buzón entre IAs, con confirmación humana. No está en `main`.
4. **Josué.** El 30 de septiembre, subir Next.js a 16.3.7 cuando salga el parche. Sigue abierto el borrador #18: no perder el ingreso al volver de Google. Quedan los detalles de UX del escrow de abajo.
5. **Raúl.** Dejar listas las cuatro cuentas del demo (organizador y tres voluntarios) en `/cuentas`. Las pantallas del integrante ya están. El voluntario demo ya puede subir evidencia al proyecto demo.

Quedan estos detalles de la UX del escrow, visibles en el código:

- Si **desplegar** sale bien y **fondear** falla, `firmarPasos` lanza antes de recargar el detalle (`components/admin/Revision.tsx`). La pantalla puede seguir ofreciendo **Deploy and fund** aunque el contrato ya exista. Si el detalle sí se recarga y hay contrato con `fondeado === false`, el botón que queda es **Fund**.
- **Approve and pay** se muestra con la tarea `en revisión`, sin exigir que el escrow esté fondeado (`botonesRevision` en `lib/admin/remoto.ts`). Hay que ocultarlo mientras no haya fondeo. Sí se oculta si el origen es `error` o si el reembolso no tiene monto revisado.
- El saldo se lee de `GET /api/escrow/[contrato]`. El indexador de Trustless no es inmediato: `balance` puede seguir en 0 un momento, y `fondeado` queda `null` si el número no se lee. En la misma sesión, un fondeo exitoso fuerza el estado; al recargar, manda lo que diga el indexador.
- `contratosPreparados` en `lib/api/firma.ts` es un `Map` del proceso. Si el envío cae en otra instancia, o el proceso se reinicia, se pierde el id que el prepare había guardado para cuando Trustless no devuelve el contrato.
