import { after } from "next/server";
import { conAlmacen } from "@/lib/api/base";
import { publicarEvidenciaHttp } from "@/lib/api/evidencias";

export async function POST(request: Request): Promise<Response> {
  return conAlmacen((almacen, fotos) =>
    publicarEvidenciaHttp(request, {
      almacen,
      fotos,
      continuar: (trabajo) => {
        after(() => trabajo);
      },
    }),
  );
}
