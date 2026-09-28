import type { ButtonHTMLAttributes } from "react";

export const claseBoton =
  "flex h-14 w-full items-center justify-center rounded-full bg-[var(--acento)] px-6 text-base font-semibold text-white transition disabled:opacity-50";

export function BotonPrincipal({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${claseBoton} ${className}`} />;
}
