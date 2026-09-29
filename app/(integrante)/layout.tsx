import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { VigilarSesion } from "@/components/sesion/VigilarSesion";
import { leerRolDemo } from "@/lib/sesion/vista";

export default async function LayoutIntegrante({ children }: Readonly<{ children: React.ReactNode }>) {
  const rolDemo = await leerRolDemo();
  return (
    <ProveedorModoDemo activo={rolDemo !== null} rol={rolDemo}>
      <VigilarSesion />
      <div className="mx-auto min-h-dvh w-full max-w-md px-5 py-8">{children}</div>
    </ProveedorModoDemo>
  );
}
