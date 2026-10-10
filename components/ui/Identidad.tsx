import Link from "next/link";
import type { ReactNode } from "react";
import { iniciales } from "@/components/ui/Marca";

type Props = {
  nombre: string;
  rol?: string | null;
  detalle?: string | null;
  etiquetas?: readonly string[];
  /** Shown only when there is no name, role text, detail, or tags. */
  vacio?: string | null;
  foto?: string | null;
  href?: string;
  /** Drops the card chrome so a parent row can supply it. */
  plana?: boolean;
  /** Renders a span so the card can sit inside a button. */
  enLinea?: boolean;
  extra?: ReactNode;
};

/** Person card: avatar, name, role, tags, and an empty line. */
export function Identidad({ nombre, rol, detalle, etiquetas = [], vacio, foto, href, plana = false, enLinea = false, extra }: Props) {
  const limpio = nombre.trim();
  const marcas = etiquetas.map((etiqueta) => etiqueta.trim()).filter(Boolean);
  const sinDatos = !limpio && !rol?.trim() && !detalle?.trim() && marcas.length === 0;
  if (sinDatos) {
    if (!vacio?.trim()) return null;
    return <p className="hyto-identidad-vacio">{vacio}</p>;
  }
  const cuerpo = (
    <>
      {foto ? (
        // Stored photos are https URLs checked before they are saved.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="hyto-identidad-foto" src={foto} alt="" />
      ) : (
        <span className="hyto-avatar hyto-avatar-id" aria-hidden="true">
          {iniciales(limpio || rol || "")}
        </span>
      )}
      <span className="hyto-identidad-cuerpo">
        <span className="hyto-identidad-tope">
          <span>
            <span className="hyto-identidad-nombre">{limpio || rol}</span>
            {limpio && rol?.trim() ? <span className="hyto-identidad-rol">{rol}</span> : null}
          </span>
          {extra}
        </span>
        {detalle?.trim() ? <span className="hyto-identidad-detalle">{detalle}</span> : null}
        {marcas.length > 0 ? (
          <ul className="hyto-identidad-tags">
            {marcas.map((etiqueta) => (
              <li key={etiqueta}>{etiqueta}</li>
            ))}
          </ul>
        ) : null}
      </span>
    </>
  );
  const clase = `hyto-identidad${plana ? " is-plana" : ""}`;
  if (href) {
    return (
      <Link href={href} className={clase}>
        {cuerpo}
      </Link>
    );
  }
  const Etiqueta = enLinea ? "span" : "div";
  return <Etiqueta className={clase}>{cuerpo}</Etiqueta>;
}
