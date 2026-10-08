import type { NextConfig } from "next";
import { cabecerasSeguridad } from "./lib/config/cabeceras";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["sharp", "unpdf"],
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad() }];
  },
  // Short, typeable alias for Account, used by the passkey guide's link. Query and hash carry over.
  async redirects() {
    return [{ source: "/account", destination: "/cuentas", permanent: false }];
  },
};

export default nextConfig;
