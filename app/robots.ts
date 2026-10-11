import type { MetadataRoute } from "next";
import { HOST_PUBLICO, PREFIJOS_PRIVADOS } from "@/lib/ui/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // "/p" alone would also match "/privacy", so public profiles are blocked as "/p/".
      disallow: PREFIJOS_PRIVADOS.map((ruta) => (ruta === "/p" ? "/p/" : ruta)),
    },
    sitemap: `${HOST_PUBLICO}/sitemap.xml`,
    host: HOST_PUBLICO,
  };
}
