# Stack de Hyto

Cerrado el 27 de septiembre de 2026 para el demo de Stellar testnet. Entrega de la hackathon: 5 de octubre de 2026.

Una sola app. El dinero vive en un escrow multi-release de Trustless Work. La evidencia, la revisión con IA y el informe viven fuera de la cadena.

## Capas

| Capa | Decisión |
|---|---|
| App | Next.js 16 (App Router), TypeScript, Tailwind |
| Versión | **16.3.6** o superior. El 30 de septiembre, subir a **16.3.7** cuando salga el parche de seguridad |
| Pantallas | Móvil para el integrante, dashboard para el admin. Tipografía Inter. Un solo color de acento, lo define Abdiel |
| Wallet | Cavos, paquete `@cavos/kit`. Stellar testnet. Cuenta clásica `G…`, sin extensión ni frase semilla. Docs: https://docs.cavos.xyz/docs/stellar |
| Escrow | Trustless Work **v2 multi-release**. Base: `https://beta.api.trustlesswork.com`. Las llamadas salen solo de Route Handlers |
| Dónde corre | Vercel. La única computadora que tiene que estar encendida es la de Abdiel, y solo para Laya |
| Datos | Neon Postgres con Drizzle. `DATABASE_URL` en Vercel. Plan gratis |
| Archivos | Vercel Blob, almacén privado. `BLOB_READ_WRITE_TOKEN` en Vercel. La foto no se escribe en la blockchain ni en el disco de la app |
| IA | Scout (Groq) describe la foto. Laya corre en la computadora Windows de Abdiel y responde `choice`, `noul` y `score`. El código arma el veredicto. Si falla alguno, un guion fijo |
| Informe | Página imprimible, con enlace a [stellar.expert](https://stellar.expert/explorer/testnet) por cada pago |
| USDC | Testnet. Emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |

La clave de API de Trustless Work no va al navegador. La API arma un XDR sin firmar, Cavos lo firma con `wallet.signXdr` y el servidor lo envía a Stellar. Ese ciclo es el mismo para fondear, marcar el hito, aprobar y liberar.

Cavos se conecta con `chains: ["stellar"]`, `network: "testnet"` y un `appId` del dashboard (`NEXT_PUBLIC_CAVOS_APP_ID`). El `appSalt` queda fijo en código (`hyto`): cambiarlo después crea otra wallet. La clave `cav_…` del dashboard es de servidor y no va al navegador.

La dirección es una cuenta Stellar normal, así que puede ser rol de Trustless Work. Para cobrar USDC hace falta trustline. El relayer de Cavos, si hay `appId`, patrocina la reserva de XLM al crear la cuenta. El envío a Trustless Work es `POST /stellar/send-transaction` y rechaza fee-bumps: la cuenta que firma tiene que existir y poder pagar la comisión en XLM. El lunes hay que comprobarlo; si el relayer no cubre ese envío, la cuenta se fondea con Friendbot.

El escrow sigue siendo la API v2 (`https://beta.api.trustlesswork.com`) más `signXdr`. No usamos el wrapper `TrustlessWorkEscrow` del kit de Cavos: ese camino no es el multi-release v2. La evidencia on-chain es un texto corto (referencia). La foto se sube a Vercel Blob y en Neon se guarda su identificador.

La revisión son dos modelos. Ninguno firma ni mueve fondos. La ruta en Vercel lee la foto desde Blob y no publica esa URL.

1. **Llama 4 Scout** describe la imagen. Groq, modelo `meta-llama/llama-4-scout-17b-16e-instruct`, base `https://api.groq.com/openai/v1`, clave `GROQ_API_KEY` en Vercel. Una imagen, leída desde Blob. Devuelve un texto corto y, si es una factura, el monto y la fecha. El plan gratis cubre el demo (unas 1.000 solicitudes al día).
2. **Laya** decide sobre ese texto. Corre en la computadora Windows de Abdiel (`pip install laya`, checkpoint `laya-multilingual`). La ruta de la app la llama con `LAYA_URL`. Esa PC tiene que estar encendida durante el demo y ser alcanzable desde internet. Recibe el texto de Scout más la condición de la tarea y responde `choice`, `noul` y `score`. No redacta un párrafo.
3. **El código** compara montos y fechas (un tope de US$15 no lo decide Laya) y arma el veredicto: `cumplió`, `parcial` o `insuficiente`. La justificación en pantalla es el texto de Scout más esas tres respuestas.

Sin `GROQ_API_KEY`, o si Groq o Laya fallan, la misma función devuelve el guion fijo.

Hay dos tipos de hito y los dos entran por la misma cámara. El de trabajo pide una foto de lo hecho. El de reembolso pide una foto de la factura o del comprobante. Scout las describe a las dos. En la factura también extrae monto y fecha, y el código compara ese monto con el tope. Laya clasifica las dos. No hay un lector de PDF ni un flujo distinto.

Ejemplo, stand de ZEEK. La tarea pide banner visible y mesa armada. Scout dice: "Mesa armada, banner de ZEEK de frente, tres cajas abiertas. No se ve el fondo del salón." Laya responde categoría stand, condición cumplida y evidencia parcial. El código marca **parcial**. El administrador ve la foto, el texto y esa recomendación, y pide otra foto o aprueba el monto completo.

## Reglas que este stack cierra

- **Un escrow multi-release por proyecto, un hito por tarea.** Cada hito tiene monto y receptor propios. Hasta 5 direcciones por rol y 50 hitos. El demo cabe: 3 voluntarios y 1 reembolso.
- **Pago todo o nada.** Liberar un hito paga su monto completo, menos comisiones. Un parcial pide más evidencia o aprueba el monto entero. Partir el monto solo existe en una disputa, y eso queda fuera del MVP.
- **El admin de Hyto puede contradecir a la IA.** La IA no tiene rol en el contrato y no firma.
- **Quien aprueba y quien libera es el organizador**, en las dos listas. v2 permite `approve-and-release`: una sola firma hace las dos cosas. El estado del hito lo marca el proveedor, no el organizador.
- **La cuenta Admin del contrato es otra dirección.** No puede ser aprobador, proveedor, firmante de liberación ni resolutor de disputas. El resolutor tampoco puede coincidir con esos roles, con Platform ni con el receptor. Los hitos no se editan después de fondear.

## Acta, en el demo

Acta es viable en el demo como una sola credencial, no como el sistema de pago. Entra al final: un hito ya pagado, Cavos firma la emisión, y el informe abre la credencial de "esta persona cumplió esta tarea".

En testnet la emisión cuesta 5 XLM, que da Friendbot. Leer la credencial después no vuelve a cobrar. En mainnet sería 1 USDC por credencial; el demo no llega a mainnet. La clave se crea en https://dapp.acta.build y se queda en el servidor.

Si todavía no hay un pago en USDC, Acta no se integra y el informe se queda con el hash de Stellar.

## UX

Hyto se ve como una app web normal. El dinero está en Stellar, pero la pantalla no lo explica. No hay extensión, frase semilla, lista de wallets ni palabras como escrow, XDR, trustline o Soroban. Se dice pago, tarea, evidencia y aprobar.

La referencia es Ramp: el integrante resuelve su parte en el teléfono en segundos, y el administrador trabaja en una bandeja.

- **Entrada.** Un botón, con Cavos. La cuenta de Stellar se crea en el primer pago o en la primera evidencia, no en un asistente de configuración.
- **Integrante, móvil.** Ve su tarea, el monto y un estado. Un botón abre la cámara. Enviar. Si es un reembolso, la app rellena monto y fecha. No hay un formulario largo.
- **Admin, escritorio.** Tres números: presupuesto, pagado, pendiente. Debajo, una bandeja de lo que falta aprobar. El resto no compite con esa lista.
- **Revisión.** La foto a la izquierda. A la derecha, una tarjeta corta: cumplió, parcial o insuficiente, y la frase de la evidencia. Un botón: Aprobar. Si hace falta otra foto, un enlace secundario, no un segundo botón del mismo peso.
- **Después del pago.** Monto en USDC y un enlace "Ver pago". La credencial de Acta, si existe, es otro enlace en el informe. No es un paso para cobrar.

Una pantalla, una acción principal. Fondo claro, Inter, mucho espacio, un solo color de acento. Estados con color: pendiente, en revisión, pagado.

## Salida del lunes 28

Si el spike no logra desplegar, fondear y liberar un hito en el beta, ese mismo día la base de la API pasa a `https://dev.api.trustlesswork.com` (v1). La app no se reescribe. En v1 hay un solo proveedor: el operador marca el estado y los voluntarios quedan solo como receptores de cada hito.

## Fuentes

- Next.js 16.3.6, publicado el 22 de septiembre de 2026. Parche 16.3.7 anunciado para el 30 de septiembre de 2026.
- Trustless Work v2, testnet, en `beta.api.trustlesswork.com`. Sigue en beta y sin auditoría externa. v1 sigue siendo la infraestructura de mainnet.
