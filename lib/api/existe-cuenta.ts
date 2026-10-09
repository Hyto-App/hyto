import type { Almacen } from "@/lib/db/almacen";
import { excedido } from "@/lib/escrow/limite";
import { baseNoLista, json } from "./json";

const TOPE_POR_MINUTO = 10;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IP = /^[0-9a-fA-F:.]+$/;

/**
 * The platform's own client address. `x-real-ip` is set by the host. Otherwise the last
 * `x-forwarded-for` hop is the one a proxy appends. The first hop is client-supplied, so it
 * cannot be the rate-limit key.
 */
export function clienteEstable(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim() ?? "";
  if (IP.test(real)) return real;
  const partes = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((parte) => parte.trim())
    .filter((parte) => IP.test(parte));
  return partes[partes.length - 1] ?? "local";
}

/**
 * Lets the sign-in form tell a new email apart before a code is sent. It answers only yes or no.
 * Ten lookups a minute per client, in memory on this instance. That slows a scan; it does not
 * stop one that spreads across instances, and the yes/no answer can still be used to guess emails.
 */
export async function existeCuentaHttp(request: Request, almacen: Almacen): Promise<Response> {
  if (excedido(`existe:${clienteEstable(request)}`, Date.now(), TOPE_POR_MINUTO)) {
    return json({ aviso: "Too many attempts. Wait 1 minute and try again." }, 429);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const email = body && typeof body === "object" && typeof (body as { email?: unknown }).email === "string" ? (body as { email: string }).email.trim().toLowerCase() : "";
  if (!CORREO.test(email)) return json({ aviso: "Enter a valid email." }, 400);
  try {
    return json({ existe: (await almacen.usuarioPorEmail(email)) !== null }, 200, { "cache-control": "private, no-store" });
  } catch (error) {
    return baseNoLista(error);
  }
}
