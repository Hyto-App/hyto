export type CodigoFalloRevision =
  | "sin_clave"
  | "sin_laya"
  | "pdf"
  | "sin_texto"
  | "cupo"
  | "tiempo"
  | "proveedor"
  | "respuesta"
  | "sin_foto";

export type FuenteRevision = "groq" | "laya" | "revision";

const MENSAJES: Record<CodigoFalloRevision, string> = {
  sin_clave: "AI review is not configured",
  sin_laya: "AI scoring is not configured",
  pdf: "This PDF needs a person to review it. Automatic reading is not available, and it is not approved automatically.",
  sin_texto: "This file has no readable text, so it is not approved automatically.",
  cupo: "The AI quota is used up",
  tiempo: "The AI did not respond in time",
  proveedor: "The AI could not finish the review",
  respuesta: "The AI returned a response that could not be read",
  sin_foto: "There is no photo to review",
};

export class FalloRevision extends Error {
  readonly code: CodigoFalloRevision;
  readonly status: number | null;
  readonly providerMessage: string;
  readonly fuente: FuenteRevision;
  readonly mensaje: string;

  constructor(
    code: CodigoFalloRevision,
    opciones: {
      fuente: FuenteRevision;
      status?: number | null;
      providerMessage?: string;
      mensaje?: string;
      secreto?: string | null;
    },
  ) {
    const mensaje = opciones.mensaje ?? MENSAJES[code];
    super(mensaje);
    this.name = "FalloRevision";
    this.code = code;
    this.mensaje = mensaje;
    this.status = opciones.status ?? null;
    this.fuente = opciones.fuente;
    this.providerMessage = redactar(opciones.providerMessage ?? "", opciones.secreto);
  }
}

export function registrarFallo(fallo: FalloRevision): void {
  console.error("[revision]", {
    code: fallo.code,
    status: fallo.status,
    proveedor: fallo.fuente,
    mensaje: fallo.providerMessage,
  });
}

export function falloDeExcepcion(error: unknown, fuente: FuenteRevision, secreto?: string | null): FalloRevision {
  if (error instanceof FalloRevision) return error;
  const texto = error instanceof Error ? error.message : "";
  if (error instanceof TypeError) return new FalloRevision("proveedor", { fuente, providerMessage: texto, secreto });
  if (esTiempo(error)) return new FalloRevision("tiempo", { fuente, providerMessage: texto, secreto });
  return new FalloRevision("proveedor", { fuente, providerMessage: texto || "error", secreto });
}

export async function falloHttp(respuesta: Response, fuente: FuenteRevision, secreto?: string | null): Promise<FalloRevision> {
  const crudo = await textoSeguro(respuesta);
  const mensaje = mensajeProveedor(crudo);
  const code = esCupo(respuesta.status, `${crudo}\n${mensaje}`) ? "cupo" : "proveedor";
  return new FalloRevision(code, { fuente, status: respuesta.status, providerMessage: mensaje, secreto });
}

export function esTiempo(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const nombre = "name" in error ? String(error.name) : "";
  if (nombre === "TimeoutError" || nombre === "AbortError") return true;
  const mensaje = "message" in error ? String(error.message) : "";
  return /timeout|timed out|aborted/i.test(mensaje);
}

export function esCupo(status: number, cuerpo: string): boolean {
  if (status === 429) return true;
  return /rate[\s_-]*limit|too many requests|\bquota\b|insufficient_quota/i.test(cuerpo);
}

function mensajeProveedor(crudo: string): string {
  const limpio = redactar(crudo);
  if (!limpio) return "";
  try {
    const json = JSON.parse(limpio) as { error?: { message?: unknown } | string; message?: unknown };
    const anidado = json.error;
    if (anidado && typeof anidado === "object" && typeof anidado.message === "string") return redactar(anidado.message);
    if (typeof anidado === "string") return redactar(anidado);
    if (typeof json.message === "string") return redactar(json.message);
  } catch {
    return limpio;
  }
  return limpio;
}

async function textoSeguro(respuesta: Response): Promise<string> {
  try {
    return await respuesta.text();
  } catch {
    return "";
  }
}

function redactar(texto: string, secreto?: string | null): string {
  let limpio = texto.replace(/\s+/g, " ").replace(/Bearer\s+\S+/gi, "Bearer [redactado]");
  limpio = limpio.replace(/\b(?:gsk|sk)_[A-Za-z0-9_-]{6,}\b/g, "[redactado]");
  const clave = secreto?.trim() ?? "";
  if (clave.length >= 6) limpio = limpio.split(clave).join("[redactado]");
  return limpio.trim().slice(0, 180);
}
