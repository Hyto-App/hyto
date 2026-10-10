"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { claseBoton } from "@/components/ui/Boton";
import { useTexto } from "@/components/ui/Idioma";

type Resumen = {
  id: string;
  nombre: string;
  descripcion: string;
  fotoUrl: string | null;
  visibilidad: "publica" | "privada";
};

type Detalle = {
  comunidad: Resumen & { codigo?: string };
  membresia: { rol: "admin" | "miembro" } | null;
  miembros: { usuarioId: string; nombre: string; rol: "admin" | "miembro" }[];
  solicitudes: { id: string; usuarioId: string; nombre: string }[];
  eventos: { id: string; nombre: string }[];
};

type EventoPropio = { id: string; nombre: string; rol?: string | null };

export function ListaComunidades() {
  const t = useTexto();
  const [consulta, setConsulta] = useState("");
  const [publicas, setPublicas] = useState<Resumen[] | null>(null);
  const [mias, setMias] = useState<Resumen[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const control = new AbortController();
    const espera = window.setTimeout(() => {
      void fetch(`/api/comunidades?q=${encodeURIComponent(consulta)}`, { signal: control.signal, cache: "no-store" })
        .then(async (respuesta) => {
          if (!respuesta.ok) {
            setAviso(t("comunidades.noCarga"));
            setPublicas([]);
            return;
          }
          const cuerpo = (await respuesta.json()) as { publicas?: Resumen[]; mias?: Resumen[] };
          setPublicas(cuerpo.publicas ?? []);
          setMias(cuerpo.mias ?? []);
          setAviso(null);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setAviso(t("comunidades.noCarga"));
          setPublicas([]);
        });
    }, 200);
    return () => {
      control.abort();
      window.clearTimeout(espera);
    };
  }, [consulta, t]);

  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <header className="hyto-page-head">
        <div>
          <h1 className="hyto-title">{t("comunidades.titulo")}</h1>
          <p className="hyto-sub">{t("comunidades.subtitulo")}</p>
        </div>
        <Link href="/comunidades/nueva" className={`${claseBoton("primario")} is-inline`}>
          {t("comunidades.crear")}
        </Link>
      </header>
      <form className="mt-6" role="search" onSubmit={(evento) => evento.preventDefault()}>
        <label className="block text-sm" htmlFor="buscar-comunidad">
          {t("comunidades.buscar")}
          <input
            id="buscar-comunidad"
            className="hyto-input mt-2 w-full"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
          />
        </label>
      </form>
      <p className="mt-8 text-sm font-medium">{t("comunidades.publicas")}</p>
      {aviso ? <p className="mt-3 text-sm">{aviso}</p> : null}
      {publicas === null ? <p className="mt-3 text-sm text-[var(--suave)]">{t("comunidades.cargando")}</p> : null}
      {publicas && publicas.length === 0 ? <p className="mt-3 text-sm text-[var(--suave)]">{t("comunidades.vacio")}</p> : null}
      <ul className="mt-3 grid gap-3">
        {(publicas ?? []).map((comunidad) => (
          <li key={comunidad.id}>
            <Tarjeta comunidad={comunidad} />
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm font-medium">{t("comunidades.mias")}</p>
      {mias.length === 0 ? <p className="mt-3 text-sm text-[var(--suave)]">{t("comunidades.sinMias")}</p> : null}
      <ul className="mt-3 grid gap-3">
        {mias.map((comunidad) => (
          <li key={comunidad.id}>
            <Tarjeta comunidad={comunidad} />
          </li>
        ))}
      </ul>
      <p className="mt-8">
        <Link href="/comunidades/unirse" className={`${claseBoton("secundario")} is-inline`}>
          {t("comunidades.entrarCodigo")}
        </Link>
      </p>
    </main>
  );
}

function Tarjeta({ comunidad }: { comunidad: Resumen }) {
  const t = useTexto();
  return (
    <Link href={`/comunidades/${comunidad.id}`} className="hyto-card block">
      <strong>{comunidad.nombre}</strong>
      <p className="mt-1 text-sm text-[var(--suave)]">{comunidad.descripcion || t("comunidades.sinDescripcion")}</p>
      <p className="mt-2 text-xs">{comunidad.visibilidad === "privada" ? t("comunidades.privada") : t("comunidades.publica")}</p>
    </Link>
  );
}

export function FormularioComunidad() {
  const t = useTexto();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [visibilidad, setVisibilidad] = useState<"publica" | "privada">("publica");
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setOcupado(true);
    setAviso(null);
    const respuesta = await fetch("/api/comunidades", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre, descripcion, fotoUrl, visibilidad }),
    }).catch(() => null);
    setOcupado(false);
    const cuerpo = (await respuesta?.json().catch(() => null)) as { aviso?: string; comunidad?: { id?: string } } | null;
    if (!respuesta?.ok || !cuerpo?.comunidad?.id) {
      setAviso(cuerpo?.aviso ?? t("comunidades.noGuarda"));
      return;
    }
    router.push(`/comunidades/${cuerpo.comunidad.id}`);
  }

  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <h1 className="hyto-title">{t("comunidades.crear")}</h1>
      <form className="mt-6 grid max-w-lg gap-4" onSubmit={(evento) => void enviar(evento)}>
        <label className="block text-sm" htmlFor="nombre-comunidad">
          {t("comunidades.nombre")}
          <input id="nombre-comunidad" className="hyto-input mt-2 w-full" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
        </label>
        <label className="block text-sm" htmlFor="descripcion-comunidad">
          {t("comunidades.descripcion")}
          <textarea id="descripcion-comunidad" className="hyto-input mt-2 w-full" rows={4} value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} />
        </label>
        <label className="block text-sm" htmlFor="foto-comunidad">
          {t("comunidades.foto")}
          <input id="foto-comunidad" className="hyto-input mt-2 w-full" value={fotoUrl} onChange={(evento) => setFotoUrl(evento.target.value)} placeholder="https://" />
        </label>
        <fieldset className="grid gap-2 text-sm">
          <legend>{t("comunidades.visibilidad")}</legend>
          <label>
            <input type="radio" name="visibilidad" checked={visibilidad === "publica"} onChange={() => setVisibilidad("publica")} /> {t("comunidades.publica")}
          </label>
          <p className="text-[var(--suave)]">{t("comunidades.publicaNota")}</p>
          <label>
            <input type="radio" name="visibilidad" checked={visibilidad === "privada"} onChange={() => setVisibilidad("privada")} /> {t("comunidades.privada")}
          </label>
          <p className="text-[var(--suave)]">{t("comunidades.privadaNota")}</p>
        </fieldset>
        {aviso ? <p className="text-sm">{aviso}</p> : null}
        <button type="submit" className={claseBoton("primario")} disabled={ocupado} aria-busy={ocupado}>
          {t("comunidades.guardar")}
        </button>
      </form>
    </main>
  );
}

export function PaginaComunidad({ id, mostrarTablon = false }: { id: string; mostrarTablon?: boolean }) {
  const t = useTexto();
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [eventos, setEventos] = useState<EventoPropio[]>([]);
  const [elegido, setElegido] = useState("");

  async function cargar() {
    const respuesta = await fetch(`/api/comunidades/${encodeURIComponent(id)}`, { cache: "no-store" });
    const cuerpo = (await respuesta.json().catch(() => null)) as (Detalle & { aviso?: string }) | null;
    if (!respuesta.ok || !cuerpo?.comunidad) {
      setAviso(cuerpo?.aviso ?? t("comunidades.noEncontrada"));
      setDetalle(null);
      return;
    }
    setDetalle(cuerpo);
    setAviso(null);
  }

  useEffect(() => {
    void cargar();
    void fetch("/api/proyectos", { cache: "no-store" })
      .then(async (respuesta) => {
        if (!respuesta.ok) return;
        const cuerpo = (await respuesta.json()) as { proyectos?: EventoPropio[] };
        setEventos((cuerpo.proyectos ?? []).filter((evento) => evento.rol === "organizer"));
      })
      .catch(() => undefined);
    // The id is the only input. cargar closes over it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function unirse() {
    const respuesta = await fetch(`/api/comunidades/${encodeURIComponent(id)}/unirse`, { method: "POST" });
    const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string; estado?: string } | null;
    if (!respuesta.ok) {
      setAviso(cuerpo?.aviso ?? t("comunidades.noGuarda"));
      return;
    }
    if (cuerpo?.estado === "pendiente") setAviso(t("comunidades.solicitudEnviada"));
    await cargar();
  }

  async function decidir(solicitudId: string, decision: "aprobada" | "rechazada") {
    const respuesta = await fetch(`/api/comunidades/${encodeURIComponent(id)}/solicitudes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ solicitudId, decision }),
    });
    if (!respuesta.ok) {
      const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
      setAviso(cuerpo?.aviso ?? t("comunidades.noGuarda"));
      return;
    }
    await cargar();
  }

  async function vincular(quitar: boolean) {
    if (!elegido) return;
    const respuesta = await fetch(`/api/comunidades/${encodeURIComponent(id)}/eventos`, {
      method: quitar ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proyectoId: elegido }),
    });
    const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
    if (!respuesta.ok) {
      setAviso(cuerpo?.aviso ?? t("comunidades.noGuarda"));
      return;
    }
    setElegido("");
    await cargar();
  }

  if (!detalle) {
    return (
      <main className="hyto-page mx-auto max-w-3xl">
        <p>{aviso ?? t("comunidades.cargando")}</p>
      </main>
    );
  }

  const admin = detalle.membresia?.rol === "admin";
  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <header className="hyto-page-head">
        <div>
          <h1 className="hyto-title">{detalle.comunidad.nombre}</h1>
          <p className="hyto-sub">{detalle.comunidad.visibilidad === "privada" ? t("comunidades.privada") : t("comunidades.publica")}</p>
        </div>
      </header>
      {detalle.comunidad.fotoUrl ? (
        // The URL was stored only after an https check.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={detalle.comunidad.fotoUrl} alt="" className="mt-4 max-h-48 rounded-2xl object-cover" />
      ) : null}
      <p className="mt-4">{detalle.comunidad.descripcion || t("comunidades.sinDescripcion")}</p>
      {admin && detalle.comunidad.codigo ? (
        <p className="mt-4 text-sm">
          {t("comunidades.codigo")}: <strong>{detalle.comunidad.codigo}</strong>
        </p>
      ) : null}
      {aviso ? <p className="mt-4 text-sm">{aviso}</p> : null}
      {!detalle.membresia ? (
        <button type="button" className={`${claseBoton("primario")} mt-6`} onClick={() => void unirse()}>
          {detalle.comunidad.visibilidad === "publica" ? t("comunidades.unirse") : t("comunidades.solicitar")}
        </button>
      ) : (
        <p className="mt-6 text-sm">{t("comunidades.yaMiembro")}</p>
      )}
      {mostrarTablon && detalle.membresia ? <Tablon comunidadId={id} /> : null}
      <h2 className="mt-8 text-lg font-medium">{t("comunidades.miembros")}</h2>
      <ul className="mt-3 grid gap-2">
        {detalle.miembros.map((miembro) => (
          <li key={miembro.usuarioId} className="hyto-card">
            {miembro.nombre || miembro.usuarioId} · {miembro.rol === "admin" ? t("comunidades.admin") : t("comunidades.miembro")}
          </li>
        ))}
      </ul>
      {admin ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium">{t("comunidades.solicitudes")}</h2>
          {detalle.solicitudes.length === 0 ? <p className="mt-3 text-sm text-[var(--suave)]">{t("comunidades.sinSolicitudes")}</p> : null}
          <ul className="mt-3 grid gap-2">
            {detalle.solicitudes.map((solicitud) => (
              <li key={solicitud.id} className="hyto-card flex flex-wrap items-center justify-between gap-3">
                <span>{solicitud.nombre || solicitud.usuarioId}</span>
                <span className="flex gap-2">
                  <button type="button" className={`${claseBoton("primario")} is-inline`} onClick={() => void decidir(solicitud.id, "aprobada")}>
                    {t("comunidades.aprobar")}
                  </button>
                  <button type="button" className={`${claseBoton("peligro")} is-inline`} onClick={() => void decidir(solicitud.id, "rechazada")}>
                    {t("comunidades.rechazar")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {detalle.membresia ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium">{t("comunidades.eventos")}</h2>
          {detalle.eventos.length === 0 ? <p className="mt-3 text-sm text-[var(--suave)]">{t("comunidades.sinEventos")}</p> : null}
          <ul className="mt-3 grid gap-2">
            {detalle.eventos.map((evento) => (
              <li key={evento.id}>
                <Link href={`/eventos/${evento.id}`} className="hyto-card block">
                  {evento.nombre}
                </Link>
              </li>
            ))}
          </ul>
          {eventos.length > 0 ? (
            <form
              className="mt-4 flex flex-wrap items-end gap-3"
              onSubmit={(evento) => {
                evento.preventDefault();
                void vincular(false);
              }}
            >
              <label className="block text-sm" htmlFor="vincular-evento">
                {t("comunidades.vincular")}
                <select id="vincular-evento" className="hyto-input mt-2" value={elegido} onChange={(evento) => setElegido(evento.target.value)}>
                  <option value="">{t("comunidades.elegirEvento")}</option>
                  {eventos.map((evento) => (
                    <option key={evento.id} value={evento.id}>
                      {evento.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={`${claseBoton("primario")} is-inline`} disabled={!elegido}>
                {t("comunidades.agregarEvento")}
              </button>
              <button type="button" className={`${claseBoton("peligro")} is-inline`} disabled={!elegido} onClick={() => void vincular(true)}>
                {t("comunidades.quitarEvento")}
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

type AvisoVista = {
  id: string;
  tipo: "disponible" | "asignada" | "completada";
  titulo: string;
  nombre: string | null;
  tareaId: string | null;
  libre: boolean;
};

function fraseAviso(
  t: (clave: "tablon.disponible" | "tablon.asignada" | "tablon.completada", vars?: Record<string, string | number>) => string,
  aviso: AvisoVista,
): string {
  if (aviso.tipo === "asignada") return t("tablon.asignada", { titulo: aviso.titulo, nombre: aviso.nombre ?? "" });
  if (aviso.tipo === "completada") return t("tablon.completada", { titulo: aviso.titulo });
  return t("tablon.disponible", { titulo: aviso.titulo });
}

function Tablon({ comunidadId }: { comunidadId: string }) {
  const t = useTexto();
  const [avisos, setAvisos] = useState<AvisoVista[] | null>(null);
  const [nota, setNota] = useState<string | null>(null);

  async function cargar() {
    const respuesta = await fetch(`/api/comunidades/${encodeURIComponent(comunidadId)}/tablon`, { cache: "no-store" });
    const cuerpo = (await respuesta.json().catch(() => null)) as { avisos?: AvisoVista[] } | null;
    if (!respuesta.ok) {
      setNota(t("tablon.noCarga"));
      setAvisos([]);
      return;
    }
    setAvisos(cuerpo?.avisos ?? []);
    setNota(null);
  }

  useEffect(() => {
    void cargar();
    // comunidadId is the only input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comunidadId]);

  async function tomar(tareaId: string) {
    const respuesta = await fetch(`/api/tareas/${encodeURIComponent(tareaId)}/tomar`, { method: "POST" });
    if (respuesta.status === 409) {
      setNota(t("tablon.tomada"));
      await cargar();
      return;
    }
    if (!respuesta.ok) {
      setNota(t("tablon.noToma"));
      return;
    }
    await cargar();
  }

  return (
    <section className="mt-8" aria-label={t("tablon.titulo")}>
      <h2 className="text-lg font-medium">{t("tablon.titulo")}</h2>
      <p className="mt-1 text-sm text-[var(--suave)]">{t("tablon.subtitulo")}</p>
      {nota ? <p className="mt-3 text-sm">{nota}</p> : null}
      {avisos && avisos.length === 0 ? <p className="mt-3 text-sm text-[var(--suave)]">{t("tablon.vacio")}</p> : null}
      <ul className="mt-3 grid gap-2">
        {(avisos ?? []).map((aviso) => (
          <li key={aviso.id} className="hyto-card flex flex-wrap items-center justify-between gap-3">
            <p>{fraseAviso(t, aviso)}</p>
            {aviso.libre && aviso.tareaId ? (
              <button type="button" className={`${claseBoton("primario")} is-inline`} onClick={() => void tomar(aviso.tareaId!)}>
                {t("tablon.tomar")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function UnirseCodigo() {
  const t = useTexto();
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const respuesta = await fetch("/api/comunidades/codigo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo }),
    });
    const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string; comunidadId?: string } | null;
    if (!respuesta.ok || !cuerpo?.comunidadId) {
      setAviso(cuerpo?.aviso ?? t("comunidades.codigoInvalido"));
      return;
    }
    router.push(`/comunidades/${cuerpo.comunidadId}`);
  }

  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <h1 className="hyto-title">{t("comunidades.entrarCodigo")}</h1>
      <form className="mt-6 grid max-w-sm gap-4" onSubmit={(evento) => void enviar(evento)}>
        <label className="block text-sm" htmlFor="codigo-comunidad">
          {t("comunidades.codigo")}
          <input id="codigo-comunidad" className="hyto-input mt-2 w-full" value={codigo} onChange={(evento) => setCodigo(evento.target.value)} autoComplete="off" />
        </label>
        {aviso ? <p className="text-sm">{aviso}</p> : null}
        <button type="submit" className={claseBoton("primario")}>
          {t("comunidades.unirse")}
        </button>
      </form>
    </main>
  );
}
