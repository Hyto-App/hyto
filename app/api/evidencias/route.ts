import { after } from "next/server";
import { conAlmacen } from "@/lib/api/base";
import { publicarEvidenciaHttp } from "@/lib/api/evidencias";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen, fotos) =>
    publicarEvidenciaHttp(request, {
      almacen,
      fotos,
      usuarioId: sesion.usuarioId,
      continuar: (trabajo) => {
        after(() => trabajo);
      },
    }),
  );
}
