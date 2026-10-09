import { pedirCodigoHttp } from "@/lib/api/ingreso-codigo";

export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return pedirCodigoHttp(request);
}
