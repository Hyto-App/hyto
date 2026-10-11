import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { ProgresoFirma, progresoCavos } from "@/components/admin/ProgresoFirma";
import { Revision } from "@/components/admin/Revision";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 50; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}

function puntos(): string[] {
  // The dialog and the page can both show the line; they always agree, so read the first one.
  return [...(document.querySelector(".hyto-firma-cavos-puntos")?.querySelectorAll("i") ?? [])].map((punto) => punto.getAttribute("data-lleno") ?? "");
}

function contador(): string {
  return document.querySelector(".hyto-firma-cavos-contador")?.textContent ?? "";
}

test("progresoCavos: bloquear son 2 firmas, terminar de bloquear 1 y pagar 1", () => {
  assert.deepEqual(progresoCavos(["desplegar", "fondear"], null), { clave: "firmaCavos.bloqueoDos", total: 2, actual: 0 });
  assert.deepEqual(progresoCavos(["desplegar", "fondear"], "desplegar"), { clave: "firmaCavos.bloqueoDos", total: 2, actual: 1 });
  assert.deepEqual(progresoCavos(["desplegar", "fondear"], "fondear"), { clave: "firmaCavos.bloqueoDos", total: 2, actual: 2 });
  assert.deepEqual(progresoCavos(["fondear"], "fondear"), { clave: "firmaCavos.bloqueoUna", total: 1, actual: 1 });
  assert.deepEqual(progresoCavos(["marcar", "aprobar", "liberar"], "aprobar"), { clave: "firmaCavos.pago", total: 1, actual: 0 });
  assert.deepEqual(progresoCavos(["liberar"], "liberar"), { clave: "firmaCavos.pago", total: 1, actual: 1 });
  assert.equal(progresoCavos([], null), null);
});

test("en español la línea dice lo que Cavos va a pedir, en usted, con Firma 1 de 2 y puntos", async () => {
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(ProgresoFirma, { acciones: ["desplegar", "fondear"], paso: null }) }));
    assert.match(texto(), /Cavos le va a pedir confirmar 2 veces, en inglés\. Es para guardar el presupuesto\./);
    assert.deepEqual(puntos(), ["no", "no"]);
    assert.equal(texto().includes("Firma"), false);
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(ProgresoFirma, { acciones: ["desplegar", "fondear"], paso: "desplegar" }) }));
    assert.equal(contador(), "Firma 1 de 2");
    assert.deepEqual(puntos(), ["si", "no"]);
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(ProgresoFirma, { acciones: ["desplegar", "fondear"], paso: "fondear" }) }));
    assert.equal(contador(), "Firma 2 de 2");
    assert.deepEqual(puntos(), ["si", "si"]);
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(ProgresoFirma, { acciones: ["marcar", "aprobar", "liberar"], paso: "liberar" }) }));
    assert.match(texto(), /Cavos le va a pedir confirmar una vez, en inglés\. Es para enviar el pago\./);
    assert.equal(contador(), "Firma 1 de 1");
  } finally {
    await desmontar();
  }
});

test("Bloquear presupuesto avisa las 2 firmas antes de confirmar y cuenta Signature 1 of 2, 2 of 2", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const cuerpo = init?.body ? (JSON.parse(String(init.body)) as { accion?: string }) : {};
    if (url === "/api/firma") return json({ xdr: `XDR-${cuerpo.accion}`, token: "T", contrato: cuerpo.accion === "desplegar" ? null : "CCONTRATO" });
    if (url === "/api/firma/enviar") return json({ hash: `H-${cuerpo.accion}`, contrato: "CCONTRATO" });
    if (url === "/api/usdc") return json({ listo: true });
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    if (url.startsWith("/api/revision/")) {
      return json({
        tarea: {
          id: "stand",
          titulo: "Set up the booth",
          tipo: "trabajo",
          monto: "20",
          tope: null,
          condicion: "Banner visible",
          miembroId: "voluntario-1",
          miembro: "Volunteer 1",
          estado: "en revisión",
          veredicto: "cumplió",
          nota: null,
          frase: "Listo",
          origen: "scout",
          codigo: null,
          montoRevisado: null,
          montoConfirmado: null,
          fecha: null,
          hashPago: null,
          credencialUrl: null,
        },
        foto: null,
        contratoEscrow: null,
        wallet: "GORGANIZADOR",
      });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;

  const vistas: string[] = [];
  let soltar: (() => void) | null = null;
  const firmar = async (xdr: string) => {
    vistas.push(xdr);
    await new Promise<void>((resolver) => {
      soltar = resolver;
    });
    return `SIGNED-${xdr}`;
  };
  try {
    await montar(createElement(Revision, { tareaId: "stand", firmar }));
    await esperar(() => [...document.querySelectorAll("button")].some((boton) => boton.textContent?.trim() === "Lock and approve"));
    await pulsar("Lock and approve");
    const dialogo = document.querySelector("dialog");
    assert.match(dialogo?.textContent ?? "", /Cavos will ask you to confirm twice, in English\. It's to save the budget\./);
    const confirmar = document.querySelector("dialog .hyto-dialogo-acciones .hyto-btn");
    assert.ok(confirmar);
    await act(async () => {
      confirmar.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await esperar(() => vistas.length === 1 && contador() === "Signature 1 of 2");
    assert.deepEqual(puntos(), ["si", "no"]);
    await act(async () => soltar?.());
    await esperar(() => vistas.length === 2 && contador() === "Signature 2 of 2");
    assert.deepEqual(puntos(), ["si", "si"]);
    assert.deepEqual(vistas, ["XDR-desplegar", "XDR-fondear"]);
    await act(async () => soltar?.());
    // Done: the counter goes away; only the closed dialog keeps its preview line for next time.
    await esperar(() => texto().includes("Budget secured") && !texto().includes("Signature"));
    assert.equal([...document.querySelectorAll(".hyto-firma-cavos")].filter((nodo) => !nodo.closest("dialog")).length, 0);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});
