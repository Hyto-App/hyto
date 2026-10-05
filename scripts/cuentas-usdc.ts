import { esCuenta } from "../lib/escrow/cuerpos";
import { leerCuentaTestnet } from "../lib/integrante/friendbot";
import { estadoCobro, type EstadoCobro } from "../lib/integrante/usdc";

// Read-only: one testnet Horizon read per address. It opens, funds, and signs nothing.
const QUE_HACER: Record<EstadoCobro, string> = {
  listo: "lista, ya tiene la trustline de USDC.",
  falta_trustline: "falta la trustline. Get ready to be paid arma un changeTrust que paga la propia cuenta.",
  sin_xlm: "no tiene XLM propio. Get ready to be paid pasa a la trustline patrocinada por Cavos.",
  sin_cuenta: "no existe en testnet. Get ready to be paid la abre con Friendbot.",
};

async function main(): Promise<number> {
  const direcciones = process.argv.slice(2).map((direccion) => direccion.trim()).filter(Boolean);
  if (direcciones.length === 0) {
    console.error("Uso: npm run cuentas:usdc -- G… [G…]");
    return 1;
  }
  let fallos = 0;
  for (const direccion of direcciones) {
    if (!esCuenta(direccion)) {
      console.error(`${direccion}: no es una cuenta G… de Stellar.`);
      fallos += 1;
      continue;
    }
    const cuenta = await leerCuentaTestnet(direccion, fetch);
    if (cuenta === "fallo") {
      console.error(`${direccion}: Horizon testnet no respondió.`);
      fallos += 1;
      continue;
    }
    console.log(`${direccion}: ${QUE_HACER[estadoCobro(cuenta)]}`);
  }
  console.log(
    "Esto no ve si el navegador de la persona guarda la clave de su cuenta. Eso solo aparece en la consola de ese navegador, en la línea [usdc] que dice needs-device-approval.",
  );
  return fallos > 0 ? 1 : 0;
}

main().then((codigo) => process.exit(codigo));
