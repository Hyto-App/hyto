export function formatearMonto(monto: string): string {
  const limpio = monto.trim();
  if (!limpio) return "";
  const valor = Number(limpio);
  if (!Number.isFinite(valor)) return monto;
  const decimales = Number.isInteger(valor) ? 0 : 2;
  return `US$${valor.toLocaleString("en-US", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: 2,
  })}`;
}

function fechaDeCalendario(anio: number, mes: number, dia: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, 12));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
}

export function formatearFecha(iso: string): string {
  const limpio = iso.trim();
  const calendario = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.0+)?(?:[zZ]|[+-]00:?00))?$/.exec(limpio);
  if (calendario) {
    const texto = fechaDeCalendario(Number(calendario[1]), Number(calendario[2]), Number(calendario[3]));
    if (texto) return texto;
    return iso;
  }
  const fecha = new Date(limpio);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Costa_Rica",
  }).format(fecha);
}

export function acortarDireccion(direccion: string): string {
  if (direccion.length < 12) return direccion;
  return `${direccion.slice(0, 6)}…${direccion.slice(-4)}`;
}

export function montoDeTarea(tarea: { tipo: "trabajo" | "reembolso"; monto: string; tope: string | null }): string {
  if (tarea.tipo === "reembolso") {
    const tope = formatearMonto(tarea.tope ?? tarea.monto);
    return tope ? `Up to ${tope}` : "";
  }
  return formatearMonto(tarea.monto);
}
