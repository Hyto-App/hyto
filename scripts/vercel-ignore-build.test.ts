import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/vercel-ignore-build.sh");

function repo(): { dir: string; git: (...args: string[]) => string; escribir: (ruta: string) => void; commit: () => string; correr: (previo?: string) => number } {
  const dir = mkdtempSync(join(tmpdir(), "hyto-ignore-"));
  const git = (...args: string[]) => {
    const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  git("init", "-q");
  return {
    dir,
    git,
    escribir: (ruta) => {
      mkdirSync(dirname(join(dir, ruta)), { recursive: true });
      writeFileSync(join(dir, ruta), `${ruta} ${Math.random()}\n`);
    },
    commit: () => {
      git("add", "-A");
      git("commit", "-q", "--allow-empty", "-m", "c");
      return git("rev-parse", "HEAD");
    },
    correr: (previo) => {
      const env = { ...process.env };
      delete env.VERCEL_GIT_PREVIOUS_SHA;
      if (previo !== undefined) env.VERCEL_GIT_PREVIOUS_SHA = previo;
      return spawnSync("bash", [SCRIPT], { cwd: dir, env, encoding: "utf8" }).status ?? -1;
    },
  };
}

function conBase(caso: (r: ReturnType<typeof repo>) => void) {
  const r = repo();
  try {
    r.escribir("app/page.tsx");
    r.escribir("README.md");
    r.commit();
    caso(r);
  } finally {
    rmSync(r.dir, { recursive: true, force: true });
  }
}

test("vercel.json usa el script del repo como Ignored Build Step", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { ignoreCommand?: string };
  assert.equal(config.ignoreCommand, "bash scripts/vercel-ignore-build.sh");
});

test("solo docs, buzon, changelog o markdown salta el build", () => {
  for (const rutas of [["docs/AUDIT.md", "docs/img/plano.png"], ["README.md", "lib/notas.md"], ["buzon/028.txt", "buzon.json"], ["changelog/2026-10.json"], ["CHANGELOG.MD"]]) {
    conBase((r) => {
      const previo = r.git("rev-parse", "HEAD");
      for (const ruta of rutas) r.escribir(ruta);
      r.commit();
      assert.equal(r.correr(previo), 0, rutas.join(", "));
      assert.equal(r.correr(), 1, `sin deploy previo: ${rutas.join(", ")}`);
    });
  }
});

test("un archivo de la app entre los cambios construye", () => {
  for (const rutas of [["lib/a.ts"], ["docs/x.md", "app/page.tsx"], ["package.json"], ["lib/docs/x.ts"], ["docsx/a.ts"], ["vercel.json"]]) {
    conBase((r) => {
      const previo = r.git("rev-parse", "HEAD");
      for (const ruta of rutas) r.escribir(ruta);
      r.commit();
      assert.equal(r.correr(previo), 1, rutas.join(", "));
    });
  }
});

test("compara contra el último despliegue y no solo contra el commit anterior", () => {
  conBase((r) => {
    const desplegado = r.git("rev-parse", "HEAD");
    r.escribir("lib/a.ts");
    r.commit();
    const despuesDelCodigo = r.git("rev-parse", "HEAD");
    r.escribir("docs/nota.md");
    r.commit();
    assert.equal(r.correr(), 1);
    assert.equal(r.correr(desplegado), 1);
    assert.equal(r.correr(despuesDelCodigo), 0);
  });
});

test("ante la duda construye: sin padre, sin cambios, despliegue fuera del clon o código movido a docs", () => {
  const r = repo();
  try {
    r.escribir("docs/a.md");
    r.commit();
    assert.equal(r.correr(), 1);
  } finally {
    rmSync(r.dir, { recursive: true, force: true });
  }
  conBase((r) => {
    const previo = r.git("rev-parse", "HEAD");
    r.commit();
    assert.equal(r.correr(previo), 1);
  });
  conBase((r) => {
    r.escribir("docs/a.md");
    r.commit();
    assert.equal(r.correr("0".repeat(40)), 1);
  });
  conBase((r) => {
    const previo = r.git("rev-parse", "HEAD");
    mkdirSync(join(r.dir, "docs"));
    renameSync(join(r.dir, "app/page.tsx"), join(r.dir, "docs/page.tsx"));
    r.commit();
    assert.equal(r.correr(previo), 1);
  });
});
