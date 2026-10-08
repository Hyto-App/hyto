"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { TextoClaro } from "@/components/ui/TextoClaro";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { normalizarMonto, textoMonto } from "@/lib/admin/vista";
import { AVISO_MONTO_INVALIDO } from "@/lib/escrow/monto";
import { faltaParaCrear } from "@/lib/escrow/saldo";
import { avisoMontoEntrada, escribirMonto } from "@/lib/tareas/monto-entrada";
import { formatearMonto, textosSaldo } from "@/lib/integrante/formato";
import type { TipoTarea } from "@/lib/integrante/tipos";
import { AVISO_PROYECTO_DEMO } from "@/lib/sesion/demo";
import { CAMPOS_MILE, LIMITES_MILE, type ClaveMile } from "@/lib/revision/contexto-mile";
import { contadorCerca, contextoAbierto, errorPortada, hayTextoMile, mostrarRecibos } from "@/lib/ui/campos-evento";
import { AreaTexto, Contador, IconoCandado, ZonaPortada } from "./CamposEvento";

type Fila = {
  clave: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  condicion: string;
  asignado: string;
};

const FILA_INICIAL: Fila = {
  clave: "1",
  titulo: "",
  tipo: "trabajo",
  monto: "",
  condicion: "",
  asignado: "",
};

const MILE_VACIO = Object.fromEntries(CAMPOS_MILE.map((clave) => [clave, ""])) as Record<ClaveMile, string>;

function sumarCentavos(filas: readonly Fila[]): { trabajo: number; reembolso: number } {
  let trabajo = 0;
  let reembolso = 0;
  for (const fila of filas) {
    const monto = normalizarMonto(fila.monto);
    if (!monto) continue;
    const centavos = Math.round(Number(monto) * 100);
    if (fila.tipo === "reembolso") reembolso += centavos;
    else trabajo += centavos;
  }
  return { trabajo, reembolso };
}

function filaNueva(): Fila {
  return {
    clave: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    titulo: "",
    tipo: "trabajo",
    monto: "",
    condicion: "",
    asignado: "",
  };
}

export function CrearProyecto({ saldo = null }: { saldo?: string | null }) {
  const router = useRouter();
  const modoDemo = useModoDemo();
  const t = useTexto();
  const idioma = useIdioma();
  const [nombre, setNombre] = useState("");
  const [filas, setFilas] = useState<Fila[]>([FILA_INICIAL]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [contextoMile, setContextoMile] = useState<Record<ClaveMile, string>>(MILE_VACIO);
  const [portada, setPortada] = useState<File | null>(null);
  const [contextoAbiertoPorUsuario, setContextoAbiertoPorUsuario] = useState(false);
  const [creadoId, setCreadoId] = useState<string | null>(null);

  function cambiar(clave: string, cambio: Partial<Fila>) {
    setFilas((actuales) => actuales.map((fila) => (fila.clave === clave ? { ...fila, ...cambio } : fila)));
  }

  async function fondear() {
    if (modoDemo) {
      setAviso(AVISO_PROYECTO_DEMO);
      return;
    }
    const previo = sumarCentavos(filas);
    if (faltaParaCrear(saldo, textoMonto(previo.trabajo + previo.reembolso))) return;
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setAviso("Enter an event name.");
      return;
    }
    const falla = portada ? errorPortada(portada) : null;
    if (falla) {
      setAviso(t(falla === "type" ? "eventos.coverType" : "eventos.coverSize"));
      return;
    }

    const tareas = filas
      .map((fila) => ({
        titulo: fila.titulo.trim(),
        tipo: fila.tipo,
        monto: normalizarMonto(fila.monto),
        montoCrudo: fila.monto.trim(),
        condicion: fila.condicion.trim(),
        asignado: fila.asignado.trim(),
      }))
      .filter((fila) => fila.titulo || fila.montoCrudo);

    if (tareas.length === 0) {
      setAviso("Add at least one task with a title and an amount.");
      return;
    }
    if (tareas.some((fila) => !fila.titulo)) {
      setAviso("Every task needs a title.");
      return;
    }
    if (tareas.some((fila) => fila.montoCrudo && !fila.monto)) {
      setAviso(AVISO_MONTO_INVALIDO);
      return;
    }
    if (tareas.some((fila) => !fila.monto)) {
      setAviso("Every task needs an amount greater than zero.");
      return;
    }

    const payload = tareas.map(({ montoCrudo: _omit, ...fila }) => fila);

    let respuesta: Response;
    try {
      respuesta = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: nombreLimpio, descripcion: descripcion.trim(), contextoMile, tareas: payload }),
      });
    } catch {
      setAviso("Could not reach the server. Check your connection and try again.");
      return;
    }
    const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string; proyecto?: { id?: string } } | null;
    if (!respuesta.ok || !cuerpo?.proyecto?.id) {
      setAviso(cuerpo?.aviso ?? "Could not create the event. Please try again.");
      return;
    }
    const id = cuerpo.proyecto.id;
    if (portada) {
      const datos = new FormData();
      datos.set("portada", portada);
      const subida = await fetch(`/api/eventos/${encodeURIComponent(id)}/portada`, { method: "POST", body: datos }).catch(() => null);
      if (!subida?.ok) {
        const motivo = subida ? ((await subida.json().catch(() => null)) as { aviso?: string } | null)?.aviso : null;
        setCreadoId(id);
        setAviso(motivo ? `${t("eventos.coverNotSaved")} ${motivo}` : t("eventos.coverNotSaved"));
        return;
      }
    }
    router.push(`/eventos/${id}`);
  }

  function cambiarMile(clave: ClaveMile, valor: string) {
    setContextoMile((actual) => ({ ...actual, [clave]: valor }));
  }

  function campoMile(clave: Exclude<ClaveMile, "notas">, ayudaId: string, unaLinea = false) {
    const max = LIMITES_MILE[clave];
    const id = `mile-${clave}`;
    return (
      <div className="mt-4">
        <label className="block text-sm text-[var(--suave)]" htmlFor={id}>
          {t(`eventos.mileCampos.${clave}`)}
        </label>
        {unaLinea ? (
          <input
            id={id}
            value={contextoMile[clave]}
            maxLength={max}
            placeholder={t(`eventos.mileCampos.${clave}Ph`)}
            aria-describedby={ayudaId}
            onChange={(evento) => cambiarMile(clave, evento.target.value)}
            className="hyto-input mt-2"
          />
        ) : (
          <AreaTexto id={id} valor={contextoMile[clave]} max={max} filas={2} ayudaId={ayudaId} placeholder={t(`eventos.mileCampos.${clave}Ph`)} onCambio={(valor) => cambiarMile(clave, valor)} />
        )}
        {contadorCerca(contextoMile[clave].length, max) ? <Contador largo={contextoMile[clave].length} max={max} /> : null}
      </div>
    );
  }

  const { trabajo, reembolso } = sumarCentavos(filas);
  const total = ((trabajo + reembolso) / 100).toString();
  const falta = faltaParaCrear(saldo, textoMonto(trabajo + reembolso));

  return (
    <main className="hyto-page">
      <p className="hyto-crumb">
        <Link href="/eventos">{t("eventos.title")}</Link>
        <span aria-hidden="true">/</span>
        <span>{t("eventos.newEvent")}</span>
      </p>
      <header className="hyto-page-head">
        <div>
          <h1 className="hyto-title">{t("eventos.createTitle")}</h1>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <section className="hyto-card hyto-seccion" aria-labelledby="detalles-titulo">
            <h2 id="detalles-titulo" className="hyto-seccion-titulo">
              {t("eventos.detailsTitle")}
            </h2>
            <label className="mt-4 block text-sm text-[var(--suave)]" htmlFor="nombre-proyecto">
              {t("eventos.name")}
            </label>
            <input
              id="nombre-proyecto"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              className="hyto-input mt-2"
            />

            <div className="mt-6">
              <ZonaPortada
                id="portada-proyecto"
                archivo={portada}
                nombreEvento={nombre}
                etiqueta={t("eventos.coverPhoto")}
                ayudaId="portada-ayuda"
                onArchivo={setPortada}
              />
              <p id="portada-ayuda" className="mt-2 text-xs text-[var(--suave)]">
                {t("eventos.coverHelp")}
              </p>
            </div>

            <label className="mt-6 block text-sm text-[var(--suave)]" htmlFor="descripcion-proyecto">
              {t("eventos.description")}
            </label>
            <AreaTexto id="descripcion-proyecto" valor={descripcion} max={1000} filas={5} ayudaId="descripcion-ayuda" onCambio={setDescripcion} />
            <p id="descripcion-ayuda" className="mt-2 text-xs text-[var(--suave)]">
              {t("eventos.descriptionHelp")}
            </p>
            <Contador largo={descripcion.length} max={1000} />
          </section>

          <section className="hyto-card hyto-seccion" aria-labelledby="mile-titulo">
            <h2 id="mile-titulo" className="hyto-seccion-titulo">
              <IconoCandado />
              {t("eventos.mileTitle")}
            </h2>
            <p className="hyto-seccion-nota">{t("eventos.mileLock")}</p>
            {contextoAbierto(hayTextoMile(contextoMile) ? "x" : "", contextoAbiertoPorUsuario) ? (
              <div className="mt-4">
                <h3 className="text-sm font-semibold">{t("eventos.mileAbout")}</h3>
                <p id="mile-fondo-ayuda" className="mt-1 text-xs text-[var(--suave)]">
                  {t("eventos.mileAboutHelp")}
                </p>
                {campoMile("lugar", "mile-fondo-ayuda", true)}
                {campoMile("trata", "mile-fondo-ayuda")}
                {campoMile("cuando", "mile-fondo-ayuda", true)}
                {campoMile("senales", "mile-fondo-ayuda")}

                <h3 className="mt-6 text-sm font-semibold">{t("eventos.mileRules")}</h3>
                <p id="mile-reglas-ayuda" className="mt-1 text-xs text-[var(--suave)]">
                  {t("eventos.mileRulesHelp")}
                </p>
                {campoMile("debeVerse", "mile-reglas-ayuda")}
                {campoMile("noCuenta", "mile-reglas-ayuda")}
                {mostrarRecibos(filas.map((fila) => fila.tipo)) ? campoMile("recibos", "mile-reglas-ayuda") : null}

                <div className="mt-6">
                  <label className="block text-sm text-[var(--suave)]" htmlFor="mile-notas">
                    {t("eventos.mileCampos.notas")}
                  </label>
                  <AreaTexto id="mile-notas" valor={contextoMile.notas} max={LIMITES_MILE.notas} filas={3} ayudaId="mile-notas-ayuda" onCambio={(valor) => cambiarMile("notas", valor)} />
                  <p id="mile-notas-ayuda" className="mt-2 text-xs text-[var(--suave)]">
                    {t("eventos.mileCampos.notasHelp")}
                  </p>
                  {contadorCerca(contextoMile.notas.length, LIMITES_MILE.notas) ? <Contador largo={contextoMile.notas.length} max={LIMITES_MILE.notas} /> : null}
                </div>
                {!hayTextoMile(contextoMile) ? (
                  <button type="button" onClick={() => setContextoAbiertoPorUsuario(false)} className="hyto-btn-line is-inline mt-3 px-4">
                    {t("eventos.mileHide")}
                  </button>
                ) : null}
              </div>
            ) : (
              <button type="button" onClick={() => setContextoAbiertoPorUsuario(true)} aria-expanded="false" className="hyto-btn-line is-inline mt-4 px-5">
                {t("eventos.mileAdd")}
              </button>
            )}
          </section>

          <div className="mt-8 space-y-4">
            {filas.map((fila, indice) => (
              <fieldset key={fila.clave} className="hyto-card p-5">
                <legend className="text-sm text-[var(--suave)]">{t("eventos.taskN", { n: indice + 1 })}</legend>
                <label className="mt-3 block text-sm text-[var(--suave)]" htmlFor={`titulo-${fila.clave}`}>
                  {t("eventos.titleLabel")}
                </label>
                <input
                  id={`titulo-${fila.clave}`}
                  value={fila.titulo}
                  onChange={(evento) => cambiar(fila.clave, { titulo: evento.target.value })}
                  className="hyto-input mt-2"
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-[var(--suave)]">{t("eventos.type")}</p>
                    <div className="hyto-opciones mt-2" role="group" aria-label={t("eventos.type")}>
                      <button
                        type="button"
                        aria-pressed={fila.tipo === "trabajo"}
                        onClick={() => cambiar(fila.clave, { tipo: "trabajo" })}
                        className={`hyto-opcion ${fila.tipo === "trabajo" ? "bg-[var(--tinta)] text-[var(--fondo)]" : "border border-[var(--borde)] text-[var(--suave)]"}`}
                      >
                        {t("tipos.trabajo")}
                      </button>
                      <button
                        type="button"
                        aria-pressed={fila.tipo === "reembolso"}
                        onClick={() => cambiar(fila.clave, { tipo: "reembolso" })}
                        className={`hyto-opcion ${fila.tipo === "reembolso" ? "bg-[var(--tinta)] text-[var(--fondo)]" : "border border-[var(--borde)] text-[var(--suave)]"}`}
                      >
                        {t("tipos.reembolso")}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--suave)]" htmlFor={`monto-${fila.clave}`}>
                      {t("eventos.amount")}
                    </label>
                    <input
                      id={`monto-${fila.clave}`}
                      inputMode="decimal"
                      value={fila.monto}
                      aria-invalid={avisoMontoEntrada(fila.monto) ? true : undefined}
                      aria-describedby={avisoMontoEntrada(fila.monto) ? `monto-error-${fila.clave}` : undefined}
                      onChange={(evento) => cambiar(fila.clave, { monto: escribirMonto(evento.target.value) })}
                      className="hyto-input mt-2"
                    />
                    {avisoMontoEntrada(fila.monto) ? (
                      <p id={`monto-error-${fila.clave}`} role="alert" className="mt-2 text-sm text-[var(--peligro)]">
                        {avisoMontoEntrada(fila.monto)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <label className="mt-4 block text-sm text-[var(--suave)]" htmlFor={`condicion-${fila.clave}`}>
                  {t("eventos.photoMust")}
                </label>
                <input
                  id={`condicion-${fila.clave}`}
                  value={fila.condicion}
                  onChange={(evento) => cambiar(fila.clave, { condicion: evento.target.value })}
                  className="hyto-input mt-2"
                />
                <label className="mt-4 block text-sm text-[var(--suave)]" htmlFor={`asignado-${fila.clave}`}>
                  {t("eventos.assignee")}
                </label>
                <input
                  id={`asignado-${fila.clave}`}
                  type="email"
                  value={fila.asignado}
                  onChange={(evento) => cambiar(fila.clave, { asignado: evento.target.value })}
                  className="hyto-input mt-2"
                />
                {filas.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setFilas((actuales) => actuales.filter((item) => item.clave !== fila.clave))}
                    className="hyto-btn-danger is-inline mt-4 px-5"
                  >
                    {t("eventos.remove", { name: fila.titulo.trim() || t("eventos.taskWord") })}
                  </button>
                ) : null}
              </fieldset>
            ))}
          </div>

          <button type="button" onClick={() => setFilas((actuales) => [...actuales, filaNueva()])} className="hyto-btn-line is-inline mt-4 px-5">
            {t("eventos.addTask")}
          </button>
        </div>

        <aside className="hyto-panel lg:sticky lg:top-6">
          <h2 className="text-base font-semibold">{t("eventos.budget")}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--suave)]">{t("eventos.workTasks")}</dt>
              <dd className="hyto-amount">{formatearMonto((trabajo / 100).toString(), idioma)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--suave)]">{t("eventos.reimbursements")}</dt>
              <dd className="hyto-amount">{formatearMonto((reembolso / 100).toString(), idioma)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-[var(--linea)] pt-3 text-base font-semibold">
              <dt>{t("eventos.total")}</dt>
              <dd className="hyto-amount">{formatearMonto(total, idioma)}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <BotonPrincipal
              type="button"
              onClick={() => void fondear()}
              disabled={modoDemo || creadoId !== null || falta !== null}
              aria-describedby={falta ? "aviso-saldo-crear" : undefined}
            >
              {t("eventos.createEvent")}
            </BotonPrincipal>
            {creadoId ? (
              <Link href={`/eventos/${creadoId}`} className="hyto-btn-line is-inline px-5">
                {t("eventos.openEvent")}
              </Link>
            ) : null}
            {modoDemo ? (
              <p role="alert" className="text-sm leading-6 text-[var(--suave)]">
                <TextoClaro mensaje={AVISO_PROYECTO_DEMO} />
              </p>
            ) : falta ? (
              <p id="aviso-saldo-crear" role="alert" className="text-sm leading-6 text-[var(--suave)]">
                {t("errores.saldoNoCubre", textosSaldo(falta, idioma))}
              </p>
            ) : aviso ? (
              <p role="alert" className="text-sm leading-6 text-[var(--suave)]">
                <TextoClaro mensaje={aviso} />
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
