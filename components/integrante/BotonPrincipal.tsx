import type { ButtonHTMLAttributes } from "react";

export const claseBoton = "hyto-btn";

export function BotonPrincipal({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${claseBoton} ${className}`} />;
}
