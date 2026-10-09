import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DESCRIPCION_PAGINA, DESCRIPCION_PAGINA_ES } from "./discurso";
import {
  descripcionSeo,
  esRutaPrivada,
  HOST_PUBLICO,
  jsonLdFaqPage,
  jsonLdOrganization,
  jsonLdSoftwareApplication,
  legalesPresentes,
  metaPublica,
  PREFIJOS_PRIVADOS,
  ROBOTS_PRIVADO,
  rutasSitemap,
  tituloMarca,
} from "./seo";

test("las rutas de la app son privadas y la landing no", () => {
  assert.equal(esRutaPrivada("/"), false);
  assert.equal(esRutaPrivada("/privacy"), false);
  assert.equal(esRutaPrivada("/terms"), false);
  assert.equal(esRutaPrivada("/cookies"), false);
  assert.equal(esRutaPrivada("/refunds"), false);
  for (const prefijo of PREFIJOS_PRIVADOS) {
    assert.equal(esRutaPrivada(prefijo), true, prefijo);
    assert.equal(esRutaPrivada(`${prefijo}/x`), true, `${prefijo}/x`);
  }
  assert.equal(esRutaPrivada("/eventos?x=1"), true);
  assert.equal(esRutaPrivada("/api/sesion"), false);
});

test("la descripción SEO cambia con el idioma y no nombra el activo", () => {
  assert.equal(descripcionSeo("en"), DESCRIPCION_PAGINA);
  assert.equal(descripcionSeo("es"), DESCRIPCION_PAGINA_ES);
  assert.equal(DESCRIPCION_PAGINA.includes("USDC"), false);
  assert.equal(DESCRIPCION_PAGINA_ES.includes("USDC"), false);
  assert.match(DESCRIPCION_PAGINA_ES, /dólares digitales/);
  assert.match(DESCRIPCION_PAGINA_ES, /envíe/);
});

test("metaPublica arma título, descripción, canonical y tarjetas", () => {
  const meta = metaPublica({
    idioma: "es",
    title: "Privacidad",
    description: DESCRIPCION_PAGINA_ES,
    path: "/privacy",
  });
  assert.equal(meta.title, "Privacidad");
  assert.equal(meta.description, DESCRIPCION_PAGINA_ES);
  assert.deepEqual(meta.alternates, { canonical: "/privacy" });
  assert.deepEqual(meta.robots, { index: true, follow: true });
  assert.equal(meta.openGraph?.title, "Privacidad · Hyto");
  assert.equal(meta.openGraph?.locale, "es_CR");
  assert.equal((meta.twitter as { card?: string } | undefined)?.card, "summary_large_image");
  assert.ok(tituloMarca().startsWith("Hyto · "));
  assert.equal(ROBOTS_PRIVADO.index, false);
});
test("el sitemap solo lista la landing y las páginas legales que existen", () => {
  const raiz = mkdtempSync(join(tmpdir(), "hyto-seo-"));
  try {
    mkdirSync(join(raiz, "app", "privacy"), { recursive: true });
    writeFileSync(join(raiz, "app", "privacy", "page.tsx"), "export default function P(){return null}");
    assert.deepEqual(legalesPresentes(raiz), ["privacy"]);
    assert.deepEqual(rutasSitemap(raiz), ["/", "/privacy"]);
    mkdirSync(join(raiz, "app", "terms"), { recursive: true });
    writeFileSync(join(raiz, "app", "terms", "page.tsx"), "export default function P(){return null}");
    assert.deepEqual(rutasSitemap(raiz), ["/", "/privacy", "/terms"]);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("JSON-LD Organization, SoftwareApplication y FAQPage", () => {
  const org = jsonLdOrganization();
  assert.equal(org["@type"], "Organization");
  assert.equal(org.name, "Hyto");
  assert.equal(org.url, HOST_PUBLICO);

  const app = jsonLdSoftwareApplication("es");
  assert.equal(app["@type"], "SoftwareApplication");
  assert.equal(app.description, DESCRIPCION_PAGINA_ES);

  const faq = jsonLdFaqPage("en");
  assert.ok(faq);
  assert.equal(faq["@type"], "FAQPage");
  const entidades = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
  assert.equal(entidades.length, 2);
  assert.match(entidades[0]!.name, /cryptocurrency/i);
  assert.match(entidades[1]!.acceptedAnswer.text, /SINPE/);
});
