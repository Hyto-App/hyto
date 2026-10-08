# Marca Hyto: archivos oficiales

Fuente de verdad de la identidad visual. Esta carpeta **no la sirve la app** (no está en `public/`); copiá a `public/` o `app/` solo lo que uses.

Eslogan: **"Show the spend. On the record."** · Tipografía: **Poppins** (Regular 400 y Medium 500; 600 para cifras/títulos) · Detalle en [marca.md](marca.md).

El eslogan anterior de los mockups, "Prove your worth. Get paid.", queda en el Figma y en la auditoría del 2 de octubre. Josué fijó el 8 de octubre de 2026 la historia del producto: Hyto es la capa de rendición de cuentas para comunidades de Stellar en América Latina. Abdiel confirma el eslogan en Figma. No se afirma un pago real ni un piloto.

## Paleta

| Uso | Color |
|---|---|
| Acento lima | `#B7EE34` |
| Casi negro (fondo oscuro, texto sobre lima) | `#08090C` |
| Navy (tarjetas en oscuro) | `#14162B` |
| Rosa | `#FA0560` |
| Rosa para texto pequeño sobre oscuro | `#FF4D8D` |

## Archivos

| Archivo | Qué es | Colores | Uso |
|---|---|---|---|
| `hyto-logo.svg` | Logo completo (isotipo + "hyto"), vector calcado de `hyto-logo-dark.png` | `currentColor` | Logo en la UI (login, sidebar, header). Pintalo con CSS `color`. viewBox 935×292 |
| `hyto-mark.svg` | Isotipo solo, vector calcado de `hyto-mark-dark.png` | `currentColor` | Favicon, app icon, header móvil, sidebar colapsada. viewBox 342×292 |
| `hyto-logo-dark.png` | Logo completo 964×320, fondo transparente | `#08090C` | Sobre fondos claros o sobre lima |
| `hyto-logo-white.png` | Logo completo 964×320, transparente | `#FFFFFF` | Sobre fondos oscuros, versión monocroma |
| `hyto-logo-lime.png` | Logo completo 964×320, transparente | `#B7EE34` | Sobre casi negro, versión acento |
| `hyto-logo-lime-white.png` | Logo completo 964×320, transparente | isotipo `#B7EE34` + texto `#FFFFFF` | **Versión principal en modo oscuro** (la usan los mockups) |
| `hyto-mark-dark.png` | Isotipo 372×320, transparente | `#08090C` | Ícono sobre claro/lima |
| `hyto-mark-lime.png` | Isotipo 372×320, transparente | `#B7EE34` | Ícono sobre oscuro (favicon) |
| `hyto-mark-white.png` | Isotipo 372×320, transparente | `#FFFFFF` | Ícono monocromo sobre oscuro |
| `logo-verde.jpg` | Logo completo lima sobre negro, 2048×2048 (original "Logo verde.jpg") | `#B7EE34` / negro | Redes, avatar, presentaciones |
| `isotipo-blanco.jpg` | Isotipo blanco sobre negro, 2048×2048 (original "Isotipo blanco.jpg") | blanco / negro | Avatar, app icon de alta resolución |
| `isotipo-degradado.png` | Isotipo con degradado verde sobre blanco, 1254×1254 (original "Logo.png") | degradado verde | Piezas de marketing; **no** para UI ni favicon |
| `banner-hyto.png` | Banner 1672×941, logo lima sobre ondas lima/negro (original "Banner Hyto.png") | lima / negro | Cabecera de redes, fondo de OG o portada de presentaciones |
| `brand-sheet.png` | Hoja de marca 1123×1400 (original "Brand.png"): construcción del logo, app icons, tipografía Poppins | — | Referencia |
| `logo-preview-sheet.png` | Hoja 2200×1600 con todas las combinaciones de color del logo | — | Referencia de qué versión va en cada fondo |
| `marca.md` | Notas de marca (eslogan, Poppins, paleta, principios) desde `hyto-traspaso/docs-vault` | — | Referencia |

## Reglas rápidas

- En oscuro: isotipo lima + "hyto" blanco. En claro: todo `#08090C`. Sobre lima: todo `#08090C`.
- No deformar, rotar, recolorear fuera de la paleta ni agregar sombras/efectos.
- Margen libre mínimo alrededor del logo = alto de la "o".
- Los SVG son calcos fieles de los PNG oficiales; si llega un SVG original de diseño, reemplaza a estos.
