"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { guardarDecision, leerMemoriaAdmin } from "@/lib/admin/memoria";
import { botonesRevision, cargarDetalleOrganizador, confirmarMonto, leerFondeo, montoDeVista, reintentarRevision } from "@/lib/admin/remoto";
import { centavos, detalleMonto, enlaceCredencial, enlacePago, etiquetaOrigen, normalizarMonto, vistaAdmin } from "@/lib/admin/vista";
import { AVISO_MONTO_INVALIDO, AVISO_MONTO_TOPE } from "@/lib/escrow/monto";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import {
  AVISO_FIRMA,
  AVISO_REINGRESO,
  ErrorFirmaCliente,
  firmarPasos,
  mensajeFirmaVisible,
  pasosDesde,
  type AccionCliente,
  type PagoFirmado,
} from "@/lib/escrow/firmarCliente";
import { acortarDireccion, formatearFecha, formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { frasePaso, mensajeClaro, pasosDePago, TEXTO } from "@/lib/ui/claro";
import { etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import type { TareaAdmin } from "@/lib/admin/tipos";

const PASO: Record<AccionCliente, string> = {
  desplegar: TEXTO.settingUp,
  fondear: TEXTO.locking,
  marcar: TEXTO.checking,
  aprobar: TEXTO.approving,
  liberar: TEXTO.paying,
};

export function Revision({
  tareaId,
  firmar,
}: {
  tareaId: string;
  firmar?: (unsignedXdr: string) => Promise<string>;
}) {
  const modoDemo = useModoDemo();
  const [tarea, setTarea] = useState<TareaAdmin | null | undefined>(undefined);
  const [foto, setFoto] = useState<string | null>(null);
  const [real, setReal] = useState(false);
  const [paso, setPaso] = useState<AccionCliente | null>(null);
  const [hashPaso, setHashPaso] = useState<string | null>(null);
  const [contrato, setContrato] = useState<string | null>(null);
  const [fondeado, setFondeado] = useState<boolean | null>(null);
  const [reanudar, setReanudar] = useState<AccionCliente | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [reintentando, setReintentando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const fondeoForzado = useRef<string | null>(null);

  useEffect(() => {
    let viva = true;
    const local = vistaAdmin(leerMemoriaAdmin()).tareas.find((item) => item.id === tareaId) ?? null;
    setTarea(local);
    setFoto(null);
    setReal(false);
    setHashPaso(null);
    setContrato(null);
    setFondeado(null);
    setReanudar(null);
    fondeoForzado.current = null;
    setWallet(null);
    if (modoDemo) return;
    void cargarDetalleOrganizador(tareaId).then((detalle) => {
      if (!viva || !detalle) return;
      setReal(true);
      setTarea(detalle.tarea);
      setFoto(detalle.foto);
      setContrato(detalle.contratoEscrow);
      setWallet(detalle.wallet);
    });
    return () => {
      viva = false;
    };
  }, [tareaId, modoDemo]);

  useEffect(() => {
    if (modoDemo || !real || !contrato) return;
    if (fondeoForzado.current === contrato) {
      setFondeado(true);
      return;
    }
    let viva = true;
    void leerFondeo(contrato).then((valor) => {
      if (!viva || fondeoForzado.current === contrato || valor === null) return;
      setFondeado(valor);
    });
    return () => {
      viva = false;
    };
  }, [modoDemo, real, contrato]);

  const claveMonto = tarea ? `${tarea.id}|${tarea.montoConfirmado ?? ""}|${tarea.montoRevisado ?? ""}` : "";
  useEffect(() => {
    if (!tarea || tarea.tipo !== "reembolso") return;
    setBorrador(tarea.montoConfirmado ?? tarea.montoRevisado ?? "");
  }, [claveMonto, tarea]);

  function decidir(decision: "pagado" | "pendiente") {
    const guardado = guardarDecision(tareaId, decision);
    if (guardado.aviso) {
      setAviso(guardado.aviso);
      return;
    }
    setAviso(null);
    const vista = vistaAdmin(guardado.memoria);
    setTarea(vista.tareas.find((item) => item.id === tareaId) ?? null);
  }

  async function reintentar() {
    if (reintentando || !tarea) return;
    setReintentando(true);
    setAviso(null);
    try {
      const detalle = await reintentarRevision(tareaId);
      if (!detalle) {
        setAviso("The review could not be retried.");
        return;
      }
      setReal(true);
      setTarea(detalle.tarea);
      setFoto(detalle.foto);
      setContrato(detalle.contratoEscrow);
      setWallet(detalle.wallet);
    } finally {
      setReintentando(false);
    }
  }

  async function confirmar() {
    if (confirmando || !tarea || tarea.tipo !== "reembolso") return;
    const normal = normalizarMonto(borrador);
    if (!normal) {
      setAviso(AVISO_MONTO_INVALIDO);
      return;
    }
    const tope = normalizarMonto(tarea.tope ?? "") ?? normalizarMonto(tarea.monto);
    if (!tope || centavos(normal) > centavos(tope)) {
      setAviso(AVISO_MONTO_TOPE);
      return;
    }
    setConfirmando(true);
    setAviso(null);
    try {
      const resultado = await confirmarMonto(tareaId, normal);
      if ("aviso" in resultado) {
        setAviso(resultado.aviso);
        return;
      }
      setBorrador(resultado.montoConfirmado);
      setTarea((actual) => (actual ? { ...actual, montoConfirmado: resultado.montoConfirmado } : actual));
    } finally {
      setConfirmando(false);
    }
  }

  async function correr(acciones: readonly AccionCliente[]) {
    if (paso || !tarea) return;
    if (!wallet) {
      setAviso(AVISO_REINGRESO);
      return;
    }
    if (acciones[0] !== "desplegar" && !contrato) {
      setAviso("Lock the budget before you pay.");
      return;
    }
    setAviso(null);
    let actual: AccionCliente | null = null;
    let pago: PagoFirmado | null = null;
    let contratoParcial: string | null = null;
    try {
      pago = await firmarPasos(acciones, tareaId, {
        ...(firmar ? { firmar } : {}),
        extra: {
          firmante: wallet,
          ...(contrato ? { contrato } : {}),
          monto: montoDeVista(tarea) ?? undefined,
          indice: 0,
          estado: "completed",
        },
        alEmpezar: (accion) => {
          actual = accion;
          setPaso(accion);
        },
      });
      if (pago.contrato) setContrato(pago.contrato);
      if (acciones.includes("fondear") && pago.contrato) {
        fondeoForzado.current = pago.contrato;
        setFondeado(true);
      }
      setReanudar(null);
      setHashPaso(pago.hash);
      if (pago.aviso) setAviso(mensajeClaro(pago.aviso));
    } catch (error) {
      if (actual === "marcar" || actual === "aprobar" || actual === "liberar") setReanudar(actual);
      if (error instanceof ErrorFirmaCliente && error.contrato) contratoParcial = error.contrato;
      setAviso(mensajeClaro(mensajeFirmaVisible(error instanceof ErrorFirmaCliente ? error.message : AVISO_FIRMA)));
    } finally {
      setPaso(null);
      if (!pago && contratoParcial) setContrato(contratoParcial);
      if (!pago && contratoParcial && acciones.includes("fondear")) setFondeado(false);
      const fresco = await cargarDetalleOrganizador(tareaId);
      const contratoConocido = fresco?.contratoEscrow ?? pago?.contrato ?? contratoParcial;
      if (contratoConocido) setContrato(contratoConocido);
      if (!pago && acciones.includes("fondear") && contratoConocido) setFondeado(false);
      if (fresco) {
        setTarea(fresco.tarea);
        setFoto(fresco.foto);
        setWallet(fresco.wallet ?? wallet);
        setReal(true);
      } else if (pago?.hash && acciones.includes("liberar")) {
        const hashPago = pago.hash;
        setTarea((actualTarea) => {
          if (!actualTarea) return actualTarea;
          return { ...actualTarea, estado: "pagado", hashPago };
        });
      }
    }
  }

  if (tarea === undefined) {
    return <p className="text-[var(--suave)]">Loading…</p>;
  }

  if (!tarea) {
    return (
      <main>
        <p className="text-lg">We couldn't find that task.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium">
          Back to the inbox
        </Link>
      </main>
    );
  }

  const botones = botonesRevision(tarea, real, { contrato, fondeado });
  const esperaConfirmacion =
    real &&
    tarea.tipo === "reembolso" &&
    !contrato &&
    tarea.estado !== "pagado" &&
    tarea.origen !== "error" &&
    Boolean(tarea.montoRevisado);
  const borradorNormal = normalizarMonto(borrador);
  const coincide = Boolean(tarea.montoConfirmado && borradorNormal && tarea.montoConfirmado === borradorNormal);
  const puedeDesplegar = botones.desplegar && (tarea.tipo !== "reembolso" || coincide);
  const origen = etiquetaOrigen(tarea.origen);
  const pago = enlacePago(tarea.hashPago);
  const transaccion = hashPaso && hashPaso !== tarea.hashPago ? enlacePago(hashPaso) : null;
  const credencial = enlaceCredencial(tarea.credencialUrl);
  const ocupado = paso !== null;

  return (
    <main>
      <Link href="/" className="text-sm text-[var(--suave)] print:hidden">
        Inbox
      </Link>
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <figure className="overflow-hidden rounded-3xl bg-[var(--papel)]">
          {foto ? (
            <img src={foto} alt="" className="aspect-[4/3] w-full object-cover" />
          ) : tarea.frase ? (
            <div className="flex aspect-[4/3] flex-col justify-end bg-[var(--fondo)] p-8">
              <p className="text-sm text-[var(--suave)]">Sample evidence</p>
              <p className="mt-2 text-lg font-medium leading-7">{textoVisible(tarea.titulo)}</p>
            </div>
          ) : (
            <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 px-8 text-center text-sm text-[var(--suave)]">
              <p>No photo yet</p>
              <p>Waiting for the volunteer to send one.</p>
            </div>
          )}
        </figure>

        <section className="rounded-3xl bg-[var(--papel)] p-6 sm:p-8">
          <p className="text-sm text-[var(--suave)]">
            {etiquetaTipo(tarea.tipo)} · {textoVisible(tarea.miembro)}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{textoVisible(tarea.titulo)}</h1>
          {tarea.condicion ? <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{textoVisible(tarea.condicion)}</p> : null}
          <p className="mt-6 text-2xl font-semibold tracking-tight">{montoDeTarea(tarea)}</p>
          {real ? (
            <ol className="mt-6 space-y-2 text-sm" aria-label="Payment steps">
              {pasosDePago({
                tieneVeredicto: Boolean(tarea.veredicto),
                revisionFallida: tarea.origen === "error",
                presupuestoListo: Boolean(contrato) && fondeado === true,
                pagado: tarea.estado === "pagado",
              }).map((item, indice) => (
                <li key={item.nombre} className={item.estado === "now" ? "font-semibold" : "text-[var(--suave)]"}>
                  {item.estado === "done" ? "Done" : item.estado === "now" ? "Now" : "Later"} · {indice + 1}. {item.nombre}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 text-sm leading-6 text-[var(--suave)]">
              Sample review. The paid mark here stays on this device.
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} /> : <PastillaEstado estado={tarea.estado} />}
            {origen ? <span className="text-sm text-[var(--suave)]">{origen}</span> : null}
          </div>
          {tarea.origen === "error" && tarea.frase ? (
            <p role="alert" className="mt-4 text-base leading-7">
              {textoVisible(tarea.frase)}
            </p>
          ) : tarea.frase ? (
            <p className="mt-4 text-base leading-7">{textoVisible(tarea.frase)}</p>
          ) : null}
          {tarea.origen === "error" && real ? (
            <button type="button" onClick={() => void reintentar()} disabled={reintentando} className="mt-4 text-sm text-[var(--suave)]">
              Retry review
            </button>
          ) : null}

          {tarea.tipo === "reembolso" && tarea.montoRevisado && tarea.fecha ? (
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-[var(--suave)]">Amount on the receipt</dt>
                <dd className="mt-1 text-xl font-semibold tracking-tight">{formatearMonto(tarea.montoRevisado)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--suave)]">Date</dt>
                <dd className="mt-1 text-xl font-semibold tracking-tight">{formatearFecha(tarea.fecha)}</dd>
              </div>
            </dl>
          ) : null}

          {esperaConfirmacion ? (
            <form
              className="mt-6"
              onSubmit={(evento) => {
                evento.preventDefault();
                void confirmar();
              }}
            >
              <label htmlFor="monto-confirmado" className="text-sm text-[var(--suave)]">
                Amount to pay
              </label>
              <input
                id="monto-confirmado"
                name="monto-confirmado"
                inputMode="decimal"
                required
                aria-describedby="monto-confirmado-ayuda"
                value={borrador}
                onChange={(evento) => setBorrador(evento.target.value)}
                className="mt-2 h-12 w-full rounded-2xl bg-[var(--fondo)] px-4 text-base outline-none"
              />
              <p id="monto-confirmado-ayuda" className="mt-2 text-sm leading-6 text-[var(--suave)]">
                Up to {formatearMonto(tarea.tope ?? tarea.monto)}. Confirm this amount before deploying.
              </p>
              <button
                type="button"
                disabled={confirmando || coincide}
                onClick={() => void confirmar()}
                className="mt-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {coincide ? "Amount confirmed" : confirmando ? "Confirming…" : "Confirm amount"}
              </button>
            </form>
          ) : tarea.tipo === "reembolso" && tarea.montoConfirmado ? (
            <p className="mt-6 text-sm text-[var(--suave)]">
              Amount to pay{" "}
              <span className="text-xl font-semibold tracking-tight text-[var(--tinta)]">{formatearMonto(tarea.montoConfirmado)}</span>
            </p>
          ) : null}

          {real ? (
            <div className="mt-8">
              <PrepararUsdc />
            </div>
          ) : null}

          {botones.aprobarLocal ? (
            <div className="mt-8">
              <BotonPrincipal type="button" onClick={() => decidir("pagado")}>
                Approve
              </BotonPrincipal>
            </div>
          ) : null}

          {botones.pedirOtra ? (
            <button type="button" onClick={() => decidir("pendiente")} className="mt-4 text-sm text-[var(--suave)]">
              Ask for another photo
            </button>
          ) : null}

          {puedeDesplegar || esperaConfirmacion || botones.fondear || botones.pagar ? (
            <div className="mt-8 space-y-3">
              {puedeDesplegar || esperaConfirmacion ? (
                <>
                  <p className="text-sm leading-6 text-[var(--suave)]">
                    This sets aside {montoDeTarea(tarea)} for this task. You'll confirm it once.
                  </p>
                  <BotonPrincipal
                    type="button"
                    disabled={ocupado || !puedeDesplegar}
                    aria-busy={ocupado}
                    onClick={() => void correr(["desplegar", "fondear"])}
                  >
                    {paso === "desplegar" || paso === "fondear" ? PASO[paso] : TEXTO.lockBudget}
                  </BotonPrincipal>
                </>
              ) : null}
              {botones.fondear ? (
                <>
                  <p className="text-sm leading-6 text-[var(--suave)]">
                    The budget is set up. One more confirmation locks the money.
                  </p>
                  <BotonPrincipal type="button" disabled={ocupado} aria-busy={ocupado} onClick={() => void correr(["fondear"])}>
                    {paso === "fondear" ? PASO.fondear : TEXTO.finishLocking}
                  </BotonPrincipal>
                </>
              ) : null}
              {botones.pagar ? (
                <>
                  {fondeado === true ? (
                    <p className="text-sm leading-6 text-[var(--suave)]">Budget secured. Approving sends {montoDeTarea(tarea)}.</p>
                  ) : null}
                  <BotonPrincipal type="button" disabled={ocupado} aria-busy={ocupado} onClick={() => void correr(pasosDesde(reanudar))}>
                    {paso === "marcar" || paso === "aprobar" || paso === "liberar" ? PASO[paso] : TEXTO.approvePay}
                  </BotonPrincipal>
                </>
              ) : null}
            </div>
          ) : null}

          {paso ? (
            <p className="mt-4 text-sm leading-6 text-[var(--suave)]" aria-live="polite">
              {frasePaso(paso)}
            </p>
          ) : null}

          {aviso ? <AvisoFirma mensaje={aviso} className="mt-4 text-sm leading-6 text-[var(--suave)]" /> : null}

          {transaccion ? (
            <a href={transaccion} className="mt-4 inline-block text-sm font-semibold underline-offset-4 hover:underline">
              {TEXTO.viewChain}
            </a>
          ) : null}

          {real && (wallet || contrato) ? (
            <details className="mt-6 text-sm text-[var(--suave)]">
              <summary className="cursor-pointer">Technical details</summary>
              {wallet ? <p className="mt-2 font-mono">Your account {acortarDireccion(wallet)}</p> : null}
              {contrato ? <p className="mt-2 font-mono">Budget reference {acortarDireccion(contrato)}</p> : null}
            </details>
          ) : null}

          {tarea.estado === "pagado" ? (
            <div className="mt-8 space-y-3">
              <p className="text-lg font-medium">Paid {formatearMonto(detalleMonto(tarea).cifra)}</p>
              {pago ? (
                <a href={pago} className="inline-block text-sm font-semibold underline-offset-4 hover:underline">
                  {TEXTO.viewChain}
                </a>
              ) : (
                <p className="text-sm leading-6 text-[var(--suave)]">
                  {real
                    ? "Paid. The blockchain link shows up once the network confirms it."
                    : "This is a sample. A live payment adds a link to the blockchain."}
                </p>
              )}
              {credencial ? (
                <a href={credencial} className="block text-sm text-[var(--suave)] underline-offset-4 hover:underline">
                  Credential
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
