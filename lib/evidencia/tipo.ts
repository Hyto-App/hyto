export type TipoEvidencia = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function tipoPorBytes(bytes: Uint8Array): TipoEvidencia | null {
  if (esJpeg(bytes)) return "image/jpeg";
  if (esPng(bytes)) return "image/png";
  if (esWebp(bytes)) return "image/webp";
  if (esPdf(bytes)) return "application/pdf";
  return null;
}

export function esJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function esPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

export function esWebp(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export function esPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

export function nombreDeTipo(tipo: TipoEvidencia): string {
  if (tipo === "application/pdf") return "evidencia.pdf";
  if (tipo === "image/png") return "evidencia.png";
  if (tipo === "image/webp") return "evidencia.webp";
  return "evidencia.jpg";
}
