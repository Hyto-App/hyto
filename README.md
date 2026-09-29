# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El integrante sube una foto, la IA recomienda y el admin aprueba cada pago en USDC.

El demo es un evento de ZEEK. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

## Estado al 29 de septiembre de 2026

En `main` (`ce9ff7c`) están el PR #1 de Raúl (squash `3a000e0`), el PR #3 de Josué (squash `b2451a6`, el 28 de septiembre cerca de las 7:42 a.m., hora de Costa Rica), el PR #7 de Abdiel Cole (squash `cff4512`, a las 2:58 p.m.), la auditoría del integrante (PR #4, squash `bc94a9c`, a las 3:47 p.m.), el PR #8 de Sebas (squash `ae10a9e`, a las 3:48 p.m.) y el backend de Esteban (PR #14). Las horas son de Costa Rica. El esqueleto, el admin, la marca (Poppins y lima) y el módulo de firma están hechos. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel y es el correcto. El código ya tiene Neon, Blob, las rutas, la revisión y el ingreso con Cavos. Si en Vercel faltan `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` o `GROQ_API_KEY`, las rutas responden 503 y Mis tareas vuelve al ejemplo. La app es un demo que funciona por partes. Todavía no es el producto.

### Organizador y voluntario

El organizador crea el proyecto, ve la bandeja, revisa la evidencia, aprueba el pago y abre el informe. El voluntario ve sus tareas y sube la foto.

Hoy la pantalla no dice el rol. El encabezado del admin dice solo "Hyto". El layout del voluntario no pone un rol. En Mis tareas la persona se elige con botones. `POST /api/sesion` devuelve el rol y lo guarda en una cookie HttpOnly. El navegador no lo muestra. No hay `GET /api/sesion`.

Las pantallas del organizador leen el ejemplo de ZEEK en `localStorage` (`hyto-admin`). No llaman a la API.

**Objetivo.** El encabezado dice con claridad "Organizador" o "Voluntario". Lo que hace un rol, el otro lo ve en el momento. La IA reacciona a lo que hace cada rol.

Eso está pendiente. El código no abre un websocket, ni SSE, ni una consulta repetida. La IA solo corre al subir una evidencia y en `GET` o `POST /api/revision/[id]`. Aprobar y Pedir otra foto se quedan en el navegador.

### Qué hace el flujo hoy

| Paso | Hoy |
|---|---|
| Entrar | Código real. Cavos pide el código al correo, o Google. `POST /api/sesion` guarda la cookie y el rol que Neon tiene para ese correo. La semilla solo trae `@demo.hyto`. Esos correos no reciben el código. La semilla inserta usuarios solo si la tabla está vacía. El JWT de Cavos se decodifica y no se verifica la firma. |
| Mis tareas | Real cuando `GET /api/tareas` responde. Si falla, o si tarda más de 4 segundos, vuelve el ejemplo y la pantalla lo dice. El servidor no lee `miembro` ni `wallet`: el filtro lo hace el navegador, con el botón elegido. |
| Subir evidencia | Real. La foto va a Blob privado, se crea la fila y la tarea pasa a "en revisión". El navegador corta a los 4 segundos. El servidor espera la revisión 2,8 segundos y, si no alcanza, la sigue en segundo plano. Si el navegador corta antes, la pantalla muestra la evidencia de ejemplo. |
| Veredicto de la IA | Groq es real. El modelo en código es `qwen/qwen3.8-27b`. Laya solo corre si existe `LAYA_URL`. Esa variable no está publicada. Sin ella, un trabajo queda en "parcial". Un reembolso queda en "cumplió" solo si Groq devolvió monto y fecha dentro del tope. Si faltan, queda "insuficiente". Sin clave de Groq, o si un modelo falla, entra el guion fijo: el reembolso usa US$12.40 y el 27 de septiembre de 2026. El veredicto se guarda en Neon. Ninguna pantalla lo muestra. La respuesta no trae `origen` ni el texto del modelo. El fallo no se escribe en un registro. |
| Bandeja, revisión e informe | Ejemplo fijo de ZEEK en `localStorage`. No leen `GET /api/informe` ni `GET /api/revision/[id]`. |
| Crear proyecto, Fondear y Aprobar | Solo `localStorage`. No llaman a `POST /api/proyectos` ni a `POST /api/firma`. |

La billetera de Cavos es real, en Stellar testnet. La dirección se guarda en `localStorage`. Al subir, el cliente manda `wallet` solo si la tarea ya trae `walletCobro`. En la semilla ese campo va vacío.

El módulo de Trustless Work es real: `lib/escrow`, `POST /api/firma`, `POST /api/firma/enviar` y `npm run hito`. Esas dos rutas piden la sesión del organizador. Los botones Fondear y Aprobar no las llaman. El 28 de septiembre, en el sitio, la clave configurada respondió 401. El esquema no guarda `contractId`. Ninguna ruta escribe `hashPago`. El campo nace vacío.

No hay `middleware.ts`. Estas rutas no piden sesión: `GET` y `POST /api/proyectos`, `GET` y `POST /api/revision/[id]`, `GET /api/evidencias/[id]`, `GET /api/evidencias/[id]/foto`, `GET /api/tareas`, `POST /api/evidencias` y `GET /api/informe`.

El comentario de `.env.example` todavía dice que `GROQ_API_KEY` es Llama 4 Scout. El código llama a `qwen/qwen3.8-27b`. La columna del texto se llama `texto_scout`. El modelo no es Scout.

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| Esqueleto y admin: bandeja en `/`, crear proyecto, revisión y aprobar, informe imprimible. Mis tareas sigue en `/mis-tareas`. Ejemplo de ZEEK. Fondear y Aprobar no firman en Stellar | Josué |
| Botón Entrar. Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. El ingreso pide el código al correo, o Google, y guarda la dirección solo si no hay aviso | Josué, ingreso de Esteban |
| Marca: Poppins 400, 500 y 600, acento lima `#B7EE34` y texto del botón `#08090C` | Abdiel |
| Módulo de firma (`lib/escrow`), `POST /api/firma`, `POST /api/firma/enviar` y el script `npm run hito`. Sin hash de pago en el repositorio. Esas dos rutas exigen la sesión del organizador | Sebas, sesión de Esteban |
| Neon con Drizzle, Blob privado, `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/informe`, `POST /api/proyectos` y `GET` y `POST /api/revision/:id`. Seed de ZEEK. Revisión con `qwen/qwen3.8-27b`, stub de Laya si no hay `LAYA_URL`, y guion fijo si Groq falla. Entrar usa CavosAuth y busca el rol por correo. El rol no se dibuja | Esteban |
| Auditoría del integrante: no mezcla tareas, no inventa US$0 ni corre el día de una fecha, abre USDC si la cuenta ya existe, y cierra fallos de la cámara | Josué (coautor), PR #4 |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |

Las pantallas usan tres tareas de trabajo de US$20 y un reembolso de hasta US$15. Si la API no responde, se muestra ese ejemplo.

Abdiel tiene libertad completa de creatividad y edición sobre la UI/UX y el frontend. Puede reorganizar, rediseñar y mover cualquier elemento visual a su criterio. Su Figma es la fuente de verdad de UX y UI.

| Pendiente | Dueño | Por dónde empieza |
|---|---|---|
| Pulir el demo hasta que se vea como producto. El Figma de Abdiel es la fuente de verdad de UX y UI. Diseña la etiqueta de rol, la vista en vivo y la tarjeta de la IA. Esas tres piezas las construyen otros y hoy no funcionan | Abdiel | El flujo que ya está en `main`. Libertad completa sobre lo visual |
| `LAYA_URL` en su PC Windows, con Tailscale Funnel | Abdiel | El servidor de Laya, aparte de la maquetación |
| Login con correos que sí reciban el código, y verificar la firma del token de Cavos. Cerrar las rutas que hoy no piden sesión. Devolver `origen` y el texto del modelo. Rutas para la decisión y para `hashPago`. Columna y ruta de `contractId` | Esteban | `lib/sesion/correo.ts` y las rutas de `app/api` que no llaman a `exigirOrganizador` |
| El corte de 4 segundos del navegador contra los 2,8 segundos del servidor al subir la foto | Esteban y Raúl | `lib/integrante/rutas.ts` y `lib/api/evidencias.ts` |
| Conectar bandeja, revisión e informe a la API. Etiqueta "Organizador" en el encabezado. Consulta repetida para que el admin vea lo que sube el voluntario. Fondear y Aprobar con `POST /api/firma`, `signXdr` y `POST /api/firma/enviar` | Josué | `components/admin`, que hoy leen `hyto-admin` |
| El 30 de septiembre, subir Next.js a 16.3.7 | Josué | `package.json`, el día del meetup |
| Confirmar su alcance: lo que no es billetera, backend ni IA, y lo que no es el frontend de Abdiel. En código: el voluntario sale de la sesión, se manda su propia wallet y, después de subir, se muestra el veredicto | Raúl | `components/integrante` y `lib/integrante/rutas.ts`. Lo visual lo define Abdiel |
| Una clave de Trustless Work que el servicio acepte. Desplegar el escrow, USDC de testnet, `npm run hito` y el hash. El Acta solo después de un pago real | Sebas | El 401 del 28 de septiembre y el campo `hashPago`, que sigue vacío |
| Que los dos roles se vean en vivo, y que la IA reaccione al rol | Pendiente de Josué (consulta) y de Esteban (la ruta de revisión) | No está en el código. Abdiel lo diseña sin darlo por hecho |

`--acento` es `#B7EE34` y `--sobre-acento` es `#08090C`, en `app/globals.css`. La tipografía es Poppins.

## Cómo correrlo

```bash
npm ci
npm run dev
npm test
npm run build
npm run hito
npm run db:migrar
npm run db:semilla
```

`npm run dev` abre Next.js. `npm test` corre las pruebas de `lib/integrante`, `lib/admin`, `lib/escrow`, `lib/revision`, `lib/db`, `lib/sesion` y `lib/api` con `tsx`. `npm run hito` ejecuta `scripts/hito-prueba.ts`. Sin `TRUSTLESS_API_KEY` termina avisando que falta la clave y que no hay pago. `npm run db:migrar` y `npm run db:semilla` necesitan `DATABASE_URL`. No hay `npm run lint`.

## Variables de entorno

Solo nombres. Los valores van en Vercel, no en el repo. El código lee `NEXT_PUBLIC_CAVOS_APP_ID`, `TRUSTLESS_API_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `GROQ_API_KEY`, `LAYA_URL` y, si existe, `LAYA_API_KEY`.

| Nombre | Para qué | Dueño |
|---|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | App de Cavos. Ya está en Vercel y es el correcto | Sebas |
| `TRUSTLESS_API_KEY` | Trustless Work, solo en el servidor. La leen `npm run hito` y `/api/firma`. Sin ella no hay pago | Sebas |
| `DATABASE_URL` | Neon. La leen las rutas y `npm run db:migrar` | Esteban |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, almacén privado. La lee `POST /api/evidencias` | Esteban |
| `GROQ_API_KEY` | Qwen 3.8 27B (`qwen/qwen3.8-27b`). Sin ella, o si Groq falla, la revisión usa el guion fijo | Esteban |
| `LAYA_URL` | Laya en la PC de Abdiel. Sin ella, la revisión usa el stub | Abdiel |

`.env.example` declara los nombres. `LAYA_API_KEY` es opcional: si está, la revisión la manda a Laya.

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
