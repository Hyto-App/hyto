import { AVISO_CORREO, ESPERA_TRAS_ENVIO, correoValido, esperaDeclaradaDe } from "@/lib/auth/errores";
import { appIdPublico } from "@/lib/config/publico";
import { clienteEstable } from "@/lib/api/existe-cuenta";
import { segundosDeVentanaLlena, segundosSiExcedido } from "@/lib/escrow/limite";
import { json } from "@/lib/api/json";

/** Same host the kit uses when `backendUrl` is unset. Not taken from the request. */
const URL_OTP = "https://cavos.xyz/api/oauth/firebase/otp/request";
const TOPE_POR_MINUTO = 8;
const TOPE_CUERPO = 2048;
const TOPE_RESPUESTA = 8192;
/** Absolute time when this client may ask again. Only a wait the server will actually enforce. */
const anuncioHasta = new Map<string, number>();

const NONCE = /^0x[0-9a-fA-F]{1,80}$/;

export type PedidoCodigoDeps = {
  fetchImpl?: typeof fetch;
  ahora?: number;
  appId?: string | null;
};

/**
 * Forwards one email-code request to Cavos and returns that status to the page.
 * The browser call is same-origin, so a 429 stays a 429 (Retry-After included)
 * instead of a failed fetch. The app id is the server's, never the body's.
 */
export async function pedirCodigoHttp(request: Request, deps: PedidoCodigoDeps = {}): Promise<Response> {
  const ahora = deps.ahora ?? Date.now();
  const clave = `codigo:${clienteEstable(request)}`;
  const previa = esperaAnunciada(clave, ahora);
  if (previa !== null) return respuestaTope(previa);
  const ventana = segundosSiExcedido(clave, ahora, TOPE_POR_MINUTO);
  if (ventana !== null) return respuestaTope(ventana);
  const appId = deps.appId === undefined ? appIdPublico() : deps.appId;
  if (!appId) return json({ error: "missing_app_id", message: "Sign-in is waiting for the Cavos app id." }, 503);

  const largo = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(largo) && largo > TOPE_CUERPO) return json({ aviso: "The body is too large." }, 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const email = texto(body, "email").trim().toLowerCase();
  const nonce = texto(body, "nonce").trim();
  if (!correoValido(email)) return json({ aviso: AVISO_CORREO }, 400);
  if (!NONCE.test(nonce)) return json({ error: "invalid_nonce", message: "Could not sign in. Try again." }, 400);

  const fetchImpl = deps.fetchImpl ?? fetch;
  let upstream: Response;
  try {
    upstream = await fetchImpl(URL_OTP, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email, nonce, app_id: appId }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return json({ error: "upstream_unreachable" }, 502);
  }
  if (upstream.status >= 300 && upstream.status < 400) return json({ error: "upstream_unreachable" }, 502);

  const crudo = await upstream.text();
  const recorte = crudo.length > TOPE_RESPUESTA ? crudo.slice(0, TOPE_RESPUESTA) : crudo;
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  const dicha = esperaDeclaradaDe(upstream.headers.get("retry-after"), recorte, ahora);
  const llena = segundosDeVentanaLlena(clave, ahora, TOPE_POR_MINUTO);
  const real = Math.max(dicha ?? 0, llena);
  const aceptado = upstream.status >= 200 && upstream.status < 300;
  const limitado = upstream.status === 429;
  const retry = real > 0 ? real : aceptado || limitado ? ESPERA_TRAS_ENVIO : 0;
  if (retry > 0 && (real > 0 || limitado)) anunciar(clave, ahora, retry);
  if (retry > 0) headers.set("retry-after", String(retry));
  return new Response(recorte, { status: upstream.status, headers });
}

function esperaAnunciada(clave: string, ahora: number): number | null {
  const hasta = anuncioHasta.get(clave);
  if (hasta === undefined || hasta <= ahora) {
    if (hasta !== undefined) anuncioHasta.delete(clave);
    return null;
  }
  return Math.max(1, Math.ceil((hasta - ahora) / 1000));
}

function anunciar(clave: string, ahora: number, segundos: number): void {
  const hasta = ahora + Math.ceil(segundos) * 1000;
  const previo = anuncioHasta.get(clave) ?? 0;
  if (hasta > previo) anuncioHasta.set(clave, hasta);
}

function respuestaTope(segundos: number): Response {
  return json(
    {
      error: "rate_limited",
      message: `Please wait ${segundos} seconds before requesting another code.`,
      wait_seconds: segundos,
    },
    429,
    { "cache-control": "no-store", "retry-after": String(segundos) },
  );
}

function texto(body: unknown, clave: string): string {
  if (!body || typeof body !== "object") return "";
  const valor = (body as Record<string, unknown>)[clave];
  return typeof valor === "string" ? valor : "";
}
