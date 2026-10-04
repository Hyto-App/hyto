import { cuerpoLaya, type PreguntaChoice } from "./laya-preguntas";

export type RespuestaRecibo = "yes" | "no" | "unclear";

export type PreguntasRecibo = {
  comercio: PreguntaChoice;
  producto: PreguntaChoice;
  total: PreguntaChoice;
  fecha: PreguntaChoice;
  fechaPedido: PreguntaChoice;
  tipoProducto: PreguntaChoice;
};

function choice(instructions: string, criteria: Record<RespuestaRecibo, string>): PreguntaChoice {
  return { type: "choice", instructions, criteria };
}

function conPedido(texto: string, pedido: string): string {
  return texto.replaceAll("{pedido}", pedido.trim());
}

/**
 * Yes / no / unclear questions for Mile (Laya). They are not the live f2/f3/g3 set.
 * A printed total like 15.179,99 and a date like 02/10/2026 are valid.
 */
export function preguntasRecibo(pedido: string): PreguntasRecibo {
  const condicion = pedido.trim();
  return {
    comercio: choice("Does the written description name the store or the brand? Answer yes, no, or unclear. Use only what the description states.", {
      yes: "The description names a store or a brand, such as Little Caesars.",
      no: "The description states that no store or brand is shown.",
      unclear: "The description does not say whether a store or brand is named.",
    }),
    producto: choice("Does the written description name at least one product that was bought? Answer yes, no, or unclear. Use only what the description states.", {
      yes: "It names at least one purchased product, such as pizza.",
      no: "It states that no purchased product is named.",
      unclear: "It does not say whether a product is named.",
    }),
    total: choice(
      "Does the written description state the total paid, together with its currency? Answer yes, no, or unclear. A printed total such as 15.179,99 is valid: the dot groups thousands and the comma is the decimal, so that example is 15179.99 colones (CRC). Do not convert colones to dollars. Do not treat that total as USDC.",
      {
        yes: "The description states a total and a currency. 15.179,99 colones counts as a total.",
        no: "The description states that no total is shown.",
        unclear: "The description does not say the total, or it does not say the currency.",
      },
    ),
    fecha: choice(
      "Does the written description state the purchase date? Answer yes, no, or unclear. A date printed as DD/MM/YYYY is valid. 02/10/2026 means 2 October 2026, not February 10.",
      {
        yes: "The description states a purchase date, including a DD/MM/YYYY date.",
        no: "The description states that no purchase date is shown.",
        unclear: "The description does not say the purchase date.",
      },
    ),
    fechaPedido: choice(
      conPedido(
        "The organizer asked for: {pedido}. Does the purchase date match the date in that request? Answer yes, no, or unclear. If the request names a day and a month but no year, compare only the day and the month. If the request names a year, the year must match too.",
        condicion,
      ),
      {
        yes: "The day and the month match. The year matches too when the request includes a year.",
        no: "A date is stated and it falls on a different day or month, or on a different year when the request includes a year.",
        unclear: "The description or the request does not give enough of a date to compare.",
      },
    ),
    tipoProducto: choice(
      conPedido(
        "The organizer asked for: {pedido}. Is the purchased product the kind of product that request asks for? Answer yes, no, or unclear.",
        condicion,
      ),
      {
        yes: "The product is the kind asked for, such as pizza when the request asks for pizza.",
        no: "The product is named and it is a different kind of expense.",
        unclear: "The description does not say what was bought, or it does not say enough to compare it with the request.",
      },
    ),
  };
}

export function cuerpoRecibo(texto: string, pedido: string): unknown {
  return cuerpoLaya(texto, pedido, preguntasRecibo(pedido));
}
