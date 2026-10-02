import { Entrar } from "@/components/admin/Entrar";
import { PanelCuenta } from "@/components/integrante/PanelCuenta";
import { InsigniaDemo } from "@/components/sesion/InsigniaDemo";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { Salir } from "@/components/sesion/Salir";
import { demoHabilitado } from "@/lib/sesion/demo";
import { exigirPagina } from "@/lib/sesion/puerta";
import { leerModoDemo } from "@/lib/sesion/vista";

export default async function PaginaCuentas() {
  const sesion = await exigirPagina();
  const demo = await leerModoDemo();
  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <header className="hyto-page-head">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="hyto-title">Account</h1>
            <InsigniaDemo />
          </div>
          <p className="hyto-sub">{sesion.email}</p>
        </div>
      </header>
      <div className="mb-6 max-w-sm">
        <Salir />
      </div>
      <PanelCuenta />
      {demo ? null : (
        <div className="mt-8">
          <PrepararUsdc />
        </div>
      )}
      {demo ? (
        <div className="mt-8 max-w-sm">
          <Entrar demoHabilitado={demoHabilitado()} />
        </div>
      ) : null}
    </main>
  );
}
