import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const SCRIPT = path.resolve("scripts/db/backup.sh");
const URL = "postgres://demo:s3cret@example.test:5432/hyto";

function entorno(extra: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
  for (const [clave, valor] of Object.entries(extra)) {
    if (valor === undefined) delete env[clave];
  }
  return env;
}

test("backup.sh solo lee y deja el archivo fuera del repo", () => {
  const fuente = readFileSync(SCRIPT, "utf8");
  assert.match(fuente, /pg_dump/);
  assert.match(fuente, /DATABASE_URL/);
  assert.doesNotMatch(fuente, /--clean/);
  assert.doesNotMatch(fuente, /^\s*pg_restore\b/m);
  assert.doesNotMatch(fuente, /\b(dropdb|psql|createdb)\b/);
  assert.match(fuente, /hyto-/);
  assert.doesNotMatch(fuente, /\bsource\b/);
  assert.doesNotMatch(fuente, /\.env\.local/);
  const ignore = readFileSync(path.resolve(".gitignore"), "utf8");
  assert.match(ignore, /^hyto-\*\.dump$/m);
});

test("sin DATABASE_URL no llama a pg_dump", () => {
  const bin = mkdtempSync(path.join(tmpdir(), "hyto-pgdump-"));
  writeFileSync(path.join(bin, "pg_dump"), "#!/bin/sh\nexit 9\n");
  chmodSync(path.join(bin, "pg_dump"), 0o755);
  const resultado = spawnSync("bash", [SCRIPT], {
    encoding: "utf8",
    env: entorno({
      DATABASE_URL: undefined,
      PATH: `${bin}:${process.env.PATH ?? ""}`,
      HOME: tmpdir(),
    }),
  });
  assert.equal(resultado.status, 1);
  assert.match(resultado.stderr, /DATABASE_URL/);
  rmSync(bin, { recursive: true, force: true });
});

test("el volcado cae fuera del repo y no imprime la URL", () => {
  const bin = mkdtempSync(path.join(tmpdir(), "hyto-pgdump-"));
  const salida = mkdtempSync(path.join(tmpdir(), "hyto-backups-"));
  const dentro = mkdtempSync(path.join(process.cwd(), ".tmp-backup-dentro-"));
  const log = path.join(bin, "args");
  writeFileSync(
    path.join(bin, "pg_dump"),
    `#!/bin/bash
printf '%s\\n' "$@" > "$HYTO_PG_DUMP_LOG"
archivo=""
previo=""
for arg in "$@"; do
  if [[ "$previo" == "--file" ]]; then
    archivo="$arg"
  fi
  previo="$arg"
done
if [[ -z "$archivo" ]]; then
  echo "falta archivo" >&2
  exit 2
fi
printf 'volcado de prueba\\n' > "$archivo"
`,
  );
  chmodSync(path.join(bin, "pg_dump"), 0o755);
  try {
    const resultado = spawnSync("bash", [SCRIPT], {
      encoding: "utf8",
      env: entorno({
        DATABASE_URL: URL,
        HYTO_BACKUP_DIR: salida,
        HYTO_PG_DUMP_LOG: log,
        PATH: `${bin}:${process.env.PATH ?? ""}`,
        HOME: tmpdir(),
      }),
    });
    assert.equal(resultado.status, 0, resultado.stderr);
    assert.match(resultado.stdout, /Backup listo:/);
    assert.doesNotMatch(`${resultado.stdout}\n${resultado.stderr}`, /s3cret/);
    const args = readFileSync(log, "utf8");
    assert.match(args, /--format=custom/);
    assert.match(args, /--no-owner/);
    assert.match(args, /--dbname/);
    assert.doesNotMatch(args, /--clean/);
    assert.match(args, new RegExp(`--file\n${salida.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/hyto-\\d{8}T\\d{6}Z\\.dump`));
    const rechazado = spawnSync("bash", [SCRIPT], {
      encoding: "utf8",
      env: entorno({
        DATABASE_URL: URL,
        HYTO_BACKUP_DIR: dentro,
        HYTO_PG_DUMP_LOG: log,
        PATH: `${bin}:${process.env.PATH ?? ""}`,
        HOME: tmpdir(),
      }),
    });
    assert.equal(rechazado.status, 1);
    assert.match(rechazado.stderr, /dentro del repo/);
  } finally {
    rmSync(bin, { recursive: true, force: true });
    rmSync(salida, { recursive: true, force: true });
    rmSync(dentro, { recursive: true, force: true });
  }
});
