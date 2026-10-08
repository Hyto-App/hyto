# Demo del 12 de octubre

Este demo es un evento de ejemplo para rendir cuentas de un gasto. No es un piloto y no mueve dinero real. El hash de la tarea marcada como pagada es un marcador, no una transacción de testnet.

Este documento es para Raúl, antes del wipe que van a decidir Jayden y Josué. Aquí no se borra nada. El backup solo lee. La semilla solo inserta filas que todavía no existen. Nadie corrió estos comandos contra Neon al dejarlos en el repo.

El wipe del enclave de Cavos y de las cuentas nuevas lo hacen Jayden y Josué. Estos scripts no lo hacen.

## Sacar el backup

Hazlo antes del wipe, en una terminal donde ya exportaste `DATABASE_URL`. El script no abre `.env` ni `.env.local`.

```bash
export DATABASE_URL="postgres://…"
bash scripts/db/backup.sh
```

También vale `npm run db:backup`.

El archivo queda en `~/hyto-backups/hyto-AAAAMMDDTHHMMSSZ.dump`. Para otro directorio, fuera del repo:

```bash
export HYTO_BACKUP_DIR="$HOME/hyto-backups"
```

`pg_dump` solo lee. El archivo es formato custom (`--format=custom`), sin `--clean`. Si el directorio de salida cae dentro del repo, el script se detiene. El patrón `hyto-*.dump` está en `.gitignore` por si alguien copia el archivo al árbol.

Hace falta el cliente `pg_dump` (`postgresql-client`).

## Restaurar

Restaurar escribe en la base de destino. No hay script que lo haga. No lo corras contra producción salvo que Jayden o Josué lo pidan para recuperar este backup.

```bash
pg_restore --no-owner --no-privileges --dbname "$DATABASE_URL" "$HOME/hyto-backups/hyto-AAAAMMDDTHHMMSSZ.dump"
```

Sin `--clean`, el comando no borra lo que ya está. Si las tablas ya existen, puede fallar al crearlas. `--clean` sí quita objetos antes de crearlos: por eso no está en el script de backup y no se usa aquí.

## Sembrar después del wipe

Cuando la base ya esté vacía (o cuando quieras sumar el demo sin tocar el resto):

1. Aplica las migraciones. `drizzle/0007_requisitos_rechazo.sql` puede seguir pendiente en Neon. La semilla escribe `tareas.requisitos`, `tareas.rechazo` y `veredictos.mile`. Si esas columnas no están, se detiene y no inserta nada.

```bash
npm run db:migrar
```

`db:migrar` pide `HYTO_CONFIRMAR_BASE_PRODUCCION=si` cuando `DATABASE_URL` apunta a un host de `HYTO_HOST_BASE_PRODUCCION`. Esa confirmación la pone quien opera la base. Este documento no la enciende.

2. Mira el plan, sin abrir la base:

```bash
export HYTO_SEED_DEMO=1
npm run db:seed-demo -- --dry-run
```

`HYTO_SEED_DEMO` tiene que ser exactamente `1`, en la terminal. El cargador de `.env.local` no lo lee, así que no se dispara solo.

3. Inserta:

```bash
export HYTO_SEED_DEMO=1
npm run db:seed-demo
```

La URL la toma del entorno. Si falta, la lee de `.env.local`, igual que `npm run db:semilla`. Si el host es de producción, hace falta la misma confirmación que en `db:migrar`. La semilla igual solo inserta.

Correrla dos veces es seguro: `insert … on conflict do nothing`. Lo que ya está se queda como está. No hay `DELETE`, `TRUNCATE` ni `DROP`.

## Qué crea

Un evento, `Feria demo 12 oct` (`demo-12-oct`), con cuatro personas de mentira (`@example.com`):

| Persona | Correo | Rol en el evento |
|---|---|---|
| Olivia Organizer | organizer.demo@example.com | organizer |
| Taylor Team | team.demo@example.com | team |
| Ana Volunteer | ana.volunteer.demo@example.com | volunteer |
| Luis Volunteer | luis.volunteer.demo@example.com | volunteer |

El rol global de Olivia es `organizador`. Los otros tres quedan como `voluntario`, que es lo que Hyto guarda fuera del evento. Quien ve todas las tareas es el organizer de ese evento.

| Tarea | Estado | Asignada a | Para qué sirve en el demo |
|---|---|---|---|
| Welcome table (`demo-12-oct-pendiente`) | pendiente | Ana | Subir una foto en vivo |
| Check-in list (`demo-12-oct-revision`) | en revisión | Luis | Lock budget y luego Pay, hasta Paid |
| Team meal (`demo-12-oct-comida`) | en revisión | Ana | Reembolso, tope 15, monto confirmado 12.40 |
| Booth setup (`demo-12-oct-pagada`) | pagado | Taylor | El final ya visible, por si el pago en vivo no alcanza |

Las tres tareas que no están pendientes traen un veredicto de muestra (`origen` `guion`, banda cumplió). La de la comida ya tiene `monto_confirmado` en 12.40, que es lo que el deploy pide en un reembolso.

No se crean sesiones ni invitaciones. Al entrar con Cavos, el correo de la tabla encuentra al usuario que ya está.

## Qué hay que completar a mano

Las wallets del seed son texto `PLACEHOLDER-G-…`. No son cuentas Stellar y no firman.

Después del enclave nuevo de Cavos:

1. Cada persona entra con el correo de la tabla. La sesión guarda la `G…` nueva. La wallet del organizer no va en esta semilla: sale de ese login.
2. En Cuenta, **Get ready to be paid** abre la trustline de USDC de testnet. Una cuenta no puede tener un activo clásico como USDC sin trustline. Friendbot pone el XLM de testnet para la reserva y la comisión. Revisado en la documentación de Stellar el 7 de octubre de 2026.
3. Si quien cobra no tiene esa trustline, Trustless rechaza el deploy con `ESCROW_RECEIVER_TRUSTLINE_MISSING`. El emisor de USDC de testnet que usa Hyto es `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
4. Antes de **Lock budget** en Check-in list, cambia `tareas.wallet_cobro` de `demo-12-oct-revision` por la `G…` nueva de Luis. Si también pagan la comida, lo mismo en `demo-12-oct-comida` con la `G…` de Ana. Esas dos tareas no tienen contrato, para poder desplegar y fondear en el demo.
5. Las fotos no están en Blob. Los `blob_id` empiezan por `placeholder-demo-12-oct/`. La pantalla de revisión sigue mostrando el texto de muestra. La foto real se sube en Welcome table.
6. Booth setup está en `pagado` con el hash `PLACEHOLDER-NOT-A-LEDGER-TX`. No es una transacción. El enlace a Stellar Expert solo aparece con un hash de 64 caracteres hexadecimales, el del pago real de Check-in list.
7. El organizer necesita USDC de testnet por la suma de los montos más 1 USDC de reserva, y XLM para las comisiones. Quien cobra necesita la trustline del paso 2.

La semilla no mueve dinero y no llama a Cavos, Groq, Laya ni Trustless.
