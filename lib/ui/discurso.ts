/**
 * Public landing speech for community accountability. `discurso` stays English so existing checks keep one source.
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
  "faqDollarsQuestion",
  "faqDollarsAnswer",
] as const;

export type ClaveDiscurso = (typeof CLAVES_DISCURSO)[number];

/** Meta, Open Graph, and Twitter description. The landing speech still names the asset; this line does not. */
export const DESCRIPCION_PAGINA =
  "Communities in Latin America funded from afar account for every spend. Lock digital dollars, send a photo of the work or the receipt, and a person releases the payment.";

/** Spanish twin of `DESCRIPCION_PAGINA`. Formal usted; no payment-network jargon. */
export const DESCRIPCION_PAGINA_ES =
  "Las comunidades en Latinoamérica que reciben fondos desde lejos rinden cuentas de cada gasto. Aparte dólares digitales, envíe una foto del trabajo o del recibo, y una persona libera el pago.";

export const discurso: Record<ClaveDiscurso, string> = {
  sloganLead: "Proof before",
  sloganPay: "payout.",
  subheadline:
    "Communities in Latin America funded from afar account for every spend. Lock digital dollars (USDC), send a photo of the work or the receipt, and a person releases the payment.",
  networkLead: "Practice network.",
  networkBody:
    "Digital dollars (USDC) here are for practice. Nothing on this network is real cash, and no live payment is recorded yet.",
  ctaSignIn: "Sign in",
  ctaDemo: "Try the demo",
  ctaDemoHelp: "No account needed. Open a practice session as a volunteer or as an organizer.",
  ctaDemoVolunteer: "As a volunteer",
  ctaDemoOrganizer: "As an organizer",
  ctaDemoBusy: "Opening…",
  ctaDemoError: "Could not open the demo. Try again.",
  stepsTitle: "How it works",
  step1Title: "Lock the funding",
  step1Body:
    "The funder sets each task amount aside in digital dollars (USDC) before the work starts. A stipend, a scholarship, or money to run an event, often sent by someone who is not there.",
  step2Title: "Send a photo",
  step2Body: "Photograph the work where it happened, or the receipt, including one in colones. That photo is the proof of the spend.",
  step3Title: "Release the payment",
  step3Body: "A person reviews the photo and releases the payment. Mile only recommends.",
  audienceTitle: "Who it is for",
  workersTitle: "Community members",
  workersBody: "Join the event, do the task assigned to you, and send the photo that accounts for the spend.",
  organizersTitle: "Organizers and funders",
  organizersBody: "The funder may be abroad. Lock the funding per task, review the proof, and release each payment. That record replaces loose screenshots and a spreadsheet.",
  trustTitle: "Why you can trust a payment",
  trustApproveTitle: "A person releases every payment",
  trustApproveBody: "Someone reviews the photo and decides. Hyto does not pay on its own.",
  trustAiTitle: "Mile only recommends",
  trustAiBody: "Mile reads the photo and suggests a score. Mile cannot sign or move the money.",
  trustEscrowTitle: "The money is set aside first",
  trustEscrowBody: "The organizer sets the task amount aside before the work, so the payment is waiting when the proof is approved.",
  legal: "Sign in with email through Cavos. An account is created to hold the payment. You do not need a separate cryptocurrency app.",
  mileKicker: "Meet Mile",
  closeKicker: "Start",
  closeTitle: "Ready to show the proof?",
  faqKicker: "Questions",
  faqTitle: "Before you start",
  faqCryptoQuestion: "Do I need to know about cryptocurrency?",
  faqCryptoAnswer: "No. Sign in with your email, do the task, and send a photo.",
  faqDollarsQuestion: "Why digital dollars, and not a local transfer?",
  faqDollarsAnswer:
    "The money comes from abroad in dollars, and the funder needs proof of the spend. Loose screenshots, a spreadsheet, or a local transfer such as SINPE do not leave a record anyone can check.",
};

export const discursoEs: Record<ClaveDiscurso, string> = {
  sloganLead: "Primero la prueba,",
  sloganPay: "después el pago.",
  subheadline:
    "Las comunidades en Latinoamérica que reciben fondos desde lejos rinden cuentas de cada gasto. Aparte dólares digitales (USDC), envíe una foto del trabajo o del recibo, y una persona libera el pago.",
  networkLead: "Red de práctica.",
  networkBody:
    "Los dólares digitales (USDC) aquí son para practicar. Nada en esta red es dinero real, y todavía no hay un pago en vivo registrado.",
  ctaSignIn: "Entrar",
  ctaDemo: "Probar el demo",
  ctaDemoHelp: "No necesita una cuenta. Abra una sesión de práctica como voluntario o como organizador.",
  ctaDemoVolunteer: "Como voluntario",
  ctaDemoOrganizer: "Como organizador",
  ctaDemoBusy: "Abriendo…",
  ctaDemoError: "No se pudo abrir el demo. Inténtelo de nuevo.",
  stepsTitle: "Cómo funciona",
  step1Title: "Aparte el financiamiento",
  step1Body:
    "Quien financia aparta el monto de cada tarea en dólares digitales (USDC) antes de que empiece el trabajo. Un estipendio, una beca o fondos para un evento, a menudo enviados por alguien que no está ahí.",
  step2Title: "Envíe una foto",
  step2Body: "Fotografíe el trabajo en el lugar, o el recibo, incluso si está en colones. Esa foto es la prueba del gasto.",
  step3Title: "Libere el pago",
  step3Body: "Una persona revisa la foto y libera el pago. Mile solo recomienda.",
  audienceTitle: "Para quién es",
  workersTitle: "Miembros de la comunidad",
  workersBody: "Únase al evento, haga la tarea que le asignaron y envíe la foto que comprueba el gasto.",
  organizersTitle: "Quienes organizan y financian",
  organizersBody: "Quien financia puede estar lejos. Aparte el financiamiento por tarea, revise la prueba y libere cada pago. Ese registro reemplaza las capturas sueltas y la hoja de cálculo.",
  trustTitle: "Por qué puede confiar en un pago",
  trustApproveTitle: "Una persona libera cada pago",
  trustApproveBody: "Alguien revisa la foto y decide. Hyto no paga solo.",
  trustAiTitle: "Mile solo recomienda",
  trustAiBody: "Mile lee la foto y sugiere una nota. No puede firmar ni mover el dinero.",
  trustEscrowTitle: "El dinero se aparta primero",
  trustEscrowBody:
    "Quien organiza aparta el monto de la tarea antes del trabajo, así el pago está esperando cuando se aprueba la prueba.",
  legal: "Usted entra con su correo por Cavos. Se crea una cuenta para guardar el pago. No necesita otra aplicación de criptomonedas.",
  mileKicker: "Conozca a Mile",
  closeKicker: "Empiece",
  closeTitle: "¿Listo para mostrar la prueba?",
  faqKicker: "Preguntas",
  faqTitle: "Antes de empezar",
  faqCryptoQuestion: "¿Necesito saber de criptomonedas?",
  faqCryptoAnswer: "No. Entre con su correo, haga la tarea y envíe una foto.",
  faqDollarsQuestion: "¿Por qué dólares digitales y no una transferencia local?",
  faqDollarsAnswer:
    "El dinero llega del extranjero en dólares, y quien financia pide prueba del gasto. Las capturas sueltas, una hoja de cálculo o una transferencia local como SINPE no dejan un registro que cualquiera pueda revisar.",
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
  return [
    { titulo: copia.faqCryptoQuestion, cuerpo: copia.faqCryptoAnswer },
    { titulo: copia.faqDollarsQuestion, cuerpo: copia.faqDollarsAnswer },
  ];
}

export function confianzaDiscurso(copia: Record<ClaveDiscurso, string> = discurso): readonly BloqueDiscurso[] {
  return [
    { titulo: copia.trustApproveTitle, cuerpo: copia.trustApproveBody },
    { titulo: copia.trustAiTitle, cuerpo: copia.trustAiBody },
    { titulo: copia.trustEscrowTitle, cuerpo: copia.trustEscrowBody },
  ];
}
