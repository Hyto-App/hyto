"use client";

import { useEffect, useRef, useState } from "react";
import { Mile } from "@/components/ui/Mile";
import { aplicarEstado, RESPALDO_ESTATICO, type EstadoAnimado, type ToqueRig } from "@/lib/ui/mile-animado";
import type { InstanciaRig } from "@/lib/ui/mile-rig";

export type { EstadoAnimado };

type Props = {
  estado?: EstadoAnimado;
  /** Makes Mile a button. Receives the name of the reaction. */
  onToque?: (reaccion: ToqueRig) => void;
  /** Square side in px. */
  tamano?: number;
  /** Fill the parent (the layout decides the size) instead of using `tamano`. The static fallback still lines up with the rig. */
  llena?: boolean;
  /** Mile reacts to taps (rig `interactive: true`) even if the app does nothing with them. */
  tocable?: boolean;
  halo?: boolean;
  className?: string;
};

/** Mile animated by code. The static SVG stays until the rig is ready, and for good if it fails. */
export function MileAnimada({ estado = "reposo", onToque, tamano = 120, llena, tocable, halo, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const rig = useRef<InstanciaRig | null>(null);
  const alToque = useRef(onToque);
  const estadoActual = useRef(estado);
  const [listo, setListo] = useState(false);
  alToque.current = onToque;
  estadoActual.current = estado;
  const interactivo = tocable === true || onToque !== undefined;

  useEffect(() => {
    let vivo = true;
    let instancia: InstanciaRig | null = null;
    import("@/lib/ui/mile-rig")
      .then((modulo) => {
        if (!vivo || !host.current) return;
        const MileRig = modulo.default;
        instancia = MileRig.create(host.current, {
          chest: "peek",
          idleSeconds: 6,
          interactive: interactivo,
          ...(interactivo ? { title: "Mile", onTap: (r) => alToque.current?.(r) } : {}),
        });
        rig.current = instancia;
        aplicarEstado(instancia, estadoActual.current);
        setListo(true);
      })
      .catch(() => {
        // Keep the static fallback.
      });
    return () => {
      vivo = false;
      instancia?.destroy();
      rig.current = null;
      setListo(false);
    };
  }, [interactivo]);

  useEffect(() => {
    if (rig.current) aplicarEstado(rig.current, estado);
  }, [estado]);

  const nivel = Math.max(24, tamano);
  const lado = llena ? "100%" : nivel;
  return (
    <span
      className={["hyto-mile-animada", llena ? "is-llena" : "", className].filter(Boolean).join(" ")}
      style={{ position: "relative", display: "inline-block", flex: "none", width: lado, height: lado, lineHeight: 0 }}
    >
      {!listo ? <Mile estado={RESPALDO_ESTATICO[estado]} tamano={nivel} halo={halo} /> : null}
      <div ref={host} data-mile-rig style={{ width: lado, height: lado, display: listo ? "block" : "none" }} />
    </span>
  );
}
