export type GanchosConfirmacion = {
  ocupado: (valor: boolean) => void;
  error: (mensaje: string | null) => void;
  cerrar: () => void;
};

/** Runs the confirmed action once. While it runs a second call is ignored; if it throws the dialog stays open with the message. */
export function crearConfirmacion(accion: () => Promise<void>, ganchos: GanchosConfirmacion, mensaje: (error: unknown) => string) {
  let enCurso = false;
  return async function confirmar(): Promise<void> {
    if (enCurso) return;
    enCurso = true;
    ganchos.ocupado(true);
    ganchos.error(null);
    try {
      await accion();
      ganchos.cerrar();
    } catch (error) {
      ganchos.error(mensaje(error));
    } finally {
      enCurso = false;
      ganchos.ocupado(false);
    }
  };
}
