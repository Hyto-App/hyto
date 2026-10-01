# Hyto

Informe del proyecto · 27 de septiembre de 2026

El estado del código al 1 de octubre de 2026 (`0d2c402`, 3:33 p.m., hora de Costa Rica) está en [AGENTS.md](AGENTS.md). Este informe describe la premisa. Donde diga que Fondear y Aprobar no llaman al módulo, o que `NEXT_PUBLIC_CAVOS_APP_ID` no está, eso era el 28 de septiembre. En `main` la revisión ya firma. Si desplegar sale bien y fondear falla, ofrece **Finish locking** (PR #67, Raúl, merge de Josué Valles; el rótulo es del PR #77). Los avisos de servidor que faltaban quedaron en inglés (PR #68, el mismo momento). A las 11:25 a.m. Josué dejó el pago en lenguaje llano (PR #77): **Lock budget** y **Approve and pay**, este último solo con el presupuesto bloqueado. A las 3:33 p.m. Raúl, con Josué como coautor, dejó el reembolso a la espera de un monto confirmado (PR #69). El paso principal que sigue es hacer funcionar la revisión de la foto (Groq `qwen/qwen3.8-27b` y Laya). Lo pendiente por persona está en [AGENTS.md](AGENTS.md).

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
3. **Revisión con IA.** Qwen 3.8 27B en Groq describe la foto. Laya, en la computadora Windows de Abdiel, la clasifica con tres respuestas. El código arma cumplió, parcial o insuficiente. Ninguno mueve dinero.
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

La app corre en Vercel. Neon (Postgres) y Vercel Blob están en el plan gratis del demo. También son gratis Trustless Work en testnet, Qwen 3.8 27B en Groq y Laya en la PC Windows de Abdiel. Si Groq no responde o esa PC está apagada, la revisión queda en `origen: "error"` y el resto de la web sigue. Sin `LAYA_URL`, y con Groq respondiendo, entra el stub. Cavos patrocina el XLM con el saldo de gas de la app en su dashboard; ese saldo hay que revisarlo antes del demo.

## 5. Referencias

**Ramp** inspira el control: límites antes de gastar, comprobante obligatorio, revisión con IA, aprobación y reportes. Hyto agrega el dinero bloqueado en escrow, el pago por objetivo, USDC transfronterizo y el enlace público de cada pago.

**Wink** (Costa Rica) se mencionó como app local de comprobantes. No está verificada. La diferencia de Hyto es el escrow previo, el pago transfronterizo y la verificabilidad pública.

**VolunChain** es un antecedente en testnet, inactivo y sin licencia. Sirve solo como referencia de diseño. No se copia código. No tiene escrow por presupuesto, revisión de evidencia ni informe automático.

## 6. Stack

Cerrado el 27 de septiembre de 2026. Una sola app. El detalle operativo está en [STACK.md](STACK.md).

| Capa | Decisión |
|---|---|
| App | Next.js 16.3.6, App Router, TypeScript, Tailwind. Al 1 de octubre de 2026 el parche 16.3.7 no entró. |
| Pantallas | Móvil para el integrante, dashboard para el admin. Poppins. Acento lima `#B7EE34`, texto del botón `#08090C`. Lo definió Abdiel en el PR #7. |
| Wallet | Cavos (`@cavos/kit`) en Stellar testnet. Cuenta `G…`. Firma el XDR de Trustless Work con `signXdr`. https://docs.cavos.xyz/docs/stellar |
| Escrow | Trustless Work v2 multi-release, en beta.api.trustlesswork.com, solo desde el servidor. La clave `TRUSTLESS_API_KEY` no va al navegador. El módulo y `npm run hito` ya están (PR #8). En `0d2c402`, **Lock budget** y **Approve and pay** salen de la revisión. **Approve and pay** espera el presupuesto bloqueado (PR #77). Si el fondeo falla después del despliegue, la pantalla ofrece **Finish locking** (PR #67). Un reembolso usa el monto confirmado, no la lectura del comprobante (PR #69). Falta un pago real en testnet. |
| Dónde corre | Vercel. La única computadora encendida es la de Abdiel, para Laya. |
| Datos | Neon Postgres con Drizzle. `DATABASE_URL`. |
| Archivos | Vercel Blob, almacén privado. La foto no va al disco de la app ni a la blockchain. |
| IA | Groq, modelo `qwen/qwen3.8-27b` (`lib/revision/scout.ts`, `max_completion_tokens: 1024`), con `GROQ_API_KEY`. Los nombres `scout` son restos de Llama 4 Scout. Si falta la clave o un modelo falla, el origen queda en `error` y la pantalla lo muestra. Laya (`lib/revision/laya.ts`) necesita `LAYA_URL`; todavía no está, y el stub deja el trabajo en `parcial`. El índice de `probabilities` ya está (PR #59). El detalle está en [AGENTS.md](AGENTS.md). |
| Informe | Página imprimible y enlace a stellar.expert en testnet. |
| USDC | Testnet. Emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. |

Ejemplo de las dos IA: la tarea es montar el stand de ZEEK, con banner visible y mesa armada. Qwen describe la foto: "Mesa armada, banner de ZEEK de frente, tres cajas abiertas. No se ve el fondo del salón." Laya responde categoría stand, condición cumplida y evidencia parcial. El código marca parcial. El tope de un reembolso lo compara el código, no Laya. La justificación en pantalla es el texto de la foto más esas tres respuestas.

Acta es viable en el demo, como una sola credencial y no como el sistema de pago. Trustless Work libera el USDC, Cavos firma la emisión y el informe abre "esta persona cumplió esta tarea". En testnet son 5 XLM de Friendbot. Leerla después no vuelve a cobrar. En mainnet sería 1 USDC por credencial. El módulo de firma ya está y no dejó un pago en USDC, así que esa credencial no entra y el informe se queda con el hash de Stellar.

## UX

Hyto se usa como Ramp y se ve como una app web normal. El integrante, en el teléfono, abre su tarea, toma una foto y envía. El administrador, en el escritorio, ve tres números y una bandeja, y aprueba con un botón. La recomendación de la IA es una tarjeta corta al lado de la foto, no un informe.

La entrada es un botón con Cavos. No hay extensión, frase semilla ni pantalla de configuración de Stellar. La cuenta se crea cuando hace falta cobrar o fondear. En la interfaz se dice pago, tarea y evidencia. **View on blockchain** es un enlace después de aprobar, no un paso para entender la red.

**Salida del lunes 28.** El script del hito ya está en el repositorio (PR #8 de Sebas, a las 3:48 p.m., hora de Costa Rica). Si el beta no despliega, fondea y libera, el mismo script pasa a `dev.api.trustlesswork.com` (v1). La app no se reescribe. En v1 hay un solo proveedor: el operador marca el estado y los voluntarios quedan solo como receptores de cada hito. Sin `TRUSTLESS_API_KEY`, o si Circle no entrega USDC, no queda un pago y el Acta no entra.

## 7. Roles

El detalle para la IA de cada integrante está en [ROLES.md](ROLES.md). El orden de trabajo, sin esperarse entre personas salvo un dato concreto, está en [PLAN.md](PLAN.md). Cada persona actúa solo dentro de su rol.

| Persona | Rol | Empieza por | Listo cuando |
|---|---|---|---|
| Abdiel Cole | UX, marca y la IA de la evidencia | Poppins y lima `#B7EE34` ya están (PR #7). Ocultar el pago hasta el fondeo entró en el PR #77, de Josué. Sigue Laya en su PC | El demo llama a `LAYA_URL` y Groq responde con una foto real |
| Esteban | Seguridad del backend | Neon, Blob, rutas y el ingreso ya están. Sigue el allow-list de imágenes, las cabeceras y el JWT cerrado en producción | Esos tres controles están en `main` y las pruebas cubren el rechazo |
| Sebastián | CI y el Acta | El módulo y el script ya están (PR #8). El `appId` de Cavos ya está en Vercel. Siguen la prueba que toca Neon, GitHub Actions y, después de un pago, el Acta | `npm test` pasa en limpio y hay un workflow verde. El Acta espera el hash |
| Josué | Escrow, trustline y el primer pago | Las pantallas del admin ya firman. El PR #77 dejó el lenguaje llano. Siguen la trustline patrocinada, el preflight, el `contractId` en la base y un pago real en testnet | `tareas.hash_pago` tiene un hash de testnet y **View on blockchain** lo abre |
| Raúl | Integrante y los avisos | Mis tareas y `/cuentas` ya están (PR #1). El 1 de octubre entraron el PR #67, el PR #68 y el PR #69. Abiertos: PR #72 y PR #80 | La evidencia se toma con la cámara, y Laya pregunta sobre el texto escrito |

Abdiel no bloquea el código: el resto avanza con el stack. Raúl es nuevo en hackatones. Su parte se ve en el demo. El 1 de octubre también cerró el fondeo a medias (PR #67), los avisos de servidor en inglés (PR #68) y, a las 3:33 p.m., el monto confirmado del reembolso (PR #69). Josué, a las 11:25 a.m., dejó el pago en lenguaje llano (PR #77) y sigue con el escrow que falta para el primer pago. Sebastián lleva la CI. El Acta sigue después de ese pago.

Pantallas: inicio del admin (presupuesto, pagado, pendiente), crear proyecto, mis tareas, subir evidencia, panel de revisión e informe. Josué ya dejó las del admin en `main` (PR #3). Raúl ya dejó mis tareas, subir evidencia y `/cuentas` (PR #1, 28 de septiembre de 2026). La auditoría de esas pantallas entró en el PR #4, a las 3:47 p.m., hora de Costa Rica, con Josué Valles como coautor. Abdiel dejó Poppins y el lima `#B7EE34` (PR #7, a las 2:58 p.m.). La base de Next.js salió en el PR #1; Josué no la vuelve a crear. `LAYA_URL` todavía no está. Sebas dejó el módulo de firma y el script del hito en `main` (PR #8, squash `ae10a9e`, a las 3:48 p.m.). Lo empujó Josué Valles. No hay hash de un pago real en el repositorio.

## 8. Guion de demo

Evento de ZEEK. Los montos son de ejemplo.

1. El organizador crea 3 tareas de voluntariado y 1 reembolso de comida. Ejemplo: US$20 por tarea y hasta US$15 de comida.
2. Fondea el escrow. El dashboard muestra el presupuesto total.
3. Voluntario 1 sube evidencia completa. La IA dice cumplió. El admin aprueba. Llega USDC.
4. Voluntario 2 sube evidencia incompleta. La IA dice parcial. El admin pide más evidencia o aprueba el monto completo.
5. Voluntario 3 no sube evidencia. Sigue pendiente y los fondos siguen en el escrow.
6. Reembolso: foto del comprobante, la IA revisa, el organizador confirma el monto dentro del tope, se aprueba y se paga.
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

Riesgos a vigilar: ocho días de plazo, la zona horaria del cierre, la inscripción incompleta, que el beta de Trustless Work no libere el hito (el script del PR #8 ya pasa a v1 si eso pasa; todavía no hay un pago guardado), que la IA se equivoque (por eso decide una persona) y la privacidad de los comprobantes (no van a la cadena).

Fuera del MVP: reputación amplia, disputas completas, mainnet y más de una credencial de Acta.
