import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { NoDisponible, PerfilPublico, fechaCorta, mesAno } from "@/components/perfil/PerfilPublico";
import { SugeridosAsignar, SugeridosInvitar } from "@/components/perfil/Sugeridos";
import type { VistaPerfil } from "@/lib/api/perfil-publico";
import type { Sugerido } from "@/lib/perfil/sugeridos";
import { texto as t } from "@/lib/ui/diccionario";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

function vista(cambio: Partial<VistaPerfil> = {}): VistaPerfil {
  return {
    usuarioId: "u-1",
    nombre: "María Rojas",
    iniciales: "MR",
    desde: "2026-10-01T12:00:00.000Z",
    bio: null,
    privacidad: { publico: true, mostrarMontos: false },
    propio: false,
    cifras: {
      tareasHechas: 4,
      eventos: 2,
      aprobadasSinCambios: 75,
      historial: [1, 2, 3, 4].map((n) => ({
        tareaId: `t${n}`,
        titulo: `Tarea ${n}`,
        evento: "GDG Esparza",
        fecha: `2026-10-0${n}T15:00:00.000Z`,
        monto: null,
        enlace: n === 1 ? `https://stellar.expert/explorer/testnet/tx/${"a".repeat(64)}` : null,
      })),
    },
    ...cambio,
  };
}

test("el perfil muestra 3 tareas, «Ver todas», monto oculto y el enlace a Stellar, sin correo", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(PerfilPublico, { vista: vista() }));
    assert.match(texto(), /María Rojas/);
    assert.equal(document.querySelectorAll(".pf-it").length, 3);
    assert.match(texto(), /amount hidden/);
    assert.match(texto(), /View all \(4\)/);
    assert.match(texto(), /Approved with no changes/);
    assert.match(texto(), /Approved/);
    const enlaces = [...document.querySelectorAll("a.pf-enlace")] as HTMLAnchorElement[];
    assert.equal(enlaces.length, 1);
    assert.equal(enlaces[0].target, "_blank");
    assert.match(enlaces[0].href, /stellar\.expert\/explorer\/testnet\/tx\//);
    assert.equal(texto().includes("@"), false);
    (document.querySelector(".pf-mas") as HTMLButtonElement).click();
    await new Promise((resolver) => setTimeout(resolver, 10));
    assert.equal(document.querySelectorAll(".pf-it").length, 4);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("estado vacío y nombre escapado: el texto nunca se vuelve HTML", async () => {
  limpiarPantalla();
  try {
    const vacia = vista({
      nombre: "<img src=x onerror=alert(1)>",
      propio: true,
      cifras: { tareasHechas: 0, eventos: 0, aprobadasSinCambios: null, historial: [] },
    });
    await montar(createElement(PerfilPublico, { vista: vacia }));
    assert.equal(document.querySelector("img"), null);
    assert.match(texto(), /Your first approved task will appear here\./);
    assert.match(texto(), /—/);
    await desmontar();
    await montar(createElement(NoDisponible));
    assert.match(texto(), /This profile is not available/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("los textos del perfil existen en español con «usted»", () => {
  assert.equal(t("es", "perfilPublico.vacio"), "Su primera tarea aprobada aparecerá aquí.");
  assert.equal(t("es", "perfilPublico.aprobadasSinCambios"), "Aprobadas sin cambios");
  assert.equal(t("es", "perfilPublico.aprobadas"), "Aprobadas");
  assert.equal(t("es", "perfilPublico.montoOculto"), "monto oculto");
  assert.equal(t("es", "sugeridos.yaTrabajo"), "Ya trabajó con usted");
  assert.equal(t("es", "sugeridos.invitarNuevo"), "Invitar a alguien nuevo por correo");
  assert.equal(t("es", "sugeridos.vacio"), "Aquí aparecerán las personas con las que trabaje.");
  assert.equal(fechaCorta("2026-10-10T15:00:00.000Z", "es"), "10 oct");
  assert.match(mesAno("2026-10-01T15:00:00.000Z", "es"), /^oct 2026$/);
});

const GENTE: Sugerido[] = [
  { usuarioId: "a", nombre: "Ana Castro", iniciales: "AC", email: "a@x.dev", eventosEnComun: 2, tareasHechas: 12, enEsteEvento: true, yaTrabajo: true },
  { usuarioId: "d", nombre: "Daniel Solís", iniciales: "DS", email: "d@x.dev", eventosEnComun: 1, tareasHechas: 5, enEsteEvento: false, yaTrabajo: true },
  { usuarioId: "e", nombre: "Eva", iniciales: "E", email: "e@x.dev", eventosEnComun: 0, tareasHechas: 0, enEsteEvento: true, yaTrabajo: false },
];

test("sugeridos al asignar: una sola persona, «Ya trabajó con usted» primero, invitar al final", async () => {
  limpiarPantalla();
  const asignados: string[] = [];
  try {
    await montar(
      createElement(SugeridosAsignar, {
        proyectoId: "p",
        tarea: { id: "t", titulo: "Montar el stand" },
        sugeridos: GENTE,
        actualId: "",
        onAsignar: (id: string) => {
          asignados.push(id);
        },
        onCerrar: () => undefined,
      }),
    );
    assert.match(texto(), /Worked with you/);
    assert.match(texto(), /2 projects with you · 12 tasks/);
    assert.match(texto(), /Not in this project yet/);
    assert.match(texto(), /Invite someone new by email/);
    const textoPanel = texto();
    assert.ok(textoPanel.indexOf("Worked with you") < textoPanel.indexOf("In this project"));
    assert.ok(textoPanel.indexOf("In this project") < textoPanel.indexOf("Invite someone new by email"));
    const elegir = [...document.querySelectorAll("button[aria-pressed]")] as HTMLButtonElement[];
    assert.equal(elegir.length, 2);
    elegir[0].click();
    await new Promise((resolver) => setTimeout(resolver, 10));
    (document.querySelectorAll("button[aria-pressed]")[1] as HTMLButtonElement).click();
    await new Promise((resolver) => setTimeout(resolver, 10));
    assert.equal(document.querySelectorAll("button[aria-pressed=true]").length, 1);
    const asignar = [...document.querySelectorAll("button")].find((boton) => boton.textContent === "Assign to 1 person") as HTMLButtonElement;
    asignar.click();
    await new Promise((resolver) => setTimeout(resolver, 10));
    assert.deepEqual(asignados, ["e"]);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("organizador nuevo: solo «Invitar por correo» y el texto de vacío", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(SugeridosAsignar, {
        proyectoId: "p",
        tarea: { id: "t", titulo: "Montar el stand" },
        sugeridos: [],
        actualId: "",
        onAsignar: () => undefined,
        onCerrar: () => undefined,
      }),
    );
    assert.match(texto(), /People you work with will appear here\./);
    assert.match(texto(), /Invite someone new by email/);
    assert.equal(document.querySelector("input[type=search]"), null);
    await desmontar();
    await montar(createElement(SugeridosInvitar, { proyectoId: "p", sugeridos: GENTE }));
    assert.match(texto(), /Daniel Solís/);
    assert.equal(texto().includes("Ana Castro"), false);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
