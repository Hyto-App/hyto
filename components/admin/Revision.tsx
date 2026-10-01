"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { guardarDecision, leerMemoriaAdmin } from "@/lib/admin/memoria";
import { botonesRevision, cargarDetalleOrganizador, leerFondeo, montoDeVista, reintentarRevision } from "@/lib/admin/remoto";
import { detalleMonto, enlaceCredencial, enlacePago, etiquetaOrigen, vistaAdmin } from "@/lib/admin/vista";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import {
  AVISO_FIRMA,
  ErrorFirmaCliente,
  firmarPasos,
  mensajeFirmaVisible,
  pasosDesde,
  type AccionCliente,
  type PagoFirmado,
} from "@/lib/escrow/firmarCliente";
import { formatearFecha, formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import type { TareaAdmin } from "@/lib/admin/tipos";

const PASO: Record<AccionCliente, string> = {
  desplegar: "Deploying…",
  fondear: "Funding…",
  marcar: "Marking…",
  aprobar: "Approving…",
  liberar: "Releasing…",
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

  async function correr(acciones: readonly AccionCliente[]) {
    if (paso || !tarea) return;
    if (!wallet) {
      setAviso("This session has no Stellar wallet. Sign in again to sign.");
      return;
    }
    if (acciones[0] !== "desplegar" && !contrato) {
      setAviso("This task has no escrow yet. Deploy and fund it first.");
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
      if (pago.aviso) setAviso(pago.aviso);
    } catch (error) {
      if (actual === "marcar" || actual === "aprobar" || actual === "liberar") setReanudar(actual);
      if (error instanceof ErrorFirmaCliente && error.contrato) contratoParcial = error.contrato;
      setAviso(mensajeFirmaVisible(error instanceof ErrorFirmaCliente ? error.message : AVISO_FIRMA));
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
            <img src={foto} alt={`Evidence for ${textoVisible(tarea.titulo)}`} className="aspect-[4/3] w-full object-cover" />
          ) : tarea.frase ? (
            <div className="flex aspect-[4/3] flex-col justify-end bg-[var(--fondo)] p-8">
              <p className="text-sm text-[var(--suave)]">Sample evidence</p>
              <p className="mt-2 text-lg font-medium leading-7">{textoVisible(tarea.titulo)}</p>
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center px-8 text-center text-sm text-[var(--suave)]">
              No evidence
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
                <dt className="text-sm text-[var(--suave)]">Amount</dt>
                <dd className="mt-1 text-xl font-semibold tracking-tight">{formatearMonto(tarea.montoRevisado)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--suave)]">Date</dt>
                <dd className="mt-1 text-xl font-semibold tracking-tight">{formatearFecha(tarea.fecha)}</dd>
              </div>
            </dl>
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

          {botones.desplegar || botones.fondear || botones.pagar ? (
            <div className="mt-8 space-y-3">
              {botones.desplegar ? (
                <BotonPrincipal type="button" disabled={ocupado} onClick={() => void correr(["desplegar", "fondear"])}>
                  {paso === "desplegar" || paso === "fondear" ? PASO[paso] : "Deploy and fund"}
                </BotonPrincipal>
              ) : null}
              {botones.fondear ? (
                <BotonPrincipal type="button" disabled={ocupado} onClick={() => void correr(["fondear"])}>
                  {paso === "fondear" ? PASO.fondear : "Fund"}
                </BotonPrincipal>
              ) : null}
              {botones.pagar ? (
                <BotonPrincipal type="button" disabled={ocupado} onClick={() => void correr(pasosDesde(reanudar))}>
                  {paso === "marcar" || paso === "aprobar" || paso === "liberar" ? PASO[paso] : "Approve and pay"}
                </BotonPrincipal>
              ) : null}
            </div>
          ) : null}

          {paso ? (
            <p className="mt-4 text-sm text-[var(--suave)]" aria-live="polite">
              {PASO[paso]}
            </p>
          ) : null}

          {aviso ? <AvisoFirma mensaje={aviso} className="mt-4 text-sm leading-6 text-[var(--suave)]" /> : null}

          {transaccion ? (
            <a href={transaccion} className="mt-4 inline-block text-sm font-semibold underline-offset-4 hover:underline">
              View transaction
            </a>
          ) : null}

          {tarea.estado === "pagado" ? (
            <div className="mt-8 space-y-3">
              <p className="text-lg font-medium">Paid {formatearMonto(detalleMonto(tarea).cifra)}</p>
              {pago ? (
                <a href={pago} className="inline-block text-sm font-semibold underline-offset-4 hover:underline">
                  View payment
                </a>
              ) : (
                <p className="text-sm leading-6 text-[var(--suave)]">
                  {real ? "The payment is recorded. The link appears when there is a hash." : "Example view, until the payment is connected."}
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
