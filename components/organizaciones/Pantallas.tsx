"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";
import { buscarContactos } from "@/lib/organizaciones/reglas";

type Resumen = { id: string; nombre: string; descripcion: string; etiquetas: string[] };

type Contacto = {
  email: string;
  nombre: string | null;
  etiquetas: string[];
  origen: "manual" | "evento" | "invitacion";
  participaciones: number;
  tieneCuenta: boolean;
};

type Admin = { usuarioId: string; email: string; nombre: string };
type EventoDeOrganizacion = { id: string; nombre: string };
type Pestana = "voluntarios" | "admins" | "eventos";
type Errores = { aviso?: string; codigo?: string };

function etiquetasDe(texto: string): string[] {
  return texto
    .split(",")
    .map((etiqueta) => etiqueta.trim())
    .filter(Boolean);
}

async function pedir(url: string, metodo: string, cuerpo?: unknown): Promise<{ ok: boolean; datos: (Errores & Record<string, unknown>) | null }> {
  const respuesta = await fetch(url, {
    method: metodo,
    headers: cuerpo === undefined ? undefined : { "content-type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: "no-store",
  }).catch(() => null);
  if (!respuesta) return { ok: false, datos: null };
  const datos = (await respuesta.json().catch(() => null)) as (Errores & Record<string, unknown>) | null;
  return { ok: respuesta.ok, datos };
}

export function ListaOrganizaciones() {
  const t = useTexto();
  const [lista, setLista] = useState<Resumen[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void pedir("/api/organizaciones", "GET").then(({ ok, datos }) => {
      if (!vigente) return;
      if (!ok) {
        setAviso(t("organizaciones.noCarga"));
        setLista([]);
        return;
      }
      setLista((datos?.organizaciones as Resumen[] | undefined) ?? []);
    });
    return () => {
      vigente = false;
    };
  }, [t]);

  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <header className="hyto-page-head">
        <div>
          <h1 className="hyto-title">{t("organizaciones.titulo")}</h1>
          <p className="hyto-sub">{t("organizaciones.subtitulo")}</p>
        </div>
        <Link href="/organizaciones/nueva" className="hyto-btn is-inline">
          {t("organizaciones.crear")}
        </Link>
      </header>
      {aviso ? <p className="mt-4 text-sm">{aviso}</p> : null}
      {lista === null ? <p className="mt-6 text-sm text-[var(--suave)]">{t("organizaciones.cargando")}</p> : null}
      {lista && lista.length === 0 && !aviso ? <p className="mt-6 text-sm text-[var(--suave)]">{t("organizaciones.vacio")}</p> : null}
      <ul className="mt-6 grid gap-3">
        {(lista ?? []).map((organizacion) => (
          <li key={organizacion.id}>
            <Link href={`/organizaciones/${organizacion.id}`} className="hyto-card block">
              <strong>{organizacion.nombre}</strong>
              <p className="mt-1 text-sm text-[var(--suave)]">{organizacion.descripcion || t("organizaciones.sinDescripcion")}</p>
              {organizacion.etiquetas.length > 0 ? <p className="mt-2 text-xs">{organizacion.etiquetas.join(" · ")}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

export function FormularioOrganizacion() {
  const t = useTexto();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [etiquetas, setEtiquetas] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setOcupado(true);
    setAviso(null);
    const { ok, datos } = await pedir("/api/organizaciones", "POST", { nombre, descripcion, etiquetas: etiquetasDe(etiquetas) });
    setOcupado(false);
    const id = (datos?.organizacion as { id?: string } | undefined)?.id;
    if (!ok || !id) {
      setAviso(datos?.aviso ?? t("organizaciones.noGuarda"));
      return;
    }
    router.push(`/organizaciones/${id}`);
  }

  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <h1 className="hyto-title">{t("organizaciones.crear")}</h1>
      <form className="mt-6 grid max-w-lg gap-4" onSubmit={(evento) => void enviar(evento)}>
        <label className="block text-sm" htmlFor="nombre-organizacion">
          {t("organizaciones.nombre")}
          <input id="nombre-organizacion" className="hyto-input mt-2 w-full" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
        </label>
        <label className="block text-sm" htmlFor="descripcion-organizacion">
          {t("organizaciones.descripcion")}
          <textarea id="descripcion-organizacion" className="hyto-input mt-2 w-full" rows={4} value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} />
        </label>
        <label className="block text-sm" htmlFor="etiquetas-organizacion">
          {t("organizaciones.etiquetas")}
          <input id="etiquetas-organizacion" className="hyto-input mt-2 w-full" value={etiquetas} onChange={(evento) => setEtiquetas(evento.target.value)} />
          <span className="mt-1 block text-xs text-[var(--suave)]">{t("organizaciones.etiquetasAyuda")}</span>
        </label>
        {aviso ? <p role="alert" className="text-sm">{aviso}</p> : null}
        <button type="submit" className="hyto-btn" disabled={ocupado}>
          {t("organizaciones.guardar")}
        </button>
      </form>
    </main>
  );
}

export function PaginaOrganizacion({ id, usuarioId }: { id: string; usuarioId: string }) {
  const t = useTexto();
  const [organizacion, setOrganizacion] = useState<Resumen | null>(null);
  const [eventos, setEventos] = useState<EventoDeOrganizacion[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>("voluntarios");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [etiquetas, setEtiquetas] = useState("");
  const [guardado, setGuardado] = useState(false);

  const base = `/api/organizaciones/${encodeURIComponent(id)}`;

  const cargar = useCallback(async () => {
    const detalle = await pedir(base, "GET");
    const cuerpo = detalle.datos?.organizacion as Resumen | undefined;
    if (!detalle.ok || !cuerpo) {
      setAviso(t(detalle.datos === null ? "organizaciones.noCarga" : "organizaciones.soloAdmins"));
      setOrganizacion(null);
      return;
    }
    setOrganizacion(cuerpo);
    setNombre(cuerpo.nombre);
    setDescripcion(cuerpo.descripcion);
    setEtiquetas(cuerpo.etiquetas.join(", "));
    setEventos((detalle.datos?.eventos as EventoDeOrganizacion[] | undefined) ?? []);
    setAviso(null);
    const [voluntarios, equipo] = await Promise.all([pedir(`${base}/contactos`, "GET"), pedir(`${base}/admins`, "GET")]);
    setContactos((voluntarios.datos?.contactos as Contacto[] | undefined) ?? []);
    setAdmins((equipo.datos?.admins as Admin[] | undefined) ?? []);
  }, [base, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardarCambios(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardado(false);
    const { ok, datos } = await pedir(base, "PATCH", { nombre, descripcion, etiquetas: etiquetasDe(etiquetas) });
    if (!ok) {
      setAviso(datos?.aviso ?? t("organizaciones.noGuarda"));
      return;
    }
    setAviso(null);
    setGuardado(true);
    await cargar();
  }

  if (!organizacion) {
    return (
      <main className="hyto-page mx-auto max-w-3xl">
        <p className="text-sm" role="alert">{aviso ?? t("organizaciones.cargando")}</p>
        <p className="mt-4">
          <Link href="/organizaciones" className="hyto-btn-line is-inline">{t("organizaciones.titulo")}</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <p className="hyto-crumb">
        <Link href="/organizaciones">{t("organizaciones.titulo")}</Link>
        <span aria-hidden="true">/</span>
        <span>{organizacion.nombre}</span>
      </p>
      <h1 className="hyto-title mt-4">{organizacion.nombre}</h1>
      <form className="hyto-card mt-6 grid gap-4 p-5" onSubmit={(evento) => void guardarCambios(evento)}>
        <label className="block text-sm" htmlFor="nombre-organizacion">
          {t("organizaciones.nombre")}
          <input id="nombre-organizacion" className="hyto-input mt-2 w-full" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
        </label>
        <label className="block text-sm" htmlFor="descripcion-organizacion">
          {t("organizaciones.descripcion")}
          <textarea id="descripcion-organizacion" className="hyto-input mt-2 w-full" rows={3} value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} />
        </label>
        <label className="block text-sm" htmlFor="etiquetas-organizacion">
          {t("organizaciones.etiquetas")}
          <input id="etiquetas-organizacion" className="hyto-input mt-2 w-full" value={etiquetas} onChange={(evento) => setEtiquetas(evento.target.value)} />
          <span className="mt-1 block text-xs text-[var(--suave)]">{t("organizaciones.etiquetasAyuda")}</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="hyto-btn is-inline px-6">{t("organizaciones.guardarCambios")}</button>
          {guardado ? <p role="status" className="text-sm">{t("organizaciones.guardado")}</p> : null}
        </div>
      </form>
      {aviso ? <p role="alert" className="mt-4 text-sm">{aviso}</p> : null}

      <div className="hyto-tabs mt-6 flex flex-wrap" role="tablist" aria-label={t("organizaciones.pestanas")}>
        {(["voluntarios", "admins", "eventos"] as const).map((clave) => (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={pestana === clave}
            onClick={() => setPestana(clave)}
          >
            {t(`organizaciones.${clave}`)}
          </button>
        ))}
      </div>

      {pestana === "voluntarios" ? (
        <Voluntarios base={base} contactos={contactos} onCambio={cargar} onAviso={setAviso} />
      ) : null}
      {pestana === "admins" ? <Admins base={base} admins={admins} usuarioId={usuarioId} onCambio={cargar} onAviso={setAviso} /> : null}
      {pestana === "eventos" ? (
        <section className="mt-4">
          {eventos.length === 0 ? <p className="text-sm text-[var(--suave)]">{t("organizaciones.sinEventos")}</p> : null}
          <ul className="grid gap-3">
            {eventos.map((evento) => (
              <li key={evento.id}>
                <Link href={`/eventos/${evento.id}`} className="hyto-card block">
                  {evento.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function Voluntarios({
  base,
  contactos,
  onCambio,
  onAviso,
}: {
  base: string;
  contactos: Contacto[];
  onCambio: () => Promise<void>;
  onAviso: (aviso: string | null) => void;
}) {
  const t = useTexto();
  const [consulta, setConsulta] = useState("");
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [etiquetas, setEtiquetas] = useState("");
  const visibles = buscarContactos(contactos, consulta);

  async function agregar(evento: React.FormEvent) {
    evento.preventDefault();
    const { ok, datos } = await pedir(`${base}/contactos`, "POST", { email: correo, nombre, etiquetas: etiquetasDe(etiquetas) });
    if (!ok) {
      onAviso(datos?.aviso ?? t("organizaciones.noGuarda"));
      return;
    }
    onAviso(null);
    setCorreo("");
    setNombre("");
    setEtiquetas("");
    await onCambio();
  }

  async function quitar(email: string) {
    const { ok, datos } = await pedir(`${base}/contactos`, "DELETE", { email });
    onAviso(ok ? null : (datos?.aviso ?? t("organizaciones.noGuarda")));
    await onCambio();
  }

  async function guardarEtiquetas(email: string, texto: string) {
    const { ok, datos } = await pedir(`${base}/contactos`, "PATCH", { email, etiquetas: etiquetasDe(texto) });
    onAviso(ok ? null : (datos?.aviso ?? t("organizaciones.noGuarda")));
    await onCambio();
  }

  return (
    <section className="mt-4">
      <form className="hyto-card grid gap-3 p-5" onSubmit={(evento) => void agregar(evento)}>
        <h2 className="text-base font-semibold">{t("organizaciones.agregarVoluntario")}</h2>
        <label className="block text-sm" htmlFor="correo-voluntario">
          {t("organizaciones.correo")}
          <input id="correo-voluntario" type="email" className="hyto-input mt-2 w-full" value={correo} onChange={(evento) => setCorreo(evento.target.value)} required />
        </label>
        <label className="block text-sm" htmlFor="nombre-voluntario">
          {t("organizaciones.nombreOpcional")}
          <input id="nombre-voluntario" className="hyto-input mt-2 w-full" value={nombre} onChange={(evento) => setNombre(evento.target.value)} />
        </label>
        <label className="block text-sm" htmlFor="etiquetas-voluntario">
          {t("organizaciones.etiquetas")}
          <input id="etiquetas-voluntario" className="hyto-input mt-2 w-full" value={etiquetas} onChange={(evento) => setEtiquetas(evento.target.value)} />
        </label>
        <button type="submit" className="hyto-btn is-inline px-6">{t("organizaciones.agregarVoluntario")}</button>
      </form>
      <label className="mt-6 block text-sm" htmlFor="buscar-voluntario">
        {t("organizaciones.buscar")}
        <input id="buscar-voluntario" className="hyto-input mt-2 w-full" value={consulta} onChange={(evento) => setConsulta(evento.target.value)} />
      </label>
      {contactos.length === 0 ? <p className="mt-4 text-sm text-[var(--suave)]">{t("organizaciones.sinVoluntarios")}</p> : null}
      {contactos.length > 0 && visibles.length === 0 ? <p className="mt-4 text-sm text-[var(--suave)]">{t("organizaciones.sinResultados")}</p> : null}
      <ul className="mt-4 grid gap-3">
        {visibles.map((contacto) => (
          <FilaContacto key={contacto.email} contacto={contacto} onQuitar={quitar} onGuardar={guardarEtiquetas} />
        ))}
      </ul>
    </section>
  );
}

function FilaContacto({
  contacto,
  onQuitar,
  onGuardar,
}: {
  contacto: Contacto;
  onQuitar: (email: string) => Promise<void>;
  onGuardar: (email: string, etiquetas: string) => Promise<void>;
}) {
  const t = useTexto();
  const [etiquetas, setEtiquetas] = useState(contacto.etiquetas.join(", "));
  const origen = contacto.origen === "evento" ? "origenEvento" : contacto.origen === "invitacion" ? "origenInvitacion" : "origenManual";
  const id = `etiquetas-${contacto.email}`;
  return (
    <li className="hyto-card p-4">
      <strong>{contacto.nombre || contacto.email}</strong>
      {contacto.nombre ? <p className="text-sm text-[var(--suave)]">{contacto.email}</p> : null}
      <p className="mt-1 text-xs text-[var(--suave)]">
        {t(`organizaciones.${origen}`)} · {t("organizaciones.participaciones", { n: contacto.participaciones })}
        {contacto.tieneCuenta ? "" : ` · ${t("organizaciones.sinCuenta")}`}
      </p>
      <label className="mt-3 block text-sm" htmlFor={id}>
        {t("organizaciones.etiquetas")}
        <input id={id} className="hyto-input mt-2 w-full" value={etiquetas} onChange={(evento) => setEtiquetas(evento.target.value)} />
      </label>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" className="hyto-btn-line is-inline px-4" onClick={() => void onGuardar(contacto.email, etiquetas)}>
          {t("organizaciones.guardarEtiquetas")}
        </button>
        <button type="button" className="hyto-btn-danger is-inline px-4" onClick={() => void onQuitar(contacto.email)}>
          {t("organizaciones.quitar")}
        </button>
      </div>
    </li>
  );
}

function Admins({
  base,
  admins,
  usuarioId,
  onCambio,
  onAviso,
}: {
  base: string;
  admins: Admin[];
  usuarioId: string;
  onCambio: () => Promise<void>;
  onAviso: (aviso: string | null) => void;
}) {
  const t = useTexto();
  const [correo, setCorreo] = useState("");

  function avisoDe(datos: Errores | null): string {
    if (datos?.codigo === "sin_cuenta") return t("organizaciones.sinCuentaAdmin");
    if (datos?.codigo === "ultimo_admin") return t("organizaciones.ultimoAdmin");
    return datos?.aviso ?? t("organizaciones.noGuarda");
  }

  async function agregar(evento: React.FormEvent) {
    evento.preventDefault();
    const { ok, datos } = await pedir(`${base}/admins`, "POST", { email: correo });
    if (!ok) {
      onAviso(avisoDe(datos));
      return;
    }
    onAviso(null);
    setCorreo("");
    await onCambio();
  }

  async function quitar(objetivo: string) {
    const { ok, datos } = await pedir(`${base}/admins`, "DELETE", { usuarioId: objetivo });
    onAviso(ok ? null : avisoDe(datos));
    await onCambio();
  }

  return (
    <section className="mt-4">
      <form className="hyto-card grid gap-3 p-5" onSubmit={(evento) => void agregar(evento)}>
        <label className="block text-sm" htmlFor="correo-admin">
          {t("organizaciones.correoAdmin")}
          <input id="correo-admin" type="email" className="hyto-input mt-2 w-full" value={correo} onChange={(evento) => setCorreo(evento.target.value)} required />
        </label>
        <button type="submit" className="hyto-btn is-inline px-6">{t("organizaciones.agregarAdmin")}</button>
      </form>
      <ul className="mt-4 grid gap-3">
        {admins.map((admin) => (
          <li key={admin.usuarioId} className="hyto-card flex flex-wrap items-center justify-between gap-3 p-4">
            <span>
              <strong>{admin.nombre || admin.email}</strong>
              {admin.nombre ? <span className="block text-sm text-[var(--suave)]">{admin.email}</span> : null}
              {admin.usuarioId === usuarioId ? <span className="block text-xs">{t("organizaciones.tu")}</span> : null}
            </span>
            <button type="button" className="hyto-btn-danger is-inline px-4" onClick={() => void quitar(admin.usuarioId)}>
              {t("organizaciones.quitarAdmin")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
