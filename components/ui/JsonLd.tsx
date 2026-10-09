/** Server-only JSON-LD script. One graph per call; call again for another type. */
export function JsonLd({ datos }: { datos: Record<string, unknown> | null }) {
  if (!datos) return null;
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos) }} />
  );
}
