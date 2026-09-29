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
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const partes = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean);
  return partes.at(-1) || "local";
}

export function respuestaSiExcedido(request: Request): Response | null {
  if (!excedido(clienteDe(request))) return null;
  return Response.json({ aviso: "Demasiadas solicitudes de firma. Esperá un momento." }, { status: 429 });
}

export function respuestaSiCuerpoGrande(request: Request): Response | null {
  const crudo = request.headers.get("content-length");
  if (!crudo) return null;
  const largo = Number(crudo);
  if (!Number.isFinite(largo) || largo <= TOPE_CUERPO) return null;
  return cuerpoGrande();
}

function cuerpoGrande(): Response {
  return Response.json({ aviso: "El cuerpo es demasiado grande." }, { status: 413 });
}

export async function leerJsonAcotado(request: Request): Promise<{ json: unknown } | Response> {
  const porLargo = respuestaSiCuerpoGrande(request);
  if (porLargo) return porLargo;
  const texto = await leerTextoAcotado(request);
  if (texto instanceof Response) return texto;
  try {
    return { json: JSON.parse(texto) as unknown };
  } catch {
    return Response.json({ aviso: "El cuerpo no es JSON." }, { status: 400 });
  }
}

async function leerTextoAcotado(request: Request): Promise<string | Response> {
  const lector = request.body?.getReader();
  if (!lector) return "";
  const decoder = new TextDecoder();
  let texto = "";
  let total = 0;
  while (true) {
    const { done, value } = await lector.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > TOPE_CUERPO) {
      await lector.cancel();
      return cuerpoGrande();
    }
    texto += decoder.decode(value, { stream: true });
  }
  texto += decoder.decode();
  return texto;
}

export function xdrDemasiadoLargo(xdr: string): boolean {
  return xdr.length > TOPE_XDR;
}
