"use client";

import { useDiscurso } from "@/components/ui/Idioma";

/** Contact form posts to the API and lands on /gracias. No personal email on the page. */
export function Contacto() {
  const copia = useDiscurso();
  return (
    <section className="hyto-landing-band" id="contacto" aria-labelledby="hyto-contacto-title">
      <div className="hyto-landing-band-inner">
        <p className="hyto-landing-kicker">{copia.contactoKicker}</p>
        <h2 id="hyto-contacto-title" className="hyto-landing-h">
          {copia.contactoTitle}
        </h2>
        <p className="hyto-landing-intro">{copia.contactoLead}</p>
        <p className="hyto-landing-promesa" role="note">
          {copia.contactoPromesa}
        </p>
        <p className="hyto-landing-intro">{copia.contactoCanal}</p>
        <form className="hyto-contacto-form" method="post" action="/api/contacto">
          <label>
            <span>{copia.contactoNombre}</span>
            <input name="nombre" type="text" autoComplete="name" required maxLength={120} />
          </label>
          <label>
            <span>{copia.contactoCorreo}</span>
            <input name="correo" type="email" autoComplete="email" required maxLength={200} />
          </label>
          <label>
            <span>{copia.contactoMensaje}</span>
            <textarea name="mensaje" required maxLength={4000} rows={5} />
          </label>
          <button type="submit" className="hyto-btn">
            {copia.contactoEnviar}
          </button>
        </form>
      </div>
    </section>
  );
}
