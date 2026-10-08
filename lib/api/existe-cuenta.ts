import type { Almacen } from "@/lib/db/almacen";
import { clienteDe, excedido } from "@/lib/escrow/limite";
import { baseNoLista, json } from "./json";

const TOPE_POR_MINUTO = 10;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lets the sign-in form tell a new email apart before a code is sent. It answers only yes or no
 * and is limited per client, so it is a weak lookup for anyone scanning for addresses.
 */
export async function existeCuentaHttp(request: Request, almacen: Almacen): Promise<Response> {
  if (excedido(`existe:${clienteDe(request)}`, Date.now(), TOPE_POR_MINUTO)) {
    return json({ aviso: "Too many attempts. Wait a moment." }, 429);
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
  } catch {
    return baseNoLista();
  }
}
