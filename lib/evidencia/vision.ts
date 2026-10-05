import sharp from "sharp";
import { FalloRevision } from "@/lib/revision/fallo";

/** Raw size whose base64 form stays under the vision request cap (base64 adds about 33%). */
export const TOPE_BASE64 = 4_000_000;

export function tamanoBase64(bytes: number): number {
  return Math.ceil(bytes / 3) * 4;
}

/**
 * Fits the photo under the base64 cap and turns it upright. Phone photos often keep the pixels
 * sideways with an EXIF Orientation tag that the browser applies. The vision model may read the raw
 * pixels, so it gets them upright and sees what the organizer sees.
 */
export async function ajustarParaVision(
  bytes: Uint8Array,
  tipo: string,
  topeBase64 = TOPE_BASE64,
): Promise<{ bytes: Uint8Array; tipo: string }> {
  if (tipo === "application/pdf") return { bytes, tipo };
  if (tamanoBase64(bytes.byteLength) <= topeBase64) {
    if (!(await estaGirada(bytes))) return { bytes, tipo };
    const derecha = new Uint8Array(await sharp(Buffer.from(bytes)).rotate().jpeg({ quality: 90 }).toBuffer());
    if (tamanoBase64(derecha.byteLength) <= topeBase64) return { bytes: derecha, tipo: "image/jpeg" };
  }
  let ancho = 1600;
  let calidad = 80;
  let actual = bytes;
  for (let paso = 0; paso < 5; paso += 1) {
    const salida = await sharp(Buffer.from(actual))
      .rotate()
      .resize({ width: ancho, withoutEnlargement: true })
      .jpeg({ quality: calidad })
      .toBuffer();
    actual = new Uint8Array(salida);
    if (tamanoBase64(actual.byteLength) <= topeBase64) return { bytes: actual, tipo: "image/jpeg" };
    ancho = Math.max(640, Math.round(ancho * 0.7));
    calidad = Math.max(45, calidad - 10);
  }
  throw new FalloRevision("respuesta", {
    fuente: "groq",
    providerMessage: "imagen grande",
    mensaje: "The photo is too large for automatic review",
  });
}

/** False for bytes sharp cannot read. Those are sent unchanged. */
async function estaGirada(bytes: Uint8Array): Promise<boolean> {
  try {
    const { orientation } = await sharp(Buffer.from(bytes)).metadata();
    return typeof orientation === "number" && orientation > 1;
  } catch {
    return false;
  }
}
