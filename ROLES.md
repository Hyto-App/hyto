# Roles de Hyto

Cerrado el 27 de septiembre de 2026. Equipo de 5. Entrega de la hackathon: 5 de octubre de 2026, 4:00 p.m. Meetup: 30 de septiembre de 2026, TEC Cartago. Demo en Stellar testnet.

Este archivo es el contexto de trabajo para la IA de cada integrante. Léelo junto con [STACK.md](STACK.md). Actúa solo dentro del rol de la persona que te está usando. Si una tarea es de otra persona, déjala escrita y no la implementes.

## Estado al 29 de septiembre de 2026

| Pieza | Estado | Dueño |
|---|---|---|
| Base Next.js 16.3.6, layout, CSS, `next.config.ts` | En `main` (PR #1, `3a000e0`) | Raúl |
| Mis tareas, Subir evidencia, `/cuentas` | En `main`, con datos de ejemplo de ZEEK | Raúl |
| Cuatro cuentas de Cavos | Pantalla lista. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel. El login real lo toma Esteban | Raúl |
| Esqueleto y admin: crear proyecto, bandeja, revisión y aprobar, informe, botón Entrar | Hecho en `main` (PR #3, `b2451a6`), sobre la base del PR #1. Ejemplo de ZEEK. `/` es la bandeja. Fondear y Aprobar no firman: el módulo ya está y esos botones no lo llaman | Josué |
| Auditoría del integrante | En `main` (PR #4, `bc94a9c`), el 28 de septiembre a las 3:47 p.m., hora de Costa Rica. No mezcla tareas, no inventa US$0 ni corre el día, y cierra fallos de la cámara y de la trustline | Josué (coautor) |
| Backend: rutas, Neon, Blob, revisión con `qwen/qwen3.8-27b` e ingreso con Cavos. El rol no se dibuja. Varias rutas no piden sesión. El JWT no se verifica | En el código (PR #14, `ce9ff7c`) | Esteban |
| Módulo de firma y script del hito | En `main` (PR #8, `ae10a9e`), el 28 de septiembre a las 3:48 p.m., hora de Costa Rica. No hay hash de pago en el repo | Sebas |
| Acta | Pendiente. Solo entra después de un pago en USDC. El `appId` de Cavos ya está en Vercel | Sebas |
| Poppins y `--acento` `#B7EE34` | En `main` (PR #7, `cff4512`), el 28 de septiembre a las 2:58 p.m., hora de Costa Rica | Abdiel |
| `LAYA_URL` | Pendiente | Abdiel |

En Entrar, la dirección se guarda en pantalla solo cuando el aviso de error no existe. No hay script `lint`. Cómo correr y el contrato de la API: [README.md](README.md) y [PLAN.md](PLAN.md).

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

Ese guion es el objetivo. Hoy se recorre Mis tareas y subir la foto contra la API, con vuelta al ejemplo si falla o si pasan 4 segundos. El admin (crear proyecto, bandeja, revisión e informe) sigue en el ejemplo de ZEEK, en `localStorage`: tres trabajos de US$20 y un reembolso de hasta US$15. El módulo de firma ya está (PR #8). Fondear y Aprobar no lo llaman. La revisión con IA existe en el servidor y guarda el veredicto. La pantalla no lo muestra. Un pago en USDC no está. La pantalla no dice "Organizador" ni "Voluntario". No hay vista en vivo entre los dos roles.

**Objetivo de la pantalla.** El encabezado dice "Organizador" o "Voluntario". Lo que hace uno, el otro lo ve. La IA reacciona al rol. Eso está pendiente. No hay websocket, ni SSE, ni consulta repetida. La IA solo corre al subir la evidencia y en `/api/revision/[id]`.

## Equipo

| Persona | Rol | Es dueño de |
|---|---|---|
| Abdiel Cole | UX, UI, frontend y Laya | Toda la estética y el frontend. Poppins y lima ya en `main` (PR #7). Su Figma es la fuente de verdad. Sigue `LAYA_URL` |
| Esteban | Backend | Todo el backend: `/api/tareas`, `/api/evidencias`, Neon (usuarios con email → rol, migraciones y seed), el login real de Cavos contra la base, Vercel Blob, veredicto de la IA y el informe |
| Sebas | Escrow y wallet | Trustless Work, Cavos (`NEXT_PUBLIC_CAVOS_APP_ID`, ya en Vercel) y la liberación del USDC. El módulo y el script ya están (PR #8) |
| Josué | App del admin | Pantallas del organizador, ya en `main` (PR #3): crear proyecto, bandeja, revisión e informe |
| Raúl | Flujo del voluntario, menos el diseño | Mis tareas y subir evidencia ya en `main` (PR #1). Lo visual lo define Abdiel. Sigue la sesión, la wallet propia y el veredicto en pantalla |

Abdiel no bloquea el código. El orden de cada lista está en [PLAN.md](PLAN.md). Cada quien avanza con datos de prueba propios y solo espera el dato marcado ahí como encuentro. Nadie sube directo a `main`: el trabajo es en la nube, cada entrega es una rama `nombre/tarea` y un pull request. La rama nueva sale de `main` actualizado.

Raúl es nuevo en hackatones. Su parte se ve en el demo y tiene revisión al lado: Josué en la app, Sebas en las wallets. No toma el escrow ni la arquitectura.

## Abdiel Cole

Dueño de toda la estética, la UX, la UI y el frontend. También la marca, las redes, el pitch y Laya.

Abdiel tiene libertad completa de creatividad y edición sobre la UI/UX y el frontend. Puede reorganizar, rediseñar y mover cualquier elemento visual a su criterio.

La app de hoy es un demo funcional. El trabajo es pulirla hasta que se vea como producto. El diseño se apoya en el flujo que ya existe. Su Figma es la fuente de verdad de UX y UI. Josué y Raúl construyen encima de ese Figma.

La etiqueta de rol, la sincronía en vivo y la IA según el rol están pendientes, y son de otros. Abdiel las diseña. No asume que ya funcionan. Hoy el encabezado dice "Hyto". El voluntario se elige con botones. El admin lee un ejemplo local.

**Empieza por:** el Figma sobre las pantallas que ya están, con la entrada en un solo botón.

- Inicio del admin: tres números (presupuesto, pagado, pendiente) y la bandeja de lo que falta aprobar.
- Crear proyecto: nombre, tareas con monto y un botón para fondear. Sin configurar roles del contrato en la pantalla.
- Mis tareas, en el móvil: una tarea, un monto, un estado. Ya está en `main`.
- Subir evidencia: cámara y enviar. El reembolso muestra monto y fecha ya rellenados. Ya está en `main`; monto y fecha salen cuando la API los trae.
- Revisión: foto, tarjeta corta de la IA y un botón Aprobar.
- Informe: presupuesto contra gasto, y enlaces de "Ver pago" y de la credencial si ya existe.

La app se ve como Ramp, no como una billetera. No pidas frase semilla, extensión ni firma a la vista. La primera vez es entrar con Cavos y caer en la tarea o en la bandeja. Fondo claro, Poppins, un acento, una acción principal por pantalla.

La tipografía y el color ya están en `main` (PR #7): Poppins 400, 500 y 600, `--acento` `#B7EE34` y `--sobre-acento` `#08090C` para el texto del botón primario. Fondo claro, mucho espacio, un botón primario por pantalla. No uses la palabra escrow, XDR, trustline ni Soroban en la interfaz.

Laya corre en su servidor de escritorio, el mismo de Argus, en un entorno de Python aparte y un puerto propio: `pip install "laya[serve]"`, checkpoint `laya-multilingual`. Durante el demo esa máquina queda encendida y alcanzable. La URL pública sale de Tailscale Funnel y va en `LAYA_URL`. No se despliega Laya en Vercel. Esa URL todavía no está.

**Listo cuando:** el demo se ve como producto, el Figma sigue siendo la referencia, y el ensayo puede llamar a `LAYA_URL`. Josué arma el admin. Raúl arma el flujo del voluntario. El diseño es de Abdiel.

## Esteban

Backend. Buen nivel en servidor. Es dueño de todo el backend.

**Empieza por:** lo que el código todavía deja abierto. Los correos de la semilla son `@demo.hyto` y no reciben el código de Cavos. `correoDelToken` decodifica el JWT y no verifica la firma. No hay `middleware.ts`. `GET` y `POST /api/proyectos`, `GET` y `POST /api/revision/[id]`, las rutas de evidencias, `GET /api/tareas` y `GET /api/informe` no piden sesión. La respuesta de la revisión no trae `origen` ni el texto del modelo. Ninguna ruta escribe `hashPago`. El esquema no tiene `contractId`.

Neon, Blob, las rutas, la semilla de ZEEK y el ingreso con CavosAuth ya están en el repo (PR #14). La foto va a Blob y en Neon queda el identificador.

La revisión corre en el servidor. El modelo es `qwen/qwen3.8-27b` en Groq (`https://api.groq.com/openai/v1`, `GROQ_API_KEY`). Describe la foto y, si es una factura, saca monto y fecha. Después llama a Laya por `LAYA_URL`, si esa variable existe. Laya devuelve `choice`, `noul` y `score`. Sin `LAYA_URL`, el stub deja el trabajo en `parcial`. El reembolso queda en `cumplió` solo si hay monto y fecha dentro del tope. El código compara el tope. Si falta la clave o un modelo falla, responde el guion fijo y no deja registro. La columna del texto se llama `texto_scout`. El modelo no es Llama 4 Scout. El comentario de `.env.example` todavía nombra a Scout.

Las pantallas del voluntario ya llaman `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id`. La forma está en [PLAN.md](PLAN.md). Si no responden en 4 segundos, la UI vuelve al ejemplo.

El diagnóstico del 28 de septiembre está en [PLAN.md](PLAN.md). Esa tabla es del commit `ade63ce`. No describe el código de hoy.

### Pruebas de punta a punta (2026-09-28)

El 28 de septiembre se recorrió `main` (`ade63ce`) en local y en https://hyto.vercel.app. La bandeja, Mis tareas, la revisión, el informe y subir una foto se abren con el ejemplo de ZEEK. `GET /api/tareas` y `POST /api/evidencias` responden 404. Entrar y Preparar cuentas, en el sitio, fallan con `registry lookup skipped: no login token`. `npm test`: 42 ok, 0 fallos. `npm run build` pasa en Next.js 16.3.6. La tabla está en [PLAN.md](PLAN.md).

Errores del 28 de septiembre (`ade63ce`). El detalle está en [PLAN.md](PLAN.md). En `ce9ff7c` las rutas ya existen, Entrar ya usa CavosAuth y `/api/firma` ya pide la sesión del organizador. El 401 de Trustless Work, el admin en `localStorage` y Fondear y Aprobar sin firma siguen abiertos.

1. **Alta.** `lib/integrante/rutas.ts:122`, `:149`, `:155`. Faltan `/api/tareas` y `/api/evidencias`. Las tres llamadas responden 404 y la UI usa ZEEK. Arreglo: las rutas, Neon y Blob.
2. **Alta.** `components/admin/Entrar.tsx:31`, `lib/integrante/preparar.ts:27`. `Cavos.connect` sin `auth`. En el sitio: `registry lookup skipped: no login token`. Arreglo: CavosAuth, pasar `auth` y leer el rol por email en Neon.
3. **Alta.** `app/api/firma/route.ts:5`, `app/api/firma/enviar/route.ts:4`. POST sin sesión. Arreglo: exigir la sesión antes de preparar o enviar.
4. **Alta.** `lib/escrow/modulo.ts:41`. En el sitio la clave de Trustless Work responde 401 `Invalid API key`. Arreglo: una clave válida, solo en el servidor.
5. **Alta.** `components/admin/CrearProyecto.tsx:33`. Fondear no llama a `/api/firma`. Arreglo: XDR, firma en el navegador y `/api/firma/enviar`.
6. **Alta.** `components/admin/Revision.tsx:22`. Aprobar solo marca `pagado` en el navegador. Arreglo: la misma cadena, una firma.
7. **Alta.** `components/admin/Bandeja.tsx:16`, `Informe.tsx:14`, `Revision.tsx:17`, `lib/admin/vista.ts:150`. El admin lee `localStorage` y `ejemplo` está fijo en `true`. Arreglo: leer la API.
8. **Alta.** `lib/admin/memoria.ts:4`, `lib/integrante/almacen.ts:3`. Dos almacenes. El informe quedó en pagado US$32.40 y Mis tareas en pendiente. Arreglo: una fuente en Neon.
9. **Media.** `lib/escrow/limite.ts:6` y `:23`. El tope usa el primer `X-Forwarded-For` y un `Map` del proceso. Otra IP salta el 429. Arreglo: IP de Vercel y contador compartido.
10. **Media.** `lib/escrow/limite.ts:34`. Sin `Content-Length`, un cuerpo de unos 210000 bytes no da 413. Arreglo: medir el cuerpo leído.
11. **Media.** `app/api/firma/enviar/route.ts:13`. Un XDR que no es transacción sigue de largo. Arreglo: parsearlo con el SDK y devolver 400.
12. **Media.** `lib/escrow/modulo.ts:60`. El 401 de Trustless Work llega al cliente como `Invalid API key`. Arreglo: aviso fijo en 401 y 403.
13. **Media.** `lib/admin/vista.ts:77`, `components/admin/Revision.tsx:81`. Pedir otra foto deja la pastilla en "parcial". Arreglo: limpiar el veredicto.
14. **Media.** `components/admin/Entrar.tsx:46`. `setDireccion` corre aunque el guardado falle. Arreglo: solo si `guardado.aviso` es null.
15. **Baja.** `lib/escrow/cuerpos.ts:231`. La dirección no lleva checksum. Arreglo: `StrKey`.
16. **Baja.** `lib/integrante/almacen.ts:42`. `setItem` sin `try`. Un fallo se ve como "No se pudo enviar." Arreglo: el aviso que ya usa el admin.

El informe sale de estos datos más el hash que guarde Sebas. Esteban no firma transacciones y no pone la clave de Trustless Work en el cliente.

**Listo cuando:** Josué y Raúl pueden guardar un proyecto y una evidencia llamando a su API, y Entrar resuelve el rol por email en Neon.

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

**Hecho en el PR #3:** el esqueleto (la base del PR #1, sin otro proyecto Next.js) y las pantallas del admin. Crear proyecto, bandeja de evidencias, revisión y aprobar, e informe imprimible, con el ejemplo de ZEEK. `/` es la bandeja. Entrar llama a Cavos (`network: "testnet"`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. Ese valor ya está en Vercel. El código ya entra con CavosAuth. El encabezado no dice el rol. Fondear y Aprobar no firman en Stellar.

**Empieza por:** leer la bandeja, la revisión y el informe desde `GET /api/informe` y `GET /api/revision/:id`. Hoy esas pantallas usan `hyto-admin` y el ejemplo queda fijo. En el encabezado, poner "Organizador". Consultar de nuevo la API para ver lo que sube el voluntario. No hay otra sincronía en el código. Después, Fondear y Aprobar llaman a `POST /api/firma`, el navegador firma con `signXdr` y `POST /api/firma/enviar` manda el XDR. El 30 de septiembre, subir a 16.3.7 cuando salga el parche. En Entrar, `setDireccion` ya espera a que el guardado no traiga aviso.

El guion del evento de ZEEK se cierra cuando el flujo completo ya existe. Raúl prepara las cuentas y Sebas el pago en vivo.

**Listo cuando:** un admin puede crear el proyecto, ver la recomendación, aprobar y abrir el informe. Las pantallas ya se abren con el ejemplo. La firma ya está en el servidor; falta llamarla desde Fondear y Aprobar.

## Raúl

App del integrante y preparación de las cuentas del demo.

**Hecho en el PR #1:** Mis tareas, Subir evidencia (trabajo y reembolso en la misma pantalla) y `/cuentas`. Llaman a las rutas de Esteban. Si no responden, o si pasan de 4 segundos, muestran el ejemplo de ZEEK. El voluntario se elige con botones. La dirección vive en `localStorage`. Al subir, la wallet se manda solo si la tarea ya trae `walletCobro`.

**Empieza por:** confirmar con el equipo el alcance. Es lo que no es billetera, backend ni IA, y lo que no es el frontend de Abdiel. Lo visual lo define el Figma de Abdiel. En el flujo, tres pendientes: el voluntario sale de la sesión, se manda la wallet de esa persona, y después de subir se muestra el veredicto guardado. El corte de 4 segundos lo ve con Esteban. Las cuatro cuentas de Cavos siguen en `/cuentas`. `NEXT_PUBLIC_CAVOS_APP_ID` ya está. Cada una muestra `G…` y abre la trustline de USDC. Los correos que sí reciban el código los deja Esteban. Sebas solo confirma que sirvan para cobrar. No tomes el escrow ni el diseño del admin.

**Listo cuando:** un voluntario entra con su sesión, ve su tarea, sube una foto, ve el veredicto y esa evidencia aparece en el panel de revisión.

El orden completo de los cinco está en [PLAN.md](PLAN.md).
