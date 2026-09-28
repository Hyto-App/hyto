import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { enlacePago } from "../lib/escrow/cuerpos";
import { ErrorFirma, enviar, preparar, prepararDespliegue, reintentarConFriendbot } from "../lib/escrow/modulo";
import type { AccionFirma, CuentasDespliegue, PagoEnviado, RedEscrow } from "../lib/escrow/tipos";
import { USDC } from "../lib/integrante/identidades";

const ARCHIVO_CUENTAS = ".sebas-cuentas.json";
const ARCHIVO_PAGO = "lib/escrow/pago-prueba.json";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const GRIFO_USDC = "https://faucet.circle.com/";
const MONTO = 1;
const ROLES = ["organizador", "receptor", "admin", "plataforma", "resolutor"] as const;

type Rol = (typeof ROLES)[number];
type Par = { public: string; secret: string };
type Cuentas = Record<Rol, Par>;

const server = new Horizon.Server(HORIZON_URL);

async function main(): Promise<void> {
  const clave = process.env.TRUSTLESS_API_KEY?.trim();
  if (!clave) {
    console.error("Falta TRUSTLESS_API_KEY en el servidor. Sin esa clave no se despliega ni se libera el hito.");
    console.error("NEXT_PUBLIC_CAVOS_APP_ID sigue sin publicarse: en este entorno no hay app de Cavos ni proyecto Hyto en Vercel.");
    console.error("El Acta no se integra: todavía no hay un pago en USDC.");
    process.exit(2);
  }

  const cuentas = await prepararCuentas();
  const trustline = {
    contractId: new Asset(USDC.code, USDC.issuer).contractId(Networks.TESTNET),
    symbol: USDC.code,
    address: USDC.issuer,
  };
  let detalleGrifo = "";
  const saldo = await saldoUsdc(cuentas.organizador.public);
  if (saldo < MONTO) {
    detalleGrifo = (await pedirUsdc(cuentas.organizador.public)) ?? "";
  }
  const saldoFinal = await saldoUsdc(cuentas.organizador.public);
  if (saldoFinal < MONTO) {
    avisarFondeoManual(
      cuentas.organizador.public,
      detalleGrifo || `El organizador no tiene ${MONTO} USDC de testnet. Sin ese activo no se fondea el hito.`,
    );
    process.exit(3);
  }

  try {
    const pago = await correr("v2", cuentas, trustline, clave);
    guardarPago(pago);
    return;
  } catch (error) {
    console.error(`v2 no liberó el hito: ${mensaje(error)}`);
  }

  try {
    const pago = await correr("v1", cuentas, trustline, clave);
    guardarPago(pago);
  } catch (error) {
    console.error(`v1 tampoco liberó el hito: ${mensaje(error)}`);
    console.error("El Acta no se integra: no hay un pago en USDC.");
    process.exit(1);
  }
}

async function correr(
  red: RedEscrow,
  cuentas: Cuentas,
  trustline: CuentasDespliegue["trustline"],
  clave: string,
): Promise<{ hash: string; contrato: string; red: RedEscrow }> {
  const proveedor = red === "v2" ? cuentas.receptor : cuentas.organizador;
  const firmanteDespliegue = red === "v2" ? cuentas.admin : cuentas.organizador;
  const cuerpo: CuentasDespliegue = {
    red,
    firmante: firmanteDespliegue.public,
    organizador: cuentas.organizador.public,
    receptor: cuentas.receptor.public,
    proveedor: proveedor.public,
    admin: red === "v2" ? cuentas.admin.public : null,
    plataforma: cuentas.plataforma.public,
    resolutor: cuentas.resolutor.public,
    monto: MONTO,
    titulo: "Hito de prueba",
    descripcion: "Un hito de Hyto en testnet.",
    hito: "Foto de prueba",
    engagementId: `hyto-${red}-${Date.now()}`,
    trustline,
    comision: 0,
  };
  const contrato = await desplegar(cuerpo, firmanteDespliegue.secret, firmanteDespliegue.public, clave);
  await paso({ accion: "fondear", contrato, firmante: cuentas.organizador.public, monto: MONTO }, cuentas.organizador, red, clave);
  await paso(
    {
      accion: "marcar",
      contrato,
      firmante: proveedor.public,
      indice: 0,
      estado: "completed",
      evidencia: "hito-prueba",
    },
    proveedor,
    red,
    clave,
  );
  const pago =
    red === "v2"
      ? await paso({ accion: "aprobar", contrato, firmante: cuentas.organizador.public, indice: 0 }, cuentas.organizador, red, clave)
      : await aprobarYLiberarV1(contrato, cuentas.organizador, red, clave);
  if (!pago.hash) {
    throw new Error("El envío salió bien y no hay hash para guardar el pago.");
  }
  console.log(`Pago ${red}: ${pago.hash}`);
  console.log(enlacePago(pago.hash));
  return { hash: pago.hash, contrato, red };
}

async function aprobarYLiberarV1(contrato: string, organizador: Par, red: RedEscrow, clave: string): Promise<PagoEnviado> {
  await paso({ accion: "aprobar", contrato, firmante: organizador.public, indice: 0 }, organizador, red, clave);
  return paso({ accion: "liberar", contrato, firmante: organizador.public, indice: 0 }, organizador, red, clave);
}

async function desplegar(cuentas: CuentasDespliegue, secreto: string, direccion: string, clave: string): Promise<string> {
  const intentar = async () => {
    const listo = await prepararDespliegue(cuentas, { clave, red: cuentas.red });
    const firmado = firmar(listo.xdr, secreto);
    const enviado = conHash(await enviar(firmado, { clave, red: cuentas.red }), firmado);
    const contrato = listo.contrato ?? enviado.contrato;
    if (!contrato) throw new ErrorFirma("El despliegue no devolvió el contrato.", 502, null);
    return contrato;
  };
  try {
    return await intentar();
  } catch (error) {
    if (!reintentarConFriendbot(error)) throw error;
    await friendbot(direccion);
    return intentar();
  }
}

async function paso(accion: AccionFirma, par: Par, red: RedEscrow, clave: string): Promise<PagoEnviado> {
  const intentar = async () => {
    const listo = await preparar(accion, { clave, red });
    const firmado = firmar(listo.xdr, par.secret);
    return conHash(await enviar(firmado, { clave, red }), firmado);
  };
  try {
    return await intentar();
  } catch (error) {
    if (!reintentarConFriendbot(error)) throw error;
    await friendbot(par.public);
    return intentar();
  }
}

function firmar(xdr: string, secreto: string): string {
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  tx.sign(Keypair.fromSecret(secreto));
  return tx.toXDR();
}

function conHash(pago: PagoEnviado, xdr: string): PagoEnviado {
  if (pago.hash) return pago;
  if (pago.estado && pago.estado !== "SUCCESS") return pago;
  try {
    const hash = Buffer.from(TransactionBuilder.fromXDR(xdr, Networks.TESTNET).hash()).toString("hex");
    return { ...pago, hash };
  } catch {
    return pago;
  }
}

function guardarPago(pago: { hash: string; contrato: string; red: RedEscrow }): void {
  const registro = { hash: pago.hash, contrato: pago.contrato, red: pago.red, enlace: enlacePago(pago.hash) };
  writeFileSync(ARCHIVO_PAGO, `${JSON.stringify(registro, null, 2)}\n`);
  console.log(`Hash guardado en ${ARCHIVO_PAGO}`);
}

async function prepararCuentas(): Promise<Cuentas> {
  const cuentas = leerCuentas() ?? crearCuentas();
  writeFileSync(ARCHIVO_CUENTAS, `${JSON.stringify(cuentas, null, 2)}\n`);
  for (const rol of ROLES) {
    await friendbot(cuentas[rol].public);
    const conUsdc = rol === "organizador" || rol === "receptor" || rol === "plataforma";
    if (conUsdc) await abrirUsdc(cuentas[rol]);
    console.log(`${rol}: ${cuentas[rol].public}`);
  }
  return cuentas;
}

function crearCuentas(): Cuentas {
  const cuentas = {} as Cuentas;
  for (const rol of ROLES) {
    const par = Keypair.random();
    cuentas[rol] = { public: par.publicKey(), secret: par.secret() };
  }
  return cuentas;
}

function leerCuentas(): Cuentas | null {
  if (!existsSync(ARCHIVO_CUENTAS)) return null;
  const json = JSON.parse(readFileSync(ARCHIVO_CUENTAS, "utf8")) as Cuentas;
  for (const rol of ROLES) {
    if (!json[rol]?.public || !json[rol]?.secret) return null;
  }
  return json;
}

async function friendbot(direccion: string): Promise<void> {
  if (await cuentaExiste(direccion)) return;
  const respuesta = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(direccion)}`);
  if (!respuesta.ok) {
    throw new Error(`Friendbot no fondeó la cuenta (${respuesta.status}).`);
  }
  for (let intento = 0; intento < 8; intento += 1) {
    if (await cuentaExiste(direccion)) return;
    await esperar(500);
  }
  throw new Error("Friendbot respondió y la cuenta todavía no aparece.");
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => {
    setTimeout(resolver, ms);
  });
}

async function cuentaExiste(direccion: string): Promise<boolean> {
  const respuesta = await fetch(`${HORIZON_URL}/accounts/${direccion}`);
  return respuesta.ok;
}

async function abrirUsdc(par: Par): Promise<void> {
  const cuenta = await server.loadAccount(par.public);
  const lista = cuenta.balances.some(
    (saldo) => "asset_code" in saldo && saldo.asset_code === USDC.code && saldo.asset_issuer === USDC.issuer,
  );
  if (lista) return;
  const tx = new TransactionBuilder(cuenta, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: new Asset(USDC.code, USDC.issuer) }))
    .setTimeout(30)
    .build();
  tx.sign(Keypair.fromSecret(par.secret));
  await server.submitTransaction(tx);
}

async function saldoUsdc(direccion: string): Promise<number> {
  try {
    const cuenta = await server.loadAccount(direccion);
    const linea = cuenta.balances.find(
      (saldo) => "asset_code" in saldo && saldo.asset_code === USDC.code && saldo.asset_issuer === USDC.issuer,
    );
    return linea && "balance" in linea ? Number(linea.balance) : 0;
  } catch {
    return 0;
  }
}

async function pedirUsdc(direccion: string): Promise<string | null> {
  try {
    const respuesta = await fetch("https://faucet.circle.com/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        operationName: "RequestToken",
        query: "mutation RequestToken($input: RequestTokenInput!) { requestToken(input: $input) { amount } }",
        variables: { input: { destinationAddress: direccion, blockchain: "XLM", token: "USDC" } },
      }),
    });
    const cuerpo = await respuesta.text();
    if (!respuesta.ok || graphqlConError(cuerpo)) return cuerpo || `HTTP ${respuesta.status}`;
    return null;
  } catch (error) {
    return mensaje(error);
  }
}

function graphqlConError(cuerpo: string): boolean {
  try {
    const json = JSON.parse(cuerpo) as { errors?: unknown };
    return Array.isArray(json.errors) && json.errors.length > 0;
  } catch {
    return false;
  }
}

function avisarFondeoManual(direccion: string, detalle: string): void {
  console.error("El grifo de Circle no entregó USDC. Hay que fondear a mano.");
  if (detalle) console.error(detalle);
  console.error(`Cuenta del organizador: ${direccion}`);
  console.error(`Grifo: ${GRIFO_USDC}`);
}

function mensaje(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error desconocido.";
}

main().catch((error: unknown) => {
  console.error(mensaje(error));
  console.error("El Acta no se integra: no hay un pago en USDC.");
  process.exit(1);
});
