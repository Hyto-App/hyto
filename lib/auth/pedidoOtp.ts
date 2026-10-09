import { avisoDeIngreso, esperaDeRespuesta429, textoEspera } from "@/lib/auth/errores";
import { nonceDe } from "@/lib/auth/retoCorreo";

const RUTA_OTP = "/api/oauth/firebase/otp/request";
const RUTA_PROPIA = "/api/ingreso/codigo";

/**
 * Cavos answers a repeat OTP with 429 and `wait_seconds` (no `Retry-After` today).
 * The kit only keeps `status` plus the body, and a browser that refuses that
 * response (`Access-Control-Allow-Origin: *` together with allow-credentials)
 * throws `TypeError: Failed to fetch` — the same shape as a dropped connection —
 * while the network panel still shows 429.
 *
 * This asks our own route, which repeats the call and returns the status where
 * the page can read it. A 429 does not include `status: "sent"`: Cavos did not
 * accept a new code. The code that still arrives is the last accepted one, so
 * the nonce minted for the rejected call is put back.
 */
export class TopeCodigo extends Error {
  esperaSegundos: number;

  constructor(segundos: number) {
    const espera = Math.max(1, Math.ceil(segundos));
    super(textoEspera(espera));
    this.name = "TopeCodigo";
    this.esperaSegundos = espera;
  }
}

type AuthConOtp = { sendOtp(email: string): Promise<void> };

export async function pedirOtp(auth: AuthConOtp, email: string): Promise<void> {
  const previo = nonceDe(auth);
  let tope: number | null = null;
  const anterior = globalThis.fetch;
  const llamar = anterior.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const propio = esPedidoOtp(input);
    const respuesta = await llamar(propio ? RUTA_PROPIA : input, init);
    if (propio && respuesta.status === 429) tope = await esperaDeRespuesta429(respuesta);
    return respuesta;
  };
  try {
    await auth.sendOtp(email);
  } catch (error) {
    restaurarNonce(auth, previo);
    if (tope === null) {
      const aviso = avisoDeIngreso(error);
      if (aviso.esperaSegundos) tope = aviso.esperaSegundos;
    }
    if (tope !== null) throw new TopeCodigo(tope);
    throw error;
  } finally {
    globalThis.fetch = anterior;
  }
}

function esPedidoOtp(input: RequestInfo | URL): boolean {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return url.includes(RUTA_OTP);
}

function restaurarNonce(auth: object, previo: string | null): void {
  (auth as { pendingNonce: string | null }).pendingNonce = previo;
}
