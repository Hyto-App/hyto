import { Entrar } from "@/components/admin/Entrar";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { Salir } from "@/components/sesion/Salir";
import { demoHabilitado } from "@/lib/sesion/demo";
import { exigirPagina } from "@/lib/sesion/puerta";
import { leerModoDemo } from "@/lib/sesion/vista";

export default async function PaginaCuentas() {
  const sesion = await exigirPagina();
  const demo = await leerModoDemo();
  if (demo) {
    return (
      <>
        <div className="hyto-page pb-0">
          <h1 className="hyto-title">Account</h1>
          <p className="hyto-sub">{sesion.email}</p>
          <div className="mt-4 max-w-sm">
            <Entrar demoHabilitado={demoHabilitado()} />
          </div>
        </div>
      </>
    );
  }
  return (
    <main className="hyto-page mx-auto max-w-lg">
      <h1 className="hyto-title">Account</h1>
      <p className="hyto-sub">{sesion.email}</p>
      <div className="mt-4">
        <Salir />
      </div>
      <div className="mt-8">
        <PrepararUsdc />
      </div>
    </main>
  );
}
