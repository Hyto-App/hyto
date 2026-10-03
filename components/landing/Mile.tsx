import { discurso } from "@/lib/ui/discurso";

export function Mile() {
  return (
    <section className="hyto-landing-band" aria-labelledby="hyto-mile-title">
      <div className="hyto-landing-band-inner">
        <article className="hyto-mile-card">
          <p className="hyto-landing-kicker">{discurso.mileKicker}</p>
          <h2 id="hyto-mile-title">{discurso.trustAiTitle}</h2>
          <p>{discurso.trustAiBody}</p>
        </article>
      </div>
    </section>
  );
}
