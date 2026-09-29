# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El integrante sube una foto, la IA recomienda y el admin aprueba cada pago en USDC.

El demo es un evento de ZEEK. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

## Estado al 29 de septiembre de 2026

En `main`, a las 9:44 a.m. del 29 de septiembre, hora de Costa Rica, está el PR #27 de Josué Valles (squash `d26a443`): pruebas contra un Postgres local. A las 9:16 a.m. entró el PR #20 (squash `36fd91a`), que precisa `.env.example` sin valores. Antes, el 28 a las 11:40 p.m., el PR #14 de Esteban (Psybre, squash `ce9ff7c`) dejó Neon, Blob, las rutas y el ingreso con Cavos. También están el PR #1 de Raúl (squash `3a000e0`), el PR #3 de Josué (squash `b2451a6`, el 28 cerca de las 7:42 a.m.), el PR #7 de Abdiel Cole (squash `cff4512`, a las 2:58 p.m.), la auditoría del integrante (PR #4, squash `bc94a9c`, a las 3:47 p.m.) y el PR #8 de Sebas (squash `ae10a9e`, a las 3:48 p.m.). Las horas son de Costa Rica. El esqueleto, el admin, la marca (Poppins y lima), el módulo de firma y el backend están hechos. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel y es el correcto. Falta poner `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` y `GROQ_API_KEY` en Vercel y crear el almacén privado. Las tablas y la semilla de ZEEK ya se corrieron en la base. Sin esas variables las rutas responden 503 y las pantallas siguen con el ejemplo. Siguen pendientes Sebas (un pago en USDC; sin ese pago no hay Acta), Abdiel (`LAYA_URL` y una clave compartida) y Josué (conectar la bandeja, Fondear y Aprobar, y el regreso de Google del PR #18, que no está en `main`). Fondear y Aprobar todavía no usan el módulo.

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| Esqueleto y admin: bandeja en `/`, crear proyecto, revisión y aprobar, informe imprimible. Mis tareas sigue en `/mis-tareas`. Ejemplo de ZEEK. Fondear y Aprobar no firman en Stellar | Josué |
| Botón Entrar. Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. El ingreso pide el código al correo, o Google, y guarda la dirección solo si no hay aviso | Josué, ingreso de Esteban |
| Marca: Poppins 400, 500 y 600, acento lima `#B7EE34` y texto del botón `#08090C` | Abdiel |
| Módulo de firma (`lib/escrow`), `POST /api/firma`, `POST /api/firma/enviar` y el script `npm run hito`. Sin hash de pago en el repositorio. Esas dos rutas exigen la sesión del organizador | Sebas, sesión de Esteban |
| Neon con Drizzle, Blob privado, `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/evidencias/:id/foto`, `GET` y `POST /api/proyectos`, `GET /api/informe`, `GET` y `POST /api/revision/:id` y `POST /api/sesion`. Seed de ZEEK. Revisión con Qwen 3.8 27B, stub de Laya y guion fijo. Entrar usa CavosAuth y busca el rol por correo | Esteban, PR #14 |
| `.env.example` describe alcance, obligatoriedad y qué pasa si falta cada variable. Sin valores | Josué, PR #20 |
| `npm run test:integracion` contra Postgres local. Si no hay base, o si la dirección no es local, se omite. El regreso de Google queda como fallo esperado (PR #18, abierto) | Josué, PR #27 |
| Auditoría del integrante: no mezcla tareas, no inventa US$0 ni corre el día de una fecha, abre USDC si la cuenta ya existe, y cierra fallos de la cámara | Josué (coautor), PR #4 |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |

Las pantallas usan tres tareas de trabajo de US$20 y un reembolso de hasta US$15. Si la API no responde, se muestra ese ejemplo.

| Pendiente | Dueño |
|---|---|
| Un pago de prueba en USDC con `npm run hito` y `TRUSTLESS_API_KEY`. El Acta solo después de ese pago. El hash no está en el repositorio | Sebas |
| Poner en Vercel `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` y `GROQ_API_KEY`, y crear el almacén privado. Las tablas y la semilla de ZEEK ya se corrieron en la base. El código ya las lee | Esteban |
| `LAYA_URL` en su servidor, y acordar con Esteban una clave porque ese enlace es público | Abdiel |
| Conectar la bandeja, la revisión y el informe a las rutas, y Fondear y Aprobar a `POST /api/firma` y `POST /api/firma/enviar`. Esas dos rutas ya piden la sesión del organizador. El envío devuelve el hash y no lo guarda en la tarea. El regreso de Google (PR #18) sigue abierto | Josué |
| El 30 de septiembre, subir Next.js a 16.3.7 | Josué |
| Cuatro cuentas de Cavos del demo. El ingreso pide el código del correo de cada cuenta. La base tiene que estar sembrada | Raúl |

`--acento` es `#B7EE34` y `--sobre-acento` es `#08090C`, en `app/globals.css`. La tipografía es Poppins.

## Cómo correrlo

```bash
npm ci
npm run dev
npm test
npm run test:integracion
npm run build
npm run hito
npm run db:migrar
npm run db:semilla
```

`npm run dev` abre Next.js. `npm test` corre las pruebas de `lib/integrante`, `lib/admin`, `lib/escrow`, `lib/revision`, `lib/db`, `lib/sesion` y `lib/api`, y desde el PR #27 también la guardia de la base local y la cookie de sesión de prueba, con `tsx`. `npm run test:integracion` recorre las rutas y las pantallas del admin contra Postgres en esta máquina (por defecto `127.0.0.1:5432`, base `hyto_integracion`; se puede cambiar con `HYTO_TEST_DATABASE_URL`). Si no hay base, o si el host no es `localhost`, `127.0.0.1`, `::1` ni un servicio de Docker, avisa y no conecta. `npm run hito` ejecuta `scripts/hito-prueba.ts`. Sin `TRUSTLESS_API_KEY` termina avisando que falta la clave y que no hay pago. `npm run db:migrar` y `npm run db:semilla` necesitan `DATABASE_URL`. No hay `npm run lint`.

## Variables de entorno

Solo nombres. Los valores van en Vercel, no en el repo. El PR #20 dejó en `.env.example` el alcance, si cada una es obligatoria y qué hace el código si falta. El código lee `NEXT_PUBLIC_CAVOS_APP_ID`, `TRUSTLESS_API_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `GROQ_API_KEY`, `LAYA_URL` y, si existe, `LAYA_API_KEY`. `NODE_ENV` no se declara: lo pone Next.js. En producción la cookie `hyto_sesion` lleva Secure. No hay `GOOGLE_CLIENT_ID`: Google entra por Cavos. La clave de servidor de Cavos (`cav_…`) sigue sin nombre en el código.

| Nombre | Para qué | Dueño |
|---|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | App de Cavos. Pública, no es una clave. Ya está en Vercel y es el correcto. Sin ella no se llama a Cavos | Sebas |
| `TRUSTLESS_API_KEY` | Trustless Work, solo en el servidor. Obligatoria para pagar. La leen `npm run hito` y `/api/firma`. Sin ella la API responde 503 y el script sale con código 2 | Sebas |
| `DATABASE_URL` | Neon, solo en el servidor. Obligatoria para la base. Sin ella las rutas responden 503 y la migración sale con código 1 | Esteban |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, almacén privado. Obligatoria para fotos. Sin ella subir y leer la foto responden 503 | Esteban |
| `GROQ_API_KEY` | Qwen 3.8 27B (`qwen/qwen3.8-27b`). Opcional. Sin ella, o si Groq falla, la revisión usa el guion fijo | Esteban |
| `LAYA_URL` | Laya en el servidor de Abdiel. Opcional. Sin ella, después de Groq la revisión usa el stub | Abdiel |
| `LAYA_API_KEY` | Opcional. Si tiene valor, la revisión la manda a Laya. Si falta, Laya se llama igual, sin esa cabecera | Abdiel, con Esteban |

`.env.example` no trae valores.

## Fechas

- Meetup: miércoles 30 de septiembre de 2026, TEC Cartago.
- Ese día, subir Next.js a 16.3.7 cuando salga el parche.
- Cierre de entregas: lunes 5 de octubre de 2026, 4:00 p.m.
- El demo a mostrar sigue siendo el de ZEEK.

## Reglas del equipo

Todo el trabajo se hace en la nube (agentes de Cursor Cloud o Claude Code en la web). Cada cambio va en una rama `nombre/tarea` y entra por pull request a `main`. Nadie empuja a `main`. No se reutiliza la misma rama: la siguiente tarea sale de `main` ya actualizado.

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b nombre/tarea
```

## Documentos

- [PLAN.md](PLAN.md) — orden de trabajo, contrato de la API y bitácora.
- [STACK.md](STACK.md) — stack cerrado y reglas del dinero.
- [ROLES.md](ROLES.md) — qué hace cada persona.
- [Hyto-informe.md](Hyto-informe.md) — informe largo: premisa, demo y calendario.
- [CHANGELOG.md](CHANGELOG.md) — lo que entró a `main`, por fecha, con pull request y autor.
