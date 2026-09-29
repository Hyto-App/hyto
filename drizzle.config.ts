import { defineConfig } from "drizzle-kit";
import { urlDeBase } from "./lib/config/entorno";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: urlDeBase() ?? "",
  },
});
