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
3. **Revisión con IA.** Qwen 3.8 27B en Groq describe la foto. Laya, en la computadora Windows de Abdiel, la clasifica con tres respuestas. El código arma cumplió, parcial o insuficiente. Ninguno mueve dinero.
4. **Aprobación humana.** El administrador puede contradecir a la IA. Si aprueba, el hito se libera y el USDC llega a la wallet. El pago es todo o nada: un cumplimiento parcial pide más evidencia o aprueba el monto completo.
5. **Informe.** Al cerrar: presupuesto contra gasto, detalle por persona con evidencia y el enlace público de cada pago.

Modelo técnico: un escrow multi-release por proyecto. Cada hito tiene su monto y su receptor, y se paga solo. Hasta 5 direcciones por rol y 50 hitos. La foto se queda fuera de la cadena. En el hito se guarda un texto corto de evidencia, más el estado y el pago.

| Rol en Trustless Work | En Hyto |
|---|---|
| Fondeador | Organizador. Deposita el presupuesto. No es un rol del contrato. |
| Admin del contrato | Otra dirección. Despliega y edita hitos solo antes de fondear. No aprueba, no libera y no cobra. |
| Aprobador y firmante de liberación | Organizador, en las dos listas. Desde el PR #26 (29 de septiembre, 11:28 a.m., hora de Costa Rica) son dos firmas: aprobar y, después, liberar. |
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

La app corre en Vercel. Neon (Postgres) y Vercel Blob están en el plan gratis del demo. También son gratis Trustless Work en testnet, Qwen 3.8 27B en Groq y Laya en la PC Windows de Abdiel. Si Groq no responde o esa PC está apagada, el veredicto sale de un guion fijo y el resto de la web sigue. Cavos patrocina el XLM con el saldo de gas de la app en su dashboard; ese saldo hay que revisarlo antes del demo.

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
| Wallet | Cavos (`@cavos/kit`) en Stellar testnet. Cuenta `G…`. Firma el XDR de Trustless Work con `signXdr`. https://docs.cavos.xyz/docs/stellar. Desde el PR #28 (29 de septiembre, 10:14 a.m., hora de Costa Rica), Entrar muestra avisos claros: un 429 cuenta los segundos, desactiva «Enviar código» y deja 20 segundos de respiro tras cada envío. Desde el PR #23 (10:45 a.m.), `POST /api/sesion` verifica la firma del JWT. Sin `CAVOS_JWT_JWK` ni `CAVOS_JWKS_URL` no hay sesión. Desde el PR #30 (11:30 a.m.), con `HYTO_DEMO_LOGIN=1` se puede entrar sin billetera; esa sesión no firma. Desde el PR #36 (11:48 a.m.) se ve el rol, se puede cambiar al otro y salir: `DELETE /api/sesion` borra la fila y expira `hyto_sesion`. |
| Escrow | Trustless Work v2 multi-release, en beta.api.trustlesswork.com, solo desde el servidor. La clave `TRUSTLESS_API_KEY` no va al navegador. El módulo y `npm run hito` ya están (PR #8, 28 de septiembre a las 3:48 p.m., hora de Costa Rica). El PR #26 separó aprobar (`approve-milestones`) y liberar (`release-funds`), y agregó disputar, resolver y `GET /api/escrow/[contrato]`. El reintento en v1 pide `TRUSTLESS_API_KEY_V1`. El PR #38 (29 de septiembre, 12:38 p.m.) despliega un escrow por tarea y guarda el hash al liberar. El PR #39 (12:42 p.m.) firma desplegar, fondear, marcar, aprobar y liberar desde la revisión. Preparar y enviar el pago exigen sesión (PR #14). Desde el PR #23 esa sesión exige un JWT verificado. Una sesión demo responde 403 (PR #30). |
| Dónde corre | Vercel. La única computadora encendida es la de Abdiel, para Laya. |
| Datos | Neon Postgres con Drizzle. `DATABASE_URL`. El esquema, la migración y la semilla de ZEEK están en el repo (PR #14 de Esteban, el 28 de septiembre a las 11:40 p.m., hora de Costa Rica). Las tablas de `0000_inicio.sql` ya se corrieron. Falta la variable en el sitio y correr `drizzle/0001_contrato_escrow.sql` (PR #38, 12:38 p.m.). Desde el PR #22 (29 de septiembre, 9:50 a.m.), migrar o sembrar un host listado en `HYTO_HOST_BASE_PRODUCCION` pide `HYTO_CONFIRMAR_BASE_PRODUCCION=si`. Desde el PR #21 (10:03 a.m.), un host que no es Neon se migra con el protocolo de Postgres, y `npm run db:local` levanta, migra y siembra en esta máquina. La semilla deja las tareas en pendiente. Desde las 10:10 a.m. el PR #24 inventaría el esquema sin abrir la base, y desde las 10:13 a.m. el PR #25 lo cruza con una copia en solo lectura. |
| Archivos | Vercel Blob, almacén privado. La foto no va al disco de la app ni a la blockchain. Falta crear ese almacén y poner la clave en el sitio. |
| IA | Qwen 3.8 27B en Groq describe la foto. Laya corre en la PC Windows de Abdiel (`LAYA_URL`) y responde categoría, si cumple la condición y qué tan completa está la evidencia. No va en Vercel. El código arma el veredicto. Si falla, un guion fijo. |
| Informe | Página imprimible y enlace a stellar.expert en testnet. |
| USDC | Testnet. Emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. |

Ejemplo de las dos IA: la tarea es montar el stand de ZEEK, con banner visible y mesa armada. Qwen describe la foto: "Mesa armada, banner de ZEEK de frente, tres cajas abiertas. No se ve el fondo del salón." Laya responde categoría stand, condición cumplida y evidencia parcial. El código marca parcial. El tope de un reembolso lo compara el código, no Laya. La justificación en pantalla es el texto de la foto más esas tres respuestas.

Acta es viable en el demo, como una sola credencial y no como el sistema de pago. Trustless Work libera el USDC, Cavos firma la emisión y el informe abre "esta persona cumplió esta tarea". En testnet son 5 XLM de Friendbot. Leerla después no vuelve a cobrar. En mainnet sería 1 USDC por credencial. El módulo de firma ya está y no dejó un pago en USDC, así que esa credencial no entra y el informe se queda con el hash de Stellar.

## UX

Hyto se usa como Ramp y se ve como una app web normal. El integrante, en el teléfono, abre su tarea, toma una foto y envía. El administrador, en el escritorio, ve tres números y una bandeja, y aprueba con un botón. La recomendación de la IA es una tarjeta corta al lado de la foto, no un informe.

La entrada es un botón con Cavos. Si el ingreso falla, la pantalla dice el motivo en claro (PR #28, 29 de septiembre a las 10:14 a.m., hora de Costa Rica): un 429 cuenta los segundos y desactiva «Enviar código», y después de pedir el código hay 20 segundos de respiro. Desde las 10:45 a.m. (PR #23) la sesión del servidor exige un JWT verificado. Desde las 11:30 a.m. (PR #30), con `HYTO_DEMO_LOGIN=1`, «Entrar como demo» abre la sesión sin billetera y las firmas quedan apagadas. Desde las 11:48 a.m. (PR #36) esa sesión muestra el rol, permite cambiar al otro y salir. No hay extensión, frase semilla ni pantalla de configuración de Stellar. La cuenta se crea cuando hace falta cobrar o fondear. En la interfaz se dice pago, tarea y evidencia. "Ver pago" es un enlace después de aprobar, no un paso para entender la red.

**Salida del lunes 28.** El script del hito ya está en el repositorio (PR #8 de Sebas, a las 3:48 p.m., hora de Costa Rica). Si el beta no despliega, fondea y libera, el mismo script pasa a `dev.api.trustlesswork.com` (v1), solo si hay `TRUSTLESS_API_KEY_V1` distinta de `TRUSTLESS_API_KEY` (PR #26, 29 de septiembre a las 11:28 a.m.). La app no se reescribe. En v1 hay un solo proveedor: el operador marca el estado y los voluntarios quedan solo como receptores de cada hito. En v2, aprobar y liberar son dos firmas. Sin `TRUSTLESS_API_KEY`, o si Circle no entrega USDC, no queda un pago y el Acta no entra.

## 7. Roles

El detalle para la IA de cada integrante está en [ROLES.md](ROLES.md). El orden de trabajo, sin esperarse entre personas salvo un dato concreto, está en [PLAN.md](PLAN.md). Cada persona actúa solo dentro de su rol.

| Persona | Rol | Empieza por | Listo cuando |
|---|---|---|---|
| Abdiel Cole | UX, marca y Laya | Poppins y lima `#B7EE34` ya están (PR #7). Sigue Laya en su servidor, y una clave con Esteban | El demo puede llamar a `LAYA_URL` |
| Esteban | Backend | Neon, Blob, rutas, revisión e ingreso ya están (PR #14). Falta cargar las variables en el sitio, correr `drizzle/0001_contrato_escrow.sql` (PR #38), una de `CAVOS_JWT_JWK` o `CAVOS_JWKS_URL` (PR #23: sin ella no hay sesión) y confirmar lo que marquen el inventario (PR #24) y el cruce de solo lectura (PR #25) | La app en Vercel guarda un proyecto, una foto y un veredicto |
| Sebas | Escrow y wallet | El módulo, el script y el `appId` de Cavos ya están (PR #8). El PR #26 pide `TRUSTLESS_API_KEY_V1` para repetir en v1. El PR #38 pide tres cuentas `HYTO_ESCROW_*`. Sigue un pago en USDC | Hay un pago de prueba en testnet. El Acta va después de ese pago |
| Josué | App del admin | Pantallas del admin y, el 29 de septiembre, el entorno, la base local, el JWT, el escrow v2, el ingreso demo y la firma en la revisión (PR #39, 12:42 p.m.). La bandeja de una sesión real lee la API. Sigue Crear proyecto en el navegador, disputar y resolver sin botón, encender `HYTO_DEMO_LOGIN=1` si el pitch entra sin billetera, y el regreso de Google (PR #18, abierto) | El admin crea el proyecto en la base, revisa, aprueba y libera en Stellar, y abre el informe |
| Raúl | App del integrante | Mis tareas, subir evidencia y `/cuentas` ya están (PR #1), con la auditoría del PR #4. El `appId` ya está. Faltan las cuatro cuentas; el ingreso pide el código del correo. El ingreso demo no las reemplaza (PR #30). Subir evidencia exige la cookie de sesión (PR #23) | El integrante ve su tarea, sube una foto y aparece en revisión |

Abdiel no bloquea el código: Esteban y Sebas avanzan con el stack. Raúl es nuevo en hackatones. Su parte se ve en el demo. Josué revisa su app y Sebas revisa las wallets. Raúl no toma el escrow ni la arquitectura.

Pantallas: inicio del admin (presupuesto, pagado, pendiente), crear proyecto, mis tareas, subir evidencia, panel de revisión e informe. Josué ya dejó las del admin en `main` (PR #3). Raúl ya dejó mis tareas, subir evidencia y `/cuentas` (PR #1, 28 de septiembre de 2026). La auditoría de esas pantallas entró en el PR #4, a las 3:47 p.m., hora de Costa Rica, con Josué Valles como coautor. Abdiel dejó Poppins y el lima `#B7EE34` (PR #7, a las 2:58 p.m.). La base de Next.js salió en el PR #1; Josué no la vuelve a crear. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel. `LAYA_URL` todavía no está. Sebas dejó el módulo de firma y el script del hito en `main` (PR #8, squash `ae10a9e`, a las 3:48 p.m.). Lo empujó Josué Valles. No hay hash de pago en el repositorio. Esteban dejó Neon, Blob, las rutas y el ingreso (PR #14, squash `ce9ff7c`, el 28 a las 11:40 p.m.). El 29 de septiembre, Josué precisó `.env.example` (PR #20, a las 9:16 a.m.), dejó pruebas contra Postgres local (PR #27, a las 9:44 a.m.) y centralizó el entorno con la salvaguarda de la base (PR #22, squash `7c64a54`, a las 9:50 a.m.). A las 10:03 a.m. el PR #21 (squash `9508e0c`) dejó Postgres en esta máquina y la semilla de ZEEK en pendiente, con evidencia de ejemplo. Pedir otra foto borra el veredicto. A las 10:10 a.m. el PR #24 (squash `5b8f242`) dejó el inventario del esquema, leído del código y sin abrir Neon. A las 10:13 a.m. el PR #25 (squash `99b8aa4`) dejó el cruce contra una copia, en solo lectura: no escribe en la base. A las 10:14 a.m. el PR #28 (squash `7256c56`) dejó avisos claros en Entrar. Un 429 cuenta los segundos, desactiva «Enviar código» y hay 20 segundos de respiro tras cada envío. A las 10:45 a.m. el PR #23 (squash `fca79a2`) dejó la verificación del JWT: sin `CAVOS_JWT_JWK` ni `CAVOS_JWKS_URL` no hay sesión. Subir evidencia solo acepta la tarea del integrante. Un 401 o un 403 no se guarda como ejemplo. A las 11:28 a.m. el PR #26 (squash `e2def81`) separó aprobar y liberar en v2, agregó disputar, resolver y la lectura del escrow, y el reintento en v1 quedó en `TRUSTLESS_API_KEY_V1`. A las 11:30 a.m. el PR #30 (squash `f7efbce`) dejó «Entrar como demo», apagado hasta `HYTO_DEMO_LOGIN=1`. Esa sesión no firma. A las 11:48 a.m. el PR #36 (squash `1c601bb`) dejó el rol visible, el cambio al otro rol y «Salir del demo». `DELETE /api/sesion` borra la fila y expira `hyto_sesion`. A las 12:38 p.m. el PR #38 (squash `a4eac84`) despliega un escrow por tarea y guarda el hash al liberar. A las 12:42 p.m. el PR #39 (squash `12b4e07`) firma eso desde la revisión. La bandeja y el informe leen la API fuera del modo demo. Crear proyecto sigue en el navegador. `npm run verificar:entorno` no imprime valores. Migrar o sembrar un host de producción listado pide confirmación explícita. Falta correr `drizzle/0001_contrato_escrow.sql`. El regreso de Google sigue abierto (PR #18).

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

Riesgos a vigilar: ocho días de plazo, la zona horaria del cierre, la inscripción incompleta, que el beta de Trustless Work no libere el hito (el script del PR #8 ya pasa a v1 si eso pasa; todavía no hay un pago guardado), que la IA se equivoque (por eso decide una persona) y la privacidad de los comprobantes (no van a la cadena).

Fuera de las pantallas del MVP: reputación amplia, la disputa en la interfaz (el módulo ya arma el XDR, PR #26), mainnet y más de una credencial de Acta.
