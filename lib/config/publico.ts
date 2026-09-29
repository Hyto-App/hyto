// Solo variables NEXT_PUBLIC_. Lo importan pantallas del navegador.
// No leas aquí secretos de servidor: este archivo entra al bundle del cliente.

export function appIdPublico(): string | null {
  const valor = process.env.NEXT_PUBLIC_CAVOS_APP_ID?.trim();
  return valor ? valor : null;
}
