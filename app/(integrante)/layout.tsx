import { MarcoVoluntario } from "@/components/integrante/MarcoVoluntario";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { VigilarSesion } from "@/components/sesion/VigilarSesion";
import { leerRolDemo } from "@/lib/sesion/vista";

export default async function LayoutIntegrante({ children }: Readonly<{ children: React.ReactNode }>) {
  const rolDemo = await leerRolDemo();
  return (
    <ProveedorModoDemo activo={rolDemo !== null} rol={rolDemo}>
      <VigilarSesion />
      <MarcoVoluntario>{children}</MarcoVoluntario>
    </ProveedorModoDemo>
  );
}
