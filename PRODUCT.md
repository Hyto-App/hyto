# Product

<!-- impeccable:product-schema 1 -->

Registrado a partir del brief de este trabajo y de `AGENTS.md`. No hubo ronda de entrevista: el agente corre en segundo plano y el brief ya fija el producto.

## Platform

web

## Users

Comunidades en América Latina que reciben estipendios, becas o fondos desde lejos y tienen que mostrar en qué se gastó ese dinero. Quien organiza crea el evento y paga. Quien participa hace la tarea y sube una foto o un recibo. El ingreso no pide un rol.

## Product Purpose

Hyto es la capa de rendición de cuentas de esas comunidades. El dinero llega en dólares. Una persona aparta el monto, otra envía la prueba, y una persona libera el pago. Mile solo recomienda. La IA no firma ni mueve dinero.

## Positioning

Stellar es el riel de liquidación, no la audiencia. Trustless Work es el contrato de depósito en el que Hyto está construido. El comprobante público es un pago en la red de prueba, cuando existe.

## Operating Context

Una app. Quien organiza ve Eventos. El resto abre Mis tareas. El ingreso es correo, código u OAuth (Cavos). En el teléfono (360–430px) ese ingreso es una columna: la acción principal queda al pulgar.

## Capabilities and Constraints

- Superficie: montos en US$, acción «Reservar», cripto bajo «Avanzado», comisiones a la vista cuando hay un pago.
- Copy: español formal con «usted». Sin tuteo, sin voseo, sin «plata» (se dice dinero o fondos).
- Marca que no se reemplaza: logo, Poppins, navy y lima, modo oscuro, tokens, íconos, personaje Mile.
- Solo red de prueba. Sin migraciones desde un agente. Sin secretos en el repo.
- Este cambio de ingreso no toca Eventos, Mis tareas, Configuración, el chat de Mile, `landing/` ni `motion/`.

## Brand Commitments

Logo Hyto, Poppins 400/500/600, acento `#B7EE34`, texto de botón `#08090C`, navy de la interfaz, modo claro y oscuro con los tokens de `app/globals.css`. Referencia visual: Figma «Hyto – App», página «Nuevo diseño». Si una guía pide otra tipografía u otros colores, se ignora.

## Evidence on Hand

No hay en este repo un hash de pago real en USDC de testnet. Los montos del evento de ejemplo no son pagos ni billeteras reales.

## Product Principles

- La prueba va antes del pago.
- Una persona decide el dinero. Mile no lo mueve.
- En el teléfono, una tarea por pantalla y un botón principal.
- Lo técnico (cripto, red, cuentas) no lidera la frase. Vive bajo Avanzado.

## Accessibility & Inclusion

El ingreso en el teléfono respeta área segura de iOS, botones de al menos 44px, foco visible y `prefers-reduced-motion` (menos movimiento, no cero: se conservan opacidad y color).
