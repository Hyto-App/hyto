![Hyto. Primero la prueba, después el pago. El dinero permanece reservado hasta que alguien envía una foto tomada en el lugar y una persona aprueba.](docs/banner.svg)

**Hyto: primero la prueba, después el pago.** Quien aporta el dinero lo reserva para cada tarea, en dólares digitales, en la red Stellar. Quien realiza el trabajo envía una foto tomada en el lugar, con la cámara de la aplicación, y los recibos. Mile, el asistente, compara esa información y recomienda. Una persona aprueba, y solo entonces sale el pago. Usted ingresa con su correo, por Cavos. No necesita instalar una billetera ni guardar una frase secreta. Es un prototipo elaborado para Find Your Way. Aún no hay pilotos.

Si prefiere leer en inglés, abra la versión principal en [README.md](README.md).

## A quién se dirige

A comunidades de América Latina, también si usan otra red o si no están en el lugar. Reciben estipendios, subvenciones y fondos para eventos desde la distancia, y tienen que mostrar en qué se usó ese dinero. El pago sale por la red Stellar.

## Pantallas

Estas imágenes son del modo de demostración, en el ancho de un teléfono. El evento de ejemplo viene de datos locales. En la demostración, para crear un evento o firmar un pago, ingrese con su correo.

![Eventos, con el evento de demostración y una tarea en revisión](docs/screenshots/eventos.png)

![Tareas asignadas. Mile revisa la foto antes de pasarla a quien aprueba.](docs/screenshots/tareas.png)

![Revisión de una foto de trabajo. En la demostración no puede reservar el dinero.](docs/screenshots/revision.png)

## Cómo funciona

1. **Reservar.** Quien organiza aparta el dinero de una tarea, en dólares digitales (USDC). Hyto lo guarda aparte, en un contrato por tarea, por medio de [Trustless Work](https://www.trustlesswork.com). Hyto no cobra comisión. Para crear un evento, la cuenta de quien organiza debe cubrir la suma de las tareas y un dólar más de reserva.
2. **Probar.** En una tarea de trabajo, la foto se toma en el lugar y en el momento, con la cámara de la aplicación. Una foto anterior, de la galería, no se acepta en esa tarea. En un reembolso también se envía el recibo, y quien organiza confirma el monto antes de reservar esa tarea.
3. **Recomendar.** Mile compara la foto y los recibos con lo que pedía la tarea, y recomienda. Mile no aprueba el pago y no mueve el dinero.
4. **Liberar.** Una persona aprueba. Solo entonces Hyto libera el pago en la red Stellar. Cuando el pago queda registrado, puede abrir el comprobante público en stellar.expert.

Los pagos de este proyecto, hoy, son de prueba en la red Stellar: no son dinero real. Para recibir esos dólares, la cuenta tiene que poder aceptarlos. La aplicación puede dejarla lista.

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

`npm run db:local` espera Postgres en `127.0.0.1:5432` (`postgres://hyto:hyto@127.0.0.1:5432/hyto`). Si no hay un servicio en ese puerto, inicia Postgres según `docker-compose.yml`, aplica `drizzle/*.sql` y carga el ejemplo ZEEK. Copie [.env.example](.env.example) a `.env.local` y defina solo las variables necesarias para la ejecución local. No incluya secretos en el repositorio.

El acceso de demostración es `HYTO_DEMO_LOGIN=1`. La pantalla de acceso ofrece entonces una cuenta de organizador y una cuenta de voluntario. Esas sesiones no crean eventos ni firman un pago.

```bash
npm test
npx tsc --noEmit
npm run build
```

`npm test` ejecuta los archivos `*.test.ts` de `lib/`, `scripts/backend-traspaso` y dos archivos de `tests/integracion`, con `tsx`. `npm run test:integracion` se conecta a Postgres. Ejecútelo por separado. No migre ni cargue datos de ejemplo en una base de producción, salvo que usted sea responsable de esa base y defina `HYTO_CONFIRMAR_BASE_PRODUCCION=si`.

Antes de modificar el código, consulte [AGENTS.md](AGENTS.md). El detalle técnico está en [STACK.md](STACK.md).

## Comprobante en testnet

El primer pago completo registrado en la red de prueba es del 8 de octubre de 2026. Quedó confirmado. En el registro público la operación se llama `release_funds` y mueve dólares digitales de prueba (USDC). Horizon la informa como exitosa. Ocurrió la misma mañana que la corrección publicada en [#219](https://github.com/Hyto-App/hyto/pull/219).

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
