import exifr from "exifr";
import sharp from "sharp";

/**
 * Camera files often carry location, the device, and other notes Hyto does not use.
 * The capture time is read first (`fechaExif`) and stored on its own.
 * Everything else is dropped before the file is saved, shown, or sent to Mile.
 * A file with no such notes is returned as the same bytes.
 */

const IMAGENES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function convieneQuitar(bytes: Uint8Array): Promise<boolean> {
  try {
    const meta = await sharp(Buffer.from(bytes), { failOn: "none" }).metadata();
    if (meta.xmp || meta.iptc) return true;
    const gps = (await exifr.gps(bytes).catch(() => null)) as { latitude?: number; longitude?: number } | null;
    if (gps && (Number.isFinite(gps.latitude) || Number.isFinite(gps.longitude))) return true;
    const campos = (await exifr.parse(bytes, { reviveValues: false })) as Record<string, unknown> | undefined;
    if (!campos) return false;
    return Object.keys(campos).some((clave) => clave.toLowerCase() !== "orientation");
  } catch {
    return false;
  }
}

/** Rewrites a JPEG, PNG, or WebP upright and without camera notes. Other types stay as they arrived. */
export async function sinMetadatos(bytes: Uint8Array, tipo: string): Promise<{ bytes: Uint8Array; tipo: string }> {
  if (!IMAGENES.has(tipo)) return { bytes, tipo };
  if (!(await convieneQuitar(bytes))) return { bytes, tipo };
  try {
    const base = sharp(Buffer.from(bytes), { failOn: "none" }).rotate();
    const salida =
      tipo === "image/png"
        ? await base.png().toBuffer()
        : tipo === "image/webp"
          ? await base.webp({ quality: 90 }).toBuffer()
          : await base.jpeg({ quality: 90 }).toBuffer();
    const limpio = new Uint8Array(salida.byteLength);
    limpio.set(salida);
    return { bytes: limpio, tipo };
  } catch {
    return { bytes, tipo };
  }
}
