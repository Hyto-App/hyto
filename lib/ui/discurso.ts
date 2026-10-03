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
  sloganLead: "Prove your worth.",
  sloganPay: "Get paid.",
  subheadline: "A marketplace of small tasks. You get paid in dollars in crypto (USDC).",
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
  step1Title: "Pick a task",
  step1Body: "Choose a short job on an event, like setting up a table or a team meal.",
  step2Title: "Send a photo",
  step2Body: "Take a picture that shows the work is done. That photo is your proof.",
  step3Title: "Get paid",
  step3Body: "When the organizer approves it, you receive dollars in crypto (USDC).",
  audienceTitle: "Who it is for",
  workersTitle: "Volunteers and workers",
  workersBody: "Join an event, see the tasks assigned to you, and get paid for the ones you finish.",
  organizersTitle: "Organizers",
  organizersBody: "List the tasks, set the money aside, and approve each payment before it goes out.",
  trustTitle: "Why you can trust a payment",
  trustApproveTitle: "The organizer approves every payment",
  trustApproveBody: "A person reviews the photo and decides. Hyto does not pay on its own.",
  trustAiTitle: "The AI only suggests",
  trustAiBody: "An assistant reads the photo and suggests a score. It cannot sign or move the money.",
  trustEscrowTitle: "The money is set aside before the work",
  trustEscrowBody: "The organizer sets the task amount aside first, so the payment is waiting when the work is approved.",
  legal: "Sign-in by Cavos. An account is created to hold your payment. You do not need a separate crypto app.",
  mileKicker: "Meet Mile",
  closeKicker: "Start",
  closeTitle: "Ready to prove your worth?",
  faqKicker: "Questions",
  faqTitle: "Before you start",
  faqCryptoQuestion: "Do I need to know crypto?",
  faqCryptoAnswer: "No. You can pick a task and send a photo without learning crypto first.",
};

export const discursoEs: Record<ClaveDiscurso, string> = {
  sloganLead: "Demuestra lo que vales.",
  sloganPay: "Cobra.",
  subheadline: "Un mercado de tareas cortas. Te pagan en dólares en cripto (USDC).",
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
  step1Title: "Elige una tarea",
  step1Body: "Escoge un trabajo corto en un evento, como armar una mesa o una comida del equipo.",
  step2Title: "Envía una foto",
  step2Body: "Toma una foto que muestre que el trabajo está listo. Esa foto es tu prueba.",
  step3Title: "Cobra",
  step3Body: "Cuando quien organiza lo aprueba, recibes dólares en cripto (USDC).",
  audienceTitle: "Para quién es",
  workersTitle: "Voluntarios y trabajadores",
  workersBody: "Únete a un evento, mira las tareas que te asignaron y cobra las que termines.",
  organizersTitle: "Organizadores",
  organizersBody: "Publica las tareas, aparta el dinero y aprueba cada pago antes de que salga.",
  trustTitle: "Por qué puedes confiar en un pago",
  trustApproveTitle: "Quien organiza aprueba cada pago",
  trustApproveBody: "Una persona revisa la foto y decide. Hyto no paga solo.",
  trustAiTitle: "La IA solo sugiere",
  trustAiBody: "Un asistente lee la foto y sugiere una nota. No puede firmar ni mover el dinero.",
  trustEscrowTitle: "El dinero se aparta antes del trabajo",
  trustEscrowBody:
    "Quien organiza aparta el monto de la tarea primero, así el pago está esperando cuando se aprueba el trabajo.",
  legal: "El ingreso es con Cavos. Se crea una cuenta para guardar tu pago. No necesitas otra app de cripto.",
  mileKicker: "Conoce a Mile",
  closeKicker: "Empieza",
  closeTitle: "¿Listo para demostrar lo que vales?",
  faqKicker: "Preguntas",
  faqTitle: "Antes de empezar",
  faqCryptoQuestion: "¿Necesito saber de cripto?",
  faqCryptoAnswer: "No. Puedes elegir una tarea y enviar una foto sin aprender cripto primero.",
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
