# Plan para empezar a codear Hyto

El contrato está en [STACK.md](STACK.md) y [ROLES.md](ROLES.md). Cada quien avanza su lista en orden. No espera a otra persona salvo el único dato marcado como encuentro.

Nadie sube directo a `main`. Todo el trabajo se hace en la nube (agentes de Cursor Cloud o Claude Code en la web). Cada entrega va en una rama `nombre/tarea` y entra por pull request. Ejemplos: `sebas/escrow`, `esteban/neon-blob`, `abdiel/pantallas`, `josue/admin`, `raul/cuentas`. Cuando esa parte se mergea, la siguiente tarea abre otra rama desde `main` actualizado:

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b nombre/tarea
```

No se reutiliza la misma rama para todo el proyecto.

El demo a mostrar sigue siendo el de ZEEK: 3 tareas de trabajo, 1 reembolso, un hito sin foto, y el informe.

## Qué puede hacerse solo

- **Sebas** no necesita la app, Neon ni las pantallas. Prueba el dinero con un script y cuatro cuentas de testnet propias. El `appId` sigue sin publicarse.
- **Esteban** no necesita el escrow ni Laya encendida. La revisión usa un stub de Laya y el guion fijo hasta que exista `LAYA_URL`. Las pantallas de Raúl ya llaman sus rutas y caen al ejemplo si no responden.
- **Abdiel** no necesita código. Dibuja las seis pantallas y levanta Laya en su PC. El acento del CSS es provisional.
- **Josué** ya dejó el esqueleto y las pantallas del admin en `main` (PR #3). No recreó el proyecto: usa la base del PR #1. Los datos son el ejemplo de ZEEK. Fondear y Aprobar no firman. El botón de Cavos usa el `appId` cuando Sebas lo publique.
- **Raúl** ya dejó Mis tareas, Subir evidencia y `/cuentas` en `main` (PR #1). Las cuatro wallets esperan el `appId`.

## Sebas, en este orden

1. Crear la app de Cavos en el dashboard. Publicar `NEXT_PUBLIC_CAVOS_APP_ID` en Vercel. Ese es el único dato que desbloquea las cuentas de Raúl y el botón de Josué. Hoy no está.
2. Dos cuentas de prueba suyas: organizador y receptor. Trustline de USDC, emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
3. API key de Trustless Work. Desplegar un multi-release v2 en `https://beta.api.trustlesswork.com`. Admin del contrato es otra dirección. El organizador está en aprobadores y en firmantes de liberación. Un hito, con monto y receptor.
4. Fondear y liberar con `approve-and-release`. Cavos firma con `signXdr`. El envío es `POST /stellar/send-transaction`. Si ese endpoint rechaza el fee-bump, la cuenta se fondea con Friendbot y se reintenta.
5. Si el beta no libera el hito, cambiar la base a `https://dev.api.trustlesswork.com` y repetir el mismo script. La app no se reescribe.
6. Dejar un módulo que reciba la acción (fondear, marcar estado, aprobar y liberar) y devuelva el XDR, y que acepte el XDR firmado y lo envíe. Josué lo llama después. Hasta entonces el módulo se prueba solo.
7. Acta, al final de su lista y solo si el paso 4 ya pagó. Una credencial, clave de servidor de [dapp.acta.build](https://dapp.acta.build). Si no hay pago, no se hace.

## Esteban, en este orden

1. Neon y Blob privado. `DATABASE_URL` y `BLOB_READ_WRITE_TOKEN`.
2. Tablas: proyecto, tarea (trabajo o reembolso, monto, tope, condición, wallet de cobro), evidencia (id de Blob), veredicto y hash de pago (campo vacío hasta que Sebas lo tenga).
3. Rutas que las pantallas ya llaman. El contrato está más abajo. Mientras no respondan, la UI sigue con el ejemplo de ZEEK.
4. Ruta de revisión. Lee la foto en Blob. Groq `meta-llama/llama-4-scout-17b-16e-instruct` en `https://api.groq.com/openai/v1` describe la foto. Si es reembolso, saca monto y fecha y el código compara el tope. Llama a `LAYA_URL` si existe. Si no, un stub devuelve `choice`, `noul` y `score`. El código arma `cumplió`, `parcial` o `insuficiente`. Sin `GROQ_API_KEY` o si Groq falla, guion fijo. La justificación es el texto de Scout más las tres respuestas.
5. Ruta del informe leyendo esas tablas. El enlace "Ver pago" usa el hash cuando exista; si no, el informe igual se abre.

## Contrato que ya esperan las pantallas

Cliente en `lib/integrante/rutas.ts`. Timeout de 4 segundos. Si falla la red, el estado o el JSON, Mis tareas y Subir evidencia vuelven al ejemplo y lo dicen en pantalla.

`GET /api/tareas?miembro=<id>&wallet=<opcional>`

- `Content-Type` con `json`.
- Cuerpo: un arreglo de tareas, o `{ "tareas": [ ... ] }`.
- Cada tarea necesita `id`, `titulo` y `tipo` (`trabajo` o `reembolso`).
- `estado`: `pendiente`, `en revisión` o `pagado`. Si falta, queda `pendiente`.
- También se leen `proyectoId`, `monto`, `tope`, `condicion`, `miembroId` y `walletCobro`. Montos y tope van como texto.
- La pantalla filtra por `wallet` si alguna tarea coincide; si no, por `miembro`. Si ninguna trae `miembroId` ni `walletCobro`, muestra todas.

`POST /api/evidencias`

- `multipart/form-data`: `tareaId`, archivo `foto` (nombre `evidencia.jpg`) y, si existen, `miembroId` y `wallet`.
- Respuesta JSON: la evidencia, o `{ "evidencia": { ... } }`, con `id`.
- Se leen `tareaId`, `blobId`, `monto` y `fecha`. En un reembolso, monto y fecha solo se muestran si vienen los dos.

`GET /api/evidencias/:id`

- Misma forma que la respuesta del POST. Si este GET falla y el POST sí respondió, se usa lo que devolvió el POST.

El ejemplo local (no hace falta devolverlo) son las tareas `stand`, `registro` y `bienvenida` (US$20, trabajo) y `comida` (reembolso, tope US$15), proyecto `zeek`.

## Abdiel, en este orden

1. Seis pantallas, un botón por pantalla, fondo claro, Inter. Inicio del admin (tres números y bandeja), crear proyecto, Mis tareas, subir evidencia, revisión (foto, tarjeta corta, Aprobar), informe. Sin las palabras escrow, XDR, trustline ni Soroban. Mis tareas y subir evidencia ya están construidas con el acento provisional.
2. Color de acento. Hoy `--acento` es `#1c1c1c`.
3. En su Windows: `pip install laya`, checkpoint `laya-multilingual`. Una URL pública en `LAYA_URL`. `localhost` no sirve para Vercel. Esa PC queda encendida en el ensayo.

## Josué, en este orden

1. La base Next.js 16.3.6, TypeScript, Tailwind y App Router ya está en `main` (PR #1). No la recrees. El 30 de septiembre, subir a 16.3.7.
2. Hecho en el PR #3: layout del admin y las pantallas con datos fijos de ZEEK. `/` es la bandeja. El acento sigue provisional.
3. El botón Entrar ya está (`network: "testnet"`, `appSalt` fijo `hyto`). Llama a Cavos solo cuando el `appId` esté en Vercel.
4. Cambiar los datos fijos por las rutas de Esteban. Sigue pendiente.
5. Fondear y Aprobar llaman al módulo de Sebas: construir XDR, firmar, enviar. Una firma en Aprobar. Hoy no firman en Stellar.
6. Hecho en el PR #3: informe imprimible. Presupuesto contra gasto, detalle por persona, "Ver pago", y la credencial de Acta solo si el enlace existe.

El esqueleto y el admin ya están en `main`. Lo que sigue espera las rutas de Esteban y el módulo de Sebas.

## Raúl, en este orden

1. Hecho en el PR #1: Mis tareas (monto y estado) y Subir evidencia (cámara y enviar). Trabajo y reembolso son la misma pantalla. En el reembolso, monto y fecha se muestran cuando la revisión los trae.
2. Esas pantallas ya llaman las rutas de arriba. Mientras no respondan, usan el ejemplo de ZEEK.
3. Con el `appId` de Sebas, cuatro identidades en `/cuentas`: organizador y tres voluntarios. Cada una muestra `G…` y trustline de USDC. Sebas solo confirma que cobran. Sin el `appId`, el botón avisa que esperan el identificador de Cavos.

## Lo único que hay que pasar de una persona a otra

- Sebas publica el `appId`. Josué lo pone en el botón. Raúl crea las cuatro cuentas del demo.
- Esteban publica las rutas. Josué y Raúl dejan los datos de ejemplo.
- Sebas publica el módulo de firma. Josué lo conecta a Fondear y Aprobar.
- Abdiel publica `LAYA_URL`. Esteban cambia el stub por esa URL.
- El hash que guarda Sebas llena el campo que Esteban ya dejó en el informe.

## Bitácora

### 2026-09-28

PR #1 de Raúl mergeado en `main` (squash `3a000e0`). Entró la base de Next.js 16.3.6 y las pantallas del integrante: Mis tareas, Subir evidencia (trabajo y reembolso) y `/cuentas`. Los datos en pantalla son el ejemplo de ZEEK hasta que existan `GET /api/tareas`, `POST /api/evidencias` y `GET /api/evidencias/:id`. `NEXT_PUBLIC_CAVOS_APP_ID` no está. `--acento` sigue provisional. No hay ESLint ni script `lint`. En ese PR, `npm ci`, `npm test` y `npm run build` pasan. Siguen pendientes Neon, Blob, el escrow, el Acta y Laya.

PR #3 de Josué mergeado en `main` (squash `b2451a6`), el 28 de septiembre cerca de las 7:42 a.m., hora de Costa Rica. Entraron las pantallas del admin con el ejemplo de ZEEK, sin recrear el proyecto: crear proyecto, bandeja de evidencias, revisión y aprobar, e informe imprimible. `/` es la bandeja (presupuesto, pagado, pendiente y lo que falta aprobar). En la revisión, Pedir otra foto es un enlace. El informe muestra presupuesto contra gasto y el detalle por persona. "Ver pago" y la credencial solo se dibujan si el enlace existe; en el ejemplo no existen. Entrar usa Cavos con `network: "testnet"` y `appSalt` `hyto` únicamente cuando `NEXT_PUBLIC_CAVOS_APP_ID` tiene valor. Fondear y Aprobar no firman en Stellar. El esqueleto y el admin de Josué quedan hechos. Siguen pendientes Esteban (base de datos, rutas `/api` y la revisión con IA) y Sebas (el `appId` de Cavos, el escrow y la firma). Next.js se queda en 16.3.6; el parche 16.3.7 es el 30 de septiembre. Queda un detalle menor de auditoría: en `components/admin/Entrar.tsx:46`, `setDireccion` solo debe llamarse cuando `guardado.aviso` es null, para que se pueda reintentar el guardado.
