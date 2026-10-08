![Hyto. Primero la prueba, después el pago. Los fondos permanecen reservados hasta que se envía una foto tomada en el lugar y una persona aprueba.](docs/banner.svg)

**Hyto: primero la prueba, después el pago.** Quien financia reserva USDC para cada tarea en Stellar. Quien realiza el trabajo envía una foto tomada en el lugar, con la cámara de la aplicación, junto con los recibos. Mile, el asistente de inteligencia artificial, compara esa evidencia y recomienda. Una persona aprueba, y solo entonces se libera el pago. El acceso es por correo electrónico, mediante Cavos, sin una aplicación de billetera aparte ni una frase secreta que conservar. Es un prototipo elaborado para Find Your Way. Aún no hay pilotos.

La versión principal, en inglés, está en [README.md](README.md).

## A quién se dirige

A comunidades de América Latina, incluidas las que operan en cualquier cadena y las que no están presentes físicamente. Reciben estipendios, subvenciones y fondos para eventos desde la distancia, y deben demostrar cómo se gastaron esos fondos. Stellar es la red de liquidación.

## Pantallas

Las imágenes corresponden al modo de demostración, en el ancho de un teléfono. El evento de ejemplo proviene de los datos locales de ejemplo. En el modo de demostración, crear un evento y firmar un pago requieren una sesión con correo electrónico.

![Eventos, con el evento de demostración y una tarea en revisión](docs/screenshots/eventos.png)

![Tareas asignadas. Mile revisa la foto antes de que el envío continúe.](docs/screenshots/tareas.png)

![Revisión de una foto de trabajo. Reservar presupuesto permanece deshabilitado en el modo de demostración.](docs/screenshots/revision.png)

## Cómo funciona

1. **Reservar.** Quien organiza reserva USDC para una tarea. Hyto abre un contrato multi-release v2 de [Trustless Work](https://www.trustlesswork.com) por tarea y deposita los fondos. La comisión de plataforma en Hyto es 0. Crear un evento requiere que la billetera de la sesión cubra los montos de las tareas más 1 USDC de reserva.
2. **Probar.** Una tarea de trabajo requiere una foto reciente tomada con la cámara de la aplicación, en el lugar donde se realizó el trabajo. Las fotos de la galería se rechazan en esa tarea. Un reembolso también requiere el recibo. Quien organiza confirma el monto antes de que esa tarea pueda reservarse.
3. **Recomendar.** Mile compara la foto y los recibos con los requisitos de la tarea, y recomienda. Mile no aprueba el pago y no mueve los fondos.
4. **Liberar.** Una persona aprueba. Hyto marca el hito, lo aprueba y libera el pago en Stellar. El enlace abre stellar.expert cuando el hash de la transacción está disponible.

Los pagos de este repositorio se liquidan en la red de prueba (testnet) de Stellar. Un saldo de USDC clásico requiere una línea de confianza (trustline) para que la cuenta pueda conservar el activo. La aplicación puede preparar esa línea de confianza para la billetera de la sesión.

## Stack técnico

| Capa | Qué utiliza la aplicación |
|---|---|
| Aplicación | Next.js 16.3.6, React 19.1.1, TypeScript, Tailwind 4. Una sola interfaz: Eventos, Tareas y Cuenta. Inglés de forma predeterminada; español mediante la cookie `hyto_idioma`. |
| Alojamiento | Vercel. Producción es [hyto.vercel.app](https://hyto.vercel.app). Un envío a `main` despliega producción. Cada pull request recibe una vista previa. |
| Datos | Neon Postgres mediante Drizzle. Las migraciones están en `drizzle/`. |
| Fotos | Vercel Blob privado. La base de datos almacena el identificador. La pantalla carga la foto a través de la aplicación. |
| Acceso | Correo electrónico con Cavos (`@cavos/kit` 0.2.5) en la testnet de Stellar. El acceso no requiere una aplicación de billetera aparte. |
| Red | Stellar y Soroban. El servidor construye la transacción sin firmar con `@stellar/stellar-sdk`. El navegador la firma con Cavos. |
| Pago | Trustless Work v2, `https://beta.api.trustlesswork.com`. Un contrato por tarea. El servidor prepara la transacción. El navegador solo la firma. |
| USDC | USDC de testnet. El emisor en el código es `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. |
| Mile | La visión de Groq describe la foto (`qwen/qwen3.8-27b`, o `GROQ_VISION_MODEL`). Gemini la describe solo si la llamada a Groq falla y `GEMINI_API_KEY` está definida. Laya califica la descripción cuando `LAYA_URL` está definida. La calificación va de 0 a 100. |

## Ejecución local

```bash
npm ci
npm run db:local
npm run dev
```

`npm run db:local` espera Postgres en `127.0.0.1:5432` (`postgres://hyto:hyto@127.0.0.1:5432/hyto`). Si no hay un servicio en ese puerto, inicia Postgres según `docker-compose.yml`, aplica `drizzle/*.sql` y carga el ejemplo ZEEK. Se copia [.env.example](.env.example) a `.env.local` y se definen solo las variables necesarias para la ejecución local. Los secretos permanecen fuera del repositorio.

El acceso de demostración es `HYTO_DEMO_LOGIN=1`. La pantalla de acceso ofrece entonces una cuenta de organizador y una cuenta de voluntario. Esas sesiones no crean eventos ni firman un pago.

```bash
npm test
npx tsc --noEmit
npm run build
```

`npm test` ejecuta los archivos `*.test.ts` de `lib/`, `scripts/backend-traspaso` y dos archivos de `tests/integracion`, con `tsx`. `npm run test:integracion` se conecta a Postgres y se ejecuta por separado. Una base de producción se migra o se carga con datos de ejemplo solo cuando la persona responsable define `HYTO_CONFIRMAR_BASE_PRODUCCION=si`.

Antes de modificar el código, se consulta [AGENTS.md](AGENTS.md). El detalle del stack está en [STACK.md](STACK.md).

## Comprobante en testnet

El primer pago de extremo a extremo registrado en testnet es esta transacción `release_funds` del 8 de octubre de 2026. Horizon la informa como exitosa. La función invocada es `release_funds`, y el sobre de la transacción incluye USDC. Se envió la misma mañana que la corrección del despliegue en [#219](https://github.com/Hyto-App/hyto/pull/219).

[stellar.expert/explorer/testnet/tx/efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c](https://stellar.expert/explorer/testnet/tx/efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c)

`efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c`

La transacción está en testnet. Los fondos son fondos de prueba. Los montos de ZEEK en los datos de ejemplo (tres tareas de trabajo de US$20 y una comida con un límite de US$15) son ejemplos. Son independientes de esta transacción.

## Equipo

Nombres y áreas de trabajo, tal como ya figuran en [ROLES.md](ROLES.md):

| Persona | Área |
|---|---|
| Abdiel Cole | UX, el archivo de Figma, Laya |
| Esteban | API, Neon, Blob, canal de revisión |
| Sebas | Pagos, Cavos, un pago real en testnet |
| Josué | Interfaz de la aplicación, flujos de administración, documentación |
| Raúl | Tareas de los miembros, carga de evidencia, cuentas |

## Enlaces

- Aplicación: https://hyto.vercel.app
- Página de presentación: https://tryhyto.com
- Este repositorio aún no incluye un archivo de licencia.
