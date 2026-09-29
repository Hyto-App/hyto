# Changelog

Lo más nuevo va arriba. Cada punto dice quién lo hizo y, si entró por pull request, el número.

## 2026-09-29

### Nuevo

- Con `HYTO_DEMO_LOGIN=1`, Entrar muestra «Entrar como demo». `POST /api/sesion/demo` abre una sesión de organizador (`demo-organizador@hyto.demo`) o de voluntario (`demo-voluntario@hyto.demo`), sin Cavos y sin billetera. `GET /api/sesion/demo` dice si está habilitado. Sin ese valor la ruta responde 404. Esa sesión no firma: `POST /api/firma` y `POST /api/firma/enviar` responden 403, «Modo demo: las firmas están desactivadas». La pantalla muestra la insignia «Modo demo». Josué Valles, PR #30.
- En v2, aprobar y liberar son dos pasos. Aprobar llama a `approve-milestones` y ya no libera el hito. Liberar llama a `release-funds`. Disputar y resolver arman el XDR de la disputa. `GET /api/escrow/[contrato]` lee el estado en la red con la sesión del organizador. El script del hito solo repite en v1 si existe `TRUSTLESS_API_KEY_V1` y es distinta de `TRUSTLESS_API_KEY`. Josué Valles, PR #26.
- Hay un inventario del esquema de Postgres leído del código, sin abrir la base. `npm run db:esquema` cruza las migraciones SQL con el esquema de Drizzle y deja el resultado en `scripts/backend-traspaso/esquema-inventario.json`. La prueba no depende del SHA vivo de `main`. Josué Valles, PR #24.
- `npm run db:comparar-esquema` cruza ese esquema con `information_schema` de una copia, en una transacción de solo lectura, y no escribe en la base. Pide `DATABASE_URL` de una copia, nunca la de producción. Josué Valles, PR #25.
- Postgres se puede levantar en esta máquina. `docker compose` usa Postgres 16 en `127.0.0.1:5432` (usuario `hyto`, base `hyto`). `npm run db:local` toma `DATABASE_URL` o, si no hay, esa misma dirección. Rechaza un host que no sea local, levanta compose si el puerto está cerrado y hay Docker, crea la base si falta, migra y siembra ZEEK. Josué Valles, PR #21.
- La configuración del servidor quedó en un solo lugar (`lib/config`). Cada variable dice el nombre, si es pública o de servidor, si es obligatoria y para qué sirve. Si falta una opcional, el build sigue. `npm run verificar:entorno` revisa `.env.local` y no imprime los valores. Falla si hay líneas que no se pudieron leer, si falta una obligatoria o si la base no está lista para migrar. Josué Valles, PR #22.
- Hay pruebas contra un Postgres de esta máquina. `npm run test:integracion` recorre las rutas, las pantallas del admin y el regreso de Google. Si no hay base local, o si la dirección no es de esta máquina, avisa y no conecta. El regreso de Google queda como fallo esperado: el arreglo del PR #18 no está en `main`. Josué Valles, PR #27.
- La base ya guarda usuarios, proyectos, tareas, evidencias, el resultado de la revisión y el enlace del pago. Ese enlace sigue vacío. El correo indica el rol de cada persona. Hay una carga inicial del evento ZEEK. Las fotos van a un almacén privado y en la base queda la referencia. Esteban (Psybre), PR #14.
- Ya se puede pedir la lista de tareas, subir una evidencia y verla (también la foto), crear un proyecto, abrir el informe y pedir la revisión. El informe abre aunque el pago no tenga enlace. Si el enlace existe, Ver pago lo usa. Esteban (Psybre), PR #14.
- La revisión describe la foto con Qwen. Si la herramienta de Abdiel no está publicada, un reemplazo responde las tres preguntas y el sistema marca cumplió, parcial o insuficiente. Si falta la clave o el modelo falla, se usa un texto fijo de reserva. Esteban (Psybre), PR #14.
- Entrar pide un código al correo, o Google, y la base dice el rol. Preparar las cuentas de prueba hace lo mismo, una a la vez. Preparar y enviar un pago solo siguen si el organizador ya entró. Esteban (Psybre), PR #14.

### Arreglado

- Quien resuelve la disputa tiene que ser el `disputeResolver` del escrow, y la wallet de la sesión tiene que ser la que firma el XDR. Si no puede, responde 400 y no arma el XDR. Un 401 de Trustless Work responde 502 con el código `TRUSTLESS_AUTH`, sin copiar el detalle. La lectura del escrow usa otro cupo. El hito en disputa se mira con `dispute.isDisputed` y `dispute.resolved`. Josué Valles, PR #26.
- `POST /api/sesion` comprueba la firma RS256, el emisor y el vencimiento del JWT de Cavos. Sin `CAVOS_JWT_JWK` y sin `CAVOS_JWKS_URL` no hay sesión. La documentación de Cavos no publica esa clave ni el emisor. `HYTO_PERMITIR_JWT_SIN_FIRMA=1` lee el token sin firma solo fuera de producción. `CAVOS_JWT_ISSUER` acepta varios emisores, separados por coma, y cada clave sigue a su `iss` y `kid`. Crear un proyecto, revisar, preparar o enviar un pago, y subir una evidencia piden la cookie `hyto_sesion`. Subir evidencia solo acepta la tarea de ese integrante y solo ese voluntario cambia `walletCobro`. Un 401 o un 403 al subir muestra el aviso y no guarda el ejemplo. Un JWKS vacío no queda en caché, y uno que falla no anula las claves de las demás URLs. El correo de la sesión sale del claim `email`. Josué Valles, PR #23.
- Entrar ya no muestra el error crudo de Cavos. Un 429 cuenta los segundos y desactiva «Enviar código». Después de cada envío hay un respiro de 20 segundos en el que ese botón no se puede pulsar. Un código que no coincide, uno vencido, la falta de red, una ventana de Google cerrada o bloqueada, un correo inválido y un correo `@demo.hyto` tienen un aviso propio. Josué Valles, PR #28.
- El cruce del esquema ya no marca como diferencia un índice único que no es constraint, una vista, el orden de una clave primaria compuesta, `numeric` con precisión, un timestamp, un cast, un default, una clave foránea del SQL de drizzle-kit ni un serial. También reconoce el SQL que aplica `npm run db:migrar`. Josué Valles, PR #25.
- La migración contra un host que no es Neon usa el protocolo de Postgres. El cliente HTTP de Neon reescribía `127.0.0.1` y el cambio no llegaba a la base. El pool local anota el error de una conexión ociosa y el proceso sigue. `[::1]` cuenta como esta máquina. Josué Valles, PR #21.
- La semilla de ZEEK deja las tareas en pendiente, así se conserva Subir evidencia, y guarda evidencia de ejemplo para la bandeja y la revisión. Stand y comida quedan en cumplió, registro en parcial y bienvenida sin evidencia. Repetir el insert no choca. La revisión no devuelve la foto de esos blobs de ejemplo. Pedir otra foto borra el veredicto y la tarea sale de la bandeja. Sembrar de nuevo solo vuelve a pendiente lo que sigue en revisión, sin hash de pago y con evidencia nula o de ejemplo. Un pago y una foto real quedan como están. Josué Valles, PR #21.
- Los comandos para armar la base y cargar el evento ZEEK ya corren. Esteban (Psybre), PR #14.
- La foto ya no se envía a un modelo que respondía que no existe. Se usa el que sí puede ver imágenes. Si falla, queda el texto de reserva. Esteban (Psybre), PR #14.

### Cambiado

- En v2, aprobar dejó de liberar el hito en la misma firma. Liberar es otra acción. El reintento del script en v1 ya no usa la clave de v2: pide `TRUSTLESS_API_KEY_V1`. Josué Valles, PR #26.
- La migración, la semilla y drizzle-kit cargan `.env.local` antes de tocar la base. Se detienen si `DATABASE_URL` apunta a un host listado en `HYTO_HOST_BASE_PRODUCCION` y `HYTO_CONFIRMAR_BASE_PRODUCCION` no vale `si`. Si un host de esa lista no se puede leer, no migran ni siembran. Sin esa lista avisan y siguen. El pooler de Neon (`-pooler`) cuenta como el mismo host directo. `.env.example` deja esas dos variables vacías. El script del hito también carga `.env.local`. Si ese archivo tiene líneas que no se pudieron leer, la migración y la semilla no corren. Josué Valles, PR #22.
- `.env.example` dice, sin valores, qué lee el código, si cada variable es obligatoria y qué pasa si falta. `NODE_ENV` no se declara ahí: lo pone Next.js. En producción la cookie de sesión lleva Secure. La clave de servidor de Cavos sigue sin nombre en el código. Josué Valles, PR #20.
- La base y el almacén de fotos aceptan un gancho que solo usan las pruebas locales. En el servidor el camino sigue siendo Neon y el almacén privado. `npm test` también corre la guardia que impide conectar a una base que no es local. Josué Valles, PR #27.
- Quedó escrito que la revisión de Abdiel va a correr en su servidor de escritorio y se publica con un enlace de Tailscale. Todavía no está instalada. Abdiel Cole, PR #11.
- Quedó escrito que Esteban se encarga de la base, de las rutas y del ingreso. Josué Valles, PR #12.
- Josué anotó el recorrido del 28 de septiembre, en la computadora y en el sitio: las pantallas seguían con el ejemplo de ZEEK, el ingreso fallaba y Fondear y Aprobar no firmaban un pago. Josué Valles, PR #13.

### Pendiente para el equipo

- Esteban: cargar en el sitio la dirección de la base, la clave del almacén de fotos y la clave de la revisión de fotos, y crear el almacén privado. Las tablas y la carga de ZEEK ya se corrieron en la base. Sin eso, el sitio sigue mostrando el ejemplo. Para volver a migrar o sembrar un host listado como producción, `HYTO_CONFIRMAR_BASE_PRODUCCION` tiene que valer `si`. Hace falta `CAVOS_JWT_JWK` o `CAVOS_JWKS_URL`: sin una de las dos no hay sesión (PR #23). La documentación de Cavos no publica esa clave. Si se usan el código y Google, `CAVOS_JWT_ISSUER` tiene que listar los dos emisores. Revisar lo que el inventario (PR #24) y el cruce de solo lectura (PR #25) dejen marcado. Esos comandos no escriben en la base.
- Josué: conectar la bandeja, la revisión y el informe a las rutas nuevas, y Fondear, Aprobar y Liberar al módulo de firma. Desde el PR #26 aprobar y liberar son dos firmas. Disputar y resolver ya arman el XDR; las pantallas no los llaman. El envío del pago devuelve el enlace y no lo guarda en la tarea. Pedir otra foto ya borra el veredicto (PR #21), Entrar ya muestra avisos claros (PR #28) y un 401 o un 403 al subir evidencia ya no se guarda como ejemplo (PR #23). El ingreso demo ya está (PR #30) y queda apagado hasta `HYTO_DEMO_LOGIN=1`. Esa sesión no firma. Las pantallas siguen leyendo el ejemplo del navegador. El regreso de Google pierde el ingreso si la persona navega mientras el canje sigue pendiente: es el PR #18, que no está en `main`, y la prueba lo marca como fallo esperado. El 30 de septiembre, subir Next.js a 16.3.7.
- Raúl: dejar listas las cuatro cuentas del demo. El ingreso pide el código que llega al correo. El ingreso demo (PR #30) no las reemplaza: no tiene billetera y no firma. Subir una evidencia exige la cookie de sesión y solo acepta la tarea de ese integrante (PR #23).
- Abdiel: instalar la revisión en su servidor y publicar la dirección. Acordar con Esteban una clave, porque ese enlace es público.
- Sebas: dejar un pago de prueba en USDC. Si v2 no libera el hito, el script pide `TRUSTLESS_API_KEY_V1`, distinta de `TRUSTLESS_API_KEY` (PR #26). Sin ese pago no hay Acta.

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
