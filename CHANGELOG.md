# Changelog

Lo más nuevo va arriba. Cada punto dice quién lo hizo y, si entró por pull request, el número. Las horas son de Costa Rica.

## 2026-10-01

`main` queda en `67522f9`.

### Nuevo

- La interfaz sigue los mockups v2 del Figma (página «Nuevo diseño»): tema claro y oscuro, barra lateral en el escritorio y pestañas abajo en el móvil, sobre las pantallas que ya existían. Los manejadores, las llamadas a datos y el texto que afirman las pruebas no cambian. Josué Valles, PR #82, 4:01 p.m.

### Arreglado

- Si desplegar el escrow sale bien y fondear falla, la revisión recarga el detalle y sigue desde el fondeo del contrato que ya existe. Raúl (Milasur), PR #67, 2:43 a.m.
- Los mensajes de servidor que seguían en español quedaron en inglés. Raúl (Milasur), PR #68, 2:43 a.m.

### Cambiado

- El flujo de pago usa lenguaje llano y un error técnico se convierte en el siguiente paso. **Aprobar y pagar** solo se muestra si ya hay contrato y el escrow está fondeado. Josué Valles, PR #77, 11:25 a.m. (sugerencia #007).
- Un reembolso no se despliega hasta que el organizador confirma un monto, como máximo el tope. Ese monto queda en la base (`drizzle/0003_monto_confirmado.sql`). Raúl (Milasur), PR #69, 3:33 p.m.

### Pendiente al cierre del día

Los dueños de abajo son sugerencias de la auditoría del 30 de septiembre. Quien tome la tarea de otra persona deja nota en el buzón.

- Josué: trustline patrocinada de USDC y comprobar que la wallet esté lista antes de firmar; preflight de trustline de quien cobra y de saldo del organizador; guardar el id de contrato previsto en la base (hoy sigue en el `Map` del proceso); probar la wallet con un nonce firmado y bloquear `wallet_cobro` al desplegar; poner `CAVOS_JWT_AUDIENCE` y `CAVOS_JWT_ISSUER` en Vercel; el primer pago real en testnet. Siguen también el monto de fondeo calculado en el servidor, `approve-and-release`, los índices del esquema y fijar la red. Next.js sigue en 16.3.6.
- Abdiel: publicar Laya y dejar `LAYA_URL`; el modelo de la foto sigue fijo en `qwen/qwen3.8-27b`; mostrar `origen` en la revisión; el resumen antes de cada firma. El shell v2 ya está en `main` (PR #82, Josué).
- Esteban: rechazar SVG y tipos de imagen desconocidos; encabezados `nosniff` y CSP; en producción, fallar si faltan audiencia o emisor del JWT; tope de subida de 4,5 MB; guardar el hash de la sesión, no el token en claro.
- Sebastián: arreglar la prueba que depende del entorno en `lib/api/rutas.test.ts`, GitHub Actions (`npm ci`, `tsc --noEmit`, `npm test`) y un límite de pedidos compartido entre instancias. El Acta solo después de un pago real. En el repo no hay hash.
- Raúl: las tres tareas de la auditoría ya entraron (PR #68, #67 y #69). Sigue preparar las cuatro cuentas del demo para el ensayo, fuera del código.

## 2026-09-30

### Cambiado

- Stellar Raven queda obligatorio para el equipo y para los agentes. Josué Valles, PR #62, 10:00 a.m.
- Quedaron escritas las sugerencias del equipo de ese día. No son compromisos. Josué Valles, PR #63, 10:28 a.m.
- Entró la auditoría de código contra `main` en `db82b93`. Josué Valles, PR #64, 11:17 a.m.
- Entraron los prompts por persona para las tareas de esa auditoría. Josué Valles, PR #65, 11:26 a.m.
- Los dueños del tablero son sugerencias. Quien haga la tarea de otro deja el contexto en el buzón. Josué Valles, PR #66, 11:37 a.m.

## 2026-09-29

### Entró el mismo día, después del PR #19

#### Nuevo

- Pruebas de integración contra Postgres local. Josué Valles, PR #27, 9:44 a.m.
- Configuración central del entorno y una salvaguarda antes de migrar o sembrar la base de producción. Josué Valles, PR #22, 9:50 a.m.
- Acciones v2 para aprobar, liberar, disputar y leer el escrow. Josué Valles, PR #26, 11:28 a.m.
- Ingreso demo sin Cavos para el pitch. Josué Valles, PR #30, 11:30 a.m.
- Backend de escrow v2 para desplegar y pagar. Josué Valles, PR #38, 12:38 p.m.
- La revisión firma el pago en el navegador. Josué Valles, PR #39, 12:42 p.m.
- Un correo con login de Cavos que no está en la base entra como voluntario. Josué Valles, PR #41, 12:51 p.m.
- Cada proyecto guarda a su organizador (`drizzle/0002_organizador_proyecto.sql`). Josué Valles, PR #44, 1:38 p.m.
- La interfaz y los mensajes de la API que ve la persona pasan a inglés. Josué Valles, PR #56, 4:37 p.m.

#### Arreglado

- Postgres local, la migración y la semilla de ejemplo ya corren. Josué Valles, PR #21, 10:03 a.m.
- El JWT de Cavos se verifica y hace falta sesión para escribir. Josué Valles, PR #23, 10:45 a.m.
- Si el ingreso falla, el aviso dice qué pasó. Josué Valles, PR #28, 10:14 a.m.
- Se puede salir del demo y cambiar de rol. Josué Valles, PR #36, 11:48 a.m.
- El modo demo no crea proyectos. Josué Valles, PR #47, 2:10 p.m.
- En el demo se puede subir la evidencia, y la trustline de USDC de testnet queda cubierta. Josué Valles, PR #50, 3:02 p.m.
- La sesión de firma de Cavos se recupera y hay cierre de sesión. Josué Valles, PR #52, 4:10 p.m.
- La sesión de Hyto sigue el vencimiento del JWT de Cavos, con un máximo de 24 horas. Josué Valles, PR #54, 4:18 p.m.
- Si la revisión de la foto falla, se muestra el error y se puede reintentar. Ya no cae en silencio al guion fijo. Josué Valles, PR #45, 4:22 p.m.
- El veredicto de Laya sale del índice de probabilidad más alto del `score`. Josué Valles, PR #59, 7:46 p.m. Con eso queda cubierto lo que pedía el borrador del PR #15.

#### Cambiado

- `.env.example` precisa el alcance de cada variable, sin valores. Josué Valles, PR #20, 9:16 a.m. Entró unos minutos antes del changelog de la mañana y esa entrada no lo nombra.
- Inventario del esquema de Postgres. Josué Valles, PR #24, 10:10 a.m.
- Cruce del esquema declarado contra las consultas, sin escribir en la base. Josué Valles, PR #25, 10:13 a.m.
- Contexto del repo para el equipo y los agentes (`AGENTS.md`). Josué Valles, PR #43, 12:59 p.m.
- El Figma de Abdiel queda como fuente de verdad de la interfaz. Josué Valles, PR #58, 4:53 p.m.

Lo que sigue es el cierre de la mañana, hasta el PR #19.

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

### Pendiente esa mañana

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
