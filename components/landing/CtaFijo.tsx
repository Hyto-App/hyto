"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDiscurso } from "@/components/ui/Idioma";

/**
 * Mobile primary CTA fixed at the bottom with iOS safe-area padding.
 * Hidden on wide screens, while sign-in is open, and while the hero CTA is still in view
 * so the fixed bar never covers the first screen.
 */
export function CtaFijo() {
  const copia = useDiscurso();
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      const loginAbierto = params.get("signin") === "1" || document.querySelector(".hyto-login") !== null;
      const heroCta = document.querySelector(".hyto-landing-cta-principal");
      let heroVisible = true;
      if (heroCta) {
        const caja = heroCta.getBoundingClientRect();
        heroVisible = caja.bottom > 0 && caja.top < window.innerHeight;
      }
      const anchoEscritorio = window.matchMedia("(min-width: 768px)").matches;
      setOculto(loginAbierto || heroVisible || anchoEscritorio);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    window.addEventListener("popstate", sync);
    const Observer = typeof MutationObserver === "function" ? MutationObserver : null;
    const obs = Observer ? new Observer(sync) : null;
    obs?.observe(document.body, { childList: true, subtree: true });
    return () => {
      obs?.disconnect();
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  if (oculto) return null;

  return (
    <div className="hyto-cta-fijo" data-cta-fijo>
      <Link href="/?signin=1" className="hyto-btn hyto-cta-fijo-btn">
        {copia.ctaCuenta}
      </Link>
    </div>
  );
}
