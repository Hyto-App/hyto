# Stack de Hyto

Cerrado el 27 de septiembre de 2026 para el demo de Stellar testnet. Entrega de la hackathon: 5 de octubre de 2026, 4:00 p.m. Meetup: 30 de septiembre de 2026, TEC Cartago.

Una sola app. El dinero vive en un escrow multi-release de Trustless Work. La evidencia, la revisión con IA y el informe viven fuera de la cadena.

## Qué hay en el repo al 29 de septiembre de 2026, 12:42 p.m., hora de Costa Rica

Instalado y en uso: Next.js 16.3.6, React 19.1.1, TypeScript, Tailwind 4, `@cavos/kit` 0.2.5. Tipografía Poppins (400, 500 y 600). `--acento` es `#B7EE34` y `--sobre-acento` es `#08090C` (PR #7 de Abdiel Cole, squash `cff4512`). Las pantallas del integrante están en `app/mis-tareas`, `app/tareas/[id]` y `app/cuentas`. El admin está en `/` (bandeja), `/proyectos/nuevo`, `/revision/[id]` e `/informe`. En una sesión real, la bandeja y el informe leen la API (PR #39). El modo demo y Crear proyecto siguen con el ejemplo de ZEEK.

El módulo de firma está en `lib/escrow` (PR #8 de Sebastián Ceciliano Piedra, squash `ae10a9e`, el 28 de septiembre a las 3:48 p.m., hora de Costa Rica). El 29 a las 11:28 a.m., Josué Valles lo partió en el PR #26 (squash `e2def81`): en v2, aprobar llama a `approve-milestones` y liberar a `release-funds`. Disputar y resolver arman el XDR. `GET /api/escrow/[contrato]` lee el estado con la sesión del organizador. `POST /api/firma` prepara el XDR y `POST /api/firma/enviar` lo manda a Stellar. Esas rutas exigen sesión. Desde el PR #23 esa sesión solo se abre si el JWT está verificado. Una sesión demo (PR #30) responde 403. `npm run hito` corre `scripts/hito-prueba.ts` y solo repite en v1 si hay `TRUSTLESS_API_KEY_V1`, distinta de `TRUSTLESS_API_KEY`. `@stellar/stellar-sdk` está en las dependencias del servidor para leer el firmante del XDR; el navegador no lo carga y sigue firmando con Cavos. La auditoría del integrante entró en el PR #4 (squash `bc94a9c`, a las 3:47 p.m.).

En el código, de Esteban (PR #14, squash `ce9ff7c`, el 28 de septiembre a las 11:40 p.m.): Drizzle sobre Neon, Vercel Blob privado, `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/evidencias/:id/foto`, `GET` y `POST /api/proyectos`, `GET /api/informe`, `GET` y `POST /api/revision/:id`, `POST /api/sesion` y el ingreso con CavosAuth. La revisión llama a Qwen 3.8 27B en Groq y, si no hay `LAYA_URL`, usa un stub. Sin `GROQ_API_KEY`, o si Groq o Laya fallan, responde el guion fijo. El hash de pago se escribe al liberar con éxito (PR #38). En el repositorio no hay un pago de prueba. No hay Acta. No hay ESLint. Las variables de Neon, Blob y Groq todavía hay que ponerlas en Vercel, y hay que crear el almacén privado. Las tablas y la semilla de ZEEK ya se corrieron en la base.

El 29 de septiembre, Josué Valles precisó `.env.example` (PR #20, squash `36fd91a`, a las 9:16 a.m.): sin valores, dice el alcance, si cada variable es obligatoria y qué pasa si falta. `NODE_ENV` no se declara; lo pone Next.js. A las 9:44 a.m. entró el PR #27 (squash `d26a443`): `npm run test:integracion` contra Postgres local. Si no hay base, o si el host no es local, no conecta. `pg`, `happy-dom` y `@types/pg` quedaron en devDependencies. `almacenNeon` y `fotosBlob` aceptan un gancho de esas pruebas; en el servidor siguen Neon y Blob. El regreso de Google queda como fallo esperado (PR #18, abierto). A las 9:50 a.m. entró el PR #22 (squash `7c64a54`): el catálogo de variables está en `lib/config/entorno.ts` y lo público del navegador en `lib/config/publico.ts`. `npm run verificar:entorno` revisa `.env.local` sin imprimir valores. `npm run db:migrar`, `npm run db:semilla`, drizzle-kit y `npm run hito` cargan ese archivo. Si `DATABASE_URL` apunta a un host de `HYTO_HOST_BASE_PRODUCCION` y `HYTO_CONFIRMAR_BASE_PRODUCCION` no vale `si`, no migran ni siembran. Un host ilegible de esa lista también las detiene. El sufijo `-pooler` de Neon se trata como el mismo host directo. `npm test` incluye `lib/config`. A las 10:03 a.m. entró el PR #21 (squash `9508e0c`): si el host no es Neon, la migración y la semilla usan el protocolo de Postgres, porque el cliente HTTP reescribe `127.0.0.1`. `docker compose` levanta Postgres 16 en `127.0.0.1:5432` (usuario `hyto`, base `hyto`). `npm run db:local` rechaza un host que no sea de esta máquina, levanta compose si hace falta, crea la base, migra y siembra. La semilla deja las tareas en pendiente y agrega evidencia de ejemplo. Pedir otra foto borra el veredicto. Sembrar de nuevo no pisa un pago ni una foto real. El pool local anota el error de una conexión ociosa. A las 10:10 a.m. entró el PR #24 (squash `5b8f242`): `npm run db:esquema` inventaría el esquema desde las migraciones y Drizzle, sin abrir Neon, y escribe `scripts/backend-traspaso/esquema-inventario.json`. A las 10:13 a.m. entró el PR #25 (squash `99b8aa4`): `npm run db:comparar-esquema` cruza esas migraciones con `information_schema` de una copia, en una transacción de solo lectura, y no escribe. A las 10:14 a.m. entró el PR #28 (squash `7256c56`): Entrar ya no muestra el error crudo de Cavos. Un 429 cuenta los segundos y desactiva «Enviar código». Tras cada envío hay 20 segundos de respiro. A las 10:45 a.m. entró el PR #23 (squash `fca79a2`): `POST /api/sesion` comprueba la firma RS256, el emisor y el vencimiento. La documentación de Cavos no publica el JWKS ni el emisor. Sin `CAVOS_JWT_JWK` y sin `CAVOS_JWKS_URL` no hay sesión. `HYTO_PERMITIR_JWT_SIN_FIRMA=1` solo vale fuera de producción. `CAVOS_JWT_ISSUER` acepta varios emisores y la clave sigue a su `iss` y `kid`. Crear un proyecto, revisar, preparar o enviar un pago, y subir una evidencia piden la cookie `hyto_sesion`. Subir evidencia solo acepta la tarea de ese integrante y solo ese voluntario cambia `walletCobro`. Un 401 o un 403 no guarda el ejemplo. Un JWKS vacío no se cachea. `npm test` incluye `lib/auth`, `lib/sesion` y `scripts/backend-traspaso`. A las 11:30 a.m. entró el PR #30 (squash `f7efbce`): con `HYTO_DEMO_LOGIN=1`, «Entrar como demo» abre una sesión sin billetera. `POST /api/sesion/demo` responde 404 si ese valor no es `1`. Esa sesión no firma. A las 11:48 a.m. entró el PR #36 (squash `1c601bb`): en esa sesión, Entrar muestra el rol, el cambio al otro y «Salir del demo». `DELETE /api/sesion` borra la fila y expira `hyto_sesion`. El cambio de rol borra la sesión demo anterior. El mismo salir está en Mis tareas, Subir evidencia y Cuentas del demo. A las 12:38 p.m. entró el PR #38 (squash `a4eac84`): `desplegar` arma un escrow v2 por tarea y, al liberar con SUCCESS y el hito liberado, guarda `hash_pago`. `drizzle/0001_contrato_escrow.sql` agrega `contrato_escrow` y no se corrió. Hacen falta `HYTO_ESCROW_PLATFORM`, `HYTO_ESCROW_RESOLVER` y `HYTO_ESCROW_ADMIN`. A las 12:42 p.m. entró el PR #39 (squash `12b4e07`): la revisión firma desplegar, fondear, marcar, aprobar y liberar con Cavos. Antes de conectar restaura la sesión. Desplegar se oculta si ya hay contrato. Fondear solo aparece con saldo cero. Aprobar y pagar retoma el paso fallido. El tope recorta el monto.

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
| Datos | Neon Postgres con Drizzle. `DATABASE_URL` en Vercel. Plan gratis. El esquema, la migración y la semilla de ZEEK ya están. En esta máquina, si el host no es Neon, la migración usa el protocolo de Postgres (`npm run db:local`, PR #21). `npm run db:esquema` inventaría el código sin abrir la base (PR #24). `npm run db:comparar-esquema` la cruza con una copia, en solo lectura (PR #25) |
| Archivos | Vercel Blob, almacén privado. `BLOB_READ_WRITE_TOKEN` en Vercel. La foto no se escribe en la blockchain ni en el disco de la app |
| IA | Qwen 3.8 27B (Groq) describe la foto. Laya corre en el servidor de Abdiel y responde `choice`, `noul` y `score`. El código arma el veredicto. Si falla alguno, un guion fijo |
| Informe | Página imprimible en `/informe`, con enlace a [stellar.expert](https://stellar.expert/explorer/testnet) cuando el pago ya tiene hash. Hoy el ejemplo no trae hash |
| USDC | Testnet. Emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |

## Variables

Nombres nada más. Ninguna va al navegador salvo `NEXT_PUBLIC_CAVOS_APP_ID`.

| Nombre | Uso |
|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | Dashboard de Cavos. La lee `lib/integrante/identidades.ts`. Ya está en Vercel |
| `DATABASE_URL` | Neon. La leen las rutas |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob privado. La lee la subida de la foto |
| `GROQ_API_KEY` | Qwen 3.8 27B. Sin ella, la revisión usa el guion fijo |
| `TRUSTLESS_API_KEY` | Trustless Work. La leen `lib/escrow` y `npm run hito`. Solo en el servidor. La pone Sebas |
| `TRUSTLESS_API_KEY_V1` | Clave distinta, solo para repetir el hito en v1 (PR #26). Sin ella, ese reintento no corre |
| `HYTO_DEMO_LOGIN` | Valor exacto `1`. Enciende el ingreso demo (PR #30). Vacío: la ruta responde 404 |
| `HYTO_ESCROW_PLATFORM` | Cuenta G de la comisión, en 0. Distinta de las otras dos y de quien fondea o cobra. Sin ella, desplegar responde 503 (PR #38) |
| `HYTO_ESCROW_RESOLVER` | Cuenta G que resuelve disputas |
| `HYTO_ESCROW_ADMIN` | Cuenta G que despliega. No repite ningún otro rol |
| `LAYA_URL` | URL pública de Laya, por Tailscale Funnel. La publica Abdiel |
| `LAYA_API_KEY` | Opcional. Si tiene valor, la revisión la manda a Laya |
| `HYTO_HOST_BASE_PRODUCCION` | Hosts de la base de producción. La migración y la semilla los comparan con `DATABASE_URL`. Vacío en `.env.example` |
| `HYTO_CONFIRMAR_BASE_PRODUCCION` | Solo `si` permite migrar o sembrar un host de esa lista. Vacío en `.env.example` |
| `CAVOS_JWT_JWK` | JWK público. Verifica la firma RS256 de `POST /api/sesion`. Tiene prioridad sobre `CAVOS_JWKS_URL` |
| `CAVOS_JWKS_URL` | URLs https de claves públicas, separadas por coma. Sin esta y sin `CAVOS_JWT_JWK` no hay sesión |
| `CAVOS_JWT_ISSUER` | Emisores permitidos, separados por coma. Vacío: no se comprueba `iss` |
| `CAVOS_JWT_AUDIENCE` | Opcional. Si tiene valor, el `aud` tiene que coincidir |
| `HYTO_PERMITIR_JWT_SIN_FIRMA` | Solo desarrollo, valor exacto `1`. Producción lo ignora |

La clave `TRUSTLESS_API_KEY` y la clave `cav_…` de Cavos se quedan en el servidor. `cav_…` todavía no tiene nombre en el repo. La clave de Acta, igual, y solo después de un pago en USDC.

La clave de API de Trustless Work no va al navegador. La API arma un XDR sin firmar, Cavos lo firma con `wallet.signXdr` y el servidor lo envía a Stellar. Ese ciclo es el mismo para fondear, marcar el hito, aprobar y liberar.

Cavos se conecta con `chains: ["stellar"]`, `network: "testnet"` y un `appId` del dashboard (`NEXT_PUBLIC_CAVOS_APP_ID`). El `appSalt` queda fijo en código (`hyto`): cambiarlo después crea otra wallet. La clave `cav_…` del dashboard es de servidor y no va al navegador. `/cuentas` ya usa ese `appSalt`, `testnet` y las identidades organizador y tres voluntarios; sin `appId` no llama a Cavos.

La dirección es una cuenta Stellar normal, así que puede ser rol de Trustless Work. Para cobrar USDC hace falta trustline. El relayer de Cavos, si hay `appId`, patrocina la reserva de XLM al crear la cuenta. El envío a Trustless Work es `POST /stellar/send-transaction` y rechaza fee-bumps: la cuenta que firma tiene que existir y poder pagar la comisión en XLM. Hay que comprobarlo; si el relayer no cubre ese envío, la cuenta se fondea con Friendbot.

El escrow sigue siendo la API v2 (`https://beta.api.trustlesswork.com`) más `signXdr`. No usamos el wrapper `TrustlessWorkEscrow` del kit de Cavos: ese camino no es el multi-release v2. La evidencia on-chain es un texto corto (referencia, hasta 500 caracteres). La foto se sube a Vercel Blob y en Neon se guarda su identificador. El script del hito ya está (`npm run hito`, PR #8). Si hay pago, el hash se escribiría en `lib/escrow/pago-prueba.json`; ese archivo no está en el repositorio.

La revisión son dos modelos. Ninguno firma ni mueve fondos. `GET /api/revision/:id` lee la foto desde Blob y no publica esa URL. Desde el PR #23 esa lectura pide la cookie del organizador. La pantalla recibe `/api/evidencias/:id/foto`.

1. **Qwen 3.8 27B** describe la imagen. Groq, modelo `qwen/qwen3.8-27b`, base `https://api.groq.com/openai/v1`, clave `GROQ_API_KEY` en Vercel. Es el único modelo de esta clave que acepta foto. Una imagen, leída desde Blob. Devuelve un texto corto y, si es una factura, el monto y la fecha. El plan gratis cubre el demo.
2. **Laya** decide sobre ese texto. Corre en el servidor de Abdiel, en un entorno de Python aparte (`pip install "laya[serve]"`, checkpoint `laya-multilingual`), y se publica con Tailscale Funnel. La ruta de la app la llama con `LAYA_URL`. Esa máquina tiene que estar encendida durante el demo y ser alcanzable desde internet. Recibe el texto de la foto más la condición de la tarea y responde `choice`, `noul` y `score`. No redacta un párrafo.
3. **El código** compara montos y fechas (un tope de US$15 no lo decide Laya) y arma el veredicto: `cumplió`, `parcial` o `insuficiente`. La justificación en pantalla es el texto de la foto más esas tres respuestas.

Sin `GROQ_API_KEY`, o si Groq o Laya fallan, la misma función devuelve el guion fijo.

Hay dos tipos de hito y los dos entran por la misma cámara. El de trabajo pide una foto de lo hecho. El de reembolso pide una foto de la factura o del comprobante. Qwen las describe a las dos. En la factura también extrae monto y fecha, y el código compara ese monto con el tope. Laya clasifica las dos. No hay un lector de PDF ni un flujo distinto. Subir evidencia ya es esa única pantalla; monto y fecha del reembolso solo aparecen si la API los devuelve.

Ejemplo, stand de ZEEK. La tarea pide banner visible y mesa armada. Qwen dice: "Mesa armada, banner de ZEEK de frente, tres cajas abiertas. No se ve el fondo del salón." Laya responde categoría stand, condición cumplida y evidencia parcial. El código marca **parcial**. El administrador ve la foto, el texto y esa recomendación, y pide otra foto o aprueba el monto completo.

## Reglas que este stack cierra

- **Un escrow multi-release por proyecto, un hito por tarea.** Cada hito tiene monto y receptor propios. Hasta 5 direcciones por rol y 50 hitos. El demo cabe: 3 voluntarios y 1 reembolso.
- **Pago todo o nada.** Liberar un hito paga su monto completo, menos comisiones. Un parcial pide más evidencia o aprueba el monto entero. Partir el monto existe en resolver una disputa: el módulo ya arma ese XDR (PR #26) y las pantallas no lo llaman.
- **El admin de Hyto puede contradecir a la IA.** La IA no tiene rol en el contrato y no firma.
- **Quien aprueba y quien libera es el organizador**, en las dos listas. Desde el PR #26 son dos firmas: `approve-milestones` y después `release-funds`. El estado del hito lo marca el proveedor, no el organizador.
- **La cuenta Admin del contrato es otra dirección.** No puede ser aprobador, proveedor, firmante de liberación ni resolutor de disputas. El resolutor tampoco puede coincidir con esos roles, con Platform ni con el receptor. Los hitos no se editan después de fondear.

## Acta, en el demo

Acta es viable en el demo como una sola credencial, no como el sistema de pago. Entra al final: un hito ya pagado, Cavos firma la emisión, y el informe abre la credencial de "esta persona cumplió esta tarea".

En testnet la emisión cuesta 5 XLM, que da Friendbot. Leer la credencial después no vuelve a cobrar. En mainnet sería 1 USDC por credencial; el demo no llega a mainnet. La clave se crea en https://dapp.acta.build y se queda en el servidor.

Si todavía no hay un pago en USDC, Acta no se integra y el informe se queda con el hash de Stellar. El informe imprimible ya está en el repo (PR #3) y el ejemplo no trae hash. El módulo de firma ya está (PR #8) y no dejó un pago en USDC.

## UX

Hyto se ve como una app web normal. El dinero está en Stellar, pero la pantalla no lo explica. No hay extensión, frase semilla, lista de wallets ni palabras como escrow, XDR, trustline o Soroban. Se dice pago, tarea, evidencia y aprobar.

La referencia es Ramp: el integrante resuelve su parte en el teléfono en segundos, y el administrador trabaja en una bandeja.

- **Entrada.** Un botón, con Cavos. La cuenta de Stellar se crea en el primer pago o en la primera evidencia, no en un asistente de configuración. El botón Entrar está en el admin. Sin `appId` no llama a Cavos y avisa que espera el identificador. Si Cavos falla, la pantalla dice el motivo en claro (PR #28): un 429 cuenta los segundos y desactiva «Enviar código», y después de pedir el código hay 20 segundos de respiro. Con `HYTO_DEMO_LOGIN=1` (PR #30) también está «Entrar como demo»: entra sin billetera y no puede firmar. En esa sesión se ve el rol, se puede cambiar al otro y salir (PR #36, 11:48 a.m.). `DELETE /api/sesion` expira `hyto_sesion`.
- **Integrante, móvil.** Ve su tarea, el monto y un estado. Un botón abre la cámara. Enviar. Si es un reembolso, la app rellena monto y fecha. No hay un formulario largo. Mis tareas y Subir evidencia ya están, con datos de ejemplo.
- **Admin, escritorio.** Tres números: presupuesto, pagado, pendiente. Debajo, una bandeja de lo que falta aprobar. El resto no compite con esa lista. Está en `/`. En sesión real lee la API (PR #39). El modo demo usa el ejemplo de ZEEK.
- **Revisión.** La foto a la izquierda. A la derecha, una tarjeta corta: cumplió, parcial o insuficiente, y la frase de la evidencia. En una sesión real, Aprobar y pagar firma marcar, aprobar y liberar (PR #39). Desplegar y Fondear aparecen solo si faltan el contrato o el saldo. El modo demo aprueba en el navegador y no firma.
- **Después del pago.** Monto en USDC y un enlace "Ver pago". La credencial de Acta, si existe, es otro enlace en el informe. No es un paso para cobrar.

Una pantalla, una acción principal. Fondo claro, Poppins, mucho espacio, un solo color de acento (`#B7EE34`). Estados con color: pendiente, en revisión, pagado.

## Salida del lunes 28

El script ya está en el repositorio (PR #8, a las 3:48 p.m., hora de Costa Rica). Si el beta no logra desplegar, fondear y liberar un hito, el mismo script pasa la base a `https://dev.api.trustlesswork.com` (v1), solo si hay `TRUSTLESS_API_KEY_V1` distinta de `TRUSTLESS_API_KEY` (PR #26, 29 de septiembre a las 11:28 a.m.). La app no se reescribe. En v1 hay un solo proveedor: el operador marca el estado y los voluntarios quedan solo como receptores de cada hito. En v2, aprobar y liberar son dos firmas. Al cierre de esta entrada no hay un pago en USDC guardado: sin `TRUSTLESS_API_KEY`, o si el grifo de Circle no entrega el activo, el script se detiene y el Acta no entra.

## Fuentes

- Next.js 16.3.6, publicado el 22 de septiembre de 2026. Parche 16.3.7 anunciado para el 30 de septiembre de 2026.
- Trustless Work v2, testnet, en `beta.api.trustlesswork.com`. Sigue en beta y sin auditoría externa. v1 sigue siendo la infraestructura de mainnet.
