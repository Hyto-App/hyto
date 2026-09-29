import { conAlmacen } from "@/lib/api/base";
import { listarTareasHttp } from "@/lib/api/tareas";

export async function GET(): Promise<Response> {
  return conAlmacen((almacen) => listarTareasHttp(almacen));
}
