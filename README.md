# Hyto

Control de gastos y pagos por hitos. El presupuesto queda en un escrow multi-release de Trustless Work sobre Stellar testnet. El integrante sube una foto, la IA recomienda y el admin aprueba cada pago en USDC.

El demo es un evento de ZEEK. Organización: [Hyto-App](https://github.com/Hyto-App/hyto).

## Estado al 29 de septiembre de 2026

En `main`, a las 10:45 a.m. del 29 de septiembre, hora de Costa Rica, está el PR #23 de Josué Valles (squash `fca79a2`): `POST /api/sesion` verifica la firma, el emisor y el vencimiento del JWT de Cavos. Sin `CAVOS_JWT_JWK` ni `CAVOS_JWKS_URL` no hay sesión. Crear un proyecto, revisar, preparar o enviar un pago, y subir una evidencia piden la cookie `hyto_sesion`. Subir evidencia solo acepta la tarea de ese integrante. Un 401 o un 403 no se guarda como ejemplo. A las 10:14 a.m. está el PR #28 (squash `7256c56`): Entrar muestra avisos claros, un 429 cuenta los segundos y desactiva «Enviar código», y hay un respiro de 20 segundos tras cada envío. A las 10:13 a.m. está el PR #25 (squash `99b8aa4`): `npm run db:comparar-esquema` cruza las migraciones con una copia, en solo lectura, y no escribe en la base. A las 10:10 a.m. está el PR #24 (squash `5b8f242`): `npm run db:esquema` inventaría el esquema desde el código, sin abrir Neon. A las 10:03 a.m. está el PR #21 (squash `9508e0c`): Postgres en esta máquina con `docker compose` y `npm run db:local`, y la semilla de ZEEK en pendiente con evidencia de ejemplo. A las 9:50 a.m. está el PR #22 (squash `7c64a54`): la configuración del entorno en un solo lugar y la salvaguarda para no migrar una base de producción sin confirmación. A las 9:44 a.m. está el PR #27 (squash `d26a443`): pruebas contra un Postgres local. A las 9:16 a.m. entró el PR #20 (squash `36fd91a`), que precisa `.env.example` sin valores. Antes, el 28 a las 11:40 p.m., el PR #14 de Esteban (Psybre, squash `ce9ff7c`) dejó Neon, Blob, las rutas y el ingreso con Cavos. También están el PR #1 de Raúl (squash `3a000e0`), el PR #3 de Josué (squash `b2451a6`, el 28 cerca de las 7:42 a.m.), el PR #7 de Abdiel Cole (squash `cff4512`, a las 2:58 p.m.), la auditoría del integrante (PR #4, squash `bc94a9c`, a las 3:47 p.m.) y el PR #8 de Sebas (squash `ae10a9e`, a las 3:48 p.m.). Las horas son de Costa Rica. El esqueleto, el admin, la marca (Poppins y lima), el módulo de firma y el backend están hechos. `NEXT_PUBLIC_CAVOS_APP_ID` ya está en Vercel y es el correcto. Falta poner `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `GROQ_API_KEY` y una de `CAVOS_JWT_JWK` o `CAVOS_JWKS_URL` en Vercel, y crear el almacén privado. Las tablas y la semilla de ZEEK ya se corrieron en la base. Sin la base o el almacén de fotos, las rutas que los usan responden 503 y las pantallas siguen con el ejemplo. Sin la clave del JWT no hay sesión. Siguen pendientes Sebas (un pago en USDC; sin ese pago no hay Acta), Abdiel (`LAYA_URL` y una clave compartida) y Josué (conectar la bandeja, Fondear y Aprobar, y el regreso de Google del PR #18, que no está en `main`). Fondear y Aprobar todavía no usan el módulo.

| Hecho | Dueño |
|---|---|
| Proyecto Next.js 16.3.6: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `next.config.ts` | Raúl |
| Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas` | Raúl |
| Esqueleto y admin: bandeja en `/`, crear proyecto, revisión y aprobar, informe imprimible. Mis tareas sigue en `/mis-tareas`. Ejemplo de ZEEK. Fondear y Aprobar no firman en Stellar | Josué |
| Botón Entrar. Cavos (`testnet`, `appSalt` `hyto`) solo si hay `NEXT_PUBLIC_CAVOS_APP_ID`. El ingreso pide el código al correo, o Google, y guarda la dirección solo si no hay aviso. Los fallos se dicen en claro: un 429 cuenta los segundos, desactiva «Enviar código» y deja 20 segundos de respiro tras cada envío (PR #28). `POST /api/sesion` verifica el JWT (PR #23). Sin clave de firma no hay cookie | Josué, ingreso de Esteban |
| Marca: Poppins 400, 500 y 600, acento lima `#B7EE34` y texto del botón `#08090C` | Abdiel |
| Módulo de firma (`lib/escrow`), `POST /api/firma`, `POST /api/firma/enviar` y el script `npm run hito`. Sin hash de pago en el repositorio. Esas dos rutas exigen la sesión del organizador, y esa sesión exige un JWT verificado (PR #23) | Sebas, sesión de Josué sobre el ingreso de Esteban |
| Neon con Drizzle, Blob privado, `GET /api/tareas`, `POST /api/evidencias`, `GET /api/evidencias/:id`, `GET /api/evidencias/:id/foto`, `GET` y `POST /api/proyectos`, `GET /api/informe`, `GET` y `POST /api/revision/:id` y `POST /api/sesion`. Seed de ZEEK. Revisión con Qwen 3.8 27B, stub de Laya y guion fijo. Entrar usa CavosAuth y busca el rol por correo | Esteban, PR #14 |
| `.env.example` describe alcance, obligatoriedad y qué pasa si falta cada variable. Sin valores | Josué, PR #20 |
| Configuración en `lib/config`. `npm run verificar:entorno` revisa `.env.local` sin imprimir valores. La migración y la semilla se detienen si `DATABASE_URL` apunta a un host de `HYTO_HOST_BASE_PRODUCCION` y no hay `HYTO_CONFIRMAR_BASE_PRODUCCION=si`. El pooler de Neon cuenta como el host directo | Josué, PR #22 |
| `npm run test:integracion` contra Postgres local. Si no hay base, o si la dirección no es local, se omite. El regreso de Google queda como fallo esperado (PR #18, abierto) | Josué, PR #27 |
| Postgres local: `docker compose` (Postgres 16 en `127.0.0.1:5432`) y `npm run db:local` migran y siembran. Si el host no es Neon, la migración usa el protocolo de Postgres. La semilla deja las tareas en pendiente, con evidencia de ejemplo. Pedir otra foto borra el veredicto. Sembrar de nuevo no pisa un pago ni una foto real | Josué, PR #21 |
| Inventario del esquema desde el código, sin abrir Neon: `npm run db:esquema` escribe `scripts/backend-traspaso/esquema-inventario.json` | Josué, PR #24 |
| Cruce del esquema contra `information_schema` de una copia, en solo lectura: `npm run db:comparar-esquema`. No escribe en la base | Josué, PR #25 |
| Verificación del JWT de Cavos en `POST /api/sesion`. Sin `CAVOS_JWT_JWK` ni `CAVOS_JWKS_URL` no hay sesión. `HYTO_PERMITIR_JWT_SIN_FIRMA=1` solo vale fuera de producción. Subir evidencia pide la cookie, solo acepta la tarea del integrante y no pisa `walletCobro` de otra persona. Un 401 o un 403 no se guarda como ejemplo | Josué, PR #23 |
| Auditoría del integrante: no mezcla tareas, no inventa US$0 ni corre el día de una fecha, abre USDC si la cuenta ya existe, y cierra fallos de la cámara | Josué (coautor), PR #4 |
| `npm ci`, `npm test` y `npm run build` pasan. No hay ESLint ni script `lint` | Raúl |

Las pantallas usan tres tareas de trabajo de US$20 y un reembolso de hasta US$15. Si la API no responde, se muestra ese ejemplo.

| Pendiente | Dueño |
|---|---|
| Un pago de prueba en USDC con `npm run hito` y `TRUSTLESS_API_KEY`. El Acta solo después de ese pago. El hash no está en el repositorio | Sebas |
| Poner en Vercel `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `GROQ_API_KEY` y una de `CAVOS_JWT_JWK` o `CAVOS_JWKS_URL`, y crear el almacén privado. Si se usan el código y Google, `CAVOS_JWT_ISSUER` lista los dos emisores. Sin la clave del JWT no hay sesión (PR #23). La documentación de Cavos no la publica. Las tablas y la semilla de ZEEK ya se corrieron en la base. El código ya las lee. Para migrar un host listado como producción, `HYTO_CONFIRMAR_BASE_PRODUCCION` tiene que valer `si`. Confirmar lo que marquen el inventario (PR #24) y el cruce de solo lectura (PR #25) | Esteban |
| `LAYA_URL` en su servidor, y acordar con Esteban una clave porque ese enlace es público | Abdiel |
| Conectar la bandeja, la revisión y el informe a las rutas, y Fondear y Aprobar a `POST /api/firma` y `POST /api/firma/enviar`. Esas dos rutas ya piden la sesión del organizador y el JWT verificado (PR #23). El envío devuelve el hash y no lo guarda en la tarea. Pedir otra foto ya borra el veredicto (PR #21). Entrar ya avisa en claro (PR #28). Un 401 o un 403 al subir no se guarda como ejemplo. El regreso de Google (PR #18) sigue abierto | Josué |
| El 30 de septiembre, subir Next.js a 16.3.7 | Josué |
| Cuatro cuentas de Cavos del demo. El ingreso pide el código del correo de cada cuenta. Subir una evidencia exige la cookie de sesión y la tarea de ese integrante (PR #23). La base tiene que estar sembrada | Raúl |

`--acento` es `#B7EE34` y `--sobre-acento` es `#08090C`, en `app/globals.css`. La tipografía es Poppins.

## Cómo correrlo

```bash
npm ci
npm run dev
npm test
npm run test:integracion
npm run verificar:entorno
npm run build
npm run hito
npm run db:migrar
npm run db:semilla
docker compose up -d
npm run db:local
npm run db:esquema
npm run db:comparar-esquema
```

`npm run dev` abre Next.js. `npm test` corre las pruebas de `lib/integrante`, `lib/admin`, `lib/auth`, `lib/escrow`, `lib/revision`, `lib/db`, `lib/sesion`, `lib/api` y `lib/config`, las de `scripts/backend-traspaso`, y desde el PR #27 también la guardia de la base local y la cookie de sesión de prueba, con `tsx`. `npm run test:integracion` recorre las rutas y las pantallas del admin contra Postgres en esta máquina (por defecto `127.0.0.1:5432`, base `hyto_integracion`; se puede cambiar con `HYTO_TEST_DATABASE_URL`). Si no hay base, o si el host no es `localhost`, `127.0.0.1`, `::1` ni un servicio de Docker, avisa y no conecta. `npm run verificar:entorno` revisa `.env.local` y no imprime valores. `npm run hito` ejecuta `scripts/hito-prueba.ts` y carga `.env.local`. Sin `TRUSTLESS_API_KEY` termina avisando que falta la clave y que no hay pago. `npm run db:migrar` y `npm run db:semilla` cargan `.env.local`, necesitan `DATABASE_URL` y se detienen si esa URL apunta a un host de producción listado y no hay confirmación `si`. Si el host no es Neon, esas dos usan el protocolo de Postgres (PR #21): el cliente HTTP de Neon reescribía `127.0.0.1`. `npm run db:local` hace lo mismo en esta máquina. Sin `DATABASE_URL` usa `postgres://hyto:hyto@127.0.0.1:5432/hyto`, rechaza otro host, levanta `docker compose` si el puerto está cerrado y hay Docker, crea la base si falta, migra y siembra. La semilla deja las tareas en pendiente. `npm run db:esquema` inventaría el esquema desde el código y no abre la base (PR #24). `npm run db:comparar-esquema` cruza las migraciones con `information_schema` de una copia, en una transacción de solo lectura, y no escribe (PR #25). Usa `DATABASE_URL` de esa copia, nunca la de producción. No hay `npm run lint`.

## Variables de entorno

Solo nombres. Los valores van en Vercel, no en el repo. El catálogo está en `lib/config` (PR #22). El PR #20 dejó en `.env.example` el alcance, si cada una es obligatoria y qué hace el código si falta. El código lee `NEXT_PUBLIC_CAVOS_APP_ID`, `TRUSTLESS_API_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `GROQ_API_KEY`, `LAYA_URL` y, si existe, `LAYA_API_KEY`. También lee `HYTO_HOST_BASE_PRODUCCION` y `HYTO_CONFIRMAR_BASE_PRODUCCION`, que el ejemplo deja vacías. Desde el PR #23 lee `CAVOS_JWKS_URL`, `CAVOS_JWT_ISSUER`, `CAVOS_JWT_AUDIENCE`, `CAVOS_JWT_JWK` y `HYTO_PERMITIR_JWT_SIN_FIRMA`. Sin `CAVOS_JWT_JWK` y sin `CAVOS_JWKS_URL` no hay sesión. `NODE_ENV` no se declara: lo pone Next.js. En producción la cookie `hyto_sesion` lleva Secure. No hay `GOOGLE_CLIENT_ID`: Google entra por Cavos. La clave de servidor de Cavos (`cav_…`) sigue sin nombre en el código.

| Nombre | Para qué | Dueño |
|---|---|---|
| `NEXT_PUBLIC_CAVOS_APP_ID` | App de Cavos. Pública, no es una clave. Ya está en Vercel y es el correcto. Sin ella no se llama a Cavos | Sebas |
| `TRUSTLESS_API_KEY` | Trustless Work, solo en el servidor. Obligatoria para pagar. La leen `npm run hito` y `/api/firma`. Sin ella la API responde 503 y el script sale con código 2 | Sebas |
| `DATABASE_URL` | Neon, solo en el servidor. Obligatoria para la base. Sin ella las rutas responden 503 y la migración sale con código 1 | Esteban |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, almacén privado. Obligatoria para fotos. Sin ella subir y leer la foto responden 503 | Esteban |
| `GROQ_API_KEY` | Qwen 3.8 27B (`qwen/qwen3.8-27b`). Opcional. Sin ella, o si Groq falla, la revisión usa el guion fijo | Esteban |
| `LAYA_URL` | Laya en el servidor de Abdiel. Opcional. Sin ella, después de Groq la revisión usa el stub | Abdiel |
| `LAYA_API_KEY` | Opcional. Si tiene valor, la revisión la manda a Laya. Si falta, Laya se llama igual, sin esa cabecera | Abdiel, con Esteban |
| `HYTO_HOST_BASE_PRODUCCION` | Host de la base de producción, o varios separados por coma. La migración y la semilla lo comparan con `DATABASE_URL`. Sin él avisan y siguen. Si un host no se puede leer, no migran. No va un host real en el ejemplo | Esteban |
| `HYTO_CONFIRMAR_BASE_PRODUCCION` | El único valor que habilita migrar o sembrar un host de esa lista es `si`. En el ejemplo queda vacía | Esteban |
| `CAVOS_JWT_JWK` | JWK público para verificar la firma RS256. Tiene prioridad sobre `CAVOS_JWKS_URL`. Sin esta y sin esa URL no hay sesión | Esteban |
| `CAVOS_JWKS_URL` | Una o varias URLs https, separadas por coma, con las claves públicas. Si hay tantas como emisores, cada una verifica al suyo, en el mismo orden. Un JWKS vacío no se cachea | Esteban |
| `CAVOS_JWT_ISSUER` | Emisores permitidos, separados por coma. Vacío: no se comprueba el emisor. Con código y Google hay que listar los dos | Esteban |
| `CAVOS_JWT_AUDIENCE` | Opcional. Si tiene valor, el `aud` del JWT tiene que coincidir | Esteban |
| `HYTO_PERMITIR_JWT_SIN_FIRMA` | Solo desarrollo. El valor exacto es `1`. En producción se ignora. Sin clave, lee el JWT sin comprobar la firma | Esteban |

`.env.example` no trae valores. `npm run verificar:entorno` no los imprime.

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
