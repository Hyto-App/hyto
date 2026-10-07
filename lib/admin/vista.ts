import { calcularEstadoTarea } from "@/lib/api/estado-tarea";
import { PROYECTO_EJEMPLO, tareasEjemploAdmin } from "./ejemplo";
export { notaCopia, notaManual } from "@/lib/evidencia/copia";
import { texto } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";
import type { MemoriaAdmin, PersonaInforme, Resumen, TareaAdmin, TareaCreada, VistaAdmin } from "./tipos";

const MONTO = /^\d+([.,]\d{1,2})?$/;

export function centavos(valor: string | null): number {
  const texto = valor?.trim() ?? "";
  if (!MONTO.test(texto)) return 0;
  const [entero, fraccion = ""] = texto.replace(",", ".").split(".");
  return Number(entero) * 100 + Number((fraccion + "00").slice(0, 2));
}

export function normalizarMonto(valor: string): string | null {
  const texto = valor.trim();
  if (!MONTO.test(texto)) return null;
  const valorCentavos = centavos(texto);
  if (valorCentavos <= 0) return null;
  return textoMonto(valorCentavos);
}

export function textoMonto(centavosValor: number): string {
  const signo = centavosValor < 0 ? "-" : "";
  const absoluto = Math.abs(centavosValor);
  const entero = Math.floor(absoluto / 100);
  const decimales = absoluto % 100;
  if (decimales === 0) return `${signo}${entero}`;
  return `${signo}${entero}.${String(decimales).padStart(2, "0")}`;
}

export function centavosPresupuesto(tarea: TareaAdmin): number {
  if (tarea.tipo === "reembolso") return centavos(tarea.tope ?? tarea.monto);
  return centavos(tarea.monto);
}

export function centavosGasto(tarea: TareaAdmin): number {
  if (tarea.estado !== "pagado") return 0;
  if (tarea.tipo === "reembolso" && centavos(tarea.montoConfirmado) > 0) return centavos(tarea.montoConfirmado);
  if (tarea.tipo === "reembolso" && tarea.montoRevisado) return centavos(tarea.montoRevisado);
  return centavos(tarea.monto);
}

export type DetalleMonto = {
  cifra: string;
  hasta: boolean;
  tope: string | null;
};

export function detalleMonto(tarea: TareaAdmin): DetalleMonto {
  const confirmado = tarea.tipo === "reembolso" && centavos(tarea.montoConfirmado) > 0 ? tarea.montoConfirmado : null;
  const leido = tarea.tipo === "reembolso" && centavos(tarea.montoRevisado) > 0 ? tarea.montoRevisado : null;
  const cifra = confirmado ?? leido;
  if (cifra) {
    return {
      cifra: textoMonto(centavos(cifra)),
      hasta: false,
      tope: textoMonto(centavosPresupuesto(tarea)),
    };
  }
  if (tarea.estado === "pagado") {
    return { cifra: textoMonto(centavosGasto(tarea)), hasta: false, tope: null };
  }
  if (tarea.tipo === "reembolso") {
    return { cifra: textoMonto(centavosPresupuesto(tarea)), hasta: true, tope: null };
  }
  return { cifra: textoMonto(centavos(tarea.monto)), hasta: false, tope: null };
}

export function resumir(tareas: TareaAdmin[]): Resumen {
  const presupuesto = tareas.reduce((total, tarea) => total + centavosPresupuesto(tarea), 0);
  const pagado = tareas.reduce((total, tarea) => total + centavosGasto(tarea), 0);
  return {
    presupuesto: textoMonto(presupuesto),
    pagado: textoMonto(pagado),
    pendiente: textoMonto(presupuesto - pagado),
  };
}

export function aplicarDecision(tarea: TareaAdmin, decision: "pagado" | "pendiente" | undefined): TareaAdmin {
  if (!decision) return tarea;
  if (decision === "pagado") return { ...tarea, estado: "pagado" };
  return sinVeredicto({ ...tarea, estado: "pendiente" });
}

/** After "Ask for another photo" the AI result belongs to the old file. */
export function sinVeredicto(tarea: TareaAdmin): TareaAdmin {
  return { ...tarea, veredicto: null, nota: null, frase: null, origen: null, codigo: null, etiquetas: [], lectura: null };
}

/**
 * One rule for the inbox list, its subtitle, and the event card count: a submission waits for the
 * organizer only while the task is in review. A pending task is not counted, even when a sample
 * verdict is still stored on it. A task sent back for another photo leaves the inbox.
 */
export function enBandeja(tarea: { estado: string; veredicto?: string | null }): boolean {
  return calcularEstadoTarea({ estado: tarea.estado }).enBandeja;
}

export function bandejaDe(tareas: TareaAdmin[]): TareaAdmin[] {
  return tareas.filter((tarea) => enBandeja(tarea));
}

export function porPersona(tareas: TareaAdmin[]): PersonaInforme[] {
  const orden: string[] = [];
  const grupos = new Map<string, PersonaInforme>();
  for (const tarea of tareas) {
    const clave = tarea.miembroId || tarea.miembro;
    const actual = grupos.get(clave);
    if (actual) {
      actual.tareas.push(tarea);
      continue;
    }
    orden.push(clave);
    grupos.set(clave, { miembroId: tarea.miembroId, miembro: tarea.miembro, tareas: [tarea] });
  }
  return orden.map((clave) => grupos.get(clave)!);
}

export function etiquetaOrigen(origen: TareaAdmin["origen"], idioma: Idioma = "en"): string | null {
  if (origen === "scout") return texto(idioma, "revision.origenIa");
  if (origen === "guion" || origen === "stub") return texto(idioma, "revision.origenMuestra");
  if (origen === "error") return texto(idioma, "revision.origenFallo");
  return null;
}

export function enlacePago(hash: string | null | undefined): string | null {
  const limpio = hash?.trim() ?? "";
  if (!/^[a-fA-F0-9]{64}$/.test(limpio)) return null;
  return `https://stellar.expert/explorer/testnet/tx/${limpio}`;
}

export function enlaceCredencial(url: string | null | undefined): string | null {
  const limpio = url?.trim() ?? "";
  if (!limpio) return null;
  try {
    const parsed = new URL(limpio);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function desdeCreada(tarea: TareaCreada, decision: "pagado" | "pendiente" | undefined): TareaAdmin {
  return aplicarDecision(
    {
      id: tarea.id,
      titulo: tarea.titulo,
      tipo: tarea.tipo,
      monto: tarea.monto,
      tope: tarea.tipo === "reembolso" ? tarea.monto : null,
      condicion: "",
      miembroId: "",
      miembro: "Unassigned",
      estado: "pendiente",
      veredicto: null,
      nota: null,
      frase: null,
      origen: null,
      codigo: null,
      montoRevisado: null,
      montoConfirmado: null,
      fecha: null,
      hashPago: null,
      credencialUrl: null,
    },
    decision,
  );
}

export function vistaAdmin(memoria: MemoriaAdmin | null): VistaAdmin {
  const decisiones = memoria?.decisiones ?? {};
  const propio = memoria?.proyecto ?? null;
  const tareas = propio
    ? propio.tareas.map((tarea) => desdeCreada(tarea, decisiones[tarea.id]))
    : tareasEjemploAdmin().map((tarea) => aplicarDecision(tarea, decisiones[tarea.id]));

  return {
    nombre: propio?.nombre || PROYECTO_EJEMPLO,
    ejemplo: true,
    propio: propio !== null,
    tareas,
    bandeja: bandejaDe(tareas),
    resumen: resumir(tareas),
    personas: porPersona(tareas),
  };
}
