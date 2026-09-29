import type { Fotos } from "@/lib/blob/fotos";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla, esBlobEjemplo, esProyectoDemo } from "@/lib/db/semilla";
import type { EvidenciaFila, Rol, TareaFila, VeredictoFila } from "@/lib/db/tipos";
import { contextoDesdeEntorno, revisar } from "@/lib/revision/revisar";
import type { ResultadoRevision } from "@/lib/revision/armar";
import { accesoEvidencia, type Visor } from "./alcance";
import { baseNoLista, json, sinFotos } from "./json";

const MAX_BYTES = 8_000_000;
const PLAZO_MS = 2800;

export type ActorEvidencia = {
  usuarioId: string;
  rol: Rol;
  demo?: boolean;
};

export type DepsEvidencia = {
  almacen: Almacen;
  fotos: Fotos | null;
  actor?: ActorEvidencia;
  revisarTarea?: (tarea: TareaFila, foto: Awaited<ReturnType<Fotos["leer"]>>) => Promise<ResultadoRevision>;
  continuar?: (trabajo: Promise<void>) => void;
};

export function evidenciaPublica(evidencia: EvidenciaFila) {
  return {
    id: evidencia.id,
    tareaId: evidencia.tareaId,
    blobId: evidencia.blobId,
    monto: evidencia.monto,
    fecha: evidencia.fecha,
  };
}

export async function leerEvidenciaHttp(almacen: Almacen, id: string, visor: Visor): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const evidencia = await almacen.leerEvidencia(id);
    const acceso = await accesoEvidencia(almacen, visor, evidencia);
    if (!evidencia || acceso === "ausente") return json({ aviso: "We couldn't find that evidence." }, 404);
    if (acceso === "entrar") return json({ aviso: "Sign in to continue." }, 401);
    if (acceso === "no") return json({ aviso: "You can't view that evidence." }, 403);
    return json({ evidencia: evidenciaPublica(evidencia) });
  } catch {
    return baseNoLista();
  }
}

const MARCADOR_EJEMPLO = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" role="img" aria-label="Sample evidence"><rect width="64" height="48" fill="#ece7dc"/></svg>`;

export async function leerFotoHttp(almacen: Almacen, fotos: Fotos | null, id: string, visor: Visor): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const evidencia = await almacen.leerEvidencia(id);
    const acceso = await accesoEvidencia(almacen, visor, evidencia);
    if (!evidencia || acceso === "ausente") return json({ aviso: "We couldn't find that evidence." }, 404);
    if (acceso === "entrar") return json({ aviso: "Sign in to continue." }, 401);
    if (acceso === "no") return json({ aviso: "You can't view that evidence." }, 403);
    if (esBlobEjemplo(evidencia.blobId)) {
      return new Response(MARCADOR_EJEMPLO, {
        headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=3600" },
      });
    }
    if (!fotos) return sinFotos();
    const foto = await fotos.leer(evidencia.blobId);
    if (!foto) return json({ aviso: "We couldn't find the photo." }, 404);
    return new Response(Buffer.from(foto.bytes), {
      headers: { "content-type": foto.tipo || "application/octet-stream", "cache-control": "private, max-age=3600" },
    });
  } catch {
    return baseNoLista();
  }
}

export async function publicarEvidenciaHttp(request: Request, deps: DepsEvidencia): Promise<Response> {
  if (!deps.fotos) return sinFotos();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ aviso: "The photo did not arrive." }, 400);
  }
  const tareaId = texto(form.get("tareaId"));
  const foto = form.get("foto");
  if (!tareaId || !(foto instanceof Blob)) return json({ aviso: "The task and the photo are missing." }, 400);
  if (foto.size > MAX_BYTES) return json({ aviso: "The photo is too large." }, 413);
  if (!esImagen(foto)) return json({ aviso: "Choose a photo." }, 400);

  try {
    await asegurarSemilla(deps.almacen);
    const tarea = await deps.almacen.leerTarea(tareaId);
    if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
    const asignado = puedeFijarWallet(tarea, deps.actor);
    // La sesión demo sube evidencia a las tareas del proyecto demo, sin fijar cuenta de cobro.
    const demo = !asignado && deps.actor?.demo === true && esProyectoDemo(await deps.almacen.leerProyecto(tarea.proyectoId));
    const wallet = demo ? null : direccion(texto(form.get("wallet")));
    if (deps.actor && !asignado && !demo) {
      const aviso =
        wallet && wallet !== tarea.walletCobro
          ? "Only the person assigned to the task can set the payout account."
          : "Only the person assigned to the task can submit evidence.";
      return json({ aviso }, 403);
    }
    if (wallet && wallet !== tarea.walletCobro && !asignado) {
      return json({ aviso: "Only the person assigned to the task can set the payout account." }, 403);
    }

    let blobId: string;
    try {
      blobId = await deps.fotos.guardar("evidencia.jpg", foto);
    } catch {
      return json({ aviso: "Could not save the photo." }, 502);
    }
    const evidencia: EvidenciaFila = {
      id: crypto.randomUUID(),
      tareaId,
      blobId,
      monto: null,
      fecha: null,
      creadaEn: new Date().toISOString(),
    };
    await deps.almacen.crearEvidencia(evidencia);
    if (tarea.estado === "pendiente") await deps.almacen.actualizarTarea(tareaId, { estado: "en revisión" });
    if (wallet && wallet !== tarea.walletCobro) await deps.almacen.actualizarTarea(tareaId, { walletCobro: wallet });

    const leida = await deps.fotos.leer(blobId);
    const trabajo = (deps.revisarTarea ?? revisarPorDefecto)(tarea, leida);
    const conTope = !deps.revisarTarea && Boolean(contextoDesdeEntorno().claveGroq);
    const listo = conTope ? await conPlazo(trabajo, PLAZO_MS) : await trabajo;
    if (listo) {
      await guardarRevision(deps.almacen, evidencia.id, tareaId, listo);
    } else if (deps.continuar) {
      deps.continuar(
        trabajo
          .then((resultado) => guardarRevision(deps.almacen, evidencia.id, tareaId, resultado))
          .catch(() => undefined),
      );
    }
    const guardada = (await deps.almacen.leerEvidencia(evidencia.id)) ?? evidencia;
    return json({ evidencia: evidenciaPublica(guardada) }, 201);
  } catch {
    return baseNoLista();
  }
}

async function revisarPorDefecto(tarea: TareaFila, foto: Awaited<ReturnType<Fotos["leer"]>>): Promise<ResultadoRevision> {
  return revisar(tarea, foto, contextoDesdeEntorno());
}

export async function guardarRevision(
  almacen: Almacen,
  evidenciaId: string,
  tareaId: string,
  resultado: ResultadoRevision,
): Promise<void> {
  const veredicto: VeredictoFila = {
    id: evidenciaId,
    evidenciaId,
    tareaId,
    veredicto: resultado.veredicto,
    frase: resultado.frase,
    textoScout: resultado.texto,
    choice: resultado.choice,
    noul: resultado.noul ? "si" : "no",
    score: resultado.score,
    origen: resultado.origen,
  };
  await almacen.guardarVeredicto(veredicto);
  if (resultado.origen === "error") return;
  await almacen.actualizarEvidencia(evidenciaId, { monto: resultado.monto, fecha: resultado.fecha });
}

function conPlazo<T>(trabajo: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    trabajo.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function esImagen(foto: Blob): boolean {
  if (foto.type.startsWith("image/")) return true;
  return foto.type === "" && foto.size > 0;
}

function direccion(valor: string): string | null {
  if (!/^G[A-Z2-7]{55}$/.test(valor)) return null;
  return valor;
}

function puedeFijarWallet(tarea: TareaFila, actor: ActorEvidencia | undefined): boolean {
  return Boolean(actor && tarea.miembroId && actor.usuarioId === tarea.miembroId);
}
