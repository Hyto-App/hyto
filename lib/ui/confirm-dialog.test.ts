import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

function Ejemplo({ onConfirmar }: { onConfirmar: (senal: AbortSignal) => Promise<void> }) {
  const [abierto, setAbierto] = useState(false);
  return createElement(
    "div",
    null,
    createElement("button", { type: "button", id: "abrir", onClick: () => setAbierto(true) }, "Open it"),
    createElement(ConfirmDialog, {
      abierto,
      onCerrar: () => setAbierto(false),
      titulo: "Lock the budget",
      monto: "20.00",
      irreversible: true,
      confirmar: "Lock 20 USDC",
      onConfirmar,
    }),
  );
}

test("the dialog opens, cancel does not call the action, confirm calls it once", async () => {
  let llamadas = 0;
  await montar(
    createElement(Ejemplo, {
      onConfirmar: async () => {
        llamadas += 1;
      },
    }),
  );
  const dialogo = () => document.querySelector("dialog") as HTMLDialogElement;
  assert.equal(dialogo().open, false);
  await pulsar("Open it");
  assert.equal(dialogo().open, true);
  assert.match(texto(), /20\.00USDC/);
  assert.match(texto(), /This can't be undone\./);
  await pulsar("Cancel");
  assert.equal(llamadas, 0);
  assert.equal(dialogo().open, false);
  await pulsar("Open it");
  await pulsar("Lock 20 USDC");
  await act(async () => {
    await Promise.resolve();
  });
  assert.equal(llamadas, 1);
  assert.equal(dialogo().open, false);
  await desmontar();
});

test("confirm leaves the top layer before the action so Cavos can paint in front", async () => {
  let capa: string | undefined;
  let abierto = false;
  await montar(
    createElement(Ejemplo, {
      onConfirmar: async () => {
        const dialogo = document.querySelector("dialog") as HTMLDialogElement;
        capa = dialogo.dataset.capa;
        abierto = dialogo.open;
      },
    }),
  );
  await pulsar("Open it");
  await pulsar("Lock 20 USDC");
  await act(async () => {
    await Promise.resolve();
  });
  assert.equal(capa, "libre");
  assert.equal(abierto, true);
  await desmontar();
});

test("cancel stays available while the action is running and aborts it", async () => {
  let senal: AbortSignal | undefined;
  await montar(
    createElement(Ejemplo, {
      onConfirmar: (actual) =>
        new Promise((resolve) => {
          senal = actual;
          actual.addEventListener("abort", () => resolve());
        }),
    }),
  );
  await pulsar("Open it");
  await pulsar("Lock 20 USDC");
  await act(async () => {
    await Promise.resolve();
  });
  const cancelar = document.querySelector("dialog .hyto-btn-line") as HTMLButtonElement;
  assert.equal(cancelar.disabled, false);
  assert.ok(document.querySelector("[data-hyto-cancelar-firma]"));
  await pulsar("Cancel");
  await act(async () => {
    await Promise.resolve();
  });
  assert.equal(senal?.aborted, true);
  assert.equal((document.querySelector("dialog") as HTMLDialogElement).open, false);
  await desmontar();
});

test("a failed action stays open and shows the error", async () => {
  await montar(
    createElement(Ejemplo, {
      onConfirmar: async () => {
        throw new Error("Not enough USDC.");
      },
    }),
  );
  await pulsar("Open it");
  await pulsar("Lock 20 USDC");
  await act(async () => {
    await Promise.resolve();
  });
  assert.equal((document.querySelector("dialog") as HTMLDialogElement).open, true);
  assert.ok(document.querySelector("[role='alert']"));
  await desmontar();
});
