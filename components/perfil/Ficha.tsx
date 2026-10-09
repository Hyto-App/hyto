"use client";

import { Identidad } from "@/components/ui/Identidad";
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

export function FichaVoluntario({
  ficha,
  nombre,
  rol,
}: {
  ficha: { experiencia: string | null; etiquetas: readonly string[] };
  nombre?: string | null;
  rol?: string | null;
}) {
  const t = useTexto();
  const etiquetas = ficha.etiquetas.filter((etiqueta): etiqueta is EtiquetaVoluntario => etiqueta in CLAVE);
  if (!ficha.experiencia && etiquetas.length === 0) return null;
  return (
    <div className="mt-3">
      <Identidad
        nombre={nombre?.trim() ?? ""}
        rol={rol}
        detalle={ficha.experiencia}
        etiquetas={etiquetas.map((etiqueta) => t(CLAVE[etiqueta]))}
      />
    </div>
  );
}

export function etiquetasVisibles(): readonly EtiquetaVoluntario[] {
  return ETIQUETAS;
}

export function claveEtiqueta(etiqueta: EtiquetaVoluntario): Clave {
  return CLAVE[etiqueta];
}
