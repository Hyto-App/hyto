import { Marco } from "@/components/admin/Marco";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { demoHabilitado } from "@/lib/sesion/demo";
import { leerModoDemo } from "@/lib/sesion/vista";

export default async function LayoutAdmin({ children }: Readonly<{ children: React.ReactNode }>) {
  const modoDemo = await leerModoDemo();
  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <ProveedorModoDemo activo={modoDemo}>
        <Marco demoHabilitado={demoHabilitado()}>{children}</Marco>
      </ProveedorModoDemo>
    </div>
  );
}
