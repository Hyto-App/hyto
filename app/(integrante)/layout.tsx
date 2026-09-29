import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { leerModoDemo } from "@/lib/sesion/vista";

export default async function LayoutIntegrante({ children }: Readonly<{ children: React.ReactNode }>) {
  const modoDemo = await leerModoDemo();
  return (
    <ProveedorModoDemo activo={modoDemo}>
      <div className="mx-auto min-h-dvh w-full max-w-md px-5 py-8">{children}</div>
    </ProveedorModoDemo>
  );
}
