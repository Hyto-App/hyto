"use client";

import { useEffect, useRef, useState } from "react";
import {
  INTERVALO_SONDEO_MS,
  esperaSondeo,
  leerNovedades,
  planearCambios,
  type ResultadoSondeo,
  type TareaSondeo,
} from "@/lib/admin/novedades";

const AVISO_MS = 8000;

export function useNovedadesEvento(opciones: {
  proyectoId?: string;
  tareas: readonly TareaSondeo[];
  exigirFoto: boolean;
  fotoDe?: (tareaId: string) => string | null;
  alCambiar: (ids: string[]) => Promise<ResultadoSondeo>;
  intervaloMs?: number;
  oculto?: () => boolean;
}): { reciente: boolean; sesionVencida: boolean } {
  const tareasRef = useRef(opciones.tareas);
  tareasRef.current = opciones.tareas;
  const fotoDeRef = useRef(opciones.fotoDe);
  fotoDeRef.current = opciones.fotoDe;
  const alCambiarRef = useRef(opciones.alCambiar);
  alCambiarRef.current = opciones.alCambiar;
  const ocultoRef = useRef(opciones.oculto ?? ocultoPorDefecto);
  ocultoRef.current = opciones.oculto ?? ocultoPorDefecto;
  const exigirFotoRef = useRef(opciones.exigirFoto);
  exigirFotoRef.current = opciones.exigirFoto;
  const [reciente, setReciente] = useState(false);
  const [sesionVencida, setSesionVencida] = useState(false);
  const vencidaRef = useRef(false);

  useEffect(() => {
    const pedido = opciones.proyectoId;
    if (!pedido || typeof document === "undefined") return;
    const proyectoId: string = pedido;
    let viva = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let avisoTimer: ReturnType<typeof setTimeout> | undefined;
    let avisoId = 0;
    let fallos = 0;
    let ocupado = false;
    let cursor: string | null = null;
    let sellos = new Map<string, string>();
    const intervalo = intervaloDe(opciones.intervaloMs);
    const control = new AbortController();
    setReciente(false);
    vencidaRef.current = false;
    setSesionVencida(false);

    const programar = (ms: number) => {
      globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(() => void tick(), ms);
    };

    const marcar = () => {
      avisoId += 1;
      const marca = avisoId;
      setReciente(true);
      globalThis.clearTimeout(avisoTimer);
      avisoTimer = globalThis.setTimeout(() => {
        if (viva && avisoId === marca) setReciente(false);
      }, AVISO_MS);
    };

    const alVista = () => {
      if (!viva) return;
      if (ocultoRef.current()) {
        globalThis.clearTimeout(timer);
        return;
      }
      programar(0);
    };

    async function tick() {
      if (!viva || ocultoRef.current() || ocupado) return;
      ocupado = true;
      let falloRed = false;
      let abortado = false;
      let sesionCerrada = false;
      try {
        const leido = await leerNovedades(fetch, proyectoId, cursor, control.signal);
        if (!viva) return;
        if (leido.tipo === "fallo") {
          if (leido.estado === 401) {
            sesionCerrada = true;
            if (!vencidaRef.current) {
              vencidaRef.current = true;
              setSesionVencida(true);
            }
          } else {
            falloRed = true;
          }
        } else if (leido.tipo === "igual") {
          if (vencidaRef.current) {
            vencidaRef.current = false;
            setSesionVencida(false);
          }
          fallos = 0;
          if (leido.cursor) cursor = leido.cursor;
        } else {
          const plan = planearCambios(sellos, leido.cambios, tareasRef.current, {
            exigirFoto: exigirFotoRef.current,
            fotoDe: (id) => fotoDeRef.current?.(id) ?? null,
          });
          if (vencidaRef.current) {
            vencidaRef.current = false;
            setSesionVencida(false);
          }
          if (plan.ids.length === 0) {
            sellos = plan.siguientes;
            cursor = leido.cursor || cursor;
            fallos = 0;
          } else {
            const aplicado = await alCambiarRef.current(plan.ids);
            if (!viva) return;
            if (aplicado.ok) {
              sellos = plan.siguientes;
              cursor = leido.cursor || cursor;
              fallos = 0;
              if (aplicado.avisar) marcar();
            }
          }
        }
      } catch (error) {
        if (!viva || esAbort(error)) abortado = true;
        else falloRed = true;
      } finally {
        ocupado = false;
      }
      if (!viva || abortado || ocultoRef.current() || sesionCerrada) return;
      if (falloRed) fallos += 1;
      const espera = esperaSondeo(fallos, false, intervalo);
      if (espera !== null) programar(espera);
    }

    document.addEventListener("visibilitychange", alVista);
    window.addEventListener("focus", alVista);
    if (!ocultoRef.current()) programar(intervalo);

    return () => {
      viva = false;
      control.abort();
      globalThis.clearTimeout(timer);
      globalThis.clearTimeout(avisoTimer);
      document.removeEventListener("visibilitychange", alVista);
      window.removeEventListener("focus", alVista);
    };
  }, [opciones.intervaloMs, opciones.proyectoId]);

  return { reciente, sesionVencida };
}

function ocultoPorDefecto(): boolean {
  return document.hidden;
}

function intervaloDe(explicito?: number): number {
  if (explicito && explicito >= 15 && explicito <= 60_000) return explicito;
  const marca = (globalThis as { __HYTO_SONDEO_MS?: unknown }).__HYTO_SONDEO_MS;
  if (typeof marca === "number" && marca >= 15 && marca <= 60_000) return marca;
  return INTERVALO_SONDEO_MS;
}

function esAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
