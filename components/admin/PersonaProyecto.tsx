"use client";

import { iniciales } from "@/components/ui/Marca";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { nombrePersona } from "@/lib/admin/proyecto-vista";
import { nombreEnIdioma } from "@/lib/sesion/nombre";
import { textoVisible } from "@/lib/ui/etiquetas";

/** The visible name for a person: their name, or «Voluntario» / «Sin asignar». Never an email or an id. */
export function useNombrePersona() {
  const t = useTexto();
  const idioma = useIdioma();
  return (valor: string | null | undefined, asignada = true): string => {
    if (!asignada) return t("comunes.unassigned");
    const limpio = textoVisible(valor ?? "", idioma);
    if (/^(unassigned|sin asignar)$/i.test(limpio.trim())) return t("comunes.unassigned");
    const nombre = nombrePersona(limpio);
    return nombre ? nombreEnIdioma(nombre, idioma) : t("eventos.volunteer");
  };
}

/** Initials and name, as in the mockup. */
export function PersonaProyecto({
  nombre,
  asignada = true,
  tam = "sm",
  pill = false,
}: {
  nombre: string | null | undefined;
  asignada?: boolean;
  tam?: "sm" | "md";
  pill?: boolean;
}) {
  const visible = useNombrePersona()(nombre, asignada);
  return (
    <span className={`pj-persona${pill ? " is-pill" : ""}`}>
      <span className={`pj-av${tam === "sm" ? " is-sm" : ""}${asignada ? "" : " is-vacio"}`} aria-hidden="true">
        {asignada ? iniciales(visible) : "–"}
      </span>
      <span>{visible}</span>
    </span>
  );
}
