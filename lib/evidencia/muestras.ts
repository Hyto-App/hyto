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
