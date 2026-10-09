import Link from "next/link";

export type Miga = { href?: string; etiqueta: string };

/** Compact breadcrumb for FAQ and legal pages. Hidden on very narrow screens if it would wrap heavily. */
export function Migas({ items, ariaLabel }: { items: readonly Miga[]; ariaLabel: string }) {
  return (
    <nav className="hyto-migas" aria-label={ariaLabel}>
      <ol>
        {items.map((item, i) => {
          const ultimo = i === items.length - 1;
          return (
            <li key={`${item.etiqueta}-${i}`}>
              {ultimo || !item.href ? (
                <span aria-current={ultimo ? "page" : undefined}>{item.etiqueta}</span>
              ) : (
                <Link href={item.href}>{item.etiqueta}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
