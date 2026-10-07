import assert from "node:assert/strict";
import test from "node:test";
import { debeProvisionar, guardarIntencion, intencionDe, leerIntencion, olvidarIntencion } from "./intencion";

test("solo Sign up con el permiso del servidor aprovisiona testnet", () => {
  assert.equal(debeProvisionar("signup", true), true);
  assert.equal(debeProvisionar("signup", false), false);
  assert.equal(debeProvisionar("signin", true), false);
  assert.equal(debeProvisionar("signin", false), false);
  assert.equal(intencionDe("signup"), "signup");
  assert.equal(intencionDe("signin"), "signin");
  assert.equal(intencionDe("register"), null);
  assert.equal(intencionDe(undefined), null);
});

test("si no hay una intención guardada, el regreso de Google se trata como Sign in", () => {
  const memoria = new Map<string, string>();
  const almacenamiento = {
    getItem: (clave: string) => memoria.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      memoria.set(clave, valor);
    },
    removeItem: (clave: string) => {
      memoria.delete(clave);
    },
  };
  assert.equal(leerIntencion(almacenamiento), "signin");
  guardarIntencion("signup", almacenamiento);
  assert.equal(leerIntencion(almacenamiento), "signup");
  olvidarIntencion(almacenamiento);
  assert.equal(leerIntencion(almacenamiento), "signin");
  guardarIntencion("signin", almacenamiento);
  assert.equal(leerIntencion(almacenamiento), "signin");
});

test("el enlace de correo guarda la intención y el retorno para otra pestaña, una sola vez y por una hora", async () => {
  const { CLAVE_INTENCION_ENLACE, VIDA_INTENCION_ENLACE_MS, guardarIntencionEnlace, intencionGuardada, tomarIntencionEnlace } = await import(
    "./intencion"
  );
  const datos = new Map<string, string>();
  const almacen = {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
    removeItem: (clave: string) => void datos.delete(clave),
  };
  guardarIntencionEnlace({ intencion: "signup", retorno: "/tareas/1" }, almacen, 1000);
  assert.ok(datos.has(CLAVE_INTENCION_ENLACE));
  assert.deepEqual(tomarIntencionEnlace(almacen, 2000), { intencion: "signup", retorno: "/tareas/1" });
  assert.equal(tomarIntencionEnlace(almacen, 2000), null, "se toma una sola vez");

  guardarIntencionEnlace({ intencion: "signin", retorno: null }, almacen, 1000);
  assert.equal(tomarIntencionEnlace(almacen, 1000 + VIDA_INTENCION_ENLACE_MS + 1), null, "vencida");
  assert.equal(datos.has(CLAVE_INTENCION_ENLACE), false);

  datos.set(CLAVE_INTENCION_ENLACE, "{roto");
  assert.equal(tomarIntencionEnlace(almacen, 0), null);

  assert.equal(intencionGuardada(almacen), null);
  datos.set("hyto-intencion", "signup");
  assert.equal(intencionGuardada(almacen), "signup");
});
