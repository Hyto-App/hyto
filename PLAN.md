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
- **Esteban** dejó en `main` el backend (PR #14, el 28 de septiembre a las 11:40 p.m., hora de Costa Rica): `/api/tareas`, `/api/evidencias`, Neon Postgres (tabla de usuarios, email → rol, migraciones y seed) y el ingreso con código o Google contra esa base. No necesita el escrow ni Laya encendida. La revisión usa un stub de Laya y el guion fijo hasta que exista `LAYA_URL`. Sigue pendiente cargar en el sitio `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` y `GROQ_API_KEY`, y crear el almacén privado. Las tablas y la semilla de ZEEK ya se corrieron en la base. Sin eso las pantallas siguen en el ejemplo.
- **Abdiel** no necesita el escrow ni las rutas. La marca ya está en `main` (PR #7): Poppins y `--acento` `#B7EE34`. Sigue Laya en su servidor. `LAYA_URL` todavía no está. Conviene acordar con Esteban una clave, porque el enlace de Tailscale es público.
- **Josué** ya dejó el esqueleto y las pantallas del admin en `main` (PR #3). No recreó el proyecto: usa la base del PR #1. Los datos siguen siendo el ejemplo de ZEEK. Fondear y Aprobar no firman: el módulo de Sebas ya está y esos botones todavía no lo llaman. El `appId` ya está. El ingreso con código o Google lo dejó Esteban en el PR #14. El 29 a las 9:16 a.m. precisó `.env.example` (PR #20) y a las 9:44 a.m. dejó las pruebas contra Postgres local (PR #27). Sigue el PR #18, abierto: el regreso de Google pierde el ingreso si la persona navega mientras el canje sigue pendiente.
- **Raúl** ya dejó Mis tareas, Subir evidencia y `/cuentas` en `main` (PR #1). El `appId` ya está. El ingreso contra Neon lo dejó Esteban (PR #14). Faltan las cuatro cuentas del demo.

## Sebas, en este orden

1. Hecho: la app de Cavos existe. `NEXT_PUBLIC_CAVOS_APP_ID` está en Vercel y es el correcto. Los orígenes permitidos también. El ingreso con código o Google lo dejó Esteban en el PR #14. El regreso de Google, si la persona navega a mitad del canje, sigue abierto en el PR #18 de Josué.
2. Hecho en el script del PR #8, no como pago registrado: `npm run hito` crea cinco cuentas de prueba (organizador, receptor, admin, plataforma y resolutor) y abre la trustline de USDC al emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. Pide USDC de testnet al grifo de Circle (`destinationAddress`). Si Circle lo rechaza, indica la cuenta del organizador y `https://faucet.circle.com/` para fondear a mano. Las cuentas locales quedan en `.sebas-cuentas.json`, fuera de git.
3. Hecho en el mismo script, cuando hay `TRUSTLESS_API_KEY`: despliega un multi-release en `https://beta.api.trustlesswork.com`. La cuenta admin es otra dirección. El organizador está en aprobadores y en firmantes de liberación. Un hito, con monto y receptor. La clave no va al navegador.
4. El script fondea, marca el hito y libera. En v2, aprobar es `approve-and-release` (una firma). El envío es `POST /stellar/send-transaction`. Si rechaza el fee-bump, la cuenta se fondea con Friendbot y se reintenta. Un SUCCESS sin hash no se toma como fallo: el script saca el hash del XDR firmado. Hoy ese pago no está en el repositorio.
5. Si el beta no libera el hito, el mismo script cambia la base a `https://dev.api.trustlesswork.com` y repite. En v1 el operador marca el estado y el receptor solo cobra. La app no se reescribe.
6. Hecho en el PR #8: `lib/escrow` recibe la acción (fondear, marcar, aprobar y liberar) y devuelve el XDR, y acepta el XDR firmado y lo envía. Josué lo llama por `POST /api/firma` y `POST /api/firma/enviar`. La ruta HTTP rechaza `liberar`, porque en v2 aprobar ya libera. Para v1, el script llama al módulo directo.
7. Acta, al final de su lista y solo si el paso 4 ya pagó. Una credencial, clave de servidor de [dapp.acta.build](https://dapp.acta.build). Si no hay pago, no se hace. Sigue pendiente.

## Esteban, en este orden

Hecho en el PR #14 (squash `ce9ff7c`), mergeado el 28 de septiembre a las 11:40 p.m., hora de Costa Rica. Los pasos 1 a 6 están en `main`. Sigue pendiente cargar en Vercel `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` y `GROQ_API_KEY`, y crear el almacén privado. Las tablas y la semilla de ZEEK ya se corrieron en la base.

1. Neon y Blob privado. `DATABASE_URL` y `BLOB_READ_WRITE_TOKEN`. Tabla de usuarios: el email mapea al rol. Migraciones y seed.
2. Tablas: proyecto, tarea (trabajo o reembolso, monto, tope, condición, wallet de cobro), evidencia (id de Blob), veredicto y hash de pago (campo vacío hasta que Sebas lo tenga). Usuarios, aparte: email y rol.
3. Rutas que las pantallas ya llaman. El contrato está más abajo. Mientras no respondan, la UI sigue con el ejemplo de ZEEK.
4. Ruta de revisión. Lee la foto en Blob. Groq `qwen/qwen3.8-27b` en `https://api.groq.com/openai/v1` describe la foto. Si es reembolso, saca monto y fecha y el código compara el tope. Llama a `LAYA_URL` si existe. Si no, un stub devuelve `choice`, `noul` y `score`. El código arma `cumplió`, `parcial` o `insuficiente`. Sin `GROQ_API_KEY` o si Groq falla, guion fijo. La justificación es el texto de Scout más las tres respuestas.
5. Ruta del informe leyendo esas tablas. El enlace "Ver pago" usa el hash cuando exista; si no, el informe igual se abre.
6. Hecho en el PR #14. El 28 de septiembre, en https://hyto.vercel.app, Entrar fallaba con `registry lookup skipped: no login token` porque `Cavos.connect` iba sin `auth`. El arreglo ya está: entrar con CavosAuth (código al correo o Google), pasar `auth` a `Cavos.connect` y, en el servidor, buscar el rol por email en Neon. La dirección se guarda solo si no hay aviso. Queda abierto, de Josué, el PR #18: si la persona navega mientras el canje de Google sigue pendiente, se usa la búsqueda ya vacía y no se guarda la dirección. La prueba del PR #27 lo marca como fallo esperado.

### Pruebas de punta a punta (2026-09-28)

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

Ese recorrido es del 28 de septiembre (`ade63ce`), antes del PR #14. Desde el 28 a las 11:40 p.m., hora de Costa Rica, las rutas, el ingreso y la sesión del organizador en preparar y enviar el pago están en `main`. Las pantallas siguen en el ejemplo hasta que Josué las conecte y estén las variables en el sitio. Fondear y Aprobar siguen sin firmar.

### Errores verificados, para corregir

Auditoría de `main` (`ade63ce`) más el recorrido de arriba. Cada número es algo visto ese día en el código o en una respuesta real. En el repositorio no hay secretos. El PR #14 cerró las rutas que faltaban, el ingreso con código o Google y la sesión del organizador antes de preparar o enviar un pago. La dirección se guarda solo si no hay aviso. Siguen de Josué la bandeja, la revisión y el informe en el ejemplo, Fondear y Aprobar sin firma, y el regreso de Google (PR #18, no está en `main`). El PR #27, del 29 de septiembre a las 9:44 a.m., deja ese regreso como fallo esperado.

1. **Alta. Hecho en el PR #14.** `lib/integrante/rutas.ts:122`, `:149` y `:155`. Ese día no existían `app/api/tareas` ni `app/api/evidencias`. `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id` responden 404 en local y en https://hyto.vercel.app. Mis tareas y Subir evidencia caen al ejemplo de ZEEK. Arreglo: esas tres rutas, con el contrato de más abajo, Neon y Blob.
2. **Alta. Hecho en el PR #14.** `components/admin/Entrar.tsx:31` y `lib/integrante/preparar.ts:27`. Ese día `Cavos.connect` usaba `vault: true` y una identity fija, sin `auth`. En el sitio, Entrar y las cuatro filas de Preparar cuentas muestran `registry lookup skipped: no login token`. Arreglo: login real de CavosAuth, pasar `auth` a `connect` y leer el rol por email en Neon.
3. **Alta. Hecho en el PR #14.** `app/api/firma/route.ts:5` y `app/api/firma/enviar/route.ts:4`. Ese día las dos POST aceptaban el cuerpo sin sesión. Un pedido sin cookie llega al módulo. Arreglo: exigir la sesión del punto 2 antes de preparar o enviar.
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
14. **Media. Hecho en el PR #14.** `components/admin/Entrar.tsx:46`. Ese día `setDireccion` corría aunque el guardado avisara un fallo. El botón desaparece y no deja reintentar. Arreglo: `setDireccion` solo cuando `guardado.aviso` es null.
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

1. Hecho en el PR #7: Poppins 400, 500 y 600, fondo claro, un botón principal por pantalla. Las seis pantallas (inicio del admin, crear proyecto, Mis tareas, subir evidencia, revisión e informe) ya están en la app. Sin las palabras escrow, XDR, trustline ni Soroban.
2. Hecho en el mismo PR: `--acento` es `#B7EE34`. `--sobre-acento` (`#08090C`) es el texto del botón primario sobre esa lima.
3. Laya en el servidor de escritorio de Abdiel (Ryzen 5 5600, 32 GB), el mismo donde corre Argus, pero en un entorno de Python aparte y en un puerto propio. Se instala `laya[serve]` con el checkpoint `laya-multilingual`. La URL pública sale de Tailscale Funnel (`https://…ts.net`), sin pagar dominio ni servidor, y va en `LAYA_URL`. `localhost` no sirve para Vercel. Esa máquina queda encendida en el ensayo del 3 de octubre. Falta verificar el comando del servidor y si la respuesta ya trae `choice`, `noul` y `score`.

## Josué, en este orden

1. La base Next.js 16.3.6, TypeScript, Tailwind y App Router ya está en `main` (PR #1). No la recrees. El 30 de septiembre, subir a 16.3.7.
2. Hecho en el PR #3: layout del admin y las pantallas con datos fijos de ZEEK. `/` es la bandeja. El acento es el lima del PR #7.
3. Hecho el botón Entrar (`network: "testnet"`, `appSalt` fijo `hyto`). El `appId` ya está en Vercel. El ingreso con código o Google lo dejó Esteban en el PR #14. Sigue abierto el PR #18: el regreso de Google pierde el código si la persona navega mientras el canje sigue pendiente.
4. Cambiar los datos fijos por las rutas de Esteban, ya en `main` (PR #14). Sigue pendiente. El envío del pago devuelve el hash y no lo escribe en la tarea.
5. Fondear y Aprobar tienen que llamar al módulo de Sebas, ya en `main` (PR #8): `POST /api/firma` arma el XDR, el navegador lo firma con `signXdr` y `POST /api/firma/enviar` lo manda. Una firma en Aprobar. Hoy esos botones solo guardan el ejemplo en el navegador. Esas rutas ya exigen la sesión del organizador.
6. Hecho en el PR #3: informe imprimible. Presupuesto contra gasto, detalle por persona, "Ver pago", y la credencial de Acta solo si el enlace existe.
7. Hecho el 29 de septiembre: a las 9:16 a.m. el PR #20 precisó `.env.example`. A las 9:44 a.m. el PR #27 dejó `npm run test:integracion` contra Postgres local.

El esqueleto y el admin ya están en `main`. Las rutas de Esteban también. Falta conectarlas a la bandeja, la revisión y el informe, y conectar Fondear y Aprobar al módulo de firma.

## Raúl, en este orden

1. Hecho en el PR #1: Mis tareas (monto y estado) y Subir evidencia (cámara y enviar). Trabajo y reembolso son la misma pantalla. En el reembolso, monto y fecha se muestran cuando la revisión los trae.
2. Esas pantallas ya llaman las rutas de arriba. Mientras no respondan, usan el ejemplo de ZEEK.
3. Con el `appId`, ya en Vercel, cuatro identidades en `/cuentas`: organizador y tres voluntarios. Cada una muestra `G…` y trustline de USDC. Sebas solo confirma que cobran. El ingreso pide el código del correo de cada cuenta (PR #14 de Esteban). Esta parte sigue pendiente. La base tiene que estar sembrada.

## Lo único que hay que pasar de una persona a otra

- El `appId` ya está en Vercel. El ingreso contra Neon ya está (PR #14). Raúl crea las cuatro cuentas del demo.
- Las rutas de Esteban ya están en `main` (PR #14). Josué conecta la bandeja, la revisión y el informe. Raúl deja el ejemplo cuando esas cuentas existan.
- El módulo de firma ya está en `main` (PR #8). Josué lo conecta a Fondear y Aprobar. El `appId` ya está. Cuando el script deje un pago, Sebas pasa el hash para el informe.
- Abdiel publica `LAYA_URL`. Esteban cambia el stub por esa URL. La URL sale de Tailscale Funnel.
- El hash que guarda Sebas llena el campo que Esteban ya dejó en el informe.

## Bitácora

### 2026-09-29

A las 9:44 a.m., hora de Costa Rica, entró el PR #27 de Josué Valles (squash `d26a443`). Son pruebas de integración contra Postgres en esta máquina: `npm run test:integracion`. Si no hay base, o si el host no es `localhost`, `127.0.0.1`, `::1` ni un servicio de Docker, el comando avisa y no abre conexión. Por defecto usa el puerto 5432 y la base `hyto_integracion`. Recorren las rutas de `app/api`, las pantallas del admin y el regreso de Google. Ese regreso queda como fallo esperado porque el PR #18 no está en `main`: si la persona navega mientras el canje sigue pendiente, se pierde `cavos_auth_code` y no se guarda la dirección. `npm test` suma la guardia de esa base y la cookie de sesión de prueba. `almacenNeon` y `fotosBlob` aceptan un gancho que solo definen estas pruebas; sin ese gancho siguen Neon y Blob. Entraron `pg`, `happy-dom` y `@types/pg` como dependencias de desarrollo. Las pantallas siguen en el ejemplo. Fondear y Aprobar no firman. El envío del pago devuelve el hash y no lo escribe en la tarea.

A las 9:16 a.m., hora de Costa Rica, entró el PR #20 de Josué Valles (squash `36fd91a`). `.env.example` dice, sin valores, el alcance de cada variable, si es obligatoria y qué hace el código si falta. `NODE_ENV` no se declara: lo pone Next.js y, en producción, la cookie `hyto_sesion` lleva Secure. No hay `GOOGLE_CLIENT_ID`: Google entra por Cavos. La clave de servidor de Cavos (`cav_…`) sigue sin nombre en el código.

El backend de Esteban está en `main` desde el PR #14 (squash `ce9ff7c`), mergeado el 28 de septiembre a las 11:40 p.m., hora de Costa Rica. Neon con Drizzle (usuarios con correo y rol, proyecto, tarea, evidencia, veredicto y hash de pago vacío), migración en `drizzle/0000_inicio.sql` y semilla de ZEEK. Blob privado. Rutas `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/evidencias/:id/foto`, `GET` y `POST /api/proyectos`, `GET /api/informe`, `GET` y `POST /api/revision/:id` y `POST /api/sesion`. La revisión llama a `qwen/qwen3.8-27b`; sin `LAYA_URL` usa el stub; sin `GROQ_API_KEY` o si un modelo falla, el guion fijo. El informe abre sin hash. Entrar y Preparar cuentas pasan `auth` de CavosAuth. `POST /api/firma` y `POST /api/firma/enviar` exigen la sesión del organizador. Falta cargar en el sitio la dirección de la base, la clave del almacén de fotos y la de la revisión, y crear el almacén privado. Las tablas y la carga de ZEEK ya se corrieron en la base. Josué sigue conectando las pantallas y el regreso de Google (PR #18). Raúl, las cuatro cuentas. Abdiel, `LAYA_URL` y la clave compartida. Sebas, un pago en USDC. No hay Acta.

### 2026-09-28

PR #1 de Raúl mergeado en `main` (squash `3a000e0`). Entró la base de Next.js 16.3.6 y las pantallas del integrante: Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas`. Los datos en pantalla son el ejemplo de ZEEK hasta que existan `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id`. `NEXT_PUBLIC_CAVOS_APP_ID` no está. En ese momento `--acento` seguía provisional (`#1c1c1c`). No hay ESLint ni script `lint`. En ese PR, `npm ci`, `npm test` y `npm run build` pasan. Siguen pendientes Neon, Blob, el escrow, el Acta y Laya.

PR #3 de Josué mergeado en `main` (squash `b2451a6`), el 28 de septiembre cerca de las 7:42 a.m., hora de Costa Rica. Entraron las pantallas del admin con el ejemplo de ZEEK, sin recrear el proyecto: crear proyecto, bandeja de evidencias, revisión y aprobar, e informe imprimible. `/` es la bandeja (presupuesto, pagado, pendiente y lo que falta aprobar). En la revisión, Pedir otra foto es un enlace. El informe muestra presupuesto contra gasto y el detalle por persona. "Ver pago" y la credencial solo se dibujan si el enlace existe; en el ejemplo no existen. Entrar usa Cavos con `network: "testnet"` y `appSalt` `hyto` únicamente cuando `NEXT_PUBLIC_CAVOS_APP_ID` tiene valor. Fondear y Aprobar no firman en Stellar. El esqueleto y el admin de Josué quedan hechos. Siguen pendientes Esteban (base de datos, rutas `/api` y la revisión con IA) y Sebas (el `appId` de Cavos, el escrow y la firma). Next.js se queda en 16.3.6; el parche 16.3.7 es el 30 de septiembre. Queda un detalle menor de auditoría: en `components/admin/Entrar.tsx:46`, `setDireccion` solo debe llamarse cuando `guardado.aviso` es null, para que se pueda reintentar el guardado.

PR #7 de Abdiel Cole mergeado en `main` (squash `cff4512`), el 28 de septiembre a las 2:58 p.m., hora de Costa Rica. Lo empujó Josué Valles. La app deja Inter y usa Poppins 400, 500 y 600 vía `next/font`. `--acento` pasa de `#1c1c1c` a `#B7EE34`. `--sobre-acento` (`#08090C`) es el texto de los botones primarios (Entrar, Imprimir y el botón del integrante). En el mismo PR, Josué Valles dejó legibles el hover, el foco y el estado deshabilitado sobre esa lima. No cambió la lógica de Esteban ni de Sebas. Sigue pendiente `LAYA_URL`. El detalle de `setDireccion` en Entrar sigue pendiente de Josué.

PR #4 mergeado en `main` (squash `bc94a9c`), el 28 de septiembre a las 3:47 p.m., hora de Costa Rica. Es la auditoría de las pantallas del integrante. La abrió la automatización de Cursor y Josué Valles figura como coautor. Una evidencia de ejemplo ya no abre la tarea de otra persona. Al cambiar de integrante no queda el botón de la lista anterior. Un monto vacío no se ve como US$0. Una fecha de calendario, o la medianoche UTC, no corre el día en Costa Rica; si esa fecha no existe, se muestra el texto original. Si la cuenta patrocinada nace con 0 XLM y sí quedó creada, se abre la trustline de USDC. Horizon corta a los 4 segundos. La cámara se apaga al salir, un doble clic no reenvía y un archivo que no es imagen no pasa. No tocó el admin, el escrow ni la marca.

PR #8 de Sebastián Ceciliano Piedra (Sebas) mergeado en `main` (squash `ae10a9e`), el 28 de septiembre a las 3:48 p.m., hora de Costa Rica. Lo empujó Josué Valles. Entró el módulo de firma (`lib/escrow`) y el script `npm run hito`. Prepara el XDR de fondear, marcar y aprobar y liberar, y envía el XDR firmado. `POST /api/firma` y `POST /api/firma/enviar` leen `TRUSTLESS_API_KEY` en el servidor. Si Circle no entrega USDC, el script avisa la cuenta y el enlace del grifo. En el repositorio no hay `lib/escrow/pago-prueba.json`: sin un pago en USDC no hay Acta. En ese momento `NEXT_PUBLIC_CAVOS_APP_ID` seguía sin publicarse. Fondear y Aprobar del admin no llaman estas rutas. Josué las conecta. Siguen pendientes Esteban (todo el backend) y Abdiel (`LAYA_URL`).

El mismo 28, Entrar en https://hyto.vercel.app falla con `registry lookup skipped: no login token`. El diagnóstico y el arreglo están en el paso 6 de Esteban. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel y es el correcto. Los orígenes permitidos de Cavos también. Esteban toma todo el backend: `/api/tareas`, `/api/evidencias`, Neon (usuarios, email → rol, migraciones y seed) y el login real de Cavos contra la base.

Laya se va a alojar en el servidor de Abdiel y se publica con Tailscale Funnel en lugar de pagar una URL. Todavía no está instalado. Esteban sigue con el stub hasta que Abdiel publique `LAYA_URL`. La URL de Funnel es pública, así que conviene que la ruta de revisión mande una clave compartida (pendiente de acordar con Esteban).

Esa misma noche, a las 11:40 p.m., hora de Costa Rica, el backend de Esteban entró a `main` con el PR #14. El detalle y lo que sigue pendiente están en el 29 de septiembre.
