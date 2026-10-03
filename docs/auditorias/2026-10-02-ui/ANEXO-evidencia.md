# Auditoría UI/UX y bugs visibles — hyto.vercel.app

Fecha: 2 de octubre de 2026. Sitio público: https://hyto.vercel.app (entrada en `/eventos`). Código usado solo para explicar lo que se vio, en `main` `2b9fad4`.

Método: Playwright + Chromium, viewports 390×844 y 1440×900, temas oscuro y claro (`localStorage` `hyto-tema`), sesión demo de organizador y de voluntario. Por pantalla: captura de página completa, consola, red, axe-core, overflow, título y meta. No se envió código por correo, no se usó Google, no se invitó a nadie, no se asignó una tarea, no se reintentó la revisión y no se firmó ni se pagó.

Referencia de diseño: `docs/vault/` no está en este repo. La comparación es contra los Mockups v2 (logo, 2026-09-30): escritorio oscuro 2880×1800 (2× de 1440×900) y móvil oscuro 780×1688 (2× de 390×844), pantallas 01 Login … 12 y estados 12a–12e. Eslogan de esos mockups: «Prove your worth. Get paid.» Fondo de mockup `#08090C`, tarjetas `#14162B`, lima, rosa `#FF4D8D` como acento provisional.

Las capturas están en [`capturas/`](capturas/).

## 1. Resumen ejecutivo

La app oscura ya se reconoce (lima `#B7EE34`, fondo `#0B0C12`, tarjetas `#161830`, Poppins, barra lateral y tabs). El flujo que el mockup vende —evidencia, recomendación, pago— no se puede completar en el demo público. La única foto en revisión dice que Laya falló y la pantalla no ofrece desplegar ni pagar. La cuenta demo de voluntario no tiene tareas, así que subir evidencia (pantallas 03–05) no se alcanza. El informe del evento no se puede imprimir y deja frases de ejemplo en español.

### Top 10

| # | Severidad | Problema |
|---|---|---|
| 1 | Crítico | En Check-in list la revisión falló («Laya is unavailable») y no hay botón de fondear ni de pagar. El paso 1 queda en «Now» y los pasos 2 y 3 en «Later». |
| 2 | Alto | La cuenta «Volunteer demo» ve cero tareas y `/tareas/demo-*` responde «Page not found». No se puede probar subir una foto. |
| 3 | Alto | El informe del evento no tiene «Print» y muestra español: «Example. Comprobante de la comida…» y «Example. Mesa armada, banner de ZEEK…». |
| 4 | Alto | El ingreso no es el mockup 01. En `/` hay un título y un botón. El eslogan no aparece en ninguna pantalla. En móvil el panel de marca del diálogo está oculto. |
| 5 | Alto | `/cuentas` en demo no es la billetera del mockup 11. Dice «Organizer demo account · Cavos» y no muestra saldo. `/cuentas/preparar` es otro flujo, el de mandar códigos por correo. |
| 6 | Alto | Un id que no existe (`/eventos/no-such-audit`, `/revision/no-such-audit`, `/tareas/no-such-audit`) responde HTTP 200 con «Page not found». En varias de esas rutas el DOM monta dos shells y dos botones de tema, «Dark» y «Light», a la vez. Una ruta desconocida de verdad (`/no-existe-hyto`) sí responde 404. |
| 7 | Medio | La bandeja y el informe esperan a cuatro `GET /api/revision`. A ~1 s el informe parece una página vacía: el skeleton no dice «Loading». El contenido apareció a los ~2,2–2,5 s. |
| 8 | Medio | Accesibilidad: `/cuentas` no tiene `<main>`; la cabecera del evento queda fuera de un landmark; la bandeja salta de `h1` a `h3`; crear evento tiene dos `<aside>` sin nombre. |
| 9 | Medio | SEO: título siempre «Hyto», descripción «Expense control and milestone payments» (el subtítulo visible es otro), sin Open Graph, sin favicon (`/favicon.ico` 404), sin `robots.txt` ni sitemap. |
| 10 | Medio | «Enter a valid email.» se pinta debajo de «Try demo mode», lejos del campo. |

Otros hallazgos, por debajo de esos diez: el voluntario ve «+ Create» (medio), el HTML no trae CSP ni `nosniff` (medio), «Invite by email» no valida el campo (medio), el botón de tema dice «Light» en oscuro (bajo), los tokens no son exactamente los del mockup (bajo), el tipo de tarea se anuncia dos veces (bajo) y el foco del nav es el outline del navegador (bajo). El conteo cerrado está al final de la sección 5.

## 2. Por pantalla

### Ingreso anónimo — `/` y `/?signin=1`

`/eventos` sin sesión redirige a `/?signin=1` (`lib/sesion/puerta.ts`, `exigirPagina`).

**Bien.** El diálogo de escritorio parte la pantalla: marca a la izquierda, formulario a la derecha. Lima `#B7EE34` sobre texto `#08090C` en el botón. «Send code» no llama a la red si el correo es inválido. `alguien@demo.hyto` muestra «That demo email does not receive messages…» y deshabilita el envío. Demo entra sin correo. axe-core: 0 violaciones en el diálogo. Evidencia: `dark-desktop-anon-signin.png`, `dark-desktop-anon-email-invalido.png`, `dark-desktop-anon-email-demo.png`.

**Mal.**

- Alto. El eslogan del mockup no está. El texto de marca es «Email a code, then review evidence and pay in USDC.» `hasSlogan` fue falso en las 138 capturas del crawl. Arreglo: poner «Prove your worth. Get paid.» en el hero de `components/admin/Entrar.tsx` (bloque `hyto-auth-hero`).
- Alto. En móvil (ancho &lt; 1024 px) `.hyto-auth-hero { display: none }` en `app/globals.css`. Se pierde el logo, el anillo y la frase. El sheet arranca en «Sign in» / «Close». Evidencia: `dark-mobile-anon-signin.png`. Arreglo: una franja compacta de marca encima del sheet, no `display: none`.
- Medio. `/` sin `?signin=1` es casi vacío: «Hyto», el subtítulo y un botón «Sign in». Sin logo, sin nav, sin toggle de tema. Evidencia: `dark-desktop-anon-landing.png` (el fondo medido es `#0B0C12` en casi todos los píxeles). Arreglo: que `/` muestre el mismo ingreso que el mockup 01, en `components/admin/Landing.tsx`.
- Medio. «Enter a valid email.» se pinta después de «Enter as demo», no junto al input. Evidencia: el texto de `dark-desktop-anon-email-invalido` termina en «Enter as demo Enter a valid email.» Arreglo: mover `{mensaje}` al lado del campo en `components/admin/Entrar.tsx`.
- Bajo. Hay dos títulos «Sign in» (hero y «Sign in to Hyto»). En móvil se leen los dos y, detrás del diálogo, el `h1` «Hyto» de la landing. Arreglo: un solo `h1`/`h2` y `aria-hidden` en el fondo mientras `aria-modal` está abierto.

**Mejorable.** «Close» es texto gris, fácil de pasar. El anillo del mockup es un aro fino; el de la app es un arco. No es un bug.

**Listo.** Validación de correo vacío de red, atajo de demo, y el layout de escritorio del diálogo se acerca al mockup 01 más que cualquier otra pantalla.

### 404

**Bien.** `/no-existe-hyto` y `/ruta-que-no-existe-audit` responden 404, con «Page not found», «That page is not in Hyto.» y un botón «Home» lima. Evidencia: `dark-desktop-anon-404.png` (status 404). El botón es lima: el color `#B7EE34` está en la captura.

**Mal.**

- Alto. `/eventos/no-such-audit`, `/eventos/no-such-audit/tareas`, `/eventos/no-such-audit/informe`, `/revision/no-such-audit` y `/tareas/no-such-audit` responden **200** y pintan «Page not found». Medido con la sesión demo y, sin sesión, `curl` a `/eventos/no-such-audit` también devolvió 200 (además de un refresh a `/?signin=1`). Arreglo: que `notFound()` en `lib/sesion/puerta.ts` (`exigirEvento`, `exigirTarea`, `exigirOrganizadorDeTarea`) llegue al cliente como 404. `app/not-found.tsx` ya tiene el texto.
- Alto. En `/tareas/no-such-audit` se ven a la vez los botones «Dark» y «Light», y la lista de botones es `Dark`, `←`, `Light`, `←`, `Home`. En `/eventos/no-such-audit` y `/revision/no-such-audit` el DOM tenía dos `.hyto-shell` y dos `.hyto-side`. La columna visual sigue midiendo ~232 px, así que el segundo shell no abre un segundo sidebar al lado: se superpone y duplica controles. Evidencia: `dark-desktop-organizador-tareas-no-such-audit.png`, `dark-desktop-organizador-404-tarea-dom.png`. Arreglo: un solo `Marco` por respuesta (`app/(admin)/layout.tsx`, `app/(integrante)/layout.tsx`). El texto «Dark» sale porque `Tema` en `components/ui/Marca.tsx` pinta «Dark» mientras `tema` es `null`.

**Listo.** El 404 de una ruta que no existe está escrito en inglés y tiene salida a Home.

### Eventos — `/eventos`

**Bien.** Una tarjeta «Demo», «Organizer · 4 pending» (el voluntario ve «Volunteer · 0 pending»). «+ Create» y «Join with code». Sidebar en escritorio, tabs abajo en móvil. Sin overflow (390 y 1440, `scrollWidth === clientWidth`). Evidencia: `dark-desktop-organizador-eventos.png`, `dark-mobile-organizador-eventos.png`.

**Mal.**

- Medio. El voluntario demo también tiene «+ Create». Evidencia: texto de `dark-desktop-voluntario-eventos`. Arreglo: en `components/admin/ListaEventos.tsx`, mostrar «+ Create» solo si el rol puede crear.
- Bajo. El botón de tema dice «Light» estando en oscuro. Es el destino del click (`Marca.tsx`: si `tema === "dark"` el texto es «Light»). Se lee como el tema actual. Arreglo: un icono sol/luna y un nombre que diga el estado, no solo el destino. El `aria-label` «Switch to light theme» ya es claro.

**Mejorable.** La lista es una sola fila de texto. El mockup 02 es «My tasks» con filtros e importes, no esta lista. La lista en sí es legible.

**Listo.** El estado vacío del código («No events yet.») no se vio: la cuenta demo sí tiene el evento Demo.

### Bandeja — `/eventos/demo`

**Bien.** A los ~2,5 s aparece el mockup 06 en estructura: tres columnas en escritorio (lista, detalle, recomendación), KPIs US$75 / Paid US$0 / Pending US$75, filtros All / Met / Partial / Insufficient, y «Laya only suggests. You approve every payment.» En móvil las columnas se apilan y no hay overflow (página de 390×1669). Evidencia: `dark-desktop-organizador-inbox-listo.png`, `dark-mobile-organizador-inbox-listo.png`.

**Mal.**

- Crítico (en el ítem seleccionado). Check-in list no tiene recomendación: «The AI could not finish the review». El detalle manda a la revisión, donde el pago está apagado (pantalla siguiente).
- Medio. Con espera de 1,1 s la página seguía en «Loading…». Evidencia: texto de `dark-desktop-organizador-eventos-demo.png`. La causa está en `components/admin/usarVista.ts` y `cargarVistaOrganizador` (`lib/admin/remoto.ts`): un `GET /api/revision/:id` por tarea (cuatro, todas 200). Arreglo: pintar la lista con `GET /api/tareas` y cargar el veredicto de la fila elegida, no bloquear las cuatro.
- Medio. axe `heading-order`: el `h1` es «Demo» (`CabeceraEvento`) y el título de la tarea es `h3` en `components/admin/Bandeja.tsx` sin `h2`. axe `region`: la miga, el `h1` y el bloque de invitar quedan fuera de `<main>`. Arreglo: envolver cabecera + bandeja en un `<main>`, y bajar el título de la tarjeta a un párrafo o subirlo a `h2`.

**Mejorable.** El select «Assign» está dentro de la tarjeta de detalle. Cambiarlo hace `POST /api/tareas/:id/asignar` al vuelo, sin confirmar. No se cambió en esta auditoría. Arreglo: un botón «Save» en `Bandeja.tsx`.

**Listo.** Booth y Team meal muestran la pastilla «Met» y el origen de ejemplo se distingue del fallo de Check-in.

### Tareas del evento — `/eventos/demo/tareas`

**Bien.** Cuatro filas con estado e importe. El valor real de cada `<select>` (no el texto de todas las opciones) es: Welcome table → `voluntario3@demo.hyto`, Check-in list → `voluntario2@demo.hyto`, Set up the booth → `voluntario2@demo.hyto`, Team meal → `voluntario3@demo.hyto`. Ninguna está en `demo-voluntario@hyto.demo`. Evidencia: `dark-desktop-organizador-eventos-demo-tareas.png` y el JSON de selects en la pasada larga.

**Mal.** Alto, junto con Mis tareas: por eso el voluntario demo no ve nada. La semilla en `lib/db/semilla.ts` (`tareasDemo`) asigna todo a `usuarioDemo("voluntario")`, pero la base pública está en voluntario 2 y 3. Arreglo de producto: una tarea del evento Demo asignada a `demo-voluntario@hyto.demo`, o un tercer botón de demo «Volunteer 2».

**Listo.** La página es HTML de servidor y estuvo lista en ~0,4 s. No hace el abanico de `/api/revision`.

### Informe — `/eventos/demo/informe`

**Bien.** «Budget against spend», US$75 / US$0 / US$75, y cada tarea con estado. Check-in list dice «Review failed» y «The AI could not finish the review», así que el origen del fallo sí se ve. Evidencia: `dark-desktop-organizador-informe-listo.png`.

**Mal.**

- Alto. No está el botón «Print» ni el título «Report». `components/admin/Informe.tsx` envuelve cabecera, botón Print y la barra de progreso en `{proyectoId ? null : (…)}`. Esta ruta siempre pasa `proyectoId` (`app/(admin)/eventos/[id]/informe/page.tsx`). `/informe` redirige aquí. Imprimir no tiene entrada. Arreglo: mostrar Print y la barra también con `proyectoId`.
- Alto. Texto en español dentro de una UI en inglés: «Example. Comprobante de la comida del equipo, con monto y fecha visibles.» y «Example. Mesa armada, banner de ZEEK de frente y el salón visible.» `textoVisible` en `lib/ui/etiquetas.ts` busca la frase entera en `LEGADO` y solo después cambia el prefijo `Ejemplo. ` por `Example. `. Con el prefijo, el diccionario no coincide. Arreglo: quitar el prefijo antes de buscar en `LEGADO`.
- Medio. A ~1 s el cuerpo no tiene ni «Loading» ni cifras (el skeleton de `Informe` son barras vacías). Evidencia: texto de `dark-desktop-organizador-eventos-demo-informe.png` frente a `dark-desktop-organizador-informe-listo.png`. Arreglo: el mismo texto «Loading…» que ya usa la bandeja.

**Listo.** El fallo de IA y la recomendación de ejemplo («Sample recommendation») no se ven iguales. Eso era un hueco pedido en el propio código.

### Revisión — `/revision/demo-registro`

**Bien.** La foto carga: `GET /api/evidencias/ac6e3fa5-2b6f-40af-964d-33324fcc85e6/foto`, 640×480, `alt="Check-in list"`. Hay miga, importe US$20, «Photo must show / List of people who arrived», pastilla «In review» y los tres pasos. El aviso está en rosa `#FF4D8D` (píxel `255,77,141` sobre la tarjeta). En móvil hay botón atrás y se oculta el chrome (`hyto-shell-foco`). Evidencia: `dark-desktop-organizador-revision-demo-registro.png`, `dark-mobile-organizador-revision-demo-registro.png`, `light-desktop-organizador-revision.png`.

**Mal.**

- Crítico. No están «Deploy and fund» ni «Approve and pay». Solo «Retry review» y «Ask for another photo». Los pasos dicen «Now · 1. Review the photo», «Later · 2. Lock budget», «Later · 3. Pay». Causa: `botonesRevision` en `lib/admin/remoto.ts` pone `bloqueado` si `tarea.origen === "error"`, y entonces `desplegar`, `fondear` y `pagar` quedan en falso. El texto rosa sale de `components/admin/Revision.tsx` cuando `origen === "error"`. Arreglo: si la IA falla, mostrar el fallo y aún así dejar que el organizador fondee y pague, con el aviso a la vista. No esconder el pago.
- Medio. «Ask for another photo» no dice a quién le llega. No se pulsó: es un POST. Arreglo: una línea en `Revision.tsx` («This asks Volunteer 2 for another photo») antes del botón.

**Mejorable.** El mockup 07–08 es una foto grande, una tarjeta de Laya con puntaje y un botón primario de pago. Aquí el primario no existe en el estado de error. El estado 12d del mockup («Laya unavailable») sí pide un mensaje de fallo; también pide una salida, no un callejón.

**Listo.** La foto, el alt y el color de error están bien. axe en esta pantalla: 0.

### Crear evento — `/eventos/nuevo`

**Bien.** El demo no puede crear: el botón está `disabled` y el texto es «Demo mode cannot create events. Sign in with your email to create one.» (`components/admin/CrearProyecto.tsx`, `AVISO_PROYECTO_DEMO`). El total en vivo dice US$0. Sin overflow en 390 px. Evidencia: `dark-desktop-organizador-eventos-nuevo.png`, `dark-mobile-organizador-crear-listo.png`.

**Mal.**

- Medio. axe `landmark-unique`: `<aside class="hyto-side">` y `<aside class="hyto-panel">` (el presupuesto) sin nombre. Arreglo: `aria-label="Budget"` en el aside de `CrearProyecto.tsx` y `aria-label="Main"` en el de `Marco.tsx`.
- Bajo. Hay botones Work / Reimbursement y, además, un `<select class="sr-only">` con las mismas opciones. El lector oye el tipo dos veces. Arreglo: quitar el select o los botones en `CrearProyecto.tsx`.

**Mejorable.** El mockup 09 es un formulario más corto (nombre, una tarea, monto, condición). Este añade «Assign to» y un presupuesto lateral. Está bien como más completo; no está roto.

**Listo.** El bloqueo del demo es claro y no pega a la API.

### Mis tareas — `/mis-tareas`

**Bien.** El vacío está escrito: «No tasks yet. Join an event with a code.» y un enlace a unirse. Evidencia: `dark-desktop-organizador-mis-tareas.png`, `dark-mobile-voluntario-mis-tareas.png`.

**Mal.** Alto. Las dos cuentas demo caen en ese vacío. El organizador no es el asignado. El voluntario demo tampoco: las tareas son de voluntario 2 y 3, y `/tareas/demo-registro`, `demo-stand`, `demo-bienvenida` y `demo-comida` con esa sesión son «Page not found» con HTTP 200. Las pantallas 03, 04 y 05 del mockup no se pudieron abrir.

**Listo.** El copy del vacío es el correcto para alguien sin tareas. El bug es que el demo público es esa persona.

### Evento como voluntario — `/eventos/demo`

**Bien.** No muestra «Invite» ni las tabs de organizador. El texto es «No tasks yet. When the organizer assigns you a task, it shows up here.» Evidencia: `dark-mobile-voluntario-evento.png`, `dark-desktop-voluntario-eventos-demo`.

**Mal.** El mismo alto de arriba: no hay forma de llegar a una tarea desde esta cuenta.

### Cuenta — `/cuentas` y `/cuentas/preparar`

**Bien.** Se puede cambiar de rol demo y salir. El correo de la sesión se ve (`demo-organizador@hyto.demo` / `demo-voluntario@hyto.demo`).

**Mal.**

- Alto. No es el mockup 11 (saldo, USDC, trustline, «Receive»). En demo, `app/(integrante)/cuentas/page.tsx` no renderiza `PrepararUsdc`: solo el título, el correo y `Entrar`. La línea dice «Organizer demo account · Cavos» (`components/admin/Entrar.tsx`) aunque esta sesión no firma. Arreglo: en demo, decir «Demo · no wallet» y no «· Cavos».
- Alto. `/cuentas/preparar` es otra pantalla: «One organizer and three volunteers. Each person confirms the code we email them.» y «Prepare accounts», con `organizador@demo.hyto` y `voluntario1@…` en «Not ready to receive payment». No se pulsó: ese botón manda correos. Evidencia: `dark-desktop-organizador-cuentas-preparar.png`. Arreglo: no ofrecer ese envío en el demo; llevar la cuenta a un estado de billetera de solo lectura como el mockup 11.
- Medio. axe `landmark-one-main` y `region`: el return de demo no usa `<main>`. Arreglo: el mismo `<main class="hyto-page">` que el branch que no es demo, en `cuentas/page.tsx`.

**Listo.** Salir del demo y cambiar de rol están en la página y no hace falta cazarlos en un menú.

### Unirse — `/join`

**Bien.** Con el campo vacío, «Join» está deshabilitado. Con `HYTO-AUDIT-NO-EXISTE`, `POST /api/join` respondió 400 y la página dijo «That code is not valid.» en rosa `#FF4D8D` (píxeles cerca de `254,78,140`). No avisó a nadie. Evidencia: `dark-mobile-organizador-join-codigo-falso.png`. Código: `components/admin/Unirse.tsx`.

**Listo.** Este formulario sí valida.

### Invitar (panel abierto, sin enviar)

**Bien.** En `/eventos/demo`, «Invite» abre un panel con «Create a code», un email y «Invite by email». No se envió ninguno de los dos. Evidencia: `dark-desktop-organizador-invitar-panel.png`. Código: `components/admin/CabeceraEvento.tsx`.

**Mejorable.** Medio. «Invite by email» está al lado de un campo vacío, sin decir que va a escribir a esa persona. Arreglo: deshabilitarlo si el email no es válido, igual que Join.

## 3. Desviaciones contra los mockups

| Mockup | Qué se esperaba | Qué hay |
|---|---|---|
| 01 Login | Pantalla completa, «hyto», «Prove your worth. Get paid.», correo y Google | Escritorio: diálogo parecido, otra frase. Móvil: sin hero. `/` suelto es una página mínima |
| 02 My tasks | Filtros, importes, filas con estado | El demo no tiene filas. El vacío es una tarjeta de una línea |
| 03–05 Tarea, subir, enviado | Detalle, cámara, confirmación | Inalcanzables con las dos cuentas demo |
| 06 Inbox | Tres columnas, KPIs, filtros, recomendación | Está, en oscuro, cuando termina de cargar (~2,5 s) |
| 07–08 Revisión y pago | Foto, puntaje, botón primario de pago | Foto y pasos sí; el pago no, porque la revisión falló |
| 09 Crear | Formulario corto | Formulario más largo, bloqueado en demo, con presupuesto |
| 10 Informe | Presupuesto, barra, imprimir | Cifras sí. Sin barra y sin Print en la ruta real del evento. Frases en español |
| 11 Billetera | Saldos y red | No está en el demo. En su lugar, cambiar de rol o «Prepare accounts» |
| 12b Vacío | Ilustración y una acción | Texto plano, sin ilustración |
| 12d Laya caída | Aviso y una salida | Aviso sí («Laya is unavailable»). La salida de pago no |
| Tokens | Fondo `#08090C`, tarjeta `#14162B`, rosa provisional | Fondo medido `rgb(11,12,18)` = `#0B0C12`, tarjeta `rgb(22,24,48)` = `#161830` (`app/globals.css`). Lima `#B7EE34` coincide. El rosa `#FF4D8D` se usa para error, no como marca. Desviación baja: se reconoce la marca |

El tema claro existe (`#F4F5F0`, capturas `light-*`) y no estaba pedido como único; los mockups de esta pasada son los oscuros.

## 4. Bugs técnicos

**Consola.** En las pantallas felices no hubo `console.error` ni `pageerror`. Los errores vistos son el 404 del documento en rutas inexistentes, el 404 de `/favicon.ico`, y el 400 de `/api/join` del código falso. Los `net::ERR_ABORTED` de `?_rsc=` aparecen al cerrar la pestaña mientras Next prefetcha; no se cuentan como bug de la UI.

**Red.** `GET /api/tareas`, `GET /api/revision/demo-*` y `GET /api/proyectos` respondieron 200. La bandeja dispara las cuatro revisiones en paralelo (`lib/admin/remoto.ts`). La foto de evidencia respondió y decodificó.

**Tiempos (esta corrida, borde de Vercel).** TTFB del documento ~12–15 ms, `DOMContentLoaded` ~170–350 ms. Bandeja usable a los 2,5 s. Informe a los 2,2 s. Tareas del evento a los 0,4 s. No es una página lenta de HTML; el hueco es el fan-out de la revisión.

**Overflow.** En las páginas medidas, `scrollWidth === clientWidth` a 390 y a 1440. No hubo scroll horizontal.

**axe-core** (impact moderate, repetido en el crawl):

- `region` (25 páginas): cabecera del evento fuera de un landmark. `components/admin/CabeceraEvento.tsx`.
- `landmark-unique` (13): dos `<aside>` en crear evento.
- `landmark-one-main` (6): `/cuentas` en demo.
- `heading-order` (bandeja ya cargada): `h1` y luego `h3`.

No hubo violaciones `color-contrast` de axe. El gris `--suave` `#8A8C9A` sobre el fondo `#0B0C12` da 5,86:1 y sobre la tarjeta `#161830` da 5,22:1. El rosa de error sobre la tarjeta da 5,55:1. La lima del botón con texto `#08090C` da 14,5:1.

**Foco.** El enlace «Events» del nav, enfocado, usa el outline del navegador (`rgb(238, 238, 238) auto 1px`), no el anillo de `.hyto-btn:focus-visible` (`app/globals.css`). Bajo. Arreglo: el mismo `:focus-visible` en `.hyto-nav a`.

**SEO y cabeceras.** En el HTML de `/`:

- `<title>Hyto</title>` en todas las rutas. Sin plantilla por pantalla (`app/layout.tsx`).
- `meta description`: «Expense control and milestone payments». El subtítulo visible es «Events, evidence, and USDC payments on Stellar.»
- Sin `og:title`, `og:description`, `og:image` ni canonical.
- `lang="en"` correcto.
- `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` → 404.
- `strict-transport-security` presente. No vienen `content-security-policy`, `x-content-type-options` ni `x-frame-options` en la respuesta HTML.

**Listo en técnica.** La foto tiene alt. El diálogo tiene `role="dialog"` y `aria-modal`. Join deshabilita el botón vacío. El demo no crea eventos.

## 5. Quick wins

1. En `lib/ui/etiquetas.ts`, buscar en `LEGADO` después de quitar `Ejemplo. `. Se van las frases en español del informe.
2. En `components/admin/Informe.tsx`, no esconder Print ni la barra cuando hay `proyectoId`.
3. En `lib/admin/remoto.ts`, no tratar `origen === "error"` como candado del pago. Dejar el aviso y mostrar fondear / pagar.
4. Asignar una tarea del evento Demo a `demo-voluntario@hyto.demo`, para que Mis tareas y subir evidencia existan en el demo.
5. En `components/admin/Entrar.tsx` y `Landing.tsx`, usar el eslogan y no dejar `/` en una sola frase. En `globals.css`, no ocultar todo el hero bajo 1024 px.
6. En `cuentas/page.tsx`, envolver el demo en `<main>`. En `CabeceraEvento.tsx`, meter la cabecera en el mismo `<main>` que el cuerpo.
7. Favicon y un `title` por ruta en `app/layout.tsx` (`Hyto · Events`, `Hyto · Review`).
8. En `Marca.tsx`, que el botón de tema no diga solo «Light» cuando el tema es oscuro.
9. Estado 404 de verdad en los ids dinámicos, y un solo `Marco` en esa respuesta.
10. En la bandeja, no esperar las cuatro `/api/revision` para salir del skeleton.

### Conteo

| Severidad | Hallazgos distintos |
|---|---|
| Crítico | 1 — pago bloqueado por el fallo de Laya |
| Alto | 5 — voluntario sin tareas; informe sin Print y en español; ingreso lejos del mockup; cuenta que no es la billetera; 404 blando y tema duplicado |
| Medio | 7 — skeleton mudo; landmarks y salto de heading; SEO y favicon; aviso de email mal puesto; «+ Create» para el voluntario; cabeceras sin CSP ni `nosniff`; panel de invitar sin validar el email |
| Bajo | 4 — el botón de tema dice «Light» en oscuro; tokens `#0B0C12` / `#161830` frente al mockup; tipo de tarea duplicado para el lector; foco del nav con el outline del navegador |

### Qué no se alcanzó

- Login real de Cavos (código al correo o Google): habría avisado a una persona.
- «Invite by email», «Create a code» y «Prepare accounts»: escriben o mandan correo. El panel de invitar solo se abrió.
- Cambiar «Assign», «Retry review» y «Ask for another photo»: son POST. No se dispararon.
- Subir evidencia, desplegar, fondear, aprobar y pagar, y la billetera con saldo. El voluntario demo no entra a ninguna tarea, y el demo no firma.
- `docs/vault/` no está en el repo. La comparación usa los Mockups v2 oscuros de Drive (01–12 y 12b, 12d).
