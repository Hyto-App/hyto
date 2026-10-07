/**
 * In-app privacy page. English only. No payment-network jargon.
 * The public landing, if it grows its own page, stays separate from this copy.
 */

export const ENLACE_PRIVACIDAD = "Privacy";

export const PRIVACIDAD = {
  titulo: "Privacy",
  kicker: "Privacy",
  titular: "How Hyto handles your information",
  entrada:
    "Hyto is a marketplace of small tasks. You send a photo, a person reviews it, and you can get paid in digital dollars (USDC). This page says what the app keeps and who can see it.",
  inicio: "Home",
  secciones: [
    {
      titulo: "What we keep",
      cuerpo:
        "We store the email you use to sign in, a session so you stay signed in, and the account address used for your payments. When you upload a photo, we store that file and the notes written about it. We also store the events you join, invites for those events, and the record of a finished payment.",
    },
    {
      titulo: "How we use it",
      cuerpo:
        "We use this to show your tasks, review the photo, and pay the amount a person approves. Mile can read the photo and suggest a score. Mile does not sign or move money. An invite goes to the email an organizer enters.",
    },
    {
      titulo: "Who can see it",
      cuerpo:
        "You can see your own tasks and account. The organizer of an event can see the tasks, photos, and reviews for that event. Sign-in is handled by Cavos. Payment accounts live on Stellar. We do not sell your information, and we do not publish your email or photos.",
    },
    {
      titulo: "Cookies",
      cuerpo:
        "A sign-in cookie keeps you signed in for up to a day. A language cookie remembers English or Spanish on this device.",
    },
  ],
} as const;
