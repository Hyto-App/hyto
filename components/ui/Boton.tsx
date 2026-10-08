import type { ButtonHTMLAttributes, ReactNode } from "react";

export type VarianteBoton = "primario" | "secundario" | "fantasma" | "peligro";

/** One button system. Primary is the single main action in a group. */
export function claseBoton(variante: VarianteBoton = "primario", grande = false): string {
  const base = {
    primario: "hyto-btn",
    secundario: "hyto-btn-line",
    fantasma: "hyto-btn-ghost",
    peligro: "hyto-btn-danger",
  }[variante];
  return grande ? `${base} hyto-btn-grande` : base;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  grande?: boolean;
  cargando?: boolean;
  children?: ReactNode;
};

export function Boton({ variante = "primario", grande = false, cargando = false, className = "", disabled, children, ...props }: Props) {
  return (
    <button
      {...props}
      className={[claseBoton(variante, grande), className].filter(Boolean).join(" ")}
      disabled={disabled || cargando}
      aria-busy={cargando || props["aria-busy"] ? true : undefined}
    >
      {children}
    </button>
  );
}
