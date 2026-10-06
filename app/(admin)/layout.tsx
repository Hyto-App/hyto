import { Marco } from "@/components/admin/Marco";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { VigilarSesion } from "@/components/sesion/VigilarSesion";
import { demoHabilitado } from "@/lib/sesion/demo";
import { leerPerfil } from "@/lib/sesion/perfil";
import { leerRolDemo, leerSesionActual } from "@/lib/sesion/vista";

export default async function LayoutAdmin({ children }: Readonly<{ children: React.ReactNode }>) {
  const rolDemo = await leerRolDemo();
  const sesion = await leerSesionActual();
  const perfil = sesion ? await leerPerfil(sesion) : null;
  return (
    <div className="min-h-dvh print:min-h-0">
      <ProveedorModoDemo activo={rolDemo !== null} rol={rolDemo}>
        <VigilarSesion />
        {sesion ? <Marco demoHabilitado={demoHabilitado()} usuario={perfil}>{children}</Marco> : children}
      </ProveedorModoDemo>
    </div>
  );
}
