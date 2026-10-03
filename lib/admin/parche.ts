import type { TareaAdmin, VistaAdmin } from "@/lib/admin/tipos";
import { bandejaDe, porPersona, resumir } from "@/lib/admin/vista";

export function conTarea(vista: VistaAdmin, tarea: TareaAdmin): VistaAdmin {
  const tareas = vista.tareas.map((item) => (item.id === tarea.id ? tarea : item));
  return {
    ...vista,
    tareas,
    bandeja: bandejaDe(tareas),
    resumen: resumir(tareas),
    personas: porPersona(tareas),
  };
}
