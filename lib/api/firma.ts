import type { Almacen } from "@/lib/db/almacen";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila } from "@/lib/db/tipos";
import { esContrato, esCuenta, leerEntrada } from "@/lib/escrow/cuerpos";
import { cuentasDeTarea, montoDeTarea, rolesDeEntorno } from "@/lib/escrow/desplegar";
import { respuestaSiCuerpoGrande, respuestaSiExcedido, xdrDemasiadoLargo } from "@/lib/escrow/limite";
import { enviar, envioConfirmado, leerEscrow, preparar, prepararDespliegue, respuestaDeErrorFirma } from "@/lib/escrow/modulo";
import { resolutoresDe } from "@/lib/escrow/resolver";
import type { PagoEnviado } from "@/lib/escrow/tipos";
import { leerInvocacion } from "@/lib/escrow/xdr";
import { respuestaSiNoOrganiza } from "@/lib/api/organizador";
import { avisoSesionResolutor } from "@/lib/sesion/exigir";
import { FeeBumpTransaction, Networks, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";

const FUNCION_DESPLIEGUE = "deploy";
const FUNCION_LIBERACION = "release_funds";

// contractId que devolvió el prepare de esta tarea. No viene del cliente.
const contratosPreparados = new Map<string, string>();

export async function prepararFirmaHttp(sesion: SesionFila, request: Request, almacen?: Almacen | null): Promise<Response> {
  const grande = respuestaSiCuerpoGrande(request);
  if (grande) return grande;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ aviso: "The body is not JSON." }, { status: 400 });
  }
  const entrada = leerEntrada(body);
  if ("aviso" in entrada) return Response.json({ aviso: entrada.aviso }, { status: 400 });
  if (entrada.accion === "desplegar") {
    const limitado = respuestaSiExcedido(request);
    if (limitado) return limitado;
    const base = almacen === undefined ? await almacenNeon() : almacen;
    if (!base) return Response.json({ aviso: "The database is not configured." }, { status: 503 });
    const rechazo = await respuestaSiNoOrganiza(base, sesion.usuarioId, { tareaId: entrada.tareaId });
    if (rechazo) return rechazo;
    return prepararDespliegueHttp(sesion, entrada.tareaId, base);
  }
  if (entrada.accion === "resolver") {
    const aviso = avisoSesionResolutor(sesion, entrada.firmante);
    if (aviso) return Response.json({ aviso }, { status: 400 });
  } else {
    const base = almacen === undefined ? await almacenNeon() : almacen;
    const rechazo = await respuestaSiNoOrganiza(base, sesion.usuarioId, { contrato: entrada.contrato });
    if (rechazo) return rechazo;
  }
  const limitado = respuestaSiExcedido(request);
  if (limitado) return limitado;
  try {
    const listo = await preparar(entrada);
    return Response.json({ xdr: listo.xdr, hashPreparado: listo.hashPreparado, contrato: listo.contrato });
  } catch (error) {
    return respuestaDeErrorFirma(error, "Could not prepare the payment.");
  }
}

export async function enviarFirmaHttp(sesion: SesionFila, request: Request, almacen?: Almacen | null): Promise<Response> {
  const limitado = respuestaSiExcedido(request) ?? respuestaSiCuerpoGrande(request);
  if (limitado) return limitado;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ aviso: "The body is not JSON." }, { status: 400 });
  }
  const envio = datosEnvio(body);
  if (!envio.xdr) return Response.json({ aviso: "The signed XDR is missing." }, { status: 400 });
  if (xdrDemasiadoLargo(envio.xdr)) return Response.json({ aviso: "The signed XDR is too long." }, { status: 400 });
  if (esFeeBump(envio.xdr)) {
    return Response.json(
      {
        aviso:
          "The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM. If it is short, fund it with Friendbot.",
      },
      { status: 400 },
    );
  }
  // accion y firmante del cuerpo no autorizan el envío. La cuenta sale del XDR.
  const wallet = (sesion.wallet ?? "").trim();
  const invocacion = leerInvocacion(envio.xdr, wallet);
  if (!invocacion || invocacion.firmantes.length !== 1 || invocacion.firmantes[0] !== wallet) {
    return Response.json({ aviso: "This session's wallet did not sign the XDR." }, { status: 400 });
  }
  const base = almacen === undefined ? await almacenNeon() : almacen;
  if (invocacion.funcion === "resolve_dispute") {
    try {
      const escrow = await leerEscrow(invocacion.contrato);
      if (!resolutoresDe([escrow]).includes(wallet)) {
        return Response.json(
          {
            aviso: "Only the dispute resolver can sign this resolution.",
            codigo: "ESCROW_ONLY_DISPUTE_RESOLVER_CAN_EXECUTE",
          },
          { status: 403 },
        );
      }
    } catch (error) {
      return respuestaDeErrorFirma(error, "Could not read the escrow.");
    }
  } else {
    const despliegue = envio.accion === "desplegar" || invocacion.funcion === FUNCION_DESPLIEGUE;
    const rechazo = await respuestaSiNoOrganiza(
      base,
      sesion.usuarioId,
      despliegue ? { tareaId: envio.tareaId } : { contrato: invocacion.contrato, tareaId: envio.tareaId },
    );
    if (rechazo) return rechazo;
  }
  if (envio.accion === "desplegar") {
    if (invocacion.funcion !== FUNCION_DESPLIEGUE) {
      return Response.json({ aviso: "The transaction does not deploy the escrow." }, { status: 409 });
    }
    const ocupada = await escrowYaGuardado(base, envio.tareaId);
    if (ocupada) return Response.json({ aviso: "This task already has an escrow." }, { status: 409 });
  }
  let pago: PagoEnviado;
  try {
    pago = await enviar(envio.xdr);
  } catch (error) {
    return respuestaDeErrorFirma(error, "Could not submit the payment.");
  }
  const hash = pago.hash ?? hashDeXdr(envio.xdr);
  let guardado: ResultadoGuardado = { aviso: null, estadoHttp: 200 };
  try {
    guardado = await guardarResultado(sesion, envio, { ...pago, hash }, invocacion, base);
  } catch {
    guardado = { aviso: "The submit succeeded and it could not be saved.", estadoHttp: 200 };
  }
  return Response.json(
    {
      hash,
      ledger: pago.ledger,
      codigo: pago.codigo,
      contrato: pago.contrato,
      estado: pago.estado,
      ...(guardado.aviso ? { aviso: guardado.aviso } : {}),
    },
    { status: guardado.estadoHttp },
  );
}

async function prepararDespliegueHttp(sesion: SesionFila, tareaId: string, almacen: Almacen): Promise<Response> {
  const wallet = sesion.wallet.trim();
  if (!esCuenta(wallet)) {
    return Response.json({ aviso: "This session has no Stellar wallet. Sign in again to sign." }, { status: 400 });
  }
  const roles = rolesDeEntorno();
  if ("aviso" in roles) return Response.json({ aviso: roles.aviso }, { status: 503 });
  let tarea;
  try {
    tarea = await almacen.leerTarea(tareaId);
  } catch {
    return Response.json({ aviso: "The database is not ready." }, { status: 503 });
  }
  if (!tarea) return Response.json({ aviso: "We couldn't find that task." }, { status: 404 });
  if (tarea.contratoEscrow && esContrato(tarea.contratoEscrow)) {
    return Response.json({ aviso: "This task already has an escrow." }, { status: 409 });
  }
  if (!esCuenta(tarea.walletCobro)) {
    return Response.json(
      { aviso: "The task has no payout wallet. The volunteer has to submit evidence with their account." },
      { status: 400 },
    );
  }
  const evidencia = await almacen.ultimaEvidencia(tarea.id);
  if (tarea.tipo === "reembolso") {
    const veredicto = evidencia ? await almacen.veredictoDe(evidencia.id) : null;
    const sinMonto = !evidencia?.monto?.trim();
    if (veredicto?.origen === "error" || sinMonto) {
      return Response.json({ aviso: "Review pending" }, { status: 409 });
    }
  }
  const monto = montoDeTarea(tarea, evidencia);
  if (monto === null) return Response.json({ aviso: "The milestone amount has to be greater than zero." }, { status: 400 });
  const cuentas = cuentasDeTarea({
    firmante: wallet,
    receptor: tarea.walletCobro,
    monto,
    titulo: tarea.titulo,
    descripcion: tarea.condicion,
    engagementId: `hyto-${tarea.id}`,
    roles,
  });
  if ("aviso" in cuentas) return Response.json({ aviso: cuentas.aviso }, { status: 400 });
  try {
    const listo = await prepararDespliegue(cuentas);
    if (listo.contrato && esContrato(listo.contrato)) contratosPreparados.set(tarea.id, listo.contrato);
    return Response.json({ xdr: listo.xdr, hashPreparado: listo.hashPreparado, contrato: listo.contrato, monto });
  } catch (error) {
    return respuestaDeErrorFirma(error, "Could not prepare the payment.");
  }
}

type ResultadoGuardado = { aviso: string | null; estadoHttp: number };
type Invocacion = { contrato: string; funcion: string };

async function escrowYaGuardado(almacen: Almacen | null, tareaId: string | null): Promise<boolean> {
  if (!almacen || !tareaId) return false;
  const tarea = await almacen.leerTarea(tareaId);
  return Boolean(tarea?.contratoEscrow && esContrato(tarea.contratoEscrow));
}

async function guardarResultado(
  sesion: SesionFila,
  envio: MetaEnvio,
  pago: PagoEnviado,
  invocacion: Invocacion,
  almacen: Almacen | null,
): Promise<ResultadoGuardado> {
  if (!envio.tareaId) return { aviso: null, estadoHttp: 200 };
  if (envio.accion !== "desplegar" && envio.accion !== "liberar") return { aviso: null, estadoHttp: 200 };
  if (!almacen) return { aviso: "The database is not configured and the payment was not saved.", estadoHttp: 200 };
  const tarea = await almacen.leerTarea(envio.tareaId);
  if (!tarea) return { aviso: "We couldn't find that task to save the payment.", estadoHttp: 200 };
  if (envio.accion === "desplegar") {
    if (invocacion.funcion !== FUNCION_DESPLIEGUE) {
      return { aviso: "The transaction does not deploy the escrow.", estadoHttp: 409 };
    }
    if (tarea.contratoEscrow && esContrato(tarea.contratoEscrow)) {
      return { aviso: "This task already has an escrow.", estadoHttp: 409 };
    }
    const contrato = contratoDeServidor(pago, tarea.id);
    if (typeof contrato !== "string") {
      return {
        aviso: contrato?.aviso ?? "The submit succeeded and Trustless did not return the contract.",
        estadoHttp: 200,
      };
    }
    await almacen.actualizarTarea(tarea.id, { contratoEscrow: contrato });
    contratosPreparados.delete(tarea.id);
    return { aviso: null, estadoHttp: 200 };
  }
  if (invocacion.funcion !== FUNCION_LIBERACION) {
    return {
      aviso: "The submit succeeded, but the transaction does not release the milestone, so it was not marked paid.",
      estadoHttp: 200,
    };
  }
  if (!tarea.contratoEscrow || !esContrato(tarea.contratoEscrow) || invocacion.contrato !== tarea.contratoEscrow) {
    return { aviso: "The submit does not match this task's escrow, so it was not marked paid.", estadoHttp: 200 };
  }
  if (!envioConfirmado(pago, "v2")) {
    return { aviso: "The submit was not confirmed, so it was not marked paid.", estadoHttp: 200 };
  }
  if (!pago.hash || !/^[a-fA-F0-9]{64}$/.test(pago.hash)) {
    return { aviso: "The submit succeeded and there is no hash to save the payment.", estadoHttp: 200 };
  }
  let escrow: Record<string, unknown>;
  try {
    escrow = await leerEscrow(tarea.contratoEscrow);
  } catch {
    return { aviso: "Could not confirm the milestone is released, so it was not marked paid.", estadoHttp: 200 };
  }
  if (!hitoLiberado(escrow)) {
    return { aviso: "The milestone is not listed as released yet, so it was not marked paid.", estadoHttp: 200 };
  }
  await almacen.actualizarTarea(tarea.id, { hashPago: pago.hash, estado: "pagado" });
  return { aviso: null, estadoHttp: 200 };
}

function contratoDeServidor(pago: PagoEnviado, tareaId: string): string | { aviso: string } | null {
  if (pago.contrato && esContrato(pago.contrato)) return pago.contrato;
  if (pago.codigo === "STELLAR_TX_SUBMITTED_INDEXER_LAGGING") {
    return {
      aviso:
        "The transaction entered the ledger, but the indexer did not return the contract. The escrow was not saved: check the hash again in a few seconds.",
    };
  }
  const preparado = contratosPreparados.get(tareaId);
  return preparado && esContrato(preparado) ? preparado : null;
}

function hitoLiberado(escrow: Record<string, unknown>): boolean {
  const hitos = Array.isArray(escrow.milestones) ? escrow.milestones : [];
  const hito = hitos[0];
  if (!hito || typeof hito !== "object") return false;
  const datos = hito as Record<string, unknown>;
  if (datos.released === true) return true;
  const flags = datos.flags && typeof datos.flags === "object" ? (datos.flags as Record<string, unknown>) : null;
  return flags?.released === true;
}

type MetaEnvio = { xdr: string | null; accion: string | null; tareaId: string | null };

function datosEnvio(body: unknown): MetaEnvio {
  if (!body || typeof body !== "object") return { xdr: null, accion: null, tareaId: null };
  const datos = body as { xdr?: unknown; accion?: unknown; tareaId?: unknown };
  const xdr = typeof datos.xdr === "string" ? datos.xdr.trim() : "";
  const accion = typeof datos.accion === "string" ? datos.accion.trim() : "";
  const tareaId = typeof datos.tareaId === "string" ? datos.tareaId.trim() : "";
  return {
    xdr: xdr || null,
    accion: accion || null,
    tareaId: tareaId && /^[A-Za-z0-9_-]{1,80}$/.test(tareaId) ? tareaId : null,
  };
}

function esFeeBump(xdr: string): boolean {
  for (const red of [Networks.TESTNET, Networks.PUBLIC]) {
    try {
      return TransactionBuilder.fromXDR(xdr, red) instanceof FeeBumpTransaction;
    } catch {
      continue;
    }
  }
  return false;
}

function hashDeXdr(xdr: string): string | null {
  for (const red of [Networks.TESTNET, Networks.PUBLIC]) {
    try {
      const tx = TransactionBuilder.fromXDR(xdr, red);
      const inner = tx instanceof FeeBumpTransaction ? tx.innerTransaction : tx;
      if (inner instanceof Transaction) return Buffer.from(inner.hash()).toString("hex");
    } catch {
      continue;
    }
  }
  return null;
}
