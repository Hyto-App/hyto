import { ImageResponse } from "next/og";
import { comoDataUri, svgLogo } from "@/components/ui/marca/imagen";
import { CASI_NEGRO, ESLOGAN, LIMA, NAVY } from "@/components/ui/marca/trazos";

export const alt = `Hyto · ${ESLOGAN}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Poppins 500 from Google Fonts. If the fetch fails, the image falls back to the default sans-serif.
async function poppins500(): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Poppins:wght@500&display=swap")).text();
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const respuesta = await fetch(url);
    return respuesta.ok ? await respuesta.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpenGraph() {
  const fuente = await poppins500();
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 88px",
          background: `radial-gradient(90% 120% at 100% 0%, ${NAVY} 0%, ${CASI_NEGRO} 62%)`,
          color: "#F2F3F7",
          fontFamily: fuente ? "Poppins" : "sans-serif",
        }}
      >
        <img src={comoDataUri(svgLogo(LIMA, "#FFFFFF"))} width={237} height={74} alt="" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 500, lineHeight: 1.08, letterSpacing: -2.5 }}>Prove your worth.</div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 500, lineHeight: 1.08, letterSpacing: -2.5, color: LIMA }}>Get paid.</div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "#A3A6B8" }}>
            Money locked before the work. Proof in photos or receipts. Paid when it checks out.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fuente ? [{ name: "Poppins", data: fuente, weight: 500, style: "normal" }] : undefined,
    },
  );
}
