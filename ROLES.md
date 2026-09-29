# Roles de Hyto

Cerrado el 27 de septiembre de 2026. Equipo de 5. Entrega de la hackathon: 5 de octubre de 2026, 4:00 p.m. Meetup: 30 de septiembre de 2026, TEC Cartago. Demo en Stellar testnet.

Este archivo es el contexto de trabajo para la IA de cada integrante. Léelo junto con [STACK.md](STACK.md). Actúa solo dentro del rol de la persona que te está usando. Si una tarea es de otra persona, déjala escrita y no la implementes.

## Estado al 29 de septiembre de 2026, 10:45 a.m., hora de Costa Rica

| Pieza | Estado | Dueño |
|---|---|---|
| Base Next.js 16.3.6, layout, CSS, `next.config.ts` | En `main` (PR #1, `3a000e0`) | Raúl |
| Mis tareas, Subir evidencia, `/cuentas` | En `main`, con datos de ejemplo de ZEEK | Raúl |
| Cuatro cuentas de Cavos | Pantalla lista. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel. El ingreso pide el código del correo. Falta dejar las cuatro cuentas | Raúl |
| Esqueleto y admin: crear proyecto, bandeja, revisión y aprobar, informe, botón Entrar | Hecho en `main` (PR #3, `b2451a6`), sobre la base del PR #1. Ejemplo de ZEEK. `/` es la bandeja. Fondear y Aprobar no firman: el módulo ya está y esos botones no lo llaman | Josué |
| Auditoría del integrante | En `main` (PR #4, `bc94a9c`), el 28 de septiembre a las 3:47 p.m., hora de Costa Rica. No mezcla tareas, no inventa US$0 ni corre el día, y cierra fallos de la cámara y de la trustline | Josué (coautor) |
| Backend: rutas, Neon, Blob, revisión con IA e ingreso con Cavos | En `main` (PR #14, `ce9ff7c`), el 28 de septiembre a las 11:40 p.m. Falta cargar las variables en el sitio, la clave del JWT (PR #23) y crear el almacén privado. Las tablas y la semilla de ZEEK ya se corrieron en la base | Esteban |
| `.env.example` con alcance y qué pasa si falta cada variable | En `main` (PR #20, `36fd91a`), el 29 de septiembre a las 9:16 a.m. Sin valores | Josué |
| Configuración central y salvaguarda de la base | En `main` (PR #22, `7c64a54`), el 29 de septiembre a las 9:50 a.m. `npm run verificar:entorno` no imprime valores. Migrar o sembrar un host de producción listado pide `HYTO_CONFIRMAR_BASE_PRODUCCION=si` | Josué |
| Pruebas contra Postgres local | En `main` (PR #27, `d26a443`), el 29 de septiembre a las 9:44 a.m. `npm run test:integracion`. Si no hay base local, se omite. El regreso de Google es fallo esperado | Josué |
| Postgres local, migración y semilla de ejemplo | En `main` (PR #21, `9508e0c`), el 29 de septiembre a las 10:03 a.m. `docker compose` y `npm run db:local`. Las tareas quedan en pendiente. Pedir otra foto borra el veredicto. Un pago y una foto real no se pisan al sembrar de nuevo | Josué |
| Inventario del esquema, sin abrir Neon | En `main` (PR #24, `5b8f242`), el 29 de septiembre a las 10:10 a.m. `npm run db:esquema` | Josué |
| Cruce del esquema contra una copia, solo lectura | En `main` (PR #25, `99b8aa4`), el 29 de septiembre a las 10:13 a.m. `npm run db:comparar-esquema`. No escribe en la base. Lo marcado queda para Esteban | Josué, confirmación de Esteban |
| Avisos de Entrar | En `main` (PR #28, `7256c56`), el 29 de septiembre a las 10:14 a.m. Ya no se muestra el error crudo de Cavos. Un 429 cuenta los segundos y desactiva «Enviar código». Hay 20 segundos de respiro tras cada envío | Josué |
| Verificación del JWT de Cavos | En `main` (PR #23, `fca79a2`), el 29 de septiembre a las 10:45 a.m. `POST /api/sesion` comprueba firma, emisor y vencimiento. Sin `CAVOS_JWT_JWK` ni `CAVOS_JWKS_URL` no hay sesión. Subir evidencia pide la cookie, solo acepta la tarea del integrante y no cambia `walletCobro` de otra persona. Un 401 o un 403 no se guarda como ejemplo. Falta cargar la clave en el sitio | Josué, clave de Esteban |
| Regreso de Google | Abierto, no está en `main` (PR #18). Si la persona navega mientras el canje sigue pendiente, se pierde el ingreso | Josué |
| Módulo de firma y script del hito | En `main` (PR #8, `ae10a9e`), el 28 de septiembre a las 3:48 p.m., hora de Costa Rica. No hay hash de pago en el repo. Preparar y enviar exigen la sesión del organizador, y desde el PR #23 esa sesión exige un JWT verificado | Sebas, sesión de Josué sobre el ingreso de Esteban |
| Acta | Pendiente. Solo entra después de un pago en USDC. El `appId` de Cavos ya está en Vercel | Sebas |
| Poppins y `--acento` `#B7EE34` | En `main` (PR #7, `cff4512`), el 28 de septiembre a las 2:58 p.m., hora de Costa Rica | Abdiel |
| `LAYA_URL` | Pendiente. Conviene una clave compartida con Esteban, porque el enlace es público | Abdiel |

La dirección del ingreso se guarda solo si no hay aviso. Ese detalle del 28 ya está en el PR #14.

No hay script `lint`. Cómo correr y el contrato de la API: [README.md](README.md) y [PLAN.md](PLAN.md).

## Producto

Hyto es un control de gastos y pagos por hitos para equipos. El organizador deposita el presupuesto en un escrow de Trustless Work y lo divide en tareas. Cada integrante sube evidencia. Una IA recomienda cumplió, parcial o insuficiente. Un administrador aprueba. El hito se libera y el pago llega en USDC. Al cerrar, Hyto genera un informe con presupuesto contra gasto, evidencia y el enlace en blockchain de cada pago.

La IA de revisión nunca firma ni mueve dinero. El pago de un hito es todo o nada.

Cada hito es trabajo o reembolso, y los dos se suben igual: una foto. Trabajo: foto de lo hecho. Reembolso: foto de la factura o del comprobante. Qwen describe las dos. En la factura, además, saca monto y fecha, y el código los compara con el tope. Laya responde las tres preguntas en los dos casos. La pantalla de subir y la de aprobar no cambian.

## Demo que hay que poder mostrar

Evento de ZEEK, montos de ejemplo:

1. El organizador crea 3 tareas de voluntariado y 1 reembolso de comida.
2. Fondea el escrow en testnet. El dashboard muestra el presupuesto.
3. Voluntario 1 sube evidencia completa. La IA dice cumplió. El admin aprueba. Llega USDC.
4. Voluntario 2 sube evidencia incompleta. La IA dice parcial. El admin pide más evidencia o aprueba el monto completo.
5. Voluntario 3 no sube evidencia. Sigue pendiente y el dinero sigue en el escrow.
6. Reembolso: foto del comprobante, la IA revisa, se aprueba y se paga.
7. Informe con presupuesto contra gasto, evidencia y enlaces de Stellar.

De eso, hoy se recorre en local Mis tareas, subir la foto y el admin (crear proyecto, bandeja de evidencias, revisión y el informe imprimible), con el ejemplo de ZEEK (tres trabajos de US$20 y un reembolso de hasta US$15). El módulo de firma ya está (PR #8). Fondear y Aprobar no lo llaman y no firman en Stellar. La revisión con IA está en el código (PR #14): Qwen, stub de Laya y guion fijo. Un pago en USDC no está. Las pruebas del PR #27 recorren las rutas y esas pantallas contra un Postgres local. La semilla del PR #21 deja las tareas en pendiente, así Subir evidencia sigue, y la bandeja de la API lista stand, registro y comida porque ya tienen veredicto y no están pagadas.

## Equipo

| Persona | Rol | Es dueño de |
|---|---|---|
| Abdiel Cole | UX, marca y el proceso de Laya | Poppins y lima ya en `main` (PR #7). Sigue Laya encendida en su servidor |
| Esteban | Backend | Todo el backend, ya en `main` (PR #14): `/api/tareas`, `/api/evidencias`, Neon (usuarios con email → rol, migraciones y seed), el ingreso de Cavos contra la base, Vercel Blob, veredicto de la IA y el informe. Falta cargar las variables en el sitio |
| Sebas | Escrow y wallet | Trustless Work, Cavos (`NEXT_PUBLIC_CAVOS_APP_ID`, ya en Vercel) y la liberación del USDC. El módulo y el script ya están (PR #8) |
| Josué | App del admin | Pantallas del organizador, ya en `main` (PR #3): crear proyecto, bandeja, revisión e informe |
| Raúl | App del integrante | Pantallas de tareas y de subir evidencia (ya en `main`), y las cuentas de testnet del demo |

Abdiel no bloquea el código. El orden de cada lista está en [PLAN.md](PLAN.md). Cada quien avanza con datos de prueba propios y solo espera el dato marcado ahí como encuentro. Nadie sube directo a `main`: el trabajo es en la nube, cada entrega es una rama `nombre/tarea` y un pull request. La rama nueva sale de `main` actualizado.

Raúl es nuevo en hackatones. Su parte se ve en el demo y tiene revisión al lado: Josué en la app, Sebas en las wallets. No toma el escrow ni la arquitectura.

## Abdiel Cole

UX, identidad de marca, redes y comunicación del pitch.

**Empieza por:** la estructura de estas pantallas, con la entrada en un solo botón.

- Inicio del admin: tres números (presupuesto, pagado, pendiente) y la bandeja de lo que falta aprobar.
- Crear proyecto: nombre, tareas con monto y un botón para fondear. Sin configurar roles del contrato en la pantalla.
- Mis tareas, en el móvil: una tarea, un monto, un estado. Ya está en `main`.
- Subir evidencia: cámara y enviar. El reembolso muestra monto y fecha ya rellenados. Ya está en `main`; monto y fecha salen cuando la API los trae.
- Revisión: foto, tarjeta corta de la IA y un botón Aprobar.
- Informe: presupuesto contra gasto, y enlaces de "Ver pago" y de la credencial si ya existe.

La app se ve como Ramp, no como una billetera. No pidas frase semilla, extensión ni firma a la vista. La primera vez es entrar con Cavos y caer en la tarea o en la bandeja. Fondo claro, Poppins, un acento, una acción principal por pantalla.

La tipografía y el color ya están en `main` (PR #7): Poppins 400, 500 y 600, `--acento` `#B7EE34` y `--sobre-acento` `#08090C` para el texto del botón primario. Fondo claro, mucho espacio, un botón primario por pantalla. No uses la palabra escrow, XDR, trustline ni Soroban en la interfaz.

Laya corre en su servidor de escritorio, el mismo de Argus, en un entorno de Python aparte y un puerto propio: `pip install "laya[serve]"`, checkpoint `laya-multilingual`. Durante el demo esa máquina queda encendida y alcanzable. La URL pública sale de Tailscale Funnel y va en `LAYA_URL`. No se despliega Laya en Vercel. Esa URL todavía no está.

**Listo cuando:** el resto puede construir esas pantallas sin inventarse el flujo. Josué usa las de admin. Raúl ya usa las del integrante.

## Esteban

Backend. Buen nivel en servidor. Es dueño de todo el backend.

**Empieza por:** Drizzle sobre Neon (`DATABASE_URL`) con proyecto, tarea, evidencia y veredicto, y la tabla de usuarios (el email mapea al rol), con migraciones y seed. La foto se sube a Vercel Blob (`BLOB_READ_WRITE_TOKEN`) y en Neon se guarda el identificador. Nada de eso vive en el disco de Vercel. Eso ya está en `main` (PR #14, el 28 de septiembre a las 11:40 p.m., hora de Costa Rica). Falta cargar las variables en el sitio, una de `CAVOS_JWT_JWK` o `CAVOS_JWKS_URL` (PR #23: sin ella no hay sesión) y crear el almacén privado. Las tablas y la semilla de ZEEK ya se corrieron en la base. El PR #22 de Josué frena `npm run db:migrar` y `npm run db:semilla` si la URL apunta a un host de producción listado y `HYTO_CONFIRMAR_BASE_PRODUCCION` no vale `si`. El PR #21, a las 10:03 a.m. del 29, migra con el protocolo de Postgres cuando el host no es Neon, y `npm run db:local` levanta, migra y siembra en esta máquina. A las 10:10 a.m. el PR #24 dejó un inventario del esquema leído del código, y a las 10:13 a.m. el PR #25 dejó el cruce contra una copia, en solo lectura. Lo que ese cruce marque queda para confirmarlo. Ninguno de los dos escribe en la base.

La revisión corre en una ruta de Vercel. Qwen 3.8 27B en Groq (`qwen/qwen3.8-27b`, base `https://api.groq.com/openai/v1`, `GROQ_API_KEY`) describe la foto leída desde Blob y, si es una factura, saca monto y fecha. Después la ruta llama a Laya en el servidor de Abdiel, por `LAYA_URL`. Laya devuelve `choice`, `noul` y `score`. El código compara el tope de dinero y arma `cumplió`, `parcial` o `insuficiente`. La justificación es el texto de Scout más esas tres respuestas. Si falta la clave, el servidor de Abdiel está apagado o un modelo falla, responde el guion fijo. La base es Neon y las fotos están en Vercel Blob.

Las pantallas ya llaman `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id`. La forma exacta está en [PLAN.md](PLAN.md). Si no respondes así, la UI se queda en el ejemplo.

El ingreso de Cavos también es suyo y se conecta a esa base. En el PR #14, Entrar pide un código al correo, o Google, y la base dice el rol. El PR #23 de Josué, el 29 de septiembre a las 10:45 a.m., verifica el JWT antes de abrir la cookie: la documentación de Cavos no publica la clave, así que hay que cargarla en el sitio. El diagnóstico del 28 de septiembre, cuando el sitio fallaba sin token, está en [PLAN.md](PLAN.md). El regreso de Google, si la persona navega a mitad del canje, sigue abierto: es el PR #18 de Josué.

### Pruebas de punta a punta (2026-09-28)

El 28 de septiembre se recorrió `main` (`ade63ce`) en local y en https://hyto.vercel.app. La bandeja, Mis tareas, la revisión, el informe y subir una foto se abren con el ejemplo de ZEEK. Ese día `GET /api/tareas` y `POST /api/evidencias` respondían 404, y Entrar y Preparar cuentas fallaban con `registry lookup skipped: no login token`. `npm test`: 42 ok, 0 fallos. `npm run build` pasa en Next.js 16.3.6. La tabla está en [PLAN.md](PLAN.md). Desde el PR #14 esas rutas y el ingreso están en `main`. Las pantallas siguen en el ejemplo hasta que Josué las conecte y estén las variables en el sitio.

Errores vistos el 28 de septiembre. El detalle está en [PLAN.md](PLAN.md). El PR #14 ya cubrió las rutas, el ingreso con código o Google, la sesión antes de preparar o enviar un pago, y guardar la dirección solo si no hay aviso (puntos 1, 2, 3 y 14). El PR #23, a las 10:45 a.m. del 29, exige además la firma del JWT. El PR #21, a las 10:03 a.m. del 29, cubrió el punto 13: Pedir otra foto borra el veredicto. Siguen de Josué los puntos 5, 6, 7 y 8, y el regreso de Google (PR #18). El punto 4 sigue siendo la clave de Trustless Work en el servidor, de Sebas.

1. **Alta. Hecho en el PR #14.** `lib/integrante/rutas.ts:122`, `:149`, `:155`. Ese día faltaban `/api/tareas` y `/api/evidencias`. Las tres llamadas responden 404 y la UI usa ZEEK. Arreglo: las rutas, Neon y Blob.
2. **Alta. Hecho en el PR #14.** `components/admin/Entrar.tsx:31`, `lib/integrante/preparar.ts:27`. Ese día `Cavos.connect` iba sin `auth`. En el sitio: `registry lookup skipped: no login token`. Arreglo: CavosAuth, pasar `auth` y leer el rol por email en Neon.
3. **Alta. Hecho en el PR #14 y afinado en el PR #23.** `app/api/firma/route.ts:5`, `app/api/firma/enviar/route.ts:4`. Ese día el POST iba sin sesión. Arreglo: exigir la sesión antes de preparar o enviar. Desde el 29 de septiembre a las 10:45 a.m. esa cookie solo se abre con un JWT verificado. También la piden crear un proyecto, la revisión y subir una evidencia. Un 401 o un 403 al subir no se guarda como ejemplo.
4. **Alta.** `lib/escrow/modulo.ts:41`. En el sitio la clave de Trustless Work responde 401 `Invalid API key`. Arreglo: una clave válida, solo en el servidor.
5. **Alta.** `components/admin/CrearProyecto.tsx:33`. Fondear no llama a `/api/firma`. Arreglo: XDR, firma en el navegador y `/api/firma/enviar`.
6. **Alta.** `components/admin/Revision.tsx:22`. Aprobar solo marca `pagado` en el navegador. Arreglo: la misma cadena, una firma.
7. **Alta.** `components/admin/Bandeja.tsx:16`, `Informe.tsx:14`, `Revision.tsx:17`, `lib/admin/vista.ts:150`. El admin lee `localStorage` y `ejemplo` está fijo en `true`. Arreglo: leer la API.
8. **Alta.** `lib/admin/memoria.ts:4`, `lib/integrante/almacen.ts:3`. Dos almacenes. El informe quedó en pagado US$32.40 y Mis tareas en pendiente. Arreglo: una fuente en Neon.
9. **Media.** `lib/escrow/limite.ts:6` y `:23`. El tope usa el primer `X-Forwarded-For` y un `Map` del proceso. Otra IP salta el 429. Arreglo: IP de Vercel y contador compartido.
10. **Media.** `lib/escrow/limite.ts:34`. Sin `Content-Length`, un cuerpo de unos 210000 bytes no da 413. Arreglo: medir el cuerpo leído.
11. **Media.** `app/api/firma/enviar/route.ts:13`. Un XDR que no es transacción sigue de largo. Arreglo: parsearlo con el SDK y devolver 400.
12. **Media.** `lib/escrow/modulo.ts:60`. El 401 de Trustless Work llega al cliente como `Invalid API key`. Arreglo: aviso fijo en 401 y 403.
13. **Media. Hecho en el PR #21.** `lib/admin/vista.ts:77`, `components/admin/Revision.tsx:81`. Ese día Pedir otra foto dejaba la pastilla en "parcial". Arreglo: limpiar el veredicto. Desde el 29 de septiembre a las 10:03 a.m. la tarea sale de la bandeja.
14. **Media. Hecho en el PR #14.** `components/admin/Entrar.tsx:46`. Ese día `setDireccion` corría aunque el guardado fallara. Arreglo: solo si `guardado.aviso` es null.
15. **Baja.** `lib/escrow/cuerpos.ts:231`. La dirección no lleva checksum. Arreglo: `StrKey`.
16. **Baja.** `lib/integrante/almacen.ts:42`. `setItem` sin `try`. Un fallo se ve como "No se pudo enviar." Arreglo: el aviso que ya usa el admin.

El informe sale de estos datos más el hash que guarde Sebas. Esteban no firma transacciones y no pone la clave de Trustless Work en el cliente.

**Listo cuando:** el sitio, con las variables cargadas (incluida la clave del JWT), guarda un proyecto y una evidencia, y Entrar resuelve el rol por correo. El código de esas rutas ya está. Falta poner las variables en Vercel y que Josué deje el ejemplo.

## Sebas

Escrow y wallet. Implementa el flujo de dinero.

**Empieza por:** el spike del lunes 28. El script ya está: `npm run hito` (`scripts/hito-prueba.ts`, PR #8). Sin `TRUSTLESS_API_KEY` no paga. En el repositorio no hay hash de un pago en USDC.

1. API key de Trustless Work.
2. Desplegar un escrow multi-release v2 en `https://beta.api.trustlesswork.com`.
3. Fondearlo con USDC de testnet.
4. Liberar un hito a una segunda wallet.

Si ese beta no logra las cuatro cosas, el mismo día la base pasa a `https://dev.api.trustlesswork.com` (v1). La app no se reescribe. En v1 hay un solo proveedor: el operador marca el estado y los voluntarios quedan solo como receptores de cada hito.

La clave de API de Trustless Work se queda en el servidor. Cavos firma en el navegador con `signXdr`. El ciclo es siempre: la API devuelve un XDR, Cavos lo firma, el servidor lo envía a Stellar. Paquete `@cavos/kit`, red `testnet`, `appSalt` fijo `hyto`. El `appId` sale del dashboard de Cavos y se publica como `NEXT_PUBLIC_CAVOS_APP_ID`. Ya está en Vercel y es el correcto. Los orígenes permitidos de Cavos también. Sin un login real, Entrar y `/cuentas` no registran la wallet: eso lo resuelve Esteban. La clave `cav_…` no va al navegador. USDC de testnet, emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.

El spike incluye crear la app en el dashboard, conectar una wallet Stellar, abrir la trustline de USDC y firmar el XDR de fondeo y de `approve-and-release`. No uses el wrapper `TrustlessWorkEscrow` del kit. El envío es `POST /stellar/send-transaction`. Ese endpoint rechaza fee-bumps: confirma que la cuenta firmante puede pagar la comisión en XLM. Si no, fóndala con Friendbot.

Quien aprueba y quien libera es la wallet del organizador, en una sola transacción. La cuenta Admin del contrato es otra dirección: no puede aprobar, marcar el hito, liberar ni resolver disputas. El proveedor marca el estado y adjunta la referencia de la evidencia. Los hitos no se editan después de fondear.

**Listo cuando:** un hito de prueba se pagó en testnet y el hash queda guardado para el informe.

Acta va después de ese pago, no antes. Es viable como una sola credencial en el hito ya pagado: Cavos firma la emisión y el informe la abre. En testnet cuesta 5 XLM de Friendbot. La clave de https://dapp.acta.build se queda en el servidor. Si todavía no hay USDC, no la integres: el informe sigue con el hash de Stellar.

## Josué

App del administrador en Next.js.

**Hecho en el PR #3:** el esqueleto (la base del PR #1, sin otro proyecto Next.js) y las pantallas del admin. Crear proyecto, bandeja de evidencias, revisión y aprobar, e informe imprimible, con el ejemplo de ZEEK. `/` es la bandeja. Entrar llama a Cavos (`network: "testnet"`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. Ese valor ya está en Vercel. El ingreso con código o Google lo dejó Esteban en el PR #14, y la dirección se guarda solo si no hay aviso. Fondear y Aprobar no firman en Stellar. El 29 de septiembre, hora de Costa Rica, dejó `.env.example` (PR #20, 9:16 a.m.), las pruebas contra Postgres local (PR #27, 9:44 a.m.), la configuración del entorno con la salvaguarda de la base (PR #22, 9:50 a.m.) y Postgres local con la semilla en pendiente (PR #21, 10:03 a.m.). A las 10:10 a.m. dejó el inventario del esquema (PR #24), a las 10:13 a.m. el cruce de solo lectura (PR #25), a las 10:14 a.m. los avisos claros de Entrar (PR #28) y a las 10:45 a.m. la verificación del JWT (PR #23). Sin `CAVOS_JWT_JWK` ni `CAVOS_JWKS_URL` no hay sesión.

**Sigue con:** conectar la bandeja, la revisión y el informe a las rutas de Esteban, ya en `main`, y conectar Fondear y Aprobar al módulo de Sebas: `POST /api/firma`, `signXdr` en el navegador y `POST /api/firma/enviar`. El envío devuelve el hash y no lo guarda en la tarea. Pedir otra foto ya borra el veredicto (PR #21). Entrar ya avisa en claro (PR #28). Un 401 o un 403 al subir evidencia ya no se guarda como ejemplo (PR #23). El PR #18, todavía abierto, arregla el regreso de Google. El 30 de septiembre, subir a 16.3.7 cuando salga el parche.

El guion del evento de ZEEK se cierra cuando el flujo completo ya existe. Raúl prepara las cuentas y Sebas el pago en vivo.

**Listo cuando:** un admin puede crear el proyecto, ver la recomendación, aprobar y abrir el informe. Las pantallas ya se abren con el ejemplo. La firma ya está en el servidor; falta llamarla desde Fondear y Aprobar.

## Raúl

App del integrante y preparación de las cuentas del demo.

**Hecho en el PR #1:** Mis tareas, Subir evidencia (trabajo y reembolso en la misma pantalla) y `/cuentas`. Llaman a las rutas de Esteban y, si no responden, muestran el ejemplo de ZEEK.

**Sigue con:** las cuatro identidades de Cavos (organizador y tres voluntarios). `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel. Cada una muestra su dirección `G…` y abre la trustline de USDC. El ingreso pide el código del correo (PR #14 de Esteban). Desde el PR #23, subir la foto exige la cookie de sesión y solo la acepta el integrante de esa tarea. La semilla del PR #21 deja las tareas en pendiente, así Subir evidencia sigue disponible. Sebas solo confirma que sirvan para cobrar. No tomes el escrow ni las pantallas del admin.

**Listo cuando:** un integrante ve su tarea, sube una foto y esa evidencia aparece en el panel de revisión.

El orden completo de los cinco está en [PLAN.md](PLAN.md).
