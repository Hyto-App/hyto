# Stack de Hyto

Cerrado el 27 de septiembre de 2026 para el demo de Stellar testnet. Entrega de la hackathon: 5 de octubre de 2026, 4:00 p.m. Meetup: 30 de septiembre de 2026, TEC Cartago.

Una sola app. El dinero vive en un escrow multi-release de Trustless Work. La evidencia, la revisión con IA y el informe viven fuera de la cadena.

## Qué hay en el repo al 28 de septiembre de 2026

Instalado y en uso: Next.js 16.3.6, React 19.1.1, TypeScript, Tailwind 4, `@cavos/kit` 0.2.5. Tipografía Poppins (400, 500 y 600). `--acento` es `#B7EE34` y `--sobre-acento` es `#08090C` (PR #7 de Abdiel Cole, squash `cff4512`). Las pantallas del integrante están en `app/mis-tareas`, `app/tareas/[id]` y `app/cuentas`. El admin está en `/` (bandeja), `/proyectos/nuevo`, `/revision/[id]` e `/informe`, con datos fijos de ZEEK.

El módulo de firma está en `lib/escrow` (PR #8 de Sebastián Ceciliano Piedra, squash `ae10a9e`, el 28 de septiembre a las 3:48 p.m., hora de Costa Rica). `POST /api/firma` prepara el XDR y `POST /api/firma/enviar` lo manda a Stellar. `npm run hito` corre `scripts/hito-prueba.ts`. `@stellar/stellar-sdk` está en devDependencies para ese script; la app no lo usa en el navegador. La auditoría del integrante entró en el PR #4 (squash `bc94a9c`, a las 3:47 p.m.).

En el código, de Esteban (PR #14, `ce9ff7c`): Drizzle sobre Neon, Vercel Blob privado, `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/informe`, `POST /api/proyectos`, `GET` y `POST /api/revision/:id` y el ingreso con CavosAuth. La revisión llama a `qwen/qwen3.8-27b` en Groq. Si no hay `LAYA_URL`, usa un stub. Sin `GROQ_API_KEY`, o si Groq o Laya fallan, responde el guion fijo. El veredicto se guarda. La pantalla del admin no lo lee. El hash de pago es un campo vacío y ninguna ruta lo escribe. No hay columna `contractId`. No hay Acta. No hay ESLint. Si en Vercel faltan Neon, Blob o Groq, esas rutas responden 503.

La billetera de Cavos es real, en testnet. La dirección queda en el navegador. El módulo de Trustless Work es real y no está unido a Fondear ni a Aprobar. El 28 de septiembre la clave configurada respondió 401 en el sitio.

No hay websocket, ni SSE, ni una consulta repetida. El encabezado no dice el rol. `correoDelToken` decodifica el JWT de Cavos y no verifica la firma. No hay `middleware.ts`. Salvo `POST /api/firma` y `POST /api/firma/enviar`, las rutas de la app no piden sesión.

El contrato que esas pantallas ya esperan está en [PLAN.md](PLAN.md).

## Capas

| Capa | Decisión |
|---|---|
| App | Next.js 16 (App Router), TypeScript, Tailwind |
| Versión | **16.3.6**, la que está en `package.json`. El 30 de septiembre, subir a **16.3.7** cuando salga el parche de seguridad |
| Pantallas | Móvil para el integrante, dashboard para el admin. Tipografía Poppins. `--acento` es `#B7EE34` y el texto del botón primario es `#08090C` (`--sobre-acento`). Lo definió Abdiel en el PR #7 |
| Wallet | Cavos, paquete `@cavos/kit`. Stellar testnet. Cuenta clásica `G…`, sin extensión ni frase semilla. Docs: https://docs.cavos.xyz/docs/stellar |
| Escrow | Trustless Work **v2 multi-release**. Base: `https://beta.api.trustlesswork.com`. Las llamadas salen solo de Route Handlers |
| Dónde corre | Vercel. La única computadora que tiene que estar encendida es el servidor de Abdiel, y solo para Laya |
| Datos | Neon Postgres con Drizzle. `DATABASE_URL` en Vercel. Plan gratis. El esquema, la migración y la semilla de ZEEK ya están |
| Archivos | Vercel Blob, almacén privado. `BLOB_READ_WRITE_TOKEN` en Vercel. La foto no se escribe en la blockchain ni en el disco de la app |
| IA | `qwen/qwen3.8-27b` en Groq describe la foto. No es Llama 4 Scout. Laya corre en el servidor de Abdiel solo si hay `LAYA_URL`, y responde `choice`, `noul` y `score`. El código arma el veredicto. Si falla alguno, un guion fijo. La IA no mira el rol |
| Informe | Página imprimible en `/informe`, con enlace a [stellar.expert](https://stellar.expert/explorer/testnet) cuando el pago ya tiene hash. Hoy el ejemplo no trae hash |
| USDC | Testnet. Emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |

## Variables

Nombres nada más. Ninguna va al navegador salvo `NEXT_PUBLIC_CAVOS_APP_ID`.

| Nombre | Uso |
|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | Dashboard de Cavos. La lee `lib/integrante/identidades.ts`. Ya está en Vercel |
| `DATABASE_URL` | Neon. La leen las rutas |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob privado. La lee la subida de la foto |
| `GROQ_API_KEY` | `qwen/qwen3.8-27b`. Sin ella, la revisión usa el guion fijo. El comentario de `.env.example` todavía dice Llama 4 Scout |
| `TRUSTLESS_API_KEY` | Trustless Work. La leen `lib/escrow` y `npm run hito`. Solo en el servidor. La pone Sebas |
| `LAYA_URL` | URL pública de Laya, por Tailscale Funnel. La publica Abdiel |

La clave `TRUSTLESS_API_KEY` y la clave `cav_…` de Cavos se quedan en el servidor. `cav_…` todavía no tiene nombre en el repo. La clave de Acta, igual, y solo después de un pago en USDC.

La clave de API de Trustless Work no va al navegador. La API arma un XDR sin firmar, Cavos lo firma con `wallet.signXdr` y el servidor lo envía a Stellar. Ese ciclo es el mismo para fondear, marcar el hito, aprobar y liberar.

Cavos se conecta con `chains: ["stellar"]`, `network: "testnet"` y un `appId` del dashboard (`NEXT_PUBLIC_CAVOS_APP_ID`). El `appSalt` queda fijo en código (`hyto`): cambiarlo después crea otra wallet. La clave `cav_…` del dashboard es de servidor y no va al navegador. `/cuentas` ya usa ese `appSalt`, `testnet` y las identidades organizador y tres voluntarios; sin `appId` no llama a Cavos.

La dirección es una cuenta Stellar normal, así que puede ser rol de Trustless Work. Para cobrar USDC hace falta trustline. El relayer de Cavos, si hay `appId`, patrocina la reserva de XLM al crear la cuenta. El envío a Trustless Work es `POST /stellar/send-transaction` y rechaza fee-bumps: la cuenta que firma tiene que existir y poder pagar la comisión en XLM. Hay que comprobarlo; si el relayer no cubre ese envío, la cuenta se fondea con Friendbot.

El escrow sigue siendo la API v2 (`https://beta.api.trustlesswork.com`) más `signXdr`. No usamos el wrapper `TrustlessWorkEscrow` del kit de Cavos: ese camino no es el multi-release v2. La evidencia on-chain es un texto corto (referencia, hasta 500 caracteres). La foto se sube a Vercel Blob y en Neon se guarda su identificador. El script del hito ya está (`npm run hito`, PR #8). Si hay pago, el hash se escribiría en `lib/escrow/pago-prueba.json`; ese archivo no está en el repositorio.

La revisión son dos modelos. Ninguno firma ni mueve fondos. `GET /api/revision/:id` lee la foto desde Blob y no publica esa URL. La pantalla recibe `/api/evidencias/:id/foto`.

1. **Qwen 3.8 27B** describe la imagen. Groq, modelo `qwen/qwen3.8-27b`, base `https://api.groq.com/openai/v1`, clave `GROQ_API_KEY`. El código no llama a `meta-llama/llama-4-scout-17b-16e-instruct`. Una imagen, leída desde Blob. Devuelve un texto corto y, si es una factura, el monto y la fecha.
2. **Laya** decide sobre ese texto. Corre en el servidor de Abdiel, en un entorno de Python aparte (`pip install "laya[serve]"`, checkpoint `laya-multilingual`), y se publica con Tailscale Funnel. La ruta la llama solo si existe `LAYA_URL`. Esa variable no está publicada. Recibe el texto de la foto más la condición de la tarea y responde `choice`, `noul` y `score`. No redacta un párrafo. Sin esa URL, el stub deja el trabajo en `parcial`. El reembolso queda en `cumplió` solo si Qwen devolvió monto y fecha dentro del tope.
3. **El código** compara montos y fechas (un tope de US$15 no lo decide Laya) y arma el veredicto: `cumplió`, `parcial` o `insuficiente`. La frase junta el texto de Qwen y esas tres respuestas. Se guarda en Neon. La bandeja no la muestra. La API no devuelve `origen` ni ese texto. La columna se llama `texto_scout`.

Sin `GROQ_API_KEY`, o si Groq o Laya fallan, la misma función devuelve el guion fijo. En el reembolso, el guion usa US$12.40 y el 27 de septiembre de 2026. El fallo no se escribe en un registro. La IA no se entera del rol. Solo corre al subir la evidencia y al leer `GET` o `POST /api/revision/[id]`.

Hay dos tipos de hito y los dos entran por la misma cámara. El de trabajo pide una foto de lo hecho. El de reembolso pide una foto de la factura o del comprobante. Qwen las describe a las dos. En la factura también extrae monto y fecha, y el código compara ese monto con el tope. Laya clasifica las dos. No hay un lector de PDF ni un flujo distinto. Subir evidencia ya es esa única pantalla; monto y fecha del reembolso solo aparecen si la API los devuelve.

Ejemplo, stand de ZEEK. La tarea pide banner visible y mesa armada. Qwen dice: "Mesa armada, banner de ZEEK de frente, tres cajas abiertas. No se ve el fondo del salón." Laya responde categoría stand, condición cumplida y evidencia parcial. El código marca **parcial**. El administrador ve la foto, el texto y esa recomendación, y pide otra foto o aprueba el monto completo.

## Reglas que este stack cierra

- **Un escrow multi-release por proyecto, un hito por tarea.** Cada hito tiene monto y receptor propios. Hasta 5 direcciones por rol y 50 hitos. El demo cabe: 3 voluntarios y 1 reembolso.
- **Pago todo o nada.** Liberar un hito paga su monto completo, menos comisiones. Un parcial pide más evidencia o aprueba el monto entero. Partir el monto solo existe en una disputa, y eso queda fuera del MVP.
- **El admin de Hyto puede contradecir a la IA.** La IA no tiene rol en el contrato y no firma.
- **Quien aprueba y quien libera es el organizador**, en las dos listas. v2 permite `approve-and-release`: una sola firma hace las dos cosas. El estado del hito lo marca el proveedor, no el organizador.
- **La cuenta Admin del contrato es otra dirección.** No puede ser aprobador, proveedor, firmante de liberación ni resolutor de disputas. El resolutor tampoco puede coincidir con esos roles, con Platform ni con el receptor. Los hitos no se editan después de fondear.

## Acta, en el demo

Acta es viable en el demo como una sola credencial, no como el sistema de pago. Entra al final: un hito ya pagado, Cavos firma la emisión, y el informe abre la credencial de "esta persona cumplió esta tarea".

En testnet la emisión cuesta 5 XLM, que da Friendbot. Leer la credencial después no vuelve a cobrar. En mainnet sería 1 USDC por credencial; el demo no llega a mainnet. La clave se crea en https://dapp.acta.build y se queda en el servidor.

Si todavía no hay un pago en USDC, Acta no se integra y el informe se queda con el hash de Stellar. El informe imprimible ya está en el repo (PR #3) y el ejemplo no trae hash. El módulo de firma ya está (PR #8) y no dejó un pago en USDC.

## UX

Hyto se ve como una app web normal. El dinero está en Stellar, pero la pantalla no lo explica. No hay extensión, frase semilla, lista de wallets ni palabras como escrow, XDR, trustline o Soroban. Se dice pago, tarea, evidencia y aprobar.

La referencia es Ramp: el integrante resuelve su parte en el teléfono en segundos, y el administrador trabaja en una bandeja.

- **Entrada.** Un botón, con Cavos. La cuenta de Stellar se crea en el primer pago o en la primera evidencia, no en un asistente de configuración. El botón Entrar está en el admin. Sin `appId` no llama a Cavos y avisa que espera el identificador.
- **Integrante, móvil.** Ve su tarea, el monto y un estado. Un botón abre la cámara. Enviar. Si es un reembolso, la app rellena monto y fecha. No hay un formulario largo. Mis tareas y Subir evidencia ya están, con datos de ejemplo.
- **Admin, escritorio.** Tres números: presupuesto, pagado, pendiente. Debajo, una bandeja de lo que falta aprobar. El resto no compite con esa lista. Está en `/`, con el ejemplo de ZEEK.
- **Revisión.** La foto a la izquierda. A la derecha, una tarjeta corta: cumplió, parcial o insuficiente, y la frase de la evidencia. Un botón: Aprobar. Si hace falta otra foto, un enlace secundario, no un segundo botón del mismo peso.
- **Después del pago.** Monto en USDC y un enlace "Ver pago". La credencial de Acta, si existe, es otro enlace en el informe. No es un paso para cobrar.

Una pantalla, una acción principal. Fondo claro, Poppins, mucho espacio, un solo color de acento (`#B7EE34`). Estados con color: pendiente, en revisión, pagado.

## Salida del lunes 28

El script ya está en el repositorio (PR #8, a las 3:48 p.m., hora de Costa Rica). Si el beta no logra desplegar, fondear y liberar un hito, el mismo script pasa la base a `https://dev.api.trustlesswork.com` (v1). La app no se reescribe. En v1 hay un solo proveedor: el operador marca el estado y los voluntarios quedan solo como receptores de cada hito. Al cierre de esta entrada no hay un pago en USDC guardado: sin `TRUSTLESS_API_KEY`, o si el grifo de Circle no entrega el activo, el script se detiene y el Acta no entra.

## Fuentes

- Next.js 16.3.6, publicado el 22 de septiembre de 2026. Parche 16.3.7 anunciado para el 30 de septiembre de 2026.
- Trustless Work v2, testnet, en `beta.api.trustlesswork.com`. Sigue en beta y sin auditoría externa. v1 sigue siendo la infraestructura de mainnet.
