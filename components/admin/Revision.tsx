"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { EtiquetasNota } from "@/components/admin/EtiquetasNota";
import { IndicadorActualizado } from "@/components/admin/IndicadorActualizado";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { useNovedadesEvento } from "@/components/admin/usarNovedades";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { guardarDecision } from "@/lib/admin/memoria";
import { botonesRevision, cargarDetalleOrganizador, confirmarMonto, leerFondeo, montoDeVista, reintentarRevision } from "@/lib/admin/remoto";
import { mismaTareaAdmin } from "@/lib/admin/novedades";
import { centavos, detalleMonto, enlaceCredencial, enlacePago, etiquetaOrigen, notaCopia, notaManual, normalizarMonto, vistaAdmin } from "@/lib/admin/vista";
import { AVISO_MONTO_INVALIDO, AVISO_MONTO_TOPE } from "@/lib/escrow/monto";
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
import { cajaDeFallo, detalleFallo, frasePaso, mensajeClaro, pasosDePago, TEXTO, tituloFallo } from "@/lib/ui/claro";
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
  eventoId,
  firmar,
}: {
  tareaId: string;
  eventoId?: string;
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
  const [aviso, escribirAviso] = useState<string | null>(null);
  const [falloPaso, setFalloPaso] = useState<AccionCliente | null>(null);
  const [falloCodigo, setFalloCodigo] = useState<string | null>(null);

  function publicarAviso(
    mensaje: string | null,
    fallo: { paso: AccionCliente | null; codigo: string | null } | null = null,
  ) {
    escribirAviso(mensaje);
    setFalloPaso(fallo?.paso ?? null);
    setFalloCodigo(fallo?.codigo ?? null);
  }
  const [reintentando, setReintentando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const fondeoForzado = useRef<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let viva = true;
    setTarea(undefined);
    setFoto(null);
    setReal(false);
    setHashPaso(null);
    setContrato(null);
    setFondeado(null);
    setReanudar(null);
    fondeoForzado.current = null;
    setWallet(null);
    publicarAviso(null);
    void cargarDetalleOrganizador(tareaId).then((detalle) => {
      if (!viva) return;
      if (!detalle) {
        setTarea(null);
        publicarAviso("Could not load this review.");
        return;
      }
      setReal(true);
      setTarea(detalle.tarea);
      setFoto(detalle.foto);
      setContrato(detalle.contratoEscrow);
      setWallet(detalle.wallet);
    });
    return () => {
      viva = false;
    };
  }, [tareaId, modoDemo, intento]);

  useEffect(() => {
    if (!real || !contrato) return;
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
  }, [real, contrato]);

  const claveMonto = tarea ? `${tarea.id}|${tarea.montoConfirmado ?? ""}|${tarea.montoRevisado ?? ""}` : "";
  const tareaMontoRef = useRef(tarea);
  tareaMontoRef.current = tarea;
  useEffect(() => {
    const actual = tareaMontoRef.current;
    if (!actual || actual.tipo !== "reembolso") return;
    setBorrador(actual.montoConfirmado ?? actual.montoRevisado ?? "");
  }, [claveMonto]);

  const pasoRef = useRef(paso);
  pasoRef.current = paso;
  const confirmandoRef = useRef(confirmando);
  confirmandoRef.current = confirmando;
  const reintentandoRef = useRef(reintentando);
  reintentandoRef.current = reintentando;
  const fotoRef = useRef(foto);
  fotoRef.current = foto;
  const tareaRef = useRef(tarea);
  tareaRef.current = tarea;

  const { reciente } = useNovedadesEvento({
    proyectoId: real && eventoId ? eventoId : undefined,
    tareas: tarea
      ? [{ id: tarea.id, estado: tarea.estado, veredicto: tarea.veredicto, origen: tarea.origen }]
      : [],
    exigirFoto: true,
    fotoDe: (id) => (id === tareaId ? fotoRef.current : null),
    alCambiar: async (ids) => {
      if (pasoRef.current || confirmandoRef.current || reintentandoRef.current) {
        return { ok: false, avisar: false };
      }
      if (!ids.includes(tareaId)) return { ok: true, avisar: false };
      const detalle = await cargarDetalleOrganizador(tareaId);
      if (!detalle || pasoRef.current || confirmandoRef.current || reintentandoRef.current) {
        return { ok: false, avisar: false };
      }
      const previa = tareaRef.current;
      const tareaIgual = previa ? mismaTareaAdmin(previa, detalle.tarea) : false;
      const fotoIgual = fotoRef.current === detalle.foto;
      if (!tareaIgual) setTarea(detalle.tarea);
      if (!fotoIgual) setFoto(detalle.foto);
      return { ok: true, avisar: !tareaIgual || !fotoIgual };
    },
  });

  async function pedirOtra() {
    if (!real) {
      decidir("pendiente");
      return;
    }
    publicarAviso(null);
    const respuesta = await fetch(`/api/revision/${encodeURIComponent(tareaId)}/pedir`, { method: "POST" });
    const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
    if (!respuesta.ok) {
      publicarAviso(cuerpo?.aviso ?? "Could not ask for another photo.");
      return;
    }
    setTarea((actual) => (actual ? { ...actual, estado: "pendiente" } : actual));
  }

  function decidir(decision: "pagado" | "pendiente") {
    const guardado = guardarDecision(tareaId, decision);
    if (guardado.aviso) {
      publicarAviso(guardado.aviso);
      return;
    }
    publicarAviso(null);
    const vista = vistaAdmin(guardado.memoria);
    setTarea(vista.tareas.find((item) => item.id === tareaId) ?? null);
  }

  async function reintentar() {
    if (reintentando || !tarea) return;
    setReintentando(true);
    publicarAviso(null);
    try {
      const detalle = await reintentarRevision(tareaId);
      if (!detalle) {
        publicarAviso("The review could not be retried.");
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
      publicarAviso(AVISO_MONTO_INVALIDO);
      return;
    }
    const tope = normalizarMonto(tarea.tope ?? "") ?? normalizarMonto(tarea.monto);
    if (!tope || centavos(normal) > centavos(tope)) {
      publicarAviso(AVISO_MONTO_TOPE);
      return;
    }
    setConfirmando(true);
    publicarAviso(null);
    try {
      const resultado = await confirmarMonto(tareaId, normal);
      if ("aviso" in resultado) {
        publicarAviso(resultado.aviso);
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
      publicarAviso(AVISO_REINGRESO);
      return;
    }
    if (acciones[0] !== "desplegar" && !contrato) {
      publicarAviso("Lock the budget before you pay.");
      return;
    }
    publicarAviso(null);
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
      if (pago.aviso) publicarAviso(mensajeClaro(pago.aviso));
    } catch (error) {
      if (actual === "marcar" || actual === "aprobar" || actual === "liberar") setReanudar(actual);
      if (error instanceof ErrorFirmaCliente && error.contrato) contratoParcial = error.contrato;
      const codigo = error instanceof ErrorFirmaCliente ? error.codigo : null;
      publicarAviso(mensajeClaro(mensajeFirmaVisible(error instanceof ErrorFirmaCliente ? error.message : AVISO_FIRMA)), {
        paso: actual,
        codigo,
      });
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
    return (
      <main className="hyto-page" aria-busy="true">
        <p className="text-[var(--suave)]">Loading…</p>
        <div className="mt-4 grid gap-3">
          {[0, 1].map((item) => (
            <div key={item} className="hyto-skel">
              <i />
              <span>
                <i />
                <i />
              </span>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!tarea) {
    return (
      <main className="hyto-page">
        <p className="text-lg" role="alert">
          {aviso ?? "We couldn't find that task."}
        </p>
        {aviso ? (
          <button type="button" className="hyto-btn mt-6 max-w-xs" onClick={() => setIntento((actual) => actual + 1)}>
            Try again
          </button>
        ) : (
          <Link href={eventoId ? `/eventos/${eventoId}` : "/eventos"} className="mt-6 inline-block text-sm font-medium">
            Back to the event
          </Link>
        )}
      </main>
    );
  }

  const botones = botonesRevision(tarea, real, { contrato, fondeado });
  const esperaConfirmacion =
    real && tarea.tipo === "reembolso" && !contrato && tarea.estado !== "pagado" && montoDeVista(tarea) === null;
  const borradorNormal = normalizarMonto(borrador);
  const coincide = Boolean(tarea.montoConfirmado && borradorNormal && tarea.montoConfirmado === borradorNormal);
  const puedeDesplegar = botones.desplegar && (tarea.tipo !== "reembolso" || coincide);
  const origen = etiquetaOrigen(tarea.origen);
  const pago = enlacePago(tarea.hashPago);
  const transaccion = hashPaso && hashPaso !== tarea.hashPago ? enlacePago(hashPaso) : null;
  const credencial = enlaceCredencial(tarea.credencialUrl);
  const ocupado = paso !== null;
  const caja = cajaDeFallo({ paso: falloPaso, codigo: falloCodigo });

  return (
    <main className="hyto-page">
      <p className="hyto-crumb print:hidden">
        <Link href={eventoId ? `/eventos/${eventoId}` : "/eventos"}>Events</Link>
        <span aria-hidden="true">/</span>
        <span>Evidence review</span>
      </p>
      <header className="hyto-page-head">
        <div>
          <h1 className="hyto-title">{textoVisible(tarea.titulo)}</h1>
          <p className="hyto-sub">
            {etiquetaTipo(tarea.tipo)} · {textoVisible(tarea.miembro)}
          </p>
          <IndicadorActualizado activo={real && Boolean(eventoId)} visible={reciente} />
        </div>
        <div className="text-right">
          <p className="hyto-amount text-2xl">{montoDeTarea(tarea)}</p>
        </div>
      </header>
      <div className="hyto-review">
        <figure className="hyto-photo">
          {foto && tarea.tipoArchivo === "application/pdf" ? (
            <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="text-sm text-[var(--suave)]">Invoice PDF</p>
              <a href={foto} className="text-sm font-medium underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                Open the invoice
              </a>
            </div>
          ) : foto ? (
            <FotoEvidencia src={foto} alt={textoVisible(tarea.titulo)} />
          ) : tarea.frase ? (
            <div className="flex aspect-[4/5] flex-col justify-end bg-[var(--superficie-2)] p-8">
              <p className="text-sm text-[var(--suave)]">Sample evidence</p>
              <p className="mt-2 text-lg font-medium leading-7">{textoVisible(tarea.titulo)}</p>
            </div>
          ) : (
            <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 px-8 text-center text-sm text-[var(--suave)]">
              <p>No photo yet</p>
              <p>Waiting for the volunteer to send one.</p>
            </div>
          )}
        </figure>

        <section className="hyto-panel">
          {tarea.condicion ? (
            <>
              <p className="text-sm font-medium">Photo must show</p>
              <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{textoVisible(tarea.condicion)}</p>
            </>
          ) : null}
          {real ? (
            <ol className="mt-5 space-y-2 text-sm" aria-label="Payment steps">
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
            <p className="mt-5 text-sm leading-6 text-[var(--suave)]">Sample review. The paid mark here stays on this device.</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} nota={tarea.nota} /> : <PastillaEstado estado={tarea.estado} />}
            {origen ? <span className="text-sm text-[var(--suave)]">{origen}</span> : null}
          </div>
          <EtiquetasNota etiquetas={tarea.etiquetas} />
          {notaManual(tarea.codigo) ? (
            <p className="mt-4 text-sm font-medium">{notaManual(tarea.codigo)}</p>
          ) : tarea.origen === "error" ? (
            <p className="mt-4 text-sm font-medium text-[var(--peligro)]">Mile is unavailable. No AI score for this photo.</p>
          ) : null}
          {notaCopia(tarea.motivoCopia) ? (
            <p className="mt-4 text-sm font-medium">{textoVisible(notaCopia(tarea.motivoCopia) ?? "")}</p>
          ) : null}
          {tarea.origen === "error" && tarea.frase ? (
            <p role="alert" className="mt-2 text-base leading-7">
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
                <dd className="hyto-amount mt-1 text-xl">{formatearMonto(tarea.montoRevisado)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--suave)]">Date</dt>
                <dd className="hyto-amount mt-1 text-xl">{formatearFecha(tarea.fecha)}</dd>
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
                className="hyto-input mt-2"
              />
              <p id="monto-confirmado-ayuda" className="mt-2 text-sm leading-6 text-[var(--suave)]">
                Up to {formatearMonto(tarea.tope ?? tarea.monto)}. Confirm this amount before deploying.
              </p>
              <button
                type="button"
                disabled={confirmando || coincide}
                onClick={() => void confirmar()}
                className="hyto-btn-line mt-4 disabled:cursor-not-allowed disabled:opacity-70"
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

          {caja && aviso ? (
            <div className="hyto-callout mt-5">
              <p className="font-semibold">{tituloFallo(caja)}</p>
              <p className="mt-1 text-sm">{detalleFallo(caja, aviso)}</p>
            </div>
          ) : null}

          <div className="hyto-actions">
            {botones.aprobarLocal ? (
              <BotonPrincipal type="button" onClick={() => decidir("pagado")}>
                Approve
              </BotonPrincipal>
            ) : null}

            {botones.pedirOtra ? (
              <button type="button" onClick={() => void pedirOtra()} className="hyto-btn-line">
                Ask for another photo
              </button>
            ) : null}

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
                <p className="text-sm leading-6 text-[var(--suave)]">The budget is set up. One more confirmation locks the money.</p>
                <BotonPrincipal type="button" disabled={ocupado} aria-busy={ocupado} onClick={() => void correr(["fondear"])}>
                  {paso === "fondear" ? PASO.fondear : TEXTO.finishLocking}
                </BotonPrincipal>
              </>
            ) : null}
            {botones.pagar ? (
              <>
                {fondeado === true ? (
                  <p className="text-sm leading-6 text-[var(--suave)]">Budget secured. The payment sends {montoDeTarea(tarea)}.</p>
                ) : null}
                <BotonPrincipal type="button" disabled={ocupado} aria-busy={ocupado} onClick={() => void correr(pasosDesde(reanudar))}>
                  {paso === "marcar" || paso === "aprobar" || paso === "liberar" ? PASO[paso] : TEXTO.approvePay}
                </BotonPrincipal>
              </>
            ) : null}
          </div>


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

function FotoEvidencia({ src, alt }: { src: string; alt: string }) {
  const [lista, setLista] = useState(false);
  const [rota, setRota] = useState(false);

  useEffect(() => {
    setLista(false);
    setRota(false);
  }, [src]);

  if (rota) {
    return (
      <div className="hyto-photo-nota">
        <p>This photo could not be shown.</p>
      </div>
    );
  }

  return (
    <>
      {lista ? null : (
        <div className="hyto-photo-nota" role="status">
          <span className="hyto-spinner" aria-hidden="true" />
          <span className="sr-only">Loading photo</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLista(true)}
        onError={() => setRota(true)}
        style={lista ? undefined : { opacity: 0 }}
      />
    </>
  );
}
