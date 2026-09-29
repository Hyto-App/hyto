import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { aplicarRellenoOrganizador, idOrganizadorGlobal } from "./organizador";

test("el relleno usa al organizador global y no pisa un dueño ya guardado", () => {
  const usuarios = [
    { id: "demo-organizador", rol: "organizador" },
    { id: "organizador", rol: "organizador" },
    { id: "voluntario-1", rol: "voluntario" },
  ];
  assert.equal(idOrganizadorGlobal(usuarios), "organizador");
  assert.equal(idOrganizadorGlobal([{ id: "demo-organizador", rol: "organizador" }]), null);
  assert.equal(idOrganizadorGlobal([{ id: "b", rol: "organizador" }, { id: "a", rol: "organizador" }]), "a");

  const proyectos = aplicarRellenoOrganizador(
    [
      { id: "zeek", organizadorId: null },
      { id: "feria", organizadorId: "voluntario-1" },
    ],
    usuarios,
  );
  assert.equal(proyectos.find((proyecto) => proyecto.id === "zeek")?.organizadorId, "organizador");
  assert.equal(proyectos.find((proyecto) => proyecto.id === "feria")?.organizadorId, "voluntario-1");
  assert.equal(
    aplicarRellenoOrganizador([{ id: "zeek", organizadorId: null }], [{ id: "demo-organizador", rol: "organizador" }])[0]
      ?.organizadorId,
    null,
  );
});

test("la migración agrega la columna con IF NOT EXISTS y rellena con esa regla", () => {
  const sql = readFileSync("drizzle/0002_organizador_proyecto.sql", "utf8");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS organizador_id text REFERENCES usuarios \(id\)/);
  assert.match(sql, /WHERE rol = 'organizador'/);
  assert.match(sql, /id <> 'demo-organizador'/);
  assert.match(sql, /ORDER BY id\s+LIMIT 1/);
  assert.match(sql, /WHERE organizador_id IS NULL/);
  assert.equal(sql.includes("DROP "), false);
});
