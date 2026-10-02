import { deflateSync } from "node:zlib";

export type EscenaMarcador = "trabajo" | "reembolso";

type Color = readonly [number, number, number];

const ANCHO = 480;
const ALTO = 360;

const FUENTE: Record<string, readonly string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

class Lienzo {
  readonly pixeles = Buffer.alloc(ANCHO * ALTO * 3);

  rect(x: number, y: number, ancho: number, alto: number, color: Color): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(ANCHO, Math.floor(x + ancho));
    const y1 = Math.min(ALTO, Math.floor(y + alto));
    for (let fila = y0; fila < y1; fila += 1) {
      for (let columna = x0; columna < x1; columna += 1) {
        const i = (fila * ANCHO + columna) * 3;
        this.pixeles[i] = color[0];
        this.pixeles[i + 1] = color[1];
        this.pixeles[i + 2] = color[2];
      }
    }
  }

  degradado(y: number, alto: number, arriba: Color, abajo: Color): void {
    for (let paso = 0; paso < alto; paso += 1) {
      const t = alto <= 1 ? 0 : paso / (alto - 1);
      const color: Color = [
        Math.round(arriba[0] + (abajo[0] - arriba[0]) * t),
        Math.round(arriba[1] + (abajo[1] - arriba[1]) * t),
        Math.round(arriba[2] + (abajo[2] - arriba[2]) * t),
      ];
      this.rect(0, y + paso, ANCHO, 1, color);
    }
  }

  texto(x: number, y: number, texto: string, escala: number, color: Color): void {
    let cursor = x;
    for (const letra of texto) {
      const glifo = FUENTE[letra] ?? FUENTE[" "]!;
      glifo.forEach((fila, dy) => {
        for (let dx = 0; dx < fila.length; dx += 1) {
          if (fila[dx] === "1") this.rect(cursor + dx * escala, y + dy * escala, escala, escala, color);
        }
      });
      cursor += 6 * escala;
    }
  }
}

function anchoTexto(texto: string, escala: number): number {
  return texto.length * 6 * escala - escala;
}

function stand(lienzo: Lienzo): void {
  lienzo.degradado(0, 250, [222, 216, 202], [200, 193, 178]);
  lienzo.degradado(250, 110, [138, 104, 72], [104, 76, 52]);
  for (let x = 0; x < ANCHO; x += 60) lienzo.rect(x, 250, 2, 110, [92, 66, 44]);

  lienzo.rect(116, 46, 248, 98, [8, 9, 12]);
  lienzo.rect(116, 128, 248, 16, [183, 238, 52]);
  const marca = "ZEEK";
  lienzo.texto(240 - anchoTexto(marca, 8) / 2, 60, marca, 8, [183, 238, 52]);

  lienzo.rect(64, 214, 352, 12, [246, 244, 238]);
  lienzo.rect(70, 226, 340, 74, [232, 227, 216]);
  lienzo.rect(70, 296, 340, 4, [204, 198, 186]);

  for (const x of [110, 205, 300]) {
    lienzo.rect(x, 168, 70, 46, [185, 139, 90]);
    lienzo.rect(x, 168, 70, 6, [160, 116, 72]);
    lienzo.rect(x + 31, 168, 8, 46, [214, 190, 150]);
  }
}

function recibo(lienzo: Lienzo): void {
  lienzo.degradado(0, ALTO, [112, 86, 64], [86, 64, 46]);
  lienzo.rect(158, 34, 172, 300, [60, 44, 32]);
  lienzo.rect(152, 26, 172, 300, [251, 250, 246]);
  lienzo.texto(238 - anchoTexto("RECEIPT", 3) / 2, 46, "RECEIPT", 3, [40, 40, 44]);
  for (let fila = 0; fila < 7; fila += 1) {
    const y = 90 + fila * 22;
    lienzo.rect(170, y, 56 + ((fila * 23) % 36), 6, [178, 178, 182]);
    lienzo.rect(270, y, 36, 6, [150, 150, 156]);
  }
  lienzo.rect(170, 254, 136, 2, [120, 120, 126]);
  lienzo.texto(170, 266, "TOTAL", 2, [20, 20, 24]);
  lienzo.texto(306 - anchoTexto("12.40", 2), 266, "12.40", 2, [20, 20, 24]);
}

const cache = new Map<EscenaMarcador, Uint8Array>();

/** A visible stand-in photo for seeded sample evidence. It is drawn here so no binary lives in the repo. */
export function marcadorPng(escena: EscenaMarcador): Uint8Array {
  const guardado = cache.get(escena);
  if (guardado) return guardado;
  const lienzo = new Lienzo();
  if (escena === "reembolso") recibo(lienzo);
  else stand(lienzo);
  const leyenda = "SAMPLE PHOTO";
  lienzo.rect(12, ALTO - 40, anchoTexto(leyenda, 2) + 20, 28, [8, 9, 12]);
  lienzo.texto(22, ALTO - 33, leyenda, 2, [183, 238, 52]);
  const png = codificarPng(lienzo.pixeles);
  cache.set(escena, png);
  return png;
}

function codificarPng(pixeles: Buffer): Uint8Array {
  const filas = Buffer.alloc((ANCHO * 3 + 1) * ALTO);
  for (let fila = 0; fila < ALTO; fila += 1) {
    const destino = fila * (ANCHO * 3 + 1);
    filas[destino] = 0;
    pixeles.copy(filas, destino + 1, fila * ANCHO * 3, (fila + 1) * ANCHO * 3);
  }
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(ANCHO, 0);
  cabecera.writeUInt32BE(ALTO, 4);
  cabecera[8] = 8;
  cabecera[9] = 2;
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      bloque("IHDR", cabecera),
      bloque("IDAT", deflateSync(filas)),
      bloque("IEND", Buffer.alloc(0)),
    ]),
  );
}

function bloque(tipo: string, datos: Buffer): Buffer {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([largo, cuerpo, crc]);
}

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

function crc32(datos: Buffer): number {
  let c = 0xffffffff;
  for (const byte of datos) c = TABLA_CRC[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
