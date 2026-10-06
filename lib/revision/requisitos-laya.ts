import { claveDeLaya } from "@/lib/config/entorno";
import { falloDeExcepcion, falloHttp, FalloRevision } from "./fallo";
import { cuerpoLaya, type PreguntaScore } from "./laya-preguntas";
import { leerIndice, urlLaya } from "./laya";
import { estadoDeNivel, type EstadoRequisito, type RequisitoTarea } from "./requisitos";

/**
 * One Laya score question per stored requirement.
 * Index 0 is missing, 1 is partial, 2 is present. The live 11 questions stay for an empty list.
 */
export function preguntasDeRequisitos(requisitos: RequisitoTarea[]): Record<string, PreguntaScore> {
  const preguntas: Record<string, PreguntaScore> = {};
  requisitos.forEach((requisito, indice) => {
    const pedido = requisito.texto.trim();
    preguntas[`r${indice}`] = {
      type: "score",
      instructions: `The organizer required this in the photo: ${pedido}. How fully does the written description show it? Use only what the description states.`,
      criteria: [
        "It is missing. The description does not show this requirement.",
        "It is only partly there. The description shows some of it and leaves some out.",
        "It is there. The description shows this requirement.",
      ],
    };
  });
  return preguntas;
}

export function nivelesDeRequisitos(json: unknown, cantidad: number): Array<0 | 1 | 2 | null> | null {
  if (cantidad < 1) return null;
  const niveles: Array<0 | 1 | 2 | null> = [];
  for (let indice = 0; indice < cantidad; indice += 1) {
    niveles.push(leerIndice(json, `r${indice}`));
  }
  if (niveles.some((nivel) => nivel === null)) return null;
  return niveles;
}

export function estadosDeNiveles(niveles: ReadonlyArray<0 | 1 | 2>): EstadoRequisito[] {
  return niveles.map((nivel) => estadoDeNivel(nivel));
}

export async function preguntarRequisitos(
  base: string,
  texto: string,
  requisitos: RequisitoTarea[],
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<Array<0 | 1 | 2> | null> {
  const clave = claveDeLaya();
  if (!base.trim() || requisitos.length === 0) return null;
  const condicion = requisitos.map((requisito) => requisito.texto).join("\n");
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(urlLaya(base), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(clave ? { authorization: `Bearer ${clave}` } : {}),
      },
      body: JSON.stringify(cuerpoLaya(texto, condicion, preguntasDeRequisitos(requisitos))),
      signal,
    });
  } catch (error) {
    throw falloDeExcepcion(error, "laya", clave);
  }
  if (!respuesta.ok) throw await falloHttp(respuesta, "laya", clave);
  let json: unknown;
  try {
    json = await respuesta.json();
  } catch {
    throw new FalloRevision("respuesta", { fuente: "laya", status: respuesta.status, providerMessage: "json", secreto: clave });
  }
  const niveles = nivelesDeRequisitos(json, requisitos.length);
  if (!niveles) return null;
  return niveles.map((nivel) => nivel as 0 | 1 | 2);
}
