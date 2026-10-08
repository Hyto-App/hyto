import assert from "node:assert/strict";
import test from "node:test";
import { fichaDeTarea, guardarPerfilHttp, leerPerfilHttp } from "@/lib/api/perfil";
import { tareaAdmin } from "@/lib/api/informe";
import { perfilVoluntarioActivo } from "@/lib/perfil/bandera";
import { leerFicha } from "@/lib/perfil/reglas";
import { personaVisible } from "@/lib/perfil/vista";
import { crearMemoria } from "@/lib/db/memoria";
import type { TareaFila } from "@/lib/db/tipos";

function conInterruptor(valor: string | undefined, trabajo: () => Promise<void>): Promise<void> {
  const previo = process.env.HYTO_PERFIL_VOLUNTARIO;
  if (valor === undefined) delete process.env.HYTO_PERFIL_VOLUNTARIO;
  else process.env.HYTO_PERFIL_VOLUNTARIO = valor;
  return trabajo().finally(() => {
    if (previo === undefined) delete process.env.HYTO_PERFIL_VOLUNTARIO;
    else process.env.HYTO_PERFIL_VOLUNTARIO = previo;
  });
}

test("el perfil solo se enciende con on", () => {
  assert.equal(perfilVoluntarioActivo({}), false);
  assert.equal(perfilVoluntarioActivo({ HYTO_PERFIL_VOLUNTARIO: "" }), false);
  assert.equal(perfilVoluntarioActivo({ HYTO_PERFIL_VOLUNTARIO: "off" }), false);
  assert.equal(perfilVoluntarioActivo({ HYTO_PERFIL_VOLUNTARIO: "true" }), false);
  assert.equal(perfilVoluntarioActivo({ HYTO_PERFIL_VOLUNTARIO: "1" }), false);
  assert.equal(perfilVoluntarioActivo({ HYTO_PERFIL_VOLUNTARIO: "yes" }), false);
  assert.equal(perfilVoluntarioActivo({ HYTO_PERFIL_VOLUNTARIO: "ON" }), true);
  assert.equal(perfilVoluntarioActivo({ HYTO_PERFIL_VOLUNTARIO: " on " }), true);
});

test("apagado no lee el perfil y la ficha no aparece", async () => {
  await conInterruptor(undefined, async () => {
    const almacen = crearMemoria();
    let lecturas = 0;
    almacen.leerUsuario = async () => {
      lecturas += 1;
      return null;
    };
    assert.equal((await leerPerfilHttp(almacen, "leo")).status, 404);
    assert.equal((await guardarPerfilHttp(almacen, "leo", { experiencia: "Cocina", etiquetas: ["puntual"] })).status, 404);
    assert.equal(await fichaDeTarea(almacen, "leo"), null);
    assert.equal(lecturas, 0);
    const visible = personaVisible({ id: "leo", email: "leo@hyto.test", nombre: "Leo", rol: "voluntario", experiencia: "Cocina", etiquetas: ["puntual"] }, "leo");
    assert.equal("ficha" in visible, false);
  });
});

test("la persona elige hasta 5 etiquetas y el organizador las ve sin cambiar el rol", async () => {
  await conInterruptor("on", async () => {
    assert.equal("aviso" in leerFicha({ experiencia: "Cocina", etiquetas: ["puntual", "puntual", "ajena"] }), true);
    assert.equal("aviso" in leerFicha({ experiencia: "x".repeat(281), etiquetas: [] }), true);
    const seis = leerFicha({
      experiencia: "",
      etiquetas: ["responsable", "amable", "puntual", "creativo", "equipo", "proactivo"],
    });
    assert.equal("aviso" in seis, true);

    const almacen = crearMemoria();
    await almacen.insertarUsuario({ id: "leo", email: "leo@hyto.test", nombre: "Leo", rol: "voluntario" });
    await almacen.crearProyecto({ id: "evt", nombre: "Feria", creadoEn: "2026-10-08T00:00:00.000Z", organizadorId: "ana" }, []);
    await almacen.guardarMiembro({
      proyectoId: "evt",
      usuarioId: "leo",
      rol: "volunteer",
      estado: "active",
      creadoEn: "2026-10-08T00:00:00.000Z",
    });
    const guardado = await guardarPerfilHttp(almacen, "leo", {
      experiencia: "Cocino en ferias",
      etiquetas: ["puntual", "equipo", "puntual"],
    });
    assert.equal(guardado.status, 200);
    const usuario = await almacen.leerUsuario("leo");
    assert.equal(usuario?.rol, "voluntario");
    assert.deepEqual(usuario?.etiquetas, ["puntual", "equipo"]);
    assert.equal((await almacen.listarMiembros("evt")).find((miembro) => miembro.usuarioId === "leo")?.rol, "volunteer");
    const visible = personaVisible(usuario ?? undefined, "leo");
    assert.equal(visible.ficha?.experiencia, "Cocino en ferias");
    assert.deepEqual(visible.ficha?.etiquetas, ["puntual", "equipo"]);

    const vista = await tareaAdmin(almacen, tarea("leo"));
    assert.equal(vista.perfilVoluntario?.experiencia, "Cocino en ferias");
    assert.equal(vista.miembro, "Leo");
    const vacia = await tareaAdmin(almacen, tarea(""));
    assert.equal(vacia.perfilVoluntario, undefined);
  });
});

function tarea(miembroId: string): TareaFila {
  return {
    id: "t1",
    proyectoId: "evt",
    titulo: "Montar",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Foto",
    miembroId,
    walletCobro: "",
    estado: "pendiente",
    hashPago: null,
    credencialUrl: null,
    contratoEscrow: null,
    prioridad: "normal",
    dificultad: null,
  };
}
