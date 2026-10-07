"use client";

import { useEffect } from "react";

/** The passkey card mounts after the account loads, so the hash jump has to wait for it. */
export function AnclaPasskey() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace(/^#/, "");
    if (params.get("add") !== "passkey" && hash !== "passkey") return;
    let veces = 0;
    const id = window.setInterval(() => {
      const nodo = document.getElementById("passkey");
      veces += 1;
      if (nodo instanceof HTMLElement) {
        const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        nodo.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "center" });
        nodo.focus({ preventScroll: true });
        window.clearInterval(id);
      } else if (veces > 40) {
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  return null;
}
