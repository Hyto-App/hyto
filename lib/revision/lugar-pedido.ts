/**
 * Tasks have no place column. Mile still asks t8: whether the written
 * description says the work was done at the place the organizer asked for.
 * When this returns false, t8 is neutral (full credit, no `wrong_place` tag)
 * so the work weights still sum to 100.
 *
 * `decidirTrabajo` only hard-rejects a different place when the description
 * already named one (`datos.place`). That is not "did the condition ask for
 * a place", so it is not reused here. The condition text is the only signal.
 *
 * A condition asks for a place when, after lowercasing, stripping accents,
 * and collapsing spaces, it contains one of these markers as a whole word.
 * Plurals are included. If none of them appear, it does not ask for a place.
 *
 *   lugar, sitio, parque, escuela, playa, calle, direccion,
 *   place, location, park, school, beach, street, address,
 *   "en el", "en la", "en los", "en las", "at the"
 *
 * "en el", "en la", and "at the" count on their own, even when the next word
 * is not a venue. "Hacer un ensayo" does not ask for a place.
 * "Pintar el mural en el parque" does.
 */
const PALABRAS = [
  "lugar(?:es)?",
  "sitios?",
  "parques?",
  "escuelas?",
  "playas?",
  "calles?",
  "direccion(?:es)?",
  "places?",
  "locations?",
  "parks?",
  "schools?",
  "beach(?:es)?",
  "streets?",
  "address(?:es)?",
];

const FRASES = ["en el", "en la", "en los", "en las", "at the"];

const PIDE_LUGAR = new RegExp(`\\b(?:${[...FRASES, ...PALABRAS].join("|")})\\b`, "i");

export function condicionPideLugar(condicion: string | null | undefined): boolean {
  const plano = (condicion ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!plano.trim()) return false;
  return PIDE_LUGAR.test(plano);
}
