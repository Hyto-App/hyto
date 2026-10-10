/** Session flag so a peak gesture does not play again after the person looks away. */
export function gestoVisto(clave: string): boolean {
  try {
    return window.sessionStorage.getItem(clave) === "1";
  } catch {
    return false;
  }
}

export function marcarGesto(clave: string): void {
  try {
    window.sessionStorage.setItem(clave, "1");
  } catch {
    // Private mode can reject storage. The settled class still holds for this view.
  }
}
