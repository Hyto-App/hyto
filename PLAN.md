# Plan para empezar a codear Hyto

El contexto del código al 29 de septiembre de 2026 (`7d1f0a0`, 4:37 p.m., hora de Costa Rica) está en [AGENTS.md](AGENTS.md). Lo que sigue es el plan del 27 y 28 de septiembre. Donde diga que Fondear y Aprobar no firman, o que el backend no está en el repo, ya no describe `main`: la revisión firma, un correo nuevo con Cavos entra como voluntario, cada proyecto tiene `organizador_id` (PR #44), el demo no crea proyectos (PR #47), hay trustline de USDC para una sesión real (PR #50), la cookie dura como máximo 24 horas (PR #54), si Groq o Laya fallan el origen queda `error` con **Retry review** (PR #45) y la interfaz está en inglés (PR #56). `desdeGuion()` ya no cubre ese fallo. Los botones visibles son **Deploy and fund** y **Approve and pay**. Siguen pendientes el pago real en testnet, `LAYA_URL` y el PR #15. El orden está en [AGENTS.md](AGENTS.md).

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
- **Esteban** es dueño de todo el backend: `/api/tareas`, `/api/evidencias`, Neon Postgres (tabla de usuarios, email → rol, migraciones y seed) y el login real de Cavos contra esa base. No necesita el escrow ni Laya encendida. Sin `LAYA_URL`, después de Groq se usa el stub. Si Groq o Laya fallan, el origen queda `error` (PR #45, Josué Valles). Las pantallas de Raúl ya llaman sus rutas y caen al ejemplo si no responden.
- **Abdiel** no necesita el escrow ni las rutas. La marca ya está en `main` (PR #7): Poppins y `--acento` `#B7EE34`. Sigue Laya en su servidor. `LAYA_URL` todavía no está.
- **Josué** ya dejó el esqueleto y las pantallas del admin en `main` (PR #3). No recreó el proyecto: usa la base del PR #1. Los datos de ejemplo son ZEEK, en inglés desde el PR #56. **Deploy and fund** y **Approve and pay** firman desde la revisión. El 29 de septiembre también entraron el organizador por proyecto, el tope del demo, la trustline de USDC, **Sign out**, la cookie de 24 horas, **Retry review** y la interfaz en inglés. El `appId` ya está. El login real lo tomó Esteban. Sigue Next.js 16.3.7 y el borrador #18.
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
4. Ruta de revisión. Lee la foto en Blob. Groq `qwen/qwen3.8-27b` en `https://api.groq.com/openai/v1` describe la foto. Si es reembolso, saca monto y fecha y el código compara el tope. Llama a `LAYA_URL` si existe. Si no, un stub devuelve `choice`, `noul` y `score`. El código arma `cumplió`, `parcial` o `insuficiente`. En pantalla se leen Met, Partial e Insufficient (PR #56). En `main` (`7d1f0a0`), sin `GROQ_API_KEY` o si Groq o Laya fallan, el origen queda `error` y no entra el guion fijo (PR #45). La justificación es el texto de Scout más las tres respuestas.
5. Ruta del informe leyendo esas tablas. El enlace "Ver pago" usa el hash cuando exista; si no, el informe igual se abre.
6. Pendiente, 2026-09-28. Login real de Cavos, conectado a Neon. En https://hyto.vercel.app, Entrar falla con `registry lookup skipped: no login token`. `components/admin/Entrar.tsx` y `lib/integrante/preparar.ts` llaman `Cavos.connect` con `vault: true` y una `identity` fija de `lib/integrante/identidades.ts`, sin `auth`. `@cavos/kit` 0.2.5 exige un token de un login real (CavosAuth: email con `sendOtp` y `verifyOtp`, o Google con `handleCallback`). Arreglo: entrar con CavosAuth, pasar `auth` a `Cavos.connect` y, en el servidor, buscar el rol por email en Neon. Los orígenes permitidos de Cavos ya están. `NEXT_PUBLIC_CAVOS_APP_ID` en Vercel es el correcto. Alternativa solo para el demo, sin probar: `vault: false` y `InMemoryWalletRegistry`.

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

Depende de su backend: `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id`, Neon (proyecto, tarea, evidencia, veredicto, usuarios y email → rol) y el login real de Cavos contra esa base. Hoy Entrar y Preparar cuentas no pasan de `Cavos.connect` sin token. La revisión en pantalla es el guion fijo de ZEEK; no hay ruta de revisión ni de informe leyendo tablas. Fondear y Aprobar tampoco firman.

### Errores verificados, para corregir

Auditoría de `main` (`ade63ce`) más el recorrido de arriba. Cada número es algo visto en el código o en una respuesta real. En el repositorio no hay secretos.

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

1. Hecho en el PR #7: Poppins 400, 500 y 600, fondo claro, un botón principal por pantalla. Las seis pantallas (inicio del admin, crear proyecto, Mis tareas, subir evidencia, revisión e informe) ya están en la app. Sin las palabras escrow, XDR, trustline ni Soroban.
2. Hecho en el mismo PR: `--acento` es `#B7EE34`. `--sobre-acento` (`#08090C`) es el texto del botón primario sobre esa lima.
3. Laya en el servidor de escritorio de Abdiel (Ryzen 5 5600, 32 GB), el mismo donde corre Argus, pero en un entorno de Python aparte y en un puerto propio. Se instala `laya[serve]` con el checkpoint `laya-multilingual`. La URL pública sale de Tailscale Funnel (`https://…ts.net`), sin pagar dominio ni servidor, y va en `LAYA_URL`. `localhost` no sirve para Vercel. Esa máquina queda encendida en el ensayo del 3 de octubre. Falta verificar el comando del servidor y si la respuesta ya trae `choice`, `noul` y `score`.

## Josué, en este orden

1. La base Next.js 16.3.6, TypeScript, Tailwind y App Router ya está en `main` (PR #1). No la recrees. El 30 de septiembre, subir a 16.3.7.
2. Hecho en el PR #3: layout del admin y las pantallas con datos fijos de ZEEK. `/` es la bandeja. El acento es el lima del PR #7.
3. El botón Entrar ya está (`network: "testnet"`, `appSalt` fijo `hyto`). El `appId` ya está en Vercel. El login real lo hizo Esteban. La cookie sigue el `exp` del JWT, con tope de 24 horas (PR #54). **Sign out** está en `main` (PR #52).
4. Hecho: la bandeja, la revisión y el informe leen las rutas cuando hay sesión y no es demo.
5. Hecho: **Deploy and fund** y **Approve and pay** llaman a `POST /api/firma`, `signXdr` y `POST /api/firma/enviar`. Queda recargar el detalle si desplegar sale bien y fondear falla, y ocultar **Approve and pay** mientras no haya fondeo. Esos botones ya se ocultan si el origen es `error` o el reembolso no tiene monto (PR #45). Desde el PR #56 esos rótulos están en inglés.
6. Hecho en el PR #3: informe imprimible. Presupuesto contra gasto, detalle por persona, "Ver pago", y la credencial de Acta solo si el enlace existe.

El esqueleto, el admin y la firma desde la revisión ya están en `main`. Sigue el parche de Next.js el 30 de septiembre y el borrador #18.

## Raúl, en este orden

1. Hecho en el PR #1: Mis tareas (monto y estado) y Subir evidencia (cámara y enviar). Trabajo y reembolso son la misma pantalla. En el reembolso, monto y fecha se muestran cuando la revisión los trae.
2. Esas pantallas ya llaman las rutas de arriba. Mientras no respondan, usan el ejemplo de ZEEK.
3. Con el `appId`, ya en Vercel, cuatro identidades en `/cuentas`: organizador y tres voluntarios. Cada una muestra `G…` y trustline de USDC. Sebas solo confirma que cobran. El `Cavos.connect` sin `auth` es el problema conocido de Esteban (su paso 6).

## Lo único que hay que pasar de una persona a otra

- El `appId` ya está en Vercel. Esteban ya conectó el login real a Neon. Raúl crea las cuatro cuentas del demo.
- Esteban ya publicó las rutas. La bandeja usa la API cuando hay sesión y no es demo.
- El módulo de firma ya está en `main` (PR #8) y la revisión ya lo llama. Cuando haya un pago, Sebas pasa el hash para el informe.
- Abdiel publica `LAYA_URL`. Sin ella, después de Groq sigue el stub. La URL sale de Tailscale Funnel.
- El hash que guarda Sebas llena el campo que Esteban ya dejó en el informe. Esteban asigna a mano el `organizador_id` de los proyectos reales.

## Bitácora

### 2026-09-29

Horas de Costa Rica. El autor de los pull request de este día, salvo el #14, es Josué Valles. `main` cierra en `7d1f0a0`.

PR #14 de Esteban (Psybre) mergeado (squash `ce9ff7c`), el 28 de septiembre a las 11:40 p.m. Neon con Drizzle, Blob privado, rutas de tareas, evidencias, informe, proyectos y revisión, y el ingreso con CavosAuth. En ese momento, si Groq o Laya fallaban, la revisión usaba el guion fijo. El PR #45 lo cambió el mismo 29, a las 4:22 p.m.

9:16 a.m. PR #20. `.env.example` lista los nombres que el código lee, sin valores.

9:44 a.m. PR #27. Pruebas de integración contra Postgres local.

9:50 a.m. PR #22. Configuración central de entorno y salvaguarda para no migrar ni sembrar producción sin un `si` explícito.

10:03 a.m. PR #21. Postgres local, migración y semilla de ejemplo.

10:10 a.m. PR #24. Inventario del esquema de Postgres.

10:13 a.m. PR #25. Cruce del esquema declarado contra las consultas, sin escribir en la base.

10:14 a.m. PR #28. Avisos claros cuando falla el ingreso.

10:45 a.m. PR #23. Se verifica el JWT de Cavos y escribir exige sesión.

11:28 a.m. PR #26. Acciones V2 para aprobar, liberar, disputar, resolver y leer el escrow.

11:30 a.m. PR #30. Ingreso demo sin Cavos, para el pitch. Esa sesión no firma.

11:48 a.m. PR #36. Salir del demo y cambiar de rol ya no deja la sesión atrapada.

12:38 p.m. PR #38. Backend de escrow V2 para desplegar y pagar. El contrato queda en la tarea.

12:42 p.m. PR #39. La revisión firma el pago en el navegador.

12:51 p.m. PR #41. Un correo con login de Cavos que no existe se registra como voluntario.

12:59 p.m. PR #43. `AGENTS.md` queda como contexto del repo, contra `77a0431`.

1:38 p.m. PR #44. El organizador es de cada proyecto (`proyectos.organizador_id`). La migración solo agrega la columna, vacía. La semilla no escribe dueño en ZEEK. Con el demo prendido, el proyecto demo es de `demo-organizador`.

2:10 p.m. PR #47. El modo demo, y un pedido sin sesión, no pueden crear proyectos.

3:02 p.m. PR #50. El voluntario demo sube evidencia solo al proyecto demo, y la wallet de cobro que mande se ignora. Una sesión real prepara la trustline de USDC de testnet con `GET` y `POST /api/usdc`. El demo recibe 403.

4:10 p.m. PR #52. Preparar USDC y firmar reutilizan un token de Cavos todavía válido. **Sign out** cierra la sesión del servidor, la de Cavos y la wallet local.

4:18 p.m. PR #54. La cookie y `sesiones.expira_en` siguen el `exp` del JWT, con tope de 24 horas. Sin `exp`, 8 horas. El demo usa esas 8 horas. Una sesión vencida responde 401, `Sign in to continue.`

4:22 p.m. PR #45 (`7f41011`). Si Groq o Laya fallan, la revisión guarda origen `error`, muestra el mensaje y **Retry review**. No usa el guion fijo. No borra monto ni fecha. Oculta desplegar, fondear y pagar, y el servidor responde 409. El reintento espera 30 segundos y se niega si la tarea está pagada o tiene escrow. Groq pide `max_completion_tokens` 1024 y apaga el pensamiento del modelo.

4:37 p.m. PR #56 (`7d1f0a0`). La interfaz y los avisos de la API quedan en inglés. Los valores guardados y los textos conocidos de la semilla vieja se traducen al dibujar, en `lib/ui/etiquetas.ts`, sin migración. El veredicto se muestra Met, Partial o Insufficient. `<html lang="en">`. Fechas y montos usan `en-US`. Las rutas, las columnas, los comentarios y los scripts siguen como estaban.

Al cierre sigue pendiente: Sebas, el pago real en testnet y el Acta después. Esteban, Groq en producción, el PR #15 y asignar `organizador_id` a mano. Abdiel, `LAYA_URL` y el borrador #49. Josué, Next.js 16.3.7 el 30 de septiembre, el borrador #18, y los dos detalles de UX del escrow (recargar si fondear falla, ocultar **Approve and pay** sin fondeo). Raúl, las cuatro cuentas del demo.

### 2026-09-28

PR #1 de Raúl mergeado en `main` (squash `3a000e0`). Entró la base de Next.js 16.3.6 y las pantallas del integrante: Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas`. Los datos en pantalla son el ejemplo de ZEEK hasta que existan `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id`. `NEXT_PUBLIC_CAVOS_APP_ID` no está. En ese momento `--acento` seguía provisional (`#1c1c1c`). No hay ESLint ni script `lint`. En ese PR, `npm ci`, `npm test` y `npm run build` pasan. Siguen pendientes Neon, Blob, el escrow, el Acta y Laya.

PR #3 de Josué mergeado en `main` (squash `b2451a6`), el 28 de septiembre cerca de las 7:42 a.m., hora de Costa Rica. Entraron las pantallas del admin con el ejemplo de ZEEK, sin recrear el proyecto: crear proyecto, bandeja de evidencias, revisión y aprobar, e informe imprimible. `/` es la bandeja (presupuesto, pagado, pendiente y lo que falta aprobar). En la revisión, Pedir otra foto es un enlace. El informe muestra presupuesto contra gasto y el detalle por persona. "Ver pago" y la credencial solo se dibujan si el enlace existe; en el ejemplo no existen. Entrar usa Cavos con `network: "testnet"` y `appSalt` `hyto` únicamente cuando `NEXT_PUBLIC_CAVOS_APP_ID` tiene valor. Fondear y Aprobar no firman en Stellar. El esqueleto y el admin de Josué quedan hechos. Siguen pendientes Esteban (base de datos, rutas `/api` y la revisión con IA) y Sebas (el `appId` de Cavos, el escrow y la firma). Next.js se queda en 16.3.6; el parche 16.3.7 es el 30 de septiembre. Queda un detalle menor de auditoría: en `components/admin/Entrar.tsx:46`, `setDireccion` solo debe llamarse cuando `guardado.aviso` es null, para que se pueda reintentar el guardado.

PR #7 de Abdiel Cole mergeado en `main` (squash `cff4512`), el 28 de septiembre a las 2:58 p.m., hora de Costa Rica. Lo empujó Josué Valles. La app deja Inter y usa Poppins 400, 500 y 600 vía `next/font`. `--acento` pasa de `#1c1c1c` a `#B7EE34`. `--sobre-acento` (`#08090C`) es el texto de los botones primarios (Entrar, Imprimir y el botón del integrante). En el mismo PR, Josué Valles dejó legibles el hover, el foco y el estado deshabilitado sobre esa lima. No cambió la lógica de Esteban ni de Sebas. Sigue pendiente `LAYA_URL`. El detalle de `setDireccion` en Entrar sigue pendiente de Josué.

PR #4 mergeado en `main` (squash `bc94a9c`), el 28 de septiembre a las 3:47 p.m., hora de Costa Rica. Es la auditoría de las pantallas del integrante. La abrió la automatización de Cursor y Josué Valles figura como coautor. Una evidencia de ejemplo ya no abre la tarea de otra persona. Al cambiar de integrante no queda el botón de la lista anterior. Un monto vacío no se ve como US$0. Una fecha de calendario, o la medianoche UTC, no corre el día en Costa Rica; si esa fecha no existe, se muestra el texto original. Si la cuenta patrocinada nace con 0 XLM y sí quedó creada, se abre la trustline de USDC. Horizon corta a los 4 segundos. La cámara se apaga al salir, un doble clic no reenvía y un archivo que no es imagen no pasa. No tocó el admin, el escrow ni la marca.

PR #8 de Sebastián Ceciliano Piedra (Sebas) mergeado en `main` (squash `ae10a9e`), el 28 de septiembre a las 3:48 p.m., hora de Costa Rica. Lo empujó Josué Valles. Entró el módulo de firma (`lib/escrow`) y el script `npm run hito`. Prepara el XDR de fondear, marcar y aprobar y liberar, y envía el XDR firmado. `POST /api/firma` y `POST /api/firma/enviar` leen `TRUSTLESS_API_KEY` en el servidor. Si Circle no entrega USDC, el script avisa la cuenta y el enlace del grifo. En el repositorio no hay `lib/escrow/pago-prueba.json`: sin un pago en USDC no hay Acta. En ese momento `NEXT_PUBLIC_CAVOS_APP_ID` seguía sin publicarse. Fondear y Aprobar del admin no llaman estas rutas. Josué las conecta. Siguen pendientes Esteban (todo el backend) y Abdiel (`LAYA_URL`).

El mismo 28, Entrar en https://hyto.vercel.app falla con `registry lookup skipped: no login token`. El diagnóstico y el arreglo están en el paso 6 de Esteban. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel y es el correcto. Los orígenes permitidos de Cavos también. Esteban toma todo el backend: `/api/tareas`, `/api/evidencias`, Neon (usuarios, email → rol, migraciones y seed) y el login real de Cavos contra la base.

Laya se va a alojar en el servidor de Abdiel y se publica con Tailscale Funnel en lugar de pagar una URL. Todavía no está instalado. Esteban sigue con el stub hasta que Abdiel publique `LAYA_URL`. La URL de Funnel es pública, así que conviene que la ruta de revisión mande una clave compartida (pendiente de acordar con Esteban).
