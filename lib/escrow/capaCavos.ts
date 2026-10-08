/**
 * The Cavos vault (`@cavos/kit` 0.2.5) signs a contract call such as
 * `tw_new_multi_release_escrow` only after the person approves it. Transfers inside the app's
 * dashboard limits are silent. Anything else, including a Soroban call, opens the vault iframe
 * (`vault.cavos.xyz/vault`, z-index 2147483647) titled "Approve this transaction". The caption
 * "Cavos signs small amounts on its own. This one needs you." means this call is outside the
 * silent limit. It does not mean a passkey is missing.
 *
 * Approve is created disabled. The kit arms it only after IntersectionObserver v2 reports the
 * card `isVisible` for 700ms (`trackVisibility`). A `<dialog>` opened with `showModal()` sits in
 * the top layer, paints a full-viewport backdrop over the iframe, and marks the rest of the page
 * inert. `isVisible` stays false, so Approve stays disabled. Reject is enabled in the iframe DOM
 * and still cannot be clicked.
 *
 * A passkey is not required to sign on the browser that created the account. Stellar sign-up
 * never asks for one. `GET /api/passkey-wraps` returning `{ "wraps": [] }` is the normal state
 * until the person adds a passkey on Account. That passkey only restores the key on another
 * device (`VaultClient.enrollPasskey`). `needs-device-approval` means this browser does not hold
 * the key. The kit already sets the iframe
 * `allow="publickey-credentials-get …; publickey-credentials-create …"` for that enrollment.
 * WebAuthn is not the step that enables Approve.
 *
 * Call `bajarCapasParaCavos` immediately around `signXdr`, `addTrustline`, and `execute`, and
 * leave it in place until that call settles. Restoring earlier puts a modal back on top of the
 * iframe and Approve never arms.
 */

const CLASE_BAJO = "hyto-bajo-firma";

export function soltarDialogosModales(): void {
  if (typeof document === "undefined") return;
  for (const nodo of document.querySelectorAll("dialog")) {
    if (!esDialogo(nodo) || !nodo.open || !esModal(nodo)) continue;
    nodo.close();
  }
}

/** Hides full-screen Hyto layers and closes modal dialogs for the duration of a Cavos prompt. */
export function bajarCapasParaCavos(): () => void {
  if (typeof document === "undefined") return () => undefined;
  soltarDialogosModales();
  const capas = [...document.querySelectorAll(".hyto-login")].filter((nodo): nodo is HTMLElement => nodo instanceof HTMLElement);
  const previos = capas.map((nodo) => {
    const tenia = nodo.classList.contains(CLASE_BAJO);
    const modal = nodo.getAttribute("aria-modal");
    nodo.classList.add(CLASE_BAJO);
    if (modal === "true") nodo.setAttribute("aria-modal", "false");
    return { nodo, tenia, modal };
  });
  return () => {
    for (const { nodo, tenia, modal } of previos) {
      if (!tenia) nodo.classList.remove(CLASE_BAJO);
      if (modal === "true") nodo.setAttribute("aria-modal", modal);
    }
  };
}

function esDialogo(nodo: Element): nodo is HTMLDialogElement {
  return nodo.tagName === "DIALOG" && "open" in nodo && typeof (nodo as HTMLDialogElement).close === "function";
}

function esModal(nodo: HTMLDialogElement): boolean {
  try {
    return nodo.matches(":modal");
  } catch {
    return false;
  }
}
