export function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  return Response.json(body, {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
}

export function sinBase(): Response {
  return json({ aviso: "La base no está configurada." }, 503);
}

export function sinFotos(): Response {
  return json({ aviso: "El almacén de fotos no está configurado." }, 503);
}

export function baseNoLista(): Response {
  return json({ aviso: "La base no está lista." }, 503);
}
