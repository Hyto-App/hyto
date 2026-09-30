# Hyto — contexto para el equipo y para agentes

Leé esto antes de tocar el repo. Está escrito contra el código de `main` en `687dc3d` (29 de septiembre de 2026, 7:46 p.m., hora de Costa Rica). Si un documento más viejo dice otra cosa, manda este archivo y el código.

La app en producción es Next.js en Vercel: https://hyto.vercel.app

## Qué es Hyto

Hyto es control de gastos y pagos por hitos sobre Stellar. El organizador deja el presupuesto en un escrow multi-release de Trustless Work (V2, testnet). Cada tarea es un hito. El voluntario sube una foto. Una IA recomienda si la evidencia alcanzó. El organizador aprueba y el pago sale en USDC de testnet. Al cerrar, el informe compara presupuesto contra gasto y, si ya hay hash, enlaza el pago en Stellar.

El demo es un evento de ZEEK: tres tareas de trabajo de US$20 y un reembolso de comida de hasta US$15. Esos montos viven en la semilla y en el ejemplo local. Organización: [Hyto-App/hyto](https://github.com/Hyto-App/hyto).

Hay dos roles de producto, en la tabla `usuarios.rol`:

- **Organizador.** Crea el proyecto, ve la bandeja (`/`), la revisión (`/revision/[id]`) y el informe (`/informe`). Despliega y fondea el escrow, y aprueba y paga. Quien crea el proyecto queda en `proyectos.organizador_id` (PR #44, Josué Valles). Escrow, revisión y bandeja miran ese dueño. La migración solo agrega la columna: el dueño de un proyecto ya creado se asigna a mano, por correo. La semilla no escribe `organizador_id` en ZEEK. Con el demo prendido aparece el proyecto demo, a nombre de `demo-organizador`. El rol global `organizador` no se asigna en el alta automática.
- **Voluntario.** Ve sus tareas (`/mis-tareas`), sube la evidencia (`/tareas/[id]`) y, en `/cuentas`, prepara la wallet. La cuenta de cobro de la tarea (`wallet_cobro`) la fija el voluntario asignado al subir la foto.

La IA no firma ni mueve dinero. El pago de un hito es el monto completo.

## Stack y arquitectura

| Capa | Dónde está |
|---|---|
| App | Next.js 16.3.6 (App Router), React 19.1.1, TypeScript, Tailwind 4. Corre en Vercel. |
| Pantallas | Admin en `app/(admin)`: `/`, `/proyectos/nuevo`, `/revision/[id]`, `/informe`. Integrante en `app/(integrante)`: `/mis-tareas`, `/tareas/[id]`, `/cuentas`. |
| Marca | Poppins 400, 500 y 600. `--acento` `#B7EE34`, `--sobre-acento` `#08090C`. La fuente de verdad de la UI es el Figma de Abdiel, [Hyto – App](https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy). |
| API | Route Handlers en `app/api`. |
| Datos | Neon Postgres con Drizzle. El esquema declarado está en `lib/db/schema.ts`. Las migraciones son SQL en `drizzle/` (`0000_inicio.sql`, `0001_contrato_escrow.sql`). `npm run db:migrar` las aplica en orden de nombre (`lib/db/aplicar.ts`). |
| Fotos | Vercel Blob, almacén privado (`access: "private"` en `lib/blob/fotos.ts`). En la base se guarda el identificador, no la URL pública. La pantalla recibe `GET /api/evidencias/:id/foto`. |
| Wallet | `@cavos/kit` 0.2.5, Stellar testnet, `appSalt` fijo `hyto` (`lib/integrante/identidades.ts`). |
| Escrow | Trustless Work V2, base `https://beta.api.trustlesswork.com` (`lib/escrow/cuerpos.ts`). Las llamadas salen del servidor con `TRUSTLESS_API_KEY`. El navegador solo firma el XDR. |
| USDC testnet | Emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. |
| IA | Groq, modelo `qwen/qwen3.8-27b`. Laya, si hay `LAYA_URL`, con el veredicto en el índice de `score.probabilities` (PR #59, Josué Valles). El código guarda `cumplió`, `parcial` o `insuficiente`. La UI los muestra en inglés. |

Rutas:

- `POST /api/sesion` y `DELETE /api/sesion` — abrir y cerrar sesión.
- `POST /api/sesion/wallet` — guardar la `G…` de la sesión.
- `GET` y `POST /api/sesion/demo` — modo demo.
- `GET` y `POST /api/tareas`, `POST /api/proyectos`, `GET /api/proyectos`, `GET /api/informe`.
- `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/evidencias/:id/foto`.
- `GET` y `POST /api/revision/:id` — el POST vuelve a revisar.
- `POST /api/firma`, `POST /api/firma/enviar`, `GET /api/escrow/[contrato]`.
- `GET` y `POST /api/usdc` — leer y preparar la trustline de USDC de testnet de la wallet de la sesión. En demo responden 403.

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

La cookie `hyto_sesion` sigue el `exp` del JWT de Cavos, con tope de 24 h (PR #54, Josué Valles). Si el JWT no trae `exp`, la sesión dura 8 h. El demo también dura 8 h. Una sesión vencida responde 401, «Sign in to continue.», y abre el ingreso. **Sign out** borra la sesión del servidor, la de Cavos y la wallet local (PR #52, Josué Valles).

## Modo demo

`HYTO_DEMO_LOGIN=1` enciende el demo (`lib/sesion/demo.ts`). Cualquier otro valor lo apaga y `POST /api/sesion/demo` responde 404.

Con el interruptor en 1, el ingreso muestra **Enter as demo** y un selector de organizador o voluntario. La sesión usa `demo-organizador@hyto.demo` o `demo-voluntario@hyto.demo`, sin billetera. Dentro del demo, los botones son **Switch to organizer** o **Switch to volunteer**, y **Leave demo** (`components/admin/Entrar.tsx`, `components/sesion/SalirDemo.tsx`). Esa sesión no firma: `/api/firma` y `/api/firma/enviar` responden 403, «Demo mode: signatures are off». No crea proyectos: `POST /api/proyectos` responde 403, «Demo mode cannot create projects.» (PR #47, Josué Valles). Puede subir evidencia solo a las tareas del proyecto demo, y la wallet de cobro que mande se ignora (PR #50, Josué Valles).

## Escrow en Stellar testnet

Trustless Work V2, multi-release. Un contrato por tarea. El id queda en `tareas.contrato_escrow` (`drizzle/0001_contrato_escrow.sql`). El hash del pago queda en `tareas.hash_pago`. «Ver pago» arma `https://stellar.expert/explorer/testnet/tx/<hash>`.

Acciones que acepta `POST /api/firma` (`lib/escrow/cuerpos.ts`, `lib/api/firma.ts`): `desplegar`, `fondear`, `marcar`, `aprobar`, `liberar`, `disputar`, `resolver`. La prepara el servidor y devuelve un XDR sin firmar. El cliente lo firma con `wallet.signXdr` de Cavos (`lib/escrow/firmarCliente.ts`) y lo manda a `POST /api/firma/enviar`. El envío a Trustless es `POST /stellar/send-transaction`. Un fee-bump se rechaza: la cuenta que firma paga la comisión en XLM.

`GET /api/escrow/[contrato]` lee el escrow en Trustless. Solo el organizador. El saldo se mira en `balance`.

En la revisión, el organizador ve este orden (`components/admin/Revision.tsx`):

1. **Deploy and fund.** `firmarPasos` corre `desplegar` y después `fondear`. Desplegar arma el contrato con la wallet del organizador, la `wallet_cobro` del voluntario, el monto de la tarea y tres cuentas del servidor (`HYTO_ESCROW_ADMIN`, `HYTO_ESCROW_PLATFORM`, `HYTO_ESCROW_RESOLVER`). Esas tres tienen que ser distintas entre sí y distintas del organizador y de quien cobra. La comisión de plataforma va en 0.
2. **Approve and pay.** Corre `marcar`, `aprobar` y `liberar` (índice 0). Si un paso de esos falla, el botón reanuda desde ese paso.
3. **View payment.** Aparece cuando la tarea queda `pagado` y hay `hash_pago`.

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
| `GROQ_API_KEY` | Groq, para describir la foto. Sin ella, una revisión real queda en `origen` `error`. El guion fijo es la vista de ejemplo. |
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

`main` está en `687dc3d` (29 de septiembre de 2026, 7:46 p.m., hora de Costa Rica). El último cambio de código es el PR #59, de Josué Valles: el veredicto de Laya sale del índice más alto de `score.probabilities`. El PR #58, también de Josué, dejó el Figma de Abdiel como fuente de la UI. Desde el PR #56 la interfaz y los avisos de la API están en inglés; los enums de la base siguen en español y `lib/ui/etiquetas.ts` los traduce al dibujar, sin migración. `<html lang="en">`.

En el repositorio no hay un hash de un pago real en testnet. `CAVOS_JWT_AUDIENCE` sigue vacío: el código no comprueba el `aud`.

Lo que sigue, en este orden: un pago real en testnet, y que Laya responda de verdad. `LAYA_URL` todavía no está. Groq ya no cae en silencio al guion fijo.

### Revisión de la foto

Al subir la foto (`lib/api/evidencias.ts`) y al abrir o forzar la revisión (`GET` y `POST /api/revision/:id`) se llama a `revisar()` (`lib/revision/revisar.ts`).

La foto la describe Groq con el modelo `qwen/qwen3.8-27b` (`lib/revision/scout.ts`). Hace falta `GROQ_API_KEY`. El archivo, la columna `texto_scout` y el `origen` `"scout"` son nombres viejos de Llama 4 Scout; el modelo que se pide es Qwen. El cuerpo manda `temperature: 0`, `max_completion_tokens: 1024` y `reasoning_effort: "none"`. `leerDescripcion` solo acepta un JSON con `texto`. Si no lo encuentra, la revisión falla.

Si falta la foto, falta la clave, Groq no responde, el JSON no se lee o Laya falla, el resultado es `origen: "error"` (`desdeFallo`, PR #45, Josué Valles). Se registra el fallo. La pantalla muestra el mensaje y **Retry review**. Ese resultado no habilita el pago: desplegar, fondear y pagar quedan ocultos, y el servidor responde 409. El reintento solo corre si el veredicto es un error, se niega si la tarea está pagada o ya tiene escrow, y espera 30 s entre llamadas (`ESPERA_REVISION_MS`). En la subida, si hay clave de Groq, la espera de la respuesta sigue en 2,8 s. Si no alcanza, la respuesta sale igual y el veredicto se guarda después.

Sin `LAYA_URL`, y si Groq sí describió la foto, `stubLaya()` responde `score` `parcial` (y `choice` `stand`) en una tarea de trabajo. En un reembolso el stub responde `factura` y `cumplió`. El origen de ese caso es `"stub"`. El guion fijo (`desdeGuion`, origen `"guion"`) queda para la vista de ejemplo.

Con `LAYA_URL`, el `POST` va a `{LAYA_URL}/v1/systemone`, modelo `multilingual`. `LAYA_API_KEY`, si existe, va como Bearer. Desde el PR #59, `score.criteria` es una lista ordenada, en inglés: apenas visible, algo falta, claramente visible. Si la respuesta trae `probabilities`, el veredicto guardado es el índice más alto: 0 `insuficiente`, 1 `parcial`, 2 `cumplió`. Un empate se queda en el índice más bajo. Sin probabilidades se lee un `score` de texto, también `partial` e `insufficient`. El valor guardado sigue en español. El sí o no de Laya (`noul`) solo entra en la frase. No fija el veredicto. En un reembolso, un monto por encima del tope, o sin monto y fecha, baja a `insuficiente`.

La pantalla distingue el origen (`etiquetaOrigen` en `lib/admin/vista.ts`): **AI** si es `scout`, **simulated** si es `guion` o `stub`, **error** si falló. En la revisión real el organizador paga con **Approve and pay**. **Approve** y pedir otra foto solo existen en la vista de ejemplo. La IA no firma ni mueve dinero.

Pendiente de la IA:

- Confirmar que Groq responde de verdad en producción, con `GROQ_API_KEY` y `qwen/qwen3.8-27b`.
- Abdiel publica Laya con Tailscale Funnel y se pone `LAYA_URL`. Sin esa URL el stub sigue respondiendo.
- El PR #15 (borrador, `esteban/laya-ajustes`) quedó reemplazado por el #59. El índice de `probabilities` ya está en `main`. El borrador puede cerrarse.

### Escrow, lo que sigue en la revisión

Cuatro detalles de la UX, visibles en el código:

- Si desplegar sale bien y fondear falla, `firmarPasos` lanza antes de recargar el detalle (`components/admin/Revision.tsx`). La pantalla puede seguir ofreciendo **Deploy and fund** aunque el contrato ya exista.
- **Approve and pay** se muestra con la tarea `en revisión`, sin exigir que el escrow esté fondeado (`botonesRevision` en `lib/admin/remoto.ts`). Hay que ocultarlo mientras no haya fondeo. Sí se oculta si `origen` es `error`, o si un reembolso no tiene monto revisado.
- El saldo se lee de `GET /api/escrow/[contrato]`. El indexador de Trustless no es inmediato: `balance` puede seguir en 0 un momento, y `fondeado` queda `null` si el número no se lee. En la misma sesión, un fondeo exitoso fuerza el estado; al recargar, manda lo que diga el indexador.
- `contratosPreparados` en `lib/api/firma.ts` es un `Map` del proceso. Si el envío cae en otra instancia, o el proceso se reinicia, se pierde el id que el prepare había guardado para cuando Trustless no devuelve el contrato.

### Pendiente por persona

- **Sebas.** Probar el escrow completo en testnet, con una wallet real de Cavos. Hace falta XLM y USDC de testnet. En la revisión: **Deploy and fund**, después **Approve and pay**, y quedarse con el hash. Ese hash llena `tareas.hash_pago` y habilita **View payment**. Hasta que ese pago exista, el Acta no entra.
- **Esteban.** Confirmar Groq en producción. `CAVOS_JWT_AUDIENCE` sigue vacío. Asignar `organizador_id` a mano en los proyectos que no son el demo.
- **Abdiel.** Publicar `LAYA_URL`. El Figma [Hyto – App](https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy), página «Nuevo diseño», ya es la fuente de la UI (PR #58). El borrador #49 (`BUZON.md`) sigue abierto.
- **Josué.** El 30 de septiembre, subir Next.js de 16.3.6 a 16.3.7 cuando salga el parche. El borrador #18 (no perder el ingreso al volver de Google) sigue abierto. Recargar la revisión si fondear falla, y ocultar **Approve and pay** mientras no haya fondeo.
- **Raúl.** Dejar listas las cuatro cuentas del demo.
