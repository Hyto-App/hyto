import { baseAlcanzable, responderSalud, versionActual } from "@/lib/api/salud";

export const dynamic = "force-dynamic";

/** Public liveness check for QA. Status, version, and whether the database answered. No secrets. */
export function GET(): Promise<Response> {
  return responderSalud(() => baseAlcanzable(), versionActual());
}
