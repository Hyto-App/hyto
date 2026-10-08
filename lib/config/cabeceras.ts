/**
 * Browser security headers. Groq, Gemini, Laya, Trustless Work, and the
 * Hacienda rate are called by the server, so they are not in this policy.
 * The theme boot script and Next's inline bootstrap need 'unsafe-inline'.
 * Community and company photos are an https URL the organizer types, so
 * images allow https:.
 */
export type Cabecera = { key: string; value: string };

const CONECTAR = [
  "'self'",
  "https://cavos.xyz",
  "https://vault.cavos.xyz",
  "https://accounts.google.com",
  "https://appleid.apple.com",
  "https://horizon-testnet.stellar.org",
  "https://horizon.stellar.org",
  "https://soroban-testnet.stellar.org",
  "https://mainnet.sorobanrpc.com",
  "https://friendbot.stellar.org",
];

export function politicaCsp(desarrollo: boolean): string {
  const conectar = [...CONECTAR];
  if (desarrollo) conectar.push("ws:", "wss:", "http://localhost:*", "http://127.0.0.1:*");
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://accounts.google.com https://appleid.apple.com https://cavos.xyz",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    `connect-src ${conectar.join(" ")}`,
    "frame-src 'self' https://vault.cavos.xyz https://accounts.google.com https://appleid.apple.com",
    "worker-src 'self' blob:",
  ].join("; ");
}

export function cabecerasSeguridad(desarrollo = process.env.NODE_ENV !== "production"): Cabecera[] {
  return [
    { key: "Content-Security-Policy", value: politicaCsp(desarrollo) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  ];
}
