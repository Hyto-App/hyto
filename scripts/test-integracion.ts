import { spawn } from "node:child_process";
import pg from "pg";
import { esHostLocal, urlLocal } from "../tests/integracion/url-local";

async function main(): Promise<void> {
  const url = urlLocal();
  if (!esHostLocal(url)) {
    console.log("test:integracion: la URL no apunta a una base local; se omite sin conectar.");
    return;
  }
  const cliente = new pg.Client({ connectionString: url, connectionTimeoutMillis: 2000 });
  try {
    await cliente.connect();
    await cliente.end();
  } catch {
    console.log("test:integracion: no hay base Postgres local; se omite.");
    return;
  }

  const codigo = await new Promise<number>((resolve) => {
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
          GEMINI_API_KEY: "",
          LAYA_URL: "",
          LAYA_API_KEY: "",
          TRUSTLESS_API_KEY: "",
          BLOB_READ_WRITE_TOKEN: "",
          NEXT_PUBLIC_CAVOS_APP_ID: "",
          CAVOS_JWT_JWK: "",
          CAVOS_JWKS_URL: "",
          CAVOS_JWT_ISSUER: "",
          CAVOS_JWT_AUDIENCE: "",
        },
      },
    );
    hijo.on("exit", (salida, señal) => {
      resolve(señal ? 1 : salida ?? 1);
    });
  });
  process.exit(codigo);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No se pudieron correr las pruebas.");
  process.exit(1);
});
