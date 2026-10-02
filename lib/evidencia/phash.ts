import sharp from "sharp";

export const UMBRAL_COPIA = 8;

export async function phashDe(bytes: Uint8Array): Promise<string> {
  const { data, info } = await sharp(Buffer.from(bytes))
    .rotate()
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== 9 || info.height !== 8 || data.length < 72) {
    throw new Error("phash");
  }
  let bits = 0n;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const izquierda = data[y * info.width + x] ?? 0;
      const derecha = data[y * info.width + x + 1] ?? 0;
      bits = (bits << 1n) | (izquierda < derecha ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, "0");
}
