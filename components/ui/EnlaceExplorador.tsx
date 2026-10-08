import type { ReactNode } from "react";

/** Stellar Expert stays on testnet and always opens beside Hyto. */
export function EnlaceExplorador({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
