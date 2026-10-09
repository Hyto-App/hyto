import type { MetadataRoute } from "next";
import { HOST_PUBLICO, PREFIJOS_PRIVADOS } from "@/lib/ui/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PREFIJOS_PRIVADOS.map((ruta) => ruta),
    },
    sitemap: `${HOST_PUBLICO}/sitemap.xml`,
    host: HOST_PUBLICO,
  };
}
