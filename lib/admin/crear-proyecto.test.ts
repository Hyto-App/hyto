import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { CrearProyecto } from "../../components/admin/CrearProyecto";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { leerMemoriaAdmin } from "./memoria";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

test("en modo demo CrearProyecto no guarda y muestra el aviso", async () => {
  limpiarPantalla();
  const idas: string[] = [];
  try {
    await montar(
      createElement(ProveedorModoDemo, { activo: true, rol: "organizador", children: createElement(CrearProyecto) }),
      { push: (href) => idas.push(href) },
    );
    assert.match(texto(), /Demo mode cannot create projects/);
    const fondear = [...document.querySelectorAll("button")].find((boton) => boton.textContent?.includes("Create event"));
    assert.equal(fondear instanceof HTMLButtonElement && fondear.disabled, true);
    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "8");
    await pulsar("Create event");
    assert.equal(leerMemoriaAdmin().proyecto, null);
    assert.deepEqual(idas, []);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
