import type { IdentidadDemo } from "./tipos";

export const APP_SALT = "hyto";

export const USDC = {
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
} as const;

export const IDENTIDADES: IdentidadDemo[] = [
  { id: "organizador", nombre: "Organizador", email: "organizador@demo.hyto" },
  { id: "voluntario-1", nombre: "Voluntario 1", email: "voluntario1@demo.hyto" },
  { id: "voluntario-2", nombre: "Voluntario 2", email: "voluntario2@demo.hyto" },
  { id: "voluntario-3", nombre: "Voluntario 3", email: "voluntario3@demo.hyto" },
];

export const MIEMBROS = IDENTIDADES.filter((identidad) => identidad.id !== "organizador");

export function appIdPublico(): string | null {
  const valor = process.env.NEXT_PUBLIC_CAVOS_APP_ID?.trim();
  return valor ? valor : null;
}
