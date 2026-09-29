# Changelog

Lo más nuevo va arriba. Cada punto dice quién lo hizo y, si entró por pull request, el número.

## 2026-09-29

Lo de abajo, hasta el cierre de las 4:22 p.m. (hora de Costa Rica), entró después del changelog del PR #19 (9:22 a.m.). El autor de estos pull requests es Josué Valles. El PR #14 y los documentos #11, #12 y #13 ya estaban anotados y no se repiten.

### Nuevo

- Cada proyecto guarda a su organizador en `proyectos.organizador_id`. Quien lo crea queda como dueño. Escrow, revisión, bandeja, tareas e informe muestran lo que esa persona organiza o tiene asignado. La migración `0002` solo agrega la columna, vacía: el dueño de un proyecto viejo se asigna a mano por email. La semilla no escribe dueño en ZEEK. Con el demo prendido, el proyecto demo es de `demo-organizador`, y una lectura sin sesión o de una sesión demo solo ve ese proyecto. Josué Valles, PR #44, 1:38 p.m.
- Una sesión real puede preparar la trustline de USDC de testnet de su propia wallet. `GET` y `POST /api/usdc` arman y envían el `changeTrust`. El navegador lo firma con el mismo `signXdr` del escrow. El demo recibe 403. Josué Valles, PR #50, 3:02 p.m.
- El voluntario demo puede subir evidencia, solo en tareas del proyecto demo. La wallet de cobro que mande se ignora. Josué Valles, PR #50, 3:02 p.m.
- Un correo con login de Cavos válido que no está en `usuarios` se registra solo, con rol voluntario. El rol organizador no sale de ese alta. Josué Valles, PR #41, 12:51 p.m.
- En la revisión, **Desplegar y fondear** y **Aprobar y pagar** firman en el navegador con Cavos y envían el XDR. El hash, cuando existe, queda en la tarea. Josué Valles, PR #39, 12:42 p.m.
- El servidor prepara el escrow V2 de cada tarea: desplegar, fondear, marcar, aprobar y liberar, con el contrato en `tareas.contrato_escrow`. Josué Valles, PR #38, 12:38 p.m.
- `POST /api/firma` acepta aprobar, liberar, disputar y resolver, y `GET /api/escrow/[contrato]` lee el saldo. Solo el organizador. Josué Valles, PR #26, 11:28 a.m.
- Con `HYTO_DEMO_LOGIN=1` se puede entrar como organizador o voluntario de demo, sin Cavos y sin billetera. Esa sesión no firma. Josué Valles, PR #30, 11:30 a.m.
- La configuración de entorno quedó en un solo lugar, y migrar o sembrar una base de producción exige el visto bueno explícito. Josué Valles, PR #22, 9:50 a.m.

### Arreglado

- Si Groq o Laya fallan, la revisión ya no usa el guion fijo. Guarda origen `error`, un código y el mensaje del fallo, lo escribe en el log y la pantalla lo muestra con **Retry review**. Un error no borra monto ni fecha. Desplegar, fondear y pagar quedan ocultos, y el servidor responde 409. El reintento solo corre si el veredicto es un error, se niega si la tarea está pagada o tiene escrow, y espera 30 segundos. El pedido a Groq usa `max_completion_tokens` 1024 y apaga el pensamiento del modelo. Josué Valles, PR #45, 4:22 p.m.
- La cookie `hyto_sesion` y `sesiones.expira_en` siguen el `exp` del JWT de Cavos, con tope de 24 horas. Si falta `exp`, duran 8 horas. El demo usa esas 8 horas. Una sesión vencida responde 401, `Sign in to continue.`, y abre el formulario de ingreso. Josué Valles, PR #54, 4:18 p.m.
- Preparar USDC y firmar reutilizan un token de Cavos todavía válido. Si no se puede renovar, la pantalla pide entrar de nuevo. **Sign out** cierra la sesión del servidor, la de Cavos y la wallet local, aunque la sesión ya esté vencida. Josué Valles, PR #52, 4:10 p.m.
- El modo demo ya no puede crear proyectos. `POST /api/proyectos` sin sesión tampoco. La pantalla avisa y no guarda. Josué Valles, PR #47, 2:10 p.m.
- Salir del demo y cambiar de rol ya no deja la sesión atrapada. Josué Valles, PR #36, 11:48 a.m.
- El JWT de Cavos se verifica, y escribir en la API exige sesión. Josué Valles, PR #23, 10:45 a.m.
- Si el ingreso falla, el aviso dice qué pasó. Josué Valles, PR #28, 10:14 a.m.
- Postgres local, la migración y la semilla de ejemplo ya corren con `npm run db:local`, `db:migrar` y `db:semilla`. Josué Valles, PR #21, 10:03 a.m.

### Cambiado

- El contexto del repo para el equipo y los agentes quedó en `AGENTS.md`, contra `77a0431`. Josué Valles, PR #43, 12:59 p.m.
- Hay pruebas de integración contra Postgres local. Josué Valles, PR #27, 9:44 a.m.
- El esquema declarado se cruzó con las consultas, sin escribir en la base. Josué Valles, PR #25, 10:13 a.m.
- Quedó el inventario del esquema de Postgres. Josué Valles, PR #24, 10:10 a.m.
- `.env.example` lista los nombres que el código lee, sin valores. Josué Valles, PR #20, 9:16 a.m.

### Pendiente al cierre

- Sebas: un pago real en testnet, con hash en `tareas.hash_pago`. El Acta solo después de ese pago.
- Esteban: confirmar Groq en producción. Cerrar el PR #15 (borrador): el `score` de Laya con `probabilities` todavía no está en `main`. `CAVOS_JWT_AUDIENCE` sigue vacío. Asignar a mano el `organizador_id` de los proyectos reales. La migración no se corre sola.
- Abdiel: publicar Laya con Tailscale Funnel y dejar `LAYA_URL`. El borrador #49 (buzón entre IAs) no está en `main`.
- Josué: el 30 de septiembre, Next.js 16.3.7. El borrador #18 (no perder el ingreso al volver de Google) sigue abierto. En la revisión, si desplegar sale bien y fondear falla, la pantalla puede seguir ofreciendo desplegar. **Aprobar y pagar** sigue visible sin fondeo, salvo que la revisión sea un error o el reembolso no tenga monto.
- Raúl: las cuatro cuentas del demo en `/cuentas`.

### Nuevo, ya anotado a la mañana

- La base ya guarda usuarios, proyectos, tareas, evidencias, el resultado de la revisión y el enlace del pago. Ese enlace sigue vacío. El correo indica el rol de cada persona. Hay una carga inicial del evento ZEEK. Las fotos van a un almacén privado y en la base queda la referencia. Esteban (Psybre), PR #14.
- Ya se puede pedir la lista de tareas, subir una evidencia y verla (también la foto), crear un proyecto, abrir el informe y pedir la revisión. El informe abre aunque el pago no tenga enlace. Si el enlace existe, Ver pago lo usa. Esteban (Psybre), PR #14.
- La revisión describe la foto con Qwen. Si la herramienta de Abdiel no está publicada, un reemplazo responde las tres preguntas y el sistema marca cumplió, parcial o insuficiente. Si falta la clave o el modelo falla, se usa un texto fijo de reserva. Esteban (Psybre), PR #14. El PR #45, anotado arriba, dejó de usar ese texto fijo cuando Groq o Laya fallan.
- Entrar pide un código al correo, o Google, y la base dice el rol. Preparar las cuentas de prueba hace lo mismo, una a la vez. Preparar y enviar un pago solo siguen si el organizador ya entró. Esteban (Psybre), PR #14.

### Arreglado

- Los comandos para armar la base y cargar el evento ZEEK ya corren. Esteban (Psybre), PR #14.
- La foto ya no se envía a un modelo que respondía que no existe. Se usa el que sí puede ver imágenes. Si falla, queda el texto de reserva. Esteban (Psybre), PR #14.

### Cambiado

- Quedó escrito que la revisión de Abdiel va a correr en su servidor de escritorio y se publica con un enlace de Tailscale. Todavía no está instalada. Abdiel Cole, PR #11.
- Quedó escrito que Esteban se encarga de la base, de las rutas y del ingreso. Josué Valles, PR #12.
- Josué anotó el recorrido del 28 de septiembre, en la computadora y en el sitio: las pantallas seguían con el ejemplo de ZEEK, el ingreso fallaba y Fondear y Aprobar no firmaban un pago. Josué Valles, PR #13.

### Pendiente a la mañana, antes de los PR de arriba

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
