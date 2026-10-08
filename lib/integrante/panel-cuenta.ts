import type { Almacen } from "@/lib/db/almacen";
import type { EvidenciaFila, TareaFila } from "@/lib/db/tipos";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { cifraConfirmada } from "@/lib/escrow/monto";
import { leerSaldoUsdc, type LectorSaldo } from "@/lib/escrow/saldo";
import { centavos, normalizarMonto, textoMonto } from "@/lib/admin/vista";
import {
  armarOrgullo,
  ZONA_MESES,
  type EstadoSaldo,
  type TareaCuenta,
  type VistaCuenta,
} from "./orgullo";
import type { Idioma } from "@/lib/ui/idioma";

export type { EstadoSaldo, VistaCuenta };

/**
 * El esquema no guarda la fecha del pago. El mes sale de la evidencia más reciente
 * (`creada_en`), que es la marca que ya existe cuando el hito se libera.
 * El monto de un reembolso es `monto_confirmado`. No se inventa el tope.
 */
export function montoLiberado(
  tarea: Pick<TareaFila, "tipo" | "monto" | "tope">,
  evidencia: Pick<EvidenciaFila, "montoConfirmado"> | null,
): string | null {
  if (tarea.tipo === "reembolso") {
    const normal = normalizarMonto(evidencia?.montoConfirmado ?? "");
    if (!normal || cifraConfirmada(normal, tarea.tope, tarea.monto) === null) return null;
    return textoMonto(centavos(normal));
  }
  return normalizarMonto(tarea.monto);
}

export async function armarVistaCuenta(opciones: {
  almacen: Almacen;
  usuarioId: string;
  email: string;
  wallet: string;
  demo: boolean;
  ahora?: Date;
  idioma?: Idioma;
  leerSaldo?: LectorSaldo;
}): Promise<VistaCuenta> {
  const ahora = opciones.ahora ?? new Date();
  const propias = await tareasDelUsuario(opciones.almacen, opciones.usuarioId);
  const orgullo = armarOrgullo(propias, ahora, ZONA_MESES, opciones.idioma ?? "en");
  const walletReal = esCuenta(opciones.wallet.trim()) ? opciones.wallet.trim() : null;
  const saldo = await leerSaldoDe(walletReal, opciones.leerSaldo);
  return {
    demo: opciones.demo,
    organiza: await organizaAlgunEvento(opciones.almacen, opciones.usuarioId),
    muestra: false,
    email: opciones.email,
    wallet: walletReal,
    walletMuestra: false,
    saldo: saldo.saldo,
    saldoEstado: saldo.estado,
    orgullo,
  };
}

async function organizaAlgunEvento(almacen: Almacen, usuarioId: string): Promise<boolean> {
  const miembros = await almacen.miembrosDeUsuario(usuarioId);
  return miembros.some((miembro) => miembro.estado === "active" && miembro.rol === "organizer");
}

async function tareasDelUsuario(almacen: Almacen, usuarioId: string): Promise<TareaCuenta[]> {
  const tareas = (await almacen.listarTareas()).filter((tarea) => tarea.miembroId === usuarioId);
  const nombres = new Map<string, string>();
  const filas: TareaCuenta[] = [];
  for (const tarea of tareas) {
    const pagada = tareaPagada(tarea);
    const evidencia = pagada ? await almacen.ultimaEvidencia(tarea.id) : null;
    filas.push({
      id: tarea.id,
      titulo: tarea.titulo,
      proyectoId: tarea.proyectoId,
      proyecto: await nombreProyecto(almacen, nombres, tarea.proyectoId),
      pagada,
      monto: pagada ? (montoLiberado(tarea, evidencia) ?? "") : "",
      pagadoEn: pagada ? (evidencia?.creadaEn ?? null) : null,
    });
  }
  return filas;
}

function tareaPagada(tarea: TareaFila): boolean {
  return tarea.estado === "pagado" && Boolean(tarea.hashPago?.trim());
}

async function nombreProyecto(almacen: Almacen, nombres: Map<string, string>, proyectoId: string): Promise<string> {
  const guardado = nombres.get(proyectoId);
  if (guardado) return guardado;
  const proyecto = await almacen.leerProyecto(proyectoId);
  const nombre = proyecto?.nombre?.trim() || "Event";
  nombres.set(proyectoId, nombre);
  return nombre;
}

async function leerSaldoDe(
  wallet: string | null,
  leerSaldo: LectorSaldo = leerSaldoUsdc,
): Promise<{ saldo: string | null; estado: EstadoSaldo }> {
  if (!wallet) return { saldo: null, estado: "sin-wallet" };
  try {
    const lectura = await leerSaldo(wallet);
    if (lectura.saldo === null) return { saldo: null, estado: "ausente" };
    return { saldo: lectura.saldo, estado: "ok" };
  } catch {
    return { saldo: null, estado: "error" };
  }
}
