# Plan para empezar a codear Hyto

El contrato está en [STACK.md](STACK.md) y [ROLES.md](ROLES.md). Cada quien avanza su lista en orden. No espera a otra persona salvo el único dato marcado como encuentro.

Nadie sube directo a `main`. Todo el trabajo se hace en la nube (agentes de Cursor Cloud o Claude Code en la web). Cada entrega va en una rama `nombre/tarea` y entra por pull request. Ejemplos: `sebas/escrow`, `esteban/neon-blob`, `abdiel/pantallas`, `josue/admin`, `raul/cuentas`. Cuando esa parte se mergea, la siguiente tarea abre otra rama desde `main` actualizado:

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b nombre/tarea
```

No se reutiliza la misma rama para todo el proyecto.

El demo a mostrar sigue siendo el de ZEEK: 3 tareas de trabajo, 1 reembolso, un hito sin foto, y el informe.

## Qué puede hacerse solo

- **Sebas** ya dejó en `main` el módulo de firma y el script del hito (PR #8). No necesita la app, Neon ni las pantallas. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel y es el correcto. Los orígenes permitidos de Cavos también. `TRUSTLESS_API_KEY` tiene nombre y se queda en el servidor; sin esa clave el script no paga. En el repositorio no hay hash de un pago en USDC, así que el Acta sigue sin hacerse.
- **Esteban** es dueño de todo el backend: `/api/tareas`, `/api/evidencias`, Neon Postgres (tabla de usuarios, email → rol, migraciones y seed) y el login real de Cavos contra esa base. No necesita el escrow ni Laya encendida. La revisión usa un stub de Laya y el guion fijo hasta que exista `LAYA_URL`. Las pantallas de Raúl ya llaman sus rutas y caen al ejemplo si no responden.
- **Abdiel** no necesita el escrow ni las rutas. La marca ya está en `main` (PR #7): Poppins y `--acento` `#B7EE34`. Sigue Laya en su servidor. `LAYA_URL` todavía no está.
- **Josué** ya dejó el esqueleto y las pantallas del admin en `main` (PR #3). No recreó el proyecto: usa la base del PR #1. Los datos son el ejemplo de ZEEK. Fondear y Aprobar no firman: el módulo de Sebas ya está y esos botones todavía no lo llaman. El `appId` ya está. Entrar falla por el token de login: lo toma Esteban.
- **Raúl** ya dejó Mis tareas, Subir evidencia y `/cuentas` en `main` (PR #1). El `appId` ya está. El login real contra Neon es de Esteban.

## Sebas, en este orden

1. Hecho: la app de Cavos existe. `NEXT_PUBLIC_CAVOS_APP_ID` está en Vercel y es el correcto. Los orígenes permitidos también. Entrar igual no entra: el token de login es de Esteban (su paso 6).
2. Hecho en el script del PR #8, no como pago registrado: `npm run hito` crea cinco cuentas de prueba (organizador, receptor, admin, plataforma y resolutor) y abre la trustline de USDC al emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. Pide USDC de testnet al grifo de Circle (`destinationAddress`). Si Circle lo rechaza, indica la cuenta del organizador y `https://faucet.circle.com/` para fondear a mano. Las cuentas locales quedan en `.sebas-cuentas.json`, fuera de git.
3. Hecho en el mismo script, cuando hay `TRUSTLESS_API_KEY`: despliega un multi-release en `https://beta.api.trustlesswork.com`. La cuenta admin es otra dirección. El organizador está en aprobadores y en firmantes de liberación. Un hito, con monto y receptor. La clave no va al navegador.
4. El script fondea, marca el hito y libera. En v2, aprobar es `approve-and-release` (una firma). El envío es `POST /stellar/send-transaction`. Si rechaza el fee-bump, la cuenta se fondea con Friendbot y se reintenta. Un SUCCESS sin hash no se toma como fallo: el script saca el hash del XDR firmado. Hoy ese pago no está en el repositorio.
5. Si el beta no libera el hito, el mismo script cambia la base a `https://dev.api.trustlesswork.com` y repite. En v1 el operador marca el estado y el receptor solo cobra. La app no se reescribe.
6. Hecho en el PR #8: `lib/escrow` recibe la acción (fondear, marcar, aprobar y liberar) y devuelve el XDR, y acepta el XDR firmado y lo envía. Josué lo llama por `POST /api/firma` y `POST /api/firma/enviar`. La ruta HTTP rechaza `liberar`, porque en v2 aprobar ya libera. Para v1, el script llama al módulo directo.
7. Acta, al final de su lista y solo si el paso 4 ya pagó. Una credencial, clave de servidor de [dapp.acta.build](https://dapp.acta.build). Si no hay pago, no se hace. Sigue pendiente.

## Esteban, en este orden

1. Neon y Blob privado. `DATABASE_URL` y `BLOB_READ_WRITE_TOKEN`. Tabla de usuarios: el email mapea al rol. Migraciones y seed.
2. Tablas: proyecto, tarea (trabajo o reembolso, monto, tope, condición, wallet de cobro), evidencia (id de Blob), veredicto y hash de pago (campo vacío hasta que Sebas lo tenga). Usuarios, aparte: email y rol.
3. Rutas que las pantallas ya llaman. El contrato está más abajo. Mientras no respondan, la UI sigue con el ejemplo de ZEEK.
4. Ruta de revisión. Lee la foto en Blob. Groq `meta-llama/llama-4-scout-17b-16e-instruct` en `https://api.groq.com/openai/v1` describe la foto. Si es reembolso, saca monto y fecha y el código compara el tope. Llama a `LAYA_URL` si existe. Si no, un stub devuelve `choice`, `noul` y `score`. El código arma `cumplió`, `parcial` o `insuficiente`. Sin `GROQ_API_KEY` o si Groq falla, guion fijo. La justificación es el texto de Scout más las tres respuestas.
5. Ruta del informe leyendo esas tablas. El enlace "Ver pago" usa el hash cuando exista; si no, el informe igual se abre.
6. Pendiente, 2026-09-28. Login real de Cavos, conectado a Neon. En https://hyto.vercel.app, Entrar falla con `registry lookup skipped: no login token`. `components/admin/Entrar.tsx` y `lib/integrante/preparar.ts` llaman `Cavos.connect` con `vault: true` y una `identity` fija de `lib/integrante/identidades.ts`, sin `auth`. `@cavos/kit` 0.2.5 exige un token de un login real (CavosAuth: email con `sendOtp` y `verifyOtp`, o Google con `handleCallback`). Arreglo: entrar con CavosAuth, pasar `auth` a `Cavos.connect` y, en el servidor, buscar el rol por email en Neon. Los orígenes permitidos de Cavos ya están. `NEXT_PUBLIC_CAVOS_APP_ID` en Vercel es el correcto. Alternativa solo para el demo, sin probar: `vault: false` y `InMemoryWalletRegistry`.

## Contrato que ya esperan las pantallas

Cliente en `lib/integrante/rutas.ts`. Timeout de 4 segundos. Si falla la red, el estado o el JSON, Mis tareas y Subir evidencia vuelven al ejemplo y lo dicen en pantalla.

`GET /api/tareas?miembro=<id>&wallet=<opcional>`

- `Content-Type` con `json`.
- Cuerpo: un arreglo de tareas, o `{ "tareas": [ ... ] }`.
- Cada tarea necesita `id`, `titulo` y `tipo` (`trabajo` o `reembolso`).
- `estado`: `pendiente`, `en revisión` o `pagado`. Si falta, queda `pendiente`.
- También se leen `proyectoId`, `monto`, `tope`, `condicion`, `miembroId` y `walletCobro`. Montos y tope van como texto.
- La pantalla filtra por `wallet` si alguna tarea coincide; si no, por `miembro`. Si ninguna trae `miembroId` ni `walletCobro`, muestra todas.

`POST /api/evidencias`

- `multipart/form-data`: `tareaId`, archivo `foto` (nombre `evidencia.jpg`) y, si existen, `miembroId` y `wallet`.
- Respuesta JSON: la evidencia, o `{ "evidencia": { ... } }`, con `id`.
- Se leen `tareaId`, `blobId`, `monto` y `fecha`. En un reembolso, monto y fecha solo se muestran si vienen los dos.

`GET /api/evidencias/:id`

- Misma forma que la respuesta del POST. Si este GET falla y el POST sí respondió, se usa lo que devolvió el POST.

El ejemplo local (no hace falta devolverlo) son las tareas `stand`, `registro` y `bienvenida` (US$20, trabajo) y `comida` (reembolso, tope US$15), proyecto `zeek`.

## Contrato del módulo de firma

Ya está en `main` (PR #8). La clave `TRUSTLESS_API_KEY` no sale del servidor. Hay un tope de 30 pedidos por minuto por cliente.

`POST /api/firma`

- JSON: `accion` (`fondear`, `marcar` o `aprobar`), `contrato` (`C…`) y `firmante` (`G…`).
- Fondear también pide `monto`, mayor que cero.
- Marcar también pide `indice` (0 es el primer hito) y `estado`. `evidencia` es opcional y no pasa de 500 caracteres.
- `liberar` responde 400: en v2, aprobar ya libera el hito.
- Respuesta: `xdr`, `hashPreparado` y `contrato`.

`POST /api/firma/enviar`

- JSON: `xdr` firmado.
- Respuesta: `hash`, `ledger`, `codigo`, `contrato` y `estado`. Un SUCCESS sin hash no es un fallo. El hash puede venir vacío; el script de prueba lo calcula del XDR firmado.

Josué firma en el navegador con `signXdr` y no ve la clave. Los botones Fondear y Aprobar todavía no hacen esta llamada.

## Abdiel, en este orden

1. Hecho en el PR #7: Poppins 400, 500 y 600, fondo claro, un botón principal por pantalla. Las seis pantallas (inicio del admin, crear proyecto, Mis tareas, subir evidencia, revisión e informe) ya están en la app. Sin las palabras escrow, XDR, trustline ni Soroban.
2. Hecho en el mismo PR: `--acento` es `#B7EE34`. `--sobre-acento` (`#08090C`) es el texto del botón primario sobre esa lima.
3. Laya en el servidor de escritorio de Abdiel (Ryzen 5 5600, 32 GB), el mismo donde corre Argus, pero en un entorno de Python aparte y en un puerto propio. Se instala `laya[serve]` con el checkpoint `laya-multilingual`. La URL pública sale de Tailscale Funnel (`https://…ts.net`), sin pagar dominio ni servidor, y va en `LAYA_URL`. `localhost` no sirve para Vercel. Esa máquina queda encendida en el ensayo del 3 de octubre. Falta verificar el comando del servidor y si la respuesta ya trae `choice`, `noul` y `score`.

## Josué, en este orden

1. La base Next.js 16.3.6, TypeScript, Tailwind y App Router ya está en `main` (PR #1). No la recrees. El 30 de septiembre, subir a 16.3.7.
2. Hecho en el PR #3: layout del admin y las pantallas con datos fijos de ZEEK. `/` es la bandeja. El acento es el lima del PR #7.
3. El botón Entrar ya está (`network: "testnet"`, `appSalt` fijo `hyto`). El `appId` ya está en Vercel. Hoy falla con `registry lookup skipped: no login token`. El login real lo hace Esteban (su paso 6).
4. Cambiar los datos fijos por las rutas de Esteban. Sigue pendiente.
5. Fondear y Aprobar tienen que llamar al módulo de Sebas, ya en `main` (PR #8): `POST /api/firma` arma el XDR, el navegador lo firma con `signXdr` y `POST /api/firma/enviar` lo manda. Una firma en Aprobar. Hoy esos botones solo guardan el ejemplo en el navegador.
6. Hecho en el PR #3: informe imprimible. Presupuesto contra gasto, detalle por persona, "Ver pago", y la credencial de Acta solo si el enlace existe.

El esqueleto y el admin ya están en `main`. Lo que sigue espera las rutas de Esteban. El módulo de firma de Sebas ya está; falta conectarlo a Fondear y Aprobar.

## Raúl, en este orden

1. Hecho en el PR #1: Mis tareas (monto y estado) y Subir evidencia (cámara y enviar). Trabajo y reembolso son la misma pantalla. En el reembolso, monto y fecha se muestran cuando la revisión los trae.
2. Esas pantallas ya llaman las rutas de arriba. Mientras no respondan, usan el ejemplo de ZEEK.
3. Con el `appId`, ya en Vercel, cuatro identidades en `/cuentas`: organizador y tres voluntarios. Cada una muestra `G…` y trustline de USDC. Sebas solo confirma que cobran. El `Cavos.connect` sin `auth` es el problema conocido de Esteban (su paso 6).

## Lo único que hay que pasar de una persona a otra

- El `appId` ya está en Vercel. Esteban conecta el login real a Neon. Raúl crea las cuatro cuentas del demo.
- Esteban publica las rutas. Josué y Raúl dejan los datos de ejemplo.
- El módulo de firma ya está en `main` (PR #8). Josué lo conecta a Fondear y Aprobar. El `appId` ya está. Cuando el script deje un pago, Sebas pasa el hash para el informe.
- Abdiel publica `LAYA_URL`. Esteban cambia el stub por esa URL. La URL sale de Tailscale Funnel.
- El hash que guarda Sebas llena el campo que Esteban ya dejó en el informe.

## Bitácora

### 2026-09-28

PR #1 de Raúl mergeado en `main` (squash `3a000e0`). Entró la base de Next.js 16.3.6 y las pantallas del integrante: Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas`. Los datos en pantalla son el ejemplo de ZEEK hasta que existan `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id`. `NEXT_PUBLIC_CAVOS_APP_ID` no está. En ese momento `--acento` seguía provisional (`#1c1c1c`). No hay ESLint ni script `lint`. En ese PR, `npm ci`, `npm test` y `npm run build` pasan. Siguen pendientes Neon, Blob, el escrow, el Acta y Laya.

PR #3 de Josué mergeado en `main` (squash `b2451a6`), el 28 de septiembre cerca de las 7:42 a.m., hora de Costa Rica. Entraron las pantallas del admin con el ejemplo de ZEEK, sin recrear el proyecto: crear proyecto, bandeja de evidencias, revisión y aprobar, e informe imprimible. `/` es la bandeja (presupuesto, pagado, pendiente y lo que falta aprobar). En la revisión, Pedir otra foto es un enlace. El informe muestra presupuesto contra gasto y el detalle por persona. "Ver pago" y la credencial solo se dibujan si el enlace existe; en el ejemplo no existen. Entrar usa Cavos con `network: "testnet"` y `appSalt` `hyto` únicamente cuando `NEXT_PUBLIC_CAVOS_APP_ID` tiene valor. Fondear y Aprobar no firman en Stellar. El esqueleto y el admin de Josué quedan hechos. Siguen pendientes Esteban (base de datos, rutas `/api` y la revisión con IA) y Sebas (el `appId` de Cavos, el escrow y la firma). Next.js se queda en 16.3.6; el parche 16.3.7 es el 30 de septiembre. Queda un detalle menor de auditoría: en `components/admin/Entrar.tsx:46`, `setDireccion` solo debe llamarse cuando `guardado.aviso` es null, para que se pueda reintentar el guardado.

PR #7 de Abdiel Cole mergeado en `main` (squash `cff4512`), el 28 de septiembre a las 2:58 p.m., hora de Costa Rica. Lo empujó Josué Valles. La app deja Inter y usa Poppins 400, 500 y 600 vía `next/font`. `--acento` pasa de `#1c1c1c` a `#B7EE34`. `--sobre-acento` (`#08090C`) es el texto de los botones primarios (Entrar, Imprimir y el botón del integrante). En el mismo PR, Josué Valles dejó legibles el hover, el foco y el estado deshabilitado sobre esa lima. No cambió la lógica de Esteban ni de Sebas. Sigue pendiente `LAYA_URL`. El detalle de `setDireccion` en Entrar sigue pendiente de Josué.

PR #4 mergeado en `main` (squash `bc94a9c`), el 28 de septiembre a las 3:47 p.m., hora de Costa Rica. Es la auditoría de las pantallas del integrante. La abrió la automatización de Cursor y Josué Valles figura como coautor. Una evidencia de ejemplo ya no abre la tarea de otra persona. Al cambiar de integrante no queda el botón de la lista anterior. Un monto vacío no se ve como US$0. Una fecha de calendario, o la medianoche UTC, no corre el día en Costa Rica; si esa fecha no existe, se muestra el texto original. Si la cuenta patrocinada nace con 0 XLM y sí quedó creada, se abre la trustline de USDC. Horizon corta a los 4 segundos. La cámara se apaga al salir, un doble clic no reenvía y un archivo que no es imagen no pasa. No tocó el admin, el escrow ni la marca.

PR #8 de Sebastián Ceciliano Piedra (Sebas) mergeado en `main` (squash `ae10a9e`), el 28 de septiembre a las 3:48 p.m., hora de Costa Rica. Lo empujó Josué Valles. Entró el módulo de firma (`lib/escrow`) y el script `npm run hito`. Prepara el XDR de fondear, marcar y aprobar y liberar, y envía el XDR firmado. `POST /api/firma` y `POST /api/firma/enviar` leen `TRUSTLESS_API_KEY` en el servidor. Si Circle no entrega USDC, el script avisa la cuenta y el enlace del grifo. En el repositorio no hay `lib/escrow/pago-prueba.json`: sin un pago en USDC no hay Acta. En ese momento `NEXT_PUBLIC_CAVOS_APP_ID` seguía sin publicarse. Fondear y Aprobar del admin no llaman estas rutas. Josué las conecta. Siguen pendientes Esteban (todo el backend) y Abdiel (`LAYA_URL`).

El mismo 28, Entrar en https://hyto.vercel.app falla con `registry lookup skipped: no login token`. El diagnóstico y el arreglo están en el paso 6 de Esteban. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel y es el correcto. Los orígenes permitidos de Cavos también. Esteban toma todo el backend: `/api/tareas`, `/api/evidencias`, Neon (usuarios, email → rol, migraciones y seed) y el login real de Cavos contra la base.

Laya se va a alojar en el servidor de Abdiel y se publica con Tailscale Funnel en lugar de pagar una URL. Todavía no está instalado. Esteban sigue con el stub hasta que Abdiel publique `LAYA_URL`. La URL de Funnel es pública, así que conviene que la ruta de revisión mande una clave compartida (pendiente de acordar con Esteban).
