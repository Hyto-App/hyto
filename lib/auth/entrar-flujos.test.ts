import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Entrar } from "../../components/admin/Entrar";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

test("Sign up y Sign in se ven distintos y el ingreso no ofrece el alta", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  try {
    await montar(createElement(Entrar));
    await act(async () => {
      await Promise.resolve();
    });
    const inicio = texto();
    assert.match(inicio, /Sign up/);
    assert.match(inicio, /Sign in/);
    assert.match(inicio, /Friendbot/);
    assert.match(inicio, /won't create a new account/);

    await pulsar("Sign up");
    const alta = texto();
    assert.match(alta, /Sign up with Google/);
    assert.match(alta, /Sign up with email/);
    assert.match(alta, /Stellar testnet/);
    assert.doesNotMatch(alta, /Sign in with Google/);

    await pulsar("Close");
    await pulsar("Sign in");
    const ingreso = texto();
    assert.match(ingreso, /Sign in with Google/);
    assert.match(ingreso, /Google only/);
    assert.doesNotMatch(ingreso, /Sign up with Google/);
    assert.doesNotMatch(ingreso, /Sign up with email/);
    assert.doesNotMatch(ingreso, /Send code/);
  } finally {
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});
