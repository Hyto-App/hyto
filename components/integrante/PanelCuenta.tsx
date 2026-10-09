"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PasskeyCuenta } from "@/components/integrante/PasskeyCuenta";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { EnlaceExplorador } from "@/components/ui/EnlaceExplorador";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { acortarDireccion, explicarNeto, formatearFecha, formatearRecibido } from "@/lib/integrante/formato";
import type { InsigniaOrgullo, MesOrgullo, Orgullo, VistaCuenta } from "@/lib/integrante/orgullo";
import type { Clave } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";
import { textoVisible } from "@/lib/ui/etiquetas";

type Estado = "cargando" | "listo" | "error";

const EXPLORADOR = "https://stellar.expert/explorer/testnet/account/";
const PASAPORTE_TESTNET = "https://demo.stellarpassport.xyz/auth/signup";

const INSIGNIA: Record<string, { titulo: Clave; detalle: Clave }> = {
  "primera-tarea": { titulo: "cuenta.insigniaPrimera", detalle: "cuenta.insigniaPrimeraDetalle" },
  "cinco-tareas": { titulo: "cuenta.insigniaCinco", detalle: "cuenta.insigniaCincoDetalle" },
  "diez-tareas": { titulo: "cuenta.insigniaDiez", detalle: "cuenta.insigniaDiezDetalle" },
  "primer-proyecto": { titulo: "cuenta.insigniaProyecto", detalle: "cuenta.insigniaProyectoDetalle" },
  "tres-proyectos": { titulo: "cuenta.insigniaTres", detalle: "cuenta.insigniaTresDetalle" },
  "racha-tres": { titulo: "cuenta.insigniaRacha", detalle: "cuenta.insigniaRachaDetalle" },
};

function mesVisible(clave: string, modo: "short" | "long", idioma: Idioma): string {
  const [anio, numero] = clave.split("-").map(Number);
  if (!anio || !numero) return clave;
  return new Intl.DateTimeFormat(idioma === "es" ? "es-CR" : "en-US", {
    month: modo,
    year: modo === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, numero - 1, 1)));
}

export function PanelCuenta() {
  const t = useTexto();
  const claro = useClaro();
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

  if (estado === "cargando") {
    return (
      <div className="grid gap-4">
        <Esqueleto />
      </div>
    );
  }
  if (estado === "error" || !vista) {
    return (
      <div className="grid gap-4">
        <section className="hyto-card p-5 sm:p-6">
          <p role="alert" className="text-sm leading-6 text-[var(--suave)]">
            {claro(aviso ?? "We couldn't load your account.")}
          </p>
          <button type="button" className="hyto-btn is-inline mt-4 px-5" onClick={() => setIntento((valor) => valor + 1)}>
            {t("comunes.tryAgain")}
          </button>
        </section>
        <ComoCobrar />
        <CostoDePagar />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {vista.muestra ? (
        <p className="hyto-note" role="note">
          {t("cuenta.demoNota")}
          {vista.walletMuestra ? t("cuenta.demoNotaMuestra") : t("cuenta.demoNotaSesion")}
        </p>
      ) : null}
      <Billetera vista={vista} alListo={() => setIntento((valor) => valor + 1)} />
      <ComoCobrar />
      <CostoDePagar />
      {vista.muestra ? null : <PasskeyCuenta />}
      {vista.organiza && vista.orgullo.vacio ? null : (
        <>
          <Ganancias orgullo={vista.orgullo} />
          <OrgulloFila orgullo={vista.orgullo} />
          <Insignias insignias={vista.orgullo.insignias} />
          <Recientes orgullo={vista.orgullo} muestra={vista.muestra} />
        </>
      )}
    </div>
  );
}

function Esqueleto() {
  const t = useTexto();
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t("cuenta.loading")}</span>
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

function ComoCobrar() {
  const t = useTexto();
  return (
    <section className="hyto-card p-5 sm:p-6">
      <h2 className="text-sm font-medium text-[var(--suave)]">{t("cuenta.cobroTitulo")}</h2>
      <p className="mt-2 max-w-prose text-sm leading-6">{t("cuenta.cobroCuerpo")}</p>
      <p className="mt-2 max-w-prose text-sm leading-6">{t("cuenta.cobroDespues")}</p>
    </section>
  );
}

/** The same answer Mile already has. Settings shows it for whoever organizes and whoever gets paid. */
function CostoDePagar() {
  const t = useTexto();
  return (
    <section className="hyto-card p-5 sm:p-6">
      <h2 className="text-sm font-medium text-[var(--suave)]">{t("ayuda.costosQ")}</h2>
      <p className="mt-2 max-w-prose text-sm leading-6">{t("ayuda.costosA")}</p>
    </section>
  );
}

function PasaporteStellar() {
  const t = useTexto();
  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--suave)]">{t("cuenta.pasaporteTitulo")}</h3>
      <p className="mt-2 max-w-prose text-sm leading-6">{t("cuenta.pasaporteDetalle")}</p>
      <a className="hyto-btn is-inline mt-5 px-5" href={PASAPORTE_TESTNET} target="_blank" rel="noreferrer">
        {t("cuenta.pasaporteAbrir")}
      </a>
    </div>
  );
}

function Billetera({ vista, alListo }: { vista: VistaCuenta; alListo: () => void }) {
  const t = useTexto();
  const idioma = useIdioma();
  const publica = direccionPublica(vista.wallet);
  const monto = vista.saldoEstado === "ok" && vista.saldo ? formatearRecibido(vista.saldo, idioma) : "—";
  const sinCobro = vista.saldoEstado === "ausente" || vista.saldoEstado === "sin-wallet";
  return (
    <section className="hyto-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-[var(--suave)]">
          {t("cuenta.saldoHyto")}: <span className="hyto-amount text-3xl text-[var(--tinta)]">{monto}</span>
        </p>
        {vista.walletMuestra ? <span className="hyto-pill hyto-pill-muted">{t("comunes.sample")}</span> : null}
      </div>
      <p className="mt-1 text-sm text-[var(--suave)]">{textoSaldo(vista, t)}</p>
      {sinCobro && !vista.demo && !vista.muestra ? <PrepararUsdc silencioPendiente onListo={alListo} /> : null}
      <details className="mt-6 text-sm">
        <summary className="cursor-pointer font-medium text-[var(--suave)]">{t("cuenta.avanzado")}</summary>
        <div className="mt-4 grid gap-5">
          {publica ? (
            <div>
              <h3 className="text-sm font-medium">{t("cuenta.idSoporte")}</h3>
              <Direccion direccion={publica} />
            </div>
          ) : (
            <p className="max-w-prose text-sm leading-6">{t("cuenta.signInWallet")}</p>
          )}
          <PasaporteStellar />
        </div>
      </details>
    </section>
  );
}

function Direccion({ direccion }: { direccion: string }) {
  const t = useTexto();
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
        <button type="button" className="hyto-btn-line is-inline px-5" aria-live="polite" onClick={() => void copiar()}>
          {copiado ? t("cuenta.copied") : t("cuenta.copy")}
        </button>
        <EnlaceExplorador className="hyto-btn-line is-inline px-5" href={`${EXPLORADOR}${encodeURIComponent(direccion)}`}>
          {t("cuenta.viewTestnet")}
        </EnlaceExplorador>
      </div>
      {fallo ? (
        <label className="mt-3 block text-sm text-[var(--suave)]" htmlFor="direccion-publica">
          {t("cuenta.copyHere")}
          <input id="direccion-publica" readOnly value={direccion} className="hyto-input mt-2 font-mono text-sm" />
        </label>
      ) : null}
    </div>
  );
}

function textoSaldo(vista: VistaCuenta, t: (clave: Clave) => string): string {
  if (vista.saldoEstado === "ok" && vista.walletMuestra) return t("cuenta.sampleBalance");
  if (vista.saldoEstado === "ok") return t("cuenta.onWallet");
  if (vista.saldoEstado === "ausente" || vista.saldoEstado === "sin-wallet") return t("cuenta.ausente");
  if (vista.saldoEstado === "error") return t("cuenta.noBalance");
  return t("cuenta.addWallet");
}

function Ganancias({ orgullo }: { orgullo: Orgullo }) {
  const t = useTexto();
  const idioma = useIdioma();
  return (
    <section className="grid gap-4">
      <div className="hyto-kpis">
        <article>
          <p className="text-sm text-[var(--suave)]">{t("cuenta.thisMonth")}</p>
          <p className="hyto-amount mt-2 text-2xl">{formatearRecibido(orgullo.esteMes, idioma)}</p>
        </article>
        <article>
          <p className="text-sm text-[var(--suave)]">{t("cuenta.lastMonth")}</p>
          <p className="hyto-amount mt-2 text-2xl">{formatearRecibido(orgullo.mesPasado, idioma)}</p>
        </article>
        <article>
          <p className="text-sm text-[var(--suave)]">{t("cuenta.allTime")}</p>
          <p className="hyto-amount mt-2 text-2xl text-[var(--acento-texto)]">{formatearRecibido(orgullo.total, idioma)}</p>
        </article>
      </div>
      <div className="hyto-card p-5 sm:p-6">
        <h2 className="text-sm font-medium text-[var(--suave)]">{t("cuenta.earnedEvents")}</h2>
        {orgullo.meses.length > 0 ? <Grafico meses={orgullo.meses} /> : <Vacio orgullo={orgullo} />}
        {orgullo.sinFecha > 0 ? (
          <p className="mt-4 text-sm leading-6 text-[var(--suave)]">
            {t("cuenta.sinFecha")}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Grafico({ meses }: { meses: MesOrgullo[] }) {
  const t = useTexto();
  const idioma = useIdioma();
  const maximo = Math.max(...meses.map((mes) => Number(mes.total) || 0), 0);
  return (
    <ul className="hyto-meses mt-5" aria-label={t("cuenta.earningsByMonth")}>
      {meses.map((mes) => {
        const cifra = Number(mes.total) || 0;
        const altura = maximo > 0 && cifra > 0 ? Math.max(8, Math.round((cifra / maximo) * 100)) : 0;
        const corta = mesVisible(mes.clave, "short", idioma);
        const larga = mesVisible(mes.clave, "long", idioma);
        return (
          <li key={mes.clave} className="hyto-mes" aria-label={`${larga}, ${formatearRecibido(mes.total, idioma) || "US$0"}`}>
            <span className="hyto-mes-valor" aria-hidden="true">
              {cifra > 0 ? formatearRecibido(mes.total, idioma) : ""}
            </span>
            <span className="hyto-mes-pista" aria-hidden="true">
              <span className={altura === 0 ? "hyto-mes-col is-zero" : "hyto-mes-col"} style={{ height: `${altura}%` }} />
            </span>
            <span className="hyto-mes-nombre" aria-hidden="true">
              {corta}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Vacio({ orgullo }: { orgullo: Orgullo }) {
  const t = useTexto();
  const frase = orgullo.vacio ? t("cuenta.vacio") : t("cuenta.vacioConPagos");
  return (
    <div className="hyto-vacio mt-5">
      <span className="hyto-vacio-barras" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <p className="text-sm leading-6 text-[var(--suave)]">{frase}</p>
    </div>
  );
}

function OrgulloFila({ orgullo }: { orgullo: Orgullo }) {
  const t = useTexto();
  const idioma = useIdioma();
  const racha = orgullo.racha === 1 ? t("cuenta.oneMonth") : orgullo.racha > 1 ? t("cuenta.months", { n: orgullo.racha }) : "—";
  const filas = [
    { etiqueta: t("cuenta.tasksPaid"), valor: String(orgullo.tareasCompletadas), detalle: orgullo.vacio ? t("cuenta.noneYet") : t("cuenta.milestonesReleased") },
    { etiqueta: t("cuenta.projectsFinished"), valor: String(orgullo.proyectosCompletados), detalle: t("cuenta.allTasksPaid") },
    { etiqueta: t("cuenta.streak"), valor: racha, detalle: orgullo.racha > 0 ? t("cuenta.inARow") : t("cuenta.noPayoutMonth") },
    {
      etiqueta: t("cuenta.bestMonth"),
      valor: orgullo.mejorMes ? formatearRecibido(orgullo.mejorMes.total, idioma) : "—",
      detalle: orgullo.mejorMes ? mesVisible(orgullo.mejorMes.clave, "long", idioma) : t("cuenta.bestLater"),
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
  const t = useTexto();
  return (
    <section className="hyto-card p-5 sm:p-6">
      <h2 className="text-sm font-medium text-[var(--suave)]">{t("cuenta.milestones")}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insignias.map((insignia) => {
          const nombres = INSIGNIA[insignia.id];
          return (
          <li key={insignia.id} className={insignia.obtenida ? "hyto-logro is-on" : "hyto-logro"}>
            <p className="font-medium">{nombres ? t(nombres.titulo) : insignia.titulo}</p>
            <p className="mt-1 text-sm text-[var(--suave)]">{nombres ? t(nombres.detalle) : insignia.detalle}</p>
            <p className={`mt-3 text-xs font-semibold ${insignia.obtenida ? "text-[var(--acento-texto)]" : "text-[var(--suave)]"}`}>
              {insignia.obtenida ? t("cuenta.earned") : t("cuenta.locked")}
            </p>
          </li>
          );
        })}
      </ul>
    </section>
  );
}

function Recientes({ orgullo, muestra }: { orgullo: Orgullo; muestra: boolean }) {
  const t = useTexto();
  const idioma = useIdioma();
  return (
    <section className="hyto-card p-5 sm:p-6">
      <h2 className="text-sm font-medium text-[var(--suave)]">{t("cuenta.recent")}</h2>
      {orgullo.recientes.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[var(--suave)]">{t("cuenta.nothingPaid")}</p>
      ) : (
        <ul className="mt-2">
          {orgullo.recientes.map((tarea) => {
            const cuerpo = (
              <>
                <div className="min-w-0">
                  <p className="truncate font-medium">{textoVisible(tarea.titulo, idioma)}</p>
                  <p className="mt-1 text-sm text-[var(--suave)]">
                    {textoVisible(tarea.proyecto, idioma)}
                    {tarea.pagadoEn ? ` · ${formatearFecha(tarea.pagadoEn, idioma)}` : ""}
                  </p>
                </div>
                <p className="hyto-amount max-w-[16rem] shrink text-right text-sm leading-5">
                  {tarea.monto ? explicarNeto(tarea.monto, idioma) : "—"}
                </p>
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
