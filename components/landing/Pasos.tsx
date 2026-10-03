const PASOS = [
  {
    titulo: "Get a task",
    texto: "Join an event and take a small task.",
  },
  {
    titulo: "Send a photo",
    texto: "When the work is done, send one photo.",
  },
  {
    titulo: "Get paid",
    texto: "An organizer reviews it and pays you in digital dollars (USDC).",
  },
] as const;

export function Pasos() {
  return (
    <section className="hyto-landing-band" aria-labelledby="hyto-pasos-title">
      <div className="hyto-landing-band-inner">
        <p className="hyto-landing-kicker">How it works</p>
        <h2 id="hyto-pasos-title" className="hyto-landing-h">
          Three steps
        </h2>
        <p className="hyto-landing-intro">Hyto is a marketplace of small tasks. You do the work. You get paid.</p>
        <ol className="hyto-landing-steps">
          {PASOS.map((paso, indice) => (
            <li key={paso.titulo} className="hyto-step-card">
              <span className="hyto-step-num" aria-hidden="true">
                {indice + 1}
              </span>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
