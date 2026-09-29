import { spawn } from "node:child_process";
import pg from "pg";
import { esHostLocal, urlLocal } from "../tests/integracion/url-local";

const url = urlLocal();

if (!esHostLocal(url)) {
  console.log("test:integracion: la URL no apunta a una base local; se omite sin conectar.");
  process.exit(0);
}

const cliente = new pg.Client({ connectionString: url, connectionTimeoutMillis: 2000 });
try {
  await cliente.connect();
  await cliente.end();
} catch {
  console.log("test:integracion: no hay base Postgres local; se omite.");
  process.exit(0);
}

const hijo = spawn(
  process.execPath,
  [
    "--experimental-test-module-mocks",
    "--import",
    "tsx",
    "--test",
    "--test-concurrency=1",
    "tests/integracion/api.test.ts",
    "tests/integracion/admin.test.ts",
    "tests/integracion/entrar-google.test.ts",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: url,
      HYTO_TEST_DATABASE_URL: url,
      GROQ_API_KEY: "",
      LAYA_URL: "",
      LAYA_API_KEY: "",
      TRUSTLESS_API_KEY: "",
      BLOB_READ_WRITE_TOKEN: "",
      NEXT_PUBLIC_CAVOS_APP_ID: "",
    },
  },
);

hijo.on("exit", (codigo, señal) => {
  if (señal) process.exit(1);
  process.exit(codigo ?? 1);
});
