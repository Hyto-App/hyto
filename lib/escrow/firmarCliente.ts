import { crearAuth, conectarStellar } from "@/lib/auth/cliente";

export const AVISO_DEMO_FIRMA = "Modo demo: las firmas están desactivadas";
export const AVISO_XLM = "No hay XLM suficiente para la comisión.";
export const AVISO_RECHAZO = "Rechazaste la firma.";
export const AVISO_FIRMA = "No se pudo firmar el pago.";

export type AccionCliente = "desplegar" | "fondear" | "marcar" | "aprobar" | "liberar";

export type ExtraFirma = Record<string, unknown>;

export type PagoFirmado = {
  hash: string | null;
  contrato: string | null;
};

export type OpcionesFirma = {
  fetch?: typeof fetch;
  firmar?: (unsignedXdr: string) => Promise<string>;
  extra?: ExtraFirma;
  alEmpezar?: (accion: AccionCliente) => void;
};

const ACCIONES = new Set<AccionCliente>(["desplegar", "fondear", "marcar", "aprobar", "liberar"]);

export class ErrorFirmaCliente extends Error {
  estado: number | null;

  constructor(mensaje: string, estado: number | null = null) {
    super(mensaje);
    this.name = "ErrorFirmaCliente";
    this.estado = estado;
  }
}

export async function firmarYEnviar(
  accion: AccionCliente,
  tareaId: string,
  extra: ExtraFirma = {},
  opciones: OpcionesFirma = {},
): Promise<PagoFirmado> {
  if (!ACCIONES.has(accion)) throw new ErrorFirmaCliente("Esa acción no prepara un pago.");
  const id = tareaId.trim();
  if (!id) throw new ErrorFirmaCliente("Falta la tarea.");

  const fetchImpl = opciones.fetch ?? fetch;
  const preparado = await postJson(fetchImpl, "/api/firma", cuerpoFirma(accion, id, extra));
  const xdr = leerXdr(preparado.cuerpo);
  let firmado: string;
  try {
    firmado = (await (opciones.firmar ?? firmarConCavos)(xdr)).trim();
  } catch (error) {
    throw traducirFirma(error);
  }
  if (!firmado) throw new ErrorFirmaCliente(AVISO_FIRMA);

  const enviado = await postJson(fetchImpl, "/api/firma/enviar", { xdr: firmado, accion, tareaId: id });
  return leerPago(enviado.cuerpo, contratoDe(preparado.cuerpo));
}

export async function firmarPasos(
  acciones: readonly AccionCliente[],
  tareaId: string,
  opciones: OpcionesFirma = {},
): Promise<PagoFirmado> {
  if (acciones.length === 0) throw new ErrorFirmaCliente("Falta la acción.");
  let contrato: string | null = null;
  let ultimo: PagoFirmado = { hash: null, contrato: null };
  for (const accion of acciones) {
    opciones.alEmpezar?.(accion);
    const extra = { ...opciones.extra, ...(contrato ? { contrato } : {}) };
    ultimo = await firmarYEnviar(accion, tareaId, extra, opciones);
    contrato = ultimo.contrato ?? contrato;
  }
  return { hash: ultimo.hash, contrato };
}

function cuerpoFirma(accion: AccionCliente, tareaId: string, extra: ExtraFirma): Record<string, unknown> {
  const limpio: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(extra)) {
    if (clave === "accion" || clave === "tareaId" || clave === "xdr") continue;
    limpio[clave] = valor;
  }
  return { ...limpio, accion, tareaId };
}

async function firmarConCavos(unsignedXdr: string): Promise<string> {
  const auth = await crearAuth();
  if (!auth) throw new ErrorFirmaCliente("Falta configurar Cavos para entrar.");
  const conectada = await conectarStellar(auth);
  const billetera = conectada.wallet("stellar");
  if (billetera.chain !== "stellar") throw new ErrorFirmaCliente(AVISO_FIRMA);
  return billetera.signXdr(unsignedXdr);
}

async function postJson(
  fetchImpl: typeof fetch,
  url: string,
  cuerpo: Record<string, unknown>,
): Promise<{ cuerpo: unknown }> {
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
  } catch (error) {
    throw traducirFirma(error);
  }
  const json = await leerJson(respuesta);
  if (!respuesta.ok) throw errorHttp(respuesta.status, json);
  return { cuerpo: json };
}

function leerXdr(json: unknown): string {
  const datos = registro(json);
  const xdr = texto(datos.xdr) ?? texto(datos.unsignedXdr);
  if (!xdr) throw new ErrorFirmaCliente("La preparación no devolvió el XDR.");
  return xdr;
}

function leerPago(json: unknown, contratoPreparado: string | null): PagoFirmado {
  const datos = registro(json);
  return {
    hash: texto(datos.hash) ?? texto(datos.txHash),
    contrato: texto(datos.contrato) ?? texto(datos.contractId) ?? contratoPreparado,
  };
}

function contratoDe(json: unknown): string | null {
  const datos = registro(json);
  return texto(datos.contrato) ?? texto(datos.contractId);
}

function errorHttp(estado: number, json: unknown): ErrorFirmaCliente {
  const datos = registro(json);
  const aviso = texto(datos.aviso) ?? texto(datos.message) ?? "";
  const codigo = texto(datos.codigo) ?? texto(datos.code) ?? "";
  const junto = `${aviso} ${codigo}`;
  if (estado === 403 && /demo/i.test(junto)) return new ErrorFirmaCliente(AVISO_DEMO_FIRMA, 403);
  if (esXlm(junto)) return new ErrorFirmaCliente(AVISO_XLM, estado);
  if (aviso) return new ErrorFirmaCliente(aviso, estado);
  if (estado === 403) return new ErrorFirmaCliente("Solo el organizador prepara el pago.", 403);
  return new ErrorFirmaCliente(AVISO_FIRMA, estado);
}

export function traducirFirma(error: unknown): ErrorFirmaCliente {
  if (error instanceof ErrorFirmaCliente) return error;
  const textoError = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (esRechazo(textoError)) return new ErrorFirmaCliente(AVISO_RECHAZO);
  if (esXlm(textoError)) return new ErrorFirmaCliente(AVISO_XLM);
  if (/demo/i.test(textoError) && /firma|desactiv/i.test(textoError)) return new ErrorFirmaCliente(AVISO_DEMO_FIRMA, 403);
  return new ErrorFirmaCliente(AVISO_FIRMA);
}

function esRechazo(textoError: string): boolean {
  return /reject|rechaz|denied|declin|cancel/i.test(textoError);
}

function esXlm(textoError: string): boolean {
  return /insufficient|underfunded|op_underfunded|tx_insufficient|stellar_tx_insufficient/i.test(textoError);
}

async function leerJson(respuesta: Response): Promise<unknown> {
  try {
    return await respuesta.json();
  } catch {
    return null;
  }
}

function registro(json: unknown): Record<string, unknown> {
  if (!json || typeof json !== "object") return {};
  return json as Record<string, unknown>;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}
