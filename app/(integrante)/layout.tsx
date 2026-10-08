import { Marco } from "@/components/admin/Marco";
import { organizacionesActivas } from "@/lib/organizaciones/bandera";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { VigilarSesion } from "@/components/sesion/VigilarSesion";
import { demoHabilitado } from "@/lib/sesion/demo";
import { eventosOrganizados } from "@/lib/sesion/organiza";
import { leerPerfil } from "@/lib/sesion/perfil";
import { leerRolDemo, leerSesionActual } from "@/lib/sesion/vista";

export const dynamic = "force-dynamic";

export default async function LayoutIntegrante({ children }: Readonly<{ children: React.ReactNode }>) {
  const rolDemo = await leerRolDemo();
  const sesion = await leerSesionActual();
  const perfil = sesion ? await leerPerfil(sesion) : null;
  const organizados = sesion ? await eventosOrganizados(sesion.usuarioId) : [];
  return (
    <ProveedorModoDemo activo={rolDemo !== null} rol={rolDemo}>
      <VigilarSesion confirmada={sesion !== null} />
      <Marco demoHabilitado={demoHabilitado()} usuario={perfil} eventosOrganizados={organizados} mostrarOrganizaciones={organizacionesActivas()}>{children}</Marco>
    </ProveedorModoDemo>
  );
}
