export function esHostNeon(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "neon.tech" || host.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

function hostnameDe(url: string): string {
  const host = new URL(url).hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) return host.slice(1, -1);
  return host;
}

export function esHostLocal(url: string): boolean {
  try {
    const host = hostnameDe(url);
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}
