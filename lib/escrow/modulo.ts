import { claveDeTrustless } from "@/lib/config/entorno";
import { baseDe, convieneFriendbot, esContrato, pedidoAccion, pedidoDespliegue } from "./cuerpos";
import { revisarResolucion } from "./resolver";
import type { AccionFirma, CuentasDespliegue, OpcionesRed, PagoEnviado, XdrListo } from "./tipos";

export class ErrorFirma extends Error {
  estado: number;
  codigo: string | null;

  constructor(mensaje: string, estado: number, codigo: string | null) {
    super(mensaje);
    this.name = "ErrorFirma";
    this.estado = estado;
    this.codigo = codigo;
  }
}

export function reintentarConFriendbot(error: unknown): boolean {
  return error instanceof ErrorFirma && convieneFriendbot(error.codigo);
}

export function textoDeError(error: unknown): string {
  if (error instanceof ErrorFirma) {
    if (error.codigo === "AUTH_INVALID_FORMAT") {
      return "La clave de Trustless Work tiene que ser id.secreto (AUTH_INVALID_FORMAT).";
    }
    if (error.codigo === "AUTH_INVALID_CREDENTIAL") {
      return "Trustless Work no reconoce la clave (AUTH_INVALID_CREDENTIAL).";
    }
    return error.codigo ? `${error.message} (${error.codigo})` : error.message;
  }
  if (error instanceof Error) return error.message;
  return "Error desconocido.";
}

export async function preparar(accion: AccionFirma, opciones: OpcionesRed = {}): Promise<XdrListo> {
  const red = opciones.red ?? "v2";
  if (accion.accion === "resolver" && red === "v2") {
    const fuentes: unknown[] = [await leerEscrow(accion.contrato, opciones)];
    if (opciones.guardado !== undefined) fuentes.push(opciones.guardado);
    const fallo = revisarResolucion(accion, fuentes);
    if (fallo) throw new ErrorFirma(fallo.mensaje, fallo.estado, fallo.codigo);
  }
  const pedido = pedidoAccion(accion, red);
  if (typeof pedido === "string") throw new ErrorFirma(pedido, 400, null);
  return leerXdr(await post(pedido.ruta, pedido.cuerpo, opciones));
}

export function respuestaDeLectura(error: unknown): Response {
  if (error instanceof ErrorFirma && error.estado !== 400 && error.estado !== 503 && error.estado !== 401) {
    return Response.json({ aviso: error.message, codigo: error.codigo }, { status: 502 });
  }
  return respuestaDeErrorFirma(error, "No se pudo leer el escrow.");
}

export function respuestaDeErrorFirma(error: unknown, avisoPorDefecto: string): Response {
  if (error instanceof ErrorFirma) {
    if (error.estado === 401) {
      const detalle = error.codigo ? ` (${error.codigo})` : "";
      return Response.json(
        {
          aviso: `Trustless Work no autorizó la clave del servidor${detalle}.`,
          codigo: "TRUSTLESS_AUTH",
        },
        { status: 502 },
      );
    }
    const estado = error.estado >= 400 && error.estado <= 599 ? error.estado : 502;
    return Response.json({ aviso: error.message, codigo: error.codigo }, { status: estado });
  }
  return Response.json({ aviso: avisoPorDefecto }, { status: 502 });
}

export async function prepararDespliegue(cuentas: CuentasDespliegue, opciones: OpcionesRed = {}): Promise<XdrListo> {
  const pedido = pedidoDespliegue(cuentas);
  if (typeof pedido === "string") throw new ErrorFirma(pedido, 400, null);
  return leerXdr(await post(pedido.ruta, pedido.cuerpo, { ...opciones, red: cuentas.red }));
}

export async function enviar(xdrFirmado: string, opciones: OpcionesRed = {}): Promise<PagoEnviado> {
  const xdr = xdrFirmado.trim();
  if (!xdr) throw new ErrorFirma("Falta el XDR firmado.", 400, null);
  const red = opciones.red ?? "v2";
  const ruta = red === "v2" ? "/stellar/send-transaction" : "/helper/send-transaction";
  return leerPago(await post(ruta, { signedXdr: xdr }, opciones), red);
}

export async function leerEscrow(contrato: string, opciones: OpcionesRed = {}): Promise<Record<string, unknown>> {
  if (!esContrato(contrato)) throw new ErrorFirma("El contrato del pago no es válido.", 400, null);
  const json = await get(`/escrow/multi-release/v2/${contrato}`, { ...opciones, red: "v2" });
  const datos = registro(json);
  if (!texto(datos.contractId)) throw new ErrorFirma("La red no devolvió el escrow.", 502, null);
  return datos;
}

async function post(ruta: string, cuerpo: unknown, opciones: OpcionesRed): Promise<unknown> {
  return pedir("POST", ruta, cuerpo, opciones);
}

async function get(ruta: string, opciones: OpcionesRed): Promise<unknown> {
  return pedir("GET", ruta, undefined, opciones);
}

async function pedir(metodo: "GET" | "POST", ruta: string, cuerpo: unknown, opciones: OpcionesRed): Promise<unknown> {
  const clave = (opciones.clave ?? claveDeTrustless() ?? "").trim();
  if (!clave) throw new ErrorFirma("Falta la clave de Trustless Work en el servidor.", 503, null);
  const base = (opciones.base ?? baseDe(opciones.red ?? "v2")).replace(/\/$/, "");
  const fetchImpl = opciones.fetch ?? fetch;
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(`${base}${ruta}`, {
      method: metodo,
      headers: {
        Accept: "application/json",
        ...(metodo === "POST" ? { "Content-Type": "application/json" } : {}),
        "x-api-key": clave,
      },
      ...(metodo === "POST" ? { body: JSON.stringify(cuerpo) } : {}),
    });
  } catch {
    throw new ErrorFirma("No se pudo hablar con Trustless Work.", 502, null);
  }
  const json = await leerJson(respuesta);
  if (!respuesta.ok) {
    const problema = problemaDe(json);
    throw new ErrorFirma(problema.detail, respuesta.status, problema.codigo);
  }
  return json;
}

async function leerJson(respuesta: Response): Promise<unknown> {
  const texto = await respuesta.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return { detail: texto };
  }
}

function problemaDe(json: unknown): { detail: string; codigo: string | null } {
  if (!json || typeof json !== "object") {
    return { detail: "Trustless Work rechazó la solicitud.", codigo: null };
  }
  const datos = json as Record<string, unknown>;
  const codigo = typeof datos.code === "string" ? datos.code : null;
  const detail = typeof datos.detail === "string" ? datos.detail : typeof datos.message === "string" ? datos.message : null;
  if (codigo === "STELLAR_TX_FEE_BUMP_REJECTED") {
    return {
      detail: "La red v2 no acepta un fee-bump. La cuenta de Cavos tiene que pagar la comisión en XLM.",
      codigo,
    };
  }
  if (codigo === "STELLAR_TX_INSUFFICIENT_BALANCE") {
    return {
      detail: "La cuenta no tiene XLM suficiente para la comisión. Fondeala con Friendbot en testnet y volvé a intentar.",
      codigo,
    };
  }
  return { detail: detail ?? "Trustless Work rechazó la solicitud.", codigo };
}

function leerXdr(json: unknown): XdrListo {
  const datos = registro(json);
  const xdr = texto(datos.unsignedXdr) ?? texto(datos.unsignedTransaction);
  if (!xdr) throw new ErrorFirma("La red no devolvió el XDR.", 502, null);
  return {
    xdr,
    hashPreparado: texto(datos.txHash) ?? "",
    contrato: texto(datos.contractId),
  };
}

const CODIGOS_V2_OK = new Set(["STELLAR_TX_SUBMITTED", "STELLAR_TX_SUBMITTED_INDEXER_LAGGING"]);

// V2 /stellar/send-transaction no trae status. El alta exitosa trae contractId;
// el resto trae code STELLAR_TX_SUBMITTED o STELLAR_TX_SUBMITTED_INDEXER_LAGGING.
// V1 /helper/send-transaction sí usa status SUCCESS.
export function envioConfirmado(
  pago: Pick<PagoEnviado, "hash" | "codigo" | "contrato" | "estado">,
  red: "v1" | "v2",
): boolean {
  if (red === "v1") return pago.estado === "SUCCESS";
  if (!pago.hash) return false;
  return (pago.codigo !== null && CODIGOS_V2_OK.has(pago.codigo)) || Boolean(pago.contrato);
}

function leerPago(json: unknown, red: "v1" | "v2"): PagoEnviado {
  const datos = registro(json);
  const escrow = registro(datos.escrow);
  const pago: PagoEnviado = {
    hash: texto(datos.txHash) ?? texto(datos.hash),
    ledger: typeof datos.ledger === "number" ? datos.ledger : null,
    codigo: texto(datos.code),
    contrato: texto(datos.contractId) ?? texto(escrow.contractId),
    estado: texto(datos.status),
    mensaje: texto(datos.message),
  };
  if (!envioConfirmado(pago, red)) {
    throw new ErrorFirma(pago.mensaje ?? "El envío del pago falló.", 502, pago.codigo);
  }
  return pago;
}

function registro(json: unknown): Record<string, unknown> {
  if (!json || typeof json !== "object") return {};
  return json as Record<string, unknown>;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}
