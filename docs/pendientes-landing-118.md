# Pendientes del buzón #118 (landing) fuera de este repo

Hyto está en Stellar testnet y no mueve dinero real. Stellar Raven pidió OAuth en el navegador y no se pudo consultar desde este entorno de agente.

## tryhyto.com no está en este repositorio

El HTML publicado en `https://tryhyto.com/` (revisado 9 de octubre de 2026) no vive en `Hyto-App/hyto`. No hay carpeta de ese sitio en `main`. Por eso este PR implementa el checklist #118 en la landing de la app (`/` en hyto.vercel.app / preview) y deja marcado lo que aún hay que tocar en el fuente de tryhyto.com cuando Josué indique dónde está.

No se tocó `motion/`. No se reescribieron las páginas de [hyto#282](https://github.com/Hyto-App/hyto/pull/282) ni [hyto#288](https://github.com/Hyto-App/hyto/pull/288). Términos, cookies y reembolsos en la app siguen pendientes de #282; el pie de la landing enlaza las páginas ya publicadas en tryhyto.com y a `/privacy` en la app.

## Qué falta en tryhyto.com (fuente aparte)

1. CTA principal siempre visible en el primer viewport; en móvil, barra fija inferior con `safe-area-inset-bottom` y padding para no tapar el contenido.
2. Enlaces internos coherentes landing ↔ cómo funciona ↔ FAQ ↔ legales ↔ app (hoy hay anclas; falta alinear con `/faq` y `/gracias` de este PR si se quieren las mismas rutas).
3. Formulario de contacto con página de agradecimiento y próximo paso (en la app: `POST /api/contacto` → `/gracias`).
4. Migas de pan en legales/FAQ si no ensucian el móvil.
5. Caso real del primer pago de práctica con enlace a stellar.expert; hoy no hay hash en el repo (`lib/ui/pago-publico.ts` queda vacío a propósito).
6. FAQ con las cinco preguntas de costo, aprobación, rechazo, colones y fondos (este PR las trae en la app).
7. Promesa de respuesta con el marcador `Josué confirma el tiempo`. Sin correo personal en el pie.
8. Sin sección de reseñas inventadas (tryhyto.com ya no tiene testimonios; mantenerlo).
9. Sección de equipo con Josué, Sebas, Esteban, Abdiel y Raúl (en la app: iniciales WebP temporales en `/public/equipo`).

## Primer pago público

Cuando exista un hash real de 64 caracteres hex, pegarlo en `HASH_PAGO_PUBLICO` en `lib/ui/pago-publico.ts` y en el README. No inventar uno.
