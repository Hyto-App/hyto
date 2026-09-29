import { neon } from "@neondatabase/serverless";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type { Almacen } from "./almacen";
import { evidencias, proyectos, sesiones, tareas, usuarios, veredictos } from "./schema";
import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";
import type { Rol, TareaFila, VeredictoFila } from "./tipos";

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

export function crearAlmacenNeon(url: string): Almacen {
  const db = drizzle(neon(url), { schema: { usuarios, proyectos, tareas, evidencias, veredictos, sesiones } });

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
    async ultimoProyecto() {
      const filas = await db.select().from(proyectos).orderBy(desc(proyectos.creadoEn)).limit(1);
      return filas[0] ?? null;
    },
    async crearProyecto(proyecto, filas) {
      await db.insert(proyectos).values(proyecto).onConflictDoNothing();
      if (filas.length === 0) return;
      await db.insert(tareas).values(filas).onConflictDoNothing();
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
      await db.insert(evidencias).values(evidencia);
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
        origen: fila.origen === "guion" ? "guion" : "scout",
      };
    },
    async crearSesion(sesion) {
      await db.insert(sesiones).values(sesion);
    },
    async leerSesion(token) {
      const filas = await db.select().from(sesiones).where(eq(sesiones.token, token)).limit(1);
      const fila = filas[0];
      return fila ? { ...fila, rol: rolDe(fila.rol) } : null;
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

export function urlBase(): string | null {
  const valor = process.env.DATABASE_URL?.trim();
  return valor ? valor : null;
}

export async function almacenNeon(): Promise<Almacen | null> {
  const url = urlBase();
  if (!url) return null;
  return crearAlmacenNeon(url);
}
