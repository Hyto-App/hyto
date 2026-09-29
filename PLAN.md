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
- **Esteban** es dueño de todo el backend. En `main` ya están `/api/tareas`, `/api/evidencias`, Neon, el ingreso con CavosAuth y la revisión. No necesita el escrow. Sin `LAYA_URL` la revisión usa el stub. Sin `GROQ_API_KEY`, o si Groq falla, usa el guion fijo. El modelo es `qwen/qwen3.8-27b`. Las pantallas de Raúl llaman sus rutas y caen al ejemplo si no responden a tiempo.
- **Abdiel** es dueño de toda la estética, la UX, la UI y el frontend. Abdiel tiene libertad completa de creatividad y edición sobre la UI/UX y el frontend. Puede reorganizar, rediseñar y mover cualquier elemento visual a su criterio. La app de hoy es un demo funcional. Su trabajo es dejarla como producto, encima del flujo que ya existe. Su Figma es la fuente de verdad de UX y UI. La marca ya está en `main` (PR #7): Poppins y `--acento` `#B7EE34`. Sigue Laya en su servidor. `LAYA_URL` todavía no está. La etiqueta de rol, la vista en vivo y la IA según el rol están pendientes de otros. Las diseña. No las da por hechas.
- **Josué** ya dejó el esqueleto y las pantallas del admin en `main` (PR #3). No recreó el proyecto: usa la base del PR #1. Esas pantallas siguen en el ejemplo de ZEEK, en `localStorage`. Fondear y Aprobar no firman: el módulo de Sebas ya está y esos botones todavía no lo llaman. El `appId` ya está. Entrar ya usa CavosAuth en el código. Lo que falta es cablear el admin a la API.
- **Raúl** ya dejó Mis tareas, Subir evidencia y `/cuentas` en `main` (PR #1). El `appId` ya está. El login contra Neon es de Esteban. Lo visual de esas pantallas lo define Abdiel. Raúl confirma el resto de su alcance.

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
4. Hecho en el código: ruta de revisión. Lee la foto en Blob. Groq `qwen/qwen3.8-27b` en `https://api.groq.com/openai/v1` describe la foto. No llama a Llama 4 Scout. Si es reembolso, saca monto y fecha y el código compara el tope. Llama a `LAYA_URL` si existe. Si no, un stub devuelve `choice`, `noul` y `score`. Sin esa URL, un trabajo queda en `parcial`. Un reembolso queda en `cumplió` solo si llegaron monto y fecha dentro del tope. Sin `GROQ_API_KEY` o si Groq falla, guion fijo (en el reembolso, US$12.40 y 2026-09-27). La frase junta el texto de Qwen y las tres respuestas. La columna se llama `texto_scout`. El veredicto se guarda. La pantalla del admin no lo lee. El fallo no se registra.
5. Ruta del informe leyendo esas tablas. El enlace "Ver pago" usa el hash cuando exista; si no, el informe igual se abre.
6. Hecho en el código del PR #14: Entrar y Preparar cuentas usan CavosAuth (`sendOtp`, `verifyOtp` o Google) y pasan `auth` a `Cavos.connect`. El servidor busca el rol por correo en Neon. Sigue pendiente: los correos de la semilla son `@demo.hyto` y no reciben el código, y `correoDelToken` decodifica el JWT sin verificar la firma. Los orígenes permitidos de Cavos ya están. `NEXT_PUBLIC_CAVOS_APP_ID` en Vercel es el correcto.

### Pruebas de punta a punta (2026-09-28)

Esta tabla es del commit `ade63ce`, el 28 de septiembre. No describe `main` al 29 (`ce9ff7c`). El estado de hoy está en [README.md](README.md), en «Qué hace el flujo hoy».

`main` en `ade63ce`. `npm ci`, `npm test` y `npm run build`. Después `npm run dev` en local, sin `.env`, y el sitio https://hyto.vercel.app en el navegador. No se envió ninguna transacción y no se usaron secretos. Los cuerpos de `/api/firma` y `/api/firma/enviar` fueron de ejemplo.

`npm test`: 42 pruebas, 42 ok, 0 fallos. `npm run build`: Next.js 16.3.6, compila, TypeScript pasa, 9 páginas. Rutas: `/`, `/informe`, `/mis-tareas`, `/cuentas`, `/proyectos/nuevo`, `/revision/[id]`, `/tareas/[id]`, `POST /api/firma`, `POST /api/firma/enviar`. No hay script `lint`. En `app/api` no están `/api/tareas` ni `/api/evidencias`.

| Flujo | Resultado | Nota |
| --- | --- | --- |
| Bandeja `/` | solo ejemplo | ZEEK. Presupuesto US$75, pagado US$0, pendiente US$75. "Vista de ejemplo, hasta que las rutas respondan." Igual en local y en el sitio. |
| Crear proyecto y Fondear | solo ejemplo | Vacío: "Escribe el nombre y al menos una tarea con monto." Con datos, el navegador guarda el proyecto (local "Prueba E2E", US$10; sitio "Prueba E2E live", US$5), dice "Nada por aprobar" y sigue el aviso de ejemplo. No llama a `/api/firma`. |
| Revisión y Aprobar | solo ejemplo | `/revision/stand` y `/revision/comida`: "Evidencia de ejemplo". Aprobar deja "Pagado US$20" y "Pagado US$12.40", y "Vista de ejemplo, hasta que el pago esté conectado." Sin "Ver pago". No llama a `/api/firma`. |
| Pedir otra foto | solo ejemplo | En `/revision/registro` (parcial) el botón está. Al pulsarlo desaparecen Aprobar y Pedir otra foto. La pastilla sigue en "parcial". Sin red. |
| Informe `/informe` | solo ejemplo | Presupuesto contra gasto y detalle por persona. Sin "Ver pago" ni credencial. En local, Imprimir abrió el diálogo del navegador (2 páginas, Save as PDF) y se canceló. |
| Mis tareas `/mis-tareas` | solo ejemplo | `GET /api/tareas?miembro=…` es 404 en local y en el sitio. Vuelve ZEEK: voluntario 1, stand y comida; voluntario 2, registro; voluntario 3, bienvenida. |
| Subir evidencia | solo ejemplo | Cámara: "No se pudo abrir la cámara." Con un PNG, "Evidencia enviada" y el aviso de ejemplo. `POST /api/evidencias` es 404. En `comida`, el ejemplo muestra después Monto US$12.40 y Fecha 27 sept 2026. |
| `/cuentas`, Preparar cuentas | falla | Local: "Las cuentas esperan el identificador de Cavos." Sitio: las cuatro quedan sin dirección, USDC pendiente, y "registry lookup skipped: no login token". |
| Entrar | falla | Local: "El ingreso espera el identificador de Cavos." Sitio: "registry lookup skipped: no login token". El botón sigue diciendo Entrar. |
| `POST /api/firma` | falla | Fondear de ejemplo, contrato `C…` y firmante `G…`, monto 1. Local 503: "Falta la clave de Trustless Work en el servidor." Sitio 401: "Invalid API key", código `AUTH_INVALID_CREDENTIAL`. `liberar` responde 400 en los dos: "En v2 aprobar ya libera el hito." |
| `POST /api/firma/enviar` | falla | Cuerpo `{"xdr":"AAAA-ejemplo-no-firmado"}`. Local 503, la misma frase de la clave. Sitio 401, "Invalid API key". No hubo hash. |
| `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id` | falla | 404 en local y en el sitio. En el dev, el POST dice "Server action not found." En el sitio el 404 es HTML. |

Depende de su backend: `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id`, Neon (proyecto, tarea, evidencia, veredicto, usuarios y email → rol) y el login real de Cavos contra esa base. Hoy Entrar y Preparar cuentas no pasan de `Cavos.connect` sin token. La revisión en pantalla es el guion fijo de ZEEK; no hay ruta de revisión ni de informe leyendo tablas. Fondear y Aprobar tampoco firman.

### Errores verificados, para corregir

Auditoría de `main` (`ade63ce`) más el recorrido de arriba. Cada número es algo visto ese día. En el repositorio no hay secretos. Al 29 de septiembre (`ce9ff7c`) ya están las rutas, CavosAuth y la sesión del organizador en `POST /api/firma` y `POST /api/firma/enviar`. Siguen abiertos el 401 de Trustless Work, el admin en `localStorage`, Fondear y Aprobar sin firma, y el resto de la lista que el código no haya cerrado.

1. **Alta.** `lib/integrante/rutas.ts:122`, `:149` y `:155`. No existen `app/api/tareas` ni `app/api/evidencias`. `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id` responden 404 en local y en https://hyto.vercel.app. Mis tareas y Subir evidencia caen al ejemplo de ZEEK. Arreglo: esas tres rutas, con el contrato de más abajo, Neon y Blob.
2. **Alta.** `components/admin/Entrar.tsx:31` y `lib/integrante/preparar.ts:27`. `Cavos.connect` usa `vault: true` y una identity fija, sin `auth`. En el sitio, Entrar y las cuatro filas de Preparar cuentas muestran `registry lookup skipped: no login token`. Arreglo: login real de CavosAuth, pasar `auth` a `connect` y leer el rol por email en Neon.
3. **Alta.** `app/api/firma/route.ts:5` y `app/api/firma/enviar/route.ts:4`. Las dos POST aceptan el cuerpo sin sesión. Un pedido sin cookie llega al módulo. Arreglo: exigir la sesión del punto 2 antes de preparar o enviar.
4. **Alta.** `lib/escrow/modulo.ts:41`. En el sitio, fondear de ejemplo y un XDR de ejemplo no firmado responden 401 `Invalid API key`, código `AUTH_INVALID_CREDENTIAL`. No hubo XDR ni hash. En local, sin la variable, es 503 `Falta la clave de Trustless Work en el servidor.` Arreglo: una clave que Trustless Work acepte, solo en el servidor.
5. **Alta.** `components/admin/CrearProyecto.tsx:33`. Fondear guarda el proyecto en el navegador y no llama a `POST /api/firma`. Arreglo: pedir el XDR, firmarlo en el navegador y mandarlo a `POST /api/firma/enviar`.
6. **Alta.** `components/admin/Revision.tsx:22`. Aprobar solo escribe `pagado` en el navegador. En la prueba se vio "Pagado US$20" y "Vista de ejemplo, hasta que el pago esté conectado." Arreglo: la misma cadena de firma, una sola firma.
7. **Alta.** `components/admin/Bandeja.tsx:16`, `components/admin/Informe.tsx:14`, `components/admin/Revision.tsx:17` y `lib/admin/vista.ts:150`. Esas pantallas leen `localStorage` y `ejemplo` está fijo en `true`. Con las rutas nuevas, la bandeja, la revisión y el informe seguirían en el ejemplo. Arreglo: leer proyecto, evidencia e informe desde la API, y usar el ejemplo solo si la ruta falla.
8. **Alta.** `lib/admin/memoria.ts:4` y `lib/integrante/almacen.ts:3`. Son dos almacenes. Tras aprobar stand y comida, el informe local mostró pagado US$32.40 y Mis tareas siguió en pendiente. Arreglo: una fuente en Neon, leída por las dos pantallas.
9. **Media.** `lib/escrow/limite.ts:6` y `:23`. El tope de 30 cuenta el primer `X-Forwarded-For` en un `Map` del proceso. En local, la IP `203.0.113.10` recibió 429 en el pedido 31 y otra IP siguió en 503. Arreglo: la IP que asigna Vercel, en un contador compartido.
10. **Media.** `lib/escrow/limite.ts:34`. El tope de 200000 bytes mira `Content-Length`. Un POST fragmentado de unos 210000 bytes, sin ese encabezado, respondió 400 de validación, no 413. Arreglo: medir el cuerpo leído y rechazarlo si pasa el tope.
11. **Media.** `app/api/firma/enviar/route.ts:13`. El XDR `AAAA-ejemplo-no-firmado` no se rechaza por forma: local 503, sitio 401. Arreglo: parsearlo con el SDK de Stellar y devolver 400 si no es una transacción firmada, antes de Trustless Work.
12. **Media.** `lib/escrow/modulo.ts:60`. El detalle de Trustless Work sale al cliente. El 401 del sitio llegó como `Invalid API key`. Arreglo: en 401 o 403, un aviso fijo, sin copiar ese detalle.
13. **Media.** `lib/admin/vista.ts:77` y `components/admin/Revision.tsx:81`. Pedir otra foto solo pone el estado en `pendiente`. La pastilla sigue el veredicto. En `/revision/registro` se vio "parcial" después del clic, y desaparecieron Aprobar y Pedir otra foto. Arreglo: limpiar el veredicto y mostrar el estado.
14. **Media.** `components/admin/Entrar.tsx:46`. `setDireccion` corre aunque el guardado avise un fallo. El botón desaparece y no deja reintentar. Arreglo: `setDireccion` solo cuando `guardado.aviso` es null.
15. **Baja.** `lib/escrow/cuerpos.ts:231`. Cuenta y contrato se aceptan con una expresión regular, sin checksum. `C` y 55 `A` pasó esa regla y la ruta respondió 503, no 400. Arreglo: validar con `StrKey` del SDK.
16. **Baja.** `lib/integrante/almacen.ts:42`. `setItem` no tiene `try`. Si el navegador rechaza el guardado, `components/integrante/SubirEvidencia.tsx:171` lo muestra como "No se pudo enviar. Intenta otra vez." El admin, en `lib/admin/memoria.ts:62`, avisa "No se pudo guardar en este navegador." Arreglo: el mismo `try` y ese aviso.

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

Abdiel tiene libertad completa de creatividad y edición sobre la UI/UX y el frontend. Puede reorganizar, rediseñar y mover cualquier elemento visual a su criterio. Su Figma es la fuente de verdad de UX y UI. La app de hoy es un demo funcional. El trabajo es pulirla hasta que se vea como producto, encima del flujo. La etiqueta de rol, la sincronía y la IA según el rol las hacen Josué, Raúl y Esteban. Abdiel las diseña. No asume que ya funcionan.

1. Hecho en el PR #7: Poppins 400, 500 y 600, fondo claro, un botón principal por pantalla. Las seis pantallas (inicio del admin, crear proyecto, Mis tareas, subir evidencia, revisión e informe) ya están en la app. Sin las palabras escrow, XDR, trustline ni Soroban.
2. Hecho en el mismo PR: `--acento` es `#B7EE34`. `--sobre-acento` (`#08090C`) es el texto del botón primario sobre esa lima.
3. Empieza por el Figma y por las pantallas que ya están. El encabezado de hoy dice solo "Hyto". En Mis tareas el voluntario se elige con botones.
4. Laya en el servidor de escritorio de Abdiel (Ryzen 5 5600, 32 GB), el mismo donde corre Argus, pero en un entorno de Python aparte y en un puerto propio. Se instala `laya[serve]` con el checkpoint `laya-multilingual`. La URL pública sale de Tailscale Funnel (`https://…ts.net`), sin pagar dominio ni servidor, y va en `LAYA_URL`. `localhost` no sirve para Vercel. Esa máquina queda encendida en el ensayo del 3 de octubre. Falta verificar el comando del servidor y si la respuesta ya trae `choice`, `noul` y `score`. `LAYA_URL` sigue pendiente.

## Josué, en este orden

1. La base Next.js 16.3.6, TypeScript, Tailwind y App Router ya está en `main` (PR #1). No la recrees. El 30 de septiembre, subir a 16.3.7.
2. Hecho en el PR #3: layout del admin y las pantallas con datos fijos de ZEEK. `/` es la bandeja. El acento es el lima del PR #7.
3. El botón Entrar ya está (`network: "testnet"`, `appSalt` fijo `hyto`). El `appId` ya está en Vercel. En el código, Entrar ya pasa por CavosAuth. El rol no se muestra.
4. Empieza por cablear la bandeja, la revisión y el informe a `GET /api/informe` y `GET /api/revision/:id`. Hoy leen `localStorage` y `ejemplo` queda en `true`. El ejemplo solo si la ruta falla.
5. En el encabezado, la etiqueta "Organizador". Una consulta repetida para ver la evidencia nueva. No hay websocket ni SSE.
6. Fondear y Aprobar tienen que llamar al módulo de Sebas, ya en `main` (PR #8): `POST /api/firma` arma el XDR, el navegador lo firma con `signXdr` y `POST /api/firma/enviar` lo manda. Una firma en Aprobar. Hoy esos botones solo guardan el ejemplo en el navegador.
7. Hecho en el PR #3: informe imprimible. Presupuesto contra gasto, detalle por persona, "Ver pago", y la credencial de Acta solo si el enlace existe.

El esqueleto y el admin ya están en `main`. Las rutas de Esteban ya están. Falta que la bandeja las lea. El módulo de firma de Sebas ya está. Falta conectarlo a Fondear y Aprobar.

## Raúl, en este orden

Raúl confirma su alcance con el equipo: lo que no es la billetera, el backend ni la IA, y lo que no es el frontend de Abdiel. Lo visual de Mis tareas y de Subir evidencia lo define Abdiel. El Figma de Abdiel manda en la interfaz.

1. Hecho en el PR #1: Mis tareas (monto y estado) y Subir evidencia (cámara y enviar). Trabajo y reembolso son la misma pantalla. En el reembolso, monto y fecha se muestran cuando la respuesta trae los dos. El veredicto (cumplió, parcial o insuficiente) no se muestra.
2. Esas pantallas ya llaman las rutas. Si fallan, o si pasan de 4 segundos, usan el ejemplo de ZEEK. El voluntario se elige con botones, no con la sesión.
3. Empieza por tres cosas del flujo, sin rediseñar: leer el voluntario de la sesión, mandar la wallet de esa persona al subir, y mostrar el veredicto que ya quedó guardado. El corte de 4 segundos lo ve junto con Esteban.
4. Con el `appId`, ya en Vercel, cuatro identidades en `/cuentas`: organizador y tres voluntarios. Cada una muestra `G…` y trustline de USDC. Sebas solo confirma que cobran. El ingreso con CavosAuth ya está en el código. Los correos `@demo.hyto` no reciben el código: eso lo cierra Esteban.

## Lo único que hay que pasar de una persona a otra

- El `appId` ya está en Vercel. El ingreso con CavosAuth ya está en el código. Esteban cambia los correos de la semilla por correos que reciban el código, y verifica la firma del token. Raúl deja las cuatro cuentas cuando esos correos existan.
- Las rutas ya están. Josué deja el ejemplo del admin cuando la bandeja lea la API. Raúl deja el ejemplo del voluntario cuando la sesión fije a la persona.
- El módulo de firma ya está en `main` (PR #8). Josué lo conecta a Fondear y Aprobar. Cuando el script deje un pago, Sebas pasa el hash. Hoy ninguna ruta escribe `hashPago`.
- Abdiel publica `LAYA_URL`. El código ya llama a esa URL si existe. Sin ella usa el stub.
- El hash que guarde Sebas llena el campo que Esteban ya dejó. Falta la ruta que lo escriba, y una columna para `contractId`.

## Bitácora

### 2026-09-29

Revisión del demo en `main` (`ce9ff7c`). La pantalla no dice el rol. El voluntario se elige con botones. La bandeja, la revisión, el informe, crear proyecto, Fondear y Aprobar siguen en `localStorage`. Mis tareas y subir evidencia llaman a la API y caen al ejemplo si falla el tiempo. La IA es Groq `qwen/qwen3.8-27b`. Laya solo si hay `LAYA_URL`. El veredicto se guarda y no se muestra. No hay sincronía en vivo. La billetera de Cavos es real en testnet. El módulo de firma no está unido a los botones. El JWT se decodifica sin verificar la firma. Varias rutas no piden sesión. El reparto de pendientes está en [README.md](README.md) y [ROLES.md](ROLES.md).

El backend de Esteban quedó en la rama `esteban/backend`. Neon con Drizzle (usuarios con correo y rol, proyecto, tarea, evidencia, veredicto y hash de pago vacío), migración en `drizzle/0000_inicio.sql` y semilla de ZEEK. Blob privado. Rutas `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/evidencias/:id/foto`, `POST /api/proyectos`, `GET /api/informe` y `GET /api/revision/:id`. La revisión llama a `qwen/qwen3.8-27b`; sin `LAYA_URL` usa el stub; sin `GROQ_API_KEY` o si un modelo falla, el guion fijo. El informe abre sin hash. Entrar y Preparar cuentas pasan `auth` de CavosAuth. `POST /api/firma` y `POST /api/firma/enviar` exigen la sesión del organizador. Falta cargar las variables en Vercel y correr la migración. Josué sigue conectando las pantallas. No hay Acta.

### 2026-09-28

PR #1 de Raúl mergeado en `main` (squash `3a000e0`). Entró la base de Next.js 16.3.6 y las pantallas del integrante: Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas`. Los datos en pantalla son el ejemplo de ZEEK hasta que existan `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id`. `NEXT_PUBLIC_CAVOS_APP_ID` no está. En ese momento `--acento` seguía provisional (`#1c1c1c`). No hay ESLint ni script `lint`. En ese PR, `npm ci`, `npm test` y `npm run build` pasan. Siguen pendientes Neon, Blob, el escrow, el Acta y Laya.

PR #3 de Josué mergeado en `main` (squash `b2451a6`), el 28 de septiembre cerca de las 7:42 a.m., hora de Costa Rica. Entraron las pantallas del admin con el ejemplo de ZEEK, sin recrear el proyecto: crear proyecto, bandeja de evidencias, revisión y aprobar, e informe imprimible. `/` es la bandeja (presupuesto, pagado, pendiente y lo que falta aprobar). En la revisión, Pedir otra foto es un enlace. El informe muestra presupuesto contra gasto y el detalle por persona. "Ver pago" y la credencial solo se dibujan si el enlace existe; en el ejemplo no existen. Entrar usa Cavos con `network: "testnet"` y `appSalt` `hyto` únicamente cuando `NEXT_PUBLIC_CAVOS_APP_ID` tiene valor. Fondear y Aprobar no firman en Stellar. El esqueleto y el admin de Josué quedan hechos. Siguen pendientes Esteban (base de datos, rutas `/api` y la revisión con IA) y Sebas (el `appId` de Cavos, el escrow y la firma). Next.js se queda en 16.3.6; el parche 16.3.7 es el 30 de septiembre. Queda un detalle menor de auditoría: en `components/admin/Entrar.tsx:46`, `setDireccion` solo debe llamarse cuando `guardado.aviso` es null, para que se pueda reintentar el guardado.

PR #7 de Abdiel Cole mergeado en `main` (squash `cff4512`), el 28 de septiembre a las 2:58 p.m., hora de Costa Rica. Lo empujó Josué Valles. La app deja Inter y usa Poppins 400, 500 y 600 vía `next/font`. `--acento` pasa de `#1c1c1c` a `#B7EE34`. `--sobre-acento` (`#08090C`) es el texto de los botones primarios (Entrar, Imprimir y el botón del integrante). En el mismo PR, Josué Valles dejó legibles el hover, el foco y el estado deshabilitado sobre esa lima. No cambió la lógica de Esteban ni de Sebas. Sigue pendiente `LAYA_URL`. El detalle de `setDireccion` en Entrar sigue pendiente de Josué.

PR #4 mergeado en `main` (squash `bc94a9c`), el 28 de septiembre a las 3:47 p.m., hora de Costa Rica. Es la auditoría de las pantallas del integrante. La abrió la automatización de Cursor y Josué Valles figura como coautor. Una evidencia de ejemplo ya no abre la tarea de otra persona. Al cambiar de integrante no queda el botón de la lista anterior. Un monto vacío no se ve como US$0. Una fecha de calendario, o la medianoche UTC, no corre el día en Costa Rica; si esa fecha no existe, se muestra el texto original. Si la cuenta patrocinada nace con 0 XLM y sí quedó creada, se abre la trustline de USDC. Horizon corta a los 4 segundos. La cámara se apaga al salir, un doble clic no reenvía y un archivo que no es imagen no pasa. No tocó el admin, el escrow ni la marca.

PR #8 de Sebastián Ceciliano Piedra (Sebas) mergeado en `main` (squash `ae10a9e`), el 28 de septiembre a las 3:48 p.m., hora de Costa Rica. Lo empujó Josué Valles. Entró el módulo de firma (`lib/escrow`) y el script `npm run hito`. Prepara el XDR de fondear, marcar y aprobar y liberar, y envía el XDR firmado. `POST /api/firma` y `POST /api/firma/enviar` leen `TRUSTLESS_API_KEY` en el servidor. Si Circle no entrega USDC, el script avisa la cuenta y el enlace del grifo. En el repositorio no hay `lib/escrow/pago-prueba.json`: sin un pago en USDC no hay Acta. En ese momento `NEXT_PUBLIC_CAVOS_APP_ID` seguía sin publicarse. Fondear y Aprobar del admin no llaman estas rutas. Josué las conecta. Siguen pendientes Esteban (todo el backend) y Abdiel (`LAYA_URL`).

El mismo 28, Entrar en https://hyto.vercel.app falla con `registry lookup skipped: no login token`. El diagnóstico y el arreglo están en el paso 6 de Esteban. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel y es el correcto. Los orígenes permitidos de Cavos también. Esteban toma todo el backend: `/api/tareas`, `/api/evidencias`, Neon (usuarios, email → rol, migraciones y seed) y el login real de Cavos contra la base.

Laya se va a alojar en el servidor de Abdiel y se publica con Tailscale Funnel en lugar de pagar una URL. Todavía no está instalado. Esteban sigue con el stub hasta que Abdiel publique `LAYA_URL`. La URL de Funnel es pública, así que conviene que la ruta de revisión mande una clave compartida (pendiente de acordar con Esteban).
