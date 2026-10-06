import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["sharp"],
  // Short, typeable alias for Account, used by the passkey guide's link. Query and hash carry over.
  async redirects() {
    return [{ source: "/account", destination: "/cuentas", permanent: false }];
  },
};

export default nextConfig;
