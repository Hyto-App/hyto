import { after } from "next/server";
import { conAlmacen } from "@/lib/api/base";
import { publicarEvidenciaHttp } from "@/lib/api/evidencias";
import { demoHabilitado, sesionEsDemo } from "@/lib/sesion/demo";
import { exigirSesion } from "@/lib/sesion/exigir";

/** The review keeps running in `after()`. Without this, Hobby stops the function near 10s and no verdict is stored. */
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen, fotos) =>
    publicarEvidenciaHttp(request, {
      almacen,
      fotos,
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
