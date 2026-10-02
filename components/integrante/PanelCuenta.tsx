"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { acortarDireccion, formatearFecha, formatearMonto } from "@/lib/integrante/formato";
import type { InsigniaOrgullo, MesOrgullo, Orgullo, VistaCuenta } from "@/lib/integrante/orgullo";
import { textoVisible } from "@/lib/ui/etiquetas";

type Estado = "cargando" | "listo" | "error";

const EXPLORADOR = "https://stellar.expert/explorer/testnet/account/";

export function PanelCuenta() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [vista, setVista] = useState<VistaCuenta | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let viva = true;
    setEstado("cargando");
    setAviso(null);
    fetch("/api/cuenta", { cache: "no-store" })
      .then(async (respuesta) => {
        const cuerpo = (await respuesta.json().catch(() => null)) as (VistaCuenta & { aviso?: string }) | null;
        if (!viva) return;
        if (!respuesta.ok || !cuerpo || !cuerpo.orgullo) {
          setAviso(cuerpo && typeof cuerpo.aviso === "string" ? cuerpo.aviso : "We couldn't load your account.");
          setEstado("error");
          return;
        }
        setVista(cuerpo);
        setEstado("listo");
      })
      .catch(() => {
        if (!viva) return;
        setAviso("We couldn't load your account.");
        setEstado("error");
      });
    return () => {
      viva = false;
    };
  }, [intento]);

  if (estado === "cargando") return <Esqueleto />;
  if (estado === "error" || !vista) {
    return (
      <section className="hyto-card p-5 sm:p-6">
        <p role="alert" className="text-sm leading-6 text-[var(--suave)]">
          {aviso ?? "We couldn't load your account."}
        </p>
        <button type="button" className="hyto-btn is-inline mt-4 px-5" onClick={() => setIntento((valor) => valor + 1)}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {vista.muestra ? (
        <p className="hyto-note" role="note">
          Demo sample. These tasks and amounts are not payments on the network.
          {vista.walletMuestra ? " The address and balance are a sample too." : " The wallet is the one on this session."}
        </p>
      ) : null}
      <Billetera vista={vista} />
      <Ganancias orgullo={vista.orgullo} />
      <OrgulloFila orgullo={vista.orgullo} />
      <Insignias insignias={vista.orgullo.insignias} />
      <Recientes orgullo={vista.orgullo} muestra={vista.muestra} />
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading account</span>
      <div className="hyto-skeleton h-36" />
      <div className="hyto-skeleton h-24" />
      <div className="hyto-skeleton h-56" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="hyto-skeleton h-24" />
        <div className="hyto-skeleton h-24" />
        <div className="hyto-skeleton h-24" />
        <div className="hyto-skeleton h-24" />
      </div>
    </div>
  );
}

function Billetera({ vista }: { vista: VistaCuenta }) {
  const publica = direccionPublica(vista.wallet);
  return (
    <section className="hyto-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-[var(--suave)]">Wallet</h2>
            {vista.walletMuestra ? <span className="hyto-pill hyto-pill-muted">Sample</span> : null}
          </div>
          {publica ? <Direccion direccion={publica} /> : <p className="mt-2 max-w-sm text-sm leading-6">Sign in with a wallet to see your public address.</p>}
        </div>
        <div className="min-w-[10rem]">
          <p className="text-sm text-[var(--suave)]">Testnet USDC</p>
          <p className="hyto-amount mt-1 text-3xl">{vista.saldoEstado === "ok" && vista.saldo ? formatearMonto(vista.saldo) : "—"}</p>
          <p className="mt-1 text-sm text-[var(--suave)]">{textoSaldo(vista)}</p>
        </div>
      </div>
    </section>
  );
}

function Direccion({ direccion }: { direccion: string }) {
  const [copiado, setCopiado] = useState(false);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const id = window.setTimeout(() => setCopiado(false), 2000);
    return () => window.clearTimeout(id);
  }, [copiado]);

  async function copiar() {
    setFallo(false);
    setCopiado(true);
    const ok = (await copiarConPortapapeles(direccion)) || copiarConSeleccion(direccion);
    if (!ok) {
      setCopiado(false);
      setFallo(true);
    }
  }

  return (
    <div className="mt-2">
      <p className="font-mono text-xl tracking-tight">
        {acortarDireccion(direccion)}
        <span className="sr-only">{direccion}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="hyto-btn-line is-inline h-10 px-4 text-sm" aria-live="polite" onClick={() => void copiar()}>
          {copiado ? "Copied" : "Copy address"}
        </button>
        <a
          className="hyto-btn-line is-inline h-10 px-4 text-sm"
          href={`${EXPLORADOR}${encodeURIComponent(direccion)}`}
          target="_blank"
          rel="noreferrer"
        >
          View on testnet
        </a>
      </div>
      {fallo ? (
        <label className="mt-3 block text-sm text-[var(--suave)]" htmlFor="direccion-publica">
          Copy it from here. This is the public address.
          <input id="direccion-publica" readOnly value={direccion} className="hyto-input mt-2 font-mono text-sm" />
        </label>
      ) : null}
    </div>
  );
}

function textoSaldo(vista: VistaCuenta): string {
  if (vista.saldoEstado === "ok" && vista.walletMuestra) return "Sample balance";
  if (vista.saldoEstado === "ok") return "On this wallet now";
  if (vista.saldoEstado === "ausente") return "This wallet is not on the test network yet. Tap Get ready to be paid to open it.";
  if (vista.saldoEstado === "error") return "We couldn't read the balance.";
  return "Add a wallet to see testnet USDC.";
}

function Ganancias({ orgullo }: { orgullo: Orgullo }) {
  return (
    <section className="grid gap-4">
      <div className="hyto-kpis">
        <article>
          <p className="text-sm text-[var(--suave)]">This month</p>
          <p className="hyto-amount mt-2 text-2xl">{formatearMonto(orgullo.esteMes)}</p>
        </article>
        <article>
          <p className="text-sm text-[var(--suave)]">Last month</p>
          <p className="hyto-amount mt-2 text-2xl">{formatearMonto(orgullo.mesPasado)}</p>
        </article>
        <article>
          <p className="text-sm text-[var(--suave)]">All time</p>
          <p className="hyto-amount mt-2 text-2xl text-[var(--acento-texto)]">{formatearMonto(orgullo.total)}</p>
        </article>
      </div>
      <div className="hyto-card p-5 sm:p-6">
        <h2 className="text-sm font-medium text-[var(--suave)]">Earned from events</h2>
        {orgullo.meses.length > 0 ? <Grafico meses={orgullo.meses} /> : <Vacio orgullo={orgullo} />}
        {orgullo.sinFecha > 0 ? (
          <p className="mt-4 text-sm leading-6 text-[var(--suave)]">
            Some payouts have no stored date, so they count in the all-time total only.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Grafico({ meses }: { meses: MesOrgullo[] }) {
  const maximo = Math.max(...meses.map((mes) => Number(mes.total) || 0), 0);
  return (
    <ul className="hyto-meses mt-5" aria-label="Earnings by month">
      {meses.map((mes) => {
        const cifra = Number(mes.total) || 0;
        const altura = maximo > 0 && cifra > 0 ? Math.max(8, Math.round((cifra / maximo) * 100)) : 0;
        return (
          <li key={mes.clave} className="hyto-mes" aria-label={`${mes.etiquetaLarga}, ${formatearMonto(mes.total) || "US$0"}`}>
            <span className="hyto-mes-valor" aria-hidden="true">
              {cifra > 0 ? mes.total : ""}
            </span>
            <span className="hyto-mes-pista" aria-hidden="true">
              <span className={altura === 0 ? "hyto-mes-col is-zero" : "hyto-mes-col"} style={{ height: `${altura}%` }} />
            </span>
            <span className="hyto-mes-nombre" aria-hidden="true">
              {mes.etiqueta}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Vacio({ orgullo }: { orgullo: Orgullo }) {
  const texto = orgullo.vacio
    ? "Paid tasks will show up here, month by month."
    : "Completed tasks are here. A month appears once a payout has a date.";
  return (
    <div className="hyto-vacio mt-5">
      <span className="hyto-vacio-barras" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <p className="text-sm leading-6 text-[var(--suave)]">{texto}</p>
    </div>
  );
}

function OrgulloFila({ orgullo }: { orgullo: Orgullo }) {
  const racha = orgullo.racha === 1 ? "1 month" : orgullo.racha > 1 ? `${orgullo.racha} months` : "—";
  const filas = [
    { etiqueta: "Tasks paid", valor: String(orgullo.tareasCompletadas), detalle: orgullo.vacio ? "None yet" : "Milestones released" },
    { etiqueta: "Projects finished", valor: String(orgullo.proyectosCompletados), detalle: "All of your tasks paid" },
    { etiqueta: "Streak", valor: racha, detalle: orgullo.racha > 0 ? "In a row" : "No payout month yet" },
    {
      etiqueta: "Best month",
      valor: orgullo.mejorMes ? formatearMonto(orgullo.mejorMes.total) : "—",
      detalle: orgullo.mejorMes?.etiqueta ?? "It will show after a payout",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {filas.map((fila) => (
        <article key={fila.etiqueta} className="hyto-card p-4">
          <p className="text-sm text-[var(--suave)]">{fila.etiqueta}</p>
          <p className="hyto-amount mt-2 text-xl">{fila.valor}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--suave)]">{fila.detalle}</p>
        </article>
      ))}
    </div>
  );
}

function Insignias({ insignias }: { insignias: InsigniaOrgullo[] }) {
  return (
    <section className="hyto-card p-5 sm:p-6">
      <h2 className="text-sm font-medium text-[var(--suave)]">Milestones</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insignias.map((insignia) => (
          <li key={insignia.id} className={insignia.obtenida ? "hyto-badge is-on" : "hyto-badge"}>
            <p className="font-medium">{insignia.titulo}</p>
            <p className="mt-1 text-sm text-[var(--suave)]">{insignia.detalle}</p>
            <p className={`mt-3 text-xs font-semibold ${insignia.obtenida ? "text-[var(--acento-texto)]" : "text-[var(--suave)]"}`}>
              {insignia.obtenida ? "Earned" : "Locked"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Recientes({ orgullo, muestra }: { orgullo: Orgullo; muestra: boolean }) {
  return (
    <section className="hyto-card p-5 sm:p-6">
      <h2 className="text-sm font-medium text-[var(--suave)]">Recent paid tasks</h2>
      {orgullo.recientes.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[var(--suave)]">Nothing paid yet. Finish a task and it will land here.</p>
      ) : (
        <ul className="mt-2">
          {orgullo.recientes.map((tarea) => {
            const cuerpo = (
              <>
                <div className="min-w-0">
                  <p className="truncate font-medium">{textoVisible(tarea.titulo)}</p>
                  <p className="mt-1 text-sm text-[var(--suave)]">
                    {textoVisible(tarea.proyecto)}
                    {tarea.pagadoEn ? ` · ${formatearFecha(tarea.pagadoEn)}` : ""}
                  </p>
                </div>
                <p className="hyto-amount shrink-0">{tarea.monto ? formatearMonto(tarea.monto) : "—"}</p>
              </>
            );
            if (muestra) {
              return (
                <li key={tarea.id} className="flex items-center justify-between gap-3 border-t border-[var(--linea)] py-3 first:border-t-0">
                  {cuerpo}
                </li>
              );
            }
            return (
              <li key={tarea.id} className="border-t border-[var(--linea)] first:border-t-0">
                <Link href={`/tareas/${tarea.id}`} className="flex items-center justify-between gap-3 py-3 text-inherit no-underline">
                  {cuerpo}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

async function copiarConPortapapeles(texto: string): Promise<boolean> {
  const escribir = navigator.clipboard?.writeText?.bind(navigator.clipboard);
  if (!escribir) return false;
  try {
    return await Promise.race([
      escribir(texto).then(() => true, () => false),
      new Promise<boolean>((resolver) => window.setTimeout(() => resolver(false), 400)),
    ]);
  } catch {
    return false;
  }
}

function copiarConSeleccion(texto: string): boolean {
  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.left = "-9999px";
  document.body.appendChild(campo);
  campo.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  campo.remove();
  return ok;
}

function direccionPublica(direccion: string | null): string | null {
  if (!direccion || !/^G[A-Z2-7]{55}$/.test(direccion)) return null;
  return direccion;
}
