export type AmbitoVariable = "publico" | "servidor";

export type DefinicionVariable = {
  nombre: string;
  ambito: AmbitoVariable;
  requerida: boolean;
  para: string;
  // No se lista como ausente. Es un interruptor, no un dato que haya que cargar siempre.
  silenciosa?: boolean;
};

export const HOST_BASE_PRODUCCION = "HYTO_HOST_BASE_PRODUCCION";
export const CONFIRMAR_BASE_PRODUCCION = "HYTO_CONFIRMAR_BASE_PRODUCCION";
export const CONFIRMACION_BASE_PRODUCCION = "si";

const DATABASE_URL: DefinicionVariable = {
  nombre: "DATABASE_URL",
  ambito: "servidor",
  requerida: true,
  para: "Conexión a Neon Postgres. Sin ella no hay base: las rutas responden que no está configurada y no corren la migración ni la semilla.",
};

export const VARIABLES_PUBLICAS: DefinicionVariable[] = [
  {
    nombre: "NEXT_PUBLIC_CAVOS_APP_ID",
    ambito: "publico",
    requerida: false,
    para: "Identificador de la app de Cavos en el navegador. Sin él, las pantallas del integrante siguen con los ejemplos.",
  },
];

export const VARIABLES_SERVIDOR: DefinicionVariable[] = [
  DATABASE_URL,
  {
    nombre: "BLOB_READ_WRITE_TOKEN",
    ambito: "servidor",
    requerida: false,
    para: "Token de Vercel Blob privado. Sin él no se guardan ni se leen las fotos.",
  },
  {
    nombre: "GROQ_API_KEY",
    ambito: "servidor",
    requerida: false,
    para: "Clave de Groq para describir la foto. Sin ella, la revisión usa el guion fijo.",
  },
  {
    nombre: "LAYA_URL",
    ambito: "servidor",
    requerida: false,
    para: "URL pública de Laya. Sin ella, la revisión usa el stub.",
  },
  {
    nombre: "LAYA_API_KEY",
    ambito: "servidor",
    requerida: false,
    para: "Clave opcional que la revisión manda a Laya solo si existe.",
  },
  {
    nombre: "TRUSTLESS_API_KEY",
    ambito: "servidor",
    requerida: false,
    para: "Clave de Trustless Work. Sin ella no hay pago: la firma responde 503 y el script del hito no corre.",
  },
  {
    nombre: HOST_BASE_PRODUCCION,
    ambito: "servidor",
    requerida: false,
    para: "Hostname de la base de producción, o varios separados por coma. La migración y la semilla locales lo comparan con el host de DATABASE_URL. Sin él no se puede saber si esa URL es de producción.",
  },
  {
    nombre: CONFIRMAR_BASE_PRODUCCION,
    ambito: "servidor",
    requerida: false,
    silenciosa: true,
    para: `Confirmación explícita para migrar o sembrar cuando DATABASE_URL apunta a un host de ${HOST_BASE_PRODUCCION}. El único valor que habilita es ${CONFIRMACION_BASE_PRODUCCION}.`,
  },
];

export const VARIABLES: DefinicionVariable[] = [...VARIABLES_PUBLICAS, ...VARIABLES_SERVIDOR];

export type ResultadoEntorno = {
  errores: DefinicionVariable[];
  avisosPublicos: DefinicionVariable[];
  avisosServidor: DefinicionVariable[];
  definidas: string[];
};

export type ParseoEnv = {
  valores: Record<string, string>;
  lineasOmitidas: number;
};

export type PreparacionBase =
  | { ok: true; url: string; aviso: string | null }
  | { ok: false; mensaje: string };

type Entorno = { [clave: string]: string | undefined };

function presente(valor: string | undefined): string | null {
  const limpio = valor?.trim();
  return limpio ? limpio : null;
}

export function urlDeBase(): string | null {
  return presente(process.env.DATABASE_URL);
}

export function tokenDeBlob(): string | null {
  return presente(process.env.BLOB_READ_WRITE_TOKEN);
}

export function claveDeGroq(): string | null {
  return presente(process.env.GROQ_API_KEY);
}

export function urlDeLaya(): string | null {
  return presente(process.env.LAYA_URL);
}

export function claveDeLaya(): string | null {
  return presente(process.env.LAYA_API_KEY);
}

export function claveDeTrustless(): string | null {
  return presente(process.env.TRUSTLESS_API_KEY);
}

export function enProduccion(): boolean {
  return process.env.NODE_ENV === "production";
}

// No lanza: si falta una opcional, el build y el arranque siguen.
export function validarEntorno(fuente: Entorno): ResultadoEntorno {
  const errores: DefinicionVariable[] = [];
  const avisosPublicos: DefinicionVariable[] = [];
  const avisosServidor: DefinicionVariable[] = [];
  const definidas: string[] = [];
  for (const variable of VARIABLES) {
    const hay = Boolean(presente(fuente[variable.nombre]));
    if (variable.silenciosa) {
      if (hay) definidas.push(variable.nombre);
      continue;
    }
    if (hay) {
      definidas.push(variable.nombre);
      continue;
    }
    if (variable.requerida) errores.push(variable);
    else if (variable.ambito === "publico") avisosPublicos.push(variable);
    else avisosServidor.push(variable);
  }
  return { errores, avisosPublicos, avisosServidor, definidas };
}

export function mensajeFalta(variable: DefinicionVariable): string {
  const peso = variable.requerida ? "obligatoria" : "opcional";
  const ambito = variable.ambito === "publico" ? "pública" : "servidor";
  return `Falta ${variable.nombre} (${peso}, ${ambito}). Para: ${variable.para}`;
}

export function informeEntorno(resultado: ResultadoEntorno): string {
  const lineas: string[] = [];
  if (resultado.errores.length === 0) lineas.push("No falta ninguna variable de servidor obligatoria.");
  else {
    lineas.push("Faltan variables de servidor obligatorias:");
    for (const variable of resultado.errores) lineas.push(lineaVariable(variable));
  }
  if (resultado.avisosPublicos.length > 0) {
    lineas.push("Faltan variables públicas opcionales:");
    for (const variable of resultado.avisosPublicos) lineas.push(lineaVariable(variable));
  }
  if (resultado.avisosServidor.length > 0) {
    lineas.push("Faltan variables de servidor opcionales:");
    for (const variable of resultado.avisosServidor) lineas.push(lineaVariable(variable));
  }
  if (resultado.definidas.length > 0) {
    lineas.push(`Definidas, sin mostrar el valor: ${resultado.definidas.join(", ")}.`);
  }
  return lineas.join("\n");
}

function lineaVariable(variable: DefinicionVariable): string {
  return `- ${variable.nombre}. Para: ${variable.para}`;
}

export function mensajeLineasOmitidas(cantidad: number): string {
  if (cantidad === 1) return "No se leyó 1 línea de .env.local. No se muestra su contenido.";
  return `No se leyeron ${cantidad} líneas de .env.local. No se muestra su contenido.`;
}

export function parsearEnv(texto: string): ParseoEnv {
  const valores: Record<string, string> = {};
  let lineasOmitidas = 0;
  const sinBom = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  for (const cruda of sinBom.split(/\r?\n/)) {
    const linea = cruda.trim();
    if (!linea || linea.startsWith("#")) continue;
    const separado = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(linea);
    if (!separado) {
      lineasOmitidas += 1;
      continue;
    }
    const valor = valorDe(separado[2]);
    if (valor === null) {
      lineasOmitidas += 1;
      continue;
    }
    valores[separado[1]] = valor;
  }
  return { valores, lineasOmitidas };
}

function valorDe(resto: string): string | null {
  const limpio = resto.trim();
  if (limpio.startsWith('"') || limpio.startsWith("'")) {
    const marca = limpio[0];
    const fin = limpio.indexOf(marca, 1);
    if (fin < 1) return null;
    return limpio.slice(1, fin);
  }
  const comentario = limpio.search(/\s+#/);
  return comentario >= 0 ? limpio.slice(0, comentario).trim() : limpio;
}

export function aplicarEnvLocal(valores: Record<string, string>, destino: Entorno = process.env): void {
  for (const variable of VARIABLES) {
    const valor = presente(valores[variable.nombre]);
    if (!valor) continue;
    if (destino[variable.nombre] === undefined) destino[variable.nombre] = valor;
  }
}

export function hostDeDatabaseUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

export function revisarBaseLocal(
  databaseUrl: string,
  hostProduccion: string | null,
  confirmacion: string | null,
): { ok: true; aviso: string | null } | { ok: false; mensaje: string } {
  const host = hostDeDatabaseUrl(databaseUrl);
  if (!host) {
    return { ok: false, mensaje: "DATABASE_URL no se puede leer como URL. No se migra ni se siembra." };
  }
  const configurados = hostsDeConfiguracion(hostProduccion);
  if (configurados.ilegible) {
    return {
      ok: false,
      mensaje: `${HOST_BASE_PRODUCCION} no tiene un host legible. No se migra ni se siembra.`,
    };
  }
  if (configurados.hosts.length === 0) {
    return {
      ok: true,
      aviso: `No está ${HOST_BASE_PRODUCCION}. No se puede saber si DATABASE_URL apunta a producción.`,
    };
  }
  const comparable = hostComparable(host);
  const coincide = configurados.hosts.some((configurado) => hostComparable(configurado) === comparable);
  if (!coincide) return { ok: true, aviso: null };
  if (confirmacion?.trim().toLowerCase() === CONFIRMACION_BASE_PRODUCCION) {
    return {
      ok: true,
      aviso: `DATABASE_URL coincide con un host de ${HOST_BASE_PRODUCCION} y ${CONFIRMAR_BASE_PRODUCCION} está en ${CONFIRMACION_BASE_PRODUCCION}. Se continúa.`,
    };
  }
  return {
    ok: false,
    mensaje: `DATABASE_URL apunta a un host listado en ${HOST_BASE_PRODUCCION}. Para migrar o sembrar esa base, ${CONFIRMAR_BASE_PRODUCCION} tiene que valer ${CONFIRMACION_BASE_PRODUCCION}.`,
  };
}

export function prepararBaseDe(env: Entorno): PreparacionBase {
  const url = presente(env.DATABASE_URL);
  if (!url) return { ok: false, mensaje: mensajeFalta(DATABASE_URL) };
  const revision = revisarBaseLocal(url, presente(env[HOST_BASE_PRODUCCION]), env[CONFIRMAR_BASE_PRODUCCION] ?? null);
  if (!revision.ok) return revision;
  return { ok: true, url, aviso: revision.aviso };
}

function hostsDeConfiguracion(valor: string | null): { hosts: string[]; ilegible: boolean } {
  if (!valor?.trim()) return { hosts: [], ilegible: false };
  const hosts: string[] = [];
  for (const token of valor.split(",")) {
    if (!token.trim()) continue;
    const host = hostDeToken(token);
    if (!host) return { hosts: [], ilegible: true };
    hosts.push(host);
  }
  return { hosts, ilegible: hosts.length === 0 };
}

// Neon usa el mismo compute en dos hostnames: ep-xxx y ep-xxx-pooler. El sufijo
// va al final de la primera etiqueta; no se busca en el resto del nombre.
function hostComparable(host: string): string {
  const corte = host.indexOf(".");
  const primera = corte < 0 ? host : host.slice(0, corte);
  const sufijo = "-pooler";
  if (!primera.endsWith(sufijo)) return host;
  const base = primera.slice(0, -sufijo.length);
  if (!base) return host;
  return corte < 0 ? base : base + host.slice(corte);
}

function hostDeToken(token: string): string | null {
  const limpio = token.trim().toLowerCase();
  if (!limpio) return null;
  if (limpio.includes("://")) {
    try {
      const host = new URL(limpio).hostname.toLowerCase();
      return host || null;
    } catch {
      return null;
    }
  }
  const sinPuerto = limpio.replace(/:\d+$/, "");
  if (!/^[a-z0-9.-]+$/.test(sinPuerto) || sinPuerto.startsWith(".") || sinPuerto.endsWith(".")) return null;
  return sinPuerto;
}
