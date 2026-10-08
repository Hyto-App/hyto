export type PreguntaChoice = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

export type PreguntaNoul = {
  type: "noul";
  instructions: string;
};

export type PreguntaScore = {
  type: "score";
  instructions: string;
  criteria: readonly [string, string, string];
};

export type Pregunta = PreguntaChoice | PreguntaNoul | PreguntaScore;

export type PreguntasClasificacion = { c1: PreguntaChoice };

export type PreguntasTrabajo = {
  lugar: PreguntaChoice;
  v1: PreguntaChoice;
  v2: PreguntaScore;
  v3: PreguntaNoul;
  v4: PreguntaNoul;
  t5: PreguntaChoice;
  t6: PreguntaChoice;
  t7: PreguntaNoul;
  t8: PreguntaNoul;
  t9: PreguntaNoul;
  t10: PreguntaScore;
};

export type PreguntasFactura = {
  f1: PreguntaChoice;
  f2: PreguntaNoul;
  f3: PreguntaNoul;
  f4: PreguntaScore;
  g1: PreguntaChoice;
  g2: PreguntaNoul;
  g3: PreguntaNoul;
  g4: PreguntaNoul;
  g5: PreguntaScore;
};

function criteriosAccion(evento: boolean): Record<string, string> {
  const criterios: Record<string, string> = {
    pintar: evento
      ? "Something was painted or drawn, such as a wall or a mural. A printed sign, a slide, a logo, or a mug is not painting."
      : "Something was painted or drawn.",
    limpiar: "An area was cleaned or cleared of trash.",
    armar_o_montar: "Something was built, set up, or assembled, such as a stand or a booth.",
    vender_o_atender: "People were selling, serving, or attending visitors.",
    transportar: "Items or people were moved from one place to another.",
  };
  if (evento) {
    criterios.documentar_evento =
      "Documenting an event or an activity: a sign, a talk, a stand, a group photo, people at the event, or merch such as a mug. Not painting, cleaning, or building.";
  }
  criterios.otra_o_no_claro = "Something else, or the description does not say.";
  return criterios;
}

function criteriosEstado(evento: boolean): Record<string, string> {
  const criterios: Record<string, string> = {
    terminado: "The description says the work is finished or complete.",
    a_medias: "The description says part of the work is done and part is missing or still in progress.",
    sin_empezar: "The description shows no work done, such as an empty wall or an empty room.",
  };
  if (evento) {
    criterios.no_aplica =
      "Does not apply: it is a scene or an event, such as a group photo, a talk, a sign, or a stand. The requested scene can be present. This is not work that has not started.";
  }
  criterios.no_claro = "The description does not say.";
  return criterios;
}

function choice(instructions: string, criteria: Record<string, string>): PreguntaChoice {
  return { type: "choice", instructions, criteria };
}

function siNo(instructions: string): PreguntaNoul {
  return { type: "noul", instructions };
}

function niveles(instructions: string, criteria: readonly [string, string, string]): PreguntaScore {
  return { type: "score", instructions, criteria };
}

function conPedido(texto: string, pedido: string): string {
  return texto.replaceAll("{pedido}", pedido.trim());
}

export function preguntasClasificacion(condicion: string): PreguntasClasificacion {
  const pedido = condicion.trim();
  return {
    c1: choice(
      conPedido(
        "What kind of evidence does the written description give? The organizer asked for: {pedido}. Pick one label. Use only what the description states. A receipt, invoice, or purchase is factura, never trabajo.",
        pedido,
      ),
      {
        trabajo:
          "The description shows a place or a physical result of work, such as a wall, a stand, a cleaned area, people working, or other evidence that matches what the organizer asked for.",
        factura:
          "The description shows a receipt or an invoice, a paper or screen with a store name, items, and a price. If it is a purchase, pick factura even when the request sounds like an errand.",
        otra: conPedido(
          "The description shows neither work, a receipt, nor what the organizer asked for ({pedido}). For example, a selfie, a blurry image, or an unrelated scene.",
          pedido,
        ),
      },
    ),
  };
}

/**
 * `evento` is true only when HYTO_MILE_PREGUNTAS_EVENTO is on.
 * False keeps the current work questions, including t5 and t6.
 */
export function preguntasTrabajo(condicion: string, evento = false): PreguntasTrabajo {
  const pedido = condicion.trim();
  return {
    lugar: choice("Which place does the written description show? Pick one label. Use only what the description states.", {
      pared_o_superficie: "A wall, floor, fence, or other surface that was painted, cleaned, or fixed.",
      stand_o_mesa: "A stand, table, or booth set up with items.",
      espacio_abierto: "An outdoor area, street, park, or yard.",
      no_claro: "The place is not stated or is too vague.",
    }),
    v1: choice(conPedido("The organizer asked for: {pedido}. Does the written description match this request?", pedido), {
      es_lo_pedido: "The description matches what the organizer asked for.",
      es_otra_cosa: "The description shows something else, not what the organizer asked for.",
      no_se_puede_saber: "The description does not say enough to decide.",
    }),
    v2: niveles(conPedido("The organizer asked for: {pedido}. How many parts of this request does the written description clearly state?", pedido), [
      "None. The description clearly states no part of the request.",
      "Some. The description clearly states only some parts of the request.",
      "All. The description clearly states every part of the request.",
    ]),
    v3: siNo(conPedido("The organizer asked for: {pedido}. Does the written description name a place, an object, or an action that proves it?", pedido)),
    v4: siNo(conPedido("The organizer asked for: {pedido}. Does the written description say that something the organizer asked for is missing or not shown?", pedido)),
    t5: choice(
      evento
        ? "What was done, according to the written description? Pick one label. Use only what the description states. A sign, a talk, a stand, a group photo, or event merch such as a mug is documenting an event, not painting."
        : "What was done, according to the written description? Pick one label. Use only what the description states.",
      criteriosAccion(evento),
    ),
    t6: choice(
      evento
        ? "In what condition is the finished work, according to the written description? Pick one label. Use only what the description states. If the description shows a scene or an event rather than physical work that starts and finishes, pick no_aplica. Do not pick sin_empezar when the requested scene is present."
        : "In what condition is the finished work, according to the written description? Pick one label. Use only what the description states.",
      criteriosEstado(evento),
    ),
    t7: siNo("Does the written description name the tools or materials used, such as brushes, paint, trash bags, tables, or a vehicle?"),
    t8: siNo("Does the written description say that the work was done in the place the organizer asked for?"),
    t9: siNo("Does the written description say that any part of the work is unfinished, damaged, or not visible?"),
    t10: niveles("Overall, how well does the written description show that the organizer's request was done?", [
      "The description does not show the request was done.",
      "The description shows part of the request, and something is missing.",
      "The description shows the whole request was done.",
    ]),
  };
}

export function preguntasFactura(condicion: string): PreguntasFactura {
  const pedido = condicion.trim();
  return {
    f1: choice(conPedido("The organizer asked for a receipt for: {pedido}. What was the money spent on, according to the written description?", pedido), {
      coincide_con_lo_pedido: "The money was spent on what the organizer asked for.",
      otro_gasto: "The money was spent on something else.",
      no_se_ve: "The description does not show what the money was spent on.",
    }),
    f2: siNo("Does the written description state the total amount paid, as a number?"),
    f3: siNo("Does the written description state the date of the purchase?"),
    f4: niveles(conPedido("The organizer asked for a receipt that shows: {pedido}. How many of the required details does the written description state?", pedido), [
      "None. The description states none of the required details.",
      "Some. The description states only some of the required details.",
      "All. The description states every required detail.",
    ]),
    g1: choice(conPedido("The organizer asked for: {pedido}. According to the written description, what category is the expense?", pedido), {
      transporte: "Fuel, bus fare, taxi, parking, or tolls.",
      comida_o_bebida: "Food, drinks, or snacks.",
      materiales: "Paint, tools, supplies, or building materials.",
      impresion_o_papeleria: "Printing, paper, posters, or stationery.",
      otro_o_no_claro: "Anything else, or the description does not say.",
    }),
    g2: siNo(
      conPedido(
        "The organizer asked for: {pedido}. Is the expense category a reasonable cost for this task? For example, fuel for a transport task, or paint for a painting task.",
        pedido,
      ),
    ),
    g3: siNo(
      "Does the written description name at least one item that was bought, such as fuel, paint, or food? Answer yes when any item is named, including in an Items list. Do not answer no if an item is named.",
    ),
    g4: siNo("Does the written description name the store or business where the purchase was made?"),
    g5: niveles(conPedido("Overall, how well does the written description show that this expense fits the organizer's request: {pedido}?", pedido), [
      "The expense does not fit the request, or the description does not say what was bought.",
      "The expense could fit the request, but an item, an amount, or a date is missing.",
      "The expense clearly fits the request, and it states the item, the amount, and the date.",
    ]),
  };
}

/** One yes/no question. Yes only when the written description shows the organizer's rule is met. */
export function preguntaRegla(regla: string): PreguntaNoul {
  return siNo(
    `The organizer wrote this rule and the evidence must follow it: ${regla.trim()}. Does the written description show that the evidence follows the rule? Answer yes only when the description shows every part of the rule is met. Answer no when the description shows the evidence breaks the rule, including a different store, place, or kind of purchase than the rule allows.`,
  );
}

export function cuerpoLaya(texto: string, condicion: string, preguntas: Record<string, Pregunta>): unknown {
  return {
    model: "multilingual",
    state: `${texto}\nCondition: ${condicion.trim()}`,
    questions: preguntas,
  };
}
