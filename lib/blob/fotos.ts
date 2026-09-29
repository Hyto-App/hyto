import { get, put } from "@vercel/blob";
import { tokenDeBlob } from "@/lib/config/entorno";

export type FotoLeida = {
  tipo: string;
  bytes: Uint8Array;
};

export type Fotos = {
  guardar(nombre: string, cuerpo: Blob): Promise<string>;
  leer(id: string): Promise<FotoLeida | null>;
};

export function crearFotosMemoria(): Fotos {
  const guardadas = new Map<string, FotoLeida>();
  return {
    async guardar(nombre, cuerpo) {
      const id = `memoria/${crypto.randomUUID()}/${nombre}`;
      guardadas.set(id, {
        tipo: cuerpo.type || "application/octet-stream",
        bytes: new Uint8Array(await cuerpo.arrayBuffer()),
      });
      return id;
    },
    async leer(id) {
      return guardadas.get(id) ?? null;
    },
  };
}

export function fotosBlob(): Fotos | null {
  // Lo definen las pruebas locales. En el servidor no existe y sigue el Blob.
  const tabla = globalThis as typeof globalThis & {
    __HYTO_FOTOS_PRUEBA?: () => Fotos | null;
  };
  if (typeof tabla.__HYTO_FOTOS_PRUEBA === "function") return tabla.__HYTO_FOTOS_PRUEBA();
  const token = tokenDeBlob();
  if (!token) return null;
  return {
    async guardar(nombre, cuerpo) {
      const archivo = await put(`evidencias/${nombre}`, cuerpo, {
        access: "private",
        token,
        addRandomSuffix: true,
        contentType: cuerpo.type || "image/jpeg",
      });
      return archivo.pathname;
    },
    async leer(id) {
      const archivo = await get(id, { access: "private", token });
      if (!archivo || archivo.statusCode !== 200 || !archivo.stream) return null;
      const bytes = new Uint8Array(await new Response(archivo.stream).arrayBuffer());
      return { tipo: archivo.blob.contentType || "application/octet-stream", bytes };
    },
  };
}
