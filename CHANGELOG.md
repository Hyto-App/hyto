# Changelog

Lo más nuevo va arriba. Cada punto dice quién lo hizo y, si entró por pull request, el número.

## 2026-09-29

### Nuevo

- Quien entra con una wallet real puede preparar la trustline de USDC de testnet desde la revisión y desde subir evidencia. El botón dice **Prepare USDC**. El servidor arma el `changeTrust` solo para la wallet de la sesión y el navegador lo firma con Cavos, el mismo camino del escrow. La sesión demo recibe 403. Josué Valles, PR #50, a las 3:02 p.m., hora de Costa Rica.
- El voluntario del demo puede subir una foto, solo a las tareas del proyecto `demo`. Si manda una cuenta de cobro, se ignora. Subir a otro proyecto sigue prohibido. Josué Valles, PR #50.
- Quien crea un proyecto queda como su organizador. El rol global ya no alcanza para desplegar, fondear, aprobar ni revisar. Un voluntario también puede crear un proyecto y queda como dueño. Si el proyecto no tiene dueño, nadie hace esas acciones. Las lecturas piden sesión: el organizador ve sus proyectos y el voluntario ve sus tareas. Con el demo encendido aparece un proyecto aparte, `demo`, y ZEEK no se toca. ZEEK nace sin organizador. La migración que agrega la columna no se corrió contra la base. Josué Valles, PR #44, a la 1:38 p.m.
- Un correo con login de Cavos que no está en la base se registra solo, como voluntario. Ese alta no lo hace organizador. Josué Valles, PR #41, a las 12:51 p.m.
- Desde la revisión, **Desplegar y fondear** y **Aprobar y pagar** firman en el navegador. Josué Valles, PR #39, a las 12:42 p.m.
- El servidor prepara el escrow de cada tarea: desplegar, fondear, aprobar y liberar. El contrato y el hash del pago quedan guardados en la tarea. Josué Valles, PR #38, a las 12:38 p.m.
- Hay un ingreso de demo, sin Cavos, para el pitch. Esa sesión no firma. Josué Valles, PR #30, a las 11:30 a.m.
- Se pueden aprobar, liberar, disputar y leer el saldo del escrow, y guardar la wallet de la sesión. Josué Valles, PR #26, a las 11:28 a.m.
- La configuración del entorno quedó en un solo lugar. Migrar o sembrar la base de producción pide una confirmación explícita. Josué Valles, PR #22, a las 9:50 a.m.
- Hay pruebas de integración contra Postgres local. Josué Valles, PR #27, a las 9:44 a.m.
- La base ya guarda usuarios, proyectos, tareas, evidencias, el resultado de la revisión y el enlace del pago. Ese enlace sigue vacío. El correo indica el rol de cada persona. Hay una carga inicial del evento ZEEK. Las fotos van a un almacén privado y en la base queda la referencia. Esteban (Psybre), PR #14.
- Ya se puede pedir la lista de tareas, subir una evidencia y verla (también la foto), crear un proyecto, abrir el informe y pedir la revisión. El informe abre aunque el pago no tenga enlace. Si el enlace existe, Ver pago lo usa. Esteban (Psybre), PR #14.
- La revisión describe la foto con Qwen. Si la herramienta de Abdiel no está publicada, un reemplazo responde las tres preguntas y el sistema marca cumplió, parcial o insuficiente. Si falta la clave o el modelo falla, se usa un texto fijo de reserva. Esteban (Psybre), PR #14.
- Entrar pide un código al correo, o Google, y la base dice el rol. Preparar las cuentas de prueba hace lo mismo, una a la vez. Preparar y enviar un pago solo siguen si el organizador ya entró. Esteban (Psybre), PR #14.

### Arreglado

- El modo demo ya no puede crear proyectos. Sin sesión, crear responde que hay que entrar. En Crear proyecto, Fondear queda desactivado. Una sesión real puede crear por la ruta y queda como organizadora. El botón Fondear de esa pantalla sigue guardando el borrador en el navegador. Josué Valles, PR #47, a las 2:11 p.m.
- Salir del demo y cambiar de rol ya no deja la sesión atrapada. Josué Valles, PR #36, a las 11:48 a.m.
- El ingreso verifica el JWT de Cavos y escribir exige sesión. Josué Valles, PR #23, a las 10:45 a.m.
- Si el ingreso falla, el aviso dice qué pasó. Josué Valles, PR #28, a las 10:14 a.m.
- Postgres local, la migración y la semilla de ejemplo ya corren. Josué Valles, PR #21, a las 10:03 a.m.
- Los comandos para armar la base y cargar el evento ZEEK ya corren. Esteban (Psybre), PR #14.
- La foto ya no se envía a un modelo que respondía que no existe. Se usa el que sí puede ver imágenes. Si falla, queda el texto de reserva. Esteban (Psybre), PR #14.

### Cambiado

- La documentación quedó al día con el código de `77a0431`: ingreso, alta de voluntario, demo, Blob, Neon y la firma en la revisión. Josué Valles, PR #43, a las 12:59 p.m.
- Quedó un inventario del esquema de Postgres y un cruce contra las consultas, sin escribir en la base. Josué Valles, PR #24 (10:10 a.m.) y PR #25 (10:13 a.m.).
- Quedó escrito que la revisión de Abdiel va a correr en su servidor de escritorio y se publica con un enlace de Tailscale. Todavía no está instalada. Abdiel Cole, PR #11.
- Quedó escrito que Esteban se encarga de la base, de las rutas y del ingreso. Josué Valles, PR #12.
- Josué anotó el recorrido del 28 de septiembre, en la computadora y en el sitio: las pantallas seguían con el ejemplo de ZEEK, el ingreso fallaba y Fondear y Aprobar no firmaban un pago. Josué Valles, PR #13.

### Pendiente para el equipo, al cierre del 29

- Esteban: aplicar la migración que agrega el organizador del proyecto y asignar el dueño de ZEEK, con el visto bueno de quien es dueño de la base. ZEEK nace sin dueño y, así, nadie lo despliega ni lo revisa. Hacer que la IA mire la foto de verdad, mostrar de dónde salió el veredicto y cerrar el PR #15. La audiencia del JWT sigue vacía.
- Abdiel: instalar la revisión en su servidor y publicar la dirección. Acordar con Esteban una clave, porque ese enlace es público.
- Sebas: dejar un pago de prueba en USDC, con la sesión del organizador de ese proyecto. La wallet necesita XLM y USDC de testnet. **Prepare USDC** abre la trustline si la cuenta ya existe. Sin ese pago no hay Acta.
- Josué: el 30 de septiembre, subir Next.js al parche 16.3.7. Si desplegar sale bien y fondear falla, la pantalla tiene que enterarse. **Aprobar y pagar** no debería verse antes del fondeo. **Prepare USDC** está en inglés. En Crear proyecto, Fondear sigue guardando el borrador en el navegador. Siguen en borrador el PR #18 y el PR #45.
- Raúl: dejar listas las cuatro cuentas del demo en vivo. La trustline de una sesión real ya tiene botón. El demo no la prepara.

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
