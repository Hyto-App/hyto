import assert from "node:assert/strict";
import test from "node:test";
import { CRC_POR_USD, convertirAUsd } from "./divisas";
import { contextoParaLaya, leerLectura, montoSinUsd, type LecturaEvidencia } from "./lectura";
import { describirFoto, leerDescripcion, pedidoVision } from "./scout";
import { MARCA_LECTURA, MARCA_RAZONES, separarDescripcion, unirDescripcion } from "./snapshot-razones";

const LITTLE_CAESARS = {
  tipo: "recibo",
  pais: "CR",
  moneda: "CRC",
  monto_original: "₡7.350,00",
  monto_usd: null,
  fecha: "02/10/2026",
  comercio: "Little Caesars",
  articulos: ["Pepperoni pizza", "Soda"],
  texto_completo:
    "A printed Little Caesars receipt from San José, Costa Rica. It lists one pepperoni pizza and one soda. The total is ₡7.350,00 in colones. The purchase date is printed as 02/10/2026. The receipt is sharp and every line is readable.",
  legible: true,
  faltantes: [],
};

function lectura(cambios: Record<string, unknown> = {}, pedido = "Photo of the meal receipt"): LecturaEvidencia {
  const leida = leerLectura({ ...LITTLE_CAESARS, ...cambios }, { pedido });
  assert.ok(leida);
  return leida;
}

test("la tasa de colones es una constante y convierte centavos a dólares", () => {
  assert.equal(CRC_POR_USD, 505);
  assert.deepEqual(convertirAUsd(735000, "CRC"), { usd: "14.55", tasa: 505 });
  assert.deepEqual(convertirAUsd(1240, "USD"), { usd: "12.40", tasa: 1 });
  assert.equal(convertirAUsd(735000, "EUR"), null);
  assert.equal(convertirAUsd(735000, null), null);
  assert.equal(convertirAUsd(0, "CRC"), null);
});

test("un recibo tico en colones queda con monto en dólares y la fecha día primero", () => {
  const leida = lectura();
  assert.equal(leida.tipo, "recibo");
  assert.equal(leida.pais, "CR");
  assert.equal(leida.moneda, "CRC");
  assert.equal(leida.montoOriginal, "₡7.350,00");
  assert.equal(leida.montoUsd, "14.55");
  assert.equal(leida.tasa, 505);
  assert.equal(leida.fecha, "2026-10-02");
  assert.equal(leida.fechaImpresa, "02/10/2026");
  assert.equal(leida.comercio, "Little Caesars");
  assert.deepEqual(leida.articulos, ["Pepperoni pizza", "Soda"]);
  assert.equal(leida.legible, true);
  assert.equal(montoSinUsd(leida), false);
});

test("el símbolo impreso manda sobre el código del modelo", () => {
  assert.equal(lectura({ moneda: "USD" }).moneda, "CRC");
  assert.equal(lectura({ moneda: null, monto_original: "¢7,350.00" }).moneda, "CRC");
  assert.equal(lectura({ moneda: null, monto_original: "¢7,350.00" }).montoUsd, "14.55");
  assert.equal(lectura({ moneda: "Colones (CRC)", monto_original: "7350" }).moneda, "CRC");
  assert.equal(lectura({ moneda: "USDC", monto_original: "7350", texto_completo: "A receipt." }).moneda, null);
});

test("sin moneda visible no se asumen dólares", () => {
  const sinMoneda = lectura({ moneda: null, pais: null, monto_original: "7.350,00", texto_completo: "A receipt with a total." });
  assert.equal(sinMoneda.moneda, null);
  assert.equal(sinMoneda.montoUsd, null);
  assert.equal(montoSinUsd(sinMoneda), true);
  const dolarSolo = lectura({ moneda: null, pais: null, monto_original: "$12.40", texto_completo: "A receipt with a total." });
  assert.equal(dolarSolo.moneda, null);
  assert.equal(dolarSolo.montoUsd, null);
  assert.match(contextoParaLaya(sinMoneda), /Currency: not shown, so the total was not converted to US dollars\./);
});

test("un recibo en dólares no se convierte y un $ en Costa Rica o Estados Unidos es USD", () => {
  const usd = lectura({ pais: "US", moneda: "USD", monto_original: "$12.40", fecha: "09/27/2026", comercio: "Subway" });
  assert.equal(usd.moneda, "USD");
  assert.equal(usd.montoUsd, "12.40");
  assert.equal(usd.tasa, 1);
  assert.equal(usd.fecha, "2026-09-27");
  assert.equal(lectura({ pais: "US", moneda: null, monto_original: "$12.40" }).moneda, "USD");
  assert.equal(lectura({ pais: "CR", moneda: null, monto_original: "$12.40" }).montoUsd, "12.40");
  assert.equal(lectura({ pais: "United States", moneda: "US dollars", monto_original: "12.40" }).pais, "US");
});

test("las fechas impresas siguen el orden local y el año corto se completa", () => {
  assert.equal(lectura({ fecha: "02/10/26" }).fecha, "2026-10-02");
  assert.equal(lectura({ fecha: "2026-10-02" }).fecha, "2026-10-02");
  assert.equal(lectura({ fecha: "2 de octubre de 2026" }).fecha, "2026-10-02");
  assert.equal(lectura({ fecha: "13/10/2026 14:35" }).fecha, "2026-10-13");
  assert.equal(lectura({ pais: "US", moneda: "USD", fecha: "10/02/2026" }).fecha, "2026-10-02");
  const sinFecha = lectura({ fecha: null });
  assert.equal(sinFecha.fecha, null);
  assert.match(contextoParaLaya(sinFecha), /Purchase date: not shown\./);
});

test("Laya recibe la lectura completa y no una sola frase", () => {
  const contexto = contextoParaLaya(lectura());
  assert.match(contexto, /^Evidence type: a receipt or an invoice\./);
  assert.match(contexto, /Readable photo: yes\./);
  assert.match(contexto, /Merchant: Little Caesars\./);
  assert.match(contexto, /Items: Pepperoni pizza, Soda\./);
  assert.match(contexto, /Total as printed: ₡7\.350,00\./);
  assert.match(contexto, /Currency: CRC \(Costa Rican colones\)\./);
  assert.match(contexto, /Total in US dollars: 14\.55, converted by Hyto at 505 CRC per US dollar\./);
  assert.match(contexto, /Purchase date: 2026-10-02 \(printed as 02\/10\/2026\)\./);
  assert.match(contexto, /Country: CR\./);
  assert.match(contexto, /Missing from the photo: none\./);
  assert.match(contexto, /Description: A printed Little Caesars receipt/);
});

test("una foto de trabajo no lleva líneas de recibo y una borrosa lo dice", () => {
  const trabajo = lectura({
    tipo: "trabajo",
    pais: null,
    moneda: null,
    monto_original: null,
    fecha: null,
    comercio: null,
    articulos: ["chairs", "stage"],
    legible: false,
    faltantes: ["the stage banner"],
    texto_completo: "A blurry photo of a conference room.",
  });
  const contexto = contextoParaLaya(trabajo);
  assert.equal(contexto.includes("Total as printed"), false);
  assert.match(contexto, /Evidence type: work, a place, or a scene the organizer asked to see\./);
  assert.match(contexto, /Readable photo: no, it is blurry, dark, or cut off\./);
  assert.match(contexto, /Visible objects: chairs, stage\./);
  assert.match(contexto, /Missing from the photo: the stage banner\./);
});

test("leerDescripcion lee la forma estructurada y deja la vieja como estaba", () => {
  const nueva = leerDescripcion(JSON.stringify(LITTLE_CAESARS));
  assert.equal(nueva?.texto, LITTLE_CAESARS.texto_completo);
  assert.equal(nueva?.monto, "14.55");
  assert.equal(nueva?.fecha, "2026-10-02");
  assert.equal(nueva?.lectura?.moneda, "CRC");
  const vieja = leerDescripcion('{"texto":"Little Caesars pizza","monto":"15.179,99","fecha":"02/10/2026"}');
  assert.deepEqual(vieja, { texto: "Little Caesars pizza", monto: null, fecha: null });
  assert.equal(leerDescripcion('{"texto_completo":"   ","texto":""}'), null);
});

test("el pedido a Qwen lleva la condición, las once claves y prohíbe adivinar dólares", async () => {
  const pedido = pedidoVision({ condicion: "Photo of the meal receipt", tipoTarea: "reembolso" });
  assert.match(pedido, /The organizer asked for: "Photo of the meal receipt"\./);
  assert.match(pedido, /reimbursement task/);
  assert.match(pedido, /tipo, pais, moneda, monto_original, monto_usd, fecha, comercio, articulos, texto_completo, legible, faltantes/);
  assert.match(pedido, /Never guess USD/);
  assert.match(pedido, /DD\/MM\/YYYY/);
  assert.equal(pedido.includes("one short sentence"), false);
  assert.equal(pedido.includes("in dollars (digits only"), false);

  let texto = "";
  let tokens = 0;
  const descripcion = await describirFoto(
    new Uint8Array([1, 2, 3]),
    "image/jpeg",
    "clave",
    async (_input, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as {
        max_completion_tokens: number;
        messages: { content: { type: string; text?: string }[] }[];
      };
      texto = cuerpo.messages[0]?.content.find((parte) => parte.type === "text")?.text ?? "";
      tokens = cuerpo.max_completion_tokens;
      return Response.json({ choices: [{ message: { content: JSON.stringify(LITTLE_CAESARS) } }] });
    },
    undefined,
    { condicion: "Photo of the meal receipt", tipoTarea: "reembolso" },
  );
  assert.match(texto, /Photo of the meal receipt/);
  assert.equal(tokens, 2048);
  assert.equal(descripcion.monto, "14.55");
});

test("la lectura se guarda detrás del snapshot y una fila vieja se lee igual", () => {
  const leida = lectura();
  const guardado = unirDescripcion(leida.textoCompleto, "c=otra", leida);
  assert.equal(guardado.indexOf(MARCA_RAZONES) < guardado.indexOf(MARCA_LECTURA), true);
  const separado = separarDescripcion(guardado);
  assert.equal(separado.texto, leida.textoCompleto);
  assert.equal(separado.detalle?.clase, "otra");
  assert.deepEqual(separado.lectura, leida);
  assert.equal(unirDescripcion(guardado, "c=otra", leida).split("@@hyto-lectura@@").length, 2);

  const sinDetalle = separarDescripcion(unirDescripcion(leida.textoCompleto, null, leida));
  assert.equal(sinDetalle.detalle, null);
  assert.equal(sinDetalle.lectura?.montoUsd, "14.55");

  const vieja = separarDescripcion(`Table set up.${MARCA_RAZONES}c=otra`);
  assert.equal(vieja.texto, "Table set up.");
  assert.equal(vieja.lectura, null);
  assert.equal(separarDescripcion(`Receipt.${MARCA_LECTURA}{roto`).lectura, null);
});
