"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTexto } from "@/components/ui/Idioma";
import { buscarContactos, normalizarCorreo } from "@/lib/organizaciones/reglas";

type ContactoEvento = {
  email: string;
  nombre: string | null;
  etiquetas: string[];
  participaciones: number;
  enElEvento: boolean;
};

type Datos = { organizacion: { id: string; nombre: string }; sugeridos: ContactoEvento[]; guardados: ContactoEvento[] };
type Enlace = { email: string; enlace: string };

/**
 * Picks people from the organization's saved volunteers instead of typing emails one by one.
 * Every invite goes through the same endpoint as a single direct invite.
 */
export function SelectorContactos({ proyectoId, respaldo = null }: { proyectoId: string; respaldo?: ReactNode }) {
  const t = useTexto();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [listo, setListo] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState("");
  const [confirmar, setConfirmar] = useState<{ correos: string[]; abierto: boolean } | null>(null);
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);
  const [fallidos, setFallidos] = useState<string[]>([]);

  useEffect(() => {
    let vigente = true;
    void fetch(`/api/eventos/${encodeURIComponent(proyectoId)}/contactos`, { cache: "no-store" })
      .then(async (respuesta) => (respuesta.ok ? ((await respuesta.json()) as Datos) : null))
      .catch(() => null)
      .then((cuerpo) => {
        if (!vigente) return;
        setDatos(cuerpo);
        setListo(true);
      });
    return () => {
      vigente = false;
    };
  }, [proyectoId]);

  // Not an admin of the organization (or the flag is off): the plain email invite stays.
  if (!datos) return listo ? respaldo : null;

  const visibles = buscarContactos(datos.guardados, consulta);

  function alternar(email: string) {
    setElegidos((actuales) => (actuales.includes(email) ? actuales.filter((item) => item !== email) : [...actuales, email]));
  }

  async function invitar(correos: string[], senal?: AbortSignal) {
    const listos: Enlace[] = [];
    const fallos: string[] = [];
    for (const email of correos) {
      const respuesta = await fetch(`/api/eventos/${encodeURIComponent(proyectoId)}/invitaciones`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo: "direct", email, rol: "volunteer" }),
        signal: senal,
      }).catch(() => null);
      const cuerpo = (await respuesta?.json().catch(() => null)) as { secreto?: string } | null;
      if (respuesta?.ok && cuerpo?.secreto) listos.push({ email, enlace: `${window.location.origin}/join/${cuerpo.secreto}` });
      else fallos.push(email);
    }
    if (listos.length === 0) throw new Error(t("organizaciones.invitesFalla", { correos: fallos.join(", ") }));
    setEnlaces((actuales) => [...actuales, ...listos]);
    setFallidos(fallos);
    setElegidos((actuales) => actuales.filter((email) => !listos.some((listo) => listo.email === email)));
    setNuevo("");
    // A new email is saved as a contact by the invite itself: read the list again.
    const recarga = await fetch(`/api/eventos/${encodeURIComponent(proyectoId)}/contactos`, { cache: "no-store" }).catch(() => null);
    if (recarga?.ok) setDatos((await recarga.json()) as Datos);
  }

  const correoNuevo = normalizarCorreo(nuevo);

  return (
    <div className="grid gap-4" role="group" aria-label={datos.organizacion.nombre}>
      {datos.sugeridos.length > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">{t("organizaciones.sugeridos")}</legend>
          {datos.sugeridos.map((contacto) => (
            <Opcion key={`s-${contacto.email}`} contacto={contacto} marcado={elegidos.includes(contacto.email)} onAlternar={alternar} prefijo="sugerido" />
          ))}
        </fieldset>
      ) : null}
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">{t("organizaciones.guardados")}</legend>
        <label className="sr-only" htmlFor="buscar-guardados">
          {t("organizaciones.buscarContactos")}
        </label>
        <input
          id="buscar-guardados"
          className="hyto-input"
          placeholder={t("organizaciones.buscarContactos")}
          value={consulta}
          onChange={(evento) => setConsulta(evento.target.value)}
        />
        {datos.guardados.length === 0 ? <p className="text-sm text-[var(--suave)]">{t("organizaciones.sinContactosEvento")}</p> : null}
        {datos.guardados.length > 0 && visibles.length === 0 ? <p className="text-sm text-[var(--suave)]">{t("organizaciones.sinResultados")}</p> : null}
        {visibles.map((contacto) => (
          <Opcion key={`g-${contacto.email}`} contacto={contacto} marcado={elegidos.includes(contacto.email)} onAlternar={alternar} prefijo="guardado" />
        ))}
      </fieldset>
      <button
        type="button"
        className="hyto-btn-line"
        disabled={elegidos.length === 0}
        onClick={() => setConfirmar({ correos: elegidos, abierto: true })}
      >
        {t("organizaciones.invitarN", { n: elegidos.length })}
      </button>
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="invitar-nuevo">
          {t("organizaciones.invitarNuevo")}
        </label>
        <input id="invitar-nuevo" type="email" className="hyto-input" value={nuevo} placeholder={t("eventos.email")} onChange={(evento) => setNuevo(evento.target.value)} />
        <button type="button" className="hyto-btn-line" disabled={!correoNuevo} onClick={() => correoNuevo && setConfirmar({ correos: [correoNuevo], abierto: true })}>
          {t("organizaciones.invitarNuevoAccion")}
        </button>
      </div>
      {fallidos.length > 0 ? (
        <p role="alert" className="text-sm">
          {t("organizaciones.invitesFalla", { correos: fallidos.join(", ") })}
        </p>
      ) : null}
      {enlaces.length > 0 ? (
        <div role="status" className="grid gap-2">
          <p className="text-sm font-medium">{t("organizaciones.enlaces")}</p>
          <p className="text-sm">{t("organizaciones.invitesListas", { n: enlaces.length })}</p>
          <ul className="grid gap-2">
            {enlaces.map((item) => (
              <li key={item.email} className="text-sm">
                <span className="block">{item.email}</span>
                <input readOnly aria-label={item.email} className="hyto-input mt-1 w-full font-mono text-xs" value={item.enlace} onFocus={(evento) => evento.currentTarget.select()} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {confirmar ? (
        <ConfirmDialog
          abierto={confirmar.abierto}
          onCerrar={() => setConfirmar((actual) => (actual ? { ...actual, abierto: false } : actual))}
          titulo={t("organizaciones.confirmarTitulo", { n: confirmar.correos.length })}
          detalle={t("organizaciones.confirmarDetalle")}
          confirmar={t("organizaciones.confirmarAccion")}
          onConfirmar={(senal) => invitar(confirmar.correos, senal)}
        />
      ) : null}
    </div>
  );
}

function Opcion({
  contacto,
  marcado,
  onAlternar,
  prefijo,
}: {
  contacto: ContactoEvento;
  marcado: boolean;
  onAlternar: (email: string) => void;
  prefijo: string;
}) {
  const t = useTexto();
  const id = `${prefijo}-${contacto.email}`;
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm">
      <input id={id} type="checkbox" checked={marcado} disabled={contacto.enElEvento} onChange={() => onAlternar(contacto.email)} />
      <span>
        <span className="block font-medium">{contacto.nombre || contacto.email}</span>
        {contacto.nombre ? <span className="block text-[var(--suave)]">{contacto.email}</span> : null}
        {contacto.enElEvento ? <span className="block text-xs">{t("organizaciones.yaEnEvento")}</span> : null}
      </span>
    </label>
  );
}
