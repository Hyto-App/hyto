import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { cookies, headers } from "next/headers";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { TituloDocumento } from "@/components/ui/TituloDocumento";
import { ESLOGAN } from "@/components/ui/marca/trazos";
import { COOKIE_IDIOMA, idiomaDe, idiomaDeNavegador } from "@/lib/ui/idioma";
import { discurso } from "@/lib/ui/discurso";
import "./globals.css";

export const dynamic = "force-dynamic";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-poppins",
});

const TEMA_BOOT = `(function(){try{var t=localStorage.getItem("hyto-tema");if(t!=="light"){t="dark";}document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dark"?"#0E1024":"#F5F6FA");}catch(e){}})();`;

const DESCRIPCION = discurso.subheadline;
const TITULO = `Hyto · ${ESLOGAN}`;

export const metadata: Metadata = {
  metadataBase: new URL("https://hyto.vercel.app"),
  title: { default: "Hyto", template: "%s · Hyto" },
  description: DESCRIPCION,
  applicationName: "Hyto",
  openGraph: {
    type: "website",
    siteName: "Hyto",
    title: TITULO,
    description: DESCRIPCION,
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: TITULO }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
    images: ["/twitter-image"],
  },
};

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
