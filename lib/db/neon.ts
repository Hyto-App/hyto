import { tipoCuentaActivo } from "@/lib/cuenta/bandera";
import { perfilVoluntarioActivo } from "@/lib/perfil/bandera";
import { etiquetasGuardadas } from "@/lib/perfil/reglas";
import { neon } from "@neondatabase/serverless";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { tablonActivo } from "@/lib/tablon/bandera";
import { and, asc, desc, eq, getTableColumns, sql, type SQL } from "drizzle-orm";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { cache } from "react";
import { walletDeSesiones } from "@/lib/sesion/cobro";
import type { Almacen } from "./almacen";
import { esHostNeon } from "./host";
import { consultaPhashCercano } from "./sql";
import { comunidadAvisos, comunidadMiembros, comunidadSolicitudes, comunidades, evidencias, proyectoInvitaciones, proyectoMiembros, proyectos, sesiones, tareas, usuarios, veredictos } from "./schema";
import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";
import { dificultadGuardada, prioridadGuardada } from "@/lib/tareas/clasificacion";
import type { AvisoComunidad, Comunidad, ComunidadMiembro, ComunidadSolicitud, EstadoSolicitudComunidad, Proyecto, ProyectoInvitacion, ProyectoMiembro, Rol, RolComunidad, RolEvento, RolInvitacion, TareaFila, TipoAviso, TipoCuentaGuardado, TipoInvitacion, Usuario, VeredictoFila } from "./tipos";
import { urlDeBase } from "@/lib/config/entorno";

const schema = {
  usuarios,
  proyectos,
  tareas,
  evidencias,
  veredictos,
  sesiones,
  proyectoMiembros,
  proyectoInvitaciones,
  comunidades,
  comunidadMiembros,
  comunidadSolicitudes,
  comunidadAvisos,
};

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

function usuarioDesde(fila: typeof usuarios.$inferSelect): Usuario {
  return {
    id: fila.id,
    email: fila.email,
    nombre: fila.nombre,
    rol: rolDe(fila.rol),
    ...(tipoCuentaActivo()
      ? {
          tipoCuenta: tipoCuentaDe(fila.tipoCuenta),
          empresaNombre: fila.empresaNombre,
          empresaActividad: fila.empresaActividad,
          empresaDescripcion: fila.empresaDescripcion,
          empresaFoto: fila.empresaFoto,
        }
      : {}),
    ...(perfilVoluntarioActivo()
      ? {
          experiencia: fila.experiencia,
          etiquetas: etiquetasGuardadas(fila.etiquetas),
        }
      : {}),
  };
}

function tipoCuentaDe(valor: string | null): TipoCuentaGuardado | null {
  if (valor === "empresa" || valor === "voluntario") return valor;
  return null;
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

function esColumnaAusente(error: unknown): boolean {
  const mensaje = error instanceof Error ? error.message : String(error);
  return /sha256|requisitos|42703|does not exist|no existe|undefined column/i.test(mensaje);
}

/** Each switch hides its own columns, so a migration that has not run yet is not selected. */
function columnasUsuarioVisibles() {
  const todas = getTableColumns(usuarios);
  const {
    tipoCuenta,
    empresaNombre,
    empresaActividad,
    empresaDescripcion,
    empresaFoto,
    experiencia,
    etiquetas,
    ...base
  } = todas;
  return {
    ...base,
    ...(tipoCuentaActivo() ? { tipoCuenta, empresaNombre, empresaActividad, empresaDescripcion, empresaFoto } : {}),
    ...(perfilVoluntarioActivo() ? { experiencia, etiquetas } : {}),
  };
}

function filaUsuario(usuario: Usuario) {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    ...(tipoCuentaActivo()
      ? {
          tipoCuenta: usuario.tipoCuenta ?? null,
          empresaNombre: usuario.empresaNombre ?? null,
          empresaActividad: usuario.empresaActividad ?? null,
          empresaDescripcion: usuario.empresaDescripcion ?? null,
          empresaFoto: usuario.empresaFoto ?? null,
        }
      : {}),
    ...(perfilVoluntarioActivo()
      ? {
          experiencia: usuario.experiencia ?? null,
          etiquetas: usuario.etiquetas && usuario.etiquetas.length > 0 ? JSON.stringify(usuario.etiquetas) : null,
        }
      : {}),
  };
}

/**
 * Drizzle's insert names every column on the table and fills omitted values with
 * DEFAULT. Migrations 0010–0013 add the account-type columns, the volunteer
 * profile columns, and the community id on events, plus the community tables. With those
 * unapplied, naming a missing column fails even when the flags are off and the
 * values object leaves the key out. This statement lists only keys that are present.
 */
function sqlInsertarFila(tabla: Parameters<typeof getTableColumns>[0], fila: Record<string, unknown>, conflicto: SQL) {
  const columnas = getTableColumns(tabla);
  const pares = Object.entries(fila).flatMap(([clave, valor]) => {
    if (valor === undefined) return [];
    const columna = columnas[clave as keyof typeof columnas];
    return columna ? [{ nombre: columna.name, valor }] : [];
  });
  const nombres = sql.join(
    pares.map((par) => sql.identifier(par.nombre)),
    sql`, `,
  );
  const valores = sql.join(
    pares.map((par) => sql`${par.valor}`),
    sql`, `,
  );
  return sql`insert into ${tabla} (${nombres}) values (${valores}) ${conflicto}`;
}

function sqlInsertarUsuario(fila: Record<string, unknown>, actualizar: boolean) {
  const conflicto = actualizar
    ? sql`on conflict ("email") do update set "nombre" = excluded."nombre", "rol" = excluded."rol"`
    : sql`on conflict do nothing`;
  // Returning only the identity columns keeps sign-up off the feature columns.
  return sql`${sqlInsertarFila(usuarios, fila, conflicto)} returning "id", "email", "nombre", "rol"`;
}

/** Login and sign-up read these columns only, even when a feature switch is on. */
function columnasUsuarioBase() {
  return {
    id: usuarios.id,
    email: usuarios.email,
    nombre: usuarios.nombre,
    rol: usuarios.rol,
  };
}

function usuarioIdentidad(fila: { id: string; email: string; nombre: string; rol: string }): Usuario {
  return {
    id: fila.id,
    email: fila.email,
    nombre: fila.nombre,
    rol: rolDe(fila.rol),
  };
}

function identidadDeFila(crudo: Record<string, unknown> | undefined): Usuario | null {
  if (!crudo) return null;
  const id = typeof crudo.id === "string" ? crudo.id : null;
  const email = typeof crudo.email === "string" ? crudo.email : null;
  const nombre = typeof crudo.nombre === "string" ? crudo.nombre : null;
  const rol = typeof crudo.rol === "string" ? crudo.rol : null;
  if (!id || !email || !nombre || !rol) return null;
  return usuarioIdentidad({ id, email, nombre, rol });
}

function columnasTareaPrevias() {
  const { requisitos: _requisitos, rechazo: _rechazo, ...resto } = getTableColumns(tareas);
  return resto;
}

function columnasProyectoSinComunidad() {
  const { comunidadId: _comunidadId, ...resto } = getTableColumns(proyectos);
  return resto;
}

function columnasVeredictoPrevias() {
  const { mile: _mile, ...resto } = getTableColumns(veredictos);
  return resto;
}

function filasSql(resultado: unknown): Record<string, unknown>[] {
  if (Array.isArray(resultado)) return resultado as Record<string, unknown>[];
  if (resultado && typeof resultado === "object" && Array.isArray((resultado as { rows?: unknown }).rows)) {
    return (resultado as { rows: Record<string, unknown>[] }).rows;
  }
  return [];
}

const columnasPrevias = {
  id: evidencias.id,
  tareaId: evidencias.tareaId,
  blobId: evidencias.blobId,
  monto: evidencias.monto,
  fecha: evidencias.fecha,
  creadaEn: evidencias.creadaEn,
  montoConfirmado: evidencias.montoConfirmado,
};

export function crearAlmacenDesde(db: DbAlmacen): Almacen {
  let antifraude: boolean | null = null;
  let mile: boolean | null = null;
  async function columnasListas(): Promise<boolean> {
    if (antifraude !== null) return antifraude;
    try {
      await db.execute(sql`select sha256 from evidencias limit 0`);
      antifraude = true;
      return true;
    } catch (error) {
      if (esColumnaAusente(error)) {
        antifraude = false;
        return false;
      }
      throw error;
    }
  }
  async function columnasMile(): Promise<boolean> {
    if (mile !== null) return mile;
    try {
      await db.execute(sql`select requisitos, rechazo from tareas limit 0`);
      await db.execute(sql`select mile from veredictos limit 0`);
      mile = true;
      return true;
    } catch (error) {
      if (esColumnaAusente(error)) {
        mile = false;
        return false;
      }
      throw error;
    }
  }

  return {
    async listarUsuarios() {
      const filas = await db.select(columnasUsuarioVisibles()).from(usuarios);
      return filas.map((fila) => usuarioDesde(fila as typeof usuarios.$inferSelect));
    },
    async usuarioPorEmail(email) {
      const filas = await db
        .select(columnasUsuarioBase())
        .from(usuarios)
        .where(eq(usuarios.email, email.trim().toLowerCase()))
        .limit(1);
      return filas[0] ? usuarioIdentidad(filas[0]) : null;
    },
    async leerUsuario(id) {
      const filas = await db.select(columnasUsuarioVisibles()).from(usuarios).where(eq(usuarios.id, id)).limit(1);
      return filas[0] ? usuarioDesde(filas[0] as typeof usuarios.$inferSelect) : null;
    },
    async insertarUsuario(usuario) {
      const pedido = { ...usuario, email: usuario.email.trim().toLowerCase() };
      const resultado = await db.execute(sqlInsertarUsuario(filaUsuario(pedido), false));
      const devuelto = identidadDeFila(filasDe(resultado)[0]);
      if (devuelto) return devuelto;
      const filas = await db.select(columnasUsuarioBase()).from(usuarios).where(eq(usuarios.email, pedido.email)).limit(1);
      if (filas[0]) return usuarioIdentidad(filas[0]);
      return usuarioIdentidad(pedido);
    },
    async guardarUsuario(usuario) {
      const email = usuario.email.trim().toLowerCase();
      await db.execute(sqlInsertarUsuario({ ...filaUsuario(usuario), email }, true));
    },
    async guardarTipoCuenta(id, cambio) {
      if (!tipoCuentaActivo()) return;
      await db.update(usuarios).set(cambio).where(eq(usuarios.id, id));
    },
    async guardarPerfilVoluntario(id, cambio) {
      if (!perfilVoluntarioActivo()) return;
      await db.update(usuarios).set(cambio).where(eq(usuarios.id, id));
    },
    async leerProyecto(id) {
      if (!comunidadesActivas()) {
        const filas = await db.select(columnasProyectoSinComunidad()).from(proyectos).where(eq(proyectos.id, id)).limit(1);
        return filas[0] ? { ...filas[0], comunidadId: null } : null;
      }
      const filas = await db.select().from(proyectos).where(eq(proyectos.id, id)).limit(1);
      return filas[0] ?? null;
    },
    async listarProyectos() {
      if (!comunidadesActivas()) {
        const filas = await db.select(columnasProyectoSinComunidad()).from(proyectos);
        return filas.map((fila) => ({ ...fila, comunidadId: null }));
      }
      return db.select().from(proyectos);
    },
    async ultimoProyecto() {
      if (!comunidadesActivas()) {
        const filas = await db.select(columnasProyectoSinComunidad()).from(proyectos).orderBy(desc(proyectos.creadoEn)).limit(1);
        return filas[0] ? { ...filas[0], comunidadId: null } : null;
      }
      const filas = await db.select().from(proyectos).orderBy(desc(proyectos.creadoEn)).limit(1);
      return filas[0] ?? null;
    },
    async crearProyecto(proyecto, filas) {
      const valores = valoresProyecto(proyecto);
      await db.execute(sqlInsertarFila(proyectos, valores, sql`on conflict do nothing`));
      if (filas.length > 0) {
        const listo = await columnasMile();
        const valores = listo
          ? filas.map((fila) => ({ ...fila, requisitos: fila.requisitos ?? null, rechazo: fila.rechazo ?? null }))
          : filas.map(({ requisitos: _requisitos, rechazo: _rechazo, ...fila }) => fila);
        await db.insert(tareas).values(valores).onConflictDoNothing();
      }
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
    async actualizarProyecto(id, cambio) {
      if (Object.keys(cambio).length === 0) return;
      await db.update(proyectos).set(cambio).where(eq(proyectos.id, id));
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
      if (!(await columnasMile())) {
        const filas = await db.select(columnasTareaPrevias()).from(tareas);
        return filas.map((fila) => tareaDesde({ ...fila, requisitos: null, rechazo: null }));
      }
      const filas = await db.select().from(tareas);
      return filas.map(tareaDesde);
    },
    async leerTarea(id) {
      if (!(await columnasMile())) {
        const filas = await db.select(columnasTareaPrevias()).from(tareas).where(eq(tareas.id, id)).limit(1);
        return filas[0] ? tareaDesde({ ...filas[0], requisitos: null, rechazo: null }) : null;
      }
      const filas = await db.select().from(tareas).where(eq(tareas.id, id)).limit(1);
      return filas[0] ? tareaDesde(filas[0]) : null;
    },
    async actualizarTarea(id, cambio) {
      const listo = await columnasMile();
      const { requisitos, rechazo, ...resto } = cambio;
      const set = listo ? cambio : resto;
      if (Object.keys(set).length === 0) return;
      await db.update(tareas).set(set).where(eq(tareas.id, id));
    },
    async crearEvidencia(evidencia) {
      if (!(await columnasListas())) {
        await db
          .insert(evidencias)
          .values({
            id: evidencia.id,
            tareaId: evidencia.tareaId,
            blobId: evidencia.blobId,
            monto: evidencia.monto,
            fecha: evidencia.fecha,
            creadaEn: evidencia.creadaEn,
            montoConfirmado: evidencia.montoConfirmado,
          })
          .onConflictDoNothing();
        return;
      }
      await db
        .insert(evidencias)
        .values({
          id: evidencia.id,
          tareaId: evidencia.tareaId,
          blobId: evidencia.blobId,
          monto: evidencia.monto,
          fecha: evidencia.fecha,
          creadaEn: evidencia.creadaEn,
          montoConfirmado: evidencia.montoConfirmado,
          capturadaEn: evidencia.capturadaEn ?? null,
          frescura: evidencia.frescura ?? null,
          sha256: evidencia.sha256 ?? null,
          phash: evidencia.phash ?? null,
          tipoArchivo: evidencia.tipoArchivo ?? null,
          motivoCopia: evidencia.motivoCopia ?? null,
        })
        .onConflictDoNothing();
    },
    async leerEvidencia(id) {
      if (!(await columnasListas())) {
        const filas = await db.select(columnasPrevias).from(evidencias).where(eq(evidencias.id, id)).limit(1);
        return filas[0] ?? null;
      }
      const filas = await db.select().from(evidencias).where(eq(evidencias.id, id)).limit(1);
      return filas[0] ?? null;
    },
    async actualizarEvidencia(id, cambio) {
      const listo = await columnasListas();
      const set = listo
        ? cambio
        : { monto: cambio.monto, fecha: cambio.fecha, montoConfirmado: cambio.montoConfirmado, creadaEn: cambio.creadaEn };
      const limpio = Object.fromEntries(Object.entries(set).filter((entrada) => entrada[1] !== undefined));
      if (Object.keys(limpio).length === 0) return;
      await db.update(evidencias).set(limpio).where(eq(evidencias.id, id));
    },
    async ultimaEvidencia(tareaId) {
      if (!(await columnasListas())) {
        const filas = await db
          .select(columnasPrevias)
          .from(evidencias)
          .where(eq(evidencias.tareaId, tareaId))
          .orderBy(desc(evidencias.creadaEn))
          .limit(1);
        return filas[0] ?? null;
      }
      const filas = await db
        .select()
        .from(evidencias)
        .where(eq(evidencias.tareaId, tareaId))
        .orderBy(desc(evidencias.creadaEn))
        .limit(1);
      return filas[0] ?? null;
    },
    async listarEvidencias(tareaId) {
      if (!(await columnasListas())) {
        return db.select(columnasPrevias).from(evidencias).where(eq(evidencias.tareaId, tareaId)).orderBy(asc(evidencias.creadaEn));
      }
      return db.select().from(evidencias).where(eq(evidencias.tareaId, tareaId)).orderBy(asc(evidencias.creadaEn));
    },
    async evidenciaPorSha256(sha256) {
      if (!(await columnasListas())) return null;
      const filas = await db.select().from(evidencias).where(eq(evidencias.sha256, sha256)).limit(1);
      return filas[0] ?? null;
    },
    async evidenciasCercanas(phash, distanciaMax, exceptoId) {
      if (!(await columnasListas())) return [];
      try {
        const resultado = await db.execute(sql.raw(consultaPhashCercano(exceptoId, phash, distanciaMax)));
        return filasSql(resultado).flatMap((fila) => {
          const id = typeof fila.id === "string" ? fila.id : "";
          const distancia = Number(fila.distancia);
          if (!id || !Number.isFinite(distancia)) return [];
          return [{ id, distancia }];
        });
      } catch (error) {
        if (esColumnaAusente(error)) return [];
        throw error;
      }
    },
    async listaParaAntifraude() {
      return columnasListas();
    },
    async columnasRequisitos() {
      return columnasMile();
    },
    async contarEvidencias(tareaId) {
      const resultado = await db.execute(sql`select count(*)::int as n from evidencias where tarea_id = ${tareaId}`);
      const fila = filasSql(resultado)[0];
      const total = Number(fila?.n ?? 0);
      return Number.isFinite(total) ? total : 0;
    },
    async guardarVeredicto(veredicto) {
      const listo = await columnasMile();
      const base = {
        id: veredicto.id,
        evidenciaId: veredicto.evidenciaId,
        tareaId: veredicto.tareaId,
        veredicto: veredicto.veredicto,
        frase: veredicto.frase,
        textoScout: veredicto.textoScout,
        choice: veredicto.choice,
        noul: veredicto.noul,
        score: veredicto.score,
        origen: veredicto.origen,
      };
      const valores = listo ? { ...base, mile: veredicto.mile ?? null } : base;
      await db
        .insert(veredictos)
        .values(valores)
        .onConflictDoUpdate({
          target: veredictos.id,
          set: listo
            ? {
                evidenciaId: veredicto.evidenciaId,
                tareaId: veredicto.tareaId,
                veredicto: veredicto.veredicto,
                frase: veredicto.frase,
                textoScout: veredicto.textoScout,
                choice: veredicto.choice,
                noul: veredicto.noul,
                score: veredicto.score,
                origen: veredicto.origen,
                mile: veredicto.mile ?? null,
              }
            : {
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
    async borrarVeredicto(evidenciaId) {
      await db.delete(veredictos).where(eq(veredictos.evidenciaId, evidenciaId));
    },
    async veredictoDe(evidenciaId) {
      if (!(await columnasMile())) {
        const filas = await db.select(columnasVeredictoPrevias()).from(veredictos).where(eq(veredictos.evidenciaId, evidenciaId)).limit(1);
        const fila = filas[0];
        if (!fila) return null;
        return {
          ...fila,
          mile: null,
          veredicto: veredictoDe(fila.veredicto),
          noul: fila.noul === "si" ? "si" : "no",
          origen: origenDeFila(fila.origen),
        };
      }
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
    async walletDeUsuario(usuarioId) {
      const id = usuarioId.trim();
      if (!id) return null;
      const filas = await db.select().from(sesiones).where(eq(sesiones.usuarioId, id));
      return walletDeSesiones(filas.map((fila) => ({ ...fila, rol: rolDe(fila.rol), wallet: fila.wallet ?? "" })));
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
    async listarComunidades() {
      if (!comunidadesActivas()) return [];
      return (await db.select().from(comunidades)).map(comunidadDesde);
    },
    async leerComunidad(id) {
      if (!comunidadesActivas()) return null;
      const filas = await db.select().from(comunidades).where(eq(comunidades.id, id)).limit(1);
      return filas[0] ? comunidadDesde(filas[0]) : null;
    },
    async leerComunidadPorCodigo(codigo) {
      if (!comunidadesActivas()) return null;
      const filas = await db.select().from(comunidades).where(eq(comunidades.codigo, codigo)).limit(1);
      return filas[0] ? comunidadDesde(filas[0]) : null;
    },
    async crearComunidad(comunidad) {
      if (!comunidadesActivas()) return;
      await db.insert(comunidades).values(comunidad);
    },
    async listarMiembrosComunidad(comunidadId) {
      if (!comunidadesActivas()) return [];
      const filas = await db.select().from(comunidadMiembros).where(eq(comunidadMiembros.comunidadId, comunidadId));
      return filas.map(miembroComunidadDesde);
    },
    async comunidadesDeUsuario(usuarioId) {
      if (!comunidadesActivas()) return [];
      const filas = await db.select().from(comunidadMiembros).where(eq(comunidadMiembros.usuarioId, usuarioId));
      return filas.map(miembroComunidadDesde);
    },
    async miembroComunidad(comunidadId, usuarioId) {
      if (!comunidadesActivas()) return null;
      const filas = await db
        .select()
        .from(comunidadMiembros)
        .where(and(eq(comunidadMiembros.comunidadId, comunidadId), eq(comunidadMiembros.usuarioId, usuarioId)))
        .limit(1);
      return filas[0] ? miembroComunidadDesde(filas[0]) : null;
    },
    async guardarMiembroComunidad(miembro) {
      if (!comunidadesActivas()) return;
      await db
        .insert(comunidadMiembros)
        .values(miembro)
        .onConflictDoUpdate({
          target: [comunidadMiembros.comunidadId, comunidadMiembros.usuarioId],
          set: { rol: miembro.rol },
        });
    },
    async listarSolicitudesComunidad(comunidadId) {
      if (!comunidadesActivas()) return [];
      const filas = await db.select().from(comunidadSolicitudes).where(eq(comunidadSolicitudes.comunidadId, comunidadId));
      return filas.map(solicitudDesde);
    },
    async crearSolicitudComunidad(solicitud) {
      if (!comunidadesActivas()) return;
      await db.insert(comunidadSolicitudes).values(solicitud);
    },
    async actualizarSolicitudComunidad(id, estado) {
      if (!comunidadesActivas()) return;
      await db.update(comunidadSolicitudes).set({ estado }).where(eq(comunidadSolicitudes.id, id));
    },
    async fijarComunidadProyecto(proyectoId, comunidadId) {
      if (!comunidadesActivas()) return;
      await db.update(proyectos).set({ comunidadId }).where(eq(proyectos.id, proyectoId));
    },
    async listarAvisosComunidad(comunidadId) {
      if (!tablonActivo() || !comunidadesActivas()) return [];
      const filas = await db.select().from(comunidadAvisos).where(eq(comunidadAvisos.comunidadId, comunidadId));
      return filas.map(avisoDesde).sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
    },
    async crearAvisoComunidad(aviso) {
      if (!tablonActivo() || !comunidadesActivas()) return;
      await db.insert(comunidadAvisos).values(aviso);
    },
    async tomarTarea(id, usuarioId) {
      const filas = await db
        .update(tareas)
        .set({ miembroId: usuarioId })
        .where(and(eq(tareas.id, id), eq(tareas.miembroId, "")))
        .returning({ id: tareas.id });
      return filas.length > 0;
    },
  };
}

function valoresProyecto(proyecto: Proyecto) {
  if (comunidadesActivas()) return proyecto;
  const { comunidadId: _comunidadId, ...resto } = proyecto;
  return resto;
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

function comunidadDesde(fila: typeof comunidades.$inferSelect): Comunidad {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    fotoUrl: fila.fotoUrl,
    visibilidad: fila.visibilidad === "privada" ? "privada" : "publica",
    codigo: fila.codigo,
    creadoEn: fila.creadoEn,
    creadorId: fila.creadorId,
  };
}

function miembroComunidadDesde(fila: typeof comunidadMiembros.$inferSelect): ComunidadMiembro {
  return {
    comunidadId: fila.comunidadId,
    usuarioId: fila.usuarioId,
    rol: rolComunidadDe(fila.rol),
    creadoEn: fila.creadoEn,
  };
}

function solicitudDesde(fila: typeof comunidadSolicitudes.$inferSelect): ComunidadSolicitud {
  return {
    id: fila.id,
    comunidadId: fila.comunidadId,
    usuarioId: fila.usuarioId,
    estado: estadoSolicitudDe(fila.estado),
    creadoEn: fila.creadoEn,
  };
}

function avisoDesde(fila: typeof comunidadAvisos.$inferSelect): AvisoComunidad {
  return {
    id: fila.id,
    comunidadId: fila.comunidadId,
    tipo: tipoAvisoDe(fila.tipo),
    titulo: fila.titulo,
    nombre: fila.nombre,
    tareaId: fila.tareaId,
    creadoEn: fila.creadoEn,
  };
}

function tipoAvisoDe(valor: string): TipoAviso {
  if (valor === "asignada" || valor === "completada") return valor;
  return "disponible";
}

function rolComunidadDe(valor: string): RolComunidad {
  return valor === "admin" ? "admin" : "miembro";
}

function estadoSolicitudDe(valor: string): EstadoSolicitudComunidad {
  if (valor === "aprobada" || valor === "rechazada") return valor;
  return "pendiente";
}

function tareaDesde(fila: typeof tareas.$inferSelect): TareaFila {
  return {
    ...fila,
    tipo: tipoDe(fila.tipo),
    estado: estadoDe(fila.estado),
    prioridad: prioridadGuardada(fila.prioridad),
    dificultad: dificultadGuardada(fila.dificultad),
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

const almacenDeUrl = cache(async (): Promise<Almacen | null> => {
  const url = urlBase();
  if (!url) return null;
  return crearAlmacenNeon(url);
});

export async function almacenNeon(): Promise<Almacen | null> {
  // Lo definen las pruebas de Postgres local. En el servidor no existe.
  const tabla = globalThis as typeof globalThis & {
    __HYTO_ALMACEN_PRUEBA?: () => Promise<Almacen | null>;
  };
  if (typeof tabla.__HYTO_ALMACEN_PRUEBA === "function") return tabla.__HYTO_ALMACEN_PRUEBA();
  return almacenDeUrl();
}
