import assert from "node:assert/strict";
import test from "node:test";
import type { SesionFila } from "@/lib/db/tipos";
import { USDC } from "@/lib/integrante/identidades";
import { AVISO_ALTA_SOLO_SIGNUP, publicarAltaHttp } from "./alta";

const DIRECCION = `G${"C".repeat(55)}`;

function sesion(wallet = DIRECCION): SesionFila {
  return {
    token: "tok-alta",
    email: "nueva@hyto.app",
    usuarioId: "u-nueva",
    rol: "voluntario",
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet,
  };
}

function pedido(cookie = ""): Request {
  return new Request("http://local/api/sesion/alta", {
    method: "POST",
    headers: cookie ? { cookie } : {},
  });
}

test("Sign in no puede fondear: sin la cookie de alta no hay Friendbot", async () => {
  const llamadas: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    llamadas.push(String(input));
    return new Response("no", { status: 500 });
  };
  const respuesta = await publicarAltaHttp(sesion(), pedido(), fetchImpl, async () => {});
  assert.equal(respuesta.status, 403);
  assert.equal((await respuesta.json()).aviso, AVISO_ALTA_SOLO_SIGNUP);
  assert.deepEqual(llamadas, []);
});

test("el alta llama a Friendbot solo cuando la cuenta de testnet no existe", async () => {
  const llamadas: string[] = [];
  let horizon = 0;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    llamadas.push(url);
    if (url.startsWith("https://friendbot.stellar.org")) return new Response("ok", { status: 200 });
    horizon += 1;
    if (horizon === 1) return new Response("missing", { status: 404 });
    return new Response(JSON.stringify({ balances: [] }), { status: 200 });
  };
  const creada = await publicarAltaHttp(sesion(), pedido("hyto_alta=1"), fetchImpl, async () => {});
  assert.equal(creada.status, 200);
  assert.deepEqual(await creada.json(), { cuenta: true, friendbot: true, usdc: false });
  assert.equal(llamadas.filter((url) => url.startsWith("https://friendbot.stellar.org")).length, 1);

  const otra = llamadas.length;
  const existe: typeof fetch = async (input) => {
    llamadas.push(String(input));
    return new Response(
      JSON.stringify({ balances: [{ asset_code: USDC.code, asset_issuer: USDC.issuer }] }),
      { status: 200 },
    );
  };
  const lista = await publicarAltaHttp(sesion(), pedido("hyto_alta=1"), existe, async () => {});
  assert.equal(lista.status, 200);
  assert.deepEqual(await lista.json(), { cuenta: true, friendbot: false, usdc: true });
  assert.equal(llamadas.slice(otra).some((url) => url.includes("friendbot")), false);
});
