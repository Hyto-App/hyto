import { fotosBlob, type Fotos } from "@/lib/blob/fotos";
import type { Almacen } from "@/lib/db/almacen";
import { almacenNeon } from "@/lib/db/neon";
import { sinBase } from "./json";

export async function conAlmacen(trabajo: (almacen: Almacen, fotos: Fotos | null) => Promise<Response>): Promise<Response> {
  const almacen = await almacenNeon();
  if (!almacen) return sinBase();
  return trabajo(almacen, fotosBlob());
}
