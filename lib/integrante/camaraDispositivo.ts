/** A list that names devices, and none of them is a camera. An empty list is not proof. */
export function listaSinCamara(dispositivos: { kind: string }[]): boolean {
  if (dispositivos.length === 0) return false;
  return !dispositivos.some((dispositivo) => dispositivo.kind === "videoinput");
}

/** getUserMedia failed because this device has no camera. Permission errors are not this. */
export function errorSinCamara(error: unknown): boolean {
  const nombre = error && typeof error === "object" && "name" in error ? String((error as { name: unknown }).name) : "";
  return nombre === "NotFoundError" || nombre === "DevicesNotFoundError" || nombre === "OverconstrainedError";
}
