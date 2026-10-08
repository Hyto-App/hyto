/**
 * A Vercel preview host is a different origin on every branch. Cavos only
 * accepts redirect URIs registered for the app, so Google and Apple cannot
 * return to that host. Production (`hyto.vercel.app`) and local dev are not previews.
 */
export function esHostPreview(host: string): boolean {
  const nombre = host.trim().toLowerCase().split(":")[0] ?? "";
  if (!nombre.endsWith(".vercel.app")) return false;
  return nombre !== "hyto.vercel.app";
}
