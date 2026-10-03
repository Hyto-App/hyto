import type { EstadoTarea } from "@/lib/integrante/tipos";
import type { Veredicto } from "@/lib/admin/tipos";
import { MOTIVO_COPIA } from "@/lib/evidencia/copia";
import { type Clave, texto } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";

const ESTADOS: Record<EstadoTarea, Clave> = {
  pendiente: "estados.pendiente",
  "en revisión": "estados.revision",
  pagado: "estados.pagado",
};

const VEREDICTOS: Record<Veredicto, Clave> = {
  cumplió: "veredictos.cumplio",
  parcial: "veredictos.parcial",
  insuficiente: "veredictos.insuficiente",
};

const TIPOS: Record<string, Clave> = {
  trabajo: "tipos.trabajo",
  reembolso: "tipos.reembolso",
};

const CHOICES: Record<string, Clave> = {
  stand: "choices.stand",
  factura: "choices.factura",
  trabajo: "choices.trabajo",
  otra: "choices.otra",
};

const DIFICULTADES: Record<string, Clave> = {
  easy: "clasificacion.easy",
  medium: "clasificacion.medium",
  hard: "clasificacion.hard",
};

const LEGADO: Record<string, string> = {
  "Montar el stand": "Set up the booth",
  "Banner visible y mesa armada": "Banner visible and the table set up",
  "Registro de asistentes": "Check-in list",
  "Lista de quienes llegaron al evento": "List of people who arrived",
  "Mesa de bienvenida": "Welcome table",
  "Mesa armada en la entrada": "Table set up at the entrance",
  "Comida del equipo": "Team meal",
  "Foto del comprobante de la comida": "Photo of the meal receipt",
  "Voluntario 1": "Volunteer 1",
  "Voluntario 2": "Volunteer 2",
  "Voluntario 3": "Volunteer 3",
  Organizador: "Organizer",
  "Organizador (demo)": "Organizer (demo)",
  "Voluntario (demo)": "Volunteer (demo)",
  "Sin asignar": "Unassigned",
  "Mesa armada, banner de ZEEK de frente y el salón visible.":
    "Table set up, ZEEK banner facing forward, and the room is visible.",
  "Lista a medias: se ven algunas firmas y el fondo del salón no entra en la foto.":
    "The list is incomplete: a few signatures show, and the back of the room is out of frame.",
  "Comprobante de la comida del equipo, con monto y fecha visibles.":
    "Team meal receipt, with the amount and date visible.",
  "Mesa armada, banner de ZEEK de frente, tres cajas abiertas. No se ve el fondo del salón.":
    "Table set up, ZEEK banner facing forward, three open boxes. The back of the room is not visible.",
};

const INVERSO_LEGADO: Record<string, string> = Object.fromEntries(
  Object.entries(LEGADO).map(([origen, ingles]) => [ingles, origen]),
);

export function etiquetaEstado(estado: string, idioma: Idioma = "en"): string {
  if (estado in ESTADOS) return texto(idioma, ESTADOS[estado as EstadoTarea]);
  return estado;
}

export function etiquetaVeredicto(veredicto: string, idioma: Idioma = "en"): string {
  const limpio = veredicto.trim();
  if (limpio in VEREDICTOS) return texto(idioma, VEREDICTOS[limpio as Veredicto]);
  return limpio;
}

/** One string for the pill: "64% · Partially completed", or the label alone when there is no percentage. */
export function textoNota(etiqueta: string, nota: number | null | undefined): string {
  if (typeof nota !== "number") return etiqueta;
  return `${nota}% · ${etiqueta}`;
}

export function etiquetaTipo(tipo: string, idioma: Idioma = "en"): string {
  const clave = TIPOS[tipo];
  return clave ? texto(idioma, clave) : tipo;
}

/** Only high priority gets a label. Normal stays quiet. */
export function etiquetaPrioridad(prioridad: string | null | undefined, idioma: Idioma = "en"): string | null {
  return prioridad === "high" ? texto(idioma, "clasificacion.highPriority") : null;
}

export function etiquetaDificultad(dificultad: string | null | undefined, idioma: Idioma = "en"): string | null {
  const clave = dificultad ? DIFICULTADES[dificultad] : undefined;
  return clave ? texto(idioma, clave) : null;
}

export function etiquetaChoice(choice: string, idioma: Idioma = "en"): string {
  const limpio = choice.trim();
  const clave = CHOICES[limpio];
  return clave ? texto(idioma, clave) : limpio;
}

export function textoVisible(valor: string | null | undefined, idioma: Idioma = "en"): string {
  if (!valor) return "";
  // The seed marks sample rows with "Example. " (or the old "Ejemplo. "). The screen drops it.
  const base = valor.replace(/^(?:Ejemplo|Example)\. /, "");
  const directo = idioma === "es" ? (INVERSO_LEGADO[base] ?? base) : (LEGADO[base] ?? base);
  const frase = directo.replace(/ Categoría ([^,]+), condición (cumplida|no cumplida), evidencia ([^.]+)\./g, (_todo, choice: string, condicion: string, evidencia: string) => {
    const met = condicion === "cumplida";
    return texto(idioma, "legado.category", {
      choice: etiquetaChoice(choice.trim(), idioma),
      condicion: texto(idioma, met ? "legado.met" : "legado.notMet"),
      evidencia: etiquetaVeredicto(evidencia.trim(), idioma),
    });
  });
  if (idioma !== "es" || !frase.includes(MOTIVO_COPIA)) return frase;
  return frase.replaceAll(MOTIVO_COPIA, texto("es", "revision.copia"));
}
