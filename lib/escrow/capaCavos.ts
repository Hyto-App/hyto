/**
 * The Cavos vault (`@cavos/kit` 0.2.5, `dist/vault/index.mjs`) signs a contract call such as
 * `tw_new_multi_release_escrow` only after the person approves it. The iframe
 * (`position:fixed; inset:0; z-index:2147483647`, background transparent) is appended to
 * `document.body`. Approve is created with `disabled`. `guard()` watches the card inside the
 * iframe:
 *
 * `new IntersectionObserver(cb, { threshold: [0], trackVisibility: true, delay: 100 })`
 *
 * When `entry.isVisible === true`, `arm(700)` runs and Approve stays disabled until that
 * animation ends. Any other sample calls `disarm()` and Approve stays disabled. Chrome treats
 * the card as not visible when the iframe is partly covered, or when `html` / `body` (the
 * iframe's ancestors) have an opacity other than 1, a transform, a filter, or
 * `will-change: transform`. A modal dialog and its backdrop, and a control painted on top of
 * the iframe, are enough on their own. A passkey is not part of this gate.
 *
 * `bajarCapasParaCavos` drops those layers before `signXdr`, `addTrustline`, and `execute`,
 * and puts them back when that call settles. The review screen keeps its own inline status
 * in the page, under the iframe.
 */

const CLASE_BAJO = "hyto-bajo-firma";
const CLASE_FIRMANDO = "hyto-firmando";

let firmas = 0;
const oyentes = new Set<() => void>();

/** True while a Cavos prompt is on screen and Hyto's covering UI must stay unmounted. */
export function firmaCavosActiva(): boolean {
  return firmas > 0;
}

export function suscribirFirmaCavos(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function soltarDialogosModales(): void {
  if (typeof document === "undefined") return;
  for (const nodo of document.querySelectorAll("dialog")) {
    if (!esDialogo(nodo) || !nodo.open) continue;
    nodo.close();
  }
}

/** Hides every Hyto layer that would keep the vault card from being reported visible. */
export function bajarCapasParaCavos(): () => void {
  if (typeof document === "undefined") return () => undefined;
  soltarDialogosModales();
  quitarCancelarFirma();
  const capas = [...document.querySelectorAll(".hyto-login")].filter((nodo): nodo is HTMLElement => nodo instanceof HTMLElement);
  const previos = capas.map((nodo) => {
    const tenia = nodo.classList.contains(CLASE_BAJO);
    const modal = nodo.getAttribute("aria-modal");
    nodo.classList.add(CLASE_BAJO);
    if (modal === "true") nodo.setAttribute("aria-modal", "false");
    return { nodo, tenia, modal };
  });
  const raiz = document.documentElement;
  firmas += 1;
  raiz.classList.toggle(CLASE_FIRMANDO, firmas > 0);
  publicarYa();
  let restaurado = false;
  return () => {
    if (restaurado) return;
    restaurado = true;
    for (const { nodo, tenia, modal } of previos) {
      if (!nodo.isConnected) continue;
      if (!tenia) nodo.classList.remove(CLASE_BAJO);
      if (modal === "true") nodo.setAttribute("aria-modal", modal);
      else if (modal === null) nodo.removeAttribute("aria-modal");
    }
    firmas = Math.max(0, firmas - 1);
    if (typeof document !== "undefined") document.documentElement.classList.toggle(CLASE_FIRMANDO, firmas > 0);
    publicarYa();
  };
}

function publicarYa(): void {
  for (const oyente of oyentes) oyente();
}

function quitarCancelarFirma(): void {
  for (const nodo of document.querySelectorAll("[data-hyto-cancelar-firma], .hyto-cancelar-firma")) {
    nodo.remove();
  }
}

function esDialogo(nodo: Element): nodo is HTMLDialogElement {
  return nodo.tagName === "DIALOG" && "open" in nodo && typeof (nodo as HTMLDialogElement).close === "function";
}
