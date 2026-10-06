export type HumorRig = "neutral" | "happy" | "excited" | "sad" | "angry" | "thinking" | "worried" | "surprised" | "sleepy";
export type CofreRig = "open" | "closed" | "absent";
export type DisposicionRig = "free" | "peek" | "out" | "hidden" | "tuft";
export type ToqueRig = "hey" | "giggle" | "hop" | "wink" | "spin" | "wiggle" | "sparkle" | "annoyed" | "hide" | "pop";

export interface OpcionesRig {
  chest?: "peek" | CofreRig | DisposicionRig;
  mood?: HumorRig;
  aura?: boolean;
  idleSeconds?: number;
  /** null = automatic (prefers-reduced-motion) */
  reduced?: boolean | null;
  interactive?: boolean;
  onTap?: (reaccion: ToqueRig) => void;
  title?: string;
  heyText?: string;
}

export interface InstanciaRig {
  mood(nombre: HumorRig): void;
  search(): void;
  reveal(resultado: "happy" | "excited" | "sad" | HumorRig): void;
  chest(estado: CofreRig): void;
  layout(disposicion: DisposicionRig): void;
  explode(): void;
  poke(): void;
  cheer(): void;
  look(x: number, y: number): void;
  tap(): void;
  destroy(): void;
  svg: SVGSVGElement;
}

declare const MileRig: {
  create(host: Element, opciones?: OpcionesRig): InstanciaRig;
  MOODS: readonly string[];
  LAYOUTS: readonly string[];
  COL: Record<string, string>;
};
export default MileRig;
