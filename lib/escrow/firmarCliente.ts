import { asegurarIdentidadCavos } from "@/lib/auth/cavosSesion";
import { crearAuth, conectarStellar } from "@/lib/auth/cliente";

export const AVISO_DEMO_FIRMA = "Demo mode can't send payments. Sign in with your email to continue.";
export const AVISO_XLM = "This account needs a little test balance for the network fee. Add some and try again.";
export const AVISO_RECHAZO = "You cancelled the confirmation. Nothing was sent.";
export const AVISO_FIRMA = "We couldn't complete that step. Try again.";
export const AVISO_SIN_CONTRATO = "The budget was sent, but we couldn't confirm it yet. Refresh and try again.";
export const AVISO_SESION_CAVOS = "Your sign-in expired. Sign in again to continue.";
export const AVISO_REINGRESO = "Your sign-in expired. Sign in again to continue.";

export function mensajeFirmaVisible(mensaje: string): string {
  if (mensaje === AVISO_SESION_CAVOS) return AVISO_REINGRESO;
  return mensaje;
}

const PAGO: readonly AccionCliente[] = ["marcar", "aprobar", "liberar"];

export function pasosDesde(fallo: AccionCliente | null): AccionCliente[] {
  const indice = fallo ? PAGO.indexOf(fallo) : -1;
  return indice >= 0 ? PAGO.slice(indice) : [...PAGO];
}

export type AccionCliente = "desplegar" | "fondear" | "marcar" | "aprobar" | "liberar";

export type ExtraFirma = {
  contrato?: string;
  firmante?: string;
  monto?: number;
  indice?: number;
  estado?: string;
  evidencia?: string;
};

export type PagoFirmado = {
  hash: string | null;
  ledger: number | null;
  codigo: string | null;
  contrato: string | null;
  estado: string | null;
  aviso: string | null;
  monto: number | null;
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
  contrato: string | null;

  constructor(mensaje: string, estado: number | null = null, contrato: string | null = null) {
    super(mensaje);
    this.name = "ErrorFirmaCliente";
    this.estado = estado;
    this.contrato = contrato;
  }
}

export async function firmarYEnviar(
  accion: AccionCliente,
  tareaId: string,
  extra: ExtraFirma = {},
  opciones: OpcionesFirma = {},
): Promise<PagoFirmado> {
  if (!ACCIONES.has(accion)) throw new ErrorFirmaCliente("That action does not prepare a payment.");
  const id = tareaId.trim();
  if (!id) throw new ErrorFirmaCliente("The task is missing.");

  const fetchImpl = opciones.fetch ?? fetch;
  const preparado = await postJson(fetchImpl, "/api/firma", cuerpoFirma(accion, id, extra));
  const listo = leerPreparado(preparado.cuerpo);
  let firmado: string;
  try {
    firmado = (await (opciones.firmar ?? firmarConCavos)(listo.xdr)).trim();
  } catch (error) {
    throw traducirFirma(error);
  }
  if (!firmado) throw new ErrorFirmaCliente(AVISO_FIRMA);

  const contrato = listo.contrato ?? texto(extra.contrato);
  const enviado = await postJson(fetchImpl, "/api/firma/enviar", cuerpoEnvio(firmado, accion, id, contrato, listo.token));
  const pago = leerPago(enviado.cuerpo, contrato);
  return { ...pago, monto: listo.monto };
}

export async function firmarPasos(
  acciones: readonly AccionCliente[],
  tareaId: string,
  opciones: OpcionesFirma = {},
): Promise<PagoFirmado> {
  if (acciones.length === 0) throw new ErrorFirmaCliente("The action is missing.");
  let contrato = texto(opciones.extra?.contrato);
  let monto = opciones.extra?.monto;
  let ultimo: PagoFirmado = vacio();
  for (const accion of acciones) {
    opciones.alEmpezar?.(accion);
    const extra: ExtraFirma = { ...opciones.extra };
    if (accion === "desplegar") {
      delete extra.contrato;
      delete extra.firmante;
      delete extra.monto;
      delete extra.indice;
      delete extra.estado;
      delete extra.evidencia;
    } else if (contrato) {
      extra.contrato = contrato;
    }
    if (accion === "fondear" && typeof monto === "number") extra.monto = monto;
    try {
      ultimo = await firmarYEnviar(accion, tareaId, extra, opciones);
    } catch (error) {
      if (error instanceof ErrorFirmaCliente && contrato && !error.contrato) error.contrato = contrato;
      throw error;
    }
    contrato = ultimo.contrato ?? contrato;
    if (accion === "desplegar") {
      if (!contrato) throw new ErrorFirmaCliente(ultimo.aviso ?? AVISO_SIN_CONTRATO);
      if (typeof ultimo.monto === "number") monto = ultimo.monto;
    }
  }
  return { ...ultimo, contrato };
}

function cuerpoFirma(accion: AccionCliente, tareaId: string, extra: ExtraFirma): Record<string, unknown> {
  if (accion === "desplegar") return { accion, tareaId };
  const cuerpo: Record<string, unknown> = { accion, tareaId };
  const contrato = texto(extra.contrato);
  const firmante = texto(extra.firmante);
  if (contrato) cuerpo.contrato = contrato;
  if (firmante) cuerpo.firmante = firmante;
  if (accion === "fondear" && typeof extra.monto === "number") cuerpo.monto = extra.monto;
  if (accion === "marcar" || accion === "aprobar" || accion === "liberar") {
    cuerpo.indice = Number.isInteger(extra.indice) ? extra.indice : 0;
  }
  if (accion === "marcar") {
    cuerpo.estado = texto(extra.estado) ?? "completed";
    const evidencia = texto(extra.evidencia);
    if (evidencia) cuerpo.evidencia = evidencia;
  }
  return cuerpo;
}

function cuerpoEnvio(
  xdr: string,
  accion: AccionCliente,
  tareaId: string,
  contrato: string | null,
  token: string,
): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = { xdr, accion, tareaId, token };
  if (contrato) cuerpo.contrato = contrato;
  return cuerpo;
}

async function firmarConCavos(unsignedXdr: string): Promise<string> {
  const auth = await crearAuth();
  if (!auth) throw new ErrorFirmaCliente("Sign-in isn't set up yet.");
  if (!asegurarIdentidadCavos(auth)) throw new ErrorFirmaCliente(AVISO_SESION_CAVOS);
  const conectada = await conectarStellar(auth);
  const billetera = conectada.wallet("stellar");
  if (billetera.chain !== "stellar") throw new ErrorFirmaCliente(AVISO_FIRMA);
  return billetera.signXdr(unsignedXdr);
}

export function firmarXdrDeSesion(unsignedXdr: string): Promise<string> {
  return firmarConCavos(unsignedXdr);
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

function leerPreparado(json: unknown): { xdr: string; contrato: string | null; monto: number | null; token: string } {
  const datos = registro(json);
  const xdr = texto(datos.xdr);
  const token = texto(datos.token);
  if (!xdr || !token) throw new ErrorFirmaCliente("We couldn't prepare that step. Try again.");
  const monto = typeof datos.monto === "number" && Number.isFinite(datos.monto) ? datos.monto : null;
  return { xdr, contrato: texto(datos.contrato), monto, token };
}

function leerPago(json: unknown, contratoPreparado: string | null): PagoFirmado {
  const datos = registro(json);
  const ledger = typeof datos.ledger === "number" && Number.isFinite(datos.ledger) ? datos.ledger : null;
  return {
    hash: texto(datos.hash),
    ledger,
    codigo: texto(datos.codigo),
    contrato: texto(datos.contrato) ?? contratoPreparado,
    estado: texto(datos.estado),
    aviso: texto(datos.aviso),
    monto: null,
  };
}

function errorHttp(estado: number, json: unknown): ErrorFirmaCliente {
  const datos = registro(json);
  const aviso = texto(datos.aviso) ?? "";
  const codigo = texto(datos.codigo) ?? "";
  const junto = `${aviso} ${codigo}`;
  if (estado === 403 && /demo/i.test(junto)) return new ErrorFirmaCliente(AVISO_DEMO_FIRMA, 403);
  if (esXlm(junto)) return new ErrorFirmaCliente(AVISO_XLM, estado);
  if (aviso) return new ErrorFirmaCliente(aviso, estado);
  if (estado === 403) return new ErrorFirmaCliente("Only the organizer can lock the budget and pay.", 403);
  return new ErrorFirmaCliente(AVISO_FIRMA, estado);
}

export function traducirFirma(error: unknown): ErrorFirmaCliente {
  if (error instanceof ErrorFirmaCliente) return error;
  const textoError = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (esRechazo(textoError)) return new ErrorFirmaCliente(AVISO_RECHAZO);
  if (esXlm(textoError)) return new ErrorFirmaCliente(AVISO_XLM);
  if (esSesionCavos(textoError)) return new ErrorFirmaCliente(AVISO_SESION_CAVOS);
  if (/demo/i.test(textoError) && /firma|desactiv|signature|disabled/i.test(textoError)) {
    return new ErrorFirmaCliente(AVISO_DEMO_FIRMA, 403);
  }
  return new ErrorFirmaCliente(AVISO_FIRMA);
}

function esSesionCavos(textoError: string): boolean {
  return (
    /registry lookup skipped: no login token/i.test(textoError) ||
    /registry lookup failed: 401/i.test(textoError) ||
    /kit\/auth: no identity/i.test(textoError)
  );
}

function esRechazo(textoError: string): boolean {
  return /reject|rechaz|denied|declin|cancel/i.test(textoError);
}

function esXlm(textoError: string): boolean {
  return /insufficient|underfunded|op_underfunded|tx_insufficient|stellar_tx_insufficient/i.test(textoError);
}

function vacio(): PagoFirmado {
  return { hash: null, ledger: null, codigo: null, contrato: null, estado: null, aviso: null, monto: null };
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
