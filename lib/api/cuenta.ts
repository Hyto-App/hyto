import type { Almacen } from "@/lib/db/almacen";
import type { SesionFila } from "@/lib/db/tipos";
import { armarVistaCuenta } from "@/lib/integrante/panel-cuenta";
import type { LectorSaldo } from "@/lib/escrow/saldo";
import { sesionEsDemo } from "@/lib/sesion/demo";
import type { Idioma } from "@/lib/ui/idioma";
import { baseNoLista, json } from "./json";

export async function leerCuentaHttp(
  sesion: SesionFila,
  almacen: Almacen,
  opciones: { ahora?: Date; leerSaldo?: LectorSaldo; idioma?: Idioma } = {},
): Promise<Response> {
  try {
    const vista = await armarVistaCuenta({
      almacen,
      usuarioId: sesion.usuarioId,
      email: sesion.email,
      wallet: sesion.wallet ?? "",
      demo: sesionEsDemo(sesion),
      ahora: opciones.ahora,
      leerSaldo: opciones.leerSaldo,
      idioma: opciones.idioma,
    });
    return json(vista, 200, { "cache-control": "no-store" });
  } catch (error) {
    return baseNoLista(error);
  }
}
