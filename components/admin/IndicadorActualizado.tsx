export function IndicadorActualizado({ activo, visible }: { activo: boolean; visible: boolean }) {
  if (!activo) return null;
  return (
    <p className="mt-2 h-4 text-xs text-[var(--suave)]" aria-live="polite">
      {visible ? "Updated just now" : ""}
    </p>
  );
}
