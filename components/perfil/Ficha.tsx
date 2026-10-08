"use client";

import { useTexto } from "@/components/ui/Idioma";
import { ETIQUETAS, type EtiquetaVoluntario } from "@/lib/perfil/reglas";
import type { Clave } from "@/lib/ui/diccionario";

const CLAVE: Record<EtiquetaVoluntario, Clave> = {
  responsable: "perfil.responsable",
  amable: "perfil.amable",
  puntual: "perfil.puntual",
  creativo: "perfil.creativo",
  equipo: "perfil.equipo",
  comunicativo: "perfil.comunicativo",
  organizado: "perfil.organizado",
  proactivo: "perfil.proactivo",
};

export function FichaVoluntario({ ficha }: { ficha: { experiencia: string | null; etiquetas: readonly string[] } }) {
  const t = useTexto();
  const etiquetas = ficha.etiquetas.filter((etiqueta): etiqueta is EtiquetaVoluntario => etiqueta in CLAVE);
  if (!ficha.experiencia && etiquetas.length === 0) return null;
  return (
    <div className="mt-3 text-sm">
      {ficha.experiencia ? <p>{ficha.experiencia}</p> : null}
      {etiquetas.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {etiquetas.map((etiqueta) => (
            <li key={etiqueta} className="rounded-full border border-[var(--linea)] px-3 py-1">
              {t(CLAVE[etiqueta])}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function etiquetasVisibles(): readonly EtiquetaVoluntario[] {
  return ETIQUETAS;
}

export function claveEtiqueta(etiqueta: EtiquetaVoluntario): Clave {
  return CLAVE[etiqueta];
}
