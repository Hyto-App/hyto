import { claveDeTrustless } from "@/lib/config/entorno";
import { baseDe, convieneFriendbot, pedidoAccion, pedidoDespliegue } from "./cuerpos";
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

export async function preparar(accion: AccionFirma, opciones: OpcionesRed = {}): Promise<XdrListo> {
  const pedido = pedidoAccion(accion, opciones.red ?? "v2");
  if (typeof pedido === "string") throw new ErrorFirma(pedido, 400, null);
  return leerXdr(await post(pedido.ruta, pedido.cuerpo, opciones));
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
  return leerPago(await post(ruta, { signedXdr: xdr }, opciones));
}

async function post(ruta: string, cuerpo: unknown, opciones: OpcionesRed): Promise<unknown> {
  const clave = (opciones.clave ?? claveDeTrustless() ?? "").trim();
  if (!clave) throw new ErrorFirma("Falta la clave de Trustless Work en el servidor.", 503, null);
  const base = (opciones.base ?? baseDe(opciones.red ?? "v2")).replace(/\/$/, "");
  const fetchImpl = opciones.fetch ?? fetch;
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(`${base}${ruta}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": clave,
      },
      body: JSON.stringify(cuerpo),
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
      detail: "El envío rechazó el fee-bump. La cuenta tiene que existir y pagar la comisión.",
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

function leerPago(json: unknown): PagoEnviado {
  const datos = registro(json);
  const estado = texto(datos.status);
  // docs.trustlesswork.com: SendTransactionResponse es { status, message }.
  // status vale SUCCESS o FAILED. El hash no forma parte de esa respuesta.
  // En el alta, el SDK admite leer también contractId (InitializeEscrowResponse).
  if (estado && estado !== "SUCCESS") {
    throw new ErrorFirma(texto(datos.message) ?? "El envío del pago falló.", 502, texto(datos.code));
  }
  const ledger = typeof datos.ledger === "number" ? datos.ledger : null;
  return {
    hash: texto(datos.txHash) ?? texto(datos.hash),
    ledger,
    codigo: texto(datos.code),
    contrato: texto(datos.contractId),
    estado,
    mensaje: texto(datos.message),
  };
}

function registro(json: unknown): Record<string, unknown> {
  if (!json || typeof json !== "object") return {};
  return json as Record<string, unknown>;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}
