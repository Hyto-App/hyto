# Hyto

Informe del proyecto · 27 de septiembre de 2026

Pagos por hitos: el dinero queda comprometido antes del trabajo, cada tarea o gasto se respalda con evidencia y el informe está listo al cerrar el proyecto.

| | |
|---|---|
| **Hackathon** | Find Your Way Hackathon: Costa Rica, de Stellar (Tellus Cooperative / Stellar Chile), en Stellar Passport. General Track. |
| **Entrega** | 5 de octubre de 2026, 4:00 p.m. La zona horaria no está confirmada. Se planifica como 1:00 p.m. hora de Costa Rica, por si el cierre es hora de Chile. |
| **Meetup** | Miércoles 30 de septiembre de 2026, TEC Cartago. Llegar a las 17:00. Luma indica 17:00–20:00; la descripción dice 18:00–20:00 provisional. |
| **Resultados** | 12 de octubre de 2026. Preparación para HackMeridian. |
| **Repositorio** | https://github.com/Hyto-App/hyto — organización Hyto-App, nombre visible Hyto. |
| **Equipo** | Josué, Sebas, Abdiel Cole, Esteban y Raúl. |

## 1. Premisa

Hyto es un sistema de control de gastos y pagos para empresas y equipos, construido sobre Stellar y Trustless Work. El organizador deposita el presupuesto en un escrow y lo divide en tareas o roles, cada uno con monto y condiciones. Cada integrante sube evidencia de su trabajo o el comprobante de un gasto. Una IA revisa esa evidencia y recomienda cumplió, parcial o insuficiente. Un administrador aprueba. En ese momento se libera el hito y el pago llega en USDC. Al cerrar, Hyto genera un informe con presupuesto contra gasto, quién hizo qué y el enlace en blockchain de cada pago.

El posicionamiento es corporativo primero: equipos y empresas. Los voluntariados (ZEEK y similares) son el caso que el equipo conoce y se usan en el demo. La ventaja principal es la facilidad para mover el dinero: comprometido antes del trabajo, transfronterizo, casi sin costo y verificable.

**Frase de pitch.** Ramp le dio a las empresas control total de su gasto. Hyto lo lleva un paso más allá, para cualquier equipo: cada colón comprometido antes del trabajo, cada tarea comprobada y cada pago registrado, con el informe listo al cerrar el proyecto.

## 2. Problema

En muchas comunidades y equipos el dinero se maneja de manera informal: transferencias por SINPE, acuerdos por WhatsApp, reembolsos de palabra. Nada queda respaldado y al final no hay informe.

- **Quien organiza** no sabe con certeza cuánto se gastó, en qué ni si cada tarea se cumplió. Armar un informe es trabajo manual y tardío.
- **Quien trabaja o gasta de su bolsillo** no tiene garantía de que le pagarán ni de cuándo.
- **Patrocinadores y socios** no pueden verificar el uso de los fondos.

El mismo problema aparece en gastos operativos, pagos por entregables y reembolsos de empresas y proyectos.

## 3. Cómo funciona

1. **Presupuesto con reglas.** El organizador crea un proyecto, deposita fondos en un escrow de Trustless Work y los divide por tareas, cada una con monto y condiciones. El dinero queda bloqueado.
2. **Evidencia obligatoria.** Cada hito es trabajo o reembolso. Los dos se suben con la misma cámara: una foto de lo hecho, o una foto de la factura. La revisión es la misma.
3. **Revisión con IA.** Llama 4 Scout describe la foto. Laya, en la computadora Windows de Abdiel, la clasifica con tres respuestas. El código arma cumplió, parcial o insuficiente. Ninguno mueve dinero.
4. **Aprobación humana.** El administrador puede contradecir a la IA. Si aprueba, el hito se libera y el USDC llega a la wallet. El pago es todo o nada: un cumplimiento parcial pide más evidencia o aprueba el monto completo.
5. **Informe.** Al cerrar: presupuesto contra gasto, detalle por persona con evidencia y el enlace público de cada pago.

Modelo técnico: un escrow multi-release por proyecto. Cada hito tiene su monto y su receptor, y se paga solo. Hasta 5 direcciones por rol y 50 hitos. La foto se queda fuera de la cadena. En el hito se guarda un texto corto de evidencia, más el estado y el pago.

| Rol en Trustless Work | En Hyto |
|---|---|
| Fondeador | Organizador. Deposita el presupuesto. No es un rol del contrato. |
| Admin del contrato | Otra dirección. Despliega y edita hitos solo antes de fondear. No aprueba, no libera y no cobra. |
| Aprobador y firmante de liberación | Organizador, en las dos listas. Una firma de `approve-and-release` hace las dos cosas. |
| Proveedor | Integrante. Marca el estado y adjunta la referencia de la evidencia. Hasta 5. El demo usa 3. |
| Receptor del hito | La wallet de quien cobra esa tarea. Necesita trustline de USDC. |
| Resolución de disputas | Cuenta aparte, sin coincidir con los roles de arriba. El MVP no la usa. |
| Platform | Comisión de Hyto en 0. No es el admin de la app. |

## 4. Por qué Stellar y cuánto cuesta

- El dinero queda comprometido en escrow antes del trabajo.
- Los pagos son transfronterizos, casi sin costo y en segundos, en USDC.
- Cada pago es verificable en público.
- Trustless Work ya ofrece el escrow. El equipo no escribe un contrato propio.

Para el demo, el stack cuesta $0. Trustless Work en testnet es gratis: API, API key y escrows de prueba, sin mensualidad. El 0,3 % se cobra solo en mainnet, cuando un hito se libera con dinero real. La comisión de plataforma de Hyto va en 0. En testnet, el XLM de las comisiones de red lo da Friendbot.

La app corre en Vercel. Neon (Postgres) y Vercel Blob están en el plan gratis del demo. También son gratis Trustless Work en testnet, Llama 4 Scout en Groq y Laya en la PC Windows de Abdiel. Si Groq no responde o esa PC está apagada, el veredicto sale de un guion fijo y el resto de la web sigue. Cavos patrocina el XLM con el saldo de gas de la app en su dashboard; ese saldo hay que revisarlo antes del demo.

## 5. Referencias

**Ramp** inspira el control: límites antes de gastar, comprobante obligatorio, revisión con IA, aprobación y reportes. Hyto agrega el dinero bloqueado en escrow, el pago por objetivo, USDC transfronterizo y el enlace público de cada pago.

**Wink** (Costa Rica) se mencionó como app local de comprobantes. No está verificada. La diferencia de Hyto es el escrow previo, el pago transfronterizo y la verificabilidad pública.

**VolunChain** es un antecedente en testnet, inactivo y sin licencia. Sirve solo como referencia de diseño. No se copia código. No tiene escrow por presupuesto, revisión de evidencia ni informe automático.

## 6. Stack

Cerrado el 27 de septiembre de 2026. Una sola app. El detalle operativo está en [STACK.md](STACK.md).

| Capa | Decisión |
|---|---|
| App | Next.js 16.3.6 o superior, App Router, TypeScript, Tailwind. El 30 de septiembre, subir a 16.3.7 cuando salga el parche de seguridad. |
| Pantallas | Móvil para el integrante, dashboard para el admin. Poppins. Acento lima `#B7EE34`, texto del botón `#08090C`. Lo definió Abdiel en el PR #7. |
| Wallet | Cavos (`@cavos/kit`) en Stellar testnet. Cuenta `G…`. Firma el XDR de Trustless Work con `signXdr`. https://docs.cavos.xyz/docs/stellar |
| Escrow | Trustless Work v2 multi-release, en beta.api.trustlesswork.com, solo desde el servidor. La clave no va al navegador. |
| Dónde corre | Vercel. La única computadora encendida es la de Abdiel, para Laya. |
| Datos | Neon Postgres con Drizzle. `DATABASE_URL`. |
| Archivos | Vercel Blob, almacén privado. La foto no va al disco de la app ni a la blockchain. |
| IA | Scout en Groq describe la foto. Laya corre en la PC Windows de Abdiel (`LAYA_URL`) y responde categoría, si cumple la condición y qué tan completa está la evidencia. No va en Vercel. El código arma el veredicto. Si falla, un guion fijo. |
| Informe | Página imprimible y enlace a stellar.expert en testnet. |
| USDC | Testnet. Emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. |

Ejemplo de las dos IA: la tarea es montar el stand de ZEEK, con banner visible y mesa armada. Scout describe la foto: "Mesa armada, banner de ZEEK de frente, tres cajas abiertas. No se ve el fondo del salón." Laya responde categoría stand, condición cumplida y evidencia parcial. El código marca parcial. El tope de un reembolso lo compara el código, no Laya. La justificación en pantalla es el texto de Scout más esas tres respuestas.

Acta es viable en el demo, como una sola credencial y no como el sistema de pago. Trustless Work libera el USDC, Cavos firma la emisión y el informe abre "esta persona cumplió esta tarea". En testnet son 5 XLM de Friendbot. Leerla después no vuelve a cobrar. En mainnet sería 1 USDC por credencial. Si todavía no hay un pago en USDC, esa credencial no entra y el informe se queda con el hash de Stellar.

## UX

Hyto se usa como Ramp y se ve como una app web normal. El integrante, en el teléfono, abre su tarea, toma una foto y envía. El administrador, en el escritorio, ve tres números y una bandeja, y aprueba con un botón. La recomendación de la IA es una tarjeta corta al lado de la foto, no un informe.

La entrada es un botón con Cavos. No hay extensión, frase semilla ni pantalla de configuración de Stellar. La cuenta se crea cuando hace falta cobrar o fondear. En la interfaz se dice pago, tarea y evidencia. "Ver pago" es un enlace después de aprobar, no un paso para entender la red.

**Salida del lunes 28.** Si no se puede desplegar, fondear y liberar un hito en el beta, ese día la API pasa a `dev.api.trustlesswork.com` (v1). La app no se reescribe. En v1 hay un solo proveedor: el operador marca el estado y los voluntarios quedan solo como receptores de cada hito.

## 7. Roles

El detalle para la IA de cada integrante está en [ROLES.md](ROLES.md). El orden de trabajo, sin esperarse entre personas salvo un dato concreto, está en [PLAN.md](PLAN.md). Cada persona actúa solo dentro de su rol.

| Persona | Rol | Empieza por | Listo cuando |
|---|---|---|---|
| Abdiel Cole | UX, marca y Laya | Poppins y lima `#B7EE34` ya están (PR #7). Sigue Laya en su PC Windows | El demo puede llamar a `LAYA_URL` |
| Esteban | Backend | Neon, Blob, rutas y revisión con stub de Laya | La app en Vercel guarda un proyecto, una foto y un veredicto |
| Sebas | Escrow y wallet | App de Cavos, y un hito liberado con un script propio | Hay un pago de prueba en testnet, el `appId` y el módulo de firma |
| Josué | App del admin | Pantallas del admin sobre la base Next.js ya en `main` | El admin crea, revisa, aprueba y abre el informe |
| Raúl | App del integrante | Mis tareas, subir evidencia y `/cuentas` ya están; las cuatro cuentas esperan el `appId` | El integrante ve su tarea, sube una foto y aparece en revisión |

Abdiel no bloquea el código: Esteban y Sebas avanzan con el stack. Raúl es nuevo en hackatones. Su parte se ve en el demo. Josué revisa su app y Sebas revisa las wallets. Raúl no toma el escrow ni la arquitectura.

Pantallas: inicio del admin (presupuesto, pagado, pendiente), crear proyecto, mis tareas, subir evidencia, panel de revisión e informe. Josué ya dejó las del admin en `main` (PR #3). Raúl ya dejó mis tareas, subir evidencia y `/cuentas` (PR #1, 28 de septiembre de 2026). Abdiel dejó Poppins y el lima `#B7EE34` (PR #7, el 28 de septiembre a las 2:58 p.m., hora de Costa Rica). La base de Next.js salió en el PR #1; Josué no la vuelve a crear. `NEXT_PUBLIC_CAVOS_APP_ID` y `LAYA_URL` todavía no están. Sebas tiene abierto el PR #8 (módulo de firma); todavía no está en `main`.

## 8. Guion de demo

Evento de ZEEK. Los montos son de ejemplo.

1. El organizador crea 3 tareas de voluntariado y 1 reembolso de comida. Ejemplo: US$20 por tarea y hasta US$15 de comida.
2. Fondea el escrow. El dashboard muestra el presupuesto total.
3. Voluntario 1 sube evidencia completa. La IA dice cumplió. El admin aprueba. Llega USDC.
4. Voluntario 2 sube evidencia incompleta. La IA dice parcial. El admin pide más evidencia o aprueba el monto completo.
5. Voluntario 3 no sube evidencia. Sigue pendiente y los fondos siguen en el escrow.
6. Reembolso: foto del comprobante, la IA revisa, se aprueba y se paga.
7. Informe con presupuesto contra gasto, evidencia y enlaces.

Josué cierra el guion el sábado 3 de octubre. Raúl prepara las cuentas. Sebas hace el pago en vivo.

**Pitch de 3 minutos.** 0:00 gancho. 0:20 problema (SINPE y WhatsApp). 0:50 solución. 1:20 demo. 2:20 por qué Stellar. 2:40 equipo, visión y siguiente paso.

## 9. Hackathon

| Track | Premio |
|---|---|
| General Track | US$4,000. 1.º US$2,000 · 2.º US$1,000 · 3.º US$500 · dos menciones de US$250 |
| University Track | Resto de la bolsa de US$5,000. Solo universidades chilenas. No aplica. |

Registrarse en Luma no basta. Cada integrante crea cuenta en Stellar Passport, se inscribe en la hackathon y en el evento, entra al equipo y confirma el meetup del 30 de septiembre. Conviene confirmar la zona horaria del cierre con la organización.

- Registro: https://demo.stellarpassport.xyz/auth/signup
- Hackathon: https://demo.stellarpassport.xyz/hackathons/find-your-way-meridian-hackathon
- Evento: https://demo.stellarpassport.xyz/events/stellar-chile/find-your-way-hackathon-costa-rica
- Trustless Work: https://trustlesswork.com
- Precios: https://www.trustlesswork.com/pricing

## 10. Fechas de la hackathon

El orden para construir está en [PLAN.md](PLAN.md). Esta tabla solo marca lo que no controla el equipo.

| Fecha | Qué pasa |
|---|---|
| Dom 27 sep | Repositorio, stack, roles y plan compartidos. |
| Mié 30 sep | Meetup en TEC Cartago, llegar a las 17:00. Confirmar la hora de cierre. Subir Next.js a 16.3.7. |
| Sáb 3 oct | Ensayo del guion de ZEEK. La PC de Abdiel queda encendida. |
| Dom 4 oct | Grabar la demo, pulir el pitch y enviar. |
| Lun 5 oct | Colchón. Cierre 4:00 p.m., posiblemente 1:00 p.m. hora de Costa Rica. |
| Lun 12 oct | Resultados. |

## 11. Identidad y riesgos

Hyto viene de pagos por hitos y también significa un logro. El login de GitHub `hyto` ya pertenecía a otra persona, así que la organización es Hyto-App y el repositorio es Hyto-App/hyto. El nombre visible es Hyto. Tono: claro, profesional y cercano. Se dice pago, no jerga cripto, cuando se pueda. El color de acento es el lima `#B7EE34` y la tipografía es Poppins, definidos por Abdiel (PR #7, 28 de septiembre de 2026). Sigue pendiente la dirección de Laya.

Taglines posibles:

- «Cada pago, un hito cumplido.»
- «El dinero comprometido. El trabajo comprobado. El pago al instante.»
- «Control de gastos que paga cuando se cumple.»

Riesgos a vigilar: ocho días de plazo, la zona horaria del cierre, la inscripción incompleta, que el beta de Trustless Work falle el lunes, que la IA se equivoque (por eso decide una persona) y la privacidad de los comprobantes (no van a la cadena).

Fuera del MVP: reputación amplia, disputas completas, mainnet y más de una credencial de Acta.
