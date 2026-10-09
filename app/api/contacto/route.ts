import { NextResponse } from "next/server";

/**
 * Accepts the landing contact form and redirects to the thank-you page.
 * Does not send email from this route (no personal inbox, no secrets).
 * Josué wires delivery later; the form still confirms the next step in the UI.
 */
export async function POST(pedido: Request) {
  const tipo = pedido.headers.get("content-type") ?? "";
  if (!tipo.includes("application/x-www-form-urlencoded") && !tipo.includes("multipart/form-data")) {
    return NextResponse.redirect(new URL("/#contacto", pedido.url), 303);
  }

  const datos = await pedido.formData();
  const nombre = String(datos.get("nombre") ?? "").trim();
  const correo = String(datos.get("correo") ?? "").trim();
  const mensaje = String(datos.get("mensaje") ?? "").trim();

  if (!nombre || !correo || !mensaje || !correo.includes("@") || mensaje.length > 4000) {
    return NextResponse.redirect(new URL("/#contacto", pedido.url), 303);
  }

  return NextResponse.redirect(new URL("/gracias", pedido.url), 303);
}
