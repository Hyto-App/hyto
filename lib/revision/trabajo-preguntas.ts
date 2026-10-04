import { cuerpoLaya, type PreguntaChoice } from "./laya-preguntas";

export type RespuestaTrabajo = "yes" | "no" | "unclear";

export type PreguntasTrabajoClaro = {
  trabajoVisible: PreguntaChoice;
  fotoDeTrabajo: PreguntaChoice;
  esElPedido: PreguntaChoice;
  lugar: PreguntaChoice;
  lugarPedido: PreguntaChoice;
  cantidad: PreguntaChoice;
  cantidadPedido: PreguntaChoice;
  progreso: PreguntaChoice;
  fechaHora: PreguntaChoice;
  fechaPedido: PreguntaChoice;
};

function choice(instructions: string, criteria: Record<RespuestaTrabajo, string>): PreguntaChoice {
  return { type: "choice", instructions, criteria };
}

function conPedido(texto: string, pedido: string): string {
  return texto.replaceAll("{pedido}", pedido.trim());
}

/**
 * Yes / no / unclear questions for a work photo. They are not the live v1–t10 set.
 * "no" is only for a fact the description states. A missing detail is "unclear".
 */
export function preguntasTrabajoClaro(pedido: string): PreguntasTrabajoClaro {
  const condicion = pedido.trim();
  return {
    trabajoVisible: choice(
      "Does the written description name the work that is visible, such as painting, cleaning, or setting up a stand? Answer yes, no, or unclear. Use only what the description states. Answer no only when it states that no work is shown. If it does not say what work is visible, answer unclear.",
      {
        yes: "The description names the visible work.",
        no: "The description states that no work is shown.",
        unclear: "The description does not say what work is visible.",
      },
    ),
    fotoDeTrabajo: choice(
      "Does the written description show a photo of that work, rather than a receipt, a selfie, or an unrelated scene? Answer yes, no, or unclear. Answer no only when it states that the photo is not the work. If it does not say what the photo shows, answer unclear.",
      {
        yes: "The description shows the work itself.",
        no: "The description states that the photo is a receipt, a selfie, or another scene, not the work.",
        unclear: "The description does not say whether the photo is of the work.",
      },
    ),
    esElPedido: choice(
      conPedido(
        "The organizer asked for: {pedido}. Is the visible work the work that request asks for? Answer yes, no, or unclear. Answer no only when the description names a different task. A missing detail is not a different task. If the description does not say enough to compare, answer unclear.",
        condicion,
      ),
      {
        yes: "The visible work is the work the request asks for.",
        no: "The description names a task and it is a different task from the request.",
        unclear: "The description does not say enough to compare the work with the request.",
      },
    ),
    lugar: choice(
      "Does the written description name the place where the work is shown? Answer yes, no, or unclear. Answer no only when it states that no place is shown. If it does not name a place, answer unclear. Do not guess a place from a short sentence.",
      {
        yes: "The description names the place.",
        no: "The description states that no place is shown.",
        unclear: "The description does not name a place.",
      },
    ),
    lugarPedido: choice(
      conPedido(
        "The organizer asked for: {pedido}. Is the place in the description the place named in that request? Answer yes, no, or unclear. Answer no only when both sides name a place and the places differ. If the description or the request does not name a place, answer unclear.",
        condicion,
      ),
      {
        yes: "Both sides name a place and it is the same place.",
        no: "Both sides name a place and they are different places.",
        unclear: "The description or the request does not name a place to compare.",
      },
    ),
    cantidad: choice(
      "Does the written description state a quantity of the work, such as how many items were done? Answer yes, no, or unclear. Answer no only when it states that no quantity is shown. If it does not give a count, answer unclear. Do not invent a number.",
      {
        yes: "The description states a count of the work done.",
        no: "The description states that no quantity is shown.",
        unclear: "The description does not give a count.",
      },
    ),
    cantidadPedido: choice(
      conPedido(
        "The organizer asked for: {pedido}. Does the count of work done match the count in that request? Answer yes, no, or unclear. Use the count of work done, not a second number that only repeats the request. Answer no only when both sides state a count and the numbers differ. If either side has no count, answer unclear.",
        condicion,
      ),
      {
        yes: "Both sides state a count and the numbers match.",
        no: "Both sides state a count and the numbers differ.",
        unclear: "The description or the request does not give a count to compare.",
      },
    ),
    progreso: choice(
      "Does the written description say whether the work is finished, partly done, or not started? Answer yes, no, or unclear. Answer no only when it states that progress is not shown. If it does not say, answer unclear. Partly done is not a different task.",
      {
        yes: "The description says whether the work is finished, partly done, or not started.",
        no: "The description states that progress is not shown.",
        unclear: "The description does not say how far the work has gone.",
      },
    ),
    fechaHora: choice(
      "Does the written description state a date or a time for the work? Answer yes, no, or unclear. A date may use DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD, or YYYY-MM-DD, with / - . or spaces, or a month name in Spanish or English. 02/10/2026 can be 2 October 2026 or 10 February 2026. If both readings fit and the request does not pick one, answer unclear. Do not swap the day and the month in silence. Answer no only when the description states that no date and no time are shown.",
      {
        yes: "The description states a date or a time.",
        no: "The description states that no date and no time are shown.",
        unclear: "The description does not state a date or a time, or the numeric date has two readings and the request does not pick one.",
      },
    ),
    fechaPedido: choice(
      conPedido(
        "The organizer asked for: {pedido}. Does the date in the description match the date in that request? Answer yes, no, or unclear. If the request has no date, or the description has no date, answer unclear. Answer yes only when the stated date matches, and, for an ambiguous numeric date, every possible reading matches. Answer no only when a date is stated and every possible reading falls on a different day or month, or a different year when the request includes a year. Costa Rica writes the day first: when the request or that locale picks one reading, 02/10/2026 is 2 October 2026.",
        condicion,
      ),
      {
        yes: "A date is stated and it matches the request, including every reading when the number is ambiguous.",
        no: "A date is stated and every reading differs from the request.",
        unclear: "The description or the request does not give a date that can be compared, or more than one reading is still open.",
      },
    ),
  };
}

export function cuerpoTrabajo(texto: string, pedido: string): unknown {
  return cuerpoLaya(texto, pedido, preguntasTrabajoClaro(pedido));
}
