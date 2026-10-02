import { createHash } from "node:crypto";

export function sha256De(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function distanciaHamming(a: string, b: string): number {
  if (!/^[0-9a-f]{16}$/.test(a) || !/^[0-9a-f]{16}$/.test(b)) return 64;
  let valor = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (valor > 0n) {
    n += Number(valor & 1n);
    valor >>= 1n;
  }
  return n;
}
