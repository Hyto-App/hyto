/** Stroke icons from Pao's mockup (24×24). Decorative: always aria-hidden. */
const TRAZOS = {
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.8" />
      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5M12 14.5v2" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkC: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.8 2.8L16.2 9.6" />
    </>
  ),
  spark: (
    <>
      <path d="M11 3.5l1.9 5.1L18 10.5l-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z" />
      <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8h.01" />
    </>
  ),
  chevR: <path d="M9.5 6l6 6-6 6" />,
  chevL: <path d="M14.5 6l-6 6 6 6" />,
  dots: <path d="M5.5 12h.01M12 12h.01M18.5 12h.01" strokeWidth="3.2" />,
  swap: <path d="M5 8h13l-3.5-3.5M19 16H6l3.5 3.5" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.5H15" />,
  broom: <path d="M20 4l-7 7M9.5 10l4.5 4.5M9.5 10C6.8 10.5 5 12.6 4.5 15.5L3.5 20.5l5-1c2.9-.5 5-2.3 5.5-5M7 16.5l1.5 1.5" />,
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  cal: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
      <path d="M4 10h16M9 3.5v4M15 3.5v4" />
    </>
  ),
  hand: (
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11M12 10V4.5a1.5 1.5 0 0 1 3 0V11M15 10.5V6.5a1.5 1.5 0 0 1 3 0v7.5c0 4-2.7 7-6.5 7-2.6 0-4.4-1.3-5.6-3.4L4 13.6a1.5 1.5 0 0 1 2.5-1.6L9 14.5V8.5a1.5 1.5 0 0 1 3 0" />
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.2h.01" />
    </>
  ),
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tam }: { nombre: NombreIcono; tam?: 14 | 16 }) {
  return (
    <svg className={`pj-ic${tam ? ` is-${tam}` : ""}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {TRAZOS[nombre]}
    </svg>
  );
}
