import { discurso, preguntasDiscurso } from "@/lib/ui/discurso";

export function Preguntas() {
  return (
    <section className="hyto-landing-band" aria-labelledby="hyto-faq-title">
      <div className="hyto-landing-band-inner">
        <p className="hyto-landing-kicker">{discurso.faqKicker}</p>
        <h2 id="hyto-faq-title" className="hyto-landing-h">
          {discurso.faqTitle}
        </h2>
        <div className="hyto-faq-list">
          {preguntasDiscurso().map((item) => (
            <details key={item.titulo} className="hyto-faq">
              <summary>{item.titulo}</summary>
              <p>{item.cuerpo}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
