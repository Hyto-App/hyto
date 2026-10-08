import { after } from "next/server";
import { conAlmacen } from "@/lib/api/base";
import { publicarEvidenciaHttp } from "@/lib/api/evidencias";
import { demoHabilitado, sesionEsDemo } from "@/lib/sesion/demo";
import { exigirSesion } from "@/lib/sesion/exigir";

/**
 * The review keeps running in `after()`, inside this same limit counted from the request.
 * Keep it equal to `MAX_DURACION_SUBIDA_MS` in `lib/api/plazo-revision.ts`.
 */
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const inicio = Date.now();
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen, fotos) =>
    publicarEvidenciaHttp(request, {
      almacen,
      fotos,
      inicio,
      actor: {
        usuarioId: sesion.usuarioId,
        rol: sesion.rol,
        demo: demoHabilitado() && sesionEsDemo(sesion),
        wallet: sesion.wallet,
      },
      continuar: (trabajo) => {
        after(() => trabajo);
      },
    }),
  );
}
