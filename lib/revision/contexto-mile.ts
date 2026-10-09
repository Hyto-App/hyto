/**
 * The guided "For Mile" answers. They are stored as a versioned JSON string in `proyectos.contexto_ia`
 * (no migration). Plain text in that column is the older free-text box and keeps meaning "rules".
 *
 * Background fields help Mile understand the event and never become a rule. Rule fields are what the
 * evidence must meet.
 */

export const CAMPOS_MILE = ["lugar", "trata", "cuando", "senales", "debeVerse", "noCuenta", "recibos", "notas"] as const;

export type ClaveMile = (typeof CAMPOS_MILE)[number];
export type CamposMile = Partial<Record<ClaveMile, string>>;

export const LIMITES_MILE: Record<ClaveMile, number> = {
  lugar: 200,
  trata: 300,
  cuando: 120,
  senales: 300,
  debeVerse: 250,
  noCuenta: 250,
  recibos: 250,
  notas: 600,
};

/** English names used in warnings and in the prompt. */
export const ETIQUETAS_MILE: Record<ClaveMile, string> = {
  lugar: "Where is it?",
  trata: "What is it about?",
  cuando: "When is it?",
  senales: "How can the place or event be recognized?",
  debeVerse: "What must a good photo show?",
  noCuenta: "What doesn't count as evidence?",
  recibos: "For reimbursements: which receipts are valid?",
  notas: "Other notes for Mile",
};

/** Room for every field at its limit plus the JSON escapes. */
export const MAX_CONTEXTO_GUARDADO = 3000;

export type LecturaMile = { estructurado: true; campos: CamposMile } | { estructurado: false; texto: string };

/** The JSON string to store, or null when every field is empty. */
export function serializarContextoMile(campos: CamposMile): string | null {
  const limpio: Record<string, unknown> = { v: 1 };
  let hay = false;
  for (const clave of CAMPOS_MILE) {
    const valor = campos[clave]?.trim();
    if (!valor) continue;
    limpio[clave] = valor;
    hay = true;
  }
  return hay ? JSON.stringify(limpio) : null;
}

/** Valid JSON with `v: 1` gives its fields. Anything else is legacy plain text. */
export function leerContextoMile(texto: string | null | undefined): LecturaMile {
  const crudo = texto ?? "";
  if (crudo.trimStart().startsWith("{")) {
    try {
      const dato: unknown = JSON.parse(crudo);
      if (dato && typeof dato === "object" && !Array.isArray(dato) && (dato as { v?: unknown }).v === 1) {
        const campos: CamposMile = {};
        for (const clave of CAMPOS_MILE) {
          const valor = (dato as Record<string, unknown>)[clave];
          if (typeof valor === "string" && valor.trim()) campos[clave] = valor.trim();
        }
        return { estructurado: true, campos };
      }
    } catch {
      // Not JSON: it is plain text.
    }
  }
  return { estructurado: false, texto: crudo };
}
