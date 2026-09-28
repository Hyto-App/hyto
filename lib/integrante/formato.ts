export function formatearMonto(monto: string): string {
  const valor = Number(monto);
  if (!Number.isFinite(valor)) return monto;
  const decimales = Number.isInteger(valor) ? 0 : 2;
  return `US$${valor.toLocaleString("en-US", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: 2,
  })}`;
}

export function formatearFecha(iso: string): string {
  const fecha = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

export function acortarDireccion(direccion: string): string {
  if (direccion.length < 12) return direccion;
  return `${direccion.slice(0, 6)}…${direccion.slice(-4)}`;
}

export function montoDeTarea(tarea: { tipo: "trabajo" | "reembolso"; monto: string; tope: string | null }): string {
  if (tarea.tipo === "reembolso") {
    return `Hasta ${formatearMonto(tarea.tope ?? tarea.monto)}`;
  }
  return formatearMonto(tarea.monto);
}
