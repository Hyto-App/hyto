/**
 * Draft legal pages for review. Not legal advice.
 * One privacy page. The other three live here. No payment-network jargon
 * except the refund page, which names Stellar testnet on purpose.
 */

import type { Idioma } from "@/lib/ui/idioma";

export type SeccionLegal = {
  titulo: string;
  cuerpo: string;
};

export type CopiaLegal = {
  titulo: string;
  kicker: string;
  titular: string;
  entrada: string;
  borrador: string;
  inicio: string;
  secciones: readonly SeccionLegal[];
};

const BORRADOR_EN = "Draft of 9 October 2026, for review. This is not legal advice.";
const BORRADOR_ES = "Borrador del 9 de octubre de 2026, para revisión. Esto no es asesoría legal.";

const TERMINOS_EN: CopiaLegal = {
  titulo: "Terms and conditions",
  kicker: "Terms",
  titular: "Terms and conditions",
  entrada:
    "These terms describe how you use Hyto. They are a draft for review. They are not legal advice, and they do not choose a local law.",
  borrador: BORRADOR_EN,
  inicio: "Home",
  secciones: [
    {
      titulo: "What Hyto is",
      cuerpo:
        "Hyto helps communities that receive funds from afar show how that money was spent. You join an event, you do a task, and you send a photo or a receipt. A person reviews it. A payment can then be released in digital dollars (USDC).",
    },
    {
      titulo: "Your account",
      cuerpo:
        "You sign in with your email, through Cavos. Hyto prepares an account so a payment can reach you. You do not need another app for that. You are responsible for the email you use and for keeping this browser able to confirm a payment.",
    },
    {
      titulo: "Events and tasks",
      cuerpo:
        "The organizer creates an event and its tasks. You join with an invite or a code. You see the tasks assigned to you. The organizer sees the tasks of that event.",
    },
    {
      titulo: "Photos and receipts",
      cuerpo:
        "When you send a photo or a receipt, the organizer of that event can see it. An AI assistant, Mile, reads it and recommends a score. Mile does not sign and does not move money. A person decides whether to approve the payment.",
    },
    {
      titulo: "Payments",
      cuerpo:
        "Each task can have its amount set aside until a person approves the work. Hyto does not hold that money. The page on refunds and fees says what fee applies, what happens if the work is not approved, and that this version uses practice money and does not move real money.",
    },
    {
      titulo: "What we ask of you",
      cuerpo:
        "Send photos and receipts that belong to the task. Do not send another person's private papers. Do not try to sign in as someone else.",
    },
    {
      titulo: "Changes",
      cuerpo:
        "This text can change while it is a draft. The date above is the draft you are reading. If you keep using Hyto after a published change, you accept the text then on this page.",
    },
  ],
};

const TERMINOS_ES: CopiaLegal = {
  titulo: "Términos y condiciones",
  kicker: "Términos",
  titular: "Términos y condiciones",
  entrada:
    "Estos términos describen cómo usa Hyto. Son un borrador para revisión. No son asesoría legal y no eligen una ley local.",
  borrador: BORRADOR_ES,
  inicio: "Inicio",
  secciones: [
    {
      titulo: "Qué es Hyto",
      cuerpo:
        "Hyto ayuda a las comunidades que reciben fondos desde lejos a mostrar en qué se gastó ese dinero. Usted se une a un evento, hace una tarea y envía una foto o un recibo. Una persona lo revisa. Después se puede liberar un pago en dólares digitales (USDC).",
    },
    {
      titulo: "Su cuenta",
      cuerpo:
        "Usted entra con su correo, por medio de Cavos. Hyto prepara una cuenta para que un pago pueda llegarle. No necesita otra aplicación para eso. Usted responde por el correo que usa y por mantener este navegador en condiciones de confirmar un pago.",
    },
    {
      titulo: "Eventos y tareas",
      cuerpo:
        "Quien organiza crea un evento y sus tareas. Usted entra con una invitación o con un código. Usted ve las tareas que le asignan. Quien organiza ve las tareas de ese evento.",
    },
    {
      titulo: "Fotos y recibos",
      cuerpo:
        "Cuando usted envía una foto o un recibo, quien organiza ese evento puede verlo. Un asistente de inteligencia artificial, Mile, lo lee y recomienda una nota. Mile no firma ni mueve dinero. Una persona decide si aprueba el pago.",
    },
    {
      titulo: "Pagos",
      cuerpo:
        "Cada tarea puede tener su monto apartado hasta que una persona apruebe el trabajo. Hyto no guarda ese dinero. La página de reembolsos y comisiones dice qué comisión aplica, qué pasa si el trabajo no se aprueba y que esta versión usa dinero de práctica y no mueve dinero real.",
    },
    {
      titulo: "Qué le pedimos",
      cuerpo:
        "Envíe fotos y recibos que correspondan a la tarea. No envíe papeles privados de otra persona. No intente entrar como si fuera otra persona.",
    },
    {
      titulo: "Cambios",
      cuerpo:
        "Este texto puede cambiar mientras sea un borrador. La fecha de arriba es el borrador que está leyendo. Si sigue usando Hyto después de un cambio publicado, acepta el texto que entonces esté en esta página.",
    },
  ],
};

const COOKIES_EN: CopiaLegal = {
  titulo: "Cookie policy",
  kicker: "Cookies",
  titular: "Cookie policy",
  entrada:
    "Hyto uses a few cookies so you can stay signed in and so the language you choose is remembered. There is no cookie banner. Hyto does not use analytics cookies or advertising cookies.",
  borrador: BORRADOR_EN,
  inicio: "Home",
  secciones: [
    {
      titulo: "Session",
      cuerpo:
        "A cookie named hyto_sesion keeps you signed in for up to 24 hours. It is limited to this site, and the page itself cannot read it. When you sign out, Hyto removes it.",
    },
    {
      titulo: "New account",
      cuerpo:
        "A cookie named hyto_alta lasts 15 minutes. It only marks that this browser just created an account, so the first setup can finish. It is not used for advertising.",
    },
    {
      titulo: "Language",
      cuerpo:
        "A cookie named hyto_idioma remembers English or Spanish for one year. Hyto sets it only after you choose a language. If you never choose, Hyto does not set it. Your browser's language can still decide the first screen.",
    },
    {
      titulo: "Cavos",
      cuerpo:
        "Sign-in is handled by Cavos. Cavos may store in this browser what it needs to recognize you and to let you confirm a payment. Hyto does not use that store for advertising. This page does not list Cavos's own names.",
    },
    {
      titulo: "Choices on this device",
      cuerpo:
        "Light or dark appearance, and a few choices such as a welcome note you hide, stay in this browser. They are not cookies, and they are not sent to Hyto with each visit.",
    },
    {
      titulo: "Analytics",
      cuerpo:
        "Hyto does not set analytics cookies and does not set advertising cookies. That is why there is no cookie banner. If that changes, this page will say so before those cookies are used.",
    },
  ],
};

const COOKIES_ES: CopiaLegal = {
  titulo: "Política de cookies",
  kicker: "Cookies",
  titular: "Política de cookies",
  entrada:
    "Hyto usa unas pocas cookies para que usted siga dentro y para recordar el idioma que elige. No hay un aviso de cookies. Hyto no usa cookies de analítica ni cookies de publicidad.",
  borrador: BORRADOR_ES,
  inicio: "Inicio",
  secciones: [
    {
      titulo: "Sesión",
      cuerpo:
        "Una cookie llamada hyto_sesion lo mantiene dentro hasta 24 horas. Queda limitada a este sitio, y la página no puede leerla. Cuando usted sale, Hyto la quita.",
    },
    {
      titulo: "Cuenta nueva",
      cuerpo:
        "Una cookie llamada hyto_alta dura 15 minutos. Solo marca que este navegador acaba de crear una cuenta, para que la primera preparación pueda terminar. No se usa para publicidad.",
    },
    {
      titulo: "Idioma",
      cuerpo:
        "Una cookie llamada hyto_idioma recuerda inglés o español durante un año. Hyto la escribe solo después de que usted elige un idioma. Si nunca elige, Hyto no la escribe. El idioma del navegador puede decidir la primera pantalla.",
    },
    {
      titulo: "Cavos",
      cuerpo:
        "El ingreso lo hace Cavos. Cavos puede guardar en este navegador lo que necesita para reconocerlo y para que usted confirme un pago. Hyto no usa ese almacén para publicidad. Esta página no enumera los nombres propios de Cavos.",
    },
    {
      titulo: "Elecciones en este dispositivo",
      cuerpo:
        "La apariencia clara u oscura, y algunas elecciones como una nota de bienvenida que usted oculta, se quedan en este navegador. No son cookies y no se envían a Hyto en cada visita.",
    },
    {
      titulo: "Analítica",
      cuerpo:
        "Hyto no escribe cookies de analítica ni cookies de publicidad. Por eso no hay un aviso de cookies. Si eso cambia, esta página lo dirá antes de que esas cookies se usen.",
    },
  ],
};

const REEMBOLSOS_EN: CopiaLegal = {
  titulo: "Refunds and fees",
  kicker: "Refunds",
  titular: "Refunds and fees",
  entrada:
    "This page says what happens to the money of a task. It matches how Hyto works today. It is a draft for review, not legal advice.",
  borrador: BORRADOR_EN,
  inicio: "Home",
  secciones: [
    {
      titulo: "Practice money",
      cuerpo:
        "This version runs on Stellar testnet. The amounts are practice money. Hyto does not move real money.",
    },
    {
      titulo: "How a task is paid",
      cuerpo:
        "Each task has its own payment hold, run by Trustless Work. The organizer sets the task amount aside. Hyto does not hold that money. Hyto does not sign the payment. A person does.",
    },
    {
      titulo: "What Mile does",
      cuerpo:
        "Mile reads the photo or the receipt and recommends a score. A person approves and releases the payment. Mile does not sign and does not move money.",
    },
    {
      titulo: "Fees",
      cuerpo:
        "When a payment is released, Trustless Work charges a fee of 0.3%. That fee comes out of what the person who gets paid receives. Hyto does not charge its own fee today. When Hyto's fee is defined, this page will state the percentage before it applies.",
    },
    {
      titulo: "If the work is not approved",
      cuerpo:
        "The payment is not released. The money stays set aside on that task. This version has no button that returns it to the organizer's balance. A dispute can be opened. The person named to resolve it decides how that set-aside amount is split, and that split can send the money back. Until then, the money stays on the task.",
    },
    {
      titulo: "Receipts",
      cuerpo:
        "For a receipt, the organizer confirms the amount before the payment is prepared. The confirmed amount cannot pass the task limit. Only the confirmed amount is paid.",
    },
  ],
};

const REEMBOLSOS_ES: CopiaLegal = {
  titulo: "Reembolsos y comisiones",
  kicker: "Reembolsos",
  titular: "Política de reembolsos y comisiones",
  entrada:
    "Esta página dice qué pasa con el dinero de una tarea. Coincide con cómo funciona Hyto hoy. Es un borrador para revisión, no asesoría legal.",
  borrador: BORRADOR_ES,
  inicio: "Inicio",
  secciones: [
    {
      titulo: "Dinero de práctica",
      cuerpo:
        "Esta versión corre en Stellar testnet. Los montos son dinero de práctica. Hyto no mueve dinero real.",
    },
    {
      titulo: "Cómo se paga una tarea",
      cuerpo:
        "Cada tarea tiene su propio apartado de pago, a cargo de Trustless Work. Quien organiza aparta el monto de la tarea. Hyto no guarda ese dinero. Hyto no firma el pago. Lo firma una persona.",
    },
    {
      titulo: "Qué hace Mile",
      cuerpo:
        "Mile lee la foto o el recibo y recomienda una nota. Una persona aprueba y libera el pago. Mile no firma ni mueve dinero.",
    },
    {
      titulo: "Comisiones",
      cuerpo:
        "Cuando se libera un pago, Trustless Work cobra una comisión del 0,3 %. Esa comisión sale de lo que recibe quien cobra. Hoy Hyto no cobra una comisión propia. Cuando se defina la comisión de Hyto, esta página dirá el porcentaje antes de que aplique.",
    },
    {
      titulo: "Si el trabajo no se aprueba",
      cuerpo:
        "El pago no se libera. El dinero sigue apartado en esa tarea. Esta versión no tiene un botón que lo devuelva al saldo de quien organiza. Se puede abrir una disputa. La persona designada para resolverla decide cómo se reparte ese monto apartado, y ese reparto puede devolver el dinero. Mientras tanto, el dinero sigue en la tarea.",
    },
    {
      titulo: "Recibos",
      cuerpo:
        "Si es un recibo, quien organiza confirma el monto antes de preparar el pago. El monto confirmado no puede pasar el límite de la tarea. Solo se paga el monto confirmado.",
    },
  ],
};

export function terminosDe(idioma: Idioma): CopiaLegal {
  return idioma === "es" ? TERMINOS_ES : TERMINOS_EN;
}

export function cookiesDe(idioma: Idioma): CopiaLegal {
  return idioma === "es" ? COOKIES_ES : COOKIES_EN;
}

export function reembolsosDe(idioma: Idioma): CopiaLegal {
  return idioma === "es" ? REEMBOLSOS_ES : REEMBOLSOS_EN;
}

export function textosLegales(copia: CopiaLegal): string[] {
  return [
    copia.titulo,
    copia.kicker,
    copia.titular,
    copia.entrada,
    copia.borrador,
    copia.inicio,
    ...copia.secciones.flatMap((seccion) => [seccion.titulo, seccion.cuerpo]),
  ];
}
