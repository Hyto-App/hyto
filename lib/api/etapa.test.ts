import assert from "node:assert/strict";
import test from "node:test";
import type { EvidenciaFila, TareaFila, VeredictoFila } from "@/lib/db/tipos";
import { lineaDeEnvio, tareaCerrada } from "./etapa";

const ENVIADA = "2026-10-05T18:04:00.000Z";

test("la línea sale de la tarea, la foto y si ya hay revisión", () => {
  const pendiente = tarea();
  assert.deepEqual(lineaDeEnvio(pendiente, null, null), { etapa: null, enviadaEn: null });
  assert.deepEqual(lineaDeEnvio(pendiente, foto("ejemplo/stand"), veredicto()), { etapa: null, enviadaEn: null });

  const enCurso = lineaDeEnvio({ ...pendiente, estado: "en revisión" }, foto("blob/real"), null);
  assert.deepEqual(enCurso, { etapa: "en_revision", enviadaEn: ENVIADA });

  const enviada = lineaDeEnvio({ ...pendiente, estado: "en revisión" }, foto("blob/real"), veredicto());
  assert.deepEqual(enviada, { etapa: "enviada_organizador", enviadaEn: ENVIADA });

  const fallo = lineaDeEnvio({ ...pendiente, estado: "en revisión" }, foto("blob/real"), veredicto("error"));
  assert.equal(fallo.etapa, "enviada_organizador");

  const rechazada = lineaDeEnvio(pendiente, foto("blob/real"), veredicto());
  assert.equal(rechazada.etapa, null);
  assert.equal(rechazada.enviadaEn, ENVIADA);

  const pagada = lineaDeEnvio({ ...pendiente, estado: "pagado" }, foto("blob/real"), veredicto());
  assert.equal(pagada.etapa, "aprobada");
  const enVuelo = lineaDeEnvio({ ...pendiente, hashPago: "ab".repeat(32) }, foto("blob/real"), null);
  assert.notEqual(enVuelo.etapa, "aprobada");
  assert.equal(enVuelo.enviadaEn, ENVIADA);
});

test("una tarea pagada o con hash no acepta otra foto", () => {
  assert.equal(tareaCerrada(tarea()), false);
  assert.equal(tareaCerrada({ ...tarea(), estado: "en revisión" }), false);
  assert.equal(tareaCerrada({ ...tarea(), estado: "pagado" }), true);
  assert.equal(tareaCerrada({ ...tarea(), hashPago: "ab".repeat(32) }), true);
});

function tarea(): TareaFila {
  return {
    id: "stand",
    proyectoId: "zeek",
    titulo: "Booth",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "",
    miembroId: "voluntario-1",
    walletCobro: "",
    estado: "pendiente",
    hashPago: null,
    credencialUrl: null,
    contratoEscrow: null,
    prioridad: "normal",
    dificultad: null,
  };
}

function foto(blobId: string): Pick<EvidenciaFila, "blobId" | "creadaEn"> {
  return { blobId, creadaEn: ENVIADA };
}

function veredicto(origen: VeredictoFila["origen"] = "scout"): VeredictoFila {
  return {
    id: "v",
    evidenciaId: "e",
    tareaId: "stand",
    veredicto: "parcial",
    frase: "interna",
    textoScout: "interna",
    choice: "stand",
    noul: "no",
    score: "64",
    origen,
  };
}
