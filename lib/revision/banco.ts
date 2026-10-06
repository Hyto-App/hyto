import type { Veredicto } from "@/lib/admin/tipos";
import { tareasSemilla } from "@/lib/db/semilla";
import type { TareaFila } from "@/lib/db/tipos";
import type { ClaseEvidencia } from "./laya";
import type { LecturaEvidencia } from "./lectura";
import { etiquetasDesdeVeredicto } from "./mostrar-razones";
import { motivoPrincipal } from "./razones";
import { revisar } from "./revisar";
import { separarDescripcion, unirDescripcion, type DetalleRazones } from "./snapshot-razones";

/** Labeled photos live here, under the file name each case gives. A live run skips a case whose photo is missing. */
export const CARPETA_FOTOS = "evidencias-prueba";

export type TareaBanco = Pick<TareaFila, "tipo" | "titulo" | "condicion" | "monto" | "tope">;

/** A string is a choice, a boolean a yes/no, a number an ordered index. */
type RespuestaSimulada = string | boolean | 0 | 1 | 2;

export type CasoBanco = {
  id: string;
  /** What a person sees in the photo. */
  etiqueta: string;
  /** File name inside CARPETA_FOTOS. */
  foto: string;
  tarea: TareaBanco;
  /** The band a person gave the photo, and the reason the card should show first. */
  esperado: { veredicto: Veredicto; motivo: string };
  /** What production showed before #039 and #044, as reported there. */
  antes?: { nota: number; veredicto: Veredicto; detalle: string };
  /** Offline stand-ins for the Qwen reply and Laya's answers. A live run ignores them. */
  simulado: { qwen: Record<string, unknown>; clase: ClaseEvidencia; respuestas: Record<string, RespuestaSimulada> };
};

export type ResultadoCaso = {
  id: string;
  etiqueta: string;
  foto: string;
  esperado: CasoBanco["esperado"];
  antes: CasoBanco["antes"] | null;
  origen: string;
  codigo: string | null;
  /** The vision reply before Hyto checked it. */
  qwen: unknown;
  descripcion: string;
  lectura: Omit<LecturaEvidencia, "textoCompleto"> | null;
  /** The text each Laya call received, and what it answered. */
  laya: { estado: string; preguntas: string[]; respuestas: unknown }[];
  respuestas: DetalleRazones | null;
  monto: string | null;
  fecha: string | null;
  nota: number | null;
  veredicto: Veredicto;
  razones: { id: string; texto: string; severidad: string }[];
  motivo: string | null;
  cumple: boolean;
  motivoCoincide: boolean;
};

export type OpcionesBanco =
  | { modo: "simulado" }
  | {
      modo: "vivo";
      foto: { bytes: Uint8Array; tipo: string };
      claveGroq: string;
      /** Null grades the description with the stub, and the result says so. */
      layaUrl: string | null;
      fetchImpl?: typeof fetch;
    };

const LAYA_SIMULADA = "https://laya.simulada.invalid";
const FOTO_SIMULADA = { tipo: "image/jpeg", bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) };

function deSemilla(id: "stand" | "comida"): TareaBanco {
  const tarea = tareasSemilla().find((fila) => fila.id === id);
  if (!tarea) throw new Error(`The sample task ${id} is missing.`);
  return { tipo: tarea.tipo, titulo: tarea.titulo, condicion: tarea.condicion, monto: tarea.monto, tope: tarea.tope };
}

const COMIDA = deSemilla("comida");
const STAND = deSemilla("stand");

const FACTURA_COMPLETA = {
  f1: "coincide_con_lo_pedido",
  f2: true,
  f3: true,
  f4: 2,
  g1: "comida_o_bebida",
  g2: true,
  g3: true,
  g4: true,
  g5: 2,
} as const;

export const CASOS_BANCO: readonly CasoBanco[] = [
  {
    id: "recibo-little-caesars-crc",
    etiqueta: "Little Caesars receipt in Costa Rican colones, total ₡7.350,00, dated 02/10/2026. Sharp and complete.",
    foto: "recibo-little-caesars.jpg",
    tarea: COMIDA,
    esperado: { veredicto: "cumplió", motivo: "matches" },
    antes: { nota: 40, veredicto: "insuficiente", detalle: "Reported in #039: amount and date missing, dollars assumed." },
    simulado: {
      qwen: {
        tipo: "recibo",
        pais: "CR",
        moneda: "CRC",
        monto_original: "₡7.350,00",
        monto_usd: null,
        fecha: "02/10/2026",
        comercio: "Little Caesars",
        articulos: ["Classic Pepperoni pizza", "Crazy Bread", "Soft drink 600 ml"],
        texto_completo:
          "A printed Little Caesars receipt photographed on a table in Costa Rica. It lists one Classic Pepperoni pizza, one Crazy Bread, and one 600 ml soft drink. The total is printed as ₡7.350,00, in Costa Rican colones, with sales tax included. The purchase date is printed as 02/10/2026 next to the time. The receipt is sharp and every line is readable. It is the meal receipt the organizer asked for.",
        legible: true,
        faltantes: [],
      },
      clase: "factura",
      respuestas: FACTURA_COMPLETA,
    },
  },
  {
    id: "recibo-usd",
    etiqueta: "Subway receipt from the United States, total $12.40, dated 09/27/2026.",
    foto: "recibo-usd.jpg",
    tarea: COMIDA,
    esperado: { veredicto: "cumplió", motivo: "matches" },
    simulado: {
      qwen: {
        tipo: "recibo",
        pais: "US",
        moneda: "USD",
        monto_original: "$12.40",
        monto_usd: "12.40",
        fecha: "09/27/2026",
        comercio: "Subway",
        articulos: ["Turkey sub", "Bottled water"],
        texto_completo:
          "A printed Subway receipt from a store in Miami, Florida. It lists one turkey sub and one bottled water. The total is printed as $12.40 in US dollars. The purchase date is printed as 09/27/2026. The receipt is sharp and readable. It is the meal receipt the organizer asked for.",
        legible: true,
        faltantes: [],
      },
      clase: "factura",
      respuestas: FACTURA_COMPLETA,
    },
  },
  {
    id: "recibo-sin-fecha",
    etiqueta: "Costa Rican meal receipt, total ₡6.900,00. The top is torn off, so there is no date.",
    foto: "recibo-sin-fecha.jpg",
    tarea: COMIDA,
    esperado: { veredicto: "parcial", motivo: "date_missing" },
    simulado: {
      qwen: {
        tipo: "recibo",
        pais: "CR",
        moneda: "CRC",
        monto_original: "₡6.900,00",
        monto_usd: null,
        fecha: null,
        comercio: "Soda La Esquina",
        articulos: ["Casado con pollo", "Fresco natural"],
        texto_completo:
          "A printed receipt from Soda La Esquina in Costa Rica. It lists one casado with chicken and one natural fruit drink. The total is printed as ₡6.900,00 in Costa Rican colones. The top of the receipt is torn off, so no purchase date is visible. The rest of the receipt is sharp and readable. It is a meal receipt, as the organizer asked.",
        legible: true,
        faltantes: ["purchase date"],
      },
      clase: "factura",
      respuestas: { ...FACTURA_COMPLETA, f3: false, f4: 1, g5: 1 },
    },
  },
  {
    id: "recibo-borroso",
    etiqueta: "A receipt so blurry that no total, date, or merchant can be read.",
    foto: "recibo-borroso.jpg",
    tarea: COMIDA,
    esperado: { veredicto: "insuficiente", motivo: "photo_unclear" },
    simulado: {
      qwen: {
        tipo: "recibo",
        pais: null,
        moneda: null,
        monto_original: null,
        monto_usd: null,
        fecha: null,
        comercio: null,
        articulos: [],
        texto_completo:
          "A blurry photo of what looks like a small paper receipt held in a hand. The text is out of focus and cannot be read. No merchant name, items, total, or date can be made out. It cannot be confirmed that this is the meal receipt the organizer asked for.",
        legible: false,
        faltantes: ["readable total", "purchase date", "merchant name", "items"],
      },
      clase: "factura",
      respuestas: {
        f1: "no_se_ve",
        f2: false,
        f3: false,
        f4: 0,
        g1: "otro_o_no_claro",
        g2: false,
        g3: false,
        g4: false,
        g5: 0,
      },
    },
  },
  {
    id: "recibo-sin-moneda",
    etiqueta: "Cropped receipt, total 7.350,00 with no currency symbol or name, dated 02/10/2026.",
    foto: "recibo-sin-moneda.jpg",
    tarea: COMIDA,
    esperado: { veredicto: "parcial", motivo: "currency_unknown" },
    simulado: {
      qwen: {
        tipo: "recibo",
        pais: null,
        moneda: null,
        monto_original: "7.350,00",
        monto_usd: null,
        fecha: "02/10/2026",
        comercio: "Soda El Parque",
        articulos: ["Coffee", "Empanada x2"],
        texto_completo:
          "A cropped photo of a printed receipt from Soda El Parque. It lists one coffee and two empanadas. The total is printed as 7.350,00 with no currency symbol or currency name visible. The purchase date is printed as 02/10/2026. The receipt is sharp and readable. It is a meal receipt, as the organizer asked.",
        legible: true,
        faltantes: ["currency"],
      },
      clase: "factura",
      respuestas: FACTURA_COMPLETA,
    },
  },
  {
    id: "trabajo-stand-ok",
    etiqueta: "Finished booth: ZEEK banner readable, table set up with a cloth and flyers.",
    foto: "trabajo-stand-ok.jpg",
    tarea: STAND,
    esperado: { veredicto: "cumplió", motivo: "matches" },
    simulado: {
      qwen: {
        tipo: "trabajo",
        pais: null,
        moneda: null,
        monto_original: null,
        monto_usd: null,
        fecha: null,
        comercio: null,
        articulos: ["ZEEK banner", "folding table", "tablecloth", "flyers", "laptop"],
        texto_completo:
          "An event booth inside a hall. A ZEEK banner hangs behind a folding table, facing the camera and fully readable. The table is covered with a black cloth and holds flyers, stickers, and a laptop. Two chairs stand behind the table. The booth looks finished and ready for visitors. This matches the request: the banner is visible and the table is set up.",
        legible: true,
        faltantes: [],
      },
      clase: "trabajo",
      respuestas: {
        lugar: "stand_o_mesa",
        v1: "es_lo_pedido",
        v2: 2,
        v3: true,
        v4: false,
        t5: "armar_o_montar",
        t6: "terminado",
        t7: true,
        t8: true,
        t9: false,
        t10: 2,
      },
    },
  },
  {
    id: "trabajo-pared-sin-pintar",
    etiqueta: "The wall that had to be painted is still bare. The paint cans are closed.",
    foto: "trabajo-pared-sin-pintar.jpg",
    tarea: {
      tipo: "trabajo",
      titulo: "Paint the entrance wall",
      condicion: "Entrance wall painted white, with no bare patches",
      monto: "20",
      tope: null,
    },
    esperado: { veredicto: "insuficiente", motivo: "cap_no_coincide" },
    simulado: {
      qwen: {
        tipo: "trabajo",
        pais: null,
        moneda: null,
        monto_original: null,
        monto_usd: null,
        fecha: null,
        comercio: null,
        articulos: ["bare concrete wall", "closed paint cans", "dry roller"],
        texto_completo:
          "A grey concrete wall beside a doorway, seen from the front. The wall is bare, with no fresh paint on it. Two closed paint cans and a dry roller sit on the floor. Nothing shows that painting has started. The photo does not show the entrance wall painted white.",
        legible: true,
        faltantes: ["painted wall"],
      },
      clase: "trabajo",
      respuestas: {
        lugar: "pared_o_superficie",
        v1: "es_otra_cosa",
        v2: 0,
        v3: false,
        v4: true,
        t5: "pintar",
        t6: "sin_empezar",
        t7: true,
        t8: true,
        t9: true,
        t10: 0,
      },
    },
  },
  {
    id: "salon-lleno",
    etiqueta: "A room full of attendees during a talk. Valid evidence for an attendance task.",
    foto: "salon-lleno.jpg",
    tarea: {
      tipo: "trabajo",
      titulo: "Fill the room for the talk",
      condicion: "Photo of the room full of attendees during the talk",
      monto: "20",
      tope: null,
    },
    esperado: { veredicto: "cumplió", motivo: "matches" },
    antes: { nota: 0, veredicto: "insuficiente", detalle: "Reported in #044 (P0-B): a valid photo got 0% Insufficient." },
    simulado: {
      qwen: {
        tipo: "trabajo",
        pais: null,
        moneda: null,
        monto_original: null,
        monto_usd: null,
        fecha: null,
        comercio: null,
        articulos: ["rows of chairs", "attendees", "projector screen", "speaker"],
        texto_completo:
          "A large meeting room seen from the back during a talk. Almost every chair is taken: about sixty people sit in rows facing a screen with slides. A speaker stands at the front next to the screen. The room looks full, which is what the organizer asked to see. Nothing requested seems to be missing.",
        legible: true,
        faltantes: [],
      },
      clase: "otra",
      respuestas: {
        lugar: "no_claro",
        v1: "es_lo_pedido",
        v2: 2,
        v3: true,
        v4: false,
        t5: "otra_o_no_claro",
        t6: "terminado",
        t7: false,
        t8: true,
        t9: false,
        t10: 2,
      },
    },
  },
  {
    id: "pinto-con-huevo",
    etiqueta: "A served plate of gallo pinto with a fried egg. Valid evidence for a breakfast task.",
    foto: "pinto-con-huevo.jpg",
    tarea: {
      tipo: "trabajo",
      titulo: "Serve the volunteer breakfast",
      condicion: "Photo of the breakfast served: gallo pinto with egg",
      monto: "20",
      tope: null,
    },
    esperado: { veredicto: "cumplió", motivo: "matches" },
    antes: { nota: 0, veredicto: "insuficiente", detalle: "Reported in #044 (P0-C): a valid photo got 0% Insufficient." },
    simulado: {
      qwen: {
        tipo: "trabajo",
        pais: null,
        moneda: null,
        monto_original: null,
        monto_usd: null,
        fecha: null,
        comercio: null,
        articulos: ["gallo pinto", "fried egg", "plate", "coffee"],
        texto_completo:
          "A white plate with gallo pinto, the Costa Rican rice and beans dish, and a fried egg on top. The plate sits on a table next to a fork and a cup of coffee. The food looks freshly served and complete. This matches the request for a photo of the breakfast served, gallo pinto with egg. Nothing requested is missing.",
        legible: true,
        faltantes: [],
      },
      clase: "trabajo",
      respuestas: {
        lugar: "stand_o_mesa",
        v1: "es_lo_pedido",
        v2: 2,
        v3: true,
        v4: false,
        t5: "vender_o_atender",
        t6: "terminado",
        t7: true,
        t8: true,
        t9: false,
        t10: 2,
      },
    },
  },
];

/** Runs one case through revisar(), the same entry point an upload uses, and reads the reasons the card would show. */
export async function correrCaso(caso: CasoBanco, opciones: OpcionesBanco): Promise<ResultadoCaso> {
  const tarea = tareaDe(caso);
  const registro: Registro = { qwen: null, laya: [] };
  const resultado =
    opciones.modo === "vivo"
      ? await revisar(tarea, opciones.foto, {
          claveGroq: opciones.claveGroq,
          layaUrl: opciones.layaUrl,
          fetchImpl: grabar(opciones.fetchImpl ?? fetch, registro),
          produccion: false,
        })
      : await revisar(tarea, FOTO_SIMULADA, {
          claveGroq: "simulado",
          layaUrl: LAYA_SIMULADA,
          fetchImpl: grabar(simular(caso), registro),
          produccion: false,
        });
  const textoScout = unirDescripcion(resultado.texto, resultado.detalle, resultado.lectura);
  const etiquetas = etiquetasDesdeVeredicto({
    textoScout,
    origen: resultado.origen,
    monto: resultado.monto,
    fecha: resultado.fecha,
    tope: tarea.tope,
    tipo: tarea.tipo,
  });
  const motivo = motivoPrincipal(etiquetas)?.id ?? null;
  return {
    id: caso.id,
    etiqueta: caso.etiqueta,
    foto: `${CARPETA_FOTOS}/${caso.foto}`,
    esperado: caso.esperado,
    antes: caso.antes ?? null,
    origen: resultado.origen,
    codigo: resultado.codigo,
    qwen: registro.qwen,
    descripcion: resultado.texto,
    lectura: sinTexto(resultado.lectura),
    laya: registro.laya,
    respuestas: resultado.origen === "error" ? null : separarDescripcion(textoScout).detalle,
    monto: resultado.monto,
    fecha: resultado.fecha,
    nota: resultado.nota,
    veredicto: resultado.veredicto,
    razones: etiquetas.map((etiqueta) => ({ id: etiqueta.id, texto: etiqueta.texto, severidad: etiqueta.severidad })),
    motivo,
    cumple: resultado.origen !== "error" && resultado.veredicto === caso.esperado.veredicto,
    motivoCoincide: motivo === caso.esperado.motivo,
  };
}

export type ResumenCaso = Pick<ResultadoCaso, "id" | "nota" | "veredicto" | "motivo">;

export type CambioCaso = {
  id: string;
  antes: ResumenCaso | null;
  ahora: ResumenCaso | null;
  cambio: boolean;
};

/** Case by case, an earlier results file against a new one. */
export function compararResultados(viejos: readonly ResumenCaso[], nuevos: readonly ResumenCaso[]): CambioCaso[] {
  const previos = new Map(viejos.map((caso) => [caso.id, caso]));
  const cambios: CambioCaso[] = nuevos.map((ahora) => {
    const antes = previos.get(ahora.id) ?? null;
    return { id: ahora.id, antes, ahora, cambio: !antes || !mismoResumen(antes, ahora) };
  });
  const vistos = new Set(nuevos.map((caso) => caso.id));
  for (const antes of viejos) {
    if (!vistos.has(antes.id)) cambios.push({ id: antes.id, antes, ahora: null, cambio: true });
  }
  return cambios;
}

/** Reads the cases of a saved results file. Rows that are not a case are skipped. */
export function leerResultados(json: unknown): ResumenCaso[] {
  const casos = json && typeof json === "object" && !Array.isArray(json) ? (json as { casos?: unknown }).casos : null;
  if (!Array.isArray(casos)) return [];
  const salida: ResumenCaso[] = [];
  for (const caso of casos) {
    if (!caso || typeof caso !== "object") continue;
    const fila = caso as Record<string, unknown>;
    if (typeof fila.id !== "string" || !esVeredicto(fila.veredicto)) continue;
    salida.push({
      id: fila.id,
      nota: typeof fila.nota === "number" ? fila.nota : null,
      veredicto: fila.veredicto,
      motivo: typeof fila.motivo === "string" ? fila.motivo : null,
    });
  }
  return salida;
}

type Registro = { qwen: unknown; laya: ResultadoCaso["laya"] };

function tareaDe(caso: CasoBanco): TareaFila {
  return {
    id: `banco-${caso.id}`,
    proyectoId: "banco",
    ...caso.tarea,
    miembroId: "",
    walletCobro: "",
    estado: "en revisión",
    hashPago: null,
    credencialUrl: null,
    contratoEscrow: null,
    prioridad: "normal",
    dificultad: null,
  };
}

function simular(caso: CasoBanco): typeof fetch {
  return async (input, init) => {
    if (urlDe(input).includes("api.groq.com")) {
      return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(caso.simulado.qwen) } }] });
    }
    const ids = Object.keys(cuerpoDe(init?.body)?.questions ?? {});
    if (ids.length === 1 && ids[0] === "c1") return Response.json({ answers: { c1: { choice: caso.simulado.clase } } });
    const answers: Record<string, unknown> = {};
    for (const id of ids) {
      const valor = caso.simulado.respuestas[id];
      if (valor !== undefined) answers[id] = nodoLaya(valor);
    }
    return Response.json({ answers });
  };
}

/** Keeps the request text and the answers. Headers, and with them every key, are never read. */
function grabar(fetchImpl: typeof fetch, registro: Registro): typeof fetch {
  return async (input, init) => {
    const respuesta = await fetchImpl(input, init);
    const json: unknown = respuesta.ok ? await respuesta.clone().json().catch(() => null) : null;
    if (urlDe(input).includes("api.groq.com")) {
      registro.qwen = respuesta.ok ? contenidoGroq(json) : { status: respuesta.status };
      return respuesta;
    }
    const cuerpo = cuerpoDe(init?.body);
    registro.laya.push({
      estado: typeof cuerpo?.state === "string" ? cuerpo.state : "",
      preguntas: Object.keys(cuerpo?.questions ?? {}),
      respuestas: respuesta.ok ? respuestasDe(json) : { status: respuesta.status },
    });
    return respuesta;
  };
}

function nodoLaya(valor: RespuestaSimulada): Record<string, unknown> {
  if (typeof valor === "string") return { choice: valor };
  if (typeof valor === "boolean") return { noul: valor };
  return { score: valor };
}

function urlDe(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function cuerpoDe(cuerpo: BodyInit | null | undefined): { state?: unknown; questions?: Record<string, unknown> } | null {
  if (typeof cuerpo !== "string") return null;
  try {
    const json: unknown = JSON.parse(cuerpo);
    return json && typeof json === "object" && !Array.isArray(json) ? (json as { state?: unknown; questions?: Record<string, unknown> }) : null;
  } catch {
    return null;
  }
}

function contenidoGroq(json: unknown): unknown {
  const contenido = (json as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message?.content;
  if (typeof contenido !== "string") return null;
  try {
    return JSON.parse(contenido);
  } catch {
    return contenido;
  }
}

function respuestasDe(json: unknown): unknown {
  if (!json || typeof json !== "object" || Array.isArray(json)) return json;
  const answers = (json as { answers?: unknown }).answers;
  return answers ?? json;
}

function sinTexto(lectura: LecturaEvidencia | null | undefined): Omit<LecturaEvidencia, "textoCompleto"> | null {
  if (!lectura) return null;
  const { textoCompleto: _texto, ...resto } = lectura;
  return resto;
}

function mismoResumen(a: ResumenCaso, b: ResumenCaso): boolean {
  return a.nota === b.nota && a.veredicto === b.veredicto && a.motivo === b.motivo;
}

function esVeredicto(valor: unknown): valor is Veredicto {
  return valor === "cumplió" || valor === "parcial" || valor === "insuficiente";
}
