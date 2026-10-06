import type { Metadata } from "next";
import { Entrar } from "@/components/admin/Entrar";
import { PanelCuenta } from "@/components/integrante/PanelCuenta";
import { InsigniaDemo } from "@/components/sesion/InsigniaDemo";
import { Salir } from "@/components/sesion/Salir";
import { Texto } from "@/components/ui/Idioma";
import { demoHabilitado } from "@/lib/sesion/demo";
import { PARAM_PASSKEY, ANCLA_PASSKEY, RUTA_PASSKEY_CUENTAS } from "@/lib/integrante/enlacePasskey";
import { exigirPagina } from "@/lib/sesion/puerta";
import { leerModoDemo } from "@/lib/sesion/vista";

export const metadata: Metadata = { title: "Account" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PaginaCuentas({ searchParams }: Props) {
  // From the passkey guide's link, come back to the passkey card after signing in.
  const pide = (await searchParams)[PARAM_PASSKEY] === ANCLA_PASSKEY;
  const sesion = await exigirPagina(pide ? RUTA_PASSKEY_CUENTAS : undefined);
  const demo = await leerModoDemo();
  return (
    <main className="hyto-page mx-auto max-w-3xl">
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
      {demo ? (
        <div className="mt-8 max-w-sm">
          <Entrar demoHabilitado={demoHabilitado()} />
        </div>
      ) : null}
    </main>
  );
}
