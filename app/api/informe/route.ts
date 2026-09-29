import { conAlmacen } from "@/lib/api/base";
import { informeHttp } from "@/lib/api/informe";

export async function GET(): Promise<Response> {
  return conAlmacen((almacen) => informeHttp(almacen));
}
