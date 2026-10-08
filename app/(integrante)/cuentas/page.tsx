import { tituloDe } from "@/lib/ui/titulo";
import { RedirigirConfiguracion } from "@/components/integrante/RedirigirConfiguracion";
import { ANCLA_PASSKEY, PARAM_PASSKEY, RUTA_PASSKEY_CUENTAS } from "@/lib/integrante/enlacePasskey";
import { exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.settings");

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Old account URL. The query and the hash move with the browser to Settings. */
export default async function PaginaCuentas({ searchParams }: Props) {
  const pide = (await searchParams)[PARAM_PASSKEY] === ANCLA_PASSKEY;
  await exigirPagina(pide ? RUTA_PASSKEY_CUENTAS : undefined);
  return <RedirigirConfiguracion />;
}
