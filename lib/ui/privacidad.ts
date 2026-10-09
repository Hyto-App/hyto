/**
 * In-app privacy page. No payment-network jargon.
 * The public landing, if it grows its own page, stays separate from this copy.
 */

import type { Idioma } from "@/lib/ui/idioma";

export const ENLACE_PRIVACIDAD = "Privacy";

const EN = {
  titulo: "Privacy",
  kicker: "Privacy",
  titular: "How Hyto handles your information",
  entrada:
    "Hyto helps communities funded from afar account for the spend. You send a photo, a person reviews it, and a payment can be released in digital dollars (USDC). This page says what the app keeps and who can see it.",
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

const ES = {
  titulo: "Privacidad",
  kicker: "Privacidad",
  titular: "Cómo Hyto trata su información",
  entrada:
    "Hyto ayuda a las comunidades que reciben fondos desde lejos a rendir cuentas del gasto. Usted envía una foto, una persona la revisa y se puede liberar un pago en dólares digitales (USDC). Esta página dice qué guarda la app y quién puede verlo.",
  inicio: "Inicio",
  secciones: [
    {
      titulo: "Qué guardamos",
      cuerpo:
        "Guardamos el correo con el que entra, una sesión para que siga dentro y la dirección de la cuenta que se usa para sus pagos. Cuando sube una foto, guardamos ese archivo y las notas que se escriben sobre él. También guardamos los eventos a los que se une, las invitaciones de esos eventos y el registro de un pago terminado.",
    },
    {
      titulo: "Cómo lo usamos",
      cuerpo:
        "Lo usamos para mostrar sus tareas, revisar la foto y pagar el monto que una persona aprueba. Mile puede leer la foto y sugerir una nota. Mile no firma ni mueve dinero. Una invitación llega al correo que escribe quien organiza.",
    },
    {
      titulo: "Quién puede verlo",
      cuerpo:
        "Usted puede ver sus tareas y su cuenta. Quien organiza un evento puede ver las tareas, las fotos y las revisiones de ese evento. El ingreso lo maneja Cavos. Las cuentas de pago viven en Stellar. No vendemos su información y no publicamos su correo ni sus fotos.",
    },
    {
      titulo: "Cookies",
      cuerpo:
        "Una cookie de ingreso lo mantiene dentro hasta un día. Una cookie de idioma recuerda inglés o español en este dispositivo.",
    },
  ],
} as const;

export const PRIVACIDAD = EN;

export function privacidadDe(idioma: Idioma) {
  return idioma === "es" ? ES : EN;
}
