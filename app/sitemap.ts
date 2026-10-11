import type { MetadataRoute } from "next";
import { HOST_PUBLICO, rutasSitemap } from "@/lib/ui/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();
  return rutasSitemap().map((ruta) => ({
    url: `${HOST_PUBLICO}${ruta === "/" ? "" : ruta}`,
    lastModified: ahora,
    changeFrequency: ruta === "/" ? "weekly" : "monthly",
    priority: ruta === "/" ? 1 : 0.6,
  }));
}
