/** Notice from a sign-up whose testnet setup did not finish. Shown once, inside Events. */
export const CLAVE_AVISO_ALTA = "hyto-alta-aviso";

export function guardarAvisoAlta(texto: string, almacenamiento: Pick<Storage, "setItem"> = sessionStorage): void {
  const limpio = texto.trim();
  if (!limpio) return;
  try {
    almacenamiento.setItem(CLAVE_AVISO_ALTA, limpio);
  } catch {
    // The person still lands on Events. The notice is the extra.
  }
}

export function tomarAvisoAlta(almacenamiento: Pick<Storage, "getItem" | "removeItem"> = sessionStorage): string | null {
  try {
    const texto = almacenamiento.getItem(CLAVE_AVISO_ALTA)?.trim() ?? "";
    almacenamiento.removeItem(CLAVE_AVISO_ALTA);
    return texto || null;
  } catch {
    return null;
  }
}
