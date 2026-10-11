import assert from "node:assert/strict";
import test from "node:test";
import { revisarFirmaNavegador, SinSesionCavos, type BilleteraRevisada } from "./firmaNavegador";

function deps(resultado: BilleteraRevisada | null | Error, vistos: { passkey: boolean }[] = []) {
  return {
    conectar: async (opciones: { passkey: boolean }) => {
      vistos.push(opciones);
      if (resultado instanceof Error) throw resultado;
      return resultado;
    },
  };
}

test("una sesión con la dirección pero sin la clave en este navegador no puede firmar", async () => {
  // What the email code leaves behind in a browser that never held the key: the registry gives the
  // address (so the balance shows), and the vault has no key for it.
  const estado = await revisarFirmaNavegador({ deps: deps({ address: "GB3P", status: "needs-device-approval" }) });
  assert.deepEqual(estado, { estado: "sin-clave", direccion: "GB3P", passkey: false });
});

test("con la clave en este navegador puede firmar", async () => {
  assert.deepEqual(await revisarFirmaNavegador({ deps: deps({ address: "GB3P", status: "ready" }) }), { estado: "lista", direccion: "GB3P" });
  assert.deepEqual(await revisarFirmaNavegador({ deps: deps({ address: "GNEW", status: "undeployed" }) }), { estado: "lista", direccion: "GNEW" });
});

test("revisar no abre ventanas; restaurar usa la llave de acceso y dice si hay una", async () => {
  const vistos: { passkey: boolean }[] = [];
  await revisarFirmaNavegador({ deps: deps({ address: "G1", status: "ready" }, vistos) });
  const restaurado = await revisarFirmaNavegador({
    restaurar: true,
    deps: deps({ address: "G1", status: "needs-device-approval", passkeyRestore: true }, vistos),
  });
  assert.deepEqual(vistos, [{ passkey: false }, { passkey: true }]);
  assert.deepEqual(restaurado, { estado: "sin-clave", direccion: "G1", passkey: true });
});

test("sin ingreso de Cavos o sin configuración no afirma nada", async () => {
  assert.deepEqual(await revisarFirmaNavegador({ deps: deps(new SinSesionCavos()) }), { estado: "sin-sesion" });
  assert.deepEqual(await revisarFirmaNavegador({ deps: deps(null) }), { estado: "desconocido" });
  assert.deepEqual(await revisarFirmaNavegador({ deps: deps(new Error("vault down")) }), { estado: "desconocido" });
});
