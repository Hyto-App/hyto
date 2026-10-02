import type { EstadoTarea } from "@/lib/integrante/tipos";
import type { Veredicto } from "@/lib/admin/tipos";

const ESTADOS: Record<EstadoTarea, string> = {
  pendiente: "Pending",
  "en revisión": "In review",
  pagado: "Paid",
};

const VEREDICTOS: Record<Veredicto, string> = {
  cumplió: "Met",
  parcial: "Partial",
  insuficiente: "Insufficient",
};

const TIPOS: Record<string, string> = {
  trabajo: "Work",
  reembolso: "Reimbursement",
};

const CHOICES: Record<string, string> = {
  stand: "booth",
  factura: "receipt",
  trabajo: "work",
  otra: "other",
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

export function etiquetaEstado(estado: string): string {
  if (estado in ESTADOS) return ESTADOS[estado as EstadoTarea];
  return estado;
}

export function etiquetaVeredicto(veredicto: string): string {
  const limpio = veredicto.trim();
  if (limpio in VEREDICTOS) return VEREDICTOS[limpio as Veredicto];
  if (limpio === "cumplio" || limpio === "completa" || limpio === "completo") return "Met";
  if (limpio === "partial") return "Partial";
  if (limpio === "insufficient") return "Insufficient";
  return limpio;
}

export function etiquetaTipo(tipo: string): string {
  return TIPOS[tipo] ?? tipo;
}

export function etiquetaChoice(choice: string): string {
  const limpio = choice.trim();
  return CHOICES[limpio] ?? limpio;
}

export function textoVisible(valor: string | null | undefined): string {
  if (!valor) return "";
  const prefijo = /^(?:Ejemplo|Example)\. /.exec(valor);
  const base = prefijo ? valor.slice(prefijo[0].length) : valor;
  const directo = LEGADO[base] ?? base;
  const visible = prefijo ? `Example. ${directo}` : directo;
  return visible.replace(
    / Categoría ([^,]+), condición (cumplida|no cumplida), evidencia ([^.]+)\./g,
    (_todo, choice: string, condicion: string, evidencia: string) => {
      const met = condicion === "cumplida" ? "met" : "not met";
      return ` Category ${etiquetaChoice(choice.trim())}, condition ${met}, evidence ${etiquetaVeredicto(evidencia.trim())}.`;
    },
  );
}
