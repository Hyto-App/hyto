# Changelog

Lo más nuevo va arriba. Cada punto dice quién lo hizo y, si entró por pull request, el número.

## 2026-09-29

Lo de abajo, hasta el PR #59, entró el mismo día después del changelog del PR #19. El autor de esos squash en `main` es Josué Valles. La hora del #59 es 7:46 p.m., hora de Costa Rica.

### Pendiente al cierre del 29

- Sebas: un pago de USDC en testnet, con wallet real de Cavos, y el hash en `tareas.hash_pago`. El Acta solo después de ese pago.
- Esteban: confirmar que Groq responde en producción. `CAVOS_JWT_AUDIENCE` sigue vacío. Asignar `organizador_id` a mano en los proyectos que no son el demo. El PR #15 quedó reemplazado por el #59 y sigue en borrador.
- Abdiel: publicar `LAYA_URL` (Tailscale Funnel). El Figma ya es la fuente de la UI. El borrador #49 sigue abierto.
- Josué: el 30 de septiembre, Next.js 16.3.7. El borrador #18 sigue abierto. Recargar la revisión si fondear falla, y ocultar **Approve and pay** mientras no haya fondeo.
- Raúl: las cuatro cuentas del demo.

### Nuevo

- El veredicto de Laya sale del índice más alto de `score.probabilities` (0 insuficiente, 1 parcial, 2 cumplió). `score.criteria` se manda como lista ordenada, en inglés. Un empate se queda en el índice más bajo. El valor guardado sigue en español. El sí o no de Laya queda en la frase y no fija el veredicto. Josué Valles, PR #59.
- El Figma de Abdiel, [Hyto – App](https://www.figma.com/design/4LoHfVpaXEG5n4DdF6z2Yy), página «Nuevo diseño», quedó como fuente de la interfaz. Josué Valles, PR #58.
- La interfaz y los avisos de la API están en inglés. Los enums de la base siguen en español y se traducen al dibujar, sin migración. Los veredictos se ven como Met, Partial e Insufficient. `<html lang="en">`. Josué Valles, PR #56.
- Si Groq o Laya fallan, la revisión guarda `origen` `error`, muestra el mensaje y ofrece **Retry review**. Ese resultado no habilita el pago (409). El reintento espera 30 s y no corre si la tarea está pagada o ya tiene escrow. Groq pide `max_completion_tokens` 1024 y `reasoning_effort` `none`. Josué Valles, PR #45.
- La cookie de Hyto sigue el `exp` del JWT de Cavos, con tope de 24 h. Si falta `exp`, dura 8 h. El demo también dura 8 h. Una sesión vencida responde 401, «Sign in to continue.». Josué Valles, PR #54.
- **Sign out** cierra la sesión del servidor, la de Cavos y la wallet local. Preparar USDC reutiliza un token de Cavos que siga vigente. Josué Valles, PR #52.
- El voluntario del demo puede subir evidencia solo en el proyecto demo, y esa subida no fija wallet de cobro. `GET` y `POST /api/usdc` preparan la trustline de USDC de testnet de la wallet que ya entró. En demo esas rutas responden 403. Josué Valles, PR #50.
- Un correo con login de Cavos que no está en `usuarios` se crea como voluntario. El rol organizador sigue siendo explícito. Josué Valles, PR #41.
- El organizador firma el pago en el navegador desde la revisión: prepara el XDR, lo firma con Cavos y lo envía. La bandeja y el informe leen la API cuando hay sesión y no es demo. Josué Valles, PR #39.
- El backend de escrow v2 despliega un multi-release, deja el contrato en la tarea y guarda el hash solo si el servidor confirmó el pago. Josué Valles, PR #38.
- Con `HYTO_DEMO_LOGIN=1` se entra al demo sin Cavos. En esa sesión las firmas responden 403. Josué Valles, PR #30.
- Aprobar, liberar, disputar y resolver son acciones distintas de la API v2. `GET /api/escrow/[contrato]` lee el escrow. El script del hito solo reintenta v1 si existe `TRUSTLESS_API_KEY_V1`. Josué Valles, PR #26.
- Postgres local, la migración y la semilla de ejemplo ya corren con `npm run db:local`, `db:migrar` y `db:semilla`. Josué Valles, PR #21.
- Hay una configuración central de entorno y una salvaguarda para no migrar ni sembrar la base de producción sin confirmación. Josué Valles, PR #22.
- Las pruebas de integración hablan con Postgres local. Josué Valles, PR #27.

### Arreglado

- El modo demo no crea proyectos. `POST /api/proyectos` sin sesión, o con sesión demo, responde 403. Josué Valles, PR #47.
- Se puede salir del demo y cambiar de rol sin quedar atrapado. `DELETE /api/sesion` borra la fila y expira la cookie. Josué Valles, PR #36.
- El ingreso ya no muestra el error crudo de Cavos. Un 429 cuenta los segundos y desactiva el envío del código. Josué Valles, PR #28.
- `POST /api/sesion` verifica la firma, el emisor y el vencimiento del JWT. Sin `CAVOS_JWT_JWK` ni `CAVOS_JWKS_URL` no hay sesión, salvo `HYTO_PERMITIR_JWT_SIN_FIRMA=1` fuera de producción. Las rutas que escriben exigen la cookie. Josué Valles, PR #23.

### Cambiado

- Cada proyecto tiene dueño en `proyectos.organizador_id`. La migración no rellena la columna: el dueño se asigna a mano. La semilla no lo escribe en ZEEK. Con el demo prendido, el proyecto demo queda a nombre de `demo-organizador`, aparte de ZEEK. Josué Valles, PR #44.
- Quedó escrito el contexto del repo para el equipo y los agentes, contra `77a0431`. Josué Valles, PR #43.
- `.env.example` lista los nombres que el código lee, sin valores. Josué Valles, PR #20.
- Hay un inventario del esquema de Postgres leído desde el código, sin abrir Neon. Josué Valles, PR #24.
- `npm run db:comparar-esquema` cruza las migraciones con `information_schema` de una copia, sin escribir en la base. Josué Valles, PR #25.

### Nuevo, esa mañana (PR #19, hasta el #14)

- La base ya guarda usuarios, proyectos, tareas, evidencias, el resultado de la revisión y el enlace del pago. Ese enlace sigue vacío. El correo indica el rol de cada persona. Hay una carga inicial del evento ZEEK. Las fotos van a un almacén privado y en la base queda la referencia. Esteban (Psybre), PR #14.
- Ya se puede pedir la lista de tareas, subir una evidencia y verla (también la foto), crear un proyecto, abrir el informe y pedir la revisión. El informe abre aunque el pago no tenga enlace. Si el enlace existe, Ver pago lo usa. Esteban (Psybre), PR #14.
- La revisión describe la foto con Qwen. Si la herramienta de Abdiel no está publicada, un reemplazo responde las tres preguntas y el sistema marca cumplió, parcial o insuficiente. Si falta la clave o el modelo falla, se usa un texto fijo de reserva. Esteban (Psybre), PR #14.
- Entrar pide un código al correo, o Google, y la base dice el rol. Preparar las cuentas de prueba hace lo mismo, una a la vez. Preparar y enviar un pago solo siguen si el organizador ya entró. Esteban (Psybre), PR #14.

### Arreglado, esa mañana

- Los comandos para armar la base y cargar el evento ZEEK ya corren. Esteban (Psybre), PR #14.
- La foto ya no se envía a un modelo que respondía que no existe. Se usa el que sí puede ver imágenes. Si falla, queda el texto de reserva. Esteban (Psybre), PR #14.

### Cambiado, esa mañana

- Quedó escrito que la revisión de Abdiel va a correr en su servidor de escritorio y se publica con un enlace de Tailscale. Todavía no está instalada. Abdiel Cole, PR #11.
- Quedó escrito que Esteban se encarga de la base, de las rutas y del ingreso. Josué Valles, PR #12.
- Josué anotó el recorrido del 28 de septiembre, en la computadora y en el sitio: las pantallas seguían con el ejemplo de ZEEK, el ingreso fallaba y Fondear y Aprobar no firmaban un pago. Josué Valles, PR #13.

### Pendiente esa mañana, antes del PR #20

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
