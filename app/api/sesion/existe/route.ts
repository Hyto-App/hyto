import { conAlmacen } from "@/lib/api/base";
import { existeCuentaHttp } from "@/lib/api/existe-cuenta";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return conAlmacen((almacen) => existeCuentaHttp(request, almacen));
}
