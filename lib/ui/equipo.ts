/**
 * Public landing team. Names and roles only. Photos live in /public/equipo as WebP.
 * Roles follow ROLES.md focus lines, in plain language for the landing.
 */

export type PersonaEquipo = {
  id: string;
  nombre: string;
  rolEn: string;
  rolEs: string;
  foto: string;
  altEn: string;
  altEs: string;
};

export const EQUIPO: readonly PersonaEquipo[] = [
  {
    id: "josue",
    nombre: "Josué",
    rolEn: "Product and app shell",
    rolEs: "Producto y estructura de la app",
    foto: "/equipo/josue.webp",
    altEn: "Initials for Josué, product and app shell",
    altEs: "Iniciales de Josué, producto y estructura de la app",
  },
  {
    id: "sebas",
    nombre: "Sebas",
    rolEn: "Payments and sign-in",
    rolEs: "Pagos e ingreso",
    foto: "/equipo/sebas.webp",
    altEn: "Initials for Sebas, payments and sign-in",
    altEs: "Iniciales de Sebas, pagos e ingreso",
  },
  {
    id: "esteban",
    nombre: "Esteban",
    rolEn: "Backend and review pipeline",
    rolEs: "Backend y revisión de fotos",
    foto: "/equipo/esteban.webp",
    altEn: "Initials for Esteban, backend and review pipeline",
    altEs: "Iniciales de Esteban, backend y revisión de fotos",
  },
  {
    id: "abdiel",
    nombre: "Abdiel",
    rolEn: "Design and Mile scoring",
    rolEs: "Diseño y puntuación de Mile",
    foto: "/equipo/abdiel.webp",
    altEn: "Initials for Abdiel, design and Mile scoring",
    altEs: "Iniciales de Abdiel, diseño y puntuación de Mile",
  },
  {
    id: "raul",
    nombre: "Raúl",
    rolEn: "Member tasks and accounts",
    rolEs: "Tareas de miembros y cuentas",
    foto: "/equipo/raul.webp",
    altEn: "Initials for Raúl, member tasks and accounts",
    altEs: "Iniciales de Raúl, tareas de miembros y cuentas",
  },
] as const;
