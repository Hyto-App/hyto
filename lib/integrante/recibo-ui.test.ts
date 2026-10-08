import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { ReciboPago } from "@/components/integrante/evidencia/ReciboPago";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import type { Tarea } from "@/lib/integrante/tipos";
import { desmontar, montar, texto } from "../../tests/integracion/montar";

const HASH = "cd".repeat(32);

function tarea(): Tarea {
  return {
    id: "comida",
    proyectoId: "evt",
    titulo: "Team meal",
    tipo: "reembolso",
    monto: "15",
    tope: "15",
    condicion: "Receipt",
    miembroId: "v",
    walletCobro: "",
    estado: "pagado",
    prioridad: "normal",
    dificultad: null,
    montoConfirmado: "12.48",
    evento: "ZEEK",
    enviadaEn: "2026-10-05T18:04:00.000Z",
    hashPago: HASH,
  };
}

test("el comprobante en español deja la red como enlace secundario", async () => {
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(ReciboPago, { tarea: tarea() }),
      }),
    );
    assert.match(texto(), /Comprobante/);
    assert.match(texto(), /Recibió/);
    assert.match(texto(), /Apartado/);
    assert.match(texto(), /Comisión/);
    assert.match(texto(), /Fecha/);
    assert.match(texto(), /Tarea/);
    assert.match(texto(), /Evento/);
    assert.match(texto(), /US\$12,44/);
    assert.match(texto(), /US\$12,48/);
    assert.match(texto(), /US\$0,04/);
    assert.match(texto(), /5 oct 2026/);
    assert.match(texto(), /Comida del equipo/);
    assert.match(texto(), /ZEEK/);
    assert.match(texto(), /dinero de práctica/);
    const red = document.querySelector("a[href*='stellar.expert']");
    assert.equal(red?.textContent, "Ver comprobante público");
    assert.equal(red?.getAttribute("target"), "_blank");
    assert.equal(red?.getAttribute("rel"), "noopener noreferrer");
    assert.equal(red?.getAttribute("href"), `https://stellar.expert/explorer/testnet/tx/${HASH}`);
    const volver = document.querySelector('a[href="/tareas/comida"]');
    assert.equal(volver?.textContent, "Volver a la tarea");
    assert.equal(volver?.getAttribute("target"), null);
  } finally {
    await desmontar();
  }
});

test("una tarea sin pagar no abre el explorador", async () => {
  try {
    await montar(createElement(ReciboPago, { tarea: { ...tarea(), estado: "en revisión" } }));
    assert.match(texto(), /The receipt shows up after the payment/);
    assert.equal(document.querySelector("a[href*='stellar.expert']"), null);
  } finally {
    await desmontar();
  }
});
