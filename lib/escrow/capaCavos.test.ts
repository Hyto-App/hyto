import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bajarCapasParaCavos, firmaCavosActiva, soltarDialogosModales } from "./capaCavos";

test("a modal dialog is closed so the Cavos iframe is not occluded", () => {
  const dialogo = document.createElement("dialog");
  document.body.append(dialogo);
  dialogo.showModal();
  dialogo.matches = (selector: string) => selector === ":modal";
  assert.equal(dialogo.open, true);
  soltarDialogosModales();
  assert.equal(dialogo.open, false);
  dialogo.remove();
});

test("a non-modal dialog is closed too, so it cannot sit on the vault iframe", () => {
  const dialogo = document.createElement("dialog");
  document.body.append(dialogo);
  dialogo.show();
  dialogo.matches = () => false;
  soltarDialogosModales();
  assert.equal(dialogo.open, false);
  dialogo.remove();
});

test("signing unmounts a covering cancel, marks the document, and restores both", () => {
  const dialogo = document.createElement("dialog");
  const cancelar = document.createElement("button");
  cancelar.className = "hyto-cancelar-firma";
  cancelar.setAttribute("data-hyto-cancelar-firma", "");
  document.body.append(dialogo, cancelar);
  dialogo.show();
  const restaurar = bajarCapasParaCavos();
  assert.equal(dialogo.open, false);
  assert.equal(cancelar.isConnected, false);
  assert.equal(document.documentElement.classList.contains("hyto-firmando"), true);
  assert.equal(firmaCavosActiva(), true);
  restaurar();
  assert.equal(document.documentElement.classList.contains("hyto-firmando"), false);
  assert.equal(firmaCavosActiva(), false);
  dialogo.remove();
});

test("nested signing keeps the document marked until the last prompt ends", () => {
  const exterior = bajarCapasParaCavos();
  const interior = bajarCapasParaCavos();
  interior();
  assert.equal(document.documentElement.classList.contains("hyto-firmando"), true);
  assert.equal(firmaCavosActiva(), true);
  exterior();
  assert.equal(document.documentElement.classList.contains("hyto-firmando"), false);
  assert.equal(firmaCavosActiva(), false);
});

test("the signing class clears opacity, transform, filter, and will-change on html and body", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const bloque = css.slice(css.indexOf("html.hyto-firmando"));
  assert.match(bloque, /html\.hyto-firmando body/);
  assert.match(bloque, /transform:\s*none !important/);
  assert.match(bloque, /opacity:\s*1 !important/);
  assert.match(bloque, /filter:\s*none !important/);
  assert.match(bloque, /will-change:\s*auto !important/);
  assert.equal(css.includes("hyto-cancelar-firma"), false);
});

test("the sign-in screen is hidden only while Cavos is in front", () => {
  const login = document.createElement("div");
  login.className = "hyto-login";
  login.setAttribute("aria-modal", "true");
  document.body.append(login);
  const restaurar = bajarCapasParaCavos();
  assert.equal(login.classList.contains("hyto-bajo-firma"), true);
  assert.equal(login.getAttribute("aria-modal"), "false");
  restaurar();
  assert.equal(login.classList.contains("hyto-bajo-firma"), false);
  assert.equal(login.getAttribute("aria-modal"), "true");
  login.remove();
});
