import { Marco } from "@/components/admin/Marco";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { VigilarSesion } from "@/components/sesion/VigilarSesion";
import { demoHabilitado } from "@/lib/sesion/demo";
import { leerRolDemo } from "@/lib/sesion/vista";

export default async function LayoutAdmin({ children }: Readonly<{ children: React.ReactNode }>) {
  const rolDemo = await leerRolDemo();
  return (
    <div className="min-h-dvh print:min-h-0">
      <ProveedorModoDemo activo={rolDemo !== null} rol={rolDemo}>
        <VigilarSesion />
        <Marco demoHabilitado={demoHabilitado()}>{children}</Marco>
      </ProveedorModoDemo>
    </div>
  );
}
