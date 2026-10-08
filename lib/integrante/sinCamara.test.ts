import assert from "node:assert/strict";
import test from "node:test";
import { texto } from "@/lib/ui/diccionario";
import { camaraAusente, enlaceDeEstaTarea, errorSinCamara, escritorioConMouse } from "./sinCamara";

test("el escritorio es puntero fino y el teléfono no", () => {
  assert.equal(
    escritorioConMouse((consulta) => consulta === "(hover: hover) and (pointer: fine)"),
    true,
  );
  assert.equal(
    escritorioConMouse(() => false),
    false,
  );
});

test("sin entrada de video no hay cámara, y un permiso negado no cuenta", () => {
  assert.equal(camaraAusente([]), true);
  assert.equal(camaraAusente([{ kind: "audioinput" }]), true);
  assert.equal(camaraAusente([{ kind: "videoinput" }]), false);
  assert.equal(errorSinCamara({ name: "NotFoundError" }), true);
  assert.equal(errorSinCamara({ name: "DevicesNotFoundError" }), true);
  assert.equal(errorSinCamara({ name: "NotAllowedError" }), false);
  assert.equal(errorSinCamara(new Error("denied")), false);
  assert.equal(errorSinCamara(null), false);
});

test("el enlace del QR es esta misma tarea y no lleva nada más", () => {
  assert.equal(enlaceDeEstaTarea("https://hyto.example/", "stand"), "https://hyto.example/tareas/stand");
  assert.equal(enlaceDeEstaTarea("https://hyto.example", "a b"), "https://hyto.example/tareas/a%20b");
  assert.doesNotMatch(enlaceDeEstaTarea("https://hyto.example", "stand"), /wallet|token|email/i);
});

test("el aviso sin cámara dice lo mismo en inglés y en español", () => {
  const enCuerpo = texto("en", "evidencia.noCameraBody");
  const esCuerpo = texto("es", "evidencia.noCameraBody");
  assert.match(enCuerpo, /taken at the moment/);
  assert.match(enCuerpo, /Old gallery photos are not accepted/);
  assert.match(enCuerpo, /phone/);
  assert.match(esCuerpo, /en el momento/);
  assert.match(esCuerpo, /fotos viejas de la galería/);
  assert.match(esCuerpo, /celular/);
  assert.equal(texto("en", "evidencia.noCameraLead"), "This computer has no camera");
  assert.equal(texto("es", "evidencia.noCameraLead"), "Esta computadora no tiene cámara");
  assert.match(texto("en", "evidencia.noCameraQr"), /QR code/);
  assert.match(texto("es", "evidencia.noCameraQr"), /Código QR/);
  for (const frase of [enCuerpo, esCuerpo, texto("en", "evidencia.noCameraLink"), texto("es", "evidencia.noCameraLink")]) {
    assert.doesNotMatch(frase, /USDC|wallet|escrow|testnet/i);
  }
});
