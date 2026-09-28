# Roles de Hyto

Cerrado el 27 de septiembre de 2026. Equipo de 5. Entrega de la hackathon: 5 de octubre de 2026, 4:00 p.m. Meetup: 30 de septiembre de 2026, TEC Cartago. Demo en Stellar testnet.

Este archivo es el contexto de trabajo para la IA de cada integrante. Léelo junto con [STACK.md](STACK.md). Actúa solo dentro del rol de la persona que te está usando. Si una tarea es de otra persona, déjala escrita y no la implementes.

## Estado al 28 de septiembre de 2026

| Pieza | Estado | Dueño |
|---|---|---|
| Base Next.js 16.3.6, layout, CSS, `next.config.ts` | En `main` (PR #1, `3a000e0`) | Raúl |
| Mis tareas, Subir evidencia, `/cuentas` | En `main`, con datos de ejemplo de ZEEK | Raúl |
| Cuatro cuentas de Cavos | Pantalla lista. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel. El login real lo toma Esteban | Raúl |
| Esqueleto y admin: crear proyecto, bandeja, revisión y aprobar, informe, botón Entrar | Hecho en `main` (PR #3, `b2451a6`), sobre la base del PR #1. Ejemplo de ZEEK. `/` es la bandeja. Fondear y Aprobar no firman: el módulo ya está y esos botones no lo llaman | Josué |
| Auditoría del integrante | En `main` (PR #4, `bc94a9c`), el 28 de septiembre a las 3:47 p.m., hora de Costa Rica. No mezcla tareas, no inventa US$0 ni corre el día, y cierra fallos de la cámara y de la trustline | Josué (coautor) |
| Todo el backend: `/api/tareas`, `/api/evidencias`, Neon (usuarios, email → rol, migraciones y seed), login real de Cavos y revisión con IA | Pendiente | Esteban |
| Módulo de firma y script del hito | En `main` (PR #8, `ae10a9e`), el 28 de septiembre a las 3:48 p.m., hora de Costa Rica. No hay hash de pago en el repo | Sebas |
| Acta | Pendiente. Solo entra después de un pago en USDC. El `appId` de Cavos ya está en Vercel | Sebas |
| Poppins y `--acento` `#B7EE34` | En `main` (PR #7, `cff4512`), el 28 de septiembre a las 2:58 p.m., hora de Costa Rica | Abdiel |
| `LAYA_URL` | Pendiente | Abdiel |

Queda un detalle menor de auditoría: en `components/admin/Entrar.tsx:46`, `setDireccion` solo debe llamarse cuando `guardado.aviso` es null, para que se pueda reintentar el guardado.

No hay script `lint`. Cómo correr y el contrato de la API: [README.md](README.md) y [PLAN.md](PLAN.md).

## Producto

Hyto es un control de gastos y pagos por hitos para equipos. El organizador deposita el presupuesto en un escrow de Trustless Work y lo divide en tareas. Cada integrante sube evidencia. Una IA recomienda cumplió, parcial o insuficiente. Un administrador aprueba. El hito se libera y el pago llega en USDC. Al cerrar, Hyto genera un informe con presupuesto contra gasto, evidencia y el enlace en blockchain de cada pago.

La IA de revisión nunca firma ni mueve dinero. El pago de un hito es todo o nada.

Cada hito es trabajo o reembolso, y los dos se suben igual: una foto. Trabajo: foto de lo hecho. Reembolso: foto de la factura o del comprobante. Scout describe las dos. En la factura, además, saca monto y fecha, y el código los compara con el tope. Laya responde las tres preguntas en los dos casos. La pantalla de subir y la de aprobar no cambian.

## Demo que hay que poder mostrar

Evento de ZEEK, montos de ejemplo:

1. El organizador crea 3 tareas de voluntariado y 1 reembolso de comida.
2. Fondea el escrow en testnet. El dashboard muestra el presupuesto.
3. Voluntario 1 sube evidencia completa. La IA dice cumplió. El admin aprueba. Llega USDC.
4. Voluntario 2 sube evidencia incompleta. La IA dice parcial. El admin pide más evidencia o aprueba el monto completo.
5. Voluntario 3 no sube evidencia. Sigue pendiente y el dinero sigue en el escrow.
6. Reembolso: foto del comprobante, la IA revisa, se aprueba y se paga.
7. Informe con presupuesto contra gasto, evidencia y enlaces de Stellar.

De eso, hoy se recorre en local Mis tareas, subir la foto y el admin (crear proyecto, bandeja de evidencias, revisión y el informe imprimible), con el ejemplo de ZEEK (tres trabajos de US$20 y un reembolso de hasta US$15). El módulo de firma ya está (PR #8). Fondear y Aprobar no lo llaman y no firman en Stellar. La revisión con IA y un pago en USDC no están.

## Equipo

| Persona | Rol | Es dueño de |
|---|---|---|
| Abdiel Cole | UX, marca y el proceso de Laya | Poppins y lima ya en `main` (PR #7). Sigue Laya encendida en su PC Windows |
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
- Informe: presupuesto contra gasto, y enlaces de "Ver pago" y de la credencial si ya existe.

La app se ve como Ramp, no como una billetera. No pidas frase semilla, extensión ni firma a la vista. La primera vez es entrar con Cavos y caer en la tarea o en la bandeja. Fondo claro, Poppins, un acento, una acción principal por pantalla.

La tipografía y el color ya están en `main` (PR #7): Poppins 400, 500 y 600, `--acento` `#B7EE34` y `--sobre-acento` `#08090C` para el texto del botón primario. Fondo claro, mucho espacio, un botón primario por pantalla. No uses la palabra escrow, XDR, trustline ni Soroban en la interfaz.

Laya corre en su computadora Windows: `pip install laya`, checkpoint `laya-multilingual`. Durante el demo esa PC queda encendida y alcanzable. La URL va en `LAYA_URL`. No se despliega Laya en Vercel. Esa URL todavía no está.

**Listo cuando:** el resto puede construir esas pantallas sin inventarse el flujo. Josué usa las de admin. Raúl ya usa las del integrante.

## Esteban

Backend. Buen nivel en servidor. Es dueño de todo el backend.

**Empieza por:** Drizzle sobre Neon (`DATABASE_URL`) con proyecto, tarea, evidencia y veredicto, y la tabla de usuarios (el email mapea al rol), con migraciones y seed. La foto se sube a Vercel Blob (`BLOB_READ_WRITE_TOKEN`) y en Neon se guarda el identificador. Nada de eso vive en el disco de Vercel. Ninguna de esas piezas está en el repo.

La revisión corre en una ruta de Vercel. Llama 4 Scout en Groq (`meta-llama/llama-4-scout-17b-16e-instruct`, base `https://api.groq.com/openai/v1`, `GROQ_API_KEY`) describe la foto leída desde Blob y, si es una factura, saca monto y fecha. Después la ruta llama a Laya en la PC Windows de Abdiel, por `LAYA_URL`. Laya devuelve `choice`, `noul` y `score`. El código compara el tope de dinero y arma `cumplió`, `parcial` o `insuficiente`. La justificación es el texto de Scout más esas tres respuestas. Si falta la clave, la PC de Abdiel está apagada o un modelo falla, responde el guion fijo. La base es Neon y las fotos están en Vercel Blob.

Las pantallas ya llaman `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id`. La forma exacta está en [PLAN.md](PLAN.md). Si no respondes así, la UI se queda en el ejemplo.

El login real de Cavos también es suyo y se conecta a esa base. Hoy el botón Entrar de https://hyto.vercel.app falla. El diagnóstico, del 28 de septiembre de 2026, está en [PLAN.md](PLAN.md).

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

**Sigue con:** las rutas de Esteban, y conectar Fondear y Aprobar al módulo de Sebas, ya en `main`: `POST /api/firma`, `signXdr` en el navegador y `POST /api/firma/enviar`. El 30 de septiembre, subir a 16.3.7 cuando salga el parche. Antes, el detalle de `components/admin/Entrar.tsx:46`: `setDireccion` solo cuando `guardado.aviso` es null, para poder reintentar el guardado.

El guion del evento de ZEEK se cierra cuando el flujo completo ya existe. Raúl prepara las cuentas y Sebas el pago en vivo.

**Listo cuando:** un admin puede crear el proyecto, ver la recomendación, aprobar y abrir el informe. Las pantallas ya se abren con el ejemplo. La firma ya está en el servidor; falta llamarla desde Fondear y Aprobar.

## Raúl

App del integrante y preparación de las cuentas del demo.

**Hecho en el PR #1:** Mis tareas, Subir evidencia (trabajo y reembolso en la misma pantalla) y `/cuentas`. Llaman a las rutas de Esteban y, si no responden, muestran el ejemplo de ZEEK.

**Sigue con:** las cuatro identidades de Cavos (organizador y tres voluntarios). `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel. Cada una muestra su dirección `G…` y abre la trustline de USDC. El login real contra Neon es de Esteban. Sebas solo confirma que sirvan para cobrar. No tomes el escrow ni las pantallas del admin.

**Listo cuando:** un integrante ve su tarea, sube una foto y esa evidencia aparece en el panel de revisión.

El orden completo de los cinco está en [PLAN.md](PLAN.md).
