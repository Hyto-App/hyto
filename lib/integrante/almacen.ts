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

function escribir(memoria: Memoria) {
  if (!puedeGuardar()) return;
  window.localStorage.setItem(CLAVE, JSON.stringify(memoria));
}

export function guardarMiembro(miembroId: string) {
  const memoria = leerMemoria();
  memoria.miembroId = miembroId;
  escribir(memoria);
}

export function guardarEstado(tareaId: string, estado: EstadoTarea) {
  const memoria = leerMemoria();
  memoria.estados[tareaId] = estado;
  escribir(memoria);
}

export function guardarEvidencia(evidencia: Evidencia) {
  const memoria = leerMemoria();
  memoria.evidencias[evidencia.tareaId] = evidencia;
  escribir(memoria);
}

export function guardarCuenta(id: string, cuenta: { direccion: string; usdcListo: boolean }) {
  const memoria = leerMemoria();
  memoria.cuentas[id] = cuenta;
  escribir(memoria);
}
