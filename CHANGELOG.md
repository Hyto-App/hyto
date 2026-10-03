# Changelog

Newest first. Entries from 2026-10-02 on are in English and describe `main`. Older entries were written in Spanish against the tree of that day; do not treat them as the current product.

## 2026-10-02

### Added

- The signed-out page scrolls. It keeps the hero ("Prove your worth. Get paid."), then How it works in three steps, volunteer and organizer cards, Meet Mile, an honest testnet FAQ, and the same sign-in button at the end.
- After sign-in, Events opens with a welcome card and "Take your first step". Get ready to be paid lives only there. Account no longer shows that button. Loading, error, success, and already-ready each have their own state. Demo mode hides the button.

Docs now match `main` at `2b9fad4`. Summary of what landed after the 29 September changelog:

### Changed

- One app shell (Events, Tasks, Account) in the Figma redesign, with light and dark. #82.
- Login no longer picks a global role. Creating an event (budget plus a 1 USDC balance check) makes that user the organizer. Teammates join by direct invite or an `HYTO-` code. Invites last 7 days. Tables `proyecto_miembros` and `proyecto_invitaciones`. Members see assigned tasks; the organizer sees all of them and assigns at `/eventos/[id]/tareas`. #85.
- Server and UI copy are in English. #56, #68, #77.
- If deploy succeeds and fund fails, the review screen resumes at fund. Pay stays hidden until the escrow balance reads as positive. #67.
- A reimbursement must have `monto_confirmado` before deploy. #69.
- Laya's score, when probabilities are present, follows the highest index (0 insuficiente, 1 parcial, 2 cumplió). #59.
- Review failures are stored and can be retried, instead of a silent fixed script. #45.
- The session follows the Cavos JWT expiry, capped at 24 hours. #54, #52.
- The organizer is per event. Demo mode cannot create events. #44, #47.
- Prepare and submit use an HMAC token (`HYTO_TOKEN_SECRET`).
- Task owners are suggestions. Team coordination moves to the private repo Hyto-App/hyto-private. #66.
- Stellar Raven is mandatory for agents. A code audit was recorded for 30 September. #62, #64, #65.
- The review grade is a percentage from 0 to 100. It is the weighted sum of the answered questions (`PESOS_PREGUNTAS`). The screen shows Insuficiente, Parcialmente completado, or Completado next to the percentage. The percentage does not approve a payment.
- `calificar` caps a grave fault at 49 (classification "otra", work that does not match, work not started, or a different kind of expense) and an unreasonable expense at 79. A reimbursement with no amount, no date, or over the cap stays at 40 or below. The lowest cap wins. Weights are unchanged.
- Reason tags next to the grade explain the answers already collected, including the cap. They do not approve or pay.

### Not in the repo yet

- A successful real testnet USDC payment (`hash_pago`).
- Production fail-closed checks for Cavos JWT audience and issuer, a proof of wallet ownership, SVG upload blocking, and CI. Those stay open. See [docs/AUDIT-2026-09-30.md](docs/AUDIT-2026-09-30.md).

## 2026-10-02

### Cambiado

- Laya recibe el cuestionario aprobado por Raúl. Primero clasifica la descripción (trabajo, factura u otra cosa). Después pregunta solo ese camino. El veredicto sale del puntaje final y baja si otra señal dice que falta algo o que el gasto no corresponde. Un sí suelto no aprueba el pago. Las reglas de monto, fecha y tope del reembolso siguen igual.
- La nota final es un porcentaje de 0 a 100. Es la suma de los pesos de las preguntas contestadas a favor. Los pesos están en `PESOS_PREGUNTAS`. Una banda (insuficiente, parcial, cumplió) solo sirve para el color. El porcentaje no aprueba el pago. Un reembolso sin monto, sin fecha o sobre el tope queda en 40 como máximo.

## 2026-09-29

### Nuevo

- La base ya guarda usuarios, proyectos, tareas, evidencias, el resultado de la revisión y el enlace del pago. Ese enlace sigue vacío. El correo indica el rol de cada persona. Hay una carga inicial del evento ZEEK. Las fotos van a un almacén privado y en la base queda la referencia. Esteban (Psybre), PR #14.
- Ya se puede pedir la lista de tareas, subir una evidencia y verla (también la foto), crear un proyecto, abrir el informe y pedir la revisión. El informe abre aunque el pago no tenga enlace. Si el enlace existe, Ver pago lo usa. Esteban (Psybre), PR #14.
- La revisión describe la foto con Qwen. Si la herramienta de Abdiel no está publicada, un reemplazo responde las tres preguntas y el sistema marca cumplió, parcial o insuficiente. Si falta la clave o el modelo falla, se usa un texto fijo de reserva. Esteban (Psybre), PR #14.
- Entrar pide un código al correo, o Google, y la base dice el rol. Preparar las cuentas de prueba hace lo mismo, una a la vez. Preparar y enviar un pago solo siguen si el organizador ya entró. Esteban (Psybre), PR #14.

### Arreglado

- Los comandos para armar la base y cargar el evento ZEEK ya corren. Esteban (Psybre), PR #14.
- La foto ya no se envía a un modelo que respondía que no existe. Se usa el que sí puede ver imágenes. Si falla, queda el texto de reserva. Esteban (Psybre), PR #14.

### Cambiado

- Quedó escrito que la revisión de Abdiel va a correr en su servidor de escritorio y se publica con un enlace de Tailscale. Todavía no está instalada. Abdiel Cole, PR #11.
- Quedó escrito que Esteban se encarga de la base, de las rutas y del ingreso. Josué Valles, PR #12.
- Josué anotó el recorrido del 28 de septiembre, en la computadora y en el sitio: las pantallas seguían con el ejemplo de ZEEK, el ingreso fallaba y Fondear y Aprobar no firmaban un pago. Josué Valles, PR #13.

### Pendiente para el equipo

- Esteban: cargar en el sitio la dirección de la base, la clave del almacén de fotos y la clave de la revisión de fotos, y crear el almacén privado. Las tablas y la carga de ZEEK ya se corrieron en la base. Sin eso, el sitio sigue mostrando el ejemplo.
- Josué: conectar la bandeja, la revisión y el informe a las rutas nuevas, y Fondear y Aprobar al módulo de firma.
- Raúl: dejar listas las cuatro cuentas del demo. Ahora el ingreso pide el código que llega al correo.
- Abdiel: instalar la revisión en su servidor y publicar la dirección. Acordar con Esteban una clave, porque ese enlace es público.
- Sebas: dejar un pago de prueba en USDC. Sin ese pago no hay Acta.

## 2026-09-28

### Nuevo

- El módulo de firma ya está en la aplicación. Prepara el XDR de fondear, marcar el hito y aprobar y liberar, y envía el XDR firmado a Stellar. En v2, aprobar es una sola firma. Las rutas son `POST /api/firma` y `POST /api/firma/enviar`. La clave `TRUSTLESS_API_KEY` se queda en el servidor. El script `npm run hito` recorre un hito de 1 USDC en testnet y, si el beta no lo libera, repite el mismo recorrido en la API de desarrollo. En el repositorio no quedó un hash de pago, así que el Acta sigue afuera. Fondear y Aprobar del admin todavía no llaman estas rutas. Sebastián Ceciliano Piedra (Sebas), PR #8. Lo empujó Josué Valles.
- Quedó creado el repositorio y se compartió el plan del proyecto, los roles de cada persona y cómo está armada la aplicación. Josué Valles (entró directo, sin pull request).
- El integrante ya puede ver sus tareas, con monto y estado, y subir una foto como evidencia de un trabajo o de un reembolso. Si el servidor todavía no responde, se muestra el ejemplo del evento ZEEK: tres trabajos de US$20 y un reembolso de comida de hasta US$15. También está la pantalla de las cuatro cuentas de prueba; espera el identificador de Cavos para mostrar la dirección y dejar el pago listo. Raúl (Milasur), PR #1.
- El organizador ya tiene la bandeja de inicio (presupuesto, lo pagado, lo pendiente y lo que falta aprobar), la pantalla para crear un proyecto, la revisión de una evidencia y un informe para imprimir. Usan el mismo ejemplo de ZEEK. El botón Entrar llama a Cavos solo si ya existe el identificador. Fondear y Aprobar todavía no firman un pago. Josué Valles, PR #3.

### Arreglado

- Un envío con estado SUCCESS y sin hash ya no se toma como fallo. Si el grifo de Circle no entrega USDC, el script indica la cuenta del organizador y el enlace para fondear a mano. Sebastián Ceciliano Piedra (Sebas), PR #8, con Josué Valles en ese aviso.
- En las pantallas del integrante, la evidencia de ejemplo ya no abre la tarea de otra persona y, al cambiar de integrante, no queda el botón de la lista anterior. Un monto vacío no se muestra como US$0. Una fecha de calendario no cambia de día en Costa Rica; si el día no existe, se deja el texto original. Si la cuenta patrocinada nace sin XLM y sí quedó creada, se abre igual la trustline de USDC. Horizon corta a los 4 segundos. La cámara se apaga al salir, un doble clic no reenvía y un archivo que no es imagen no pasa. PR #4. Lo coescribió Josué Valles.
- El texto de los botones de acento se lee sobre el lima al pasar el cursor, al enfocarlos y cuando están deshabilitados. Josué Valles, PR #7.
- La revisión de una tarea se ve de inmediato, sin quedar en blanco mientras carga la página. Josué Valles, PR #3.
- En el informe, el reembolso muestra el monto ya revisado, la misma cifra que suma el total pagado. Si no se puede guardar, la pantalla avisa y no borra lo que ya estaba. Josué Valles, PR #3.
- El color del botón queda definido en un solo lugar, y la aplicación ya no crea sola un archivo de reglas al arrancar. Raúl (Milasur), PR #1.

### Cambiado

- La aplicación usa Poppins (pesos 400, 500 y 600) en lugar de Inter. El color de acento es el lima `#B7EE34`, y el texto de los botones primarios es `#08090C`. Abdiel Cole, PR #7.
- La documentación quedó al día con lo que ya está después de las pantallas del integrante: qué está hecho, qué sigue y de quién es cada parte. Josué Valles, PR #2.
- Quedó escrito que cada cambio va en una rama con el nombre de la persona y la tarea, y entra por pull request. Josué Valles (entró directo, sin pull request).
- Se alineó el orden del trabajo de cada persona y quedó claro que el Acta entra solo después de un pago. Josué Valles (entró directo, sin pull request).
- Se sacaron del contexto del proyecto herramientas que el equipo no va a usar. Josué Valles (entró directo, sin pull request).

### Pendiente ese día

- Sebas: publicar el identificador de Cavos. Sin eso, las cuentas de prueba no se preparan y el botón Entrar avisa que lo está esperando.
- Sebas: con `TRUSTLESS_API_KEY` en el servidor, correr `npm run hito` hasta dejar un pago en USDC. El módulo y el script ya están (PR #8). Sin ese pago no hay Acta. El hash no está en el repositorio.
- Esteban: guardar los datos y las fotos, y publicar las rutas que las pantallas ya llaman. Mientras no existan, se sigue viendo el ejemplo de ZEEK.
- Abdiel: la dirección de Laya. Poppins y el lima ya están en la aplicación.
- Josué: conectar la bandeja con las rutas de Esteban, y los botones Fondear y Aprobar con `POST /api/firma` y `POST /api/firma/enviar`. El navegador firma con `signXdr` y no ve la clave. El 30 de septiembre, actualizar la versión de la aplicación. En Entrar, guardar la dirección solo cuando el aviso de error no exista, para poder reintentar.
- Raúl: dejar listas las cuatro cuentas del demo cuando exista el identificador de Cavos.
