# Añadir fondos — evaluación de #120, parte B

**Fecha de la verificación:** 9 de octubre de 2026.
**Alcance:** evaluación y recomendación. No hay botón, no hay secreto y no hay paso a mainnet.
**Para el buzón:** este entorno no pudo abrir `Hyto-App/hyto-private`. El bloque de abajo es el texto para pegar bajo la entrada `### #120`.

Stellar Raven (`https://raven.stellar.org/mcp`) pidió un inicio de sesión en el navegador que este entorno no puede completar. Los hechos de protocolo salen de la documentación pública de Stellar, de lecturas sin clave al ancla de prueba y del paquete publicado `@cavos/kit` 0.2.5. No hay transcripción de Raven.

La inteligencia artificial no firma ni mueve fondos. Stellar, en lo que Hyto ejecuta hoy, sigue en testnet.

---

## Estado

**#120 parte B: respuesta lista, construcción pendiente.**

---

## Texto para pegar bajo ### #120

**Respuesta del operador (8-oct ~10:48 p. m. CR):**

Estado de #120 parte B: respuesta lista, construcción pendiente.

**Testnet, opción elegida.** SEP-24 contra `testanchor.stellar.org`, con el USDC de Circle de testnet `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. Es el mismo emisor que ya está en `lib/integrante/identidades.ts`. Cuando se construya, el botón va en Cuenta, para quien financia, con el texto «Fondos de práctica, sin valor real.» No se muestra el retiro del ancla de prueba: ese formulario no es un retiro a un banco. No se crea una cuenta de distribución de Hyto mientras la firma de Cavos sea aceptada.

Cavos puede firmar el SEP-10 que ese ancla pide. En `@cavos/kit` 0.2.5, `signXdr` toma un XDR armado por otro, le pone la firma de la clave de control y lo devuelve sin enviarlo a la red. No exige que la cuenta de Cavos sea el origen de la transacción. El 9 de octubre de 2026 un `GET` público a `https://testanchor.stellar.org/auth` devolvió un desafío de testnet con estas piezas: origen igual a la `SIGNING_KEY` del ancla, secuencia 0, una operación `manageData` a nombre de la cuenta que se autentica, otra `manageData` de dominio del ancla, una firma previa del servidor y una ventana de quince minutos. Hyto ya abre Cavos en testnet (`lib/auth/cliente.ts`, `network: "testnet"`, frase de red «Test SDF Network ; September 2015»). `client_domain` no fue necesario para obtener el desafío. Falta una sola prueba, con una bóveda de Cavos de una persona real: que el ancla acepte esa firma y entregue el token. Si la rechaza, el plan B es una cuenta de práctica de Hyto, solo en testnet, que envíe USDC de prueba a la cuenta de la sesión. El secreto de esa cuenta vive en Vercel y no entra al repositorio. Esa cuenta también puede enviar un poco de XLM para la comisión de red, que el depósito del ancla no entrega.

La trustline no se vuelve a construir. Preparar el cobro ya la abre. `prepararUsdcDeSesion` (`lib/integrante/prepararUsdc.ts`) llama a `POST /api/usdc`. Si la cuenta no tiene XLM propio, el servidor responde 409 `usdc_sin_xlm` y el navegador usa `addTrustline` con el relé de Cavos (`lib/integrante/usdc.ts`). Si el XLM propio cubre la reserva y la comisión, `armarXdrUsdc` (`lib/integrante/trustline.ts`) arma un `changeTrust` de testnet para ese emisor y `signXdr` lo firma. El ancla de prueba no crea cuentas (`account_creation: false` en `GET /sep24/info`). El depósito de USDC está habilitado, con mínimo 1 y máximo 10 por operación. Una tarea de US$20 más la reserva de 1 USDC (`RESERVA_USDC` en `lib/escrow/saldo.ts`) no cabe en un solo depósito: el botón tiene que poder repetirse. Ese depósito tampoco paga la comisión del contrato. Trustless Work v2 rechaza el fee-bump, Friendbot no recarga una cuenta que ya existe, y la cuenta que crea el relé de Cavos no trae XLM gastable (`lib/escrow/comision.ts`). Añadir fondos de práctica no sustituye ese saldo.

**Mainnet, recomendación, y no en este cambio.** MoonPay, y solo como compra de USDC de Circle en Stellar hacia la cuenta `G…` de quien financia, el día en que el depósito de Hyto exista en mainnet. El emisor de mainnet es `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`. No se mezcla con `GBBD47…`. La documentación de MoonPay dice que Stellar admite la entrada (fiat hacia USDC) y rechaza la salida en esa red. Hyto no promete un retiro bancario. MoneyGram Ramps queda para una conversación posterior, si el producto necesita efectivo en un agente: no es una transferencia a un banco, y el emisor tiene que salir de `requiredNetwork` (prueba `GBBD47…`, producción `GA5ZSE…`). Transak publica la compra de USDC en Stellar; en esta pasada no se confirmó el emisor ni una venta, así que no es la primera opción. Coinbase Onramp no se recomienda: la tabla publicada de redes del widget no incluye Stellar. Que el exchange de Coinbase acepte depósitos de USDC por Stellar es otro producto, y no entrega fondos a la cuenta de Cavos desde el widget. `HYTO_STELLAR_NETWORK` solo apunta la lectura del saldo. El depósito sigue en `https://beta.api.trustlesswork.com`. No se construye ninguna rampa de mainnet aquí.

**Construcción.** Cabe en un pull request, sin migración y sin secreto nuevo, si el ancla acepta la firma de Cavos. El trabajo es el botón en Cuenta, el desafío, la ventana interactiva, volver a leer el saldo al terminar y pruebas con el ancla simulada. La medida que falta es esa firma en un navegador con una cuenta Cavos de verdad. Hasta entonces la construcción queda pendiente.

---

## Qué se verificó en el código

| Pieza | Qué hace hoy | Qué implica para añadir fondos |
|---|---|---|
| Cavos, `lib/auth/cliente.ts` | `Cavos.connect` con `chains: ["stellar"]` y `network: "testnet"`. La clave no sale de la bóveda. | El desafío hay que firmarlo ahí. No hay secreto de persona en el servidor. |
| `@cavos/kit` 0.2.5, `CavosStellar.signXdr` | Firma un XDR externo con la clave de control y lo devuelve. No lo envía. Cubre la firma clásica y las entradas de Soroban de esa misma cuenta. | Cubre la forma del SEP-10 (origen ajeno, secuencia 0, no se envía a Horizon). No está medido contra la bóveda de una sesión real. |
| `lib/api/usdc.ts` | `preparar` abre la cuenta de testnet si falta, responde `listo` si la trustline ya está, arma el `changeTrust` si el XLM propio alcanza, y responde 409 `usdc_sin_xlm` si no. `enviar` solo acepta ese `changeTrust`, firmado por la cuenta de la sesión, en la frase de red de testnet. | El servidor no debe reutilizar `enviar` para el desafío SEP-10: esa ruta rechaza cualquier operación que no sea el `changeTrust` de USDC. El XDR firmado del desafío vuelve al ancla, no a Horizon. |
| `lib/integrante/prepararUsdc.ts` | Repite el alta. Si llega el 409, llama a `addTrustline`. Rechaza firmar si Cavos abre otra dirección. Cada llamada a Cavos espera como máximo 60 segundos. | El botón de fondos tiene que correr después de Preparar el cobro, o llamarlo antes. Una cuenta a medias no puede recibir el USDC. |
| `lib/integrante/usdc.ts` | `estadoCobro` distingue sin cuenta, listo, sin XLM y falta de trustline. `asegurarCobroUsdc` despliega la cuenta patrocinada y abre la trustline con el relé. | La cuenta patrocinada nace con 0 XLM. Puede recibir USDC en cuanto la trustline existe. No puede pagar la comisión del contrato con ese saldo. |
| `lib/integrante/trustline.ts` | Un solo `changeTrust` de USDC, emisor `GBBD47…`, frase de red de testnet, plazo de 180 segundos. La revisión exige la firma ed25519 de esa cuenta. | El emisor del ancla de prueba coincide. No hay un segundo emisor en el código. |
| `lib/escrow/comision.ts` | La comisión la paga la cuenta de la sesión. Un fee-bump se rechaza. Friendbot no suma XLM a una cuenta que ya existe. | El depósito SEP-24 no cierra la comisión. Hace falta decirlo junto al botón. |

El ancla, leído el 9 de octubre de 2026 sin clave:

- `https://testanchor.stellar.org/.well-known/stellar.toml` publica `WEB_AUTH_ENDPOINT`, `TRANSFER_SERVER_SEP0024`, la frase de red de testnet y USDC con emisor `GBBD47…`. También publica SEP-45 para cuentas de contrato. Cavos es una cuenta clásica `G…`, así que el camino es SEP-10, no SEP-45.
- `GET /sep24/info`: depósito y retiro de USDC habilitados, mínimo 1, máximo 10, `fee.enabled: false`, `account_creation: false`.
- `GET /auth?account=G…` respondió 200 sin `client_domain`. El desafío no se envió a la red y no se usó ninguna cuenta de Hyto.

## Qué no se construye todavía

1. Pedir el desafío y firmarlo con `signXdr`. No enviarlo a `/api/usdc` ni a Horizon.
2. Canjear la firma por el token del ancla y abrir la URL interactiva de depósito, en otra ventana, fuera de la bóveda de firma.
3. Esperar el estado del depósito y volver a leer el saldo de USDC de la sesión. No marcar una tarea como pagada.
4. Repetir el depósito mientras el máximo siga en 10.
5. Copy visible: «Fondos de práctica, sin valor real.» Sin las palabras escrow, testnet, trustline, XDR ni mainnet en la pantalla, como ya pide el rediseño.
6. Pruebas con el ancla simulada. Una prueba manual, aparte, con una cuenta Cavos de verdad, antes de dar la firma por aceptada.

El plan B, solo si esa prueba falla, es un envío desde una cuenta de práctica de Hyto. El tope y el emisor se fijan en el servidor. El secreto no se escribe en el repositorio ni en el cliente. Sigue siendo testnet. Sigue sin firma de la inteligencia artificial.

## Mainnet, comparación corta

| Opción | Qué se comprobó | Para quién financia | Qué no prometer |
|---|---|---|---|
| MoonPay | USDC en Stellar, emisor de mainnet `GA5ZSE…`. La documentación de empresa dice que Stellar solo admite onramp; un offramp en esa red responde que Stellar hoy solo sirve para entrar. | Es la recomendación, después de un depósito en mainnet. La compra cae en la cuenta `G…` de la sesión, nunca en el contrato `C…`. | Retiro a un banco. Mezclar `GA5ZSE…` con `GBBD47…`. |
| MoneyGram Ramps | Efectivo en un agente, SEP-10 y SEP-24, y un widget más nuevo. El sandbox usa el emisor de testnet; producción, el de mainnet. La guía pide no cruzarlos. | No es el botón de esta parte. Sirve si más adelante alguien necesita efectivo en un agente. | Decir que es un depósito o un retiro bancario. |
| Transak | El catálogo público lista la compra de USDC en Stellar. | Segunda puerta de tarjeta, solo después de confirmar por escrito el emisor `GA5ZSE…`. | Una venta o un retiro que esta pasada no confirmó. |
| Coinbase Onramp | La tabla de redes del widget (USDC en Ethereum, Base, Polygon, Solana y otras) no nombra Stellar. | No se recomienda. | Tratar el anuncio del exchange (depósitos de USDC por Stellar) como si el widget entregara a una cuenta Cavos. |

Ninguna de las cuatro reemplaza a Trustless Work. Ninguna aprueba una tarea. Mile sigue sin firmar.

## Fuentes

Consultadas el 9 de octubre de 2026, sin credenciales.

- Ancla de prueba, TOML: `https://testanchor.stellar.org/.well-known/stellar.toml`
- Ancla de prueba, info SEP-24: `https://testanchor.stellar.org/sep24/info`
- Ancla de prueba, desafío SEP-10: `GET https://testanchor.stellar.org/auth?account=G…` (cuenta desechable, no enviada a la red)
- Guía de billetera SEP-10: `https://developers.stellar.org/docs/build/apps/wallet/sep10`
- Guía de depósito SEP-24: `https://developers.stellar.org/docs/build/apps/wallet/sep24`
- Ejemplo del wallet SDK, ancla y emisor por defecto: paquete `@stellar/typescript-wallet-sdk`, ejemplo `sep24`
- `@cavos/kit` 0.2.5, `dist/CavosStellar-CXT9Wupp.d.ts` y `dist/stellar.js`, método `signXdr`
- Cavos, cuenta clásica `G…`: `https://cavos.xyz/embedded-stellar-wallet`
- MoonPay, stables y la frase de que Stellar solo admite onramp: `https://dev.enterprise.moonpay.com/stablecoins-and-blockchains`
- MoneyGram, guía Stellar y emisores por red: `https://xramps.moneygram.com/ops/developer/guides/stellar` y `https://xramps.moneygram.com/ops/developer/guides/web-stellar`
- Transak, cobertura: `https://transak.com/crypto-coverage`
- Coinbase Onramp, preguntas frecuentes y redes: `https://docs.cdp.coinbase.com/onramp/additional-resources/faq` y `https://docs.cdp.coinbase.com/onramp/additional-resources/layer-2-networks`
- Circle, direcciones de USDC: `https://developers.circle.com/stablecoins/usdc-contract-addresses`
