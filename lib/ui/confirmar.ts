export type GanchosConfirmacion = {
  ocupado: (valor: boolean) => void;
  error: (mensaje: string | null) => void;
  cerrar: () => void;
};

export type Confirmacion = {
  (): Promise<void>;
  /** Aborts the action in progress and closes. With nothing running, it only closes. */
  cancelar: () => void;
};

/** Runs the confirmed action once. While it runs a second call is ignored; if it throws the dialog stays open with the message. */
export function crearConfirmacion(
  accion: (senal: AbortSignal) => Promise<void>,
  ganchos: GanchosConfirmacion,
  mensaje: (error: unknown) => string,
): Confirmacion {
  let enCurso = false;
  let cancelado = false;
  let controlador: AbortController | null = null;

  async function confirmar(): Promise<void> {
    if (enCurso) return;
    enCurso = true;
    cancelado = false;
    controlador = new AbortController();
    ganchos.ocupado(true);
    ganchos.error(null);
    try {
      await accion(controlador.signal);
      if (!cancelado) ganchos.cerrar();
    } catch (error) {
      if (!cancelado) ganchos.error(mensaje(error));
    } finally {
      enCurso = false;
      controlador = null;
      if (cancelado) ganchos.cerrar();
      ganchos.ocupado(false);
    }
  }

  confirmar.cancelar = () => {
    if (!enCurso) {
      ganchos.cerrar();
      return;
    }
    cancelado = true;
    controlador?.abort();
  };
  return confirmar;
}
