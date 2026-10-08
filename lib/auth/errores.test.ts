import assert from "node:assert/strict";
import test from "node:test";
import {
  AVISO_CODIGO_INVALIDO,
  AVISO_CODIGO_VENCIDO,
  AVISO_CONFIG,
  AVISO_CORREO,
  AVISO_GENERICO,
  AVISO_GOOGLE_BLOQUEADO,
  AVISO_GOOGLE_CERRADO,
  AVISO_ORIGEN_CAVOS,
  AVISO_RED,
  avisoDeIngreso,
  correoValido,
  esCorreoDemo,
  esperaDeclarada,
  esperaDeRespuesta429,
  segundosDeRetryAfter,
  textoEspera,
} from "./errores";

const CRUDO_429 =
  'kit/auth: /api/oauth/firebase/otp/request -> 429 {"error":"rate_limited","message":"Please wait 19 seconds before requesting another code.","wait_seconds":19}';

test("el 429 de Cavos cuenta los segundos y no muestra el error crudo", () => {
  const aviso = avisoDeIngreso(new Error(CRUDO_429));
  assert.equal(aviso.esperaSegundos, 19);
  assert.equal(aviso.texto, "Wait 19 s before requesting another code");
  assert.equal(aviso.texto.includes("kit/auth"), false);
  assert.equal(aviso.texto.includes("rate_limited"), false);
});

test("lee wait_seconds del JSON o de la frase en inglés", () => {
  assert.equal(avisoDeIngreso({ error: "rate_limited", wait_seconds: "8" }).esperaSegundos, 8);
  assert.equal(avisoDeIngreso(new Error("Please wait 12 seconds before requesting another code.")).esperaSegundos, 12);
  assert.equal(
    avisoDeIngreso('kit/auth: /api/oauth/firebase/otp/request -> 429 Please wait 12 seconds before requesting another code.').esperaSegundos,
    12,
  );
});

test("si el límite no trae segundos, espera un rato corto", () => {
  const aviso = avisoDeIngreso("kit/auth: /api/oauth/firebase/otp/request -> 429 too many");
  assert.equal(aviso.esperaSegundos, 20);
  assert.equal(aviso.texto, textoEspera(20));
});

test("redondea hacia arriba los segundos y arma el texto", () => {
  assert.equal(avisoDeIngreso({ error: "rate_limited", wait_seconds: 19.2 }).esperaSegundos, 20);
  assert.equal(textoEspera(0), "Wait 0 s before requesting another code");
});

test("código inválido o vencido", () => {
  const invalido = avisoDeIngreso(
    'kit/auth: /api/oauth/firebase/otp/verify -> 400 {"error":"invalid_code","message":"Invalid code"}',
  );
  assert.deepEqual(invalido, { texto: AVISO_CODIGO_INVALIDO, esperaSegundos: null });
  const vencido = avisoDeIngreso(new Error('{"error":"code_expired","message":"The code has expired"}'));
  assert.equal(vencido.texto, AVISO_CODIGO_VENCIDO);
  assert.equal(avisoDeIngreso(new Error("auth/invalid-verification-code")).texto, AVISO_CODIGO_INVALIDO);
  assert.equal(avisoDeIngreso(new Error("auth/code-expired")).texto, AVISO_CODIGO_VENCIDO);
});

test("red, ventana de Google y configuración", () => {
  assert.equal(avisoDeIngreso(new TypeError("Failed to fetch")).texto, AVISO_RED);
  assert.equal(avisoDeIngreso(new Error("auth/popup-closed-by-user")).texto, AVISO_GOOGLE_CERRADO);
  assert.equal(avisoDeIngreso(new Error("auth/popup-blocked")).texto, AVISO_GOOGLE_BLOQUEADO);
  assert.equal(avisoDeIngreso(new Error("Falta NEXT_PUBLIC_CAVOS_APP_ID")).texto, AVISO_CONFIG);
  assert.equal(avisoDeIngreso(new Error("Sign-in is waiting for the Cavos app id.")).texto, AVISO_CONFIG);
});

test("un origen que Cavos no permite no se dice como ingreso vencido ni filtra el host", () => {
  const crudo = "kit/vault: add https://preview.example to this app's allowed web origins in the Cavos dashboard";
  const aviso = avisoDeIngreso(new Error(crudo));
  assert.equal(aviso.texto, AVISO_ORIGEN_CAVOS);
  assert.equal(aviso.esperaSegundos, null);
  assert.equal(aviso.texto.includes("preview.example"), false);
  assert.equal(aviso.texto.includes("kit/vault"), false);
  assert.equal(aviso.texto.includes("expired"), false);
  assert.equal(avisoDeIngreso(new Error("kit/vault: https://vault.example did not load")).texto, AVISO_GENERICO);
});

test("un fallo desconocido no filtra el SDK", () => {
  const aviso = avisoDeIngreso(new Error("kit/auth: /api/oauth/firebase/otp/verify -> 500 {\"error\":\"internal\"}"));
  assert.equal(aviso.texto, AVISO_GENERICO);
  assert.equal(aviso.esperaSegundos, null);
  assert.equal(aviso.texto.includes("internal"), false);
  assert.equal(aviso.texto.includes("500"), false);
});

test("el mensaje de espera no se confunde con un código inválido", () => {
  const aviso = avisoDeIngreso(new Error(CRUDO_429));
  assert.equal(aviso.texto, textoEspera(19));
});

test("un 429 con wait_seconds no es un fallo de red", () => {
  const crudo =
    'kit/auth: /api/oauth/firebase/otp/request -> 429 {"error":"rate_limited","message":"Please wait 53 seconds before requesting another code.","wait_seconds":53}';
  const aviso = avisoDeIngreso(new Error(crudo));
  assert.equal(aviso.esperaSegundos, 53);
  assert.equal(aviso.texto, textoEspera(53));
  assert.notEqual(aviso.texto, AVISO_RED);
});

test("la espera más larga manda, y una fecha HTTP también cuenta", async () => {
  const ahora = Date.parse("2026-10-08T12:00:00.000Z");
  assert.equal(segundosDeRetryAfter("19"), 19);
  assert.equal(segundosDeRetryAfter("Thu, 08 Oct 2026 12:00:12 GMT", ahora), 12);
  assert.equal(segundosDeRetryAfter("no-es-un-plazo"), null);
  const conHeader = new Response(
    JSON.stringify({ error: "rate_limited", message: "Please wait 53 seconds before requesting another code.", wait_seconds: 53 }),
    { status: 429, headers: { "retry-after": "19", "content-type": "application/json" } },
  );
  assert.equal(await esperaDeRespuesta429(conHeader, ahora), 53);
  const soloHeader = new Response("too many", { status: 429, headers: { "retry-after": "19" } });
  assert.equal(await esperaDeRespuesta429(soloHeader, ahora), 19);
  const soloCuerpo = new Response(JSON.stringify({ error: "rate_limited", wait_seconds: 8 }), { status: 429 });
  assert.equal(await esperaDeRespuesta429(soloCuerpo, ahora), 8);
  const vacio = new Response("too many", { status: 429 });
  assert.equal(await esperaDeRespuesta429(vacio, ahora), 20);
  assert.equal(await esperaDeRespuesta429(new Response("no", { status: 500 }), ahora), null);
  const aceptado = new Response(JSON.stringify({ status: "sent" }), {
    status: 200,
    headers: { "retry-after": "45" },
  });
  assert.equal(await esperaDeclarada(aceptado, ahora), 45);
  assert.equal(await esperaDeclarada(new Response(JSON.stringify({ status: "sent" }), { status: 200 }), ahora), null);
});

test("un 502 de la ruta propia sin red sigue siendo falta de conexión", () => {
  const aviso = avisoDeIngreso('kit/auth: /api/ingreso/codigo -> 502 {"error":"upstream_unreachable"}');
  assert.equal(aviso.texto, AVISO_RED);
  assert.equal(aviso.esperaSegundos, null);
});

test("los segundos colgados del error ganan a un texto de red", () => {
  const error = new TypeError("Failed to fetch") as TypeError & { esperaSegundos?: number };
  error.esperaSegundos = 14;
  const aviso = avisoDeIngreso(error);
  assert.equal(aviso.esperaSegundos, 14);
  assert.equal(aviso.texto, textoEspera(14));
  assert.notEqual(aviso.texto, AVISO_RED);
});

test("valida el correo y marca el dominio de demo", () => {
  assert.equal(correoValido("organizador@demo.hyto"), true);
  assert.equal(correoValido("sin-arroba"), false);
  assert.equal(correoValido("a@b"), false);
  assert.equal(correoValido("  Ana@correo.com "), true);
  assert.equal(esCorreoDemo("Organizer@Demo.Hyto"), true);
  assert.equal(esCorreoDemo("ana@correo.com"), false);
  assert.equal(esCorreoDemo("ana@demo.hyto.evil"), false);
  assert.equal(AVISO_CORREO.includes("valid email"), true);
});

test("los errores de la recuperación de Cavos (enclave) tienen un aviso claro al entrar", async () => {
  const { AVISO_METODO_RECUPERACION, AVISO_SIN_RESPALDO } = await import("./errores");
  assert.equal(
    avisoDeIngreso(new Error("kit/stellar: this wallet is protected by recovery. Sign in with Google, Apple or an email link to continue.")).texto,
    AVISO_METODO_RECUPERACION,
  );
  assert.equal(
    avisoDeIngreso(new Error("kit/secret: this wallet has no sealed recovery. Open it once on the device that created it.")).texto,
    AVISO_SIN_RESPALDO,
  );
});
