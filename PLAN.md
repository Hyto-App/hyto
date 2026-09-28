# Plan para empezar a codear Hyto

El contrato está en [STACK.md](STACK.md) y [ROLES.md](ROLES.md). Cada quien avanza su lista en orden. No espera a otra persona salvo el único dato marcado como encuentro.

Nadie sube directo a `main`. Cada entrega va en una rama `nombre/tarea` y entra por pull request. Ejemplos: `sebas/escrow`, `esteban/neon-blob`, `abdiel/pantallas`, `josue/admin`, `raul/mis-tareas`. Cuando esa parte se mergea, la siguiente tarea abre otra rama desde `main` actualizado. No se reutiliza la misma rama para todo el proyecto.

El demo a mostrar sigue siendo el de ZEEK: 3 tareas de trabajo, 1 reembolso, un hito sin foto, y el informe.

## Qué puede hacerse solo

- **Sebas** no necesita la app, Neon ni las pantallas. Prueba el dinero con un script y cuatro cuentas de testnet propias.
- **Esteban** no necesita el escrow ni Laya encendida. La revisión usa un stub de Laya y el guion fijo hasta que exista `LAYA_URL`.
- **Abdiel** no necesita código. Dibuja las pantallas y levanta Laya en su PC.
- **Josué** arma las pantallas del admin con datos fijos. El botón de Cavos usa el `appId` cuando Sebas lo publique; mientras tanto la pantalla ya existe.
- **Raúl** arma Mis tareas y la cámara contra la forma de la API de Esteban, con respuestas de ejemplo. Las cuatro wallets esperan el `appId`.

## Sebas, en este orden

1. Crear la app de Cavos en el dashboard. Publicar `NEXT_PUBLIC_CAVOS_APP_ID`. Ese es el único dato que desbloquea a Josué y a Raúl, y sale de este primer paso.
2. Dos cuentas de prueba suyas: organizador y receptor. Trustline de USDC, emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
3. API key de Trustless Work. Desplegar un multi-release v2 en `https://beta.api.trustlesswork.com`. Admin del contrato es otra dirección. El organizador está en aprobadores y en firmantes de liberación. Un hito, con monto y receptor.
4. Fondear y liberar con `approve-and-release`. Cavos firma con `signXdr`. El envío es `POST /stellar/send-transaction`. Si ese endpoint rechaza el fee-bump, la cuenta se fondea con Friendbot y se reintenta.
5. Si el beta no libera el hito, cambiar la base a `https://dev.api.trustlesswork.com` y repetir el mismo script. La app no se reescribe.
6. Dejar un módulo que reciba la acción (fondear, marcar estado, aprobar y liberar) y devuelva el XDR, y que acepte el XDR firmado y lo envíe. Josué lo llama después. Hasta entonces el módulo se prueba solo.
7. Acta, al final de su lista y solo si el paso 4 ya pagó. Una credencial, clave de servidor de [dapp.acta.build](https://dapp.acta.build). Si no hay pago, no se hace. No usar `credential-escrow`.

## Esteban, en este orden

1. Neon y Blob privado. `DATABASE_URL` y `BLOB_READ_WRITE_TOKEN`.
2. Tablas: proyecto, tarea (trabajo o reembolso, monto, tope, condición, wallet de cobro), evidencia (id de Blob), veredicto y hash de pago (campo vacío hasta que Sebas lo tenga).
3. Rutas: crear proyecto, crear tareas, subir foto a Blob, listar tareas, leer una evidencia.
4. Ruta de revisión. Lee la foto en Blob. Groq `meta-llama/llama-4-scout-17b-16e-instruct` en `https://api.groq.com/openai/v1` describe la foto. Si es reembolso, saca monto y fecha y el código compara el tope. Llama a `LAYA_URL` si existe. Si no, un stub devuelve `choice`, `noul` y `score`. El código arma `cumplió`, `parcial` o `insuficiente`. Sin `GROQ_API_KEY` o si Groq falla, guion fijo. La justificación es el texto de Scout más las tres respuestas.
5. Ruta del informe leyendo esas tablas. El enlace "Ver pago" usa el hash cuando exista; si no, el informe igual se abre.

## Abdiel, en este orden

1. Seis pantallas, un botón por pantalla, fondo claro, Inter. Inicio del admin (tres números y bandeja), crear proyecto, Mis tareas, subir evidencia, revisión (foto, tarjeta corta, Aprobar), informe. Sin las palabras escrow, XDR, trustline ni Soroban.
2. Color de acento.
3. En su Windows: `pip install laya`, checkpoint `laya-multilingual`. Una URL pública en `LAYA_URL`. `localhost` no sirve para Vercel. Esa PC queda encendida en el ensayo.

## Josué, en este orden

1. Next.js 16.3.6, TypeScript, Tailwind, App Router, en este repo, conectado a Vercel. El 30 de septiembre, subir a 16.3.7.
2. Layout del admin y las pantallas de su lista con datos fijos, según el orden de Abdiel cuando exista. Si las pantallas aún no están, usa la lista de [STACK.md](STACK.md) y luego ajusta el acento.
3. Botón Entrar con Cavos (`network: "testnet"`, `appSalt` fijo `hyto`) en cuanto el `appId` esté en el repo.
4. Cambiar los datos fijos por las rutas de Esteban.
5. Fondear y Aprobar llaman al módulo de Sebas: construir XDR, firmar, enviar. Una firma en Aprobar.
6. Informe imprimible. Presupuesto contra gasto, detalle por persona, "Ver pago", y la credencial de Acta solo si el enlace existe.

Revisa el código de Raúl cuando lo abra, sin bloquear el suyo.

## Raúl, en este orden

1. Pantalla Mis tareas: monto y estado. Pantalla Subir evidencia: cámara y enviar. Trabajo y reembolso son la misma pantalla. En el reembolso, monto y fecha se muestran cuando la revisión los traiga.
2. Esas pantallas llaman las rutas de Esteban. Mientras no respondan, usa los ejemplos del paso 3 de Esteban.
3. Con el `appId` de Sebas, cuatro identidades: organizador y tres voluntarios. Cada una muestra `G…` y trustline de USDC. Sebas solo confirma que cobran. No instalar Freighter.

## Lo único que hay que pasar de una persona a otra

- Sebas publica el `appId`. Josué lo pone en el botón. Raúl crea las cuatro cuentas del demo.
- Esteban publica las rutas. Josué y Raúl dejan los datos de ejemplo.
- Sebas publica el módulo de firma. Josué lo conecta a Fondear y Aprobar.
- Abdiel publica `LAYA_URL`. Esteban cambia el stub por esa URL.
- El hash que guarda Sebas llena el campo que Esteban ya dejó en el informe.
