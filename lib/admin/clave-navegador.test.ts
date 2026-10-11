import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { Revision } from "@/components/admin/Revision";
import { PasskeyCuenta } from "@/components/integrante/PasskeyCuenta";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import type { EstadoFirma, OpcionesRevision } from "@/lib/auth/firmaNavegador";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

const SIN_CLAVE: EstadoFirma = { estado: "sin-clave", direccion: "GORGANIZADOR", passkey: false };
const LISTA: EstadoFirma = { estado: "lista", direccion: "GORGANIZADOR" };

function revisor(primero: EstadoFirma, alRestaurar: EstadoFirma) {
  const vistos: (OpcionesRevision | undefined)[] = [];
  const revisar = async (opciones?: OpcionesRevision) => {
    vistos.push(opciones);
    return opciones?.restaurar ? alRestaurar : primero;
  };
  return { revisar, vistos };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function tarea() {
  return {
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
  };
}

function boton(rotulo: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === rotulo);
}

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}

function servidor(firmas: string[]) {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/firma")) firmas.push(url);
    if (url === "/api/usdc") return json({ listo: true });
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    if (url.startsWith("/api/revision/")) return json({ tarea: tarea(), foto: null, contratoEscrow: null, wallet: "GORGANIZADOR" });
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
}

test("Bloquear presupuesto sin la clave en este navegador: lo dice antes, guía paso a paso y Try again la trae", async () => {
  const anterior = globalThis.fetch;
  const firmas: string[] = [];
  globalThis.fetch = servidor(firmas);
  const { revisar, vistos } = revisor(SIN_CLAVE, LISTA);
  try {
    await montar(createElement(Revision, { tareaId: "stand", revisarFirma: revisar }));
    await esperar(() => texto().includes("This browser can't sign for your account yet"));
    assert.match(texto(), /To lock this budget, this browser needs your account key/);
    assert.match(texto(), /Set up this device in 4 steps/);
    assert.equal(boton("Lock and approve")?.disabled, true);
    assert.match(boton("Lock and approve")?.getAttribute("aria-describedby") ?? "", /clave-navegador/);
    assert.deepEqual(firmas, []);
    await pulsar("Try again");
    await esperar(() => texto().includes("Done. This browser now has your account key."));
    assert.deepEqual(vistos.at(-1), { restaurar: true });
    assert.equal(boton("Lock and approve")?.disabled, false);
    assert.equal(texto().includes("This browser can't sign for your account yet"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("con la clave en este navegador, Bloquear presupuesto queda igual", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = servidor([]);
  const { revisar, vistos } = revisor(LISTA, LISTA);
  try {
    await montar(createElement(Revision, { tareaId: "stand", revisarFirma: revisar }));
    await esperar(() => vistos.length > 0 && boton("Lock and approve") !== undefined);
    assert.equal(boton("Lock and approve")?.disabled, false);
    assert.equal(texto().includes("can't sign for your account"), false);
    assert.deepEqual(vistos, [undefined]);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("Configuración dice lo mismo que la firma: sin clave no afirma que el acceso está guardado aquí", async () => {
  const { revisar } = revisor(SIN_CLAVE, LISTA);
  try {
    await montar(createElement(PasskeyCuenta, { agregar: async () => undefined, revisar }));
    await esperar(() => texto().includes("This browser can't sign for your account yet"));
    assert.match(texto(), /You're signed in and your balance shows, but your account key isn't in this browser/);
    assert.equal(texto().includes("saved only on this device"), false);
    assert.equal(boton("Add a passkey"), undefined);
    await pulsar("Try again");
    await esperar(() => texto().includes("Done. This browser now has your account key."));
    assert.ok(boton("Add a passkey"));
  } finally {
    await desmontar();
  }
});

test("Configuración con la clave aquí: guardada solo en este navegador y ofrece la llave de acceso", async () => {
  const { revisar } = revisor(LISTA, LISTA);
  try {
    await montar(createElement(PasskeyCuenta, { agregar: async () => undefined, revisar }));
    await esperar(() => texto().includes("Your sign-in is saved only on this device"));
    assert.ok(boton("Add a passkey"));
  } finally {
    await desmontar();
  }
});

test("en español, la guía de Configuración usa usted", async () => {
  const { revisar } = revisor(SIN_CLAVE, SIN_CLAVE);
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(PasskeyCuenta, { agregar: async () => undefined, revisar }) }));
    await esperar(() => texto().includes("Este navegador todavía no puede firmar con su cuenta"));
    assert.match(texto(), /Usted entró y ve su saldo, pero la clave de su cuenta no está en este navegador/);
    assert.match(texto(), /Siga estos pasos para traerla/);
  } finally {
    await desmontar();
  }
});
