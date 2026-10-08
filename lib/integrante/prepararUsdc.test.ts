import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Revision } from "../../components/admin/Revision";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { PrepararUsdc } from "../../components/sesion/PrepararUsdc";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import {
  AVISO_DISPOSITIVO,
  AVISO_PASSKEY,
  AVISO_RECHAZO,
  AVISO_REINGRESO,
  type BilleteraSesion,
  ErrorFirmaCliente,
} from "../escrow/firmarCliente";
import { mensajeClaro } from "../ui/claro";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";
import {
  AVISO_USDC_LENTO,
  AVISO_USDC_OTRA_CUENTA,
  AVISO_USDC_SECUENCIA,
  AVISO_USDC_SIN_XLM,
  CODIGO_USDC_SIN_XLM,
} from "./avisosUsdc";
import { USDC } from "./identidades";
import { prepararUsdcDeSesion } from "./prepararUsdc";

const WALLET = "G" + "A".repeat(55);
const OTRA = "G" + "B".repeat(55);

const avisos: string[] = [];
const warnOriginal = console.warn;

beforeEach(() => {
  avisos.length = 0;
  console.warn = (...partes: unknown[]) => {
    avisos.push(partes.map(String).join(" "));
  };
});

afterEach(() => {
  console.warn = warnOriginal;
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type Accion = "leer" | "preparar" | "enviar";

function servidor(responder: (accion: Accion, cuerpo: Record<string, unknown>) => Response | Promise<Response>) {
  const vistos: Accion[] = [];
  const cuerpos: Record<string, unknown>[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    if (!init?.method || init.method === "GET") {
      vistos.push("leer");
      return responder("leer", {});
    }
    const cuerpo = JSON.parse(String(init.body)) as Record<string, unknown>;
    const accion = cuerpo.accion === "enviar" ? "enviar" : "preparar";
    vistos.push(accion);
    cuerpos.push(cuerpo);
    return responder(accion, cuerpo);
  };
  return { fetch: fetchImpl, vistos, cuerpos };
}

type Falsa = BilleteraSesion & { llamadas: string[] };

function billetera(cambios: Partial<BilleteraSesion> = {}): Falsa {
  const llamadas: string[] = [];
  return {
    address: WALLET,
    status: "ready",
    llamadas,
    async signXdr(xdr) {
      llamadas.push(`firmar:${xdr}`);
      return "SIGNED";
    },
    async addTrustline(asset) {
      llamadas.push(`trustline:${asset.code}:${asset.issuer}`);
      return "hash-patrocinado";
    },
    ...cambios,
  };
}

const conCuenta = (cuenta: BilleteraSesion) => async () => cuenta;

test("la sesión firma el XDR y después lo envía", async () => {
  const red = servidor((accion, cuerpo) => {
    if (accion === "preparar") return json({ xdr: "UNSIGNED", wallet: WALLET });
    assert.equal(cuerpo.xdr, "SIGNED");
    return json({ listo: true, hash: "abc" });
  });
  const cuenta = billetera();
  const listo = await prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(cuenta) });
  assert.equal(listo.hash, "abc");
  assert.deepEqual(red.vistos, ["preparar", "enviar"]);
  assert.deepEqual(cuenta.llamadas, ["firmar:UNSIGNED"]);
  assert.deepEqual(avisos, []);
});

test("si la trustline ya existe no se abre Cavos", async () => {
  let conexiones = 0;
  const red = servidor(() => json({ listo: true }));
  const listo = await prepararUsdcDeSesion({
    fetch: red.fetch,
    conectar: async () => {
      conexiones += 1;
      return billetera();
    },
  });
  assert.equal(listo.hash, null);
  assert.equal(conexiones, 0);
  assert.deepEqual(red.vistos, ["preparar"]);
});

test("sin conectar usa la misma ruta de Cavos que el escrow", async () => {
  const red = servidor(() => json({ xdr: "UNSIGNED", wallet: WALLET }));
  await assert.rejects(() => prepararUsdcDeSesion({ fetch: red.fetch }), /isn't set up yet/);
});

test("una cuenta antigua sin su clave en este navegador da un aviso que dice qué hacer y no firma", async () => {
  const red = servidor(() => json({ xdr: "UNSIGNED", wallet: WALLET }));
  const cuenta = billetera({ status: "needs-device-approval" });
  await assert.rejects(
    () => prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(cuenta) }),
    (error: unknown) => error instanceof Error && error.message === AVISO_DISPOSITIVO,
  );
  assert.deepEqual(cuenta.llamadas, []);
  assert.deepEqual(red.vistos, ["preparar"]);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0] ?? "", /^\[usdc\] .*needs-device-approval/);
  assert.doesNotMatch(mensajeClaro(AVISO_DISPOSITIVO), /didn't go through/);
});

test("con una llave de acceso guardada, un navegador sin la clave pide usarla en vez de mandar al navegador original", async () => {
  const red = servidor(() => json({ xdr: "UNSIGNED", wallet: WALLET }));
  const cuenta = billetera({ status: "needs-device-approval", passkeyRestore: true });
  await assert.rejects(
    () => prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(cuenta) }),
    (error: unknown) => error instanceof Error && error.message === AVISO_PASSKEY,
  );
  assert.deepEqual(cuenta.llamadas, []);
  assert.deepEqual(red.vistos, ["preparar"]);
  assert.equal(mensajeClaro(AVISO_PASSKEY), AVISO_PASSKEY);
});

test("un navegador que recuperó la clave con la llave de acceso firma como el original", async () => {
  const red = servidor((accion) => (accion === "preparar" ? json({ xdr: "UNSIGNED", wallet: WALLET }) : json({ listo: true, hash: "h" })));
  const cuenta = billetera({ status: "ready", passkeyRestore: true });
  const listo = await prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(cuenta) });
  assert.equal(listo.hash, "h");
  assert.deepEqual(cuenta.llamadas, ["firmar:UNSIGNED"]);
});

test("el error crudo de Cavos no llega a la pantalla y la consola lo guarda sin correo ni token", async () => {
  const red = servidor(() => json({ xdr: "UNSIGNED", wallet: WALLET }));
  const sinClave = billetera({
    signXdr: async () => {
      throw new Error("kit/stellar: this device is not an authorized signer of the wallet");
    },
  });
  await assert.rejects(
    () => prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(sinClave) }),
    (error: unknown) => error instanceof Error && error.message === AVISO_DISPOSITIVO,
  );

  avisos.length = 0;
  const token = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhbmEifQ.firma";
  const rara = billetera({
    signXdr: async () => {
      throw new Error(`kit/stellar: spend key does not match the derived address for ana@hyto.app ${token}`);
    },
  });
  let visible = "";
  await assert.rejects(
    () => prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(rara) }),
    (error: unknown) => {
      visible = error instanceof Error ? error.message : "";
      return visible === "We couldn't confirm the payout setup. Try again.";
    },
  );
  assert.doesNotMatch(mensajeClaro(visible), /didn't go through/);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0] ?? "", /spend key does not match/);
  assert.match(avisos[0] ?? "", /\[email\]/);
  assert.match(avisos[0] ?? "", /\[token\]/);
  assert.doesNotMatch(avisos[0] ?? "", /ana@hyto\.app|eyJ/);
});

test("si Cavos abre otra cuenta que la de la sesión, no firma", async () => {
  const red = servidor(() => json({ xdr: "UNSIGNED", wallet: WALLET }));
  const otra = billetera({ address: OTRA });
  await assert.rejects(
    () => prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(otra) }),
    (error: unknown) => error instanceof Error && error.message === AVISO_USDC_OTRA_CUENTA,
  );
  assert.deepEqual(otra.llamadas, []);
});

test("una cuenta antigua patrocinada sin XLM abre USDC con el relayer de Cavos", async () => {
  const red = servidor(() => json({ aviso: AVISO_USDC_SIN_XLM, codigo: CODIGO_USDC_SIN_XLM, wallet: WALLET }, 409));
  const cuenta = billetera();
  const listo = await prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(cuenta) });
  assert.equal(listo.hash, "hash-patrocinado");
  assert.deepEqual(cuenta.llamadas, [`trustline:${USDC.code}:${USDC.issuer}`]);
  assert.deepEqual(red.vistos, ["preparar"]);
});

test("si Horizon rechaza el envío por falta de XLM, también pasa al relayer", async () => {
  const red = servidor((accion) =>
    accion === "preparar"
      ? json({ xdr: "UNSIGNED", wallet: WALLET })
      : json({ aviso: AVISO_USDC_SIN_XLM, codigo: CODIGO_USDC_SIN_XLM, wallet: WALLET }, 409),
  );
  const cuenta = billetera();
  const listo = await prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(cuenta) });
  assert.equal(listo.hash, "hash-patrocinado");
  assert.deepEqual(cuenta.llamadas, ["firmar:UNSIGNED", `trustline:${USDC.code}:${USDC.issuer}`]);
  assert.deepEqual(red.vistos, ["preparar", "enviar"]);
});

test("si el relayer falla, se revisa si la trustline quedó y si no, se dice qué hacer", async () => {
  const caido = billetera({
    addTrustline: async () => {
      throw new Error("kit/stellar: relay failed (400) transaction rejected");
    },
  });

  let listoEnLedger = true;
  const red = servidor((accion) =>
    accion === "leer"
      ? json({ listo: listoEnLedger })
      : json({ aviso: AVISO_USDC_SIN_XLM, codigo: CODIGO_USDC_SIN_XLM, wallet: WALLET }, 409),
  );
  const listo = await prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(caido) });
  assert.equal(listo.hash, null);
  assert.deepEqual(red.vistos, ["preparar", "leer"]);

  listoEnLedger = false;
  await assert.rejects(
    () => prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(caido) }),
    (error: unknown) => error instanceof Error && error.message === AVISO_USDC_SIN_XLM,
  );
  assert.match(avisos.at(-1) ?? "", /relay failed \(400\)/);
});

test("si la respuesta del envío se pierde, se revisa el estado antes de dar error", async () => {
  let listoEnLedger = true;
  const fetchImpl: typeof fetch = async (_input, init) => {
    if (init?.method === "GET") return json({ listo: listoEnLedger });
    const cuerpo = JSON.parse(String(init?.body)) as { accion?: string };
    if (cuerpo.accion === "preparar") return json({ xdr: "UNSIGNED", wallet: WALLET });
    throw new TypeError("Failed to fetch");
  };
  const listo = await prepararUsdcDeSesion({ fetch: fetchImpl, conectar: conCuenta(billetera()) });
  assert.equal(listo.hash, null);

  listoEnLedger = false;
  await assert.rejects(
    () => prepararUsdcDeSesion({ fetch: fetchImpl, conectar: conCuenta(billetera()) }),
    /couldn't get this account ready/,
  );
});

test("si Cavos no contesta, el botón no queda en Getting ready para siempre", async () => {
  const red = servidor(() => json({ xdr: "UNSIGNED", wallet: WALLET }));
  await assert.rejects(
    () => prepararUsdcDeSesion({ fetch: red.fetch, conectar: () => new Promise<BilleteraSesion>(() => undefined), topeMs: 20 }),
    (error: unknown) => error instanceof Error && error.message === AVISO_USDC_LENTO,
  );
  const colgada = billetera({ signXdr: () => new Promise<string>(() => undefined) });
  await assert.rejects(
    () => prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(colgada), topeMs: 20 }),
    (error: unknown) => error instanceof Error && error.message === AVISO_USDC_LENTO,
  );
  assert.deepEqual(red.vistos, ["preparar", "preparar"]);
});

test("un rechazo de firma queda en inglés y no se registra como fallo", async () => {
  const red = servidor(() => json({ xdr: "UNSIGNED", wallet: WALLET }));
  const cuenta = billetera({
    signXdr: async () => {
      throw new ErrorFirmaCliente(AVISO_RECHAZO);
    },
  });
  await assert.rejects(() => prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(cuenta) }), /cancelled the confirmation/);
  assert.deepEqual(avisos, []);
});

test("el aviso del servidor llega tal cual al botón", async () => {
  const red = servidor((accion) =>
    accion === "preparar" ? json({ xdr: "UNSIGNED", wallet: WALLET }) : json({ aviso: AVISO_USDC_SECUENCIA }, 409),
  );
  await assert.rejects(
    () => prepararUsdcDeSesion({ fetch: red.fetch, conectar: conCuenta(billetera()) }),
    (error: unknown) => error instanceof Error && error.message === AVISO_USDC_SECUENCIA,
  );
});

test("el botón muestra listo, preparando, hecho y error", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(PrepararUsdc, { consultar: async () => true, preparar: async () => ({ hash: null }) }));
    assert.match(texto(), /Ready to be paid/);
    assert.equal(document.querySelector("button"), null);

    let resolver: (valor: { hash: string | null }) => void = () => undefined;
    await montar(
      createElement(PrepararUsdc, {
        consultar: async () => false,
        preparar: () =>
          new Promise<{ hash: string | null }>((ok) => {
            resolver = ok;
          }),
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /Get ready to be paid/);
    assert.match(texto(), /open it on the test network first/);
    await pulsar("Get ready to be paid");
    assert.match(texto(), /Getting ready…/);
    await act(async () => {
      resolver({ hash: "abc" });
    });
    assert.match(texto(), /Payout account ready/);
    assert.match(texto(), /View on blockchain/);

    await montar(
      createElement(PrepararUsdc, {
        consultar: async () => false,
        preparar: async () => {
          throw new Error("Could not submit the USDC trustline.");
        },
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    await pulsar("Get ready to be paid");
    assert.match(texto(), /couldn't finish setting up payouts/);
    assert.match(texto(), /Get ready to be paid/);
    assert.equal(document.querySelector('a[href="/?signin=1"]'), null);

    await montar(
      createElement(PrepararUsdc, {
        consultar: async () => false,
        preparar: async () => {
          throw new Error(AVISO_REINGRESO);
        },
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    await pulsar("Get ready to be paid");
    assert.match(texto(), /sign-in expired/);
    assert.equal(document.querySelector('a[href="/?signin=1"]')?.textContent, "Sign in again");
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("los avisos de cuenta antigua se leen en el botón y solo ofrecen volver a entrar cuando eso ayuda", async () => {
  limpiarPantalla();
  async function fallarCon(aviso: string): Promise<void> {
    await montar(
      createElement(PrepararUsdc, {
        consultar: async () => false,
        preparar: async () => {
          throw new Error(aviso);
        },
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    await pulsar("Get ready to be paid");
  }
  try {
    await fallarCon(AVISO_DISPOSITIVO);
    assert.match(texto(), /Set up this device in 4 steps/);
    assert.match(texto(), /Open Account where you signed up/);
    assert.match(texto(), /localhost\/account/);
    assert.match(texto(), /Tap Add a passkey, then Create passkey/);
    assert.match(texto(), /Use a phone or tablet/);
    assert.match(texto(), /Tap Try again, then choose Use passkey/);
    assert.match(texto(), /Don't remember where you signed up\?/);
    assert.equal(document.querySelectorAll(".hyto-guia-paso").length, 4);
    assert.doesNotMatch(texto(), /didn't go through/);
    assert.equal(document.querySelector('a[href="/?signin=1"]'), null);
    const botones = [...document.querySelectorAll("button")].map((boton) => boton.textContent);
    assert.ok(botones.includes("Try again"));
    assert.ok(botones.includes("Copy link"));
    assert.ok(!botones.includes("Get ready to be paid"));

    await fallarCon(AVISO_USDC_SIN_XLM);
    assert.match(texto(), /no test XLM for the network fee/);
    assert.doesNotMatch(texto(), /Add some and try again/);

    await fallarCon(AVISO_USDC_OTRA_CUENTA);
    assert.match(texto(), /different payout account/);
    assert.equal(document.querySelector('a[href="/?signin=1"]')?.textContent, "Sign in again");
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("la guía de llave de acceso copia el enlace a Cuenta y Try again repite el paso", async () => {
  limpiarPantalla();
  let intentos = 0;
  let copiado: string | null = null;
  const portapapeles = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (valor: string) => {
        copiado = valor;
      },
    },
  });
  try {
    await montar(
      createElement(PrepararUsdc, {
        consultar: async () => false,
        preparar: async () => {
          intentos += 1;
          if (intentos === 1) throw new Error(AVISO_DISPOSITIVO);
          return { hash: null };
        },
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    await pulsar("Get ready to be paid");
    await pulsar("Copy link");
    await act(async () => {
      await Promise.resolve();
    });
    assert.equal(copiado, "http://localhost/account?add=passkey#passkey");
    assert.match(texto(), /Link copied/);
    await pulsar("Try again");
    await act(async () => {
      await Promise.resolve();
    });
    assert.equal(intentos, 2);
    assert.match(texto(), /Payout account ready/);
    assert.doesNotMatch(texto(), /Set up this device/);
  } finally {
    if (portapapeles) Object.defineProperty(navigator, "clipboard", portapapeles);
    else delete (navigator as { clipboard?: unknown }).clipboard;
    await desmontar();
    limpiarPantalla();
  }
});

test("Sign in again cierra la sesión y vuelve a la misma página después de entrar", async () => {
  limpiarPantalla();
  window.history.replaceState(null, "", "/eventos");
  const destinos: string[] = [];
  const llamadas: string[] = [];
  const asignar = window.location.assign.bind(window.location);
  window.location.assign = ((url: string | URL) => {
    destinos.push(String(url));
  }) as Location["assign"];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    llamadas.push(`${init?.method ?? "GET"} ${String(input)}`);
    return json({ ok: true });
  };
  try {
    await montar(
      createElement(PrepararUsdc, {
        consultar: async () => false,
        preparar: async () => {
          throw new Error(AVISO_REINGRESO);
        },
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    await pulsar("Get ready to be paid");
    const enlace = [...document.querySelectorAll("a")].find((item) => item.textContent === "Sign in again");
    assert.ok(enlace);
    let clic: MouseEvent | null = null;
    await act(async () => {
      clic = new MouseEvent("click", { bubbles: true, cancelable: true });
      enlace.dispatchEvent(clic);
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
    assert.equal((clic as MouseEvent | null)?.defaultPrevented, true);
    assert.ok(llamadas.includes("DELETE /api/sesion"), llamadas.join(", "));
    assert.deepEqual(destinos, ["/?signin=1&next=%2Feventos"]);
  } finally {
    globalThis.fetch = fetchOriginal;
    window.location.assign = asignar;
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});

test("en demo no aparece y en la revisión real sí", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/usdc")) return json({ listo: false });
    if (url.includes("/api/revision/")) {
      return json({
        tarea: {
          id: "stand",
          titulo: "Set up the booth",
          tipo: "trabajo",
          monto: "20",
          condicion: "Banner",
          miembroId: "voluntario-1",
          miembro: "Ana",
          estado: "en revisión",
        },
        wallet: "G" + "A".repeat(55),
      });
    }
    if (url.includes("/api/tareas")) {
      return json({
        tareas: [
          {
            id: "stand",
            titulo: "Set up the booth",
            tipo: "trabajo",
            monto: "20",
            condicion: "Banner",
            miembroId: "voluntario-1",
            estado: "pendiente",
          },
        ],
      });
    }
    return json({}, 404);
  };
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "organizador",
        children: createElement(Revision, { tareaId: "stand" }),
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    assert.doesNotMatch(texto(), /Get ready to be paid/);

    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(Revision, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.doesNotMatch(texto(), /Get ready to be paid/);
    assert.match(texto(), /Reserve/);

    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "voluntario",
        children: createElement(SubirEvidencia, { tareaId: "stand" }),
      }),
    );
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.doesNotMatch(texto(), /Get ready to be paid/);

    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.doesNotMatch(texto(), /Get ready to be paid/);
    assert.match(texto(), /Open camera/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
