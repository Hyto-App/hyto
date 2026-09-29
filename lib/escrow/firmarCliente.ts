import { FeeBumpTransaction, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { crearAuth, conectarStellar } from "@/lib/auth/cliente";

export type ResultadoFirma = {
  hash: string | null;
  contrato: string | null;
  ledger: number | null;
  monto: number | null;
  aviso: string | null;
};

type DepsFirma = {
  fetch?: typeof fetch;
  firmar?: (xdr: string) => Promise<string>;
};

export async function firmarYEnviar(entrada: Record<string, unknown>, deps: DepsFirma = {}): Promise<ResultadoFirma> {
  const fetchImpl = deps.fetch ?? fetch;
  const preparada = await fetchImpl("/api/firma", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const jsonPrep = await leerJson(preparada);
  if (!preparada.ok) throw new Error(avisoDe(jsonPrep, "No se pudo preparar el pago."));
  const xdr = texto(jsonPrep.xdr);
  if (!xdr) throw new Error("La red no devolvió el XDR.");
  const firmado = (await (deps.firmar ?? firmarConCavos)(xdr)).trim();
  if (!firmado) throw new Error("La wallet no devolvió el XDR firmado.");
  if (esFeeBump(firmado)) {
    throw new Error("La red v2 no acepta un fee-bump. La cuenta de Cavos tiene que pagar la comisión en XLM.");
  }
  const enviada = await fetchImpl("/api/firma/enviar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      xdr: firmado,
      accion: entrada.accion,
      tareaId: entrada.tareaId,
      contrato: texto(jsonPrep.contrato),
    }),
  });
  const jsonEnv = await leerJson(enviada);
  if (!enviada.ok) throw new Error(avisoDe(jsonEnv, "No se pudo enviar el pago."));
  return {
    hash: texto(jsonEnv.hash),
    contrato: texto(jsonEnv.contrato) ?? texto(jsonPrep.contrato),
    ledger: typeof jsonEnv.ledger === "number" ? jsonEnv.ledger : null,
    monto: typeof jsonPrep.monto === "number" ? jsonPrep.monto : null,
    aviso: texto(jsonEnv.aviso),
  };
}

export async function desplegarYFondear(tareaId: string, firmante: string, deps: DepsFirma = {}): Promise<ResultadoFirma> {
  const desplegado = await firmarYEnviar({ accion: "desplegar", tareaId }, deps);
  const contrato = desplegado.contrato;
  if (!contrato) throw new Error(desplegado.aviso ?? "El despliegue no devolvió el contrato.");
  if (!(desplegado.monto && desplegado.monto > 0)) throw new Error("El despliegue no devolvió el monto a fondear.");
  const fondeo = await firmarYEnviar(
    { accion: "fondear", contrato, firmante, monto: desplegado.monto, tareaId },
    deps,
  );
  return { ...fondeo, contrato: fondeo.contrato ?? contrato, aviso: fondeo.aviso ?? desplegado.aviso };
}

export async function aprobarYPagar(
  opciones: { tareaId: string; contrato: string; firmante: string },
  deps: DepsFirma = {},
): Promise<ResultadoFirma> {
  const fetchImpl = deps.fetch ?? fetch;
  if (await haceFaltaMarcar(opciones.contrato, fetchImpl)) {
    const marcado = await firmarYEnviar(
      {
        accion: "marcar",
        contrato: opciones.contrato,
        firmante: opciones.firmante,
        indice: 0,
        estado: "completed",
        evidencia: "hyto",
        tareaId: opciones.tareaId,
      },
      deps,
    );
    if (marcado.aviso) throw new Error(marcado.aviso);
  }
  return firmarYEnviar(
    {
      accion: "pagar",
      contrato: opciones.contrato,
      firmante: opciones.firmante,
      indice: 0,
      tareaId: opciones.tareaId,
    },
    deps,
  );
}

async function firmarConCavos(xdr: string): Promise<string> {
  const auth = await crearAuth();
  if (!auth) throw new Error("El ingreso espera el identificador de Cavos.");
  let sesion: Awaited<ReturnType<typeof conectarStellar>>;
  try {
    sesion = await conectarStellar(auth);
  } catch {
    throw new Error("Entrá de nuevo para firmar con tu wallet.");
  }
  const billetera = sesion.wallet("stellar");
  if (billetera.chain !== "stellar" || !("signXdr" in billetera)) throw new Error("La wallet no es de Stellar.");
  if (billetera.status === "needs-device-approval") throw new Error("Esta sesión no puede firmar esta cuenta.");
  if (billetera.status === "undeployed") {
    throw new Error("La cuenta todavía no existe en testnet. Fondeala con Friendbot para que pueda pagar la comisión en XLM.");
  }
  if (typeof billetera.balance === "function") {
    try {
      const stroops = await billetera.balance();
      if (stroops < 100_000n) {
        throw new Error("La cuenta no tiene XLM suficiente para la comisión. Fondeala con Friendbot en testnet y volvé a intentar.");
      }
    } catch (error) {
      if (error instanceof Error && /XLM|Friendbot/.test(error.message)) throw error;
    }
  }
  return billetera.signXdr(xdr);
}

async function haceFaltaMarcar(contrato: string, fetchImpl: typeof fetch): Promise<boolean> {
  try {
    const respuesta = await fetchImpl(`/api/escrow/${encodeURIComponent(contrato)}`);
    if (!respuesta.ok) return true;
    const json = (await respuesta.json()) as {
      escrow?: { milestones?: { status?: unknown; flags?: { approved?: unknown; released?: unknown } }[] };
    };
    const hito = json.escrow?.milestones?.[0];
    if (!hito) return true;
    if (hito.flags?.released === true || hito.flags?.approved === true) return false;
    const estado = typeof hito.status === "string" ? hito.status.toLowerCase() : "";
    return estado !== "completed";
  } catch {
    return true;
  }
}

function esFeeBump(xdr: string): boolean {
  for (const red of [Networks.TESTNET, Networks.PUBLIC]) {
    try {
      return TransactionBuilder.fromXDR(xdr, red) instanceof FeeBumpTransaction;
    } catch {
      continue;
    }
  }
  return false;
}

async function leerJson(respuesta: Response): Promise<Record<string, unknown>> {
  const json = (await respuesta.json().catch(() => null)) as unknown;
  if (!json || typeof json !== "object") return {};
  return json as Record<string, unknown>;
}

function avisoDe(json: Record<string, unknown>, porDefecto: string): string {
  return typeof json.aviso === "string" && json.aviso.trim() ? json.aviso : porDefecto;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}
