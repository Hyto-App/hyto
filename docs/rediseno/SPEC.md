# Hyto · Rediseño de la app (voluntario) — spec para construir en 3 partes

> **Historia del producto, 8 de octubre de 2026.** Hyto es la capa de rendición de cuentas para comunidades en Latinoamérica que reciben fondos desde lejos (estipendios, becas, fondos para eventos). Stellar es el riel del pago, no el público. El eslogan de la app es «Show the spend. On the record.» Este spec sigue valiendo para layout, Mile y la regla de no escribir jerga de pago en la UI. No describe un mercado de tareas ni una app de gastos para empresas.

> Aprobado por Abdiel el 2026-10-04. Este documento es **autocontenido**: quien construye solo necesita este repo.
> Base de código: rama `abdiel/sin-landing` (PR #143: `/` abre el login; con sesión redirige a `/mis-tareas`).
> Rama de trabajo del rediseño: `abdiel/rediseno-app` (cada PARTE sale en su propia rama/PR desde ahí).
> **No se construye nada en este commit.** Solo spec, referencias y SVG de Mile.

## 0. Reglas que no se negocian

1. **Mile es él** (masculino en todo el copy: "Mile está revisando", "Mile listo", nunca "lista").
2. **Mile grande y protagonista** en todas las pantallas del voluntario, con su estado visible: revisando (Buscando), rechazado, feliz (¡La tengo!). Ver §3.
3. **Sin animaciones ni Lottie en este deploy.** Mile es SVG estático por estado. Nada de `@keyframes` nuevos para Mile. (Las transiciones de color/opacity ≤200 ms en botones están bien.)
4. **Nunca escribir "escrow" ni "testnet"** (tampoco "trustline", "XDR", "Soroban", "friendbot", "mainnet") en copy visible, ni en inglés ni en español. Ojo: hay claves existentes con esas palabras que tocan pantallas de este rediseño (§8.3); hay que reescribir su **valor**.
5. **Copy en español: tú tico-neutral**, como la app hoy ("Toma otra foto", "Puedes enviarla", "Abre Eventos"). Nada de vos ni usted. **El inglés sigue siendo el idioma por defecto** (`lib/ui/diccionario.ts`): cada clave nueva va en `en` y en `es` a la vez (lo verifica `lib/ui/diccionario.test.ts`). **Nada de idiomas mezclados** (UX #052, media): todo texto de la UI sale del diccionario en el idioma activo, incluidos avisos del servidor (pasarlos por `claro()`), etiquetas de estado, bandas de nota y textos de Mile; el único texto que se muestra tal cual es el que escribió el organizador (`titulo`, `condicion`, nota de rechazo).
6. **Claro y oscuro.** Oscuro por defecto (como hoy). Se mantiene el mecanismo actual: `<html data-theme>`, `localStorage["hyto-tema"]`, script `TEMA_BOOT` en `app/layout.tsx`, botón `Tema` en `components/ui/Marca.tsx`.
7. **Una sola acción primaria lima por pantalla.** Lima `#B7EE34` = acción principal y éxito. Rosa `#FA0560` = la chispa de Mile y errores/rechazo. Contraste AA (texto secundario ≥ 7:1, terciario ≥ 4.5:1). Toques ≥ 44 px.
8. **No se toca lógica de dinero, firma, auth ni antifraude** salvo lo que dice explícitamente la PARTE 3 (§7). La IA no aprueba ni paga; el organizador decide.
9. Datos de las maquetas (Sofía Rojas, Marco Salas, ZEEK Cleanup Day, "Sector norte", "sáb 3 oct", comisión 0.03) son **de ejemplo**. No inventar campos que no existen (§9 lista lo que falta).
10. Reglas del repo (AGENTS.md): una rama y un PR por parte, nada a `main`, `npm test` y `npx tsc --noEmit` en verde, sin secretos, sin `NEXT_PUBLIC_` nuevas.

## 1. Archivos de esta carpeta

| Ruta | Qué es |
|---|---|
| `SPEC.md` | Este documento. |
| `mile/mile-<estado>-<dark|light>.svg` | **Mile final (v5)** en estático: `descansando`, `buscando`, `la-tengo`, `rechazado` (*propuesta, ver §3*), `icono`, `cara-neutra`, `cara-feliz`. IDs internos ya únicos por archivo. |
| `mile/mile-estados.webp` | Hoja de los 7 estados en oscuro y claro. |
| `mile/mile-referencia-v5.webp` | Hoja original del diseño final de Mile (señas + cofre). |
| `ref/base-*.webp` | 20 maquetas aprobadas (10 pantallas × móvil 390×844@2x / escritorio 1440×900), tema oscuro. Layout y copy de referencia. |
| `ref/mile-*.webp` | Variante "Mile grande" (estados visibles) + 2 pantallas en **claro** (`*-light.webp`). `mile-contact-estados.webp` = antes/después. |
| `mockups/` | HTML/CSS fuente de las maquetas (`tokens.css`, `app.css`, `html/`, `mile-grande/html/`, `mile-grande/light.css`). Útil para medir paddings exactos. **Las imágenes de Mile dentro de esos HTML no vienen** (eran versiones viejas): usar `mile/`. |

**Si llegaste por el issue de GitHub:** este texto es la fuente de verdad. Los 14 SVG de Mile vienen en los comentarios del issue (cada uno con su ruta `docs/rediseno/mile/<nombre>.svg`): créalos tal cual en esa ruta (y cópialos a `public/mile/` en la PARTE 1). Las imágenes de `ref/`, `mile/*.webp` y `mockups/` **no están en GitHub** (las tiene ARGOS); donde este documento las cita, guíate por la descripción escrita.

**Importante sobre las maquetas:** el set oscuro de `ref/mile-*-dark.webp` todavía dibuja a Mile **con boca** (versión anterior). El look final es **sin boca**: estrella lima de 4 puntas, mechón arriba, chispa rosa `#FA0560` flotando, ojos ovalados navy, sello Hyto (dos barras) en la mejilla, y vive en un **cofre negro con borde lima**. Usar siempre los SVG de `mile/`; de las maquetas solo se toma la posición y el tamaño de Mile.

## 2. Tokens

Fuente: login aprobado (`.hyto-login*` en `app/globals.css`, variables `--l-*`) + `mockups/tokens.css` (oscuro) + `mockups/mile-grande/light.css` (claro).
**Decisión:** se actualizan los **valores** de los tokens globales existentes en `app/globals.css` (`:root` = claro, `[data-theme="dark"]` = oscuro) y se agregan los nuevos. **No renombrar** tokens existentes: los usan también las pantallas del organizador.

### 2.1 Color

| Token (existente / nuevo) | Oscuro | Claro | Uso |
|---|---|---|---|
| `--acento` | `#B7EE34` | `#B7EE34` | Fondo de la acción primaria, check, éxito |
| `--acento-hover` *(nuevo)* | `#C6F55A` | `#C6F55A` | Hover del primario |
| `--sobre-acento` | `#08090C` | `#08090C` | Texto sobre lima |
| `--acento-texto` | `#B7EE34` | `#4A7300` | Texto "lima" (montos ganados, enlaces). En claro baja a #4A7300 por AA |
| `--rosa` *(nuevo)* | `#FA0560` | `#FA0560` | Chispa de Mile, punto de alerta (nunca texto chico) |
| `--peligro` | `#FF5C96` | `#D4044F` | Texto/borde de error y rechazo |
| `--fondo` | `#0E1024` | `#F5F6FA` | Fondo de la app (antes `#08090C` / `#F4F5F0`) |
| `--fondo-centro` *(nuevo)* | `#1A1E42` | `#FFFFFF` | Brillo radial arriba |
| `--sidebar` | `rgba(12,13,30,.72)` | `#FFFFFF` | Barra lateral escritorio |
| `--papel` | `#14162B` | `#FFFFFF` | Tarjetas planas, inputs |
| `--superficie-2` | `#1C1F3D` | `#EEF0F6` | Segmentado, chips activos |
| `--superficie-3` *(nuevo)* | `#252949` | `#E3E6EF` | Skeleton, hover |
| `--card-bg` *(nuevo)* | `linear-gradient(180deg,#171A34 0%,#121429 100%)` | `#FFFFFF` | Tarjeta destacada (abierta, Mile) |
| `--card-line` *(nuevo)* | `rgba(255,255,255,.07)` | `rgba(20,22,43,.08)` | Borde 1px de tarjetas |
| `--tinta` | `#F2F3F7` | `#14162B` | Texto principal |
| `--suave` | `#B0B3C6` | `#474B63` | Texto secundario |
| `--tenue` *(nuevo)* | `#8D90A8` | `#676B82` | Terciario (metadatos, pistas) |
| `--linea` | `#262A45` | `#E2E4EE` | Divisores |
| `--borde` | `#40446A` | `#C4C8D8` | Bordes de botón fantasma / inputs |
| `--foco` | `0 0 0 3px rgba(183,238,52,.35)` como `box-shadow` (hoy es color: mantener `--foco` color `#B7EE34`/`#4A7300` y agregar `--anillo-foco` con el box-shadow) | | Anillo de foco visible |
| `--pend` / `--pend-bg` *(nuevos)* | `#FFC24B` / `rgba(255,194,75,.12)` | `#9A6400` / `rgba(255,194,75,.16)` | Badge "Pendiente" |
| `--rev` / `--rev-bg` *(nuevos)* | `#A3AAFF` / `rgba(140,150,255,.14)` | `#4148C0` / `rgba(90,100,230,.10)` | "Enviada / en revisión", Mile pensando |
| `--ok` / `--ok-bg` *(nuevos)* | `#B7EE34` / `rgba(183,238,52,.12)` | `#4A7300` / `rgba(183,238,52,.28)` | "Pagada", checks cumplidos |
| `--rej` / `--rej-bg` *(nuevos)* | `#FF5C96` / `rgba(255,77,141,.13)` | `#D4044F` / `rgba(250,5,96,.09)` | "Rechazada", punto fallido |
| Primario deshabilitado | fondo `#262A48`, texto `#9497AE` | fondo `#E4E6EE`, texto `#5D6178` | "Enviar evidencia" sin foto |

Los tokens actuales `--pendiente-*`, `--revision-*`, `--pagado-*`, `--insuficiente-*` siguen existiendo (los usa `PastillaVeredicto`/organizador); apuntarlos a los nuevos (`--pendiente-tinta: var(--pend)`, etc.).

**Fondo de la app:** `background: radial-gradient(ellipse 80% 40% at 50% -8%, <brillo> 0%, transparent 70%), var(--fondo)` con brillo `rgba(40,46,100,.55)` en oscuro y `rgba(183,238,52,.16)` en claro. **Sin swirl** (el swirl es solo del login).

### 2.2 Tipografía
Poppins 400/500/600 (ya cargada con `next/font` como `--font-poppins`). Números con `font-variant-numeric: tabular-nums`.

| Rol | Móvil | Escritorio |
|---|---|---|
| Título de página (h1) | 28px / 1.15 / 600 / -0.025em | 32px |
| Subtítulo de página | 14px / 400 / `--suave` | 15px |
| Título de tarjeta / sección (h2) | 17–18px / 600 / -0.01em | 18–20px |
| Cuerpo | 14–15px / 1.5 | 15px |
| Metadatos (hora límite, evento) | 13px / `--suave` | 13px |
| Etiquetas, badges, chips | 12–12.5px / 500 | igual |
| Eyebrow ("HOLA, SOY MILE") | 12px / 600 / uppercase / 0.08em / `--acento-texto` | igual |
| Monto en tarjeta | 16px / 600 + unidad "USDC" 11.5px/500 `--suave` | igual |
| Métrica (KPI) | 20px / 600 | 26px |
| Monto héroe (pago) | 64px / 600 / -0.03em + "USDC" 24px | 72px |
| Título login (referencia) | 25px / 600 / 1.12 / -0.035em | — |

### 2.3 Espaciado, radios, sombras, tamaños
- Espaciado: escala 4/8/12/16/20/24/32/40/48 (`--s1…--s12` en `mockups/tokens.css`). Los tokens actuales `--e-1…--e-8` (8 px) se mantienen.
- Radios: `--r-sm 10px` (checks, inputs chicos), `--r-md 14px` (métricas, campos; = `.hyto-login-campo`), `--r-lg 20px` (tarjetas), `--r-xl 28px` (hoja/panel Mile), `--r-pill 999px` (botones, badges, chips; = `.hyto-login-btn`). La tarjeta del login usa 24px con borde degradado lima→lavanda: usar ese borde en la tarjeta héroe de Mile.
- Sombras: tarjeta `0 24px 48px -28px rgba(0,0,0,.7), 0 0 0 1px var(--card-line)` (claro: `0 14px 30px -20px rgba(20,22,43,.28), 0 0 0 1px var(--card-line)`); botón primario `0 8px 18px -10px rgba(124,170,10,.6)`.
- Botones: alto mínimo 44px; **grande 52px** / 15.5px / padding 0 22px (CTA fijo abajo y CTA de Mile). Primario lima; fantasma con `--borde` y fondo `rgba(255,255,255,.03)` (claro `#fff`); fantasma peligro con borde `rgba(255,92,150,.45)`.
- Badge de estado: 26px alto, pill, punto 6px + texto 12.5px/500 sobre `--*-bg` con color `--*`.
- Chip de monto (`amt-pill`): 32px, pill, `--ok-bg` + `--acento-texto` 14px/600.
- Móvil: header 60px; nav inferior 82px (4 columnas, ícono 22px, texto 11.5px/500); CTA fijo inferior con padding 12px 16px 26px y fondo `rgba(12,13,30,.96)` / `rgba(255,255,255,.96)` + borde superior `--linea`.
- Escritorio: barra lateral 256px; contenido `padding 36px 48px`, `max-width 1080px` centrado. En pantallas de tarea, 2 columnas: foto/visor (≈ 60%) + panel Mile/checklist (≈ 40%, `min-width 320px`).

## 3. Mile (componente y estados)

### 3.1 Estados → cuándo

| Estado (archivo) | Qué se ve | Dónde va |
|---|---|---|
| `descansando` | Asoma del cofre entreabierto: ojos + sello; chispa al lado | Saludo de Mis tareas, subir evidencia (antes de elegir foto), tour |
| `buscando` | Dentro del cofre que tiembla (inclinado), salen moneda y documento, destellos | **Revisando**: mientras sube la foto y mientras la tarea está "en revisión" sin nota todavía |
| `la-tengo` | Sale del cofre, feliz (ojos en arco), chispa brillando | **Pagada** (pantalla de pago y tarjeta "Pagada") |
| `rechazado` | Asoma bajito, inclinado, ojos preocupados, chispa caída y apagada | **Rechazada** (organizador pidió otra foto) |
| `icono` | Cofre cerrado, solo el mechón | Carga (skeleton), lista vacía, ícono de marca |
| `cara-neutra` / `cara-feliz` | Solo Mile sin cofre | Tamaños < 48px (notas dentro de tarjetas: "Mile está revisando tu foto" / "Pagada") |

`rechazado` es **propuesta** armada con las piezas del diseño final (no tenía pose propia). Si Abdiel la cambia, solo se reemplaza el SVG.

### 3.2 Componente `components/ui/Mile.tsx` (PARTE 1)
```ts
type EstadoMile = "descansando" | "buscando" | "la-tengo" | "rechazado" | "icono" | "cara-neutra" | "cara-feliz";
<Mile estado="buscando" tamano={148} halo etiqueta?: string />   // etiqueta = texto accesible; sin etiqueta => aria-hidden
```
- Copiar `docs/rediseno/mile/*.svg` a `public/mile/`. Renderizar **dos `<img>`** (`-dark` y `-light`) y mostrar según tema con CSS (`[data-theme="dark"] .hyto-mile-claro{display:none}` y viceversa). Así no hay colisión de IDs ni SVG inline pesado.
- `halo` (default true en tamaños ≥ 96px): círculo `radial-gradient(closest-side, var(--halo), transparent 72%)` detrás, `inset:-6%`. `--halo`: descansando/la-tengo `rgba(183,238,52,.22)` (la-tengo `.38` y `scale(1.15)`), buscando `rgba(140,150,255,.22)`, rechazado `rgba(250,5,96,.16)`. En claro: lima `.30`, lavanda `rgba(120,130,240,.22)`, rosa `.12`.
- Tamaños: **móvil héroe 120–160px** (≈ 30–40% del ancho), **escritorio panel 180–220px**, cara en tarjeta 28–40px. Nunca menor a 24px.
- Accesible: `alt=""` + `aria-hidden` cuando hay texto al lado que dice lo mismo; si no, `etiqueta` del diccionario (`mile.alt.buscando` = "Mile is checking your photo" / "Mile está revisando tu foto", etc.).
- Sin animación. No usar `public/login/mile-*.svg` (son del login, versión anterior).

## 4. Shell y navegación (PARTE 1)

Componente actual: `components/admin/Marco.tsx` (lo usan `app/(integrante)/layout.tsx` y `app/(admin)/layout.tsx`). Se rediseña **ese** componente, sin duplicarlo.

**Móvil (< 1024px)**
- Header 60px: logo `Logo` a la izquierda; a la derecha selector de idioma con globo `ES ▾` (`SelectorIdioma`, el mismo del login) y botón `Tema`.
- Nav inferior fija (82px), 4 entradas en este orden: **Tareas** (`/mis-tareas`, activo también en `/tareas/*`) · **Eventos** (`/eventos`, activo en `/eventos/*`, `/revision/*`, `/informe`) · **Unirme** (`/join`, botón "+" de 40×32 con borde lima 1.5px `rgba(183,238,52,.6)` y radio 12px, sin relleno para no competir con el primario) · **Cuenta** (`/cuentas`, activo en `/cuentas/*`). Activo: texto `--tinta` + ícono lleno; inactivo `--suave`.
- Modo foco (ya existe `hyto-shell-foco` para `/tareas/*` y `/revision/*`): se oculta la nav inferior; header propio de la pantalla con "‹" (volver), eyebrow (p. ej. "Subir evidencia" / "Tarea rechazada") + título de la tarea en 2 líneas máx. y chip de monto a la derecha.

**Escritorio (≥ 1024px)**
- Barra lateral 256px: logo arriba; enlaces **Mis tareas** (con contador de pendientes en pill a la derecha) · **Eventos** · **Cuenta y billetera**; debajo botón fantasma **+ Unirme con código** (`/join`). Abajo de todo: selector `ES ▾` + `Tema`, y chip de usuario (iniciales en círculo + nombre + correo; si no hay nombre, solo correo).
- Contenido con `max-width 1080px`. En `/tareas/*` hay migas "‹ Mis tareas" arriba del título.

**Mejoras de UX obligatorias en el shell (walkthrough de Jayden, buzón #052, prioridad alta):**
- **La nav inferior no puede tapar contenido.** El contenedor principal (`.hyto-main`) lleva `padding-bottom: calc(82px + env(safe-area-inset-bottom) + 16px)` en móvil cuando la nav está visible, y la nav misma `padding-bottom: max(22px, env(safe-area-inset-bottom))`. Igual para el CTA fijo de las pantallas de tarea (`calc(<alto CTA> + env(safe-area-inset-bottom))`). Agregar `viewport-fit=cover` al `viewport` de `app/layout.tsx`. Verificar en 400px de ancho que montos de presupuesto, botones y la última tarjeta quedan visibles en Mis tareas, Eventos, Cuenta y detalle de evento.
- **Acciones principales arriba del fold.** Patrón del shell: el header de página (`hyto-page-head`) pone las acciones primarias de la página (p. ej. **Crear evento / Unirme** en `/eventos`) **junto al título**, antes de cualquier tarjeta de bienvenida o héroe; las tarjetas de bienvenida van después y se pueden colapsar (botón "Ocultar", recordado en `localStorage`). Eventos hereda este patrón en la PARTE 1 aunque su rediseño completo esté fuera de alcance (§8.2): solo se mueven los botones y se hace colapsable la bienvenida en `ListaEventos.tsx`, sin cambiar su lógica.
- **Volver/Cancelar en todas las pantallas "de paso".** El header de página del shell acepta `volver` (`{ href?: string; etiqueta?: string }`): botón "‹ Volver" (o "Cancelar") que regresa a la ruta de origen (`router.back()` si hay historial de la app, si no `href` por defecto). Obligatorio en `/join`, `/join/[secreto]` (default `/mis-tareas`), `/revision/[id]` (default `/eventos/[id]` de la tarea), `/tareas/[id]` (default `/mis-tareas`), `/eventos/nuevo` y `/cuentas/preparar`. Reemplaza al botón suelto `hyto-atras` actual de `Marco.tsx`.
- **Estado activo correcto** (media): `/join*` marca **Unirme**, no Cuenta (hoy `Marco.tsx` lo cuenta como Cuenta).
- **Chips de filtro en una línea** (media): cualquier fila de chips/filtros en móvil usa `white-space: nowrap` + scroll horizontal (`overflow-x: auto`, sin barra visible, `scroll-snap`), nunca texto partido en varias líneas (p. ej. "Partially completed").

Claves nuevas: `nav.join` ("Join" / "Unirme"), `nav.joinCode` ("Join with code" / "Unirme con código"), `nav.accountWallet` ("Account & wallet" / "Cuenta y billetera"). `nav.tasks` en escritorio muestra "My tasks" / "Mis tareas" (`nav.myTasks`).

## 5. PARTE 1 — Shell + Mis tareas + componente Mile

**Rutas/archivos:** `components/admin/Marco.tsx`, `app/globals.css` (tokens + clases nuevas), `components/ui/Mile.tsx` (nuevo), `components/ui/ConfirmDialog.tsx` (nuevo, §5.4b), `components/ui/Skeleton.tsx` (nuevo), `components/ui/EstadoVacio.tsx` (nuevo), `public/mile/*.svg` (nuevo), `components/integrante/MisTareas.tsx`, `components/integrante/EstadoTarea.tsx`, `app/(integrante)/mis-tareas/page.tsx`, `lib/ui/diccionario.ts`, `app/loading.tsx` (opcional: skeleton).
**Referencias:** `ref/base-01-mis-tareas-{mobile,desktop}-dark.webp`, `ref/mile-01-inicio-mile-saluda-mobile-dark.webp`, `ref/base-01b-mis-tareas-vacio-*`, `ref/base-08-cargando-skeleton-*`, `ref/mile-contact-estados.webp`.

### 5.1 Lógica que se conserva tal cual (MisTareas.tsx)
- Carga con `listarTareas({ miembroId: "" }, { muestra: demo })` (`lib/integrante/rutas.ts`) y nombres de evento con `GET /api/proyectos`. Reintento con `intento`.
- Estados `pendiente | en revisión | pagado` (`lib/integrante/tipos.ts`). Etiquetas con `etiquetaEstado` (`lib/ui/etiquetas.ts`).
- KPIs: Ganado = `suma(tareas,"pagado")`, En revisión = `suma(tareas,"en revisión")` (usa `tope ?? monto`), Por hacer = cantidad de pendientes. `formatearMonto`, `montoDeTarea`.
- Filtros (`all` + 3 estados) con contador; orden (`prioridad` / `mayor` / `defecto`) con `ordenarPorPago` y agrupación por evento con `agruparPorEvento`; pill "Mejor pagada" (`idsMejorPagadas`); insignias de prioridad/dificultad (`InsigniasClasificacion`).
- Error con "Intentar de nuevo"; vacío con enlace a `/join`; nota "Ejemplo" cuando `ejemplo`.
- Botón por tarjeta: pendiente → `/tareas/[id]` primario; resto → `/tareas/[id]` fantasma.
- Tests existentes que hay que mantener verdes (ajustar selectores si cambian clases, **no** borrar asserts de comportamiento): `lib/integrante/mis-tareas.test.ts`, `orden-pago.test.ts`, `rutas.test.ts`, `lib/ui/diccionario.test.ts`.

### 5.2 Layout móvil
1. Header de página: **"Mis tareas"** (h1 28px). Debajo, subtítulo con ícono calendario + nombre del evento si hay **un solo** evento; con varios, subtítulo "{n} eventos" (no hay fecha de evento en la base: no mostrar fecha).
2. **Tarjeta héroe de Mile** (`--card-bg`, radio 20, borde degradado como `.hyto-login-tarjeta`): Mile `descansando` 120–140px a la izquierda; a la derecha **"¡Hola, {nombre}!"** (18px/600) y "Tienes **{n} tareas** por hacer." (si n=0: "Estás al día. Mile te avisa si llega algo nuevo."). Debajo, dentro de la misma tarjeta, las 3 métricas en fila (cajas `--papel`, radio 14): **{ganado} USDC ganados** (lima) · **{revisión} en revisión** · **{n} por hacer**. Nombre: leer `usuarios.nombre` en el server component de la página (vía `exigirPagina()` → sesión → almacén) y pasarlo como prop; si no hay nombre o es igual al correo: "¡Hola!".
3. **Filtro segmentado** (grid de 4, alto 52, radio 16, fondo `--papel`, activo `--superficie-2` blanco/navy): número arriba (16px/600) y etiqueta abajo (11.5px): **Todas · Pendientes · Enviadas · Hechas** (mapea a `all | pendiente | en revisión | pagado`; los textos visibles cambian, los valores no). El orden (prioridad/mayor/defecto) pasa a un botón "Ordenar ▾" chico a la derecha del título de grupo (menú simple), conservando la lógica.
4. **Lista por evento** (título de grupo 13px/600 `--suave` si hay >1 evento). Tarjeta de tarea (radio 20, padding 14/16):
   - Fila 1: badge de estado (Pendiente ámbar / Enviada lavanda / Pagada lima / *Rechazada rosa → PARTE 3*) a la izquierda; monto a la derecha ("20 USDC"; reembolso "hasta 15 USDC" como hoy con `montoDeTarea`).
   - Título 16–17px/600, 2 líneas máx.
   - Meta (13px `--suave`): tipo (Trabajo/Reembolso); hora límite **solo si existe** `venceEn` (campo nuevo opcional, ver §9) con ícono reloj: "Vence hoy, 4:00 p. m." / "Vence {día}, {hora}".
   - Insignias de prioridad/dificultad y "Mejor pagada" como hoy.
   - **La primera tarea pendiente va abierta** (borde `rgba(183,238,52,.28)`, `--card-bg`): muestra `condicion` (13.5px `--suave`, 3 líneas), aviso con cara de Mile 28px: "**Mile revisa {n} puntos** de tu foto antes de enviarla al organizador." (n = puntos de la condición, §6.2; si 1: "Mile revisa tu foto antes de…") y botón primario a todo el ancho **"Subir evidencia"** (ícono cámara) → `/tareas/[id]`.
   - Enviada: nota lavanda con cara de Mile: "Mile está revisando tu foto" (si no hay nota aún) o la pastilla `PastillaVeredicto` (nota + banda) si ya hay `nota`. Botón fantasma "Ver".
   - Pagada: nota lima con `cara-feliz`: "Pagada · {monto} en tu billetera". Botón fantasma "Ver".
5. Nav inferior (§4).

### 5.3 Layout escritorio
Barra lateral + contenido. Fila de título: "Mis tareas" (32px) + subtítulo a la izquierda; a la derecha las 3 métricas (26px). Debajo, 2 columnas: **izquierda (≈ 64%)** filtros como pestañas (`hyto-tabs`, ya existen) + lista; **derecha (≈ 36%)** panel de Mile `descansando` 180px con saludo y "Cómo funciona" en 3 pasos (mismo texto del vacío). Ver `ref/base-01-mis-tareas-desktop-dark.webp`.

### 5.4 Estados
- **Cargando:** skeleton fiel al layout (bloques `--superficie-3`, radio igual a lo real) + Mile `icono` 56px con "Mile está trayendo tus tareas…" (`ref/base-08-*`). Reemplaza el texto "Loading…".
- **Vacío** (`ref/base-01b-*`): tarjeta con Mile `icono` 120px, "Aún no tienes tareas", "Únete a un evento con el código que te dio el organizador y tus tareas aparecen aquí.", primario **"Unirme con código"** (`/join`), fantasma "Ver eventos" (`/eventos`), y bloque "Cómo funciona": 1 "Te unes al evento con el código del organizador." 2 "Haces la tarea y subes una foto." 3 "Mile la revisa, el organizador aprueba y te pagan en USDC."
- **Error:** tarjeta con Mile `rechazado` 96px + mensaje (`claro(error)`) + "Intentar de nuevo".
- **Filtro sin resultados** (UX #052, media; hoy dice solo "Nothing in this view."): componente `EstadoVacio` con explicación + próxima acción, por filtro: Pendientes → "No tienes tareas pendientes. ¡Todo enviado!" + "Ver enviadas"; Enviadas → "No hay fotos esperando revisión." + "Ver pendientes"; Hechas → "Todavía no te han pagado ninguna tarea. Cuando el organizador apruebe una foto, aparece aquí." + "Ver pendientes". `EstadoVacio` (Mile `icono` 56px + título + texto + 1 botón) queda en `components/ui/` para que Eventos/organizador lo reusen.
- **Skeletons** (UX #052, media): componente `Skeleton` (bloques `--superficie-3`, sin animación) reutilizable. Regla general: al cambiar filtro/pestaña o recargar, mostrar skeleton o mantener el contenido anterior atenuado; **nunca** mostrar contenido viejo de otra pestaña ni un vacío falso mientras carga (vale también para las pestañas Tasks/Report del organizador cuando se rediseñen).

### 5.4b Confirmación de acciones de dinero — `ConfirmDialog` (UX #052, alta)
"Lock budget" y las demás acciones de dinero (aprobar y pagar, fondear, crear/borrar invitaciones) hoy se ejecutan sin confirmación. Esas pantallas son del organizador y su rediseño está **fuera de alcance** (§8.2), pero el componente compartido se construye en la PARTE 1 y se conecta donde ya existen los botones sin tocar la lógica de firma/pago:
- `components/ui/ConfirmDialog.tsx`: `<dialog>` nativo modal (en móvil hoja inferior, en escritorio centrado 440px, radio 24, `--card-bg`), foco atrapado, `Esc`/✕/fondo cierran = cancelar, foco vuelve al botón que lo abrió, `aria-labelledby`/`aria-describedby`.
- Props: `titulo`, `monto?` (se muestra grande: "20.00 USDC"), `destinatario?` (nombre + dirección corta con `acortarDireccion`), `detalle?`, `irreversible?: boolean` (muestra aviso con punto rosa: "Esta acción no se puede deshacer." / "This can't be undone."), `confirmar` (texto del botón, p. ej. "Bloquear 75 USDC"), `peligro?` (botón rosa en vez de lima), `onConfirmar(): Promise<void>` (muestra "…" y deshabilita mientras corre; si falla, el error se ve dentro del diálogo).
- Botones: Cancelar (fantasma, a la izquierda/arriba en móvil) y Confirmar (primario). Nunca confirmar con `Enter` por defecto en acciones irreversibles.
- Conectar en PARTE 1 (solo envolver el `onClick` existente): bloquear/fondear presupuesto y "Aprobar y pagar" en `components/admin/Revision.tsx`, y crear código / invitar por email en la cabecera del evento (agregar ahí también "quién obtiene acceso" y botón de cerrar, UX #052 media). Tests: abre, cancela sin llamar, confirma llama una vez.

### 5.5 Copy nuevo (en / es)
| Clave sugerida | en | es |
|---|---|---|
| `tareas.hello` | Hi, {name}! | ¡Hola, {name}! |
| `tareas.helloNoName` | Hi! | ¡Hola! |
| `tareas.youHave` | You have {n} tasks to do. | Tienes {n} tareas por hacer. |
| `tareas.allDone` | You're all caught up. Mile will tell you when something new arrives. | Estás al día. Mile te avisa si llega algo nuevo. |
| `tareas.filterPending/Sent/Done` | Pending / Sent / Done | Pendientes / Enviadas / Hechas |
| `tareas.mileChecks` | Mile checks {n} points in your photo before it goes to the organizer. | Mile revisa {n} puntos de tu foto antes de enviarla al organizador. |
| `tareas.mileReviewing` | Mile is checking your photo | Mile está revisando tu foto |
| `tareas.paidNote` | Paid · {amount} in your wallet | Pagada · {amount} en tu billetera |
| `tareas.due` | Due {when} | Vence {when} |
| `tareas.loadingMile` | Mile is bringing your tasks… | Mile está trayendo tus tareas… |
| `tareas.emptyTitle` (reescribir) | No tasks yet | Aún no tienes tareas |
| `tareas.howItWorks` + 3 pasos | How it works … | Cómo funciona … |

### 5.6 Hecho cuando
Shell nuevo en claro y oscuro (móvil y escritorio) para todas las rutas que usan `Marco`, sin contenido tapado por la nav en 400px, con Volver/Cancelar en `/join` y `/revision/[id]`, estado activo correcto en `/join` y Crear/Unirme arriba del fold en `/eventos`; `ConfirmDialog` conectado a las acciones de dinero e invitación; `<Mile>` con los 7 estados y test simple (renderiza `img` con `src` correcto por estado/tema); Mis tareas igual a las referencias con datos reales y de demo; tests verdes; capturas claro/oscuro móvil/escritorio en el PR.

## 6. PARTE 2 — Detalle de tarea + subir evidencia + revisando (Mile Buscando)

**Rutas/archivos:** `app/(integrante)/tareas/[id]/page.tsx` (sin cambios de lógica: `exigirTarea(id)`), `components/integrante/SubirEvidencia.tsx` (se rediseña; conviene partirlo en subcomponentes `Visor`, `Checklist`, `PanelMile`, `CtaEvidencia` dentro de `components/integrante/evidencia/`), `lib/integrante/puntos.ts` (nuevo, §6.2), `lib/ui/diccionario.ts`.
**Referencias:** `ref/base-02-subir-evidencia-camara-*`, `ref/base-02b-subir-evidencia-capturada-*`, `ref/mile-02-subir-evidencia-elegir-archivo-desktop-{dark,light}.webp`, `ref/mile-02-revisando-mile-pensando-mobile-{dark,light}.webp`, `ref/mile-02r-revisando-mile-pensando-desktop-dark.webp`, `ref/base-03-enviada-timeline-*`.

### 6.1 Lógica que se conserva (SubirEvidencia.tsx) — NO tocar
- Fases `cargando | inicio | camara | foto | enviando | lista | faltante` y su máquina de estados.
- Carga con `leerTarea(...)` (+ memoria demo `leerMemoria()`), nombre de evento con `/api/proyectos`.
- **Antifraude de trabajo (`tipo === "trabajo"`):** solo JPEG de cámara; `pedirTokenEvidencia(tarea.id)` antes de subir; `capturadaEn`; ventana de **3 minutos** (`EDAD_MAXIMA_MS` en `lib/integrante/fotoEnVivo.ts`, `TOLERANCIA_FRESCURA_MS` en `lib/evidencia/frescura.ts`); `esFotoDeCamara`, `archivoDeCamaraReciente`; `getUserMedia` con `facingMode: environment`, y fallback `<input capture="environment">` cuando no hay `getUserMedia`. **La galería no se acepta para trabajo.**
- **Reembolso (`tipo === "reembolso"`):** PDF/JPEG/PNG/WebP (`archivoPermitido`), arrastrar y soltar, sin token. Muestra monto/fecha leídos si vienen.
- `subirEvidencia(...)` con errores `ErrorDeSesion`/`ErrorDeEnvio` y `aviso` del servidor mostrado con `claro()`; `enviandoRef` contra doble envío; revocar `ObjectURL`s; detener pistas de la cámara al desmontar.
- Después de enviar: `leerTarea` fresco; si la tarea ya no está pendiente, la vista es "lista".
- Tests: `lib/integrante/subirEvidencia.test.ts`, `nota-voluntario.test.ts`, `fotoEnVivo.test.ts`, `lib/evidencia/*.test.ts`.

### 6.2 Checklist "Tu foto debe mostrar" (solo presentación)
La tarea tiene **un solo texto** `condicion`. Nuevo helper puro `puntosDeCondicion(condicion: string): string[]` en `lib/integrante/puntos.ts`: separa por saltos de línea, viñetas (`•`, `-`, `·`), `;` y numeración `1.`/`1)`; recorta; descarta vacíos; máximo 5. Si queda 1 elemento, se muestra como un solo punto. Con test. **No hay resultado por punto desde la IA:** en PARTE 2 los puntos se muestran numerados (1, 2, 3) sin ✓/✗ propios. (El ✓/✗ por punto lo trae la PARTE 3 desde el organizador.)

### 6.3 Pantalla "Subir evidencia" — móvil (trabajo)
- Header foco: "‹" · eyebrow "Subir evidencia" · título de la tarea · chip "20 USDC".
- **Tarjeta Mile** arriba (Mile `descansando` 120px + eyebrow "HOLA, SOY MILE" + "Antes de enviarla, yo reviso tu foto" + "Así llega completa al organizador y te pagan más rápido.").
- **Visor** (radio 20, 4:5): fase `inicio` → "Cámara apagada. Actívala para tomar la foto." + botón fantasma "Abrir cámara"; fase `camara` → `<video>`; fase `foto` → la foto + pill "1 foto" arriba a la izquierda + botón "Tomar otra" abajo a la derecha (sobre la foto).
- Debajo del visor (solo reembolso): "Elegir archivo (PDF o foto)". **Para trabajo no se muestra "Elegir de galería"** (la maqueta lo muestra, pero choca con el antifraude: se reemplaza por la pista "Tómala ahora con la cámara: no se aceptan fotos viejas de la galería.").
- **Checklist** "Tu foto debe mostrar" con los puntos (§6.2).
- **CTA fijo abajo** (botón grande 52px): fase `inicio` → **"Abrir cámara"** (primario); `camara` → **"Tomar foto"**; `foto` → **"Enviar evidencia"**; `enviando` → "Enviando…" deshabilitado con `aria-busy`. Pista debajo 12.5px `--tenue`: `inicio` "Primero toma la foto".

### 6.4 Pantalla "Subir evidencia" — escritorio
Referencia exacta: `ref/mile-02-subir-evidencia-elegir-archivo-desktop-{light,dark}.webp`.
- Migas "‹ Mis tareas"; título 32px; meta "Evento · Vence…" (si hay `venceEn`); chip monto a la derecha.
- **Izquierda:** zona de soltar (borde 1.5px discontinuo `--borde`, radio 20, alto ≈ 490px): ícono subir en círculo lima suave, "Sube la foto de tu tarea", "Arrástrala aquí o búscala en tu computadora. JPG o PNG, hasta 10 MB." (reembolso: "PDF, JPG, PNG o WebP"), **botón primario grande "Elegir archivo"** (decisión de producto) y debajo fantasma "Usar cámara" (abre `getUserMedia` como hoy). Con foto elegida: la foto llena el panel + pill con nombre de archivo + "Elegir otro archivo".
- **Derecha:** panel Mile (`descansando` 180px, halo lima) + eyebrow + "Antes de enviarla, yo reviso tu foto" + checklist + CTA **"Enviar evidencia"** (deshabilitado hasta tener archivo, pista "Primero elige tu foto").
- **Trabajo en escritorio con "Elegir archivo":** se permite elegir archivo **pero se aplican las mismas reglas** que a la captura móvil (`esFotoDeCamara` + `archivoDeCamaraReciente`, y el servidor valida EXIF/`capturadaEn` dentro de 3 min con token). Hoy `elegirArchivo` ignora trabajo: la PARTE 2 hace que en trabajo el input de archivo (sin `capture`) pase por la validación de `elegirCaptura`. Pista visible bajo el botón para trabajo: "Usa una foto que tomaste hace menos de 3 minutos." Si falla: mensaje existente "Take the photo now…" (traducido) y sugerencia "Usar cámara". **No se relaja ninguna validación del servidor.**

### 6.5 Estado "Revisando" (Mile Buscando)
Realidad del backend: la revisión de la IA ocurre **después** de subir (`POST /api/evidencias` pone la tarea en `en revisión` y corre `revisar()`; espera hasta ~2.8 s y si no termina guarda el veredicto después). La maqueta muestra "Revisando · 2 de 3" con progreso por punto: **ese progreso no existe; no inventarlo.**
- Al tocar "Enviar evidencia" (fase `enviando`) y mientras `tarea.estado === "en revisión"` y `nota == null`: mostrar la **pantalla Revisando** (`ref/mile-02-revisando-mile-pensando-mobile-*.webp`): tarjeta Mile `buscando` (140px móvil / 200px escritorio, halo lavanda, borde `rgba(140,150,255,.3)`), badge lavanda "Revisando", h2 **"Mile está revisando tu foto"**, texto "Tarda unos segundos. Puedes esperar aquí." Debajo la foto (pill "1 foto") y la checklist con cada punto en estado neutro (spinner lavanda chico en todos, sin ✓). CTA inferior deshabilitado "Enviada" con pista "Te avisamos cuando el organizador decida."
- **Polling** sin cambiar la API: re-llamar `leerTarea` cada 3 s hasta 30 s (o hasta que llegue `nota` o cambie `estado`). Al llegar la nota o al agotar el tiempo → vista "Enviada" (6.6). Cancelar el intervalo al desmontar.
- Revisión fallida de la IA (`origen: "error"`, el miembro ve `nota: null`): no mostrar error al voluntario; pasa igual a "Enviada" (el organizador decide).

### 6.6 Vista "Enviada" con línea de tiempo (cierra PARTE 2; la PARTE 3 le agrega rechazada/pagada)
Referencia `ref/base-03-enviada-timeline-*`. Mile `cara-feliz`/check lima arriba, **"¡Buen trabajo{, nombre}! Tu foto llegó"**, "Te avisamos apenas el organizador la apruebe." Tarjeta resumen: miniatura, badge "En revisión", título, "{evento} · enviada {hora}", monto; si hay nota: `PastillaVeredicto` + "El organizador decide el pago." (`evidencia.organizerCall`). **Línea de tiempo "Qué pasa ahora"** (3 pasos, componente `LineaRevision` nuevo, ver §7.4): 1 Mile revisa tu foto (✓ si hay nota o revisión fallida) · 2 El organizador aprueba (**Ahora**) · 3 Te pagan ({monto} a tu billetera). Primario único "Volver a mis tareas". Se mantiene el aviso `avisoEnvio` (rosa) si el servidor devolvió un aviso al subir.

### 6.7 Copy nuevo (en / es)
| en | es |
|---|---|
| Upload evidence | Subir evidencia |
| HI, I'M MILE · Before you send it, I check your photo · That way it reaches the organizer complete and you get paid faster. | HOLA, SOY MILE · Antes de enviarla, yo reviso tu foto · Así llega completa al organizador y te pagan más rápido. |
| Your photo must show | Tu foto debe mostrar |
| Camera off. Turn it on to take the photo. | Cámara apagada. Actívala para tomar la foto. |
| Take it now with the camera: old gallery photos are not accepted. | Tómala ahora con la cámara: no se aceptan fotos viejas de la galería. |
| Upload your task photo · Drag it here or find it on your computer. | Sube la foto de tu tarea · Arrástrala aquí o búscala en tu computadora. |
| Choose file · Choose another file · Use camera | Elegir archivo · Elegir otro archivo · Usar cámara |
| Use a photo you took less than 3 minutes ago. | Usa una foto que tomaste hace menos de 3 minutos. |
| Send evidence · Sending… · Take the photo first · Choose your photo first | Enviar evidencia · Enviando… · Primero toma la foto · Primero elige tu foto |
| Checking · Mile is checking your photo · It takes a few seconds. You can wait here. | Revisando · Mile está revisando tu foto · Tarda unos segundos. Puedes esperar aquí. |
| Great job{, name}! Your photo arrived · We'll let you know as soon as the organizer approves it. | ¡Buen trabajo{, name}! Tu foto llegó · Te avisamos apenas el organizador la apruebe. |
| What happens now · Mile checks your photo · The organizer approves · You get paid · Now | Qué pasa ahora · Mile revisa tu foto · El organizador aprueba · Te pagan · Ahora |
| Back to my tasks | Volver a mis tareas |

### 6.8 Hecho cuando
Móvil (cámara) y escritorio ("Elegir archivo" grande) funcionan para trabajo y reembolso con las mismas validaciones de hoy; Revisando con Mile `buscando` y polling; Enviada con línea de tiempo; claro/oscuro; tests nuevos para `puntosDeCondicion` y para que trabajo en escritorio rechace un archivo viejo/no JPEG; tests existentes verdes.

## 7. PARTE 3 — Rechazada + reintento con feedback + pagada "¡La tengo!" + línea de tiempo de revisión

**Rutas/archivos:** `components/integrante/SubirEvidencia.tsx` (o subcomponentes de PARTE 2), `components/integrante/MisTareas.tsx` (badge Rechazada), `components/integrante/evidencia/LineaRevision.tsx`, `components/admin/Revision.tsx` (campo de nota y puntos al pedir otra foto), `app/api/revision/[id]/pedir/route.ts` + `lib/api/pedir.ts`, `lib/api/tareas.ts` (`tareaPublica`/`tareaConNota`), `lib/integrante/tipos.ts` + parser en `lib/integrante/rutas.ts`, `lib/api/evidencias.ts` (plazo), migración `drizzle/0007_rechazo_plazo.sql` + `lib/db/schema.ts`, `lib/db/tipos.ts`, `lib/db/memoria.ts`, `lib/db/neon.ts`, `lib/db/almacen.ts` (`CambioTarea`), inventario de esquema (`lib/db/esquema-migracion*.ts`, `scripts/backend-traspaso/esquema-inventario.json`; correr sus tests), `lib/ui/diccionario.ts`.
**Referencias:** `ref/mile-03-rechazada-mile-rechazo-{mobile,desktop}-dark.webp`, `ref/mile-04-pagada-mile-feliz-mobile-dark.webp`, `ref/base-04-pago-exitoso-*`, `ref/base-03-enviada-timeline-*`, `ref/base-06-evento-detalle-organizador-*` (cómo decide el organizador).

### 7.1 Cómo funciona hoy (se conserva)
- El organizador en `/revision/[id]` (`components/admin/Revision.tsx`) **aprueba y paga** (`decidir("pagado")`, firma) o **"Pedir otra foto"** → `POST /api/revision/[id]/pedir` → `pedirOtraFotoHttp` pone la tarea en `pendiente` (409 si ya está pagada). Tras eso el veredicto viejo se oculta al organizador (`veredictoVigente`).
- **No existe estado "rechazada" en la base ni nota del organizador ni plazo.** Lo que sigue es lo mínimo que hay que agregar, todo **aditivo y nullable**:

### 7.2 Datos nuevos (mínimos)
1. Migración `0007_rechazo_plazo.sql`: `ALTER TABLE tareas ADD COLUMN rechazo text;` y `ALTER TABLE tareas ADD COLUMN vence_en text;` (ISO 8601 con zona). Reflejar en schema/tipos/memoria/neon/inventario.
2. `rechazo` guarda JSON `{ "nota": string|null, "fallidos": number[], "en": ISO }` (índices de `puntosDeCondicion`). Se escribe en `pedirOtraFotoHttp` con el body opcional `{ nota?: string (máx 280, sin HTML), fallidos?: number[] }` del organizador; se borra (`null`) cuando llega una evidencia nueva (en `POST /api/evidencias`, junto al cambio a `en revisión`) y cuando la tarea se paga.
3. `vence_en`: lo pone el organizador al crear/editar la tarea (`/eventos/[id]/tareas`, `lib/api/editar-tarea.ts`; campo fecha+hora opcional). Si es `null`, no hay plazo y se ocultan todas las líneas de "Vence…".
4. API del miembro (`tareaConNota` en `lib/api/tareas.ts`, solo `alcance=mias`) agrega: `rechazada: boolean` (= `estado === "pendiente"` y `rechazo != null`), `rechazo: { nota, fallidos, en } | null`, `venceEn: string | null`, `intentos: number` (cantidad de evidencias de la tarea; agregar `contarEvidencias(tareaId)` al almacén), `ultimaEvidenciaId: string | null`, `organizador: { nombre } | null` (nombre de `proyectos.organizador_id` → `usuarios.nombre`; solo el nombre), y `hashPago` en el tipo `Tarea` del cliente (ya viaja en `tareaPublica`). **No exponer** `texto_scout`, `frase`, `choice`, etiquetas internas ni el contrato.
5. **Plazo en el servidor:** en `POST /api/evidencias`, si `venceEn` existe y ya pasó → `409 { aviso: "The deadline for this task has passed." }` (con test). Mientras no pase el plazo, se puede reintentar sin límite.
6. `// TODO(intentos): el límite de intentos no está decidido. Hoy se reintenta hasta vence_en. Cuando se decida, validar aquí y en la UI (mostrar "Te quedan N intentos").` — dejar este TODO en `lib/api/evidencias.ts` y en el componente de rechazada. **No implementar límite.**
7. Organizador (`Revision.tsx`): al tocar "Pedir otra foto" se abre una hoja/inline con los puntos de `puntosDeCondicion` como casillas ("¿Qué falta?") y un campo de nota opcional ("Mensaje para {miembro}", 280 máx), y el botón confirma la acción existente. Sin cambiar aprobar/pagar.

### 7.3 Pantalla "Tarea rechazada" (reintento con feedback)
Se muestra en `/tareas/[id]` cuando `tarea.rechazada`. En Mis tareas la tarjeta lleva badge rosa **"Rechazada"**, cuenta dentro de "Pendientes" y su botón primario dice **"Tomar otra foto"** (escritorio: "Elegir otro archivo").
**Móvil** (`ref/mile-03-rechazada-mile-rechazo-mobile-dark.webp`):
- Header foco: "‹" · eyebrow "Tarea rechazada" · título · chip monto.
- **Tarjeta Mile** (borde `rgba(255,92,150,.4)`): Mile `rechazado` 140px, badge rosa "Rechazada", h2 con el **primer punto fallido**: "Falta: {punto}" (si no hay `fallidos`: "El organizador pidió otra foto"), texto: "Toma otra foto con todo lo que se pide dentro del cuadro." (si hay puntos que pasaron: "Lo demás ya está bien.").
- **"Así quedó tu foto"**: la checklist con ✓ lima para los que pasaron y ✗ rosa (fondo `--rej-bg`, borde rosa) para los fallidos, con subtexto "No aparece en la foto". Si no hay `fallidos` (rechazo viejo o sin marcar), mostrar la lista neutra sin ✓/✗.
- **Nota del organizador** (si existe): tarjeta con iniciales en círculo, "{nombre} · organizador" (12.5px `--suave`) y la nota entre comillas (14px). Si no hay nota, no se muestra la tarjeta.
- **CTA fijo grande "Tomar otra foto"** (primario, ícono cámara) → vuelve a la fase `inicio` de la PARTE 2 (`tomarOtra()` existente) con la checklist marcando lo que faltó. Debajo: "Puedes enviarla hasta {hoy, 4:00 p. m.}" (si hay `venceEn`). Para reembolso agregar "· Elegir archivo"; **para trabajo no hay "Elegir de galería"** (antifraude; la maqueta lo muestra, se omite).
**Escritorio** (`ref/mile-03-rechazada-mile-rechazo-desktop-dark.webp`): izquierda la foto enviada (`GET /api/evidencias/[id]/foto`; el miembro ya puede verla porque `accesoEvidencia` usa `puedeVerTarea`, pero necesita el id: agregar `ultimaEvidenciaId` en §7.2.4; si falla, placeholder) con pill "Foto enviada · {hora}" y debajo la nota del organizador; derecha panel con Mile `rechazado` 180px, badge, h2, texto, "Así quedó tu foto", **primario "Elegir otro archivo"**, fantasma "Usar cámara", "Puedes enviarla hasta …". (La marca circular "Aquí debería verse tu pulsera" de la maqueta **no** se implementa: no hay coordenadas.)
**Plazo vencido** (`venceEn` pasado): Mile `rechazado`, h2 "Se cerró el plazo de esta tarea", texto "Habla con el organizador si necesitas más tiempo.", CTA deshabilitado. Sin reintento.
**Después de reenviar:** flujo Revisando → Enviada de la PARTE 2. En la línea de tiempo, el paso 1 muestra "Intento {intentos}" si `intentos > 1`.

### 7.4 Línea de tiempo de revisión (`LineaRevision`)
Componente único usado en Enviada, Rechazada (resumen arriba de la checklist en escritorio) y Pagada. Lista vertical (`.stepper`/`.step` de `mockups/app.css`: columna 36px con círculo + línea 2px `--linea`). Pasos y estado (derivado solo de datos del miembro, sin firma ni contrato):
| Paso | done | now | later |
|---|---|---|---|
| 1 Mile revisa tu foto | hay evidencia y (`nota != null` o pasaron 30 s) — subtexto: `PastillaVeredicto` si hay nota | en revisión sin nota (cara Mile `buscando` 28px) | sin evidencia |
| 2 El organizador aprueba ("{nombre} decide") | `estado === "pagado"` | en revisión | pendiente |
| 2' Pidió otra foto (rosa ✗) | — | `rechazada` (reemplaza al paso 2; subtexto: la nota abreviada) | — |
| 3 Te pagan ({monto} a tu billetera) | `pagado` | — | resto |
Paso actual con chip "Ahora" (lavanda) y texto 600.

### 7.5 Pantalla "Pagada" — ¡La tengo!
Se muestra en `/tareas/[id]` cuando `estado === "pagado"` (y como pantalla completa la primera vez que el miembro la abre después del pago: guardar `hyto-pago-visto:{id}` en `localStorage`; las siguientes veces, vista resumen con la línea de tiempo completa).
**Móvil** (`ref/mile-04-pagada-mile-feliz-mobile-dark.webp`; fondo normal, **no** la pantalla lima completa de `base-04`): botón cerrar "✕" arriba a la derecha (→ `/mis-tareas`); Mile **`la-tengo`** 180–200px con halo lima fuerte; burbuja (pill `--papel`, 14px): "¡Lo lograste! {organizador} aprobó tu foto." (sin nombre: "¡Lo lograste! Aprobaron tu foto."); "Te pagaron" (15px `--suave`); monto héroe **"+{monto} USDC"** (lima, 64px); "Por «{título}». Ya está en tu billetera."; recibo en tarjeta: **"Pago de la tarea — {monto} USDC"** y **"Recibiste — {monto} USDC"** (lima). **No mostrar "Comisión de envío −0.03"**: es dato de ejemplo; la comisión de plataforma es 0. `// TODO(comision): mostrar línea de comisión solo si el backend expone un monto real.` Si hay `hashPago`: enlace chico "Ver comprobante" con `enlacePago(hashPago)` (`lib/admin/vista.ts`) — el texto **no** menciona la red. Primario **"Ver mi billetera"** (`/cuentas`), fantasma "Seguir con mis tareas" (`/mis-tareas`).
**Escritorio:** misma composición centrada en una tarjeta de 560px, Mile 220px.
Reembolso: el monto mostrado es el confirmado/pagado si viene; si no, `montoDeTarea`.

### 7.6 Copy nuevo (en / es)
| en | es |
|---|---|
| Rejected · Task rejected | Rechazada · Tarea rechazada |
| Missing: {point} · The organizer asked for another photo | Falta: {point} · El organizador pidió otra foto |
| Take another photo with everything that's asked inside the frame. · Everything else is fine. | Toma otra foto con todo lo que se pide dentro del cuadro. · Lo demás ya está bien. |
| How your photo turned out · Not in the photo | Así quedó tu foto · No aparece en la foto |
| {name} · organizer | {name} · organizador |
| Take another photo · Choose another file | Tomar otra foto · Elegir otro archivo |
| You can send it until {when} | Puedes enviarla hasta {when} |
| The deadline for this task has passed · Talk to the organizer if you need more time. | Se cerró el plazo de esta tarea · Habla con el organizador si necesitas más tiempo. |
| Asked for another photo · Attempt {n} | Pidió otra foto · Intento {n} |
| You did it! {name} approved your photo. | ¡Lo lograste! {name} aprobó tu foto. |
| You got paid · For "{title}". It's already in your wallet. | Te pagaron · Por «{title}». Ya está en tu billetera. |
| Task payment · You received · View receipt | Pago de la tarea · Recibiste · Ver comprobante |
| View my wallet · Keep going with my tasks | Ver mi billetera · Seguir con mis tareas |
| (organizador) What's missing? · Message for {name} (optional) | ¿Qué falta? · Mensaje para {name} (opcional) |

### 7.7 Hecho cuando
Organizador puede marcar puntos + nota al pedir otra foto; el miembro ve Rechazada con ✓/✗, nota y "Tomar otra foto" hasta el plazo; servidor rechaza evidencias después de `vence_en`; Pagada con Mile `la-tengo`; `LineaRevision` en Enviada/Rechazada/Pagada; migración aplicada en memoria y Neon y tests del inventario de esquema verdes; tests nuevos para `rechazada`/`intentos`/plazo/limpieza de `rechazo`; claro/oscuro.

## 8. Mapa maqueta → ruta/componente real

### 8.1 Pantallas del voluntario (en alcance)
| Maqueta (`ref/`) | Ruta | Componente actual | Parte |
|---|---|---|---|
| shell: header/nav móvil, barra lateral escritorio | todas | `components/admin/Marco.tsx` (+ `Logo`, `Tema` en `components/ui/Marca.tsx`, `SelectorIdioma` en `components/ui/Idioma.tsx`) | 1 |
| `base-01-mis-tareas-*`, `mile-01-inicio-mile-saluda-*`, `mile-01t-tour-*` (tour: fuera de alcance, ver §9) | `/mis-tareas` | `app/(integrante)/mis-tareas/page.tsx` → `components/integrante/MisTareas.tsx`, `EstadoTarea.tsx` | 1 |
| `base-01b-mis-tareas-vacio-*` | `/mis-tareas` (0 tareas) | `MisTareas.tsx` (rama vacía) | 1 |
| `base-08-cargando-skeleton-*` | `/mis-tareas` (cargando), `app/loading.tsx` | `MisTareas.tsx` (rama `!lista`) | 1 |
| Mile (todos los estados) | — | nuevo `components/ui/Mile.tsx` + `public/mile/` | 1 |
| `base-02-subir-evidencia-camara-*`, `base-02b-*-capturada-*`, `mile-02-subir-evidencia-elegir-archivo-desktop-*` | `/tareas/[id]` (pendiente) | `app/(integrante)/tareas/[id]/page.tsx` → `components/integrante/SubirEvidencia.tsx`, `BotonPrincipal.tsx` | 2 |
| `mile-02-revisando-*`, `mile-02r-revisando-*` | `/tareas/[id]` (enviando / en revisión sin nota) | `SubirEvidencia.tsx` (fases `enviando`/`lista`) | 2 |
| `base-03-enviada-timeline-*` | `/tareas/[id]` (en revisión) | `SubirEvidencia.tsx` (rama `enviada`) + `PastillaVeredicto` (`components/admin/PastillaVeredicto.tsx`) | 2 (+3 timeline) |
| `mile-03-rechazada-*` | `/tareas/[id]` (pendiente + `rechazo`) | nuevo dentro de `SubirEvidencia`/`evidencia/` | 3 |
| `mile-04-pagada-mile-feliz-*`, `base-04-pago-exitoso-*` | `/tareas/[id]` (pagado) | `SubirEvidencia.tsx` (rama `cerrada`) | 3 |
| Organizador: pedir otra foto con nota | `/revision/[id]` | `components/admin/Revision.tsx`, `app/api/revision/[id]/pedir/route.ts`, `lib/api/pedir.ts` | 3 |

### 8.2 Fuera de alcance de estas 3 partes (solo heredan el shell y los tokens)
| Maqueta | Ruta | Componente | Lógica a conservar cuando se rediseñe |
|---|---|---|---|
| `base-05-eventos-*` | `/eventos` | `components/admin/ListaEventos.tsx` | `/api/proyectos`, rol por evento, crear evento (requiere saldo), unirme con código, aviso de modo demo. *(PARTE 1 ya sube Crear/Unirme y hace colapsable la bienvenida, §4)* |
| `base-06-evento-detalle-organizador-*` | `/eventos/[id]`, `/revision/[id]` | `CabeceraEvento`, `Bandeja`, `TareasEvento`, `Revision`, `Informe` | presupuesto, bandeja, novedades (`usarNovedades`), aprobar y pagar con firma, reintentos de fondeo. *(PARTE 1 ya conecta `ConfirmDialog` y Volver en `/revision`)* |
| `base-07-cuenta-billetera-*` | `/cuentas`, `/cuentas/preparar` | `PanelCuenta.tsx`, `Salir`, `InsigniaDemo`, `PrepararUsdc` | `/api/cuenta`, copiar dirección, preparar USDC, demo |
| Unirme | `/join`, `/join/[secreto]` | `components/admin/Unirse.tsx` | canje de código/invitación, límites |

### 8.3 Copy existente que hay que reescribir porque aparece en pantallas tocadas
- `evidencia.organizerApproves` — en: "The organizer approves, then the payment leaves the escrow." → "The organizer approves, then you get paid." / es: "El organizador aprueba y luego te pagan."
- `cuenta.testnetUsdc`, `cuenta.addWallet`, `cuenta.viewTestnet` (pantalla Cuenta, enlazada desde Pagada): cambiar a "USDC" / "Agrega una billetera para ver tu USDC." / "Ver en el explorador" (y en). Agregar un test tipo `JERGA` (como en `lib/ui/discurso.test.ts`) que recorra **las claves de `tareas`, `evidencia`, `nav`, `mile` y las nuevas** y falle si aparece `escrow|testnet|trustline|xdr|soroban|friendbot|mainnet`.

## 9. Huecos conocidos (no inventar; TODO visibles)
- **Límite de intentos:** sin decidir → `TODO(intentos)` (§7.2.6). Se reintenta hasta `vence_en`.
- **Fecha/hora límite:** no existía; la agrega la PARTE 3 (`vence_en`). PARTES 1–2 tipan `venceEn?: string | null` y solo lo muestran si viene.
- **Ubicación ("Sector norte") y fecha del evento ("sáb 3 oct"):** no existen en la base. No mostrar.
- **Progreso por punto de la IA ("Revisando · 2 de 3", "Mile ve los 3 puntos"):** la IA devuelve una nota 0–100, no puntos. No mostrar progreso por punto; ✓/✗ por punto solo desde el organizador (PARTE 3).
- **Comisión 0.03 USDC del recibo:** ejemplo. No mostrar.
- **Tour de primer uso (`mile-01t-tour-*`)** y **"Cambiar evento"**: fuera de alcance.
- **"Elegir de galería" para trabajo:** choca con el antifraude (solo cámara, 3 min). Omitido; confirmar con Abdiel si quiere otra salida para "sin señal".
- **Pose `rechazado` de Mile:** propuesta (§3.1).
- **Organizador "+ Crear evento" desde el "+" de la nav:** hoy el "+" va a Unirme; si hace falta, hoja de acciones en otra parte.

## 10. Cómo arrancar cada parte (prompt para la sesión de Claude Code)
> Lee `AGENTS.md` y `docs/rediseno/SPEC.md` completo. Trabaja desde la rama `abdiel/rediseno-app` (si no existe, créala desde `abdiel/sin-landing` y agrega ahí `docs/rediseno/SPEC.md` y los SVG de Mile del issue), crea `abdiel/rediseno-parte-N` y abre un PR **draft** contra `abdiel/rediseno-app` (no contra `main`). Implementa solo la **PARTE N** (§5, §6 o §7) respetando §0, los tokens de §2 y el componente Mile de §3. Usa las imágenes de `docs/rediseno/ref/` como referencia visual y los SVG de `docs/rediseno/mile/`. Conserva toda la lógica listada en "Lógica que se conserva". Sin animaciones. Corre `npm test` y `npx tsc --noEmit`. Adjunta capturas móvil y escritorio, claro y oscuro.

Orden: PARTE 1 → PARTE 2 → PARTE 3 (la 2 usa `<Mile>` y tokens de la 1; la 3 usa `puntosDeCondicion` y `LineaRevision`/vistas de la 2).
