import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Revision } from "../../components/admin/Revision";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { PrepararUsdc } from "../../components/sesion/PrepararUsdc";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { AVISO_RECHAZO, AVISO_REINGRESO, ErrorFirmaCliente } from "../escrow/firmarCliente";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";
import { prepararUsdcDeSesion } from "./prepararUsdc";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("la sesión firma el XDR y después lo envía", async () => {
  const vistos: unknown[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const cuerpo = JSON.parse(String(init?.body)) as { accion?: string; xdr?: string };
    vistos.push(cuerpo);
    if (cuerpo.accion === "preparar") return json({ xdr: "UNSIGNED" });
    assert.equal(cuerpo.xdr, "SIGNED");
    return json({ listo: true, hash: "abc" });
  };
  const listo = await prepararUsdcDeSesion({
    fetch: fetchImpl,
    firmar: async (xdr) => {
      assert.equal(xdr, "UNSIGNED");
      return "SIGNED";
    },
  });
  assert.equal(listo.hash, "abc");
  assert.equal(vistos.length, 2);
});

test("si la trustline ya existe no se pide firma", async () => {
  let firmas = 0;
  const fetchImpl: typeof fetch = async () => json({ listo: true });
  const listo = await prepararUsdcDeSesion({
    fetch: fetchImpl,
    firmar: async () => {
      firmas += 1;
      return "SIGNED";
    },
  });
  assert.equal(listo.hash, null);
  assert.equal(firmas, 0);
});

test("sin función de firma usa la misma ruta de Cavos que el escrow", async () => {
  const fetchImpl: typeof fetch = async () => json({ xdr: "UNSIGNED" });
  await assert.rejects(() => prepararUsdcDeSesion({ fetch: fetchImpl }), /isn't set up yet/);
});

test("un rechazo de firma queda en inglés", async () => {
  const fetchImpl: typeof fetch = async () => json({ xdr: "UNSIGNED" });
  await assert.rejects(
    () =>
      prepararUsdcDeSesion({
        fetch: fetchImpl,
        firmar: async () => {
          throw new ErrorFirmaCliente(AVISO_RECHAZO);
        },
      }),
    /cancelled the confirmation/,
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
    assert.match(texto(), /Lock budget/);

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
