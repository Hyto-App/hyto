import type { EstadoTarea, Evidencia } from "./tipos";

const CLAVE = "hyto-integrante";

type Memoria = {
  miembroId: string;
  estados: Record<string, EstadoTarea>;
  evidencias: Record<string, Evidencia>;
  cuentas: Record<string, { direccion: string; usdcListo: boolean }>;
};

const VACIA: Memoria = {
  miembroId: "voluntario-1",
  estados: {},
  evidencias: {},
  cuentas: {},
};

function puedeGuardar(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function leerMemoria(): Memoria {
  if (!puedeGuardar()) return { ...VACIA, estados: {}, evidencias: {}, cuentas: {} };
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return { ...VACIA, estados: {}, evidencias: {}, cuentas: {} };
    const json = JSON.parse(crudo) as Partial<Memoria>;
    return {
      miembroId: typeof json.miembroId === "string" ? json.miembroId : VACIA.miembroId,
      estados: json.estados ?? {},
      evidencias: json.evidencias ?? {},
      cuentas: json.cuentas ?? {},
    };
  } catch {
    return { ...VACIA, estados: {}, evidencias: {}, cuentas: {} };
  }
}

export const AVISO_GUARDADO = "No se pudo guardar en este navegador.";

function escribir(memoria: Memoria): string | null {
  if (!puedeGuardar()) return AVISO_GUARDADO;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(memoria));
    return null;
  } catch {
    return AVISO_GUARDADO;
  }
}

export function guardarMiembro(miembroId: string): string | null {
  const memoria = leerMemoria();
  memoria.miembroId = miembroId;
  return escribir(memoria);
}

export function guardarEstado(tareaId: string, estado: EstadoTarea): string | null {
  const memoria = leerMemoria();
  memoria.estados[tareaId] = estado;
  return escribir(memoria);
}

export function guardarEvidencia(evidencia: Evidencia): string | null {
  const memoria = leerMemoria();
  memoria.evidencias[evidencia.tareaId] = evidencia;
  return escribir(memoria);
}

export function olvidarEvidencia(tareaId: string): string | null {
  const memoria = leerMemoria();
  delete memoria.evidencias[tareaId];
  return escribir(memoria);
}

export function guardarCuenta(id: string, cuenta: { direccion: string; usdcListo: boolean }): string | null {
  const memoria = leerMemoria();
  memoria.cuentas[id] = cuenta;
  return escribir(memoria);
}
