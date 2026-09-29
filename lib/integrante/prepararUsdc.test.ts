import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Revision } from "../../components/admin/Revision";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { PrepararUsdc } from "../../components/sesion/PrepararUsdc";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { AVISO_RECHAZO, ErrorFirmaCliente } from "../escrow/firmarCliente";
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
  await assert.rejects(() => prepararUsdcDeSesion({ fetch: fetchImpl }), /Cavos is not configured/);
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
    /You rejected the signature/,
  );
});

test("el botón muestra listo, preparando, hecho y error", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(PrepararUsdc, { consultar: async () => true, preparar: async () => ({ hash: null }) }));
    assert.match(texto(), /USDC ready/);
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
    assert.match(texto(), /Prepare USDC/);
    await pulsar("Prepare USDC");
    assert.match(texto(), /Preparing…/);
    await act(async () => {
      resolver({ hash: "abc" });
    });
    assert.match(texto(), /USDC trustline added/);
    assert.match(texto(), /View transaction/);

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
    await pulsar("Prepare USDC");
    assert.match(texto(), /Could not submit the USDC trustline/);
    assert.match(texto(), /Prepare USDC/);
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
          titulo: "Montar el stand",
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
            titulo: "Montar el stand",
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
    assert.doesNotMatch(texto(), /Prepare USDC/);

    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(Revision, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Prepare USDC/);

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
    assert.doesNotMatch(texto(), /Prepare USDC/);

    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Prepare USDC/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
