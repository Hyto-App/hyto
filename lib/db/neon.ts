import { neon } from "@neondatabase/serverless";
import { desc, eq } from "drizzle-orm";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Almacen } from "./almacen";
import { esHostNeon } from "./host";
import { evidencias, proyectos, sesiones, tareas, usuarios, veredictos } from "./schema";
import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";
import type { Rol, TareaFila, VeredictoFila } from "./tipos";
import { urlDeBase } from "@/lib/config/entorno";

const schema = { usuarios, proyectos, tareas, evidencias, veredictos, sesiones };

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
      if (filas.length === 0) return;
      await db.insert(tareas).values(filas).onConflictDoNothing();
    },
    async asignarOrganizador(proyectoId, organizadorId) {
      await db.update(proyectos).set({ organizadorId }).where(eq(proyectos.id, proyectoId));
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
