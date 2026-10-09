import assert from "node:assert/strict";
import test from "node:test";
import { cookiesDe, reembolsosDe, terminosDe, textosLegales } from "./legal";
import { privacidadDe } from "./privacidad";

const VOSEO = ["agregá", "tenés", "podés", "querés", "debés", "hacés", "mirá", "usá", "enviá", "subí"];
const TUTEO = /\b(tú|te|ti|tu|tus|puedes|tienes|debes|quieres|haces|envías|envia)\b/i;
const SECRETOS = /@|G[A-Z2-7]{20,}/;

function unir(idioma: "en" | "es"): string {
  return [privacidadDe(idioma), terminosDe(idioma), cookiesDe(idioma), reembolsosDe(idioma)]
    .flatMap((copia) => textosLegales(copia))
    .join("\n");
}

test("las páginas legales son borrador, en usted, y no publican secretos", () => {
  for (const idioma of ["en", "es"] as const) {
    const texto = unir(idioma);
    assert.match(texto, idioma === "es" ? /no es asesoría legal/i : /not legal advice/i);
    assert.equal(/\bplata\b/i.test(texto), false);
    assert.equal(SECRETOS.test(texto), false, texto);
    for (const verbo of VOSEO) assert.equal(texto.toLowerCase().includes(verbo), false, verbo);
  }
  const es = unir("es");
  assert.equal(TUTEO.test(es), false, es);
  assert.match(es, /Acepto|Usted|quien organiza/i);
});

test("las cookies nombran sesión, idioma y Cavos, y no hay banner si no hay analítica", () => {
  const en = textosLegales(cookiesDe("en")).join("\n");
  const es = textosLegales(cookiesDe("es")).join("\n");
  assert.match(en, /hyto_sesion/);
  assert.match(en, /hyto_idioma/);
  assert.match(en, /hyto_alta/);
  assert.match(en, /Cavos/);
  assert.match(en, /no cookie banner/i);
  assert.match(en, /does not set analytics cookies/i);
  assert.match(es, /no hay un aviso de cookies/i);
  assert.match(es, /no usa cookies de analítica/i);
});

test("reembolsos dice testnet, el 0,3 % de Trustless Work y que Hyto no guarda el dinero", () => {
  const en = textosLegales(reembolsosDe("en")).join("\n");
  const es = textosLegales(reembolsosDe("es")).join("\n");
  assert.match(en, /Stellar testnet/);
  assert.match(en, /does not move real money/);
  assert.match(en, /Trustless Work/);
  assert.match(en, /0\.3%/);
  assert.match(en, /does not charge its own fee today/);
  assert.match(en, /Mile does not sign/);
  assert.match(en, /Hyto does not hold that money/);
  assert.match(en, /no button that returns it/);
  assert.match(en, /dispute can be opened/);
  assert.match(es, /Stellar testnet/);
  assert.match(es, /no mueve dinero real/);
  assert.match(es, /0,3 %/);
  assert.match(es, /Hoy Hyto no cobra una comisión propia/);
  assert.match(es, /Mile no firma/);
  assert.doesNotMatch(es, /\bescrow\b/i);
  assert.doesNotMatch(`${en}\n${es}`, /\bplata\b/i);
});

test("la privacidad sigue siendo una sola página y no nombra la red de prueba", () => {
  const en = textosLegales(privacidadDe("en")).join("\n");
  const es = textosLegales(privacidadDe("es")).join("\n");
  assert.equal(/\b(escrow|testnet)\b/i.test(en), false);
  assert.equal(/\b(escrow|testnet)\b/i.test(es), false);
  assert.match(en, /does not move real money/);
  assert.match(es, /No mueve dinero real/);
});
