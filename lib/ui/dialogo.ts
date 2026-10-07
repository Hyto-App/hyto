const SEL =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function elementosFoco(raiz: ParentNode): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>(SEL)].filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
}

type Tecla = { key: string; shiftKey: boolean; preventDefault: () => void; target?: EventTarget | null };

/** Esc closes. Tab stays inside the dialog. */
export function teclaDialogo(evento: Tecla, raiz: HTMLElement, cerrar: () => void): void {
  if (evento.key === "Escape") {
    evento.preventDefault();
    cerrar();
    return;
  }
  if (evento.key !== "Tab") return;
  const items = elementosFoco(raiz);
  if (items.length === 0) {
    evento.preventDefault();
    return;
  }
  const primero = items[0];
  const ultimo = items[items.length - 1];
  const activo = evento.target instanceof Node ? evento.target : null;
  if (evento.shiftKey && (activo === primero || !raiz.contains(activo))) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && activo === ultimo) {
    evento.preventDefault();
    primero.focus();
  }
}
