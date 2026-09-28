const VENTANA_MS = 60_000;
const TOPE = 30;
const TOPE_CUERPO = 200_000;
const TOPE_XDR = 100_000;

const marcas = new Map<string, number[]>();

export function reiniciarLimite(): void {
  marcas.clear();
}

export function excedido(clave: string, ahora = Date.now()): boolean {
  const recientes = (marcas.get(clave) ?? []).filter((marca) => ahora - marca < VENTANA_MS);
  if (recientes.length >= TOPE) {
    marcas.set(clave, recientes);
    return true;
  }
  recientes.push(ahora);
  marcas.set(clave, recientes);
  return false;
}

export function clienteDe(request: Request): string {
  const encabezado = request.headers.get("x-forwarded-for") ?? "";
  const ip = encabezado.split(",")[0]?.trim();
  return ip || "local";
}

export function respuestaSiExcedido(request: Request): Response | null {
  if (!excedido(clienteDe(request))) return null;
  return Response.json({ aviso: "Demasiadas solicitudes de firma. Esperá un momento." }, { status: 429 });
}

export function respuestaSiCuerpoGrande(request: Request): Response | null {
  const largo = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(largo) || largo <= TOPE_CUERPO) return null;
  return Response.json({ aviso: "El cuerpo es demasiado grande." }, { status: 413 });
}

export function xdrDemasiadoLargo(xdr: string): boolean {
  return xdr.length > TOPE_XDR;
}
