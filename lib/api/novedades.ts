import { createHash } from "node:crypto";
import type { Marca } from "@/lib/admin/novedades";
import type { Almacen } from "@/lib/db/almacen";
import { esProyectoDemo } from "@/lib/db/semilla";
import type { SesionFila, TareaFila } from "@/lib/db/tipos";
import { demoHabilitado, sesionEsDemo } from "@/lib/sesion/demo";
import { leerVeredictoVigente } from "./informe";
import { esOrganizador } from "./invitaciones";
import { baseNoLista, json } from "./json";
import { AVISO_REVISION } from "./organizador";

const SEPARADOR = "\u001f";

// La bandeja sondea cada pocos segundos. SSE dejaría una función de Vercel
// abierta por pestaña, y el streaming de Horizon solo empuja datos de la red,
// no estas filas de Neon. El veredicto no tiene columna de fecha (y no hay
// migración), así que un `since` de tiempo no puede ver un puntaje que llega
// después de la foto. El ETag cubre foto y veredicto: si coincide, 304 sin cuerpo.
export async function novedadesHttp(
  almacen: Almacen,
  sesion: Pick<SesionFila, "usuarioId" | "email">,
  proyectoId: string,
  request: Request,
): Promise<Response> {
  const id = proyectoId.trim();
  if (!id) return json({ aviso: "The event is missing." }, 400);
  try {
    if (!(await esOrganizador(almacen, id, sesion.usuarioId))) {
      return json({ aviso: AVISO_REVISION }, 403);
    }
    const proyecto = await almacen.leerProyecto(id);
    if (!proyecto) return json({ aviso: "We couldn't find that event." }, 404);
    if (demoHabilitado() && sesionEsDemo(sesion) && !esProyectoDemo(proyecto)) {
      return json({ aviso: AVISO_REVISION }, 403);
    }
    const cambios = await marcasDeProyecto(almacen, id);
    const cursor = etagDe(cambios);
    if (sinCambio(request, cursor)) {
      return new Response(null, { status: 304, headers: encabezados(cursor) });
    }
    return json({ cursor, hasta: hastaDe(cambios), cambios }, 200, encabezados(cursor));
  } catch {
    return baseNoLista();
  }
}

export async function marcasDeProyecto(almacen: Almacen, proyectoId: string): Promise<Marca[]> {
  const tareas = (await almacen.listarTareas()).filter((tarea) => tarea.proyectoId === proyectoId);
  const marcas = await Promise.all(tareas.map((tarea) => marcaDe(almacen, tarea)));
  marcas.sort((a, b) => (a.tareaId < b.tareaId ? -1 : a.tareaId > b.tareaId ? 1 : 0));
  return marcas;
}

export function etagDe(marcas: readonly Marca[]): string {
  const cuerpo = marcas.map((marca) => `${marca.tareaId}${SEPARADOR}${marca.sello}`).join("\n");
  return createHash("sha256").update(cuerpo).digest("hex").slice(0, 32);
}

async function marcaDe(almacen: Almacen, tarea: TareaFila): Promise<Marca> {
  const { evidencia, veredicto } = await leerVeredictoVigente(almacen, tarea);
  const visible = veredicto && veredicto.origen !== "error" ? veredicto.veredicto : null;
  const origen = veredicto?.origen ?? null;
  const sello = createHash("sha256")
    .update(
      [
        tarea.id,
        tarea.estado,
        tarea.miembroId,
        tarea.hashPago ?? "",
        tarea.contratoEscrow ?? "",
        evidencia?.id ?? "",
        evidencia?.creadaEn ?? "",
        evidencia?.monto ?? "",
        evidencia?.fecha ?? "",
        evidencia?.montoConfirmado ?? "",
        visible ?? "",
        origen ?? "",
        veredicto?.frase ?? "",
        veredicto?.score ?? "",
      ].join(SEPARADOR),
    )
    .digest("hex")
    .slice(0, 32);
  return {
    tareaId: tarea.id,
    estado: tarea.estado,
    evidenciaId: evidencia?.id ?? null,
    creadaEn: evidencia?.creadaEn ?? null,
    veredicto: visible,
    origen,
    sello,
  };
}

function hastaDe(marcas: readonly Marca[]): string | null {
  let hasta: string | null = null;
  for (const marca of marcas) {
    if (!marca.creadaEn) continue;
    if (!hasta || marca.creadaEn > hasta) hasta = marca.creadaEn;
  }
  return hasta;
}

function sinCambio(request: Request, cursor: string): boolean {
  const header = request.headers.get("if-none-match");
  const since = sinceDe(request);
  return tokens(header).includes(cursor) || tokens(since).includes(cursor);
}

function sinceDe(request: Request): string | null {
  try {
    return new URL(request.url).searchParams.get("since");
  } catch {
    return null;
  }
}

function tokens(valor: string | null): string[] {
  if (!valor) return [];
  return valor
    .split(",")
    .map((parte) => parte.trim().replace(/^W\//i, "").replaceAll('"', ""))
    .filter((parte) => /^[a-f0-9]{32}$/.test(parte));
}

function encabezados(cursor: string): HeadersInit {
  return {
    ETag: `"${cursor}"`,
    "Cache-Control": "private, no-store",
  };
}
