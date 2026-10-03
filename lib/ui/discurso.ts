/**
 * English speech for the public landing.
 * One flat map so a later language selector can replace this object.
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
};

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

export function confianzaDiscurso(copia: Record<ClaveDiscurso, string> = discurso): readonly BloqueDiscurso[] {
  return [
    { titulo: copia.trustApproveTitle, cuerpo: copia.trustApproveBody },
    { titulo: copia.trustAiTitle, cuerpo: copia.trustAiBody },
    { titulo: copia.trustEscrowTitle, cuerpo: copia.trustEscrowBody },
  ];
}
