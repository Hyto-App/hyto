# Changelog

Lo más nuevo va arriba. Cada punto dice quién lo hizo y, si entró por pull request, el número.

## 2026-09-29

### Nuevo

- La base guarda usuarios, proyectos, tareas, evidencias, veredictos y el hash de pago, que sigue vacío. El correo mapea al rol. Hay migración y semilla del evento ZEEK. Las fotos van a un almacén privado y en la base queda el identificador. Esteban (Psybre), PR #14.
- Las pantallas ya pueden llamar `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id`. También están `POST /api/proyectos`, `GET /api/informe` y `GET /api/revision/:id`. El informe abre aunque el pago no tenga hash. Ver pago usa el hash cuando exista. Esteban (Psybre), PR #14.
- La revisión describe la foto con Qwen 3.8 27B en Groq (`qwen/qwen3.8-27b`). Si no hay dirección de Laya, un sustituto responde las tres preguntas y el código arma cumplió, parcial o insuficiente. Si falta la clave o un modelo falla, entra el guion fijo. Esteban (Psybre), PR #14.
- Entrar pide un código al correo, o Google, y la base dice el rol. Preparar cuentas hace lo mismo, una cuenta a la vez. Preparar y enviar un pago piden que el organizador haya entrado. Esteban (Psybre), PR #14.

### Arreglado

- `npm run db:migrar` y `npm run db:semilla` ya corren. Esteban (Psybre), PR #14.
- La foto ya no se manda a `meta-llama/llama-4-scout-17b-16e-instruct`, que responde 404. Con esta clave de Groq el único modelo que ve imágenes es `qwen/qwen3.8-27b`. Esteban (Psybre), PR #14.

### Cambiado

- `.env.example` precisa, sin valores, el alcance de cada variable que lee `process.env`, si es obligatoria y qué hace el código si falta. `NODE_ENV` no se declara: lo define Next.js, y en production la cookie `hyto_sesion` lleva Secure. La única variable pública es `NEXT_PUBLIC_CAVOS_APP_ID`. No hay `GOOGLE_CLIENT_ID` ni `GOOGLE_CLIENT_SECRET`. Josué Valles, PR #20.

### Pendiente para el equipo

- Esteban: guardar en Vercel `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` y `GROQ_API_KEY`, y crear el Blob privado `hyto`. La migración y la semilla de ZEEK ya se corrieron en Neon.
- Josué: conectar la bandeja, la revisión y el informe a esas rutas, y Fondear y Aprobar al módulo de firma. El 30 de septiembre, subir Next.js a 16.3.7.
- Raúl: las cuatro cuentas del demo, con el código de cada correo. Dependen de que la base esté alcanzable desde Vercel.
- Abdiel: `LAYA_URL`. `LAYA_API_KEY` sigue opcional y sin acordar.
- Sebas: un pago en USDC. Sin ese pago no hay Acta. La clave de servidor de Cavos (`cav_…`) sigue sin nombre en el código.

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
