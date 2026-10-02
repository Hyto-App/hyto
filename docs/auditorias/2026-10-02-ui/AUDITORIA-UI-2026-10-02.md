# Auditoría UI/UX — hyto.vercel.app (2 oct 2026)

**Para:** Josué / Jayden · **De:** ARGOS (PM, UI/UX) con Abdiel · **Base:** `main` @ `2b9fad4`, sitio público, sesión demo organizador y voluntario.
**Evidencia completa:** `ANEXO-evidencia.md` (crawl automatizado: Playwright, axe-core, 390×844 y 1440×900, oscuro y claro) + carpeta `capturas/`.

La crítica es dura porque el demo se juega el 5. El trabajo de base está bien hecho: la identidad oscura se reconoce (lima `#B7EE34`, Poppins, sidebar, tabs), no hay overflow horizontal en ninguna pantalla, el contraste pasa en todo lo medido, el modo demo bloquea lo que debe bloquear y el formulario de Join valida bien. El problema no es de pixeles. **El demo público no deja ver el producto**: quien entra hoy nunca ve a la IA aprobar algo ni a nadie cobrar.

---

## P0 — Arreglar antes del cierre (5 oct)

### 1. El demo no muestra el camino feliz (Crítico)
- **Organizador:** la única revisión abierta (`/revision/demo-registro`, Check-in list) está en error: «Laya is unavailable». En ese estado se esconden «Deploy and fund» y «Approve and pay». El paso 1 se queda en *Now* y los pasos 2 y 3 en *Later*. Es un callejón sin salida.
  - Causa: `botonesRevision` en `lib/admin/remoto.ts` bloquea todo cuando `tarea.origen === "error"`.
  - **Arreglo de producto:** si la IA falla, se muestra el aviso y **el organizador igual puede fondear y pagar**. La IA sugiere y el humano decide; esa es nuestra promesa («…only suggests. You approve every payment.»). Esconder el pago contradice el copy de la propia pantalla.
- **Voluntario:** «Volunteer demo» ve cero tareas. La semilla asigna a `demo-voluntario`, pero la base pública tiene las tareas en voluntario 2 y 3. `/tareas/demo-*` devuelve «Page not found». Las pantallas 03–05 (tarea, subir foto, enviado) **no existen para quien prueba el demo**.
  - **Arreglo:** que la semilla demo tenga, como mínimo, (a) una tarea asignada a `demo-voluntario@hyto.demo` lista para subir evidencia y (b) una revisión con veredicto **Met** y el botón de pagar activo. La revisión en error puede quedarse como segundo ejemplo, ya con salida.

### 2. La bandeja dice 4 pendientes y muestra 3 (Alto, verificar)
`/eventos` dice «Organizer · 4 pending», pero la bandeja lista 3 (Check-in, Booth, Team meal). Welcome table no aparece. O sobra el contador o falta un ítem; hay que revisar el filtro.

### 3. El informe no se puede imprimir y sale en español (Alto)
- `components/admin/Informe.tsx` esconde el título, «Print» y la barra cuando hay `proyectoId`, que es justo la ruta real del evento.
- `lib/ui/etiquetas.ts` (`textoVisible`) busca la frase en `LEGADO` **antes** de quitar el prefijo `Ejemplo. `, así que nunca coincide y salen «Example. Comprobante de la comida…» y «Example. Mesa armada, banner de ZEEK…». Hay que quitar el prefijo primero.

### 4. Renombrar la IA: Laya pasa a ser **Mile** (decisión de producto)
Todo el texto visible que dice «Laya» pasa a «Mile», por ejemplo «Mile only suggests. You approve every payment.» y «Mile is unavailable». **Solo texto de UI.** El servicio, la URL de Funnel y `LAYA_URL` no se tocan hasta después del cierre.

### 5. La foto de evidencia no se ve en la captura de revisión (Alto, verificar)
En la captura de escritorio de `/revision/demo-registro`, el recuadro de la foto sale vacío, aunque la petición responde 200 y la imagen trae `alt`. Puede ser carga diferida o un `object-fit`/alto mal puesto. Si la foto no se ve, la pantalla pierde su razón de ser. Mientras carga, hace falta un placeholder con spinner.

---

## P1 — Primera impresión y marca

6. **Login lejos del mockup 01.**
   - El eslogan oficial «Prove your worth. Get paid.» no aparece en ninguna pantalla. Hoy dice «Sign in» y «Email a code, then review evidence and pay in USDC.», que es una instrucción, no una promesa.
   - En móvil, `.hyto-auth-hero { display:none }` deja el sheet sin logo, sin marca y sin frase. Hay que reemplazarlo por una franja compacta de marca.
   - `/` sin `?signin=1` es un título y un botón. Debería ser el mismo login del mockup 01.
   - Hay tres textos de valor distintos (hero, subtítulo y pie «Volunteers · Organizers · Paid via Stellar escrow»). Hay que elegir uno: el eslogan.
   - El error «Enter a valid email.» sale debajo de «Enter as demo», lejos del campo. Va pegado al input.
7. **Account no es la billetera (mockup 11).** El demo muestra «Organizer demo account · Cavos», sin saldo, y `/cuentas/preparar` ofrece *mandar correos* a cuentas demo. En demo hace falta una billetera de solo lectura con saldo de ejemplo, el texto «Demo · no wallet» y nada que mande correos.
8. **Botón de tema.** En oscuro dice «Light», y se lee como el estado actual. Mejor un ícono sol/luna. Además, en las rutas con error se ven «Dark» y «Light» a la vez (ver 10).
9. **El voluntario ve «+ Create».** Hay que esconderlo según el rol.

## P2 — Robustez técnica visible

10. **404 blando y layout duplicado.** Un id inexistente (`/eventos/x`, `/revision/x`, `/tareas/x`) responde 200 con «Page not found», y monta dos `.hyto-shell` con controles duplicados. Hay que hacer que `notFound()` llegue como 404 real y que haya un solo `Marco` por respuesta.
11. **Carga muda.** La bandeja espera 4 llamadas a `GET /api/revision` antes de pintar (~2,5 s). El informe muestra barras vacías sin «Loading…» durante ~2 s y parece roto. Lo correcto es pintar la lista con `/api/tareas` y pedir el veredicto solo de la fila elegida.
12. **Acciones sin confirmación.**
    - «Assign» reasigna al vuelo con un POST, sin guardar ni deshacer.
    - «Ask for another photo» no dice a quién le llega.
    - «Invite by email» se puede pulsar con el campo vacío.
13. **Accesibilidad** (moderada, 25 páginas):
    - La cabecera del evento queda fuera de `<main>`.
    - `/cuentas` demo no tiene `<main>`.
    - La bandeja salta de `h1` a `h3`.
    - Hay dos `<aside>` sin nombre.
    - El selector de tipo se anuncia dos veces.
    - El foco del nav usa el outline del navegador.
14. **SEO y metadatos.**
    - `<title>Hyto</title>` en todas las rutas.
    - La descripción no coincide con el subtítulo.
    - No hay Open Graph, así que el link compartido sale sin imagen el día del pitch.
    - `favicon.ico`, `robots.txt` y `manifest` dan 404.
    - Faltan las cabeceras CSP y `nosniff`.

## Lo que ya está listo (no tocar)
- La bandeja de 3 columnas con KPIs, filtros y el copy de la IA, fiel al mockup 06 en estructura.
- El bloqueo de crear evento en modo demo, claro y sin pegarle a la API.
- La validación de Join, con mensaje en rosa y 400 correcto.
- Contraste AA en todo lo medido: gris 5,9:1 y lima 14,5:1.
- Responsive sin overflow a 390 y 1440.
- El 404 de rutas desconocidas, con su texto y salida a Home.

## Orden sugerido para Jayden
1. P0 #1 (semilla demo + pago aunque falle la IA)
2. P0 #3 (Print + etiquetas)
3. P0 #4 (Mile)
4. Verificar P0 #2 y #5
5. P1 #6 (eslogan y hero móvil)
6. P2 #14 (OG + favicon, unos 15 minutos)
7. Lo demás, después del cierre.

**Fuera de alcance de esta pasada:** el login real de Cavos, enviar invitaciones o códigos, fondear y pagar de verdad, y la calidad del código. No se disparó ninguna acción que escriba o mande correos.
