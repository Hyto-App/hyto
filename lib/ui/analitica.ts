/**
 * Vercel Web Analytics is cookieless. Before each page view is sent,
 * strip invite secrets from the path and drop the query string.
 */

export function filtrarUrlAnalitica(urlCruda: string): string | null {
  try {
    const url = new URL(urlCruda);
    if (url.pathname.startsWith("/join/") && url.pathname !== "/join/") {
      url.pathname = "/join/[invite]";
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
