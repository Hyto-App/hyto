import { crearDemoHttp, estadoDemoHttp } from "@/lib/api/demo";
import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { demoHabilitado } from "@/lib/sesion/demo";

export async function GET(): Promise<Response> {
  return estadoDemoHttp();
}

export async function POST(request: Request): Promise<Response> {
  if (!demoHabilitado()) return json({ aviso: "Not found." }, 404);
  return conAlmacen((almacen) => crearDemoHttp(request, almacen));
}
