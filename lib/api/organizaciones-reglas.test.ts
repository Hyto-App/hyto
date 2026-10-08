import assert from "node:assert/strict";
import test from "node:test";
import type { OrganizacionVoluntario } from "@/lib/db/tipos";
import {
  buscarContactos,
  leerAltaOrganizacion,
  leerCambioOrganizacion,
  leerEtiquetas,
  normalizarCorreo,
  sugeridosDe,
} from "@/lib/organizaciones/reglas";
import { en, es, rutas } from "@/lib/ui/diccionario";

function contacto(email: string, extra: Partial<OrganizacionVoluntario> = {}): OrganizacionVoluntario {
  return {
    organizacionId: "o1",
    email,
    usuarioId: null,
    nombre: null,
    etiquetas: [],
    origen: "manual",
    participaciones: 0,
    ultimaParticipacion: null,
    creadoEn: "2026-10-01T00:00:00.000Z",
    ...extra,
  };
}

test("los sugeridos van por participaciones, luego etiquetas en común con la organización, luego la última participación", () => {
  const organizacion = ["becas", "Costa Rica", "tech"];
  const lista = [
    contacto("d@h.app", { participaciones: 1, etiquetas: [], ultimaParticipacion: "2026-09-01T00:00:00.000Z" }),
    contacto("a@h.app", { participaciones: 3 }),
    contacto("c@h.app", { participaciones: 1, etiquetas: ["TECH", "becas"], ultimaParticipacion: "2026-01-01T00:00:00.000Z" }),
    contacto("b@h.app", { participaciones: 1, etiquetas: ["tech"], ultimaParticipacion: "2026-10-01T00:00:00.000Z" }),
    contacto("e@h.app", { participaciones: 1, ultimaParticipacion: "2026-10-05T00:00:00.000Z" }),
    contacto("f@h.app", { participaciones: 0 }),
  ];
  assert.deepEqual(
    sugeridosDe(lista, organizacion).map((item) => item.email),
    ["a@h.app", "c@h.app", "b@h.app", "e@h.app", "d@h.app", "f@h.app"],
  );
});

test("los sugeridos son como máximo 8 y el correo desempata", () => {
  const lista = Array.from({ length: 12 }, (_, i) => contacto(`v${String(11 - i).padStart(2, "0")}@h.app`));
  const sugeridos = sugeridosDe(lista, []);
  assert.equal(sugeridos.length, 8);
  assert.deepEqual(
    sugeridos.map((item) => item.email),
    ["v00@h.app", "v01@h.app", "v02@h.app", "v03@h.app", "v04@h.app", "v05@h.app", "v06@h.app", "v07@h.app"],
  );
  assert.equal(lista[0]?.email, "v11@h.app");
});

test("buscar entre los guardados mira el nombre y el correo sin distinguir mayúsculas", () => {
  const lista = [contacto("ana@h.app", { nombre: "Ana Mora" }), contacto("luis@h.app"), contacto("zoe@h.app", { nombre: "Zoe" })];
  assert.deepEqual(buscarContactos(lista, "MORA").map((item) => item.email), ["ana@h.app"]);
  assert.deepEqual(buscarContactos(lista, "luis").map((item) => item.email), ["luis@h.app"]);
  assert.equal(buscarContactos(lista, "  ").length, 3);
  assert.equal(buscarContactos(lista, "nadie").length, 0);
});

test("los correos se normalizan a minúsculas y se rechaza lo que no lo es", () => {
  assert.equal(normalizarCorreo("  Ana.Prueba@Gmail.COM "), "ana.prueba@gmail.com");
  assert.equal(normalizarCorreo("sin-arroba"), null);
  assert.equal(normalizarCorreo("a b@c.d"), null);
  assert.equal(normalizarCorreo(12), null);
});

test("las etiquetas se limpian, no se repiten y tienen tope", () => {
  assert.deepEqual(leerEtiquetas([" becas ", "Becas", "Costa  Rica", ""]), { etiquetas: ["becas", "Costa Rica"] });
  assert.deepEqual(leerEtiquetas(undefined), { etiquetas: [] });
  assert.ok("aviso" in leerEtiquetas("becas"));
  assert.ok("aviso" in leerEtiquetas([1]));
  assert.ok("aviso" in leerEtiquetas(Array.from({ length: 11 }, (_, i) => `t${i}`)));
  assert.ok("aviso" in leerEtiquetas(["x".repeat(31)]));
});

test("el alta y el cambio de una organización validan el nombre, la descripción y las etiquetas", () => {
  assert.deepEqual(leerAltaOrganizacion({ nombre: " Norte ", etiquetas: ["tech"] }), { nombre: "Norte", descripcion: "", etiquetas: ["tech"] });
  assert.ok("aviso" in leerAltaOrganizacion({ nombre: "  " }));
  assert.ok("aviso" in leerAltaOrganizacion({ nombre: "x".repeat(81) }));
  assert.ok("aviso" in leerAltaOrganizacion({ nombre: "Norte", descripcion: "x".repeat(1001) }));
  assert.deepEqual(leerCambioOrganizacion({ descripcion: "Nueva" }), { descripcion: "Nueva" });
  assert.ok("aviso" in leerCambioOrganizacion({}));
  assert.ok("aviso" in leerCambioOrganizacion({ nombre: "" }));
});

test("las cadenas de organizaciones existen en inglés y en español, y el español usa usted", () => {
  const claves = rutas(en)
    .filter((clave) => clave.startsWith("organizaciones."))
    .sort();
  assert.ok(claves.length > 0);
  assert.deepEqual(rutas(es).filter((clave) => clave.startsWith("organizaciones.")).sort(), claves);
  const textos = es.organizaciones as Record<string, string>;
  for (const clave of Object.keys(textos)) {
    assert.doesNotMatch(textos[clave] ?? "", /\b(tú|tu|tus|puedes|quieres|elige|agrega|escribe|busca|invita)\b/i, clave);
  }
});
