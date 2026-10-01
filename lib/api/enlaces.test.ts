import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

function archivos(raiz: string): string[] {
  const salida: string[] = [];
  const pila = [raiz];
  while (pila.length > 0) {
    const actual = pila.pop();
    if (!actual) continue;
    for (const entrada of readdirSync(actual)) {
      if (entrada === "node_modules" || entrada === ".next") continue;
      const ruta = join(actual, entrada);
      if (statSync(ruta).isDirectory()) pila.push(ruta);
      else if (entrada.endsWith(".ts") || entrada.endsWith(".tsx")) salida.push(ruta);
    }
  }
  return salida;
}

function paginas(): string[] {
  return archivos(join(process.cwd(), "app"))
    .filter((ruta) => ruta.endsWith(`${sep}page.tsx`) && !ruta.includes(`${sep}api${sep}`))
    .map((ruta) => {
      const rel = relative(join(process.cwd(), "app"), ruta).split(sep).join("/");
      const sinGrupo = rel
        .split("/")
        .filter((parte) => !parte.startsWith("("))
        .join("/");
      const limpio = sinGrupo.replace(/\/page\.tsx$/, "").replace(/^page\.tsx$/, "");
      return limpio ? `/${limpio}` : "/";
    });
}

function guardar(vistos: Set<string>, crudo: string) {
  const href = crudo.split("?")[0]?.split("#")[0] ?? "";
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/api") || href.startsWith("/_next")) return;
  if (/^\/(escrow|stellar|helper|deployer|v1)(\/|$)/.test(href)) return;
  if (!/^\/$|^\/[a-z]/.test(href)) return;
  vistos.add(href.replace(/\$\{[^}]+\}/g, "*"));
}

function enlaces(): string[] {
  const vistos = new Set<string>();
  const fuentes = [...archivos(join(process.cwd(), "app")), ...archivos(join(process.cwd(), "components")), ...archivos(join(process.cwd(), "lib"))].filter(
    (ruta) => !ruta.endsWith(".test.ts") && !ruta.endsWith(".test.tsx") && !ruta.includes(`${sep}app${sep}api${sep}`),
  );
  for (const ruta of fuentes) {
    const fuente = readFileSync(ruta, "utf8");
    for (const match of fuente.matchAll(/(?:href|push|replace|redirect)\s*(?:=|:)?\s*[\({]?\s*["'](\/[^"']*)["']/g)) {
      guardar(vistos, match[1] ?? "");
    }
    for (const match of fuente.matchAll(/`(\/[a-z][^`\s]*)`/g)) {
      guardar(vistos, match[1] ?? "");
    }
  }
  return [...vistos];
}

function coincide(href: string, pagina: string): boolean {
  const pedido = href.split("/").filter(Boolean);
  const esperado = pagina.split("/").filter(Boolean);
  if (pedido.length !== esperado.length) return false;
  return esperado.every((parte, indice) => parte.startsWith("[") || parte === pedido[indice] || pedido[indice] === "*");
}

test("cada enlace interno apunta a una página y cada página se alcanza", () => {
  const lista = paginas();
  const hrefs = enlaces();
  const rotos = hrefs.filter((href) => href.startsWith("/") && !lista.some((pagina) => coincide(href, pagina)));
  assert.deepEqual(rotos, []);
  const huerfanas = lista.filter((pagina) => !hrefs.some((href) => coincide(href, pagina)));
  assert.deepEqual(huerfanas, []);
});
