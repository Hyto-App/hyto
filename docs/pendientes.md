# Pendientes del buzón #115 (puntos 5 a 11, 13 y 14)

Borrador para que Josué lo revise. No es asesoría legal. Hyto está en Stellar testnet y no mueve dinero real.

Este archivo no reescribe las páginas de [hyto#282](https://github.com/Hyto-App/hyto/pull/282). Esa rama (`sebas/legal-paginas-115`) sigue siendo el borrador de Privacidad, Términos, Cookies y Reembolsos. Aquí van el inventario, las frases para pegar cuando esa rama entre, y lo que este PR sí cambió en el código.

Stellar Raven pidió un ingreso en el navegador y no se pudo consultar desde este entorno. El trabajo no cambia el apartado ni una transacción. Los límites que ya están en `AGENTS.md` siguen: un activo como USDC pide una línea de confianza antes de poder recibirlo, y el deploy de Trustless Work se rechaza si quien cobra no puede tener el token. Hyto todavía no hace esa comprobación antes de apartar.

## 5. Solo los datos que hacen falta

Qué se guarda de la persona, y para qué:

| Dato | Dónde | Para qué se usa |
|---|---|---|
| Correo, nombre, rol de alta | `usuarios` | Ingreso y cómo se muestra la persona. El rol de la tabla no autoriza un evento. |
| Tipo de cuenta y datos de empresa | `usuarios`, solo si `HYTO_TIPO_CUENTA` está en `on` | La pantalla de tipo de cuenta. Apagado, no se leen. |
| Experiencia y etiquetas | `usuarios`, solo si `HYTO_PERFIL_VOLUNTARIO` está en `on` | El perfil. Apagado, no se leen. |
| Sesión, vencimiento y dirección de cobro | `sesiones` | Seguir dentro y saber a qué cuenta puede llegar un pago de práctica. |
| Evento, tareas, invitaciones, miembros | tablas del evento | Lo que la persona ve y lo que quien organiza asigna. |
| Foto o recibo | Blob privado; la base guarda el id | La prueba. Quien organiza ese evento puede verla. |
| Hora de la captura | `evidencias.capturada_en` | Saber si la foto de trabajo es reciente. Se lee la hora de la cámara y se guarda esa hora, no el resto del archivo de la cámara. |
| Huella del archivo y huella visual | `sha256`, `phash` | No aceptar el mismo archivo dos veces, ni una foto de trabajo repetida. |
| Nota de Mile | `veredictos` | La recomendación. Mile no firma ni mueve dinero. |

Qué se quitó en este PR:

- La ubicación y el resto de notas de la cámara (marca, descripción y lo demás que no sea la orientación) ya no se guardan en una foto nueva, no se muestran al abrir la foto y no se envían a Mile.
- La hora de captura se lee antes, en `fechaExif`, y sigue guardada en `capturada_en`.
- Un JPEG, PNG o WebP sin esas notas no se reescribe.
- Un PDF o un texto se deja como llegó. Reescribir un PDF puede dañar el recibo, y Hyto no lee notas dentro del PDF. Si un PDF trajera ubicación, seguiría en el archivo. Eso queda anotado en el punto 14.

No hace falta SQL. No hay columna nueva ni columna de sobra que se pueda borrar sin romper una bandera apagada (`tipo_cuenta`, perfil, comunidades). Las notas de la cámara no estaban en una columna: iban dentro del archivo.

Las fotos ya guardadas en Blob pueden seguir teniendo ubicación en el archivo privado. Al abrirlas, la respuesta ya no la incluye, y Mile tampoco la recibe. Borrarlas del archivo guardado sería un barrido aparte, no una migración. Josué o Jayden lo deciden. Este agente no toca Neon.

## 6. Inventario de terceros

Revisado en el código de `main` el 9 de octubre de 2026. No hay analítica ni publicidad en la app: no está `@vercel/analytics`, ni una etiqueta de medición, ni un píxel. La política de cookies de hyto#282 ya lo dice. No hace falta un aviso de cookies por eso.

| Quién | Qué recibe | Qué no recibe |
|---|---|---|
| Vercel | La app y las fotos en Blob privado. En los registros del servidor puede quedar la dirección de internet de una visita, la ruta y el momento. | No hay producto de analítica de Vercel encendido en este repo. |
| Neon | Lo de la tabla de arriba: correo, sesión, eventos, notas de la foto, la recomendación. | No recibe el archivo de la foto. Ese va a Blob. |
| Cavos | El ingreso con correo o con Google. En este navegador puede guardar lo que necesita para reconocer a la persona y para confirmar un pago. | Hyto no usa ese almacén para publicidad. |
| Google | Solo si la persona elige entrar con Google, por medio de Cavos. La fuente Poppins se baja al construir la app (`next/font`); la visita no llama a Google para la letra. La imagen de vista previa puede pedir la fuente al generarse. | No hay medición de visitas con Google. |
| Trustless Work | Al apartar o liberar, la dirección de quien organiza, la de quien cobra y el monto de práctica. La clave de la API no sale del servidor. | No recibe el correo ni la foto. |
| Stellar testnet | El pago de práctica, cuando existe, es público: direcciones y monto. No hay un pago real en este repo. | No incluye el correo ni la foto. |
| Modelo de Mile (Groq, hoy `qwen/qwen3.8-27b`, o el que nombre `GROQ_VISION_MODEL`) | La foto ya sin ubicación, la condición de la tarea, el idioma y, si el evento los tiene, la descripción pública y el contexto que solo ve la revisión. | No recibe el correo. No firma ni mueve dinero. |
| Laya, si `LAYA_URL` está puesta | El texto de la lectura y la condición, no la foto. | Sin esa dirección, no se llama. |

hyto#282 ya nombra a Cavos, a Stellar y a Trustless Work, y dice que no hay analítica. No nombra todavía a Vercel, a Neon, a Google, al modelo de Mile ni a Laya. No reescribí esas páginas. Frases para pegar en Privacidad cuando Josué revise #282:

- Español: «Hyto no usa analítica ni publicidad. Para funcionar, estos servicios reciben datos. Vercel guarda la app y las fotos, y puede ver la dirección de internet de una visita en sus registros. Neon guarda la base: el correo, la sesión, los eventos y las notas de la foto. Cavos hace el ingreso. Si usted elige Google, Google reconoce esa cuenta. Trustless Work aparta el dinero de práctica de cada tarea. Stellar registra ese pago de práctica; el registro es público y no incluye su correo. Mile envía la foto, ya sin la ubicación de la cámara, y la descripción de la tarea a un modelo para recomendar una nota. Si hay otro modelo de lectura, recibe el texto de esa lectura y no la foto. Mile no firma ni mueve dinero. Esta versión no mueve dinero real.»
- English: «Hyto does not use analytics or advertising. These services receive data so the app can run. Vercel stores the app and the photos, and can see a visit's internet address in its logs. Neon stores the database: the email, the session, the events, and the notes on the photo. Cavos handles sign-in. If you choose Google, Google recognizes that account. Trustless Work sets aside the practice money for each task. Stellar records that practice payment; the record is public and does not include your email. Mile sends the photo, without the camera location, and the task description to a model to recommend a score. If another reading model is configured, it receives the text of that reading and not the photo. Mile does not sign or move money. This version does not move real money.»

## 7. Accesibilidad de la app

Hecho aquí, fuera de las pantallas que pulen hyto#273 a hyto#277:

- Unirse a un evento (`/join`): el código va en un formulario. Enter confirma. El aviso queda ligado al campo.
- El aviso de un código de comunidad, de la ficha, del tipo de cuenta y del perfil se anuncia como alerta.
- La foto de una comunidad usa el nombre como texto alternativo. Antes el texto alternativo iba vacío.

No toqué las pantallas de esos cinco PRs de móvil (ingreso, tareas, evidencia, eventos, bandeja, revisión, configuración, Mile, `app/globals.css` y el diccionario), para no deshacer su pulido.

Lo que ya estaba y se mantiene: el foco visible es global, el diálogo de confirmación es un `dialog` nativo (Escape y Tab), Mile decorativo va oculto para el lector y Mile con significado tiene texto alternativo, los botones de cerrar y el de tema tienen nombre.

Contraste de la marca, medido, sin cambiar los tokens: lima `#B7EE34` sobre el texto de botón `#08090C` queda por encima de 7:1. El rosa chico sobre oscuro ya usa `#FF4D8D` en la hoja de estilos, no el rosa de marca lleno. No moví colores: los PRs de móvil están editando esa hoja.

## 8 a 11. Landing tryhyto.com

Revisada en vivo el 9 de octubre de 2026 (`https://tryhyto.com/`, HTML de esa fecha). El fuente no está en este repositorio: no hay carpeta de landing en `main` ni en el historial el texto que hoy está publicado. Por eso este PR no puede cambiar la página en vivo. No se tocó `motion/`.

Lo que ya cumple:

- No hay testimonios, reseñas, estrellas, logos de clientes ni cifras de uso. La página dice que es un prototipo y que todavía no hay pilotos.
- Las imágenes de Mile con significado tienen texto alternativo. Las decorativas van vacías.
- Los botones dicen la acción («Create a free account» y el equivalente en español).
- El texto de acento sobre claro usa un verde más oscuro (`#4f7008`), no la lima sobre papel.
- El pie ya dice que está hecho en Costa Rica y acredita la letra.

Lo que falta en el fuente, cuando Josué indique dónde vive:

- Quién opera Hyto. No inventar razón social ni dirección.
- El contacto visible debe ser el marcador `Josué define el contacto`. No un correo personal. Hoy el pie y el contacto muestran `contact@tryhyto.com`.
- Texto propuesto para el pie, en español: «Hyto. Hecho en Costa Rica. Quien opera Hyto: Josué define el operador. Contacto: Josué define el contacto.»
- En inglés: «Hyto. Made in Costa Rica. Who operates Hyto: Josué names the operator. Contact: Josué define el contacto.»

Fuentes y licencias, según el pie publicado y los archivos de esa página:

| Pieza | Qué es | Licencia o dueño, para que Josué lo confirme |
|---|---|---|
| Poppins 400, 500 y 600 | Archivos `.woff2` en el sitio | Poppins Project Authors, SIL Open Font License. El pie ya lo dice. |
| Logo, íconos, Mile y los dibujos | SVG e imágenes de Mile en el sitio | El pie dice que son de Hyto. |
| Capturas del producto | Imágenes de la app | El pie dice que son capturas de Hyto. |
| GSAP y ScrollTrigger | `js/vendor/`, la página se mueve al desplazar | Vendor. Confirmar la licencia de GreenSock antes de dar por cerrado el punto. Este PR no copia esos archivos. |
| Video | No hay un `video` en la página de inicio | No hay una pieza de video que licenciar en esa URL. No se tocó `motion/`. |

## 13. Leyes, para que Josué decida

Lista corta. No es un dictamen. Aunque el dinero sea de práctica, el correo y las fotos son datos de una persona.

- Costa Rica, mínimo: Ley 8968, Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales, y su reglamento. La autoridad es la PRODHAB. Hyto se presenta como hecho en Costa Rica, así que esta es la ley de partida.
- Si quien financia o quien hace el trabajo está en otro país, esa ley puede sumarse. Josué decide el alcance:
  - México: Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
  - Colombia: Ley 1581 de 2012.
  - Argentina: Ley 25.326.
  - Chile: Ley 19.628 y la Ley 21.719 cuando corresponda aplicarla.
  - Brasil: Lei Geral de Proteção de Dados, si hay personas en Brasil.
  - Unión Europea: Reglamento general de protección de datos, si hay personas en la Unión Europea.
  - Estados Unidos: no hay una sola ley federal de este tipo. Si quien financia está en un estado con ley propia, Josué dice si aplica.

## 14. Otros riesgos de confianza

Para una entrada de buzón, si Josué quiere abrirla. No se creó esa entrada en el repo privado.

1. Las fotos viejas pueden guardar la ubicación dentro del Blob privado. La pantalla y Mile ya no la entregan. Falta decidir si se barre lo ya guardado.
2. Un PDF puede traer notas que este cambio no quita.
3. Siguen abiertos, y no son de este PR: la audiencia y el emisor del ingreso pueden quedar sin comprobar si esas variables están vacías; la dirección de cobro puede guardarse sin probar que la persona tiene la llave; no hay recuperación si se pierde la llave del navegador.
4. La landing dice que 1 USDC equivale a 1 US$. En testnet es dinero de práctica. Conviene que el texto no se lea como una promesa de un dólar de banco.
5. El límite de intentos de un código de invitación vive en la memoria de una instancia. No frena por igual si hay varias.

Texto sugerido para el buzón:

«#115, seguimiento. Las fotos nuevas ya no guardan la ubicación de la cámara, y Mile no la recibe. Las fotos viejas pueden seguir teniéndola en el archivo privado. La landing de tryhyto.com no está en este repo: el pie todavía no dice quién opera Hyto y el contacto sigue siendo el correo del sitio, no el marcador que pediste. Privacidad de #282 no nombra todavía a Vercel, Neon, Google ni a los modelos de Mile. No es asesoría legal.»
