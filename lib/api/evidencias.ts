import type { Fotos } from "@/lib/blob/fotos";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { EvidenciaFila, Rol, TareaFila, VeredictoFila } from "@/lib/db/tipos";
import { contextoDesdeEntorno, revisar } from "@/lib/revision/revisar";
import type { ResultadoRevision } from "@/lib/revision/armar";
import { baseNoLista, json, sinFotos } from "./json";

const MAX_BYTES = 8_000_000;
const PLAZO_MS = 2800;

export type ActorEvidencia = {
  usuarioId: string;
  rol: Rol;
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

export async function leerEvidenciaHttp(almacen: Almacen, id: string): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const evidencia = await almacen.leerEvidencia(id);
    if (!evidencia) return json({ aviso: "No encontramos esa evidencia." }, 404);
    return json({ evidencia: evidenciaPublica(evidencia) });
  } catch {
    return baseNoLista();
  }
}

export async function leerFotoHttp(almacen: Almacen, fotos: Fotos | null, id: string): Promise<Response> {
  if (!fotos) return sinFotos();
  try {
    await asegurarSemilla(almacen);
    const evidencia = await almacen.leerEvidencia(id);
    if (!evidencia) return json({ aviso: "No encontramos esa evidencia." }, 404);
    const foto = await fotos.leer(evidencia.blobId);
    if (!foto) return json({ aviso: "No encontramos la foto." }, 404);
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
    return json({ aviso: "La foto no llegó." }, 400);
  }
  const tareaId = texto(form.get("tareaId"));
  const foto = form.get("foto");
  if (!tareaId || !(foto instanceof Blob)) return json({ aviso: "Faltan la tarea y la foto." }, 400);
  if (foto.size > MAX_BYTES) return json({ aviso: "La foto es demasiado grande." }, 413);
  if (!esImagen(foto)) return json({ aviso: "Elige una foto." }, 400);

  try {
    await asegurarSemilla(deps.almacen);
    const tarea = await deps.almacen.leerTarea(tareaId);
    if (!tarea) return json({ aviso: "No encontramos esa tarea." }, 404);
    const wallet = direccion(texto(form.get("wallet")));
    const asignado = puedeFijarWallet(tarea, deps.actor);
    if (deps.actor && !asignado) {
      const aviso =
        wallet && wallet !== tarea.walletCobro
          ? "Solo quien tiene la tarea puede indicar la cuenta de cobro."
          : "Solo quien tiene la tarea puede enviar la evidencia.";
      return json({ aviso }, 403);
    }
    if (wallet && wallet !== tarea.walletCobro && !asignado) {
      return json({ aviso: "Solo quien tiene la tarea puede indicar la cuenta de cobro." }, 403);
    }

    let blobId: string;
    try {
      blobId = await deps.fotos.guardar("evidencia.jpg", foto);
    } catch {
      return json({ aviso: "No se pudo guardar la foto." }, 502);
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
