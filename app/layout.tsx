import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { cookies, headers } from "next/headers";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { TituloDocumento } from "@/components/ui/TituloDocumento";
import { COOKIE_IDIOMA, idiomaDe, idiomaDeNavegador } from "@/lib/ui/idioma";
import { descripcionSeo, HOST_PUBLICO, metaPublica, tituloMarca } from "@/lib/ui/seo";
import "./globals.css";

export const dynamic = "force-dynamic";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-poppins",
});

const TEMA_BOOT = `(function(){try{var t=localStorage.getItem("hyto-tema");if(t!=="light"){t="dark";}document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dark"?"#0E1024":"#F5F6FA");}catch(e){}})();`;

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const guardado = jar.get(COOKIE_IDIOMA)?.value;
  const idioma = guardado ? idiomaDe(guardado) : idiomaDeNavegador((await headers()).get("accept-language"));
  const descripcion = descripcionSeo(idioma);
  const marca = tituloMarca();
  const base = metaPublica({
    idioma,
    title: marca,
    description: descripcion,
    path: "/",
    absoluteTitle: true,
  });
  return {
    metadataBase: new URL(HOST_PUBLICO),
    title: { default: "Hyto", template: "%s · Hyto" },
    description: descripcion,
    applicationName: "Hyto",
    openGraph: base.openGraph,
    twitter: base.twitter,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: "#0E1024",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const guardado = jar.get(COOKIE_IDIOMA)?.value;
  const idioma = guardado ? idiomaDe(guardado) : idiomaDeNavegador((await headers()).get("accept-language"));
  return (
    <html lang={idioma} className={poppins.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_BOOT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ProveedorIdioma idioma={idioma}>
          {children}
          <TituloDocumento />
        </ProveedorIdioma>
      </body>
    </html>
  );
}
