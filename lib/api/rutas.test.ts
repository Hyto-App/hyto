import assert from "node:assert/strict";
import test from "node:test";
import { GET as leerEscrowHttp } from "../../app/api/escrow/[contrato]/route";
import { POST as enviarFirma } from "../../app/api/firma/enviar/route";
import { POST as prepararFirma } from "../../app/api/firma/route";
import { crearFotosMemoria } from "../blob/fotos";
import { crearMemoria } from "../db/memoria";
import { publicarEvidenciaHttp, leerEvidenciaHttp, leerFotoHttp } from "./evidencias";
import { informeHttp } from "./informe";
import { crearProyectoHttp } from "./proyectos";
import { leerRevisionHttp } from "./revision";
import { crearSesionHttp, fijarWalletHttp } from "./sesion";
import { enviarFirmaHttp, prepararFirmaHttp } from "./firma";
import { listarTareasHttp } from "./tareas";
import type { SesionFila } from "../db/tipos";
import { reiniciarLimite } from "../escrow/limite";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeInvocacion } from "../escrow/prueba-xdr";

function token(email: string): string {
  return `aaaa.${Buffer.from(JSON.stringify({ sub: "cavos-1", email })).toString("base64url")}.bbbb`;
}

test("las tareas de ZEEK salen de la base", async () => {
  const respuesta = await listarTareasHttp(crearMemoria());
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get("content-type") ?? "", /json/);
  const json = (await respuesta.json()) as { tareas: { id: string; tipo: string; monto: string; tope: string | null }[] };
  assert.deepEqual(
    json.tareas.map((tarea) => tarea.id),
    ["stand", "registro", "bienvenida", "comida"],
  );
  assert.equal(json.tareas[0]?.monto, "20");
  assert.equal(json.tareas[3]?.tipo, "reembolso");
  assert.equal(json.tareas[3]?.tope, "15");
});

test("la foto queda guardada y el reembolso trae monto y fecha", async () => {
  const almacen = crearMemoria();
  const fotos = crearFotosMemoria();
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "comida");
  cuerpo.set("foto", new Blob([Uint8Array.from([1, 2, 3])], { type: "image/jpeg" }), "evidencia.jpg");
  const creada = await publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), {
    almacen,
    fotos,
  });
  assert.equal(creada.status, 201);
  const json = (await creada.json()) as { evidencia: { id: string; monto: string; fecha: string; blobId: string } };
  assert.equal(json.evidencia.monto, "12.40");
  assert.equal(json.evidencia.fecha, "2026-09-27");

  const lectura = await leerEvidenciaHttp(almacen, json.evidencia.id);
  const leida = (await lectura.json()) as { evidencia: { monto: string } };
  assert.equal(leida.evidencia.monto, "12.40");

  const foto = await leerFotoHttp(almacen, fotos, json.evidencia.id);
  assert.equal(foto.headers.get("content-type"), "image/jpeg");
  assert.equal((await foto.arrayBuffer()).byteLength, 3);

  const tarea = await almacen.leerTarea("comida");
  assert.equal(tarea?.estado, "en revisión");
});

test("un archivo que no es imagen no pasa", async () => {
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "stand");
  cuerpo.set("foto", new Blob(["hola"], { type: "text/plain" }), "nota.txt");
  const respuesta = await publicarEvidenciaHttp(
    new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }),
    { almacen: crearMemoria(), fotos: crearFotosMemoria() },
  );
  assert.equal(respuesta.status, 400);
});

test("el informe abre sin hash y Ver pago usa el hash cuando existe", async () => {
  const almacen = crearMemoria();
  const vacio = await informeHttp(almacen);
  assert.equal(vacio.status, 200);
  const primero = (await vacio.json()) as { nombre: string; ejemplo: boolean; tareas: { hashPago: string | null }[]; resumen: { presupuesto: string } };
  assert.equal(primero.nombre, "ZEEK");
  assert.equal(primero.ejemplo, false);
  assert.equal(primero.resumen.presupuesto, "75");
  assert.equal(primero.tareas.every((tarea) => tarea.hashPago === null), true);

  const hash = "a".repeat(64);
  await almacen.actualizarTarea("stand", { hashPago: hash, estado: "pagado" });
  const conPago = (await (await informeHttp(almacen)).json()) as {
    tareas: { id: string; hashPago: string | null }[];
  };
  assert.equal(conPago.tareas.find((tarea) => tarea.id === "stand")?.hashPago, hash);

  const revision = (await (await leerRevisionHttp(almacen, crearFotosMemoria(), "stand")).json()) as { enlacePago: string | null };
  assert.equal(revision.enlacePago, `https://stellar.expert/explorer/testnet/tx/${hash}`);
});

test("la revisión de un trabajo sin clave usa el guion", async () => {
  const almacen = crearMemoria();
  const fotos = crearFotosMemoria();
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "stand");
  cuerpo.set("foto", new Blob([Uint8Array.from([9])], { type: "image/png" }), "evidencia.jpg");
  await publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), { almacen, fotos });
  const json = (await (await leerRevisionHttp(almacen, fotos, "stand")).json()) as {
    tarea: { veredicto: string; frase: string; estado: string };
    foto: string;
    enlacePago: string | null;
  };
  assert.equal(json.tarea.veredicto, "parcial");
  assert.equal(json.tarea.estado, "en revisión");
  assert.match(json.tarea.frase, /Mesa armada/);
  assert.match(json.foto, /^\/api\/evidencias\/.+\/foto$/);
  assert.equal(json.enlacePago, null);
});

test("un proyecto nuevo entra por la ruta", async () => {
  const almacen = crearMemoria();
  const respuesta = await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nombre: "Prueba",
        tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8", condicion: "Cajas cerradas", miembroId: "voluntario-2" }],
      }),
    }),
    almacen,
  );
  assert.equal(respuesta.status, 201);
  const tareas = (await (await listarTareasHttp(almacen)).json()) as { tareas: { titulo: string }[] };
  assert.equal(tareas.tareas.some((tarea) => tarea.titulo === "Cajas"), true);
});

test("la sesión sale del correo y el pago exige al organizador", async () => {
  const almacen = crearMemoria();
  const ajeno = await crearSesionHttp(
    new Request("http://local/api/sesion", {
      method: "POST",
      body: JSON.stringify({ email: "nadie@demo.hyto", token: token("nadie@demo.hyto") }),
    }),
    almacen,
  );
  assert.equal(ajeno.status, 403);

  const propia = await crearSesionHttp(
    new Request("http://local/api/sesion", {
      method: "POST",
      body: JSON.stringify({ email: "organizador@demo.hyto", token: token("organizador@demo.hyto") }),
    }),
    almacen,
  );
  assert.equal(propia.status, 200);
  assert.match(propia.headers.get("set-cookie") ?? "", /hyto_sesion=/);
  const cuerpo = (await propia.json()) as { rol: string };
  assert.equal(cuerpo.rol, "organizador");

  const sinSesion = await prepararFirma(new Request("http://local/api/firma", { method: "POST", body: "{}" }));
  assert.equal(sinSesion.status, 401);
  const envio = await enviarFirma(new Request("http://local/api/firma/enviar", { method: "POST", body: "{}" }));
  assert.equal(envio.status, 401);
});

test("sin sesión no se prepara la firma ni se lee el escrow", async () => {
  let llamadas = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    llamadas += 1;
    throw new Error("no hay que llamar a Trustless");
  };
  const contrato = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const base = {
    contrato,
    firmante: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    indice: 0,
    motivo: "La foto no coincide.",
    distribuciones: [{ direccion: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", monto: 1 }],
  };
  try {
    for (const accion of ["liberar", "aprobar", "disputar", "resolver"] as const) {
      const respuesta = await prepararFirma(
        new Request("http://local/api/firma", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...base, accion }),
        }),
      );
      assert.equal(respuesta.status, 401);
    }
    const lectura = await leerEscrowHttp(new Request(`http://local/api/escrow/${contrato}`), {
      params: Promise.resolve({ contrato }),
    });
    assert.equal(lectura.status, 401);
    assert.equal(llamadas, 0);
  } finally {
    globalThis.fetch = original;
  }
});

const CONTRATO = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const ORGANIZADOR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const RESOLUTOR = "GEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";

function sesion(rol: SesionFila["rol"], wallet: string): SesionFila {
  return {
    token: "tok",
    email: "alguien@demo.hyto",
    usuarioId: rol,
    rol,
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet,
  };
}

test("resolver no arma ni envía el XDR si la wallet de la sesión no es el firmante", async () => {
  reiniciarLimite();
  let llamadas = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    llamadas += 1;
    throw new Error("no hay que llamar a Trustless");
  };
  const cuerpo = {
    accion: "resolver",
    contrato: CONTRATO,
    firmante: RESOLUTOR,
    indice: 0,
    distribuciones: [{ direccion: RECEPTOR, monto: 1 }],
  };
  try {
    const sinWallet = await prepararFirmaHttp(
      sesion("organizador", ""),
      new Request("http://local/api/firma", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
      }),
    );
    assert.equal(sinWallet.status, 400);
    assert.match(((await sinWallet.json()) as { aviso: string }).aviso, /no puede resolver/);

    const otra = await prepararFirmaHttp(
      sesion("organizador", ORGANIZADOR),
      new Request("http://local/api/firma", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
      }),
    );
    assert.equal(otra.status, 400);
    assert.match(((await otra.json()) as { aviso: string }).aviso, /firmante/);

    const envio = await enviarFirmaHttp(
      sesion("organizador", ORGANIZADOR),
      new Request("http://local/api/firma/enviar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          xdr: xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "resolve_dispute", firmante: FIRMANTE_XDR }),
          accion: "resolver",
          firmante: ORGANIZADOR,
        }),
      }),
    );
    assert.equal(envio.status, 400);
    assert.equal(llamadas, 0);
  } finally {
    globalThis.fetch = original;
    reiniciarLimite();
  }
});

test("la sesión cuya wallet es el resolutor prepara el XDR", async () => {
  reiniciarLimite();
  const anterior = process.env.TRUSTLESS_API_KEY;
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  const original = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const metodo = init?.method ?? "GET";
    if (metodo === "GET") {
      return new Response(
        JSON.stringify({
          contractId: CONTRATO,
          roles: { disputeResolvers: [RESOLUTOR] },
          milestones: [{ amount: "1", dispute: { isDisputed: true, resolved: false } }],
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ unsignedXdr: "AAAA", txHash: "abc" }), { status: 200 });
  };
  try {
    const listo = await prepararFirmaHttp(
      sesion("voluntario", RESOLUTOR),
      new Request("http://local/api/firma", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accion: "resolver",
          contrato: CONTRATO,
          firmante: RESOLUTOR,
          indice: 0,
          distribuciones: [{ direccion: RECEPTOR, monto: 1 }],
        }),
      }),
    );
    assert.equal(listo.status, 200);
    assert.equal(((await listo.json()) as { xdr: string }).xdr, "AAAA");
  } finally {
    globalThis.fetch = original;
    if (anterior === undefined) delete process.env.TRUSTLESS_API_KEY;
    else process.env.TRUSTLESS_API_KEY = anterior;
    reiniciarLimite();
  }
});

test("el envío de resolve_dispute usa el firmante del XDR y el disputeResolver leído", async () => {
  reiniciarLimite();
  const anterior = process.env.TRUSTLESS_API_KEY;
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  const original = globalThis.fetch;
  const llamadas: string[] = [];
  globalThis.fetch = async (input, init) => {
    const metodo = init?.method ?? "GET";
    llamadas.push(metodo);
    if (metodo === "GET") {
      return new Response(
        JSON.stringify({
          contractId: CONTRATO_XDR,
          roles: { disputeResolvers: [FIRMANTE_XDR] },
          milestones: [{ amount: "1", dispute: { isDisputed: true, resolved: false } }],
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ status: "SUCCESS", txHash: "abc" }), { status: 200 });
  };
  const xdr = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "resolve_dispute", firmante: FIRMANTE_XDR });
  try {
    const ajeno = await enviarFirmaHttp(
      sesion("voluntario", ORGANIZADOR),
      new Request("http://local/api/firma/enviar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ xdr, accion: "resolver", firmante: ORGANIZADOR }),
      }),
    );
    assert.equal(ajeno.status, 400);
    assert.deepEqual(llamadas, []);

    const otroRol = await enviarFirmaHttp(
      sesion("voluntario", FIRMANTE_XDR),
      new Request("http://local/api/firma/enviar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          xdr: xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "release_funds", firmante: FIRMANTE_XDR }),
          accion: "resolver",
          firmante: RESOLUTOR,
        }),
      }),
    );
    assert.equal(otroRol.status, 403);
    assert.deepEqual(llamadas, []);

    const listo = await enviarFirmaHttp(
      sesion("voluntario", FIRMANTE_XDR),
      new Request("http://local/api/firma/enviar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ xdr, accion: "liberar", firmante: ORGANIZADOR }),
      }),
    );
    assert.equal(listo.status, 200);
    assert.deepEqual(llamadas, ["GET", "POST"]);
  } finally {
    globalThis.fetch = original;
    if (anterior === undefined) delete process.env.TRUSTLESS_API_KEY;
    else process.env.TRUSTLESS_API_KEY = anterior;
    reiniciarLimite();
  }
});

test("resolve_dispute no se envía si la wallet de la sesión no es disputeResolver", async () => {
  reiniciarLimite();
  const anterior = process.env.TRUSTLESS_API_KEY;
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  const original = globalThis.fetch;
  const metodos: string[] = [];
  globalThis.fetch = async (_input, init) => {
    metodos.push(init?.method ?? "GET");
    return new Response(
      JSON.stringify({
        contractId: CONTRATO_XDR,
        roles: { disputeResolvers: [ORGANIZADOR] },
        milestones: [{ dispute: { isDisputed: true, resolved: false } }],
      }),
      { status: 200 },
    );
  };
  try {
    const respuesta = await enviarFirmaHttp(
      sesion("voluntario", FIRMANTE_XDR),
      new Request("http://local/api/firma/enviar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          xdr: xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "resolve_dispute", firmante: FIRMANTE_XDR }),
          accion: "resolver",
          firmante: FIRMANTE_XDR,
        }),
      }),
    );
    assert.equal(respuesta.status, 403);
    assert.equal(((await respuesta.json()) as { codigo: string }).codigo, "ESCROW_ONLY_DISPUTE_RESOLVER_CAN_EXECUTE");
    assert.deepEqual(metodos, ["GET"]);
  } finally {
    globalThis.fetch = original;
    if (anterior === undefined) delete process.env.TRUSTLESS_API_KEY;
    else process.env.TRUSTLESS_API_KEY = anterior;
    reiniciarLimite();
  }
});

test("la wallet de la sesión se guarda para poder resolver", async () => {
  const almacen = crearMemoria();
  await almacen.crearSesion({
    token: "tok-wallet",
    email: "voluntario1@demo.hyto",
    usuarioId: "voluntario-1",
    rol: "voluntario",
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet: "",
  });
  const respuesta = await fijarWalletHttp(
    new Request("http://local/api/sesion/wallet", {
      method: "POST",
      headers: { cookie: "hyto_sesion=tok-wallet", "content-type": "application/json" },
      body: JSON.stringify({ wallet: RESOLUTOR }),
    }),
    almacen,
  );
  assert.equal(respuesta.status, 200);
  assert.equal((await almacen.leerSesion("tok-wallet"))?.wallet, RESOLUTOR);

  const otra = await fijarWalletHttp(
    new Request("http://local/api/sesion/wallet", {
      method: "POST",
      headers: { cookie: "hyto_sesion=tok-wallet", "content-type": "application/json" },
      body: JSON.stringify({ wallet: ORGANIZADOR }),
    }),
    almacen,
  );
  assert.equal(otra.status, 400);
  assert.equal((await almacen.leerSesion("tok-wallet"))?.wallet, RESOLUTOR);
});

test("si el ingreso trae wallet, no se guarda otra", async () => {
  const almacen = crearMemoria();
  const cuenta = ORGANIZADOR;
  const ingreso = await crearSesionHttp(
    new Request("http://local/api/sesion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "organizador@demo.hyto",
        token: `aaaa.${Buffer.from(JSON.stringify({ sub: "cavos-1", email: "organizador@demo.hyto", wallet: cuenta })).toString("base64url")}.bbbb`,
      }),
    }),
    almacen,
  );
  assert.equal(ingreso.status, 200);
  const cookie = ingreso.headers.get("set-cookie") ?? "";
  const token = /hyto_sesion=([^;]+)/.exec(cookie)?.[1] ?? "";
  assert.equal((await almacen.leerSesion(token))?.wallet, cuenta);
  const respuesta = await fijarWalletHttp(
    new Request("http://local/api/sesion/wallet", {
      method: "POST",
      headers: { cookie: `hyto_sesion=${token}`, "content-type": "application/json" },
      body: JSON.stringify({ wallet: RESOLUTOR }),
    }),
    almacen,
  );
  assert.equal(respuesta.status, 400);
  assert.equal((await almacen.leerSesion(token))?.wallet, cuenta);
});
