import sharp from "sharp";
import { emitirTokenEvidencia } from "./token";

const SECRETO = "hyto-test-token-secret-32chars!!";

let jpeg: Uint8Array<ArrayBuffer> | null = null;
let jpegCercano: Uint8Array<ArrayBuffer> | null = null;

function fijo(buf: Buffer): Uint8Array<ArrayBuffer> {
  const copia = new Uint8Array(buf.byteLength);
  copia.set(buf);
  return copia;
}

export function asegurarSecretoPrueba(): void {
  if ((process.env.HYTO_TOKEN_SECRET?.trim().length ?? 0) >= 32) return;
  if (process.env.HYTO_TEST_SESSION_KEY?.trim()) return;
  process.env.HYTO_TOKEN_SECRET = SECRETO;
}

export function tokenDePrueba(usuarioId: string, tareaId: string, ahora = Date.now()): string {
  asegurarSecretoPrueba();
  const token = emitirTokenEvidencia({ usuarioId, tareaId }, ahora);
  if (!token) throw new Error("token");
  return token;
}

export async function jpegDePrueba(): Promise<Uint8Array<ArrayBuffer>> {
  if (jpeg) return jpeg;
  jpeg = fijo(await sharp({ create: { width: 32, height: 24, channels: 3, background: { r: 30, g: 120, b: 40 } } }).jpeg().toBuffer());
  return jpeg;
}

export async function jpegDistinto(): Promise<Uint8Array<ArrayBuffer>> {
  if (jpegCercano) return jpegCercano;
  const datos = Buffer.alloc(48 * 48 * 3);
  for (let y = 0; y < 48; y += 1) {
    for (let x = 0; x < 48; x += 1) {
      const i = (y * 48 + x) * 3;
      const valor = Math.round((x / 47) * 255);
      datos[i] = valor;
      datos[i + 1] = valor;
      datos[i + 2] = valor;
    }
  }
  jpegCercano = fijo(await sharp(datos, { raw: { width: 48, height: 48, channels: 3 } }).jpeg().toBuffer());
  return jpegCercano;
}

export const PDF_MINIMO = new TextEncoder().encode(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

/** A one-page PDF whose only text is `texto`. ASCII only; the page is wide enough that PDF.js keeps the line. */
export function pdfConTexto(texto: string): Uint8Array {
  const literal = texto.replace(/[()\\]/g, (caracter) => `\\${caracter}`);
  const stream = `BT /F1 12 Tf 72 700 Td (${literal}) Tj ET`;
  const objetos = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  const partes: Uint8Array[] = [utf8("%PDF-1.4\n")];
  const offsets = [0];
  let cursor = partes[0]?.length ?? 0;
  for (const objeto of objetos) {
    offsets.push(cursor);
    const bytes = utf8(objeto);
    partes.push(bytes);
    cursor += bytes.length;
  }
  let tabla = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objetos.length; i += 1) {
    tabla += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  tabla += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF\n`;
  partes.push(utf8(tabla));
  const total = partes.reduce((suma, parte) => suma + parte.length, 0);
  const salida = new Uint8Array(total);
  let pos = 0;
  for (const parte of partes) {
    salida.set(parte, pos);
    pos += parte.length;
  }
  return salida;
}

function utf8(texto: string): Uint8Array {
  return new TextEncoder().encode(texto);
}
