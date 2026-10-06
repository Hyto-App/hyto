import Link from "next/link";
import type { ReactNode } from "react";
import { MileAnimada } from "@/components/ui/MileAnimada";

type Accion = { texto: string; href?: string; onClick?: () => void };

/** Mile `icono` 56px + title + text + one button. Reused by Events and the organizer screens. */
export function EstadoVacio({ titulo, texto, accion, children }: { titulo: string; texto?: string; accion?: Accion; children?: ReactNode }) {
  return (
    <div className="hyto-tarjeta hyto-estado-vacio">
      <MileAnimada estado="vacio" tamano={56} />
      <h2>{titulo}</h2>
      {texto ? <p>{texto}</p> : null}
      {accion ? (
        <div className="hyto-estado-vacio-acciones">
          {accion.href ? (
            <Link href={accion.href} className="hyto-btn-line">
              {accion.texto}
            </Link>
          ) : (
            <button type="button" className="hyto-btn-line" onClick={accion.onClick}>
              {accion.texto}
            </button>
          )}
        </div>
      ) : null}
      {children}
    </div>
  );
}
