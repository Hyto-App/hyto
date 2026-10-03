const PREGUNTAS = [
  {
    pregunta: "Do I need to know crypto?",
    respuesta:
      "No. You do small tasks and send a photo. You get paid in digital dollars (USDC). Hyto creates the account for you.",
  },
  {
    pregunta: "Is this real money?",
    respuesta:
      "Not yet. Hyto runs on the Stellar test network (testnet). These payments are practice money. They are not real dollars.",
  },
] as const;

export function Preguntas() {
  return (
    <section className="hyto-landing-band" aria-labelledby="hyto-faq-title">
      <div className="hyto-landing-band-inner">
        <p className="hyto-landing-kicker">Questions</p>
        <h2 id="hyto-faq-title" className="hyto-landing-h">
          Before you start
        </h2>
        <div className="hyto-faq-list">
          {PREGUNTAS.map((item) => (
            <details key={item.pregunta} className="hyto-faq">
              <summary>{item.pregunta}</summary>
              <p>{item.respuesta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
