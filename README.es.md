![Hyto. Primero la prueba, después el pago. La plata espera una foto tomada en el lugar y el sí de una persona.](docs/banner.svg)

**Hyto: primero la prueba, después el pago.** Quien financia reserva USDC por cada tarea en Stellar. Quien hace el trabajo sube una foto tomada en el lugar, con la cámara de la app, y los recibos. Mile, el asistente de IA, compara esa evidencia y recomienda. Una persona aprueba y recién ahí se libera el pago. Se entra con el correo, por Cavos: no hay una billetera que instalar ni una frase secreta que guardar. Es un prototipo hecho para Find Your Way. Todavía sin pilotos.

La versión en inglés, que es la principal, está en [README.md](README.md).

## Para quién es

Para comunidades en América Latina, también las que están en cualquier cadena y las que no están físicamente en el lugar. Reciben estipendios, subvenciones y fondos para eventos desde lejos, y tienen que probar en qué se gastó. Stellar es el riel del pago.

## Pantallas

Modo demo, en el ancho de un teléfono. El evento de ejemplo sale de la semilla local. El modo demo no crea eventos y no firma un pago.

![Eventos, con el evento demo y una tarea en revisión](docs/screenshots/eventos.png)

![Las tareas de quien participa. Mile revisa la foto antes de seguir.](docs/screenshots/tareas.png)

![Revisión de una foto de trabajo. Bloquear presupuesto queda apagado en el demo.](docs/screenshots/revision.png)

## Cómo funciona

1. **Reservar.** Quien organiza aparta USDC para una tarea. Hyto abre un contrato multi-release v2 de [Trustless Work](https://www.trustlesswork.com) por tarea y lo fondea. La comisión de plataforma en Hyto es 0. Crear un evento exige que la billetera de la sesión cubra los montos más 1 USDC de reserva.
2. **Probar.** Una tarea de trabajo pide una foto recién tomada con la cámara de la app, en el lugar. Las fotos de la galería se rechazan en esa tarea. Un reembolso también lleva el recibo, y quien organiza confirma el monto antes de poder reservar esa tarea.
3. **Recomendar.** Mile compara la foto y los recibos con lo que pedía la tarea, y recomienda. No aprueba y no mueve la plata.
4. **Liberar.** Una persona aprueba. Hyto marca el hito, lo aprueba y libera el pago en Stellar. El enlace abre stellar.expert cuando ya existe el hash de la transacción.

Lo que este repositorio liquida hoy está en la testnet de Stellar. Un saldo de USDC clásico necesita una trustline para que la cuenta pueda guardarlo. La app puede preparar esa trustline para la billetera de la sesión.

## Stack

| Capa | Qué usa la app |
|---|---|
| App | Next.js 16.3.6, React 19.1.1, TypeScript, Tailwind 4. Un solo cascarón: Eventos, Tareas, Cuenta. Inglés por defecto, español con la cookie `hyto_idioma`. |
| Host | Vercel. Producción es [hyto.vercel.app](https://hyto.vercel.app). Un push a `main` lo despliega. Cada pull request tiene un preview. |
| Datos | Neon Postgres con Drizzle. Las migraciones están en `drizzle/`. |
| Fotos | Vercel Blob privado. La base guarda el id. La pantalla pide la foto a la app. |
| Ingreso | Correo con Cavos (`@cavos/kit` 0.2.5) en la testnet de Stellar. El navegador no pide instalar una billetera primero. |
| Red | Stellar y Soroban. El servidor arma la transacción sin firmar con `@stellar/stellar-sdk`. El navegador la firma con Cavos. |
| Pago | Trustless Work v2, `https://beta.api.trustlesswork.com`. Un contrato por tarea. El servidor prepara la transacción. El navegador solo firma. |
| USDC | USDC de testnet. El emisor en el código es `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. |
| Mile | La visión de Groq describe la foto (`qwen/qwen3.8-27b`, o `GROQ_VISION_MODEL`). Gemini la describe solo si Groq falla y existe `GEMINI_API_KEY`. Laya puntúa la descripción cuando existe `LAYA_URL`. La nota va de 0 a 100. |

## Correrlo en local

```bash
npm ci
npm run db:local
npm run dev
```

`npm run db:local` espera Postgres en `127.0.0.1:5432` (`postgres://hyto:hyto@127.0.0.1:5432/hyto`). Si no hay nada escuchando, levanta el Postgres de `docker-compose.yml`, aplica `drizzle/*.sql` y carga el ejemplo ZEEK. Copiá [.env.example](.env.example) a `.env.local` y completá solo los nombres que hagan falta. No subas secretos.

El ingreso demo es `HYTO_DEMO_LOGIN=1`. La pantalla de ingreso ofrece entonces organizador y voluntario. Esas sesiones no crean eventos ni firman.

```bash
npm test
npx tsc --noEmit
npm run build
```

`npm test` corre los `*.test.ts` de `lib/`, `scripts/backend-traspaso` y dos archivos de `tests/integracion`, con `tsx`. `npm run test:integracion` habla con Postgres y va aparte. No migres ni siembres una base de producción salvo que quien la opera ponga `HYTO_CONFIRMAR_BASE_PRODUCCION=si`.

Quien cambie el código lee primero [AGENTS.md](AGENTS.md). El detalle del stack está en [STACK.md](STACK.md).

## Prueba en testnet

El primer pago de punta a punta en testnet que queda registrado es esta transacción `release_funds` del 8 de octubre de 2026. Horizon la reporta exitosa. La llamada es `release_funds` y el sobre lleva USDC. Cayó la misma mañana que el arreglo del deploy en [#219](https://github.com/Hyto-App/hyto/pull/219).

[stellar.expert/explorer/testnet/tx/efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c](https://stellar.expert/explorer/testnet/tx/efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c)

`efb5826e291cae2540e3def1857d7d27d591a40fdbffd1afeb7ab96ba9b5b33c`

Es testnet. Es plata de práctica. Los montos de ZEEK en la semilla (tres tareas de trabajo de US$20 y una comida con tope de US$15) son ejemplos. No son esta transacción.

## Equipo

Nombres y focos que ya están en [ROLES.md](ROLES.md):

| Persona | Foco |
|---|---|
| Abdiel Cole | UX, el archivo de Figma, Laya |
| Esteban | API, Neon, Blob, revisión |
| Sebas | Pagos, Cavos, un pago real en testnet |
| Josué | Cascarón de la app, flujos de administración, docs |
| Raúl | Tareas de quien participa, subida de evidencia, cuentas |

## Enlaces

- App: https://hyto.vercel.app
- Landing: https://tryhyto.com
- Este repositorio todavía no trae un archivo de licencia.
