# Hallazgos: Mile se queda en revisión (buzón #072)

Fecha de la lectura: 7 de octubre de 2026. Rama `main` en `31ebd33`.

Abdiel reportó que la revisión de Mile tarda, a veces se corta, y a veces la foto se queda en **en revisión** sin veredicto. Este documento separa lo que ve el voluntario de lo que tiene que cambiar en el servidor. Este PR solo toca la pantalla. No cambia rutas, Groq, la base ni la configuración de Vercel.

## Qué recorre la foto

1. El voluntario envía la foto en la tarea (`components/integrante/SubirEvidencia.tsx`). El navegador espera hasta 60 segundos esa respuesta (`lib/integrante/rutas.ts`, línea 63).
2. El servidor guarda el archivo y, si la tarea estaba pendiente, la pasa a **en revisión** antes de que Mile termine (`lib/api/evidencias.ts`, línea 262).
3. Si hay clave de Groq, el servidor espera solo 2,8 segundos (`PLAZO_MS`, línea 26). Si Mile no acabó, responde igual al voluntario y deja el resto en `after()` (`app/api/evidencias/route.ts`, líneas 23–25).
4. Groq describe la foto. Laya (o un sustituto) pone la nota. El veredicto se guarda en la base. Si no hay fila de veredicto, la tarea sigue en **en revisión** (`lib/api/etapa.ts`, líneas 43–44).
5. En la tarea, la pantalla ya preguntaba cada 3 segundos, como máximo un minuto. En **Mis tareas** no: cargaba una vez y se quedaba con «Mile está revisando tu foto».

La foto «atascada» es una tarea en **en revisión** sin fila de veredicto. Nada vuelve a escribir esa fila si el proceso del servidor muere a mitad de camino.

## Carril del servidor (Jayden / Josué)

No se cambió este código. Son las causas que dejan la tarea sin veredicto.

### 1. La tarea pasa a «en revisión» y la respuesta sale antes del veredicto

- **Dónde:** `lib/api/evidencias.ts`, líneas 26, 262 y 284–289. `app/api/evidencias/route.ts`, líneas 7–8 y 23–25.
- **Qué pasa:** a los 2,8 segundos el voluntario ya recibe «enviada», aunque Mile siga trabajando. El veredicto depende de `after()`. El comentario de la ruta dice que, sin `maxDuration`, el plan Hobby corta cerca de los 10 segundos y no se guarda nada. Hoy la ruta pide 60 segundos (`maxDuration = 60`). Esos 60 segundos cuentan desde que entra el pedido, no desde que empieza `after()`.
- **Por qué se queda atascada:** el seguro que escribe un veredicto de error espera 55 segundos (`TOPE_REVISION_FONDO_MS`, línea 369) contados cuando ya respondimos. Subir el archivo, calcular el hash y llamar a Groq puede gastar el minuto entero antes de que ese reloj dispare. Si Vercel mata la función, el reloj no corre y no hay fila. La tarea se queda en **en revisión**.
- **Qué tan probable:** alta. Es el camino normal cuando Groq tarda.
- **Arreglo propuesto:** guardar un veredicto de error dentro del tiempo que la función sí va a vivir, o en un trabajo que no muera con la respuesta. Al leer la tarea, si la foto tiene más de un minuto y no hay veredicto, escribir ese error ahí. No dejar el estado en **en revisión** sin fila.
- **Estado:** arreglado en `c17baf7` (#204). El tope del trabajo en `after()` y el presupuesto de la revisión cuentan desde que entra el pedido (`planRevision` en `lib/api/plazo-revision.ts`).

### 2. Un fallo rápido tampoco se guarda en la respuesta

- **Dónde:** `lib/api/evidencias.ts`, `conPlazo`, líneas 352–365. El `catch` de las líneas 360–362 convierte el error en `null`, igual que «todavía no terminó».
- **Qué pasa:** si Groq o Laya fallan dentro de esos 2,8 segundos, la respuesta sale sin veredicto. El error solo se guarda si `after()` llega a `cerrarRevisionEnFondo`. Si ese trabajo no corre, el fallo desaparece.
- **Qué tan probable:** alta, junto con la causa 1.
- **Arreglo propuesto:** si la promesa ya falló, guardar el veredicto de error antes de responder. Reservar `after()` para cuando Mile sigue en curso.
- **Estado:** arreglado en `c17baf7` (#204). Un fallo dentro de los 2,8 segundos guarda el veredicto de error antes de responder (`esperarCorte`).

### 3. Groq y Laya pueden ocupar más tiempo del que la función tiene

- **Dónde:** `lib/revision/reintento.ts`, líneas 3–7 y 41–56. `lib/revision/revisar.ts`, líneas 41–45 y 147–178. `lib/revision/scout.ts`, líneas 118 y 144. `lib/revision/laya.ts`, líneas 174, 180 y 205. `lib/evidencia/vision.ts`, líneas 16–40.
- **Qué pasa:** cada intento a Groq puede durar 20 segundos y hay hasta 3. El presupuesto de toda la revisión es 45 segundos. Si Groq falla y hay clave de Gemini, se vuelve a describir la foto con el mismo presupuesto. Después Laya hace dos llamadas seguidas (clasificar y luego las preguntas) con una sola señal de aborto de 14 segundos: la segunda llamada a menudo se corta y se reintenta. Antes de llamar a Groq, la foto se endereza y se achica (`ajustarParaVision`). Ese trabajo consume los 20 segundos del intento y no se cancela con la señal. La señal sí llega al `fetch` de Groq (línea 144); el hueco es el trabajo de antes y la suma de reintentos.
- **Qué tan probable:** alta para la lentitud y los cortes. Media para que, además, se pase de los 60 segundos de `maxDuration` y se pierda el veredicto (causa 1).
- **Arreglo propuesto:** un solo tope para Groq + Gemini + Laya que quepa en `maxDuration` después de guardar la foto. No encadenar dos llamadas de Laya con la misma señal de 14 segundos. No contar el retoque de la imagen dentro de los 20 segundos de Groq, o cancelarlo si el tiempo se acaba.
- **Estado:** arreglado en `c17baf7` (#204). Un solo presupuesto con reserva para Laya, el retoque de la foto fuera del intento de Groq, y cada llamada a Laya con su propia señal.

### 4. Si no hay clave de Groq, el pedido espera la revisión entera

- **Dónde:** `lib/api/evidencias.ts`, línea 284. `conTope` mira la clave de Groq (o la URL de Laya si el archivo es texto). No mira la clave de Gemini.
- **Qué pasa:** si la descripción va solo por Gemini, el servidor no corta a los 2,8 segundos. Espera la revisión dentro del mismo pedido. El navegador corta a los 60 segundos y la función también. Si el corte llega después de la línea 262, la tarea ya está en **en revisión** y puede no haber veredicto.
- **Qué tan probable:** media. Solo cuando Groq no está y Gemini sí.
- **Arreglo propuesto:** usar el mismo corte de 2,8 segundos y el mismo `after()` cuando la descripción la hace Gemini.
- **Estado:** arreglado en `c17baf7` (#204). El corte de 2,8 segundos también vale cuando solo hay clave de Gemini (`usaCorte`).

### 5. Si guardar el veredicto falla, el error solo se escribe en el log

- **Dónde:** `lib/api/evidencias.ts`, líneas 405–417.
- **Qué pasa:** hay un segundo intento. Si los dos fallan, queda un `console.error` y la tarea sigue sin fila.
- **Qué tan probable:** baja. Hace falta que la base falle dos veces.
- **Arreglo propuesto:** reintentar más tarde, o marcar la tarea para que la próxima lectura vuelva a guardar el fallo.
- **Estado:** cubierto por el error de tiempo al leer (causa 6): si las dos escrituras fallan, la primera lectura pasado el minuto guarda el fallo, y si esa escritura también falla, la lectura siguiente lo reintenta (`veredictoAlLeer`). Queda una ventana de hasta un minuto en **en revisión** sin nada en curso, y el aviso dice que la IA no respondió a tiempo aunque lo que falló fue la base.

### 6. No hay un proceso que desatasque las fotos viejas

- **Dónde:** `lib/api/etapa.ts`, líneas 43–44. Sin veredicto, la etapa sigue en `en_revision`. El estado de la tarea no sale de **en revisión** hasta un pago, un rechazo de Mile o una fila de veredicto.
- **Qué pasa:** las fotos que ya se quedaron así no se arreglan solas. El voluntario las sigue viendo en revisión hasta que envía otra.
- **Qué tan probable:** alta para las fotos que ya cayeron en las causas 1 o 2.
- **Arreglo propuesto:** al leer las tareas del voluntario, si la foto supera el minuto y no hay veredicto, guardar el fallo de tiempo. Así Mis tareas deja de decir que Mile sigue.
- **Estado:** arreglado en `c17baf7` (#204). `veredictoAlLeer` (`lib/api/revision-vencida.ts`) guarda el error de tiempo en Mis tareas, en las vistas del organizador y en `GET /api/revision/:id`.

### 7. Forzar la revisión tiene otro tope, más corto

- **Dónde:** `app/api/revision/[id]/route.ts`, línea 3. `maxDuration = 30`.
- **Qué pasa:** es la ruta del organizador, no la de la subida. Con el mismo presupuesto de 45 segundos, un reintento forzado puede cortarse antes de guardar.
- **Qué tan probable:** baja para el buzón #072. El voluntario no usa esta ruta.
- **Arreglo propuesto:** el mismo tope que la subida, cuando se toque esa ruta.
- **Estado:** arreglado en este PR. La ruta pide `maxDuration = 60`, el presupuesto cuenta desde que entra el pedido (`presupuestoForzado` en `lib/api/revision.ts`), con menos de 5 segundos no empieza, y un fallo guarda un veredicto de error en vez de responder 503.

## Carril de la pantalla (este PR)

### 8. Mis tareas no volvía a preguntar

- **Dónde:** `components/integrante/MisTareas.tsx`. La carga de la lista sigue siendo una vez (el efecto que llama a `listarTareas` al entrar). No había otro reloj.
- **Qué pasa:** el voluntario envía la foto, vuelve a Mis tareas (o abre la lista mientras Mile trabaja) y ve «Mile está revisando tu foto» para siempre, aunque el veredicto llegue después o nunca llegue. La pantalla de la tarea sí preguntaba; la lista no.
- **Qué tan probable:** alta. Es lo que se ve en el buzón cuando la foto «se queda» en revisión.
- **Qué se hizo:** mientras haya una foto sin nota, la lista pregunta cada 3 segundos, como mucho dos minutos desde que la vio (`lib/integrante/seguimiento.ts`, `seguirEnLista`). Si la foto ya cumplió el minuto, o Mile guardó un error, la tarjeta dice «Mile no pudo terminar — reintenta» y el enlace es **Intentar de nuevo**, hacia la misma tarea, donde ya se puede enviar otra foto. Si la nota llega tarde, la tarjeta la muestra y deja de decir que sigue revisando.

### 9. El texto decía «unos segundos» y, al ofrecer reintentar, la tarea dejaba de preguntar

- **Dónde:** `components/integrante/SubirEvidencia.tsx` (la pantalla de revisión) y `lib/ui/diccionario.ts` (`evidencia.fewSeconds`, `evidencia.sendingNote`, `evidencia.stillHere`).
- **Qué pasa:** la pantalla decía que tardaba unos segundos. Mile a menudo tarda más, así que parece colgada. Además, al cumplirse el minuto la pantalla ofrecía reenviar y dejaba de consultar. Si el veredicto llegaba un poco después, no se veía hasta recargar.
- **Qué tan probable:** alta para la sensación de cuelgue. Media para perder un veredicto que sí se guardó tarde.
- **Qué se hizo:** el texto ahora dice que Mile sigue revisando y que puede tardar cerca de un minuto, y que si pasa de un minuto se puede enviar otra vez. La pantalla de la tarea sigue consultando mientras no hay nota, también después de mostrar el reintento. El reintento al minuto ya estaba; no se quitó.

### 10. Un reenvío cuya respuesta se pierde no se puede confirmar

- **Dónde:** `lib/integrante/rutas.ts`, líneas 335–343. `subidaRegistrada` solo mira si la tarea salió de **pendiente**.
- **Qué pasa:** el primer envío, si la conexión se corta, se confirma así. Si la tarea ya estaba en revisión y el voluntario reenvía, un corte no se puede confirmar: la tarea ya no estaba pendiente. El aviso manda a abrir Mis tareas.
- **Qué tan probable:** media. Solo en el reintento, no en la primera foto.
- **Arreglo propuesto (sigue en este carril, no se hizo ahora):** comparar la hora de envío o el id de la evidencia antes y después, no solo el estado. Se dejó fuera para no cambiar la confirmación del primer envío en el mismo cambio.

## Conflicto con el diseño

`docs/rediseno/SPEC.md` (líneas 249 y 268) todavía dice: «Tarda unos segundos. Puedes esperar aquí.» / «It takes a few seconds. You can wait here.» Ese texto es el de la página «Nuevo diseño». Este PR lo cambia porque esconde la espera real de Mile. Abdiel tiene que decir si el texto nuevo se queda.

El estado guardado sigue siendo **en revisión** hasta que haya veredicto, rechazo o pago. Esta pantalla no puede cambiar esa fila. Lo que cambia es el mensaje: deja de decir que Mile sigue cuando ya pasó el minuto, y deja entrar a enviar otra foto.
