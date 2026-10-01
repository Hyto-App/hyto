import { CuentasDemo } from "@/components/integrante/CuentasDemo";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { exigirPagina } from "@/lib/sesion/puerta";
import { leerModoDemo } from "@/lib/sesion/vista";

export default async function PaginaCuentas() {
  await exigirPagina();
  if (await leerModoDemo()) return <CuentasDemo />;
  return (
    <main className="hyto-page mx-auto max-w-lg">
      <h1 className="hyto-title">Your payout account</h1>
      <div className="mt-6">
        <PrepararUsdc />
      </div>
    </main>
  );
}
