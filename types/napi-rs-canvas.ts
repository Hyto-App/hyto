// unpdf's types mention the optional canvas renderer. Text extraction does not load it.
declare module "@napi-rs/canvas" {
  export class Canvas {}
  export class CanvasRenderingContext2D {}
  export type SKRSContext2D = unknown;
}
