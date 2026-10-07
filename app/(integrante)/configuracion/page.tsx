import type { Metadata } from "next";
import Link from "next/link";
import { Entrar } from "@/components/admin/Entrar";
import { AnclaPasskey } from "@/components/integrante/AnclaPasskey";
import { PanelCuenta } from "@/components/integrante/PanelCuenta";
import { InsigniaDemo } from "@/components/sesion/InsigniaDemo";
import { Salir } from "@/components/sesion/Salir";
import { Texto } from "@/components/ui/Idioma";
import { demoHabilitado } from "@/lib/sesion/demo";
import { ENLACE_PRIVACIDAD } from "@/lib/ui/privacidad";
import { exigirPagina } from "@/lib/sesion/puerta";
import { leerModoDemo } from "@/lib/sesion/vista";

export const metadata: Metadata = { title: "Settings" };

export default async function PaginaConfiguracion() {
  const sesion = await exigirPagina();
  const demo = await leerModoDemo();
  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <AnclaPasskey />
      <header className="hyto-page-head">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Texto as="h1" clave="cuenta.titulo" className="hyto-title" />
            <InsigniaDemo />
          </div>
          <p className="hyto-sub">{sesion.email}</p>
        </div>
      </header>
      <div className="mb-6 max-w-sm">
        <Salir />
      </div>
      <PanelCuenta />
      <p className="mt-8 text-sm">
        <Link href="/privacy" className="text-[var(--suave)] underline underline-offset-4">
          {ENLACE_PRIVACIDAD}
        </Link>
      </p>
      {demo ? (
        <div className="mt-8 max-w-sm">
          <Entrar demoHabilitado={demoHabilitado()} />
        </div>
      ) : null}
    </main>
  );
}
