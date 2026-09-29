import type { Almacen } from "@/lib/db/almacen";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila } from "@/lib/db/tipos";
import { esContrato, esCuenta, leerEntrada } from "@/lib/escrow/cuerpos";
import { cuentasDeTarea, montoDeTarea, rolesDeEntorno } from "@/lib/escrow/desplegar";
import { respuestaSiCuerpoGrande, respuestaSiExcedido, xdrDemasiadoLargo } from "@/lib/escrow/limite";
import { enviar, leerEscrow, preparar, prepararDespliegue, respuestaDeErrorFirma } from "@/lib/escrow/modulo";
import { resolutoresDe } from "@/lib/escrow/resolver";
import type { PagoEnviado } from "@/lib/escrow/tipos";
import { leerInvocacion } from "@/lib/escrow/xdr";
import { avisoSesionResolutor } from "@/lib/sesion/exigir";
import { FeeBumpTransaction, Networks, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";

export async function prepararFirmaHttp(sesion: SesionFila, request: Request, almacen?: Almacen | null): Promise<Response> {
  const grande = respuestaSiCuerpoGrande(request);
  if (grande) return grande;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ aviso: "El cuerpo no es JSON." }, { status: 400 });
  }
  const entrada = leerEntrada(body);
  if ("aviso" in entrada) return Response.json({ aviso: entrada.aviso }, { status: 400 });
  if (entrada.accion === "desplegar") {
    if (sesion.rol !== "organizador") {
      return Response.json({ aviso: "Solo el organizador prepara el pago." }, { status: 403 });
    }
    const limitado = respuestaSiExcedido(request);
    if (limitado) return limitado;
    const base = almacen === undefined ? await almacenNeon() : almacen;
    if (!base) return Response.json({ aviso: "La base no está configurada." }, { status: 503 });
    return prepararDespliegueHttp(sesion, entrada.tareaId, base);
  }
  if (entrada.accion === "resolver") {
    const aviso = avisoSesionResolutor(sesion, entrada.firmante);
    if (aviso) return Response.json({ aviso }, { status: 400 });
  } else if (sesion.rol !== "organizador") {
    return Response.json({ aviso: "Solo el organizador prepara el pago." }, { status: 403 });
  }
  const limitado = respuestaSiExcedido(request);
  if (limitado) return limitado;
  try {
    const listo = await preparar(entrada);
    return Response.json({ xdr: listo.xdr, hashPreparado: listo.hashPreparado, contrato: listo.contrato });
  } catch (error) {
    return respuestaDeErrorFirma(error, "No se pudo preparar el pago.");
  }
}

export async function enviarFirmaHttp(sesion: SesionFila, request: Request, almacen?: Almacen | null): Promise<Response> {
  const limitado = respuestaSiExcedido(request) ?? respuestaSiCuerpoGrande(request);
  if (limitado) return limitado;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ aviso: "El cuerpo no es JSON." }, { status: 400 });
  }
  const envio = datosEnvio(body);
  if (!envio.xdr) return Response.json({ aviso: "Falta el XDR firmado." }, { status: 400 });
  if (xdrDemasiadoLargo(envio.xdr)) return Response.json({ aviso: "El XDR firmado es demasiado largo." }, { status: 400 });
  if (esFeeBump(envio.xdr)) {
    return Response.json(
      {
        aviso:
          "La red v2 no acepta un fee-bump. La cuenta de Cavos tiene que pagar la comisión en XLM. Si no alcanza, fondeala con Friendbot.",
      },
      { status: 400 },
    );
  }
  // accion y firmante del cuerpo no autorizan el envío. La cuenta sale del XDR.
  const invocacion = leerInvocacion(envio.xdr);
  const wallet = (sesion.wallet ?? "").trim();
  if (!invocacion || invocacion.firmantes.length !== 1 || invocacion.firmantes[0] !== wallet) {
    return Response.json({ aviso: "El XDR no lo firma la wallet de esta sesión." }, { status: 400 });
  }
  if (invocacion.funcion === "resolve_dispute") {
    try {
      const escrow = await leerEscrow(invocacion.contrato);
      if (!resolutoresDe([escrow]).includes(wallet)) {
        return Response.json(
          {
            aviso: "Solo el resolutor de la disputa puede firmar esta resolución.",
            codigo: "ESCROW_ONLY_DISPUTE_RESOLVER_CAN_EXECUTE",
          },
          { status: 403 },
        );
      }
    } catch (error) {
      return respuestaDeErrorFirma(error, "No se pudo leer el escrow.");
    }
  } else if (sesion.rol !== "organizador") {
    return Response.json({ aviso: "Solo el organizador prepara el pago." }, { status: 403 });
  }
  try {
    const pago = await enviar(envio.xdr);
    const hash = pago.hash ?? hashDeXdr(envio.xdr);
    const base = almacen === undefined ? await almacenNeon() : almacen;
    const aviso = await guardarResultado(sesion, envio, { ...pago, hash }, invocacion.funcion, base);
    return Response.json({
      hash,
      ledger: pago.ledger,
      codigo: pago.codigo,
      contrato: pago.contrato,
      estado: pago.estado,
      ...(aviso ? { aviso } : {}),
    });
  } catch (error) {
    return respuestaDeErrorFirma(error, "No se pudo enviar el pago.");
  }
}

async function prepararDespliegueHttp(sesion: SesionFila, tareaId: string, almacen: Almacen): Promise<Response> {
  const wallet = sesion.wallet.trim();
  if (!esCuenta(wallet)) {
    return Response.json({ aviso: "Esta sesión no tiene una wallet de Stellar. Entrá de nuevo para firmar." }, { status: 400 });
  }
  const roles = rolesDeEntorno();
  if ("aviso" in roles) return Response.json({ aviso: roles.aviso }, { status: 503 });
  let tarea;
  try {
    tarea = await almacen.leerTarea(tareaId);
  } catch {
    return Response.json({ aviso: "La base no está lista." }, { status: 503 });
  }
  if (!tarea) return Response.json({ aviso: "No encontramos esa tarea." }, { status: 404 });
  if (tarea.contratoEscrow && esContrato(tarea.contratoEscrow)) {
    return Response.json({ aviso: "Esta tarea ya tiene un escrow." }, { status: 409 });
  }
  if (!esCuenta(tarea.walletCobro)) {
    return Response.json(
      { aviso: "La tarea no tiene la wallet de cobro. El voluntario tiene que subir la evidencia con su cuenta." },
      { status: 400 },
    );
  }
  const evidencia = await almacen.ultimaEvidencia(tarea.id);
  const monto = montoDeTarea(tarea, evidencia);
  if (monto === null) return Response.json({ aviso: "El monto del hito tiene que ser mayor que cero." }, { status: 400 });
  const cuentas = cuentasDeTarea({
    firmante: wallet,
    receptor: tarea.walletCobro,
    monto,
    titulo: tarea.titulo,
    descripcion: tarea.condicion,
    engagementId: `hyto-${tarea.id}-${Date.now()}`,
    roles,
  });
  if ("aviso" in cuentas) return Response.json({ aviso: cuentas.aviso }, { status: 400 });
  try {
    const listo = await prepararDespliegue(cuentas);
    return Response.json({ xdr: listo.xdr, hashPreparado: listo.hashPreparado, contrato: listo.contrato, monto });
  } catch (error) {
    return respuestaDeErrorFirma(error, "No se pudo preparar el pago.");
  }
}

async function guardarResultado(
  sesion: SesionFila,
  envio: MetaEnvio,
  pago: PagoEnviado,
  funcion: string,
  almacen: Almacen | null,
): Promise<string | null> {
  if (sesion.rol !== "organizador" || !envio.tareaId) return null;
  if (envio.accion !== "desplegar" && envio.accion !== "liberar") return null;
  if (!almacen) return "La base no está configurada y no se guardó el pago.";
  const tarea = await almacen.leerTarea(envio.tareaId);
  if (!tarea) return "No encontramos esa tarea para guardar el pago.";
  if (envio.accion === "desplegar") {
    const contrato = pago.contrato ?? (envio.contrato && esContrato(envio.contrato) ? envio.contrato : null);
    if (!contrato) return "El envío salió bien y Trustless no devolvió el contrato.";
    await almacen.actualizarTarea(tarea.id, { contratoEscrow: contrato });
    return null;
  }
  if (!/release/i.test(funcion)) {
    return "El envío salió bien, pero la transacción no libera el hito, así que no se marcó como pagado.";
  }
  if (!pago.hash || !/^[a-fA-F0-9]{64}$/.test(pago.hash)) {
    return "El envío salió bien y no hay hash para guardar el pago.";
  }
  await almacen.actualizarTarea(tarea.id, { hashPago: pago.hash, estado: "pagado" });
  return null;
}

type MetaEnvio = { xdr: string | null; accion: string | null; tareaId: string | null; contrato: string | null };

function datosEnvio(body: unknown): MetaEnvio {
  if (!body || typeof body !== "object") return { xdr: null, accion: null, tareaId: null, contrato: null };
  const datos = body as { xdr?: unknown; accion?: unknown; tareaId?: unknown; contrato?: unknown };
  const xdr = typeof datos.xdr === "string" ? datos.xdr.trim() : "";
  const accion = typeof datos.accion === "string" ? datos.accion.trim() : "";
  const tareaId = typeof datos.tareaId === "string" ? datos.tareaId.trim() : "";
  const contrato = typeof datos.contrato === "string" ? datos.contrato.trim() : "";
  return {
    xdr: xdr || null,
    accion: accion || null,
    tareaId: tareaId && /^[A-Za-z0-9_-]{1,80}$/.test(tareaId) ? tareaId : null,
    contrato: contrato || null,
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
