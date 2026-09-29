import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { asignarOrganizadorPorEmail } from "./organizador";

test("el dueño se asigna por email y un correo desconocido no otorga nada", () => {
  const usuarios = [
    { id: "demo-organizador", email: "demo-organizador@hyto.demo" },
    { id: "ana", email: "Ana@Hyto.demo" },
  ];
  const proyectos = [
    { id: "zeek", organizadorId: null },
    { id: "feria", organizadorId: "voluntario-1" },
    { id: "otro", organizadorId: null },
  ];
  const asignados = asignarOrganizadorPorEmail(proyectos, usuarios, " ana@hyto.demo ");
  assert.equal(asignados.find((proyecto) => proyecto.id === "zeek")?.organizadorId, "ana");
  assert.equal(asignados.find((proyecto) => proyecto.id === "feria")?.organizadorId, "voluntario-1");
  assert.equal(asignados.find((proyecto) => proyecto.id === "otro")?.organizadorId, "ana");

  const soloZeek = asignarOrganizadorPorEmail(proyectos, usuarios, "ana@hyto.demo", ["zeek"]);
  assert.equal(soloZeek.find((proyecto) => proyecto.id === "zeek")?.organizadorId, "ana");
  assert.equal(soloZeek.find((proyecto) => proyecto.id === "otro")?.organizadorId, null);

  const desconocido = asignarOrganizadorPorEmail(proyectos, usuarios, "nadie@hyto.demo");
  assert.equal(desconocido.every((proyecto) => proyecto.organizadorId === proyectos.find((item) => item.id === proyecto.id)?.organizadorId), true);
  assert.equal(asignarOrganizadorPorEmail([{ id: "zeek", organizadorId: null }], usuarios, "   ")[0]?.organizadorId, null);
});

test("la migración solo agrega la columna y no rellena organizador_id", () => {
  const sql = readFileSync("drizzle/0002_organizador_proyecto.sql", "utf8");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS organizador_id text REFERENCES usuarios \(id\)/);
  assert.equal(/\bUPDATE\b/i.test(sql), false);
  assert.equal(sql.includes("DROP "), false);
  assert.equal(sql.includes("demo-organizador"), false);
});
