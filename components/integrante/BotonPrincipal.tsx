import type { ButtonHTMLAttributes } from "react";

export const claseBoton =
  "flex h-14 w-full items-center justify-center rounded-full bg-[var(--acento)] px-6 text-base font-semibold text-[var(--sobre-acento)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tinta)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100";

export function BotonPrincipal({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${claseBoton} ${className}`} />;
}
