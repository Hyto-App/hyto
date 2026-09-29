import type { IdentidadDemo } from "./tipos";

export const APP_SALT = "hyto";

export const USDC = {
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
} as const;

export const IDENTIDADES: IdentidadDemo[] = [
  { id: "organizador", nombre: "Organizer", email: "organizador@demo.hyto" },
  { id: "voluntario-1", nombre: "Volunteer 1", email: "voluntario1@demo.hyto" },
  { id: "voluntario-2", nombre: "Volunteer 2", email: "voluntario2@demo.hyto" },
  { id: "voluntario-3", nombre: "Volunteer 3", email: "voluntario3@demo.hyto" },
];

export const MIEMBROS = IDENTIDADES.filter((identidad) => identidad.id !== "organizador");

export { appIdPublico } from "@/lib/config/publico";
