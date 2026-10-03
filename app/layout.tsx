import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-poppins",
});

const TEMA_BOOT = `(function(){try{var t=localStorage.getItem("hyto-tema");if(t!=="light"){t="dark";}document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dark"?"#08090C":"#F4F5F0");}catch(e){}})();`;

const DESCRIPCION = "Prove your worth. Get paid. Hyto locks an event budget and pays each task in USDC on Stellar once the photo evidence is reviewed.";

export const metadata: Metadata = {
  metadataBase: new URL("https://hyto.vercel.app"),
  title: { default: "Hyto", template: "%s · Hyto" },
  description: DESCRIPCION,
  applicationName: "Hyto",
  openGraph: {
    type: "website",
    siteName: "Hyto",
    title: "Hyto · Prove your worth. Get paid.",
    description: DESCRIPCION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hyto · Prove your worth. Get paid.",
    description: DESCRIPCION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: "#08090C",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={poppins.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_BOOT }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
