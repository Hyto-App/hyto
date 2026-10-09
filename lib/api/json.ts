import { AVISO_BASE_CONFIG, AVISO_BASE_OTRA, clasificarFalloBase, detalleErrorBase } from "./aviso-base";

export function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  return Response.json(body, {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
}

export function jsonCookies(body: unknown, status: number, cookies: string[]): Response {
  const headers = new Headers({ "content-type": "application/json" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return Response.json(body, { status, headers });
}

export function sinBase(): Response {
  return json({ aviso: AVISO_BASE_CONFIG }, 503);
}

export function sinFotos(): Response {
  return json({ aviso: "Photo storage is not configured." }, 503);
}

/**
 * A database failure from a route. Pass the caught error so a missing migration,
 * a dead connection, a missing configuration, and any other database error
 * do not share one sentence.
 * An error that is not from the database is still a database-path failure
 * (the catch wrapped a query) and is reported as the other database error.
 */
export function baseNoLista(error?: unknown): Response {
  if (error !== undefined) console.error("[api/base]", detalleErrorBase(error));
  const fallo = error === undefined ? null : clasificarFalloBase(error);
  if (fallo?.clase === "configuracion") return sinBase();
  if (fallo) return json({ aviso: fallo.aviso }, fallo.status);
  return json({ aviso: AVISO_BASE_OTRA }, 503);
}
