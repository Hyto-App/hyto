const VENTANA_MS = 60_000;
const VENTANA_CANJE_MS = 15 * 60_000;
const TOPE = 30;
const TOPE_CANJE = 5;
const TOPE_LECTURA = 120;
const TOPE_CUERPO = 200_000;
const TOPE_XDR = 100_000;

const marcas = new Map<string, number[]>();
const fallosCanje = new Map<string, number[]>();

export function reiniciarLimite(): void {
  marcas.clear();
  fallosCanje.clear();
}

export function excedido(clave: string, ahora = Date.now(), tope = TOPE): boolean {
  const recientes = (marcas.get(clave) ?? []).filter((marca) => ahora - marca < VENTANA_MS);
  if (recientes.length >= tope) {
    marcas.set(clave, recientes);
    return true;
  }
  recientes.push(ahora);
  marcas.set(clave, recientes);
  return false;
}

export function canjeBloqueado(clave: string, ahora = Date.now()): boolean {
  const recientes = (fallosCanje.get(clave) ?? []).filter((marca) => ahora - marca < VENTANA_CANJE_MS);
  fallosCanje.set(clave, recientes);
  return recientes.length >= TOPE_CANJE;
}

export function anotarFalloCanje(clave: string, ahora = Date.now()): void {
  const recientes = (fallosCanje.get(clave) ?? []).filter((marca) => ahora - marca < VENTANA_CANJE_MS);
  recientes.push(ahora);
  fallosCanje.set(clave, recientes);
}

export function clienteDe(request: Request): string {
  const encabezado = request.headers.get("x-forwarded-for") ?? "";
  const ip = encabezado.split(",")[0]?.trim();
  return ip || "local";
}

export function respuestaSiExcedido(request: Request, cubo: "firma" | "lectura" = "firma"): Response | null {
  const tope = cubo === "lectura" ? TOPE_LECTURA : TOPE;
  if (!excedido(`${cubo}:${clienteDe(request)}`, Date.now(), tope)) return null;
  const aviso =
    cubo === "lectura"
      ? "Too many escrow reads. Wait a moment."
      : "Too many signature requests. Wait a moment.";
  return Response.json({ aviso }, { status: 429 });
}

export function respuestaSiCuerpoGrande(request: Request): Response | null {
  const largo = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(largo) || largo <= TOPE_CUERPO) return null;
  return Response.json({ aviso: "The body is too large." }, { status: 413 });
}

export function xdrDemasiadoLargo(xdr: string): boolean {
  return xdr.length > TOPE_XDR;
}
