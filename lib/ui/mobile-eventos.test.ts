import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fraseComisionEvento } from "./comision-evento";

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("la comisión del 0,3 % se ve en US$ y no dice plata", () => {
  const en = fraseComisionEvento("12.48", "en");
  const es = fraseComisionEvento("12.48", "es");
  assert.match(en ?? "", /0\.3%/);
  assert.match(en ?? "", /US\$0\.04/);
  assert.match(en ?? "", /US\$12\.44/);
  assert.match(es ?? "", /0,3 %/);
  assert.match(es ?? "", /Reservar|comisión|recibe/);
  assert.equal((en ?? "").toLowerCase().includes("plata"), false);
  assert.equal((es ?? "").toLowerCase().includes("plata"), false);
  assert.equal(fraseComisionEvento("0", "en"), null);
});

test("el móvil de eventos es una columna, con zona segura y sin movimiento de posición", () => {
  const css = leer("../../app/globals.css");
  const bloque = css.slice(css.indexOf("/* Eventos, móvil 360–430"));
  assert.ok(bloque.length > 80);
  assert.match(bloque, /max-width:\s*430px/);
  assert.match(bloque, /env\(safe-area-inset-bottom\)/);
  assert.match(bloque, /overflow-x:\s*clip/);
  assert.match(bloque, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(bloque, /translate|scale\(/);
  const lista = leer("../../components/admin/ListaEventos.tsx");
  const crear = leer("../../components/admin/CrearProyecto.tsx");
  const tareas = leer("../../components/admin/TareasEvento.tsx");
  assert.match(lista, /hyto-movil-eventos/);
  assert.match(crear, /hyto-presupuesto/);
  assert.match(crear, /eventos\.advanced/);
  assert.match(tareas, /eventos\.reserve/);
  assert.match(tareas, /fraseComisionEvento/);
});
