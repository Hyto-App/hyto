/**
 * Public landing speech. `discurso` stays English so existing checks keep one source.
 * `discursoEs` is the Costa Rica Spanish twin. `discursoDe` picks one; English is the default.
 * Keys stay stable. Components read these strings; they do not invent sentences.
 * `ctaSignIn` matches the Sign in button rendered by Entrar.
 */

export const CLAVES_DISCURSO = [
  "sloganLead",
  "sloganPay",
  "subheadline",
  "networkLead",
  "networkBody",
  "ctaSignIn",
  "ctaDemo",
  "ctaDemoHelp",
  "ctaDemoVolunteer",
  "ctaDemoOrganizer",
  "ctaDemoBusy",
  "ctaDemoError",
  "stepsTitle",
  "step1Title",
  "step1Body",
  "step2Title",
  "step2Body",
  "step3Title",
  "step3Body",
  "audienceTitle",
  "workersTitle",
  "workersBody",
  "organizersTitle",
  "organizersBody",
  "trustTitle",
  "trustApproveTitle",
  "trustApproveBody",
  "trustAiTitle",
  "trustAiBody",
  "trustEscrowTitle",
  "trustEscrowBody",
  "legal",
  "mileKicker",
  "closeKicker",
  "closeTitle",
  "faqKicker",
  "faqTitle",
  "faqCryptoQuestion",
  "faqCryptoAnswer",
] as const;

export type ClaveDiscurso = (typeof CLAVES_DISCURSO)[number];

export const discurso: Record<ClaveDiscurso, string> = {
  sloganLead: "Prove your worth,",
  sloganPay: "get paid.",
  subheadline: "Pay for work you can't check in person. The money is locked first, and it is paid when the proof checks out.",
  networkLead: "Practice network.",
  networkBody:
    "Dollars in crypto (USDC) are digital dollars. This app runs on a practice network for now, so the money is for trying Hyto. It is not real cash.",
  ctaSignIn: "Sign in",
  ctaDemo: "Try the demo",
  ctaDemoHelp: "No account needed. Open a practice session as a volunteer or as an organizer.",
  ctaDemoVolunteer: "As a volunteer",
  ctaDemoOrganizer: "As an organizer",
  ctaDemoBusy: "Opening…",
  ctaDemoError: "Could not open the demo. Try again.",
  stepsTitle: "How it works",
  step1Title: "Lock the money",
  step1Body: "Whoever pays locks the budget for each task before the work starts. The person doing it knows the money is there.",
  step2Title: "Send the proof",
  step2Body: "The person doing the work uploads photos, a PDF, or receipts that show it is done.",
  step3Title: "Get paid",
  step3Body: "Mile, the AI, reviews the proof. When it checks out and the organizer approves, the payment is released in dollars in crypto (USDC).",
  audienceTitle: "Who it is for",
  workersTitle: "Volunteers, communities, and workers",
  workersBody: "See the tasks assigned to you, send the proof, and get paid. You know the money is waiting before you start.",
  organizersTitle: "Organizers",
  organizersBody: "Fund work you can't watch in person: events, travel expenses, or a job at home. Lock the money, review the proof, and approve each payment.",
  trustTitle: "Why you can trust a payment",
  trustApproveTitle: "The organizer approves every payment",
  trustApproveBody: "A person reviews the proof and decides. Hyto does not pay on its own.",
  trustAiTitle: "The AI only suggests",
  trustAiBody: "Mile reads the proof and suggests a score. It cannot sign or move the money.",
  trustEscrowTitle: "The money is locked before the work",
  trustEscrowBody: "The organizer locks the task amount first, so nobody pays blindly up front and nobody works without knowing they will be paid.",
  legal: "Sign-in by Cavos. An account is created to hold your payment. You do not need a separate crypto app.",
  mileKicker: "Meet Mile",
  closeKicker: "Start",
  closeTitle: "Ready to prove your worth?",
  faqKicker: "Questions",
  faqTitle: "Before you start",
  faqCryptoQuestion: "Do I need to know crypto?",
  faqCryptoAnswer: "No. You can send your proof and get paid without learning crypto first.",
};

export const discursoEs: Record<ClaveDiscurso, string> = {
  sloganLead: "Demuestra tu valor,",
  sloganPay: "recibe tu pago.",
  subheadline: "Paga trabajos que no puedes verificar en persona. El dinero queda bloqueado primero y se paga cuando la prueba cumple.",
  networkLead: "Red de práctica.",
  networkBody:
    "Los dólares en cripto (USDC) son dólares digitales. Por ahora esta app corre en una red de práctica, así que el dinero es para probar Hyto. No es dinero real.",
  ctaSignIn: "Entrar",
  ctaDemo: "Probar el demo",
  ctaDemoHelp: "No necesitas una cuenta. Abre una sesión de práctica como voluntario o como organizador.",
  ctaDemoVolunteer: "Como voluntario",
  ctaDemoOrganizer: "Como organizador",
  ctaDemoBusy: "Abriendo…",
  ctaDemoError: "No se pudo abrir el demo. Inténtalo de nuevo.",
  stepsTitle: "Cómo funciona",
  step1Title: "Bloquea el dinero",
  step1Body: "Quien paga bloquea el presupuesto de cada tarea antes de que empiece el trabajo. Quien lo hace sabe que el dinero está ahí.",
  step2Title: "Envía la prueba",
  step2Body: "Quien hace el trabajo sube fotos, un PDF o facturas que muestran que está listo.",
  step3Title: "Cobra",
  step3Body: "Mile, la IA, revisa la prueba. Cuando cumple y quien organiza lo aprueba, el pago se libera en dólares en cripto (USDC).",
  audienceTitle: "Para quién es",
  workersTitle: "Voluntarios, comunidades y trabajadores",
  workersBody: "Mira las tareas que te asignaron, envía la prueba y cobra. Sabes que el dinero te espera antes de empezar.",
  organizersTitle: "Organizadores",
  organizersBody: "Financia trabajos que no puedes ver en persona: eventos, viáticos o un arreglo en casa. Bloquea el dinero, revisa la prueba y aprueba cada pago.",
  trustTitle: "Por qué puedes confiar en un pago",
  trustApproveTitle: "Quien organiza aprueba cada pago",
  trustApproveBody: "Una persona revisa la prueba y decide. Hyto no paga solo.",
  trustAiTitle: "La IA solo sugiere",
  trustAiBody: "Mile lee la prueba y sugiere una nota. No puede firmar ni mover el dinero.",
  trustEscrowTitle: "El dinero queda bloqueado antes del trabajo",
  trustEscrowBody:
    "Quien organiza bloquea el monto de la tarea primero: nadie paga por adelantado a ciegas y nadie trabaja sin saber si le van a pagar.",
  legal: "El ingreso es con Cavos. Se crea una cuenta para guardar tu pago. No necesitas otra app de cripto.",
  mileKicker: "Conoce a Mile",
  closeKicker: "Empieza",
  closeTitle: "¿Listo para demostrar lo que vales?",
  faqKicker: "Preguntas",
  faqTitle: "Antes de empezar",
  faqCryptoQuestion: "¿Necesito saber de cripto?",
  faqCryptoAnswer: "No. Puedes enviar tu prueba y cobrar sin aprender cripto primero.",
};

export function discursoDe(idioma: "en" | "es"): Record<ClaveDiscurso, string> {
  return idioma === "es" ? discursoEs : discurso;
}

export type BloqueDiscurso = { titulo: string; cuerpo: string };

export function pasosDiscurso(copia: Record<ClaveDiscurso, string> = discurso): readonly BloqueDiscurso[] {
  return [
    { titulo: copia.step1Title, cuerpo: copia.step1Body },
    { titulo: copia.step2Title, cuerpo: copia.step2Body },
    { titulo: copia.step3Title, cuerpo: copia.step3Body },
  ];
}

export function audienciasDiscurso(copia: Record<ClaveDiscurso, string> = discurso): readonly BloqueDiscurso[] {
  return [
    { titulo: copia.workersTitle, cuerpo: copia.workersBody },
    { titulo: copia.organizersTitle, cuerpo: copia.organizersBody },
  ];
}

export function preguntasDiscurso(copia: Record<ClaveDiscurso, string> = discurso): readonly BloqueDiscurso[] {
  return [{ titulo: copia.faqCryptoQuestion, cuerpo: copia.faqCryptoAnswer }];
}

export function confianzaDiscurso(copia: Record<ClaveDiscurso, string> = discurso): readonly BloqueDiscurso[] {
  return [
    { titulo: copia.trustApproveTitle, cuerpo: copia.trustApproveBody },
    { titulo: copia.trustAiTitle, cuerpo: copia.trustAiBody },
    { titulo: copia.trustEscrowTitle, cuerpo: copia.trustEscrowBody },
  ];
}
