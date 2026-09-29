export function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  return Response.json(body, {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
}

export function sinBase(): Response {
  return json({ aviso: "The database is not configured." }, 503);
}

export function sinFotos(): Response {
  return json({ aviso: "Photo storage is not configured." }, 503);
}

export function baseNoLista(): Response {
  return json({ aviso: "The database is not ready." }, 503);
}
