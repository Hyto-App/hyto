"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { guardarDecision, leerMemoriaAdmin } from "@/lib/admin/memoria";
import { botonesRevision, cargarDetalleOrganizador, leerFondeo, montoDeVista } from "@/lib/admin/remoto";
import { detalleMonto, enlaceCredencial, enlacePago, vistaAdmin } from "@/lib/admin/vista";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { AVISO_FIRMA, ErrorFirmaCliente, firmarPasos, mensajeFirmaVisible, pasosDesde, type AccionCliente } from "@/lib/escrow/firmarCliente";
import { formatearFecha, formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import type { TareaAdmin } from "@/lib/admin/tipos";

const PASO: Record<AccionCliente, string> = {
  desplegar: "Desplegando…",
  fondear: "Fondeando…",
  marcar: "Marcando…",
  aprobar: "Aprobando…",
  liberar: "Liberando…",
};

export function Revision({ tareaId }: { tareaId: string }) {
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
      if (viva) setFondeado(valor);
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

  async function correr(acciones: readonly AccionCliente[]) {
    if (paso || !tarea) return;
    if (!wallet) {
      setAviso("Esta sesión no tiene una wallet de Stellar. Entrá de nuevo para firmar.");
      return;
    }
    if (acciones[0] !== "desplegar" && !contrato) {
      setAviso("Esta tarea todavía no tiene escrow. Desplegá y fondeá primero.");
      return;
    }
    setAviso(null);
    let actual: AccionCliente | null = null;
    try {
      const pago = await firmarPasos(acciones, tareaId, {
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
      const fresco = await cargarDetalleOrganizador(tareaId);
      if (fresco) {
        setTarea(fresco.tarea);
        setFoto(fresco.foto);
        setContrato(fresco.contratoEscrow ?? pago.contrato);
        setWallet(fresco.wallet ?? wallet);
        setReal(true);
        return;
      }
      if (acciones.includes("liberar") && pago.hash) {
        setTarea((actualTarea) => {
          if (!actualTarea) return actualTarea;
          const hashPago = pago.hash ?? actualTarea.hashPago;
          return { ...actualTarea, estado: "pagado", hashPago };
        });
      }
    } catch (error) {
      if (actual === "marcar" || actual === "aprobar" || actual === "liberar") setReanudar(actual);
      setAviso(mensajeFirmaVisible(error instanceof ErrorFirmaCliente ? error.message : AVISO_FIRMA));
    } finally {
      setPaso(null);
    }
  }

  if (tarea === undefined) {
    return <p className="text-[var(--suave)]">Cargando…</p>;
  }

  if (!tarea) {
    return (
      <main>
        <p className="text-lg">No encontramos esa tarea.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium">
          Volver a la bandeja
        </Link>
      </main>
    );
  }

  const botones = botonesRevision(tarea, real, { contrato, fondeado });
  const pago = enlacePago(tarea.hashPago);
  const transaccion = hashPaso && hashPaso !== tarea.hashPago ? enlacePago(hashPaso) : null;
  const credencial = enlaceCredencial(tarea.credencialUrl);
  const ocupado = paso !== null;

  return (
    <main>
      <Link href="/" className="text-sm text-[var(--suave)] print:hidden">
        Bandeja
      </Link>
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <figure className="overflow-hidden rounded-3xl bg-[var(--papel)]">
          {foto ? (
            <img src={foto} alt="" className="aspect-[4/3] w-full object-cover" />
          ) : tarea.frase ? (
            <div className="flex aspect-[4/3] flex-col justify-end bg-[var(--fondo)] p-8">
              <p className="text-sm text-[var(--suave)]">Evidencia de ejemplo</p>
              <p className="mt-2 text-lg font-medium leading-7">{tarea.titulo}</p>
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center px-8 text-center text-sm text-[var(--suave)]">
              Sin evidencia
            </div>
          )}
        </figure>

        <section className="rounded-3xl bg-[var(--papel)] p-6 sm:p-8">
          <p className="text-sm capitalize text-[var(--suave)]">
            {tarea.tipo} · {tarea.miembro}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{tarea.titulo}</h1>
          {tarea.condicion ? <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{tarea.condicion}</p> : null}
          <p className="mt-6 text-2xl font-semibold tracking-tight">{montoDeTarea(tarea)}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} /> : <PastillaEstado estado={tarea.estado} />}
          </div>
          {tarea.frase ? <p className="mt-4 text-base leading-7">{tarea.frase}</p> : null}

          {tarea.tipo === "reembolso" && tarea.montoRevisado && tarea.fecha ? (
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-[var(--suave)]">Monto</dt>
                <dd className="mt-1 text-xl font-semibold tracking-tight">{formatearMonto(tarea.montoRevisado)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--suave)]">Fecha</dt>
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
                Aprobar
              </BotonPrincipal>
            </div>
          ) : null}

          {botones.pedirOtra ? (
            <button type="button" onClick={() => decidir("pendiente")} className="mt-4 text-sm text-[var(--suave)]">
              Pedir otra foto
            </button>
          ) : null}

          {botones.desplegar || botones.fondear || botones.pagar ? (
            <div className="mt-8 space-y-3">
              {botones.desplegar ? (
                <BotonPrincipal type="button" disabled={ocupado} onClick={() => void correr(["desplegar", "fondear"])}>
                  {paso === "desplegar" || paso === "fondear" ? PASO[paso] : "Desplegar y fondear"}
                </BotonPrincipal>
              ) : null}
              {botones.fondear ? (
                <BotonPrincipal type="button" disabled={ocupado} onClick={() => void correr(["fondear"])}>
                  {paso === "fondear" ? PASO.fondear : "Fondear"}
                </BotonPrincipal>
              ) : null}
              {botones.pagar ? (
                <BotonPrincipal type="button" disabled={ocupado} onClick={() => void correr(pasosDesde(reanudar))}>
                  {paso === "marcar" || paso === "aprobar" || paso === "liberar" ? PASO[paso] : "Aprobar y pagar"}
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
              Ver transacción
            </a>
          ) : null}

          {tarea.estado === "pagado" ? (
            <div className="mt-8 space-y-3">
              <p className="text-lg font-medium">Pagado {formatearMonto(detalleMonto(tarea).cifra)}</p>
              {pago ? (
                <a href={pago} className="inline-block text-sm font-semibold underline-offset-4 hover:underline">
                  Ver pago
                </a>
              ) : (
                <p className="text-sm leading-6 text-[var(--suave)]">
                  {real ? "El pago quedó registrado. El enlace aparece cuando hay hash." : "Vista de ejemplo, hasta que el pago esté conectado."}
                </p>
              )}
              {credencial ? (
                <a href={credencial} className="block text-sm text-[var(--suave)] underline-offset-4 hover:underline">
                  Credencial
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
