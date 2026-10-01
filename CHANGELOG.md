# Changelog

Lo más nuevo va arriba. Cada punto dice quién lo hizo y, si entró por pull request, el número.

## 2026-10-01

Los dos entraron a las 2:43 a.m., hora de Costa Rica. Los escribió Raúl (Milasur) y los mergeó Josué Valles.

### Arreglado

- Si el despliegue del escrow sale bien y el fondeo falla, la revisión recarga el detalle y ofrece fondear el contrato que ya quedó guardado, en vez de desplegar otro. El error de firma trae ese id. Una lectura vacía del indexador no borra, en la misma sesión, el estado de «todavía no fondeado». Raúl (Milasur), PR #67.
- Los avisos del servidor que seguían en español (el escrow, el entorno de la base y el cruce del esquema) quedaron en inglés. Una prueba falla si un aviso nuevo, de los que ve quien usa la app, vuelve en español. Los comentarios y los nombres de estado (`en revisión`, `cumplió`) pueden seguir en español. Raúl (Milasur), PR #68.

## 2026-09-30

Josué Valles. Entre las 10:00 a.m. y las 11:37 a.m., hora de Costa Rica. Solo documentación.

### Cambiado

- Quedó escrito que, antes de trabajar, el equipo y los agentes consultan Stellar Raven. Josué Valles, PR #62.
- Quedaron anotadas las sugerencias del 30 de septiembre. No son trabajo comprometido. Josué Valles, PR #63.
- Quedó la auditoría del código contra `db82b93`: trustline de USDC, guardar el id del contrato, probar la wallet, rechazar SVG, JWT cerrado en producción y CI. Josué Valles, PR #64.
- Quedó un prompt listo para el agente de cada persona, con esas tareas. Josué Valles, PR #65.
- Quedó la regla de que el dueño sugerido no es exclusivo: quien tome una tarea de otra persona deja nota en el buzón. Josué Valles, PR #66.

## 2026-09-29, después del PR #19

Esto entró después del changelog del PR #19 (9:22 a.m., hora de Costa Rica). El bloque de más abajo cubre los PR #11 a #14 de esa mañana. No se repite.

### Nuevo

- La app ya prepara, en la API v2, aprobar, liberar, disputar, resolver y leer el saldo del escrow. Josué Valles, PR #26.
- Hay un ingreso de demostración, sin Cavos, para el pitch. Con el interruptor apagado esa ruta no existe. Josué Valles, PR #30.
- El servidor arma el despliegue y el fondeo del escrow v2 por tarea. Josué Valles, PR #38.
- Desde la revisión, el navegador firma el pago con Cavos y el servidor lo envía. Josué Valles, PR #39.
- Un correo con login de Cavos que no está en la base entra solo, como voluntario. Josué Valles, PR #41.
- Cada proyecto guarda quién lo organiza. Solo esa persona despliega y revisa. Josué Valles, PR #44.
- Quedó escrito el contexto del repositorio para el equipo y para los agentes. Josué Valles, PR #43.
- La interfaz y los mensajes de la API que ve quien usa la app pasaron al inglés. Josué Valles, PR #56.
- El Figma de Abdiel quedó como la fuente de la interfaz. Josué Valles, PR #58.

### Arreglado

- Postgres se puede levantar en local, y la migración y la semilla de ejemplo corren con una salvaguarda si la base es de producción. Josué Valles, PR #21 y PR #22.
- El inventario del esquema y el cruce contra las consultas no escriben en la base. Josué Valles, PR #24 y PR #25.
- Hay pruebas de integración contra Postgres local. Josué Valles, PR #27.
- Si el ingreso falla, la pantalla dice qué pasó. Josué Valles, PR #28.
- El JWT de Cavos se verifica, y escribir en la API exige sesión. Josué Valles, PR #23.
- Se puede salir del demo y cambiar de rol sin quedar atrapado. Josué Valles, PR #36.
- El modo demo no crea proyectos. Josué Valles, PR #47.
- En el demo se puede subir la evidencia, y la trustline de USDC de testnet queda preparada. Josué Valles, PR #50.
- Preparar USDC y salir ya no dejan la sesión de Cavos vencida. Josué Valles, PR #52.
- La sesión de Hyto sigue el vencimiento del JWT de Cavos, con un máximo de 24 horas. Josué Valles, PR #54.
- Si la revisión de la foto falla, se ve el error real y se puede reintentar. Josué Valles, PR #45.
- Si Laya manda probabilidades, el veredicto sale del índice más alto: 0 insuficiente, 1 parcial, 2 cumplió. Josué Valles, PR #59.

### Cambiado

- `.env.example` lista los nombres que el código lee, sin valores. Josué Valles, PR #20. Entró unos minutos antes del changelog del PR #19 y no estaba en ese registro.

### Pendiente al cierre de ese día

- No hay un hash de pago real en el repositorio. El Acta no entra.
- `LAYA_URL` no está. Sin ella, la revisión usa el reemplazo.
- `CAVOS_JWT_AUDIENCE` sigue vacío.

## 2026-09-29, mañana (PR #11 a #14)

Este bloque es el que ya estaba en el PR #19. No se vuelve a escribir arriba.

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
