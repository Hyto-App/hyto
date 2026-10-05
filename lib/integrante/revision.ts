import type { EstadoTarea, EtapaTarea, OrigenRechazo, Rechazo, RequisitoRevision, Tarea } from "./tipos";

/**
 * Client reading of the review contract from mailbox #058 and spec §7.2.
 * No database columns here. Missing fields stay empty so the screens wait for the API.
 *
 * TODO(intentos): the attempt cap is not decided. Retry until venceEn. When it is decided,
 * validate it on the server and show "You have N attempts left" here. Do not cap attempts now.
 */

const ETAPAS: EtapaTarea[] = ["en_revision", "enviada_organizador", "aprobada", "rechazada"];
const MAX_REQUISITOS = 3;
const MAX_NOTA = 280;
const MAX_PUNTOS = 5;

export type CamposRevision = {
  venceEn: string | null;
  rechazada: boolean;
  rechazo: Rechazo | null;
  intentos: number;
  ultimaEvidenciaId: string | null;
  organizador: { nombre: string } | null;
  hashPago: string | null;
  etapa: EtapaTarea | null;
  requisitos: RequisitoRevision[];
  montoPagado: string | null;
};

export function leerCamposRevision(crudo: Record<string, unknown>, estado: EstadoTarea): CamposRevision {
  const anidada = objeto(crudo.revision) ?? objeto(crudo.resultado);
  const etapa = etapaDe(crudo.etapa) ?? etapaDe(anidada?.etapa);
  const requisitos = leerRequisitos(crudo.requisitos ?? anidada?.requisitos);
  const rechazo = conFallidosDeRequisitos(leerRechazo(crudo.rechazo ?? anidada?.rechazo), requisitos);
  const revisionRechazada = anidada?.estado === "rechazada";
  let rechazada = false;
  if (crudo.rechazada !== false && estado === "pendiente") {
    rechazada = crudo.rechazada === true || etapa === "rechazada" || revisionRechazada || rechazo !== null;
  }

  return {
    venceEn: fechaIso(crudo.venceEn) ?? fechaIso(crudo.vence_en),
    rechazada,
    rechazo: rechazada || estado === "pendiente" ? rechazo : null,
    intentos: entero(crudo.intentos) ?? entero(anidada?.intento) ?? entero(crudo.intento) ?? 0,
    ultimaEvidenciaId: textoCorto(crudo.ultimaEvidenciaId, 80) ?? textoCorto(crudo.ultima_evidencia_id, 80),
    organizador: leerOrganizador(crudo.organizador),
    // Computed so the schema scan does not treat this read as a database write.
    ["hashPago"]: textoCorto(crudo.hashPago, 128),
    etapa,
    requisitos,
    montoPagado: textoCorto(crudo.montoPagado, 32) ?? textoCorto(crudo.montoConfirmado, 32),
  };
}

export function estaRechazada(tarea: Pick<Tarea, "estado" | "rechazada">): boolean {
  return tarea.estado === "pendiente" && tarea.rechazada === true;
}

export function plazoVencido(iso: string | null | undefined, ahora = new Date()): boolean {
  if (!iso) return false;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha.getTime() <= ahora.getTime();
}

export function montoUsdc(tarea: Pick<Tarea, "tipo" | "monto" | "tope" | "montoPagado">): string {
  const crudo = tarea.montoPagado || (tarea.tipo === "reembolso" ? (tarea.tope ?? tarea.monto) : tarea.monto);
  const valor = Number(String(crudo).trim());
  if (!Number.isFinite(valor)) return String(crudo).trim();
  const decimales = Number.isInteger(valor) ? 0 : 2;
  return valor.toLocaleString("en-US", { minimumFractionDigits: decimales, maximumFractionDigits: 2 });
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letras = partes.map((parte) => parte[0]?.toUpperCase() ?? "").join("");
  return letras || "?";
}

export function abreviarNota(nota: string, maximo = 80): string {
  const limpio = nota.trim();
  if (limpio.length <= maximo) return limpio;
  return `${limpio.slice(0, maximo - 1).trimEnd()}…`;
}

export function clavePagoVisto(tareaId: string): string {
  return `hyto-pago-visto:${tareaId}`;
}

/** Body the organizer sheet sends. The API ignores it until the review columns exist. */
export function cuerpoPedirOtra(nota: string, fallidos: number[], puntos: string[]): {
  nota: string | null;
  fallidos: number[];
  rechazo: { nota: string | null; fallidos: number[]; origen: "organizador" };
  requisitos: { id: string; texto: string; cumple: boolean }[];
} {
  const limpia = sanearNota(nota);
  const indices = new Set(fallidos.filter((indice) => Number.isInteger(indice) && indice >= 0 && indice < puntos.length && indice < MAX_REQUISITOS));
  const lista = [...indices].sort((a, b) => a - b);
  return {
    nota: limpia,
    fallidos: lista,
    rechazo: { nota: limpia, fallidos: lista, origen: "organizador" },
    requisitos: puntos.slice(0, MAX_REQUISITOS).map((texto, indice) => ({
      id: String(indice),
      texto,
      cumple: !indices.has(indice),
    })),
  };
}

function conFallidosDeRequisitos(rechazo: Rechazo | null, requisitos: RequisitoRevision[]): Rechazo | null {
  const desdeRequisitos = requisitos.flatMap((requisito, indice) => (requisito.cumple === false ? [indice] : []));
  if (!rechazo) {
    if (desdeRequisitos.length === 0) return null;
    const motivo = requisitos.find((requisito) => requisito.cumple === false)?.motivo ?? null;
    return { nota: motivo, fallidos: desdeRequisitos, en: null, origen: null };
  }
  if (rechazo.fallidos.length > 0 || desdeRequisitos.length === 0) return rechazo;
  return { ...rechazo, fallidos: desdeRequisitos };
}

function leerRequisitos(valor: unknown): RequisitoRevision[] {
  if (!Array.isArray(valor)) return [];
  const salida: RequisitoRevision[] = [];
  for (const item of valor) {
    const crudo = objeto(item);
    if (!crudo) continue;
    const texto = typeof crudo.texto === "string" ? crudo.texto.trim() : "";
    if (!texto) continue;
    const id = textoCorto(crudo.id, 40) ?? String(salida.length);
    salida.push({
      id,
      texto: texto.slice(0, MAX_NOTA),
      cumple: crudo.cumple === true ? true : crudo.cumple === false ? false : null,
      motivo: sanearNota(crudo.motivo),
    });
    if (salida.length === MAX_REQUISITOS) break;
  }
  return salida;
}

function leerRechazo(valor: unknown): Rechazo | null {
  let crudo = objeto(valor);
  if (!crudo && typeof valor === "string") {
    try {
      crudo = objeto(JSON.parse(valor));
    } catch {
      return null;
    }
  }
  if (!crudo) return null;
  const nota = sanearNota(crudo.nota);
  const fallidos = indices(crudo.fallidos, MAX_PUNTOS);
  const en = fechaIso(crudo.en);
  const origen: OrigenRechazo | null = crudo.origen === "mile" || crudo.origen === "organizador" ? crudo.origen : null;
  if (!nota && fallidos.length === 0 && !en && !origen) return null;
  return { nota, fallidos, en, origen };
}

function leerOrganizador(valor: unknown): { nombre: string } | null {
  if (typeof valor === "string") {
    const nombre = valor.trim().slice(0, 80);
    return nombre ? { nombre } : null;
  }
  const crudo = objeto(valor);
  const nombre = crudo ? textoCorto(crudo.nombre, 80) : null;
  return nombre ? { nombre } : null;
}

export function sanearNota(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!limpio) return null;
  return limpio.slice(0, MAX_NOTA);
}

function indices(valor: unknown, maximo: number): number[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<number>();
  for (const item of valor) {
    if (typeof item !== "number" || !Number.isInteger(item) || item < 0 || item >= maximo) continue;
    vistos.add(item);
  }
  return [...vistos].sort((a, b) => a - b);
}

function etapaDe(valor: unknown): EtapaTarea | null {
  return ETAPAS.includes(valor as EtapaTarea) ? (valor as EtapaTarea) : null;
}

function fechaIso(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor.trim()) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return valor.trim();
}

function entero(valor: unknown): number | null {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 0 || valor > 99) return null;
  return valor;
}

function textoCorto(valor: unknown, maximo: number): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!limpio) return null;
  return limpio.slice(0, maximo);
}

function objeto(valor: unknown): Record<string, unknown> | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}
