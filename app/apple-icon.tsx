import { ImageResponse } from "next/og";
import { comoDataUri, svgIsotipo } from "@/components/ui/marca/imagen";
import { CASI_NEGRO, LIMA } from "@/components/ui/marca/trazos";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so the tile is a full square.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: CASI_NEGRO }}>
        <img src={comoDataUri(svgIsotipo(LIMA))} width={116} height={99} alt="" />
      </div>
    ),
    size,
  );
}
