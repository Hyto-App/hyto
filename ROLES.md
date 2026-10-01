# Roles de Hyto

Cerrado el 27 de septiembre de 2026. Equipo de 5. Entrega de la hackathon: 5 de octubre de 2026, 4:00 p.m. Meetup: 30 de septiembre de 2026, TEC Cartago. Demo en Stellar testnet.

Este archivo reparte el trabajo. El contexto del código al 1 de octubre de 2026 (`3770819`, 11:25 a.m., hora de Costa Rica) está en [AGENTS.md](AGENTS.md). Léelo junto con [STACK.md](STACK.md). Los dueños de la auditoría del 30 de septiembre son sugerencias: quien tome una tarea de otra persona deja nota en el buzón.

La lista de errores de más abajo es la auditoría del 28 de septiembre sobre `ade63ce`. Varios ya no describen `main`. No los vuelvas a implementar sin mirar el código.

## Estado al 1 de octubre de 2026

`main` está en `3770819`. Raúl (Milasur) entró con dos arreglos a las 2:43 a.m. Josué Valles los mergeó y, a las 11:25 a.m., mergeó el lenguaje llano del pago (PR #77).

| Pieza | Estado | Dueño |
|---|---|---|
| Lenguaje llano del pago | En `main` (PR #77, `3770819`), 1 de octubre de 2026, 11:25 a.m., hora de Costa Rica. **Lock budget**, **Finish locking**, **Approve and pay** solo con el presupuesto bloqueado, **View on blockchain** | Josué |
| Reanudar el fondeo si desplegar sale bien y fondear falla | En `main` (PR #67, `2fa3bd5`), 2:43 a.m. Desde el PR #77 el botón se llama **Finish locking** | Raúl |
| Avisos de servidor en inglés | En `main` (PR #68, `b0926f3`), el mismo momento. Una prueba falla si un aviso nuevo vuelve en español | Raúl |
| Veredicto de Laya por el índice de `probabilities` | En `main` (PR #59). Cubre lo que pedía el PR #15 | Josué |
| Origen de la revisión en pantalla | La revisión y el informe muestran **AI recommendation**, **Sample recommendation** o **Review failed**. Un fallo de Groq o de Laya queda en `error`, no en el guion fijo | Abdiel, ya en el código; falta Laya en producción |
| Pago real en testnet y Acta | Pendiente. Sin hash no hay Acta | Josué (checklist). Sebastián sigue el Acta después de ese pago |
| `LAYA_URL` y Groq en producción | Pendiente. Es el paso principal | Abdiel |
| Trustline patrocinada, preflight, `contractId` en la base, prueba de la wallet, audiencia del JWT en Vercel | Pendiente. Son los P0 de la auditoría del 30 de septiembre | Josué |
| SVG, cabeceras y JWT cerrado en producción | Pendiente | Esteban |
| Prueba de `lib/api/rutas.test.ts` que toca Neon, y GitHub Actions | Pendiente | Sebastián |
| Monto de reembolso confirmado antes de desplegar | Abierto, PR #69 | Raúl |
| Foto de evidencia solo con cámara | Abierto, PR #72 | Raúl |
| Next.js 16.3.7 | No entró. `package.json` sigue en 16.3.6 | Josué |

## Estado al 28 de septiembre de 2026

| Pieza | Estado | Dueño |
|---|---|---|
| Base Next.js 16.3.6, layout, CSS, `next.config.ts` | En `main` (PR #1, `3a000e0`) | Raúl |
| Mis tareas, Subir evidencia, `/cuentas` | En `main`, con datos de ejemplo de ZEEK | Raúl |
| Cuatro cuentas de Cavos | Pantalla lista. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel. El login real lo toma Esteban | Raúl |
| Esqueleto y admin: crear proyecto, bandeja, revisión, informe, botón Entrar | Hecho en `main` (PR #3, `b2451a6`). El 28, Fondear y Aprobar no firmaban. En `3770819` la revisión firma con **Lock budget** y **Approve and pay**. Si el fondeo falla después del despliegue, ofrece **Finish locking** (PR #67 y PR #77) | Josué, y Raúl en el PR #67 |
| Auditoría del integrante | En `main` (PR #4, `bc94a9c`), el 28 de septiembre a las 3:47 p.m., hora de Costa Rica. No mezcla tareas, no inventa US$0 ni corre el día, y cierra fallos de la cámara y de la trustline | Josué (coautor) |
| Backend: rutas, Neon, Blob, revisión con IA e ingreso con Cavos | En el código. Desde el PR #41, un correo nuevo entra como voluntario. Sin Groq queda el guion fijo; sin `LAYA_URL` queda el stub. Hacer que la IA funcione es el paso principal | Esteban |
| Módulo de firma y script del hito | En `main` (PR #8, `ae10a9e`), el 28 de septiembre a las 3:48 p.m., hora de Costa Rica. No hay hash de pago en el repo | Sebas |
| Acta | Pendiente. Solo entra después de un pago en USDC. El `appId` de Cavos ya está en Vercel | Sebas |
| Poppins y `--acento` `#B7EE34` | En `main` (PR #7, `cff4512`), el 28 de septiembre a las 2:58 p.m., hora de Costa Rica | Abdiel |
| `LAYA_URL` | Pendiente | Abdiel |

Queda un detalle menor de auditoría: en `components/admin/Entrar.tsx:46`, `setDireccion` solo debe llamarse cuando `guardado.aviso` es null, para que se pueda reintentar el guardado.

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

De eso, se recorre Mis tareas, subir la foto y el admin, con el ejemplo de ZEEK si la API no responde. En `3770819` la revisión firma en Stellar. Si desplegar sale bien y fondear falla, la pantalla ofrece **Finish locking** (PR #67 y PR #77). **Approve and pay** espera a que el presupuesto esté bloqueado. Falta un pago real en testnet. La revisión con IA está escrita: sin `GROQ_API_KEY`, o si Groq o Laya fallan, el origen queda en `error` y se muestra en pantalla. Sin `LAYA_URL`, y con Groq respondiendo, usa el stub. Hacer que esa IA funcione es el paso principal.

## Equipo

| Persona | Rol | Es dueño de |
|---|---|---|
| Abdiel Cole | UX, marca y el proceso de Laya | Poppins y lima ya en `main` (PR #7). Sigue Laya encendida en su servidor |
| Esteban | Backend | Todo el backend: `/api/tareas`, `/api/evidencias`, Neon (usuarios con email → rol, migraciones y seed), el login real de Cavos contra la base, Vercel Blob, veredicto de la IA y el informe |
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
- Informe: presupuesto contra gasto, y enlaces de **View on blockchain** y de la credencial si ya existe.

La app se ve como Ramp, no como una billetera. No pidas frase semilla, extensión ni firma a la vista. La primera vez es entrar con Cavos y caer en la tarea o en la bandeja. Fondo claro, Poppins, un acento, una acción principal por pantalla.

La tipografía y el color ya están en `main` (PR #7): Poppins 400, 500 y 600, `--acento` `#B7EE34` y `--sobre-acento` `#08090C` para el texto del botón primario. Fondo claro, mucho espacio, un botón primario por pantalla. No uses la palabra escrow, XDR, trustline ni Soroban en la interfaz.

Laya corre en su servidor de escritorio, el mismo de Argus, en un entorno de Python aparte y un puerto propio: `pip install "laya[serve]"`, checkpoint `laya-multilingual`. Durante el demo esa máquina queda encendida y alcanzable. La URL pública sale de Tailscale Funnel y va en `LAYA_URL`. No se despliega Laya en Vercel. Esa URL todavía no está.

**Listo cuando:** el resto puede construir esas pantallas sin inventarse el flujo. Josué usa las de admin. Raúl ya usa las del integrante.

## Esteban

Backend. Buen nivel en servidor. Es dueño de todo el backend.

**Empieza por:** Drizzle sobre Neon (`DATABASE_URL`) con proyecto, tarea, evidencia y veredicto, y la tabla de usuarios (el email mapea al rol), con migraciones y seed. La foto se sube a Vercel Blob (`BLOB_READ_WRITE_TOKEN`) y en Neon se guarda el identificador. Nada de eso vive en el disco de Vercel. Esas piezas ya están en el repo. El paso principal que sigue, en su parte, es que la revisión mire la foto de verdad y que Laya responda, en vez del guion fijo y del stub.

La revisión corre en una ruta de Vercel. Qwen 3.8 27B en Groq (`qwen/qwen3.8-27b`, base `https://api.groq.com/openai/v1`, `GROQ_API_KEY`) describe la foto leída desde Blob y, si es una factura, saca monto y fecha. Después la ruta llama a Laya en el servidor de Abdiel, por `LAYA_URL`. Laya devuelve `choice`, `noul` y `score`. El código compara el tope de dinero y arma `cumplió`, `parcial` o `insuficiente`. La justificación es el texto de Scout más esas tres respuestas. Si falta la clave, el servidor de Abdiel está apagado o un modelo falla, responde el guion fijo. La base es Neon y las fotos están en Vercel Blob.

Las pantallas ya llaman `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id`. La forma exacta está en [PLAN.md](PLAN.md). Si no respondes así, la UI se queda en el ejemplo.

El login real de Cavos también es suyo y se conecta a esa base. El diagnóstico del 28 de septiembre, cuando Entrar fallaba, está en [PLAN.md](PLAN.md). En `3770819` el ingreso verifica el JWT y, si el correo no existe, lo crea como voluntario. Lo que sigue en su lista, sugerido el 30 de septiembre, es la seguridad: tipos de imagen, cabeceras, JWT cerrado en producción, el tope de subida y el hash del token.

### Pruebas de punta a punta (2026-09-28)

El 28 de septiembre se recorrió `main` (`ade63ce`) en local y en https://hyto.vercel.app. La bandeja, Mis tareas, la revisión, el informe y subir una foto se abren con el ejemplo de ZEEK. `GET /api/tareas` y `POST /api/evidencias` responden 404. Entrar y Preparar cuentas, en el sitio, fallan con `registry lookup skipped: no login token`. `npm test`: 42 ok, 0 fallos. `npm run build` pasa en Next.js 16.3.6. La tabla está en [PLAN.md](PLAN.md).

Errores verificados, para corregir. El detalle está en [PLAN.md](PLAN.md).

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

**Hecho en el PR #3:** el esqueleto (la base del PR #1, sin otro proyecto Next.js) y las pantallas del admin. Crear proyecto, bandeja de evidencias, revisión y aprobar, e informe imprimible, con el ejemplo de ZEEK. `/` es la bandeja. Entrar llama a Cavos (`network: "testnet"`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. Ese valor ya está en Vercel; el botón igual falla y el login real lo toma Esteban. Fondear y Aprobar no firman en Stellar.

**Hecho el 1 de octubre de 2026, a las 11:25 a.m., hora de Costa Rica:** el PR #77 deja el pago en lenguaje llano y muestra **Approve and pay** solo cuando el presupuesto ya está bloqueado.

**Sigue con:** los P0 de la auditoría del 30 de septiembre (trustline patrocinada, preflight, `contractId` en la base, prueba de la wallet, las dos variables del JWT en Vercel y el primer pago en testnet). Next.js sigue en 16.3.6. **Lock budget** y **Approve and pay** ya llaman a `POST /api/firma`, `signXdr` y `POST /api/firma/enviar`. El caso de desplegar bien y fondear mal lo cerró Raúl en el PR #67; el botón se llama **Finish locking**. Sigue abierto el PR #18, para no perder el ingreso al volver de Google.

El guion del evento de ZEEK se cierra cuando el flujo completo ya existe. Raúl prepara las cuentas y Sebas el pago en vivo.

**Listo cuando:** un admin puede crear el proyecto, ver la recomendación, aprobar en Stellar y abrir el informe. La firma ya se llama desde la revisión. Falta el pago real en testnet.

## Raúl

App del integrante y preparación de las cuentas del demo.

**Hecho en el PR #1:** Mis tareas, Subir evidencia (trabajo y reembolso en la misma pantalla) y `/cuentas`. Llaman a las rutas de Esteban y, si no responden, muestran el ejemplo de ZEEK.

**Hecho el 1 de octubre de 2026, a las 2:43 a.m., hora de Costa Rica:** el PR #67 reanuda el fondeo cuando el despliegue ya quedó, y el PR #68 deja en inglés los avisos de servidor que faltaban. Los mergeó Josué Valles.

**Sigue con:** el PR #69, para que el organizador confirme el monto de un reembolso antes de desplegar, y el PR #72, para tomar la evidencia con la cámara. Las cuatro identidades de Cavos siguen en `/cuentas`. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel. La trustline patrocinada de USDC está en la lista de Josué.

**Listo cuando:** un integrante ve su tarea, sube una foto y esa evidencia aparece en el panel de revisión.

El orden completo de los cinco está en [PLAN.md](PLAN.md).
