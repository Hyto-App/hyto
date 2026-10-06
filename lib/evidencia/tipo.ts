export type TipoEvidencia =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf"
  | "text/html"
  | "text/plain"
  | "text/markdown";

export type ClaseTexto = "pdf" | "html" | "texto";

/** File picker for a reimbursement. Work tasks stay on the camera. */
export const ACCEPT_RECIBO =
  "application/pdf,text/html,text/plain,text/markdown,.pdf,.html,.htm,.txt,.md,.markdown,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

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
  if (tipo === "text/html") return "evidencia.html";
  if (tipo === "text/plain") return "evidencia.txt";
  if (tipo === "text/markdown") return "evidencia.md";
  if (tipo === "image/png") return "evidencia.png";
  if (tipo === "image/webp") return "evidencia.webp";
  return "evidencia.jpg";
}

export function esImagen(tipo: string): boolean {
  return tipo === "image/jpeg" || tipo === "image/png" || tipo === "image/webp";
}

export function esTipoDocumento(tipo: string | null | undefined): boolean {
  return tipo === "application/pdf" || tipo === "text/html" || tipo === "text/plain" || tipo === "text/markdown";
}

export function archivoReciboPermitido(tipo: string, nombre: string): boolean {
  const mime = mimeDe(tipo);
  const ext = extensionDe(nombre);
  if (mime === "application/pdf" || ext === ".pdf") return true;
  if (mime === "text/html" || ext === ".html" || ext === ".htm") return true;
  if (mime === "text/plain" || ext === ".txt") return true;
  if (mime === "text/markdown" || mime === "text/x-markdown" || ext === ".md" || ext === ".markdown") return true;
  if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") return true;
  return ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp";
}

export function esDocumentoDeclarado(tipo: string, nombre = ""): boolean {
  const mime = mimeDe(tipo);
  const ext = extensionDe(nombre);
  return (
    mime === "application/pdf" ||
    ext === ".pdf" ||
    mime === "text/html" ||
    ext === ".html" ||
    ext === ".htm" ||
    mime === "text/plain" ||
    ext === ".txt" ||
    mime === "text/markdown" ||
    mime === "text/x-markdown" ||
    ext === ".md" ||
    ext === ".markdown"
  );
}

/** PDF by magic bytes or stored type, or UTF-8 HTML / plain text / Markdown. */
export function claseTextual(tipo: string, bytes: Uint8Array, nombre = ""): ClaseTexto | null {
  if (esPdfDeclarado(tipo, bytes)) return "pdf";
  const declarado = tipoTextoDeclarado(tipo, nombre, bytes);
  if (declarado === "text/html") return "html";
  if (declarado === "text/plain" || declarado === "text/markdown") return "texto";
  return null;
}

export function esEvidenciaTextual(foto: { tipo: string; bytes: Uint8Array }, nombre = ""): boolean {
  return claseTextual(foto.tipo, foto.bytes, nombre) !== null;
}

/** A stored type that is a PDF or a text file, with no bytes to sniff. */
export function esMimeDocumental(tipo: string | null | undefined): boolean {
  const mime = (tipo ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  return mime === "application/pdf" || mime === "text/html" || mime === "text/plain" || mime === "text/markdown";
}

export function esPdfDeclarado(tipo: string, bytes: Uint8Array): boolean {
  return mimeDe(tipo) === "application/pdf" || esPdf(bytes);
}

/** HTML, plain text, or Markdown when the bytes are UTF-8 text. A declared PDF still needs the %PDF- header. */
export function tipoTextoDeclarado(tipo: string, nombre: string, bytes: Uint8Array): TipoEvidencia | null {
  if (esPdf(bytes)) return null;
  if (!utf8Seguro(bytes)) return null;
  const mime = mimeDe(tipo);
  const ext = extensionDe(nombre);
  if (mime === "text/html" || ext === ".html" || ext === ".htm") return "text/html";
  if (mime === "text/markdown" || mime === "text/x-markdown" || ext === ".md" || ext === ".markdown") return "text/markdown";
  if (mime === "text/plain" || ext === ".txt") return "text/plain";
  return null;
}

function mimeDe(tipo: string): string {
  return tipo.split(";")[0]?.trim().toLowerCase() ?? "";
}

function extensionDe(nombre: string): string {
  const base = nombre.trim().toLowerCase().split(/[/\\]/).pop() ?? "";
  const punto = base.lastIndexOf(".");
  if (punto <= 0) return "";
  return base.slice(punto);
}

function utf8Seguro(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  const muestra = Math.min(bytes.length, 64 * 1024);
  let controles = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i] ?? 0;
    if (byte === 0) return false;
    if (i < muestra && byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) controles += 1;
  }
  if (controles > muestra / 20) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, muestra));
    return true;
  } catch {
    return false;
  }
}
