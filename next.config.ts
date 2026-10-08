import type { NextConfig } from "next";

// Baseline headers for every response. No full CSP yet: the Cavos vault iframe and its scripts
// would need an allow-list first. frame-ancestors stops other sites from framing Hyto (clickjacking
// on Lock budget and Pay). The camera stays allowed for evidence on this origin only.
const encabezadosSeguros = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["sharp", "unpdf"],
  // Short, typeable alias for Account, used by the passkey guide's link. Query and hash carry over.
  async redirects() {
    return [{ source: "/account", destination: "/cuentas", permanent: false }];
  },
  async headers() {
    return [{ source: "/:path*", headers: encabezadosSeguros }];
  },
};

export default nextConfig;
