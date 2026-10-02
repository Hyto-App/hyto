import { conAlmacen } from "@/lib/api/base";
import { emitirTokenEvidenciaHttp } from "@/lib/api/evidencias";
import { demoHabilitado, sesionEsDemo } from "@/lib/sesion/demo";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen, fotos) =>
    emitirTokenEvidenciaHttp(request, {
      almacen,
      fotos,
      actor: { usuarioId: sesion.usuarioId, rol: sesion.rol, demo: demoHabilitado() && sesionEsDemo(sesion) },
    }),
  );
}
