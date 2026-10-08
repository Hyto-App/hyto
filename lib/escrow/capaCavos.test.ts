import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { bajarCapasParaCavos, soltarDialogosModales } from "./capaCavos";

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

test("a dialog already switched off the top layer stays open", () => {
  const dialogo = document.createElement("dialog");
  document.body.append(dialogo);
  dialogo.show();
  dialogo.matches = () => false;
  soltarDialogosModales();
  assert.equal(dialogo.open, true);
  dialogo.remove();
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
