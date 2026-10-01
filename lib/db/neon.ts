import { neon } from "@neondatabase/serverless";
import { desc, eq, sql } from "drizzle-orm";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Almacen } from "./almacen";
import { esHostNeon } from "./host";
import { evidencias, proyectoInvitaciones, proyectoMiembros, proyectos, sesiones, tareas, usuarios, veredictos } from "./schema";
import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";
import type { ProyectoInvitacion, ProyectoMiembro, Rol, RolEvento, RolInvitacion, TareaFila, TipoInvitacion, VeredictoFila } from "./tipos";
import { urlDeBase } from "@/lib/config/entorno";

const schema = { usuarios, proyectos, tareas, evidencias, veredictos, sesiones, proyectoMiembros, proyectoInvitaciones };

export type DbAlmacen = NeonHttpDatabase<typeof schema>;

const poolsGlobales = globalThis as typeof globalThis & { __hytoPools?: Map<string, Pool> };

function pools(): Map<string, Pool> {
  if (!poolsGlobales.__hytoPools) poolsGlobales.__hytoPools = new Map();
  return poolsGlobales.__hytoPools;
}

function escucharErrores(pool: Pool): void {
  if (pool.listenerCount("error") > 0) return;
  // Sin este listener, un cliente ocioso que se cae emite `error` y Node cierra el proceso.
  pool.on("error", (error: Error) => {
    const mensaje = error instanceof Error ? error.message : "error";
    console.error("Postgres cerró una conexión ociosa.", mensaje);
  });
}

function poolDe(url: string): Pool {
  const existente = pools().get(url);
  if (existente) {
    escucharErrores(existente);
    return existente;
  }
  const pool = new Pool({ connectionString: url, max: 5, allowExitOnIdle: true });
  escucharErrores(pool);
  pools().set(url, pool);
  return pool;
}

export async function cerrarPools(): Promise<void> {
  const abiertos = [...pools().values()];
  pools().clear();
  await Promise.all(abiertos.map((pool) => pool.end()));
}

function rolDe(valor: string): Rol {
  return valor === "organizador" ? "organizador" : "voluntario";
}

function tipoDe(valor: string): TipoTarea {
  return valor === "reembolso" ? "reembolso" : "trabajo";
}

function estadoDe(valor: string): EstadoTarea {
  if (valor === "en revisión" || valor === "pagado") return valor;
  return "pendiente";
}

function veredictoDe(valor: string): VeredictoFila["veredicto"] {
  if (valor === "cumplió" || valor === "insuficiente") return valor;
  return "parcial";
}

export function origenDeFila(valor: string): VeredictoFila["origen"] {
  if (valor === "guion" || valor === "stub" || valor === "error" || valor === "scout") return valor;
  return "scout";
}

export function crearAlmacenDesde(db: DbAlmacen): Almacen {
  return {
    async listarUsuarios() {
      const filas = await db.select().from(usuarios);
      return filas.map((fila) => ({ ...fila, rol: rolDe(fila.rol) }));
    },
    async usuarioPorEmail(email) {
      const filas = await db.select().from(usuarios).where(eq(usuarios.email, email.trim().toLowerCase())).limit(1);
      const fila = filas[0];
      return fila ? { ...fila, rol: rolDe(fila.rol) } : null;
    },
    async insertarUsuario(usuario) {
      await db.insert(usuarios).values(usuario).onConflictDoNothing();
    },
    async guardarUsuario(usuario) {
      const email = usuario.email.trim().toLowerCase();
      await db
        .insert(usuarios)
        .values({ ...usuario, email })
        .onConflictDoUpdate({
          target: usuarios.email,
          set: { nombre: usuario.nombre, rol: usuario.rol },
        });
    },
    async leerProyecto(id) {
      const filas = await db.select().from(proyectos).where(eq(proyectos.id, id)).limit(1);
      return filas[0] ?? null;
    },
    async listarProyectos() {
      return db.select().from(proyectos);
    },
    async ultimoProyecto() {
      const filas = await db.select().from(proyectos).orderBy(desc(proyectos.creadoEn)).limit(1);
      return filas[0] ?? null;
    },
    async crearProyecto(proyecto, filas) {
      await db.insert(proyectos).values(proyecto).onConflictDoNothing();
      if (filas.length > 0) await db.insert(tareas).values(filas).onConflictDoNothing();
      if (proyecto.organizadorId) {
        await db
          .insert(proyectoMiembros)
          .values({
            proyectoId: proyecto.id,
            usuarioId: proyecto.organizadorId,
            rol: "organizer",
            estado: "active",
            creadoEn: proyecto.creadoEn,
          })
          .onConflictDoUpdate({
            target: [proyectoMiembros.proyectoId, proyectoMiembros.usuarioId],
            set: { rol: "organizer", estado: "active" },
          });
      }
      const voluntarios = [
        ...new Set(filas.map((fila) => fila.miembroId).filter((id) => id && id !== proyecto.organizadorId)),
      ];
      if (voluntarios.length > 0) {
        await db
          .insert(proyectoMiembros)
          .values(
            voluntarios.map((usuarioId) => ({
              proyectoId: proyecto.id,
              usuarioId,
              rol: "volunteer" as const,
              estado: "active" as const,
              creadoEn: proyecto.creadoEn,
            })),
          )
          .onConflictDoNothing();
      }
    },
    async asignarOrganizador(proyectoId, organizadorId) {
      await db.update(proyectos).set({ organizadorId }).where(eq(proyectos.id, proyectoId));
      await db
        .insert(proyectoMiembros)
        .values({
          proyectoId,
          usuarioId: organizadorId,
          rol: "organizer",
          estado: "active",
          creadoEn: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [proyectoMiembros.proyectoId, proyectoMiembros.usuarioId],
          set: { rol: "organizer", estado: "active" },
        });
    },
    async listarTareas() {
      const filas = await db.select().from(tareas);
      return filas.map(tareaDesde);
    },
    async leerTarea(id) {
      const filas = await db.select().from(tareas).where(eq(tareas.id, id)).limit(1);
      return filas[0] ? tareaDesde(filas[0]) : null;
    },
    async actualizarTarea(id, cambio) {
      await db.update(tareas).set(cambio).where(eq(tareas.id, id));
    },
    async crearEvidencia(evidencia) {
      await db.insert(evidencias).values(evidencia).onConflictDoNothing();
    },
    async leerEvidencia(id) {
      const filas = await db.select().from(evidencias).where(eq(evidencias.id, id)).limit(1);
      return filas[0] ?? null;
    },
    async actualizarEvidencia(id, cambio) {
      await db.update(evidencias).set(cambio).where(eq(evidencias.id, id));
    },
    async ultimaEvidencia(tareaId) {
      const filas = await db
        .select()
        .from(evidencias)
        .where(eq(evidencias.tareaId, tareaId))
        .orderBy(desc(evidencias.creadaEn))
        .limit(1);
      return filas[0] ?? null;
    },
    async guardarVeredicto(veredicto) {
      await db
        .insert(veredictos)
        .values(veredicto)
        .onConflictDoUpdate({
          target: veredictos.id,
          set: {
            evidenciaId: veredicto.evidenciaId,
            tareaId: veredicto.tareaId,
            veredicto: veredicto.veredicto,
            frase: veredicto.frase,
            textoScout: veredicto.textoScout,
            choice: veredicto.choice,
            noul: veredicto.noul,
            score: veredicto.score,
            origen: veredicto.origen,
          },
        });
    },
    async veredictoDe(evidenciaId) {
      const filas = await db.select().from(veredictos).where(eq(veredictos.evidenciaId, evidenciaId)).limit(1);
      const fila = filas[0];
      if (!fila) return null;
      return {
        ...fila,
        veredicto: veredictoDe(fila.veredicto),
        noul: fila.noul === "si" ? "si" : "no",
        origen: origenDeFila(fila.origen),
      };
    },
    async crearSesion(sesion) {
      await db.insert(sesiones).values(sesion);
    },
    async leerSesion(token) {
      const filas = await db.select().from(sesiones).where(eq(sesiones.token, token)).limit(1);
      const fila = filas[0];
      return fila ? { ...fila, rol: rolDe(fila.rol), wallet: fila.wallet ?? "" } : null;
    },
    async borrarSesion(token) {
      await db.delete(sesiones).where(eq(sesiones.token, token));
    },
    async guardarWallet(token, wallet) {
      await db.update(sesiones).set({ wallet }).where(eq(sesiones.token, token));
    },
    async listarMiembros(proyectoId) {
      const filas = await db.select().from(proyectoMiembros).where(eq(proyectoMiembros.proyectoId, proyectoId));
      return filas.map(miembroDesde);
    },
    async miembrosDeUsuario(usuarioId) {
      const filas = await db.select().from(proyectoMiembros).where(eq(proyectoMiembros.usuarioId, usuarioId));
      return filas.map(miembroDesde);
    },
    async guardarMiembro(miembro) {
      await db
        .insert(proyectoMiembros)
        .values(miembro)
        .onConflictDoUpdate({
          target: [proyectoMiembros.proyectoId, proyectoMiembros.usuarioId],
          set: {
            estado: miembro.estado,
            rol: sql`case when ${proyectoMiembros.rol} = 'organizer' then 'organizer' else ${miembro.rol} end`,
          },
        });
    },
    async crearInvitacion(invitacion) {
      await db.insert(proyectoInvitaciones).values(invitacion);
    },
    async leerInvitacionPorHash(hash) {
      const filas = await db.select().from(proyectoInvitaciones).where(eq(proyectoInvitaciones.secretoHash, hash)).limit(1);
      return filas[0] ? invitacionDesde(filas[0]) : null;
    },
    async canjearInvitacion(pedido) {
      const resultado = await db.execute(sql`
        with tomado as (
          update proyecto_invitaciones
          set usos = usos + 1
          where secreto_hash = ${pedido.secretoHash}
            and usos < max_usos
            and expira_en > ${pedido.ahora}
            and (tipo <> 'direct' or lower(coalesce(email, '')) = lower(${pedido.email}))
          returning proyecto_id, rol
        )
        insert into proyecto_miembros (proyecto_id, usuario_id, rol, estado, creado_en)
        select proyecto_id, ${pedido.usuarioId}, rol, 'active', ${pedido.ahora}
        from tomado
        on conflict (proyecto_id, usuario_id) do update
        set estado = 'active',
            rol = case when proyecto_miembros.rol = 'organizer' then 'organizer' else excluded.rol end
        returning proyecto_id, rol
      `);
      const filas = filasDe(resultado);
      const fila = filas[0];
      if (fila?.proyecto_id && fila.rol) {
        return { ok: true, proyectoId: String(fila.proyecto_id), rol: rolEventoDe(String(fila.rol)) };
      }
      const invitacion = await db
        .select()
        .from(proyectoInvitaciones)
        .where(eq(proyectoInvitaciones.secretoHash, pedido.secretoHash))
        .limit(1);
      const actual = invitacion[0];
      if (!actual) return { ok: false, motivo: "missing" };
      if (!actual.expiraEn || actual.expiraEn <= pedido.ahora) return { ok: false, motivo: "expired" };
      if (actual.usos >= actual.maxUsos) return { ok: false, motivo: "used" };
      if (actual.tipo === "direct" && (actual.email ?? "").toLowerCase() !== pedido.email.trim().toLowerCase()) {
        return { ok: false, motivo: "email" };
      }
      return { ok: false, motivo: "missing" };
    },
  };
}

function filasDe(resultado: unknown): Array<Record<string, unknown>> {
  if (resultado && typeof resultado === "object" && "rows" in resultado && Array.isArray(resultado.rows)) {
    return resultado.rows as Array<Record<string, unknown>>;
  }
  return Array.isArray(resultado) ? (resultado as Array<Record<string, unknown>>) : [];
}

function rolEventoDe(valor: string): RolEvento {
  if (valor === "organizer" || valor === "team") return valor;
  return "volunteer";
}

function rolInvitacionDe(valor: string): RolInvitacion {
  return valor === "team" ? "team" : "volunteer";
}

function tipoInvitacionDe(valor: string): TipoInvitacion {
  return valor === "direct" ? "direct" : "code";
}

function miembroDesde(fila: typeof proyectoMiembros.$inferSelect): ProyectoMiembro {
  return {
    proyectoId: fila.proyectoId,
    usuarioId: fila.usuarioId,
    rol: rolEventoDe(fila.rol),
    estado: fila.estado === "inactive" ? "inactive" : "active",
    creadoEn: fila.creadoEn,
  };
}

function invitacionDesde(fila: typeof proyectoInvitaciones.$inferSelect): ProyectoInvitacion {
  return {
    id: fila.id,
    proyectoId: fila.proyectoId,
    tipo: tipoInvitacionDe(fila.tipo),
    email: fila.email,
    secretoHash: fila.secretoHash,
    rol: rolInvitacionDe(fila.rol),
    maxUsos: fila.maxUsos,
    usos: fila.usos,
    expiraEn: fila.expiraEn,
    creadoPor: fila.creadoPor,
    creadoEn: fila.creadoEn,
  };
}

function tareaDesde(fila: typeof tareas.$inferSelect): TareaFila {
  return {
    ...fila,
    tipo: tipoDe(fila.tipo),
    estado: estadoDe(fila.estado),
  };
}

export function crearAlmacenNeon(url: string): Almacen {
  if (esHostNeon(url)) return crearAlmacenDesde(drizzleNeon(neon(url), { schema }));
  // node-postgres habla el protocolo local y usa las mismas consultas.
  return crearAlmacenDesde(drizzlePg(poolDe(url), { schema }) as unknown as DbAlmacen);
}

export function urlBase(): string | null {
  return urlDeBase();
}

export async function almacenNeon(): Promise<Almacen | null> {
  // Lo definen las pruebas de Postgres local. En el servidor no existe.
  const tabla = globalThis as typeof globalThis & {
    __HYTO_ALMACEN_PRUEBA?: () => Promise<Almacen | null>;
  };
  if (typeof tabla.__HYTO_ALMACEN_PRUEBA === "function") return tabla.__HYTO_ALMACEN_PRUEBA();
  const url = urlBase();
  if (!url) return null;
  return crearAlmacenNeon(url);
}
