import { createHash } from "node:crypto";
import type { Almacen } from "@/lib/db/almacen";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila, TareaFila } from "@/lib/db/tipos";
import { esContrato, esCuenta, leerEntrada } from "@/lib/escrow/cuerpos";
import { rechazoSiFondos } from "@/lib/escrow/saldo";
import { cuentasDeTarea, montoDeTarea, rolesDeEntorno } from "@/lib/escrow/desplegar";
import { estadoReceptorUsdc, respuestaReceptor } from "@/lib/escrow/receptor";
import { AVISO_SIN_ASIGNAR, AVISO_SIN_COBRO } from "@/lib/escrow/cobroAvisos";
import { AVISO_CONFIRMAR_FONDEO, AVISO_CONFIRMAR_MONTO } from "@/lib/escrow/monto";
import { respuestaSiCuerpoGrande, respuestaSiExcedido, xdrDemasiadoLargo } from "@/lib/escrow/limite";
import { esHashPago, hitoLiberado, sondearEscrow, type OpcionesSondeo } from "@/lib/escrow/indexador";
import { confirmarEnRed, hashTestnetDeXdr, type OpcionesConfirmacion } from "@/lib/escrow/confirmacion";
import { rechazoSiComision } from "@/lib/escrow/comision";
import { AVISO_YA_FONDEADO, CODIGO_YA_FONDEADO } from "@/lib/escrow/fondeo";
import { escrowYaTieneFondos } from "@/lib/escrow/saldo-red";
import { ErrorFirma, enviar, envioConfirmado, leerEscrow, preparar, prepararDespliegue, respuestaDeErrorFirma } from "@/lib/escrow/modulo";
import { resolutoresDe } from "@/lib/escrow/resolver";
import type { AccionFirma, PagoEnviado } from "@/lib/escrow/tipos";
import { anclaDeXdr, esAltaDeFabrica, leerInvocacion } from "@/lib/escrow/xdr";
import { respuestaSiNoOrganiza } from "@/lib/api/organizador";
import { cuentaDeCobro } from "@/lib/api/cobro";
import { avisarCompletada } from "@/lib/tablon/publicar";
import { emitirTokenPreparado, secretoPreparado, verificarTokenPreparado } from "@/lib/api/preparado";
import { avisoSesionResolutor } from "@/lib/sesion/exigir";
import { FeeBumpTransaction, Networks, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";

const FUNCION_LIBERACION = "release_funds";
const CODIGO_INDEXADOR_ATRASADO = "STELLAR_TX_SUBMITTED_INDEXER_LAGGING";
export const CODIGO_CONFIRMADO_EN_RED = "HYTO_TX_CONFIRMED_ON_TESTNET";
export const CODIGO_SIN_CONFIRMAR = "HYTO_TX_NOT_CONFIRMED";

export type OpcionesEnvio = { sondeo?: OpcionesSondeo; red?: OpcionesConfirmacion };

export function huellaDeXdr(xdr: string): string {
  for (const red of [Networks.TESTNET, Networks.PUBLIC]) {
    try {
      const tx = TransactionBuilder.fromXDR(xdr, red);
      const inner = tx instanceof FeeBumpTransaction ? tx.innerTransaction : tx;
      if (inner instanceof Transaction) return Buffer.from(inner.hash()).toString("hex");
    } catch {
      continue;
    }
  }
  return createHash("sha256").update(xdr).digest("hex");
}

const AVISO_SIN_SECRETO = "The server cannot sign this payment.";
const AVISO_SIN_PREPARAR = "This signature was not prepared by the server.";
const AVISO_VENCIDO = "This payment request has expired. Prepare it again.";
const AVISO_NO_COINCIDE = "This signature does not match the prepared payment.";

function tokenDePreparado(
  xdr: string,
  sesion: SesionFila,
  accion: string,
  tareaId: string | null,
  monto: string | null,
  contrato: string | null = null,
): string | null {
  const ancla = anclaDeXdr(xdr);
  return emitirTokenPreparado({
    usuarioId: sesion.usuarioId,
    sesionId: sesion.token,
    huella: huellaDeXdr(xdr),
    accion,
    tareaId: tareaId ?? "",
    monto: monto ?? "",
    ...(contrato ? { contrato } : {}),
    ...(ancla ? { ancla } : {}),
  });
}

function sinSecreto(): Response {
  return Response.json({ aviso: AVISO_SIN_SECRETO }, { status: 503 });
}

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
  let preparada: AccionFirma = entrada;
  if (entrada.accion === "resolver") {
    const aviso = avisoSesionResolutor(sesion, entrada.firmante);
    if (aviso) return Response.json({ aviso }, { status: 400 });
  } else {
    const base = almacen === undefined ? await almacenNeon() : almacen;
    const rechazo = await respuestaSiNoOrganiza(base, sesion.usuarioId, { contrato: entrada.contrato });
    if (rechazo) return rechazo;
    if (entrada.accion === "fondear") {
      const ajustada = await montoFondeoDeReembolso(base, entrada, idTarea(body));
      if (ajustada instanceof Response) return ajustada;
      preparada = ajustada;
      if (ajustada.accion === "fondear") {
        // The indexer's balance can stay 0 after the fund is already on testnet. A second fund would lock it twice.
        if (await escrowYaTieneFondos(ajustada.contrato)) {
          return Response.json({ aviso: AVISO_YA_FONDEADO, codigo: CODIGO_YA_FONDEADO }, { status: 409 });
        }
        const fondos = await rechazoSiFondos(sesion.wallet, String(ajustada.monto));
        if (fondos) return fondos;
      }
    }
  }
  const limitado = respuestaSiExcedido(request);
  if (limitado) return limitado;
  if (!secretoPreparado()) return sinSecreto();
  const sinComision = await rechazoSiComision(sesion.wallet);
  if (sinComision) return sinComision;
  try {
    const listo = await preparar(preparada);
    const corta = await rechazoSiComision(sesion.wallet, listo.xdr);
    if (corta) return corta;
    const monto = preparada.accion === "fondear" ? String(preparada.monto) : null;
    const token = tokenDePreparado(listo.xdr, sesion, preparada.accion, idTarea(body), monto);
    if (!token) return sinSecreto();
    return Response.json({ xdr: listo.xdr, hashPreparado: listo.hashPreparado, contrato: listo.contrato, token });
  } catch (error) {
    return respuestaDeErrorFirma(error, "Could not prepare the payment.");
  }
}

export async function enviarFirmaHttp(
  sesion: SesionFila,
  request: Request,
  almacen?: Almacen | null,
  opciones: OpcionesEnvio = {},
): Promise<Response> {
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
          "The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM. If the account already exists, send a little test balance from another account, then try again.",
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
    const despliegue = envio.accion === "desplegar" || esAltaDeFabrica(invocacion);
    const rechazo = await respuestaSiNoOrganiza(
      base,
      sesion.usuarioId,
      despliegue ? { tareaId: envio.tareaId } : { contrato: invocacion.contrato, tareaId: envio.tareaId },
    );
    if (rechazo) return rechazo;
  }
  if (envio.accion === "desplegar") {
    // La ruta de prepare dice deploy. En la red la factory expone tw_new_multi_release_escrow.
    if (!esAltaDeFabrica(invocacion)) {
      return Response.json({ aviso: "The transaction does not deploy the escrow." }, { status: 409 });
    }
    const ocupada = await escrowYaGuardado(base, envio.tareaId);
    if (ocupada) return Response.json({ aviso: "This task already has an escrow." }, { status: 409 });
  }
  if (!envio.token) return Response.json({ aviso: AVISO_SIN_PREPARAR }, { status: 409 });
  // La huella ata el XDR entero. Si Cavos re-simula, cambian fee, footprint y auth;
  // el ancla sigue atando contrato, función y argumentos del escrow.
  const preparado = verificarTokenPreparado(envio.token, {
    usuarioId: sesion.usuarioId,
    sesionId: sesion.token,
    huella: huellaDeXdr(envio.xdr),
    ancla: anclaDeXdr(envio.xdr),
  });
  if (!preparado.ok) {
    if (preparado.codigo === "secreto") return Response.json({ aviso: "The server cannot confirm this payment." }, { status: 503 });
    if (preparado.codigo === "vencido") return Response.json({ aviso: AVISO_VENCIDO }, { status: 409 });
    if (preparado.codigo === "huella") return Response.json({ aviso: AVISO_NO_COINCIDE }, { status: 409 });
    return Response.json({ aviso: AVISO_SIN_PREPARAR }, { status: 409 });
  }
  if (preparado.carga.accion && envio.accion && preparado.carga.accion !== envio.accion) {
    return Response.json({ aviso: AVISO_NO_COINCIDE }, { status: 409 });
  }
  if (preparado.carga.tareaId && envio.tareaId && preparado.carga.tareaId !== envio.tareaId) {
    return Response.json({ aviso: "This signature does not match the prepared task." }, { status: 409 });
  }
  if (preparado.carga.monto) {
    const fondos = await rechazoSiFondos(wallet, preparado.carga.monto);
    if (fondos) return fondos;
  }
  let pago: PagoEnviado;
  try {
    pago = await enviar(envio.xdr);
  } catch (error) {
    const recuperado = await recuperarEnvio(envio.xdr, error, opciones);
    if ("respuesta" in recuperado) return recuperado.respuesta;
    pago = recuperado.pago;
  }
  const hash = pago.hash ?? hashDeXdr(envio.xdr);
  const contratoPreparado =
    preparado.carga.accion === "desplegar" && preparado.carga.contrato && esContrato(preparado.carga.contrato)
      ? preparado.carga.contrato
      : null;
  let guardado: ResultadoGuardado = { aviso: null, estadoHttp: 200 };
  try {
    guardado = await guardarResultado(envio, { ...pago, hash }, invocacion, base, contratoPreparado, opciones.sondeo);
  } catch {
    guardado = { aviso: "The submit succeeded and it could not be saved.", estadoHttp: 200 };
  }
  return Response.json(
    {
      hash,
      ledger: pago.ledger,
      codigo: pago.codigo,
      contrato: guardado.contrato ?? pago.contrato,
      estado: pago.estado,
      ...(guardado.aviso ? { aviso: guardado.aviso } : {}),
    },
    { status: guardado.estadoHttp },
  );
}

function idTarea(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const id = (body as { tareaId?: unknown }).tareaId;
  if (typeof id !== "string") return null;
  const limpio = id.trim();
  return /^[A-Za-z0-9_-]{1,80}$/.test(limpio) ? limpio : null;
}

async function montoFondeoDeReembolso(
  almacen: Almacen | null,
  entrada: Extract<AccionFirma, { accion: "fondear" }>,
  tareaId: string | null,
): Promise<AccionFirma | Response> {
  if (!almacen) return entrada;
  const porId = tareaId ? await almacen.leerTarea(tareaId) : null;
  const porContrato = (await almacen.listarTareas()).find((item) => item.contratoEscrow === entrada.contrato) ?? null;
  if (porId && porContrato && porId.id !== porContrato.id) {
    return Response.json({ aviso: "The payment does not match this task." }, { status: 409 });
  }
  const tarea = porId ?? porContrato;
  if (!tarea || tarea.tipo !== "reembolso") return entrada;
  const evidencia = await almacen.ultimaEvidencia(tarea.id);
  const monto = montoDeTarea(tarea, evidencia);
  if (monto === null) return Response.json({ aviso: AVISO_CONFIRMAR_FONDEO }, { status: 409 });
  return { ...entrada, monto };
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
  let evidencia;
  try {
    evidencia = await almacen.ultimaEvidencia(tarea.id);
    // Lock budget is offered before the first photo, so the payout account cannot depend on an upload.
    if (!esCuenta(tarea.walletCobro)) {
      const cuenta = await cuentaDeCobro(almacen, tarea);
      if (cuenta) {
        await almacen.actualizarTarea(tarea.id, { walletCobro: cuenta });
        tarea = { ...tarea, walletCobro: cuenta };
      }
    }
  } catch {
    return Response.json({ aviso: "The database is not ready." }, { status: 503 });
  }
  if (!esCuenta(tarea.walletCobro)) {
    const aviso = tarea.miembroId.trim() ? AVISO_SIN_COBRO : AVISO_SIN_ASIGNAR;
    return Response.json({ aviso }, { status: 400 });
  }
  if (tarea.tipo === "reembolso") {
    if (!evidencia?.monto?.trim() && !evidencia?.montoConfirmado?.trim()) {
      return Response.json({ aviso: "Review pending" }, { status: 409 });
    }
    if (montoDeTarea(tarea, evidencia) === null) {
      return Response.json({ aviso: AVISO_CONFIRMAR_MONTO }, { status: 409 });
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
  const fondos = await rechazoSiFondos(wallet, String(monto));
  if (fondos) return fondos;
  if (!secretoPreparado()) return sinSecreto();
  const receptor = await estadoReceptorUsdc(tarea.walletCobro);
  if (!receptor.listo) return respuestaReceptor(receptor);
  const sinComision = await rechazoSiComision(wallet);
  if (sinComision) return sinComision;
  try {
    const listo = await prepararDespliegue(cuentas);
    const corta = await rechazoSiComision(wallet, listo.xdr);
    if (corta) return corta;
    const predicho = listo.contrato && esContrato(listo.contrato) ? listo.contrato : null;
    const token = tokenDePreparado(listo.xdr, sesion, "desplegar", tarea.id, String(monto), predicho);
    if (!token) return sinSecreto();
    return Response.json({ xdr: listo.xdr, hashPreparado: listo.hashPreparado, contrato: listo.contrato, monto, token });
  } catch (error) {
    return respuestaDeErrorFirma(error, "Could not prepare the payment.");
  }
}

type ResultadoGuardado = { aviso: string | null; estadoHttp: number; contrato?: string };
type Invocacion = { contrato: string; funcion: string };

async function escrowYaGuardado(almacen: Almacen | null, tareaId: string | null): Promise<boolean> {
  if (!almacen || !tareaId) return false;
  const tarea = await almacen.leerTarea(tareaId);
  return Boolean(tarea?.contratoEscrow && esContrato(tarea.contratoEscrow));
}

async function guardarResultado(
  envio: MetaEnvio,
  pago: PagoEnviado,
  invocacion: Invocacion,
  almacen: Almacen | null,
  contratoPreparado: string | null,
  sondeo: OpcionesSondeo | undefined,
): Promise<ResultadoGuardado> {
  if (!envio.tareaId) return { aviso: null, estadoHttp: 200 };
  if (envio.accion !== "desplegar" && envio.accion !== "liberar") return { aviso: null, estadoHttp: 200 };
  if (!almacen) return { aviso: "The database is not configured and the payment was not saved.", estadoHttp: 200 };
  const tarea = await almacen.leerTarea(envio.tareaId);
  if (!tarea) return { aviso: "We couldn't find that task to save the payment.", estadoHttp: 200 };
  if (envio.accion === "desplegar") {
    if (!esAltaDeFabrica(invocacion)) {
      return { aviso: "The transaction does not deploy the escrow.", estadoHttp: 409 };
    }
    if (tarea.contratoEscrow && esContrato(tarea.contratoEscrow)) {
      return { aviso: "This task already has an escrow.", estadoHttp: 409 };
    }
    const contrato = contratoDeServidor(pago, contratoPreparado);
    if (!contrato) {
      return { aviso: "The submit succeeded and Trustless did not return the contract.", estadoHttp: 200 };
    }
    // Saved before any read so a refresh or another instance never offers a second deploy.
    await almacen.actualizarTarea(tarea.id, { contratoEscrow: contrato });
    if (pago.codigo !== CODIGO_INDEXADOR_ATRASADO && pago.codigo !== CODIGO_CONFIRMADO_EN_RED) return { aviso: null, estadoHttp: 200, contrato };
    const indexado = await sondearEscrow(contrato, () => true, sondeo);
    if (indexado) return { aviso: null, estadoHttp: 200, contrato };
    return { aviso: AVISO_DESPLIEGUE_ATRASADO, estadoHttp: 200, contrato };
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
  if (pago.codigo !== CODIGO_CONFIRMADO_EN_RED && !envioConfirmado(pago, "v2")) {
    return { aviso: "The submit was not confirmed, so it was not marked paid.", estadoHttp: 200 };
  }
  if (!esHashPago(pago.hash)) {
    return { aviso: "The submit succeeded and there is no hash to save the payment.", estadoHttp: 200 };
  }
  // The release is on the ledger. Keep its hash so the task can be marked paid later without signing again.
  if (tarea.hashPago !== pago.hash) await almacen.actualizarTarea(tarea.id, { hashPago: pago.hash });
  const liberado = await sondearEscrow(tarea.contratoEscrow, hitoLiberado, sondeo);
  if (!liberado) return { aviso: AVISO_LIBERACION_ATRASADA, estadoHttp: 200 };
  await almacen.actualizarTarea(tarea.id, { estado: "pagado" });
  await avisarCompletada(almacen, tarea.id);
  return { aviso: null, estadoHttp: 200 };
}

const AVISO_DESPLIEGUE_ATRASADO =
  "The budget is on the network and saved to this task. Trustless Work is still indexing it. Wait a few seconds, then finish locking it. Do not lock it again.";
export const AVISO_LIBERACION_ATRASADA =
  "The payment was sent. Trustless Work has not shown the milestone as released yet. This task will be marked paid once it does. Do not pay again.";

function contratoDeServidor(pago: PagoEnviado, contratoPreparado: string | null): string | null {
  if (pago.contrato && esContrato(pago.contrato)) return pago.contrato;
  return contratoPreparado;
}

const AVISO_SIN_CONFIRMAR =
  "The network has not confirmed this step yet. It may still go through. Wait a minute and reload this page before you try again.";

// The submit call can fail after the network already took the transaction (timeout, dropped connection,
// a retry of a transaction that landed). Testnet RPC is the authority on whether it was applied.
async function recuperarEnvio(
  xdr: string,
  error: unknown,
  opciones: OpcionesEnvio,
): Promise<{ pago: PagoEnviado } | { respuesta: Response }> {
  const original = respuestaDeErrorFirma(error, "Could not submit the payment.");
  // A missing or rejected server key stops the request before anything reaches the network.
  if (error instanceof ErrorFirma && (error.estado === 401 || error.estado === 503)) return { respuesta: original };
  const hash = hashTestnetDeXdr(xdr);
  if (!hash) return { respuesta: original };
  const ambiguo = !(error instanceof ErrorFirma) || error.estado >= 500 || error.estado === 408;
  const estado = await confirmarEnRed(hash, ambiguo, { esperar: opciones.sondeo?.esperar, ...opciones.red });
  if (estado === "SUCCESS") {
    return {
      pago: { hash, ledger: null, codigo: CODIGO_CONFIRMADO_EN_RED, contrato: null, estado: "SUCCESS", mensaje: null },
    };
  }
  if (estado === "NOT_FOUND" && ambiguo) {
    return { respuesta: Response.json({ aviso: AVISO_SIN_CONFIRMAR, codigo: CODIGO_SIN_CONFIRMAR, hash }, { status: 502 }) };
  }
  return { respuesta: original };
}

// A stored release hash on an unpaid task means the release was submitted and the read model was behind.
export async function conciliarPagoPendiente(
  almacen: Almacen,
  tarea: TareaFila,
  sondeo: OpcionesSondeo = { pausas: [] },
): Promise<boolean> {
  if (tarea.estado === "pagado") return false;
  if (!tarea.contratoEscrow || !esContrato(tarea.contratoEscrow)) return false;
  // Without a hash the release may still have landed (its submit failed before the network answered).
  // Milestone 0 released on the escrow read is enough to stop offering fund or pay.
  const liberado = await sondearEscrow(tarea.contratoEscrow, hitoLiberado, sondeo);
  if (!liberado) return false;
  await almacen.actualizarTarea(tarea.id, { estado: "pagado" });
  await avisarCompletada(almacen, tarea.id);
  return true;
}

type MetaEnvio = { xdr: string | null; accion: string | null; tareaId: string | null; token: string | null };

function datosEnvio(body: unknown): MetaEnvio {
  if (!body || typeof body !== "object") return { xdr: null, accion: null, tareaId: null, token: null };
  const datos = body as { xdr?: unknown; accion?: unknown; tareaId?: unknown; token?: unknown };
  const xdr = typeof datos.xdr === "string" ? datos.xdr.trim() : "";
  const accion = typeof datos.accion === "string" ? datos.accion.trim() : "";
  const tareaId = typeof datos.tareaId === "string" ? datos.tareaId.trim() : "";
  const token = typeof datos.token === "string" ? datos.token.trim() : "";
  return {
    xdr: xdr || null,
    accion: accion || null,
    tareaId: tareaId && /^[A-Za-z0-9_-]{1,80}$/.test(tareaId) ? tareaId : null,
    token: token || null,
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
