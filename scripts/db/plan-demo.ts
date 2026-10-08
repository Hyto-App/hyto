import type { Rol, RolEvento } from "../../lib/db/tipos";
import type { DificultadTarea, EstadoTarea, PrioridadTarea, TipoTarea } from "../../lib/integrante/tipos";

/** Exact value `1`. The seed refuses to open a database without it. */
export const BANDERA_SEMILLA = "HYTO_SEED_DEMO";

export const MIGRACION_0007 = "drizzle/0007_requisitos_rechazo.sql";

export const CREADO_EN = "2026-10-12T15:00:00.000Z";

export const ID = {
  org: "demo-12-oct-org",
  team: "demo-12-oct-team",
  ana: "demo-12-oct-ana",
  luis: "demo-12-oct-luis",
  proyecto: "demo-12-oct",
  pendiente: "demo-12-oct-pendiente",
  revision: "demo-12-oct-revision",
  comida: "demo-12-oct-comida",
  pagada: "demo-12-oct-pagada",
  evRevision: "demo-12-oct-ev-revision",
  evComida: "demo-12-oct-ev-comida",
  evPagada: "demo-12-oct-ev-pagada",
  verRevision: "demo-12-oct-ver-revision",
  verComida: "demo-12-oct-ver-comida",
  verPagada: "demo-12-oct-ver-pagada",
} as const;

/** Not a Stellar account. Replace with the new Cavos G… address after the wipe. */
export const WALLET = {
  ana: "PLACEHOLDER-G-ANA-FILL-AFTER-WIPE",
  luis: "PLACEHOLDER-G-LUIS-FILL-AFTER-WIPE",
  team: "PLACEHOLDER-G-TEAM-FILL-AFTER-WIPE",
} as const;

/**
 * Not a ledger hash. `enlacePago` only links a 64-hex hash, so this row shows
 * Paid without pointing at Stellar Expert.
 */
export const HASH_PAGO_PLACEHOLDER = "PLACEHOLDER-NOT-A-LEDGER-TX";

const TABLAS = new Set(["usuarios", "proyectos", "proyecto_miembros", "tareas", "evidencias", "veredictos"]);
const COLUMNA = /^[a-z0-9_]+$/;
const INSERT = /^insert into [a-z0-9_]+ \([a-z0-9_, ]+\) values \(\$\d+(?:, \$\d+)*\) on conflict do nothing$/i;
const PROHIBIDO = /\b(delete|truncate|drop|update|alter|grant|revoke|create|copy|vacuum)\b/i;

const COLUMNAS_0007 = new Set(["tareas.requisitos", "tareas.rechazo", "veredictos.mile"]);

export type Columna = { tabla: string; columna: string };

export type FilaInsert = {
  tabla: string;
  columnas: readonly string[];
  valores: readonly unknown[];
};

export type UsuarioDemo = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
};

export type MiembroDemo = {
  proyectoId: string;
  usuarioId: string;
  rol: RolEvento;
  estado: "active";
  creadoEn: string;
};

export type TareaDemo = {
  id: string;
  proyectoId: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  tope: string | null;
  condicion: string;
  miembroId: string;
  walletCobro: string;
  estado: EstadoTarea;
  hashPago: string | null;
  credencialUrl: string | null;
  contratoEscrow: string | null;
  prioridad: PrioridadTarea;
  dificultad: DificultadTarea | null;
  requisitos: string | null;
  rechazo: string | null;
};

export const USUARIOS: readonly UsuarioDemo[] = [
  { id: ID.org, email: "organizer.demo@example.com", nombre: "Olivia Organizer", rol: "organizador" },
  { id: ID.team, email: "team.demo@example.com", nombre: "Taylor Team", rol: "voluntario" },
  { id: ID.ana, email: "ana.volunteer.demo@example.com", nombre: "Ana Volunteer", rol: "voluntario" },
  { id: ID.luis, email: "luis.volunteer.demo@example.com", nombre: "Luis Volunteer", rol: "voluntario" },
];

export const PROYECTO = {
  id: ID.proyecto,
  nombre: "Feria demo 12 oct",
  creadoEn: CREADO_EN,
  organizadorId: ID.org,
} as const;

export const MIEMBROS: readonly MiembroDemo[] = [
  { proyectoId: ID.proyecto, usuarioId: ID.org, rol: "organizer", estado: "active", creadoEn: CREADO_EN },
  { proyectoId: ID.proyecto, usuarioId: ID.team, rol: "team", estado: "active", creadoEn: CREADO_EN },
  { proyectoId: ID.proyecto, usuarioId: ID.ana, rol: "volunteer", estado: "active", creadoEn: CREADO_EN },
  { proyectoId: ID.proyecto, usuarioId: ID.luis, rol: "volunteer", estado: "active", creadoEn: CREADO_EN },
];

function requisitos(texto: string): string {
  return JSON.stringify([{ id: "r1", texto }]);
}

const TAREAS_BASE: TareaDemo[] = [
  {
    id: ID.pendiente,
    proyectoId: ID.proyecto,
    titulo: "Welcome table",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Table set up at the entrance and the banner readable",
    miembroId: ID.ana,
    walletCobro: WALLET.ana,
    estado: "pendiente",
    hashPago: null,
    credencialUrl: null,
    contratoEscrow: null,
    prioridad: "high",
    dificultad: "easy",
    requisitos: requisitos("The welcome table is set and the banner is readable."),
    rechazo: null,
  },
  {
    id: ID.revision,
    proyectoId: ID.proyecto,
    titulo: "Check-in list",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "List of people who arrived",
    miembroId: ID.luis,
    walletCobro: WALLET.luis,
    estado: "en revisión",
    hashPago: null,
    credencialUrl: null,
    contratoEscrow: null,
    prioridad: "normal",
    dificultad: "medium",
    requisitos: requisitos("The check-in list shows the names of people who arrived."),
    rechazo: null,
  },
  {
    id: ID.comida,
    proyectoId: ID.proyecto,
    titulo: "Team meal",
    tipo: "reembolso",
    monto: "15",
    tope: "15",
    condicion: "Photo of the meal receipt",
    miembroId: ID.ana,
    walletCobro: WALLET.ana,
    estado: "en revisión",
    hashPago: null,
    credencialUrl: null,
    contratoEscrow: null,
    prioridad: "normal",
    dificultad: null,
    requisitos: requisitos("The receipt shows the total, the date, and the merchant."),
    rechazo: null,
  },
  {
    id: ID.pagada,
    proyectoId: ID.proyecto,
    titulo: "Booth setup",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Banner visible and the table set up",
    miembroId: ID.team,
    walletCobro: WALLET.team,
    estado: "pagado",
    hashPago: null,
    credencialUrl: null,
    contratoEscrow: null,
    prioridad: "normal",
    dificultad: "easy",
    requisitos: requisitos("The booth is set up and the banner faces forward."),
    rechazo: null,
  },
];

export const TAREAS: readonly TareaDemo[] = TAREAS_BASE.map((tarea) =>
  tarea.id === ID.pagada ? marcarPagada(tarea) : tarea,
);

function marcarPagada(tarea: TareaDemo): TareaDemo {
  const copia = { ...tarea };
  copia.hashPago = HASH_PAGO_PLACEHOLDER;
  return copia;
}

type EvidenciaDemo = {
  id: string;
  tareaId: string;
  blobId: string;
  monto: string | null;
  montoConfirmado: string | null;
  fecha: string | null;
  creadaEn: string;
};

export const EVIDENCIAS: readonly EvidenciaDemo[] = [
  {
    id: ID.evRevision,
    tareaId: ID.revision,
    blobId: "placeholder-demo-12-oct/revision",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: CREADO_EN,
  },
  {
    id: ID.evComida,
    tareaId: ID.comida,
    blobId: "placeholder-demo-12-oct/comida",
    monto: "12.40",
    montoConfirmado: "12.40",
    fecha: "2026-10-11",
    creadaEn: CREADO_EN,
  },
  {
    id: ID.evPagada,
    tareaId: ID.pagada,
    blobId: "placeholder-demo-12-oct/pagada",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: CREADO_EN,
  },
];

type VeredictoDemo = {
  id: string;
  evidenciaId: string;
  tareaId: string;
  veredicto: "cumplió";
  frase: string;
  textoScout: string;
  choice: string;
  noul: "si";
  score: string;
  origen: "guion";
  mile: null;
};

export const VEREDICTOS: readonly VeredictoDemo[] = [
  {
    id: ID.verRevision,
    evidenciaId: ID.evRevision,
    tareaId: ID.revision,
    veredicto: "cumplió",
    frase: "Sample review. The check-in list is readable and matches the task.",
    textoScout: "Sample description for the October 12 demo. The photo is a placeholder and is not stored in Blob. The list of names is readable. This text is not a live AI review.",
    choice: "trabajo",
    noul: "si",
    score: "86",
    origen: "guion",
    mile: null,
  },
  {
    id: ID.verComida,
    evidenciaId: ID.evComida,
    tareaId: ID.comida,
    veredicto: "cumplió",
    frase: "Sample review. Meal receipt with a total under the cap.",
    textoScout: "Sample description for the October 12 demo. The receipt total is 12.40 USD and the date is 11 October 2026. The photo file is not in Blob. This text is not a live AI review.",
    choice: "factura",
    noul: "si",
    score: "90",
    origen: "guion",
    mile: null,
  },
  {
    id: ID.verPagada,
    evidenciaId: ID.evPagada,
    tareaId: ID.pagada,
    veredicto: "cumplió",
    frase: "Sample review. Booth set up. This task is already marked paid for the demo.",
    textoScout: "Sample description for the October 12 demo. The booth and the banner are visible. The payment hash on the task is a placeholder, not a Stellar transaction. This text is not a live AI review.",
    choice: "trabajo",
    noul: "si",
    score: "100",
    origen: "guion",
    mile: null,
  },
];

export const CONSULTA_COLUMNAS = `select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = any($1::text[])`;

function fila(tabla: string, datos: Record<string, unknown>): FilaInsert {
  const columnas = Object.keys(datos);
  return { tabla, columnas, valores: columnas.map((columna) => datos[columna]) };
}

export function filasDemo(): FilaInsert[] {
  return [
    ...USUARIOS.map((usuario) => fila("usuarios", usuario)),
    fila("proyectos", {
      id: PROYECTO.id,
      nombre: PROYECTO.nombre,
      creado_en: PROYECTO.creadoEn,
      organizador_id: PROYECTO.organizadorId,
    }),
    ...MIEMBROS.map((miembro) =>
      fila("proyecto_miembros", {
        proyecto_id: miembro.proyectoId,
        usuario_id: miembro.usuarioId,
        rol: miembro.rol,
        estado: miembro.estado,
        creado_en: miembro.creadoEn,
      }),
    ),
    ...TAREAS.map((tarea) =>
      fila("tareas", {
        id: tarea.id,
        proyecto_id: tarea.proyectoId,
        titulo: tarea.titulo,
        tipo: tarea.tipo,
        monto: tarea.monto,
        tope: tarea.tope,
        condicion: tarea.condicion,
        miembro_id: tarea.miembroId,
        wallet_cobro: tarea.walletCobro,
        estado: tarea.estado,
        hash_pago: tarea.hashPago,
        credencial_url: tarea.credencialUrl,
        contrato_escrow: tarea.contratoEscrow,
        prioridad: tarea.prioridad,
        dificultad: tarea.dificultad,
        requisitos: tarea.requisitos,
        rechazo: tarea.rechazo,
      }),
    ),
    ...EVIDENCIAS.map((evidencia) =>
      fila("evidencias", {
        id: evidencia.id,
        tarea_id: evidencia.tareaId,
        blob_id: evidencia.blobId,
        monto: evidencia.monto,
        fecha: evidencia.fecha,
        creada_en: evidencia.creadaEn,
        monto_confirmado: evidencia.montoConfirmado,
        capturada_en: null,
        frescura: null,
        sha256: null,
        phash: null,
        tipo_archivo: null,
        motivo_copia: null,
      }),
    ),
    ...VEREDICTOS.map((revision) =>
      fila("veredictos", {
        id: revision.id,
        evidencia_id: revision.evidenciaId,
        tarea_id: revision.tareaId,
        veredicto: revision.veredicto,
        frase: revision.frase,
        texto_scout: revision.textoScout,
        choice: revision.choice,
        noul: revision.noul,
        score: revision.score,
        origen: revision.origen,
        mile: revision.mile,
      }),
    ),
  ];
}

export function tablasDe(filas: FilaInsert[] = filasDemo()): string[] {
  return [...new Set(filas.map((filaInsert) => filaInsert.tabla))];
}

export function aSql(filaInsert: FilaInsert): { texto: string; valores: unknown[] } {
  if (!TABLAS.has(filaInsert.tabla)) throw new Error("Tabla no permitida.");
  if (filaInsert.columnas.length === 0 || filaInsert.columnas.length !== filaInsert.valores.length) {
    throw new Error("Columnas y valores no coinciden.");
  }
  for (const columna of filaInsert.columnas) {
    if (!COLUMNA.test(columna)) throw new Error("Columna no permitida.");
  }
  const columnas = filaInsert.columnas.join(", ");
  const params = filaInsert.columnas.map((_, indice) => `$${indice + 1}`).join(", ");
  return {
    texto: `insert into ${filaInsert.tabla} (${columnas}) values (${params}) on conflict do nothing`,
    valores: [...filaInsert.valores],
  };
}

export function sqlPermitido(texto: string): boolean {
  const normal = texto.replace(/\s+/g, " ").trim();
  return INSERT.test(normal) && !PROHIBIDO.test(normal);
}

export function columnasDelPlan(filas: FilaInsert[] = filasDemo()): Columna[] {
  const visto = new Set<string>();
  const salida: Columna[] = [];
  for (const filaInsert of filas) {
    for (const columna of filaInsert.columnas) {
      const clave = `${filaInsert.tabla}.${columna}`;
      if (visto.has(clave)) continue;
      visto.add(clave);
      salida.push({ tabla: filaInsert.tabla, columna });
    }
  }
  return salida;
}

export function columnasFaltantes(presentes: Columna[], pedidas: Columna[]): Columna[] {
  const hay = new Set(presentes.map((columna) => `${columna.tabla}.${columna.columna}`));
  return pedidas.filter((columna) => !hay.has(`${columna.tabla}.${columna.columna}`));
}

export function mensajeColumnasFaltantes(faltan: Columna[]): string | null {
  if (faltan.length === 0) return null;
  const lista = faltan.map((columna) => `${columna.tabla}.${columna.columna}`).join(", ");
  const pide0007 = faltan.some((columna) => COLUMNAS_0007.has(`${columna.tabla}.${columna.columna}`));
  const paso = pide0007
    ? ` La migración ${MIGRACION_0007} puede seguir pendiente en Neon: aplícala con npm run db:migrar antes de sembrar.`
    : " Corre npm run db:migrar y vuelve a intentar.";
  return `Faltan columnas: ${lista}.${paso} No se escribió nada.`;
}

export function claveFila(filaInsert: FilaInsert): string {
  if (filaInsert.tabla === "proyecto_miembros") {
    const proyecto = filaInsert.valores[filaInsert.columnas.indexOf("proyecto_id")];
    const usuario = filaInsert.valores[filaInsert.columnas.indexOf("usuario_id")];
    return `${filaInsert.tabla}:${String(proyecto)}:${String(usuario)}`;
  }
  const id = filaInsert.valores[filaInsert.columnas.indexOf("id")];
  return `${filaInsert.tabla}:${String(id)}`;
}

export function contarInserciones(
  filas: FilaInsert[],
  ya: ReadonlySet<string>,
): { nuevas: string[]; omitidas: string[] } {
  const nuevas: string[] = [];
  const omitidas: string[] = [];
  const visto = new Set(ya);
  for (const filaInsert of filas) {
    const clave = claveFila(filaInsert);
    if (visto.has(clave)) {
      omitidas.push(clave);
      continue;
    }
    visto.add(clave);
    nuevas.push(clave);
  }
  return { nuevas, omitidas };
}

export function revisarBandera(valor: string | undefined): { ok: true } | { ok: false; mensaje: string } {
  if (valor === "1") return { ok: true };
  return {
    ok: false,
    mensaje: "Esta semilla no corre sola. Exporta HYTO_SEED_DEMO=1 en la terminal. Solo inserta filas que aún no existen.",
  };
}

export function revisarArgumentos(argv: readonly string[]): { ok: true; prueba: boolean } | { ok: false; mensaje: string } {
  if (argv.length === 0) return { ok: true, prueba: false };
  if (argv.length === 1 && argv[0] === "--dry-run") return { ok: true, prueba: true };
  return {
    ok: false,
    mensaje: "Argumento no reconocido. Usa --dry-run para ver el plan sin abrir la base, o ningún argumento para sembrar.",
  };
}

export function textoPrueba(): string {
  const filas = filasDemo();
  const lineas = [
    "Modo prueba. No se abre ninguna base y no se escribe nada.",
    "",
    `Proyecto: ${PROYECTO.nombre} (${PROYECTO.id}).`,
    "Personas:",
    ...USUARIOS.map((usuario) => `- ${usuario.nombre} <${usuario.email}> rol global ${usuario.rol}.`),
    "Membresía del evento:",
    ...MIEMBROS.map((miembro) => `- ${miembro.usuarioId}: ${miembro.rol}.`),
    "Tareas:",
    ...TAREAS.map((tarea) => `- ${tarea.id}: ${tarea.estado}. ${tarea.titulo}. Asignada a ${tarea.miembroId}. Monto ${tarea.monto}.`),
    "",
    `Filas que insertaría si aún no existen: ${filas.length}.`,
    "Si la fila ya existe, se deja igual.",
    `Antes de escribir, la base tiene que tener ${MIGRACION_0007}.`,
    "Las wallets y el hash de pago son marcadores PLACEHOLDER. No son cuentas ni transacciones.",
  ];
  return lineas.join("\n");
}
