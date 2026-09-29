"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { guardarDecision, leerMemoriaAdmin } from "@/lib/admin/memoria";
import { detalleMonto, enlaceCredencial, enlacePago, vistaAdmin } from "@/lib/admin/vista";
import { aprobarYPagar, desplegarYFondear } from "@/lib/escrow/firmarCliente";
import { formatearFecha, formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import type { TareaAdmin } from "@/lib/admin/tipos";

type RevisionReal = {
  tarea: TareaAdmin;
  foto: string | null;
  contratoEscrow: string | null;
  walletCobro: string;
  wallet: string;
};

export function Revision({ tareaId }: { tareaId: string }) {
  const demo = useModoDemo();
  const [tarea, setTarea] = useState<TareaAdmin | null | undefined>(undefined);
  const [aviso, setAviso] = useState<string | null>(null);
  const [real, setReal] = useState<RevisionReal | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [hashReciente, setHashReciente] = useState<string | null>(null);

  useEffect(() => {
    if (demo) {
      const vista = vistaAdmin(leerMemoriaAdmin());
      setReal(null);
      setTarea(vista.tareas.find((item) => item.id === tareaId) ?? null);
      return;
    }
    let vivo = true;
    setTarea(undefined);
    setReal(null);
    void fetch(`/api/revision/${encodeURIComponent(tareaId)}`).then(async (respuesta) => {
      if (!vivo) return;
      if (respuesta.status === 401 || respuesta.status === 403) {
        const vista = vistaAdmin(leerMemoriaAdmin());
        setTarea(vista.tareas.find((item) => item.id === tareaId) ?? null);
        return;
      }
      if (respuesta.status === 404) {
        setTarea(null);
        return;
      }
      if (!respuesta.ok) {
        const json = (await respuesta.json().catch(() => null)) as { aviso?: unknown } | null;
        setAviso(json && typeof json.aviso === "string" ? json.aviso : "No se pudo leer la tarea.");
        setTarea(null);
        return;
      }
      const json = (await respuesta.json()) as {
        tarea: TareaAdmin;
        foto: string | null;
        contratoEscrow: string | null;
        walletCobro: string;
        wallet: string;
      };
      setReal({
        tarea: json.tarea,
        foto: json.foto,
        contratoEscrow: json.contratoEscrow,
        walletCobro: json.walletCobro,
        wallet: json.wallet,
      });
      setTarea(json.tarea);
    });
    return () => {
      vivo = false;
    };
  }, [demo, tareaId]);

  async function recargar() {
    const respuesta = await fetch(`/api/revision/${encodeURIComponent(tareaId)}`);
    if (!respuesta.ok) return;
    const json = (await respuesta.json()) as {
      tarea: TareaAdmin;
      foto: string | null;
      contratoEscrow: string | null;
      walletCobro: string;
      wallet: string;
    };
    setReal({
      tarea: json.tarea,
      foto: json.foto,
      contratoEscrow: json.contratoEscrow,
      walletCobro: json.walletCobro,
      wallet: json.wallet,
    });
    setTarea(json.tarea);
  }

  async function desplegar() {
    if (!real?.wallet) {
      setAviso("Esta sesión no tiene una wallet de Stellar. Entrá de nuevo para firmar.");
      return;
    }
    setOcupado(true);
    setAviso(null);
    try {
      const pago = await desplegarYFondear(tareaId, real.wallet);
      if (pago.hash) setHashReciente(pago.hash);
      setAviso(pago.aviso);
      await recargar();
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo desplegar el pago.");
    } finally {
      setOcupado(false);
    }
  }

  async function pagar() {
    if (!real?.contratoEscrow || !real.wallet) {
      setAviso("Falta el escrow o la wallet para pagar.");
      return;
    }
    setOcupado(true);
    setAviso(null);
    try {
      const pago = await aprobarYPagar({ tareaId, contrato: real.contratoEscrow, firmante: real.wallet });
      if (pago.hash) setHashReciente(pago.hash);
      setAviso(pago.aviso);
      await recargar();
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo pagar el hito.");
    } finally {
      setOcupado(false);
    }
  }

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

  if (tarea === undefined) {
    return <p className="text-[var(--suave)]">Cargando…</p>;
  }

  if (!tarea) {
    return (
      <main>
        <p className="text-lg">{aviso ?? "No encontramos esa tarea."}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium">
          Volver a la bandeja
        </Link>
      </main>
    );
  }

  const pago = enlacePago(hashReciente ?? tarea.hashPago);
  const credencial = enlaceCredencial(tarea.credencialUrl);
  const enVivo = real !== null;
  const puedeDecidir = tarea.estado === "en revisión" && tarea.veredicto !== null;
  const pedirOtra = puedeDecidir && tarea.veredicto !== "cumplió";

  return (
    <main>
      <Link href="/" className="text-sm text-[var(--suave)] print:hidden">
        Bandeja
      </Link>
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <figure className="overflow-hidden rounded-3xl bg-[var(--papel)]">
          {real?.foto ? (
            <img src={real.foto} alt="" className="aspect-[4/3] w-full object-cover" />
          ) : !enVivo && tarea.frase ? (
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

          {enVivo && tarea.estado !== "pagado" && !real.contratoEscrow ? (
            <div className="mt-8">
              <BotonPrincipal type="button" onClick={() => void desplegar()} disabled={ocupado || !real.walletCobro}>
                {ocupado ? "Firmando…" : "Desplegar y fondear"}
              </BotonPrincipal>
              {!real.walletCobro ? (
                <p className="mt-4 text-sm leading-6 text-[var(--suave)]">
                  Falta la wallet de cobro. El voluntario tiene que subir la evidencia con su cuenta.
                </p>
              ) : null}
            </div>
          ) : null}

          {enVivo && tarea.estado !== "pagado" && real.contratoEscrow ? (
            <div className="mt-8">
              <BotonPrincipal type="button" onClick={() => void pagar()} disabled={ocupado}>
                {ocupado ? "Firmando…" : "Aprobar y pagar"}
              </BotonPrincipal>
            </div>
          ) : null}

          {!enVivo && puedeDecidir ? (
            <div className="mt-8">
              <BotonPrincipal type="button" onClick={() => decidir("pagado")}>
                Aprobar
              </BotonPrincipal>
            </div>
          ) : null}

          {!enVivo && pedirOtra ? (
            <button type="button" onClick={() => decidir("pendiente")} className="mt-4 text-sm text-[var(--suave)]">
              Pedir otra foto
            </button>
          ) : null}

          {aviso && tarea.estado !== "pagado" ? <p className="mt-4 text-sm leading-6 text-[var(--suave)]">{aviso}</p> : null}

          {hashReciente && pago && tarea.estado !== "pagado" ? (
            <p className="mt-4 text-sm leading-6">
              <a href={pago} className="font-semibold underline-offset-4 hover:underline">
                Ver transacción
              </a>
            </p>
          ) : null}

          {tarea.estado === "pagado" ? (
            <div className="mt-8 space-y-3">
              <p className="text-lg font-medium">Pagado {formatearMonto(detalleMonto(tarea).cifra)}</p>
              {pago ? (
                <a href={pago} className="inline-block text-sm font-semibold underline-offset-4 hover:underline">
                  Ver pago
                </a>
              ) : (
                <p className="text-sm leading-6 text-[var(--suave)]">Vista de ejemplo, hasta que el pago esté conectado.</p>
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
