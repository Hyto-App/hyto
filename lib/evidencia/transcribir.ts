import { getDocumentProxy } from "unpdf";
import type { FotoLeida } from "@/lib/blob/fotos";
import { claseTextual } from "@/lib/evidencia/tipo";
import type { Descripcion } from "@/lib/revision/armar";
import { FalloRevision } from "@/lib/revision/fallo";

/** Characters sent to Laya. A receipt or a short note fits; a long export does not spend the whole budget. */
export const TOPE_TRANSCRIPCION = 6_000;

const MAX_PAGINAS_PDF = 12;
const TOPE_BYTES_LECTURA = 200_000;

const MENSAJE_PDF =
  "This PDF has no readable text. A scanned PDF cannot be read automatically, and it is not approved automatically.";

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
  uuml: "ü",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  Ntilde: "Ñ",
  Uuml: "Ü",
};

/**
 * Local read of a PDF, HTML, or plain-text file. Images never come through here.
 * An image-only PDF fails with a clear error. There is no OCR.
 */
export async function transcribirEvidencia(foto: FotoLeida): Promise<Descripcion> {
  const clase = claseTextual(foto.tipo, foto.bytes);
  if (!clase) {
    throw new FalloRevision("sin_texto", { fuente: "revision", providerMessage: foto.tipo || "tipo" });
  }
  const crudo = clase === "pdf" ? await extraerTextoPdf(foto.bytes) : clase === "html" ? textoDeHtml(decodificarUtf8(foto.bytes)) : decodificarUtf8(foto.bytes);
  const texto = recortarTranscripcion(crudo);
  if (!texto) {
    throw new FalloRevision("sin_texto", {
      fuente: "revision",
      providerMessage: clase,
      ...(clase === "pdf" ? { mensaje: MENSAJE_PDF } : {}),
    });
  }
  return { texto, monto: null, fecha: null };
}

export function recortarTranscripcion(texto: string): string {
  const limpio = texto
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  if (limpio.length <= TOPE_TRANSCRIPCION) return limpio;
  return limpio.slice(0, TOPE_TRANSCRIPCION).trimEnd();
}

export function textoDeHtml(html: string): string {
  let limpio = html.replace(/<!--[\s\S]*?-->/g, " ");
  limpio = limpio.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  limpio = limpio.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  limpio = limpio.replace(/<h([1-6])\b[^>]*>/gi, (_todo, nivel: string) => `\n\n${"#".repeat(Number(nivel))} `);
  limpio = limpio.replace(/<\/h[1-6]>/gi, "\n");
  limpio = limpio.replace(/<br\s*\/?>/gi, "\n");
  limpio = limpio.replace(/<\/(p|div|tr|li|section|article|header|footer|blockquote)>/gi, "\n");
  limpio = limpio.replace(/<li\b[^>]*>/gi, "\n- ");
  limpio = limpio.replace(/<[^>]+>/g, "");
  return decodificarEntidades(limpio);
}

async function extraerTextoPdf(bytes: Uint8Array): Promise<string> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;
  try {
    pdf = await getDocumentProxy(bytes, { verbosity: 0 });
    const paginas = Math.min(pdf.numPages, MAX_PAGINAS_PDF);
    const trozos: string[] = [];
    for (let numero = 1; numero <= paginas; numero += 1) {
      const pagina = await pdf.getPage(numero);
      const contenido = await pagina.getTextContent();
      trozos.push(textoDeItems(contenido.items));
      if (trozos.join("\n").length >= TOPE_TRANSCRIPCION) break;
    }
    return trozos.join("\n");
  } catch (error) {
    if (error instanceof FalloRevision) throw error;
    throw new FalloRevision("sin_texto", {
      fuente: "revision",
      providerMessage: error instanceof Error ? error.message : "pdf",
      mensaje: MENSAJE_PDF,
    });
  } finally {
    if (pdf) {
      try {
        await pdf.destroy();
      } catch {
        // The page text is already collected.
      }
    }
  }
}

function textoDeItems(items: ReadonlyArray<unknown>): string {
  let salida = "";
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item)) continue;
    const texto = (item as { str?: unknown; hasEOL?: unknown }).str;
    if (typeof texto !== "string") continue;
    salida += texto;
    if ((item as { hasEOL?: unknown }).hasEOL === true) salida += "\n";
  }
  return salida;
}

function decodificarUtf8(bytes: Uint8Array): string {
  const recorte = bytes.byteLength > TOPE_BYTES_LECTURA ? bytes.subarray(0, TOPE_BYTES_LECTURA) : bytes;
  const texto = new TextDecoder("utf-8", { fatal: false }).decode(recorte);
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (todo, cuerpo: string) => {
    if (cuerpo.startsWith("#")) {
      const hex = cuerpo[1] === "x" || cuerpo[1] === "X";
      const codigo = Number.parseInt(cuerpo.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(codigo) || codigo <= 0 || codigo > 0x10ffff) return "";
      return String.fromCodePoint(codigo);
    }
    return ENTIDADES[cuerpo] ?? ENTIDADES[cuerpo.toLowerCase()] ?? todo;
  });
}
