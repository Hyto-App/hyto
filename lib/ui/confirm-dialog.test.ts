import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { bajarCapasParaCavos } from "@/lib/escrow/capaCavos";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

function Ejemplo({
  onConfirmar,
  idioma = "en",
  monto = "20.00",
}: {
  onConfirmar: (senal: AbortSignal) => Promise<void>;
  idioma?: "en" | "es";
  monto?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return createElement(ProveedorIdioma, {
    idioma,
    children: createElement(
      "div",
      null,
      createElement("button", { type: "button", id: "abrir", onClick: () => setAbierto(true) }, "Open it"),
      createElement(ConfirmDialog, {
        abierto,
        onCerrar: () => setAbierto(false),
        titulo: "Lock the budget",
        monto,
        irreversible: true,
        confirmar: "Lock US$20",
        onConfirmar,
      }),
    ),
  });
}

test("a decimal amount uses the same US$ format in Spanish", async () => {
  await montar(createElement(Ejemplo, { onConfirmar: async () => undefined, idioma: "es", monto: "12.48" }));
  await pulsar("Open it");
  assert.equal(document.querySelector(".hyto-dialogo-monto")?.textContent, "US$12,48");
  assert.equal(texto().includes("USDC"), false);
  await desmontar();
});

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
  const monto = document.querySelector(".hyto-dialogo-monto");
  assert.equal(monto?.textContent, "US$20.00");
  assert.equal(monto?.querySelector("small"), null);
  assert.equal(texto().includes("USDC"), false);
  assert.match(texto(), /This can't be undone\./);
  await pulsar("Cancel");
  assert.equal(llamadas, 0);
  assert.equal(dialogo().open, false);
  await pulsar("Open it");
  await pulsar("Lock US$20");
  await act(async () => {
    await Promise.resolve();
  });
  assert.equal(llamadas, 1);
  assert.equal(dialogo().open, false);
  await desmontar();
});

test("while Cavos is signing the dialog and its cancel control are not in the page", async () => {
  let durante = false;
  await montar(
    createElement(Ejemplo, {
      onConfirmar: async () => {
        const restaurar = bajarCapasParaCavos();
        try {
          await act(async () => {
            await Promise.resolve();
          });
          durante = document.querySelector("dialog") === null && document.querySelector("[data-hyto-cancelar-firma]") === null;
          assert.equal(document.documentElement.classList.contains("hyto-firmando"), true);
        } finally {
          restaurar();
        }
      },
    }),
  );
  await pulsar("Open it");
  await pulsar("Lock US$20");
  await act(async () => {
    await Promise.resolve();
  });
  assert.equal(durante, true);
  assert.equal((document.querySelector("dialog") as HTMLDialogElement | null)?.open ?? false, false);
  assert.equal(document.documentElement.classList.contains("hyto-firmando"), false);
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
  await pulsar("Lock US$20");
  await act(async () => {
    await Promise.resolve();
  });
  const cancelar = document.querySelector("dialog .hyto-btn-line") as HTMLButtonElement;
  assert.equal(cancelar.disabled, false);
  assert.equal(document.querySelector("[data-hyto-cancelar-firma]"), null);
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
  await pulsar("Lock US$20");
  await act(async () => {
    await Promise.resolve();
  });
  assert.equal((document.querySelector("dialog") as HTMLDialogElement).open, true);
  assert.ok(document.querySelector("[role='alert']"));
  await desmontar();
});
