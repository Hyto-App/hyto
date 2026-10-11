import assert from "node:assert/strict";
import test from "node:test";
import {
  AVISO_PASSKEY_CANCELADA,
  AVISO_PASSKEY_FALLO,
  AVISO_PASSKEY_SIN_CLAVE,
  AVISO_PASSKEY_SIN_SOPORTE,
} from "@/lib/auth/avisosPasskey";
import { AVISO_ORIGEN_CAVOS } from "@/lib/auth/errores";
import { AVISO_DISPOSITIVO, AVISO_PASSKEY, AVISO_REINGRESO, AVISO_SIN_CUENTA_FIRMA } from "@/lib/escrow/firmarCliente";
import { AVISO_HORIZON_RECEPTOR, AVISO_RECEPTOR_NO_LISTO } from "@/lib/escrow/receptorAvisos";
import {
  AVISO_USDC_FIRMANTE,
  AVISO_USDC_LENTO,
  AVISO_USDC_OTRA_CUENTA,
  AVISO_USDC_PENDIENTE,
  AVISO_USDC_SECUENCIA,
  AVISO_USDC_SIN_XLM,
  AVISO_USDC_VENCIDO,
} from "@/lib/integrante/avisosUsdc";
import { en, es, leerTexto, rutas, texto, type FuenteTextos } from "./diccionario";

test("English and Spanish dictionaries have the same keys", () => {
  assert.deepEqual(rutas(en).sort(), rutas(es).sort());
});

test("every dictionary string is non-empty and Spanish falls back to English", () => {
  for (const clave of rutas(en)) {
    assert.ok(leerTexto("en", clave).length > 0, clave);
    assert.ok(leerTexto("es", clave).length > 0, clave);
  }
  const hueco = structuredClone(es);
  hueco.nav.events = "";
  const fuente: FuenteTextos = { en, es: hueco };
  assert.equal(leerTexto("es", "nav.events", fuente), "Events");
  assert.equal(leerTexto("es", "no.existe", fuente), "no.existe");
});

test("verdict labels and the payout notices keep their English wording", () => {
  assert.equal(texto("en", "veredictos.insuficiente"), "Insufficient");
  assert.equal(texto("en", "veredictos.parcial"), "Partially completed");
  assert.equal(texto("en", "veredictos.cumplio"), "Completed");
  assert.equal(texto("es", "veredictos.insuficiente"), "Insuficiente");
  assert.equal(texto("es", "veredictos.parcial"), "Parcialmente completado");
  assert.equal(texto("es", "veredictos.cumplio"), "Completado");
  assert.equal(texto("en", "errores.receptorNoListo"), AVISO_RECEPTOR_NO_LISTO);
  assert.equal(texto("en", "errores.horizonReceptor"), AVISO_HORIZON_RECEPTOR);
  assert.equal(texto("en", "errores.reingreso"), AVISO_REINGRESO);
  assert.equal(texto("en", "errores.origenCavos"), AVISO_ORIGEN_CAVOS);
  assert.equal(texto("en", "errores.sinCuentaFirma"), AVISO_SIN_CUENTA_FIRMA);
  assert.equal(texto("en", "errores.dispositivo"), AVISO_DISPOSITIVO);
  assert.equal(texto("en", "errores.passkey"), AVISO_PASSKEY);
  assert.equal(texto("en", "errores.passkeySinSoporte"), AVISO_PASSKEY_SIN_SOPORTE);
  assert.equal(texto("en", "errores.passkeySinClave"), AVISO_PASSKEY_SIN_CLAVE);
  assert.equal(texto("en", "errores.passkeyCancelada"), AVISO_PASSKEY_CANCELADA);
  assert.equal(texto("en", "errores.passkeyFallo"), AVISO_PASSKEY_FALLO);
  assert.equal(texto("en", "errores.cobroSinXlm"), AVISO_USDC_SIN_XLM);
  assert.equal(texto("en", "errores.cobroSecuencia"), AVISO_USDC_SECUENCIA);
  assert.equal(texto("en", "errores.cobroFirmante"), AVISO_USDC_FIRMANTE);
  assert.equal(texto("en", "errores.cobroVencido"), AVISO_USDC_VENCIDO);
  assert.equal(texto("en", "errores.cobroPendiente"), AVISO_USDC_PENDIENTE);
  assert.equal(texto("en", "errores.cobroOtraCuenta"), AVISO_USDC_OTRA_CUENTA);
  assert.equal(texto("en", "errores.cobroLento"), AVISO_USDC_LENTO);
  assert.equal(texto("es", "entrar.espera", { n: 12 }), "Espere 12 s antes de pedir otro código");
  assert.equal(texto("en", "cuenta.pasaporteTitulo"), "Stellar Passport");
  assert.equal(texto("es", "cuenta.pasaporteTitulo"), "Stellar Passport");
  assert.equal(texto("en", "cuenta.pasaporteDetalle"), "It records participation and achievements in the Stellar ecosystem.");
  assert.equal(texto("es", "cuenta.pasaporteDetalle"), "Registra la participación y los logros en el ecosistema Stellar.");
  assert.equal(texto("en", "cuenta.pasaporteAbrir"), "Open Stellar Passport");
  assert.equal(texto("es", "cuenta.pasaporteAbrir"), "Abrir Stellar Passport");
  assert.equal(
    texto("en", "cuenta.passkeyDetalle"),
    "Your sign-in is saved only on this device. Add a passkey so you don't lose your account.",
  );
  assert.equal(
    texto("es", "cuenta.passkeyDetalle"),
    "Su acceso está guardado solo en este dispositivo. Agregue una llave de acceso para no perder su cuenta.",
  );
  assert.equal(texto("en", "cuenta.saldoHyto"), "Your Hyto balance");
  assert.equal(texto("es", "cuenta.saldoHyto"), "Su saldo en Hyto");
  assert.equal(texto("en", "cuenta.cobroTitulo"), "How to receive your money");
  assert.equal(texto("es", "cuenta.cobroTitulo"), "Cómo recibir su dinero");
  assert.equal(texto("en", "revision.technical"), "Advanced");
  assert.equal(texto("es", "revision.technical"), "Avanzado");
  assert.equal(texto("en", "revision.refPendiente"), "The payment reference appears when you set the money aside.");
  assert.equal(texto("es", "revision.refPendiente"), "La referencia del pago aparece cuando aparte el dinero.");
  assert.equal(texto("en", "cuenta.ausente"), "This account cannot receive a payment yet.");
  assert.equal(texto("es", "cuenta.ausente"), "Esta cuenta todavía no puede recibir un pago.");
  assert.equal(texto("en", "revision.yourAccount", { direccion: "G…AAAA" }), "Payment account ID (for support): G…AAAA");
  assert.equal(texto("es", "revision.yourAccount", { direccion: "G…AAAA" }), "ID de su cuenta de pagos (para soporte): G…AAAA");
  assert.equal(texto("en", "evidencia.uploaded"), "Photo uploaded successfully");
  assert.equal(texto("es", "evidencia.uploaded"), "Foto subida correctamente");
  assert.equal(texto("en", "evidencia.reachedOrganizer"), "Your photo already reached the organizer");
  assert.equal(texto("es", "evidencia.reachedOrganizer"), "Su foto ya le llegó al organizador");
  assert.equal(texto("en", "evidencia.mileCouldntFinish"), "Mile could not finish. Try again.");
  assert.equal(texto("es", "evidencia.mileCouldntFinish"), "Mile no pudo terminar. Intente de nuevo.");
  assert.equal(texto("en", "evidencia.mileRetry"), "The review did not finish. Send the photo again.");
  assert.equal(texto("es", "evidencia.mileRetry"), "La revisión no terminó. Envíe la foto otra vez.");
  assert.equal(texto("en", "evidencia.notEnoughName", { name: "Ana" }), "Ana, this photo did not pass Mile's review");
  assert.equal(texto("es", "evidencia.notEnoughName", { name: "Ana" }), "Ana, esta foto no pasó la revisión de Mile");
});

const VOSEO = [
  "agregá",
  "tenés",
  "podés",
  "querés",
  "sabés",
  "sos",
  "debés",
  "hacés",
  "ganás",
  "confirmá",
  "revisá",
  "mirá",
  "andá",
  "tocá",
  "usá",
  "guardá",
  "elegí",
  "probá",
  "entrá",
  "abrí",
  "poné",
  "decí",
  "pasá",
  "seguí",
  "volvé",
  "cambiá",
  "creá",
  "firmá",
  "pagá",
  "cobrá",
  "subí",
  "bajá",
  "mandá",
  "sacá",
  "dejá",
  "llevá",
  "traé",
  "mostrá",
  "esperá",
  "cancelá",
  "compartí",
  "escaneá",
  "iniciá",
  "fijate",
  "decime",
  "hacé",
];

function textosDe(nodo: unknown): string[] {
  if (typeof nodo === "string") return [nodo];
  if (!nodo || typeof nodo !== "object") return [];
  return Object.values(nodo).flatMap((hijo) => textosDe(hijo));
}

test("configuración en español usa usted y no deja la llave de acceso en inglés", () => {
  const textos = [
    ...textosDe(es.cuenta),
    ...textosDe(es.guiaPasskey),
    es.errores.passkey,
    es.errores.passkeySinSoporte,
    es.errores.passkeySinClave,
    es.errores.passkeyCancelada,
    es.errores.passkeyFallo,
    es.errores.dispositivo,
    es.pago.preparePayout,
    es.pago.preparingPayout,
    es.pago.payoutReady,
    es.pago.payoutDone,
    es.pago.checkingPayout,
    es.pago.viewChain,
    es.comunes.tryAgain,
    es.comunes.sample,
    es.nav.privacy,
    es.ayuda.costosQ,
    es.ayuda.costosA,
  ];
  const ingles = /Use a phone or tablet|Create passkey|Use passkey|\bpasskey\b|\blaptop\b/i;
  for (const valor of textos) {
    assert.doesNotMatch(valor, ingles, valor);
    for (const verbo of VOSEO) {
      const marca = new RegExp(`(^|[^a-záéíóúüñ])${verbo}([^a-záéíóúüñ]|$)`, "i");
      assert.equal(marca.test(valor), false, `${verbo} en: ${valor}`);
    }
  }
  assert.equal(texto("es", "ayuda.costosQ"), "¿Cuánto cuesta pagar una tarea?");
  assert.match(texto("es", "ayuda.costosA"), /comisión del 0,3 %/);
  assert.match(texto("es", "cuenta.passkeyTelefono"), /Usar un teléfono o una tablet/);
  assert.match(texto("es", "cuenta.passkeyListo"), /Usar llave de acceso/);
  assert.match(texto("es", "guiaPasskey.paso2"), /Crear llave de acceso/);
  assert.match(texto("es", "guiaPasskey.paso3"), /Usar un teléfono o una tablet/);
  assert.match(texto("es", "guiaPasskey.ayuda1"), /computadora portátil/);
  assert.match(texto("es", "errores.passkey"), /Usar llave de acceso/);
  assert.doesNotMatch(texto("es", "guiaPasskey.introCuenta"), /\bagregá\b/i);
  assert.match(texto("es", "guiaPasskey.introCuenta"), /Agréguela/);
  for (const valor of textosDe(es)) {
    assert.equal(/\bplata\b/i.test(valor), false, valor);
    for (const verbo of VOSEO) {
      const marca = new RegExp(`(^|[^a-záéíóúüñ])${verbo}([^a-záéíóúüñ]|$)`, "i");
      assert.equal(marca.test(valor), false, `${verbo} en: ${valor}`);
    }
  }
});

const TUTEO = [
  "tú",
  "tuyo",
  "tuya",
  "tuyos",
  "tuyas",
  "únete",
  "tómala",
  "cópiala",
  "comprueba",
  "apartas",
  "puedes",
  "tienes",
  "haces",
  "subes",
  "estás",
  "quieres",
  "debes",
  "necesitas",
];

test("el camino del demo en español no mezcla el tuteo con el usted", () => {
  const camino = [
    ...textosDe(es.tareas),
    ...textosDe(es.evidencia),
    ...textosDe(es.mile),
    ...textosDe(es.ayuda),
    ...textosDe(es.actividad),
    es.eventos.joinTitle,
    es.eventos.joinCode,
    es.eventos.code,
    es.eventos.join,
    es.eventos.joinInvalid,
    es.nav.askMile,
    es.nav.join,
    es.nav.joinCode,
    es.nav.myTasks,
    es.revision.demoNoMoney,
    es.cuenta.copyHere,
  ];
  const clitico = /(^|[^a-záéíóúüñ])(tú|tu|tus|te|ti)([^a-záéíóúüñ]|$)/i;
  for (const valor of camino) {
    assert.equal(clitico.test(valor), false, valor);
    for (const verbo of TUTEO) {
      const marca = new RegExp(`(^|[^a-záéíóúüñ])${verbo}([^a-záéíóúüñ]|$)`, "i");
      assert.equal(marca.test(valor), false, `${verbo} en: ${valor}`);
    }
  }
  assert.equal(texto("es", "evidencia.unaEvidencia"), "Envíe una sola evidencia: una foto, una factura, un PDF o una lista.");
  assert.equal(texto("es", "evidencia.sample"), "Tarea de ejemplo, hasta que carguen las suyas.");
  assert.match(texto("es", "evidencia.archivoFalso"), /Abra el archivo y compruebe que se ve la foto/);
  assert.equal(texto("es", "ayuda.placeholder"), "Busque en las respuestas");
  assert.match(texto("es", "ayuda.costosA"), /Si aparta US\$2/);
  assert.doesNotMatch(texto("es", "ayuda.costosA"), /apartas/);
  assert.equal(texto("es", "cuenta.copyHere"), "Cópiela desde aquí. Esta es la dirección pública.");
  assert.match(texto("es", "tareas.emptyBody"), /Únase/);
  assert.doesNotMatch(texto("es", "tareas.step1"), /Únete|Te unes/);
  assert.doesNotMatch(texto("es", "tareas.step2"), /Haces|subes/);
});

test("los diálogos de revisión y de recibo tratan de usted, no de tú", () => {
  const recibo = [
    es.evidencia.receiptTitle,
    es.evidencia.receiptBack,
    es.evidencia.receiptMissing,
    es.evidencia.receiptNotPaid,
    es.evidencia.receiptLoadFail,
    es.evidencia.receiptHelp,
    es.evidencia.youReceived,
    es.evidencia.viewReceipt,
    es.evidencia.setAside,
    es.evidencia.fee,
    es.evidencia.networkNote,
    es.evidencia.taskPayment,
    es.tareas.paidNote,
    es.tareas.earnedUsdc,
  ];
  const dialogos = [...textosDe(es.confirmar), ...textosDe(es.revision), ...textosDe(es.bandeja), ...textosDe(es.pago), ...recibo];
  const clitico = /(^|[^a-záéíóúüñ])(tú|tu|tus|te|ti|vos)([^a-záéíóúüñ]|$)/i;
  // An order at the start of a sentence is "Apruebe" and "Revise", never "Aprueba" or "Revisa".
  const imperativoTu = /(^|[.!?:]\s+)(Aprueba|Revisa|Confirma|Bloquea|Paga|Pide|Toma|Sube|Abre|Intenta)\b/;
  for (const valor of dialogos) {
    assert.equal(clitico.test(valor), false, valor);
    assert.doesNotMatch(valor, imperativoTu, valor);
    for (const verbo of [...TUTEO, ...VOSEO]) {
      const marca = new RegExp(`(^|[^a-záéíóúüñ])${verbo}([^a-záéíóúüñ]|$)`, "i");
      assert.equal(marca.test(valor), false, `${verbo} en: ${valor}`);
    }
  }
  assert.equal(texto("es", "confirmar.payDetail"), "Apruebe el trabajo y el pago llega a quien lo hizo.");
  assert.equal(texto("es", "tareas.earnedUsdc", { amount: "US$26,45" }), "Ganado: US$26,45");
  assert.equal(texto("en", "tareas.earnedUsdc", { amount: "US$26.45" }), "Earned: US$26.45");
  assert.equal(
    texto("es", "revision.brutoMenosComision", { bruto: "US$6,53", comision: "US$0,02" }),
    "US$6,53 menos comisión de US$0,02",
  );
  for (const valor of textosDe(es)) {
    assert.doesNotMatch(valor, /(^|[.!?]\s+)(Aprueba|Revisa) /, valor);
  }
});

test("la bienvenida define Hyto sin comparar, en usted y sin el aviso viejo del demo", () => {
  // The testnet pill is the one place the welcome names the test network.
  const sinEtiqueta = <T extends Record<string, unknown>>(rama: T) => {
    const { testnet: _t, testnetDemo: _d, ...resto } = rama as T & { testnet?: unknown; testnetDemo?: unknown };
    return resto;
  };
  const bienvenida = [...textosDe(sinEtiqueta(es.bienvenida)), ...textosDe(sinEtiqueta(en.bienvenida))];
  for (const valor of bienvenida) {
    assert.doesNotMatch(valor, /\bes c[oó]mo\b|\bis like\b/i, valor);
    assert.doesNotMatch(valor, /no puede preparar cobros|can't set up payouts/i, valor);
    assert.doesNotMatch(valor, /\b(usdc|wallet|billetera|testnet|red de prueba|test network)\b/i, valor);
  }
  const clitico = /(^|[^a-záéíóúüñ])(tú|tu|tus|te|ti|vos)([^a-záéíóúüñ]|$)/i;
  for (const valor of textosDe(es.bienvenida)) {
    assert.equal(clitico.test(valor), false, valor);
    for (const verbo of [...TUTEO, ...VOSEO]) {
      const marca = new RegExp(`(^|[^a-záéíóúüñ])${verbo}([^a-záéíóúüñ]|$)`, "i");
      assert.equal(marca.test(valor), false, `${verbo} en: ${valor}`);
    }
  }
  assert.equal(texto("es", "bienvenida.title"), "Bienvenido a Hyto");
  assert.equal(
    texto("es", "bienvenida.body"),
    "Hyto paga tareas de eventos cuando hay evidencia: usted sube su evidencia, Mile la revisa y una persona aprueba el pago.",
  );
  assert.equal(texto("es", "bienvenida.open", { name: "ZEEK" }), "Abrir ZEEK");
  assert.equal(texto("es", "bienvenida.join"), "Unirme con código");
  assert.equal(texto("es", "bienvenida.startDemo"), "Empezar el demo");
  assert.equal(texto("es", "bienvenida.testnet"), "Testnet");
  assert.equal(texto("es", "bienvenida.testnetDemo"), "Demo en testnet");
  assert.equal(texto("en", "bienvenida.testnetDemo"), "Testnet demo");
  assert.equal(texto("en", "bienvenida.title"), "Welcome to Hyto");
  assert.equal(texto("en", "bienvenida.open", { name: "ZEEK" }), "Open ZEEK");
  for (const valor of textosDe(es)) {
    assert.doesNotMatch(valor, /no puede preparar cobros|ninguna billetera firma/i, valor);
  }
});

test("el demo dice una sola frase y no habla de red ni billetera", () => {
  const frase = { es: "Demo: pago de práctica, no se mueve dinero real.", en: "Demo: practice payment, no real money moves." };
  for (const idioma of ["es", "en"] as const) {
    for (const clave of ["bienvenida.demo", "evidencia.practiceNetwork", "revision.demoNoMoney", "revision.demoNote", "cuenta.demoNota"] as const) {
      assert.equal(texto(idioma, clave), frase[idioma], clave);
    }
    for (const clave of ["errores.demoCobro", "errores.demoPagos"] as const) {
      const valor = texto(idioma, clave);
      assert.ok(valor.startsWith(frase[idioma]), clave);
      assert.match(valor, /1\. .+ 2\. .+ 3\. /, clave);
      assert.doesNotMatch(valor, /billetera|wallet|testnet|red de prueba|network/i, clave);
    }
  }
  assert.equal(texto("es", "evidencia.betterPhoto"), "Si quiere, puede enviar una foto mejor; quien organiza decide.");
  assert.equal(texto("en", "evidencia.betterPhoto"), "If you want, you can send a better photo; the organizer decides.");
});

test("una sola evidencia: la copia nueva existe en los dos idiomas, en usted, y nadie dice que la galería no se acepta", () => {
  assert.equal(texto("es", "evidencia.tomarFoto"), "Tomar foto");
  assert.equal(texto("en", "evidencia.tomarFoto"), "Take photo");
  assert.equal(texto("es", "evidencia.subirArchivo"), "Subir archivo");
  assert.equal(texto("en", "evidencia.subirArchivo"), "Upload file");
  assert.equal(texto("es", "evidencia.soltarTitulo"), "Arrastre su evidencia o elija un archivo");
  assert.equal(texto("en", "evidencia.soltarTitulo"), "Drag your evidence here or choose a file");
  assert.equal(texto("es", "evidencia.soltarFormatos"), "Foto, factura, PDF o lista");
  assert.equal(texto("en", "evidencia.soltarFormatos"), "Photo, invoice, PDF, or list");
  assert.match(texto("es", "tareas.step2"), /una foto, una factura, un PDF o una lista/);
  assert.match(texto("en", "bienvenida.body"), /you upload your evidence, Mile reviews it/);
  const nuevas = [
    "evidencia.tomarFoto",
    "evidencia.subirArchivo",
    "evidencia.soltarTitulo",
    "evidencia.soltarFormatos",
    "evidencia.unaEvidencia",
    "evidencia.photoHelp",
    "tareas.step2",
    "bienvenida.body",
  ] as const;
  const voseo = ["subí", "arrastrá", "elegí", "tomá", "tenés", "podés", "enviá", "mandá", "sacá", "subís", "elegís"];
  const clitico = /(^|[^a-záéíóúüñ])(tú|tu|tus|te|ti|vos)([^a-záéíóúüñ]|$)/i;
  for (const clave of nuevas) {
    const valor = texto("es", clave);
    assert.equal(clitico.test(valor), false, valor);
    for (const verbo of [...voseo, ...TUTEO, ...VOSEO]) {
      const marca = new RegExp(`(^|[^a-záéíóúüñ])${verbo}([^a-záéíóúüñ]|$)`, "i");
      assert.equal(marca.test(valor), false, `${verbo} en: ${valor}`);
    }
  }
  for (const valor of textosDe(es.evidencia)) {
    assert.doesNotMatch(valor, /No se aceptan fotos de la galería|solo con la cámara/i, valor);
  }
  for (const valor of textosDe(en.evidencia)) {
    assert.doesNotMatch(valor, /Photos from the gallery are not accepted/i, valor);
  }
  for (const valor of [...textosDe(es), ...textosDe(en)]) {
    assert.doesNotMatch(valor, /No se aceptan fotos de la galería|evidencia y la factura/i, valor);
  }
  for (const vieja of ["tabReceipt", "tabTask", "mismatchReceipt", "mismatchTask", "backToReceipt", "backToTask", "galleryHint", "gallery"]) {
    assert.equal(vieja in en.evidencia, false, vieja);
    assert.equal(vieja in es.evidencia, false, vieja);
  }
});
