import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const LIB = fileURLToPath(new URL("..", import.meta.url));

const KEYS = new Set(["aviso", "mensaje", "detail"]);

// Common Spanish words that do not appear as whole words in the English copy.
// "no" is omitted: English messages say "has no amount".
const WORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "este", "esta", "ese", "esa", "estos", "estas", "esos", "esas",
  "de", "del", "al", "en", "con", "por", "para", "sin", "sobre",
  "y", "o", "que", "porque", "pero", "si",
  "es", "son", "esta", "estan", "está", "están",
  "se", "lo", "le", "les", "su", "sus",
  "falta", "faltan", "tiene", "tienen", "hace", "hay", "puede", "pueden",
  "ser", "trae", "traen", "sumar", "suma", "pudo", "guardar",
  "cuenta", "cuentas", "contrato", "contratos", "hito", "hitos",
  "servidor", "solicitud", "disputa", "disputas", "reparto",
  "monto", "montos", "clave", "claves", "quien",
  "distinta", "distintas", "distinto", "distintos",
  "plataforma", "autorizo", "autorizó", "rechazo", "rechazó",
  "firma", "firmar", "otro", "otra", "otros", "otras",
  "nuevo", "nueva", "guardado", "paso",
]);

const ACCENTS = /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/u;

type Hit = { text: string; line: number };

export function messageTexts(source: string): Hit[] {
  const hits: Hit[] = [];
  let index = 0;
  let line = 1;
  let readingValue = false;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (!readingValue) {
      if (char === "/" && next === "/") {
        while (index < source.length && source[index] !== "\n") index += 1;
        continue;
      }
      if (char === "/" && next === "*") {
        index += 2;
        while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
          if (source[index] === "\n") line += 1;
          index += 1;
        }
        index += 2;
        continue;
      }
      if (char === "'" || char === '"' || char === "`") {
        const literal = readString(source, index);
        index = literal.end;
        line += literal.newlines;
        continue;
      }
      if (isIdent(char)) {
        const start = index;
        while (index < source.length && isIdent(source[index])) index += 1;
        const word = source.slice(start, index);
        let cursor = index;
        let newlines = 0;
        while (cursor < source.length && /\s/.test(source[cursor])) {
          if (source[cursor] === "\n") newlines += 1;
          cursor += 1;
        }
        if (KEYS.has(word) && source[cursor] === ":") {
          line += newlines;
          index = cursor + 1;
          readingValue = true;
          parenDepth = 0;
          braceDepth = 0;
          bracketDepth = 0;
        }
        continue;
      }
      if (char === "\n") line += 1;
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      const literal = readString(source, index);
      hits.push({ text: literal.text, line });
      index = literal.end;
      line += literal.newlines;
      continue;
    }
    if (char === "(") parenDepth += 1;
    else if (char === ")") {
      if (parenDepth === 0) {
        readingValue = false;
        continue;
      }
      parenDepth -= 1;
    } else if (char === "{") braceDepth += 1;
    else if (char === "}") {
      if (braceDepth === 0) {
        readingValue = false;
        continue;
      }
      braceDepth -= 1;
    } else if (char === "[") bracketDepth += 1;
    else if (char === "]") {
      if (bracketDepth === 0) {
        readingValue = false;
        continue;
      }
      bracketDepth -= 1;
    } else if ((char === "," || char === ";") && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
      readingValue = false;
      index += 1;
      continue;
    }
    if (char === "\n") line += 1;
    index += 1;
  }
  return hits;
}

export function spanishReason(text: string): string | null {
  const plain = staticText(text);
  const accent = plain.match(ACCENTS);
  if (accent) return `accented character "${accent[0]}"`;
  const words = plain.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];
  const found = words.find((word) => WORDS.has(word));
  return found ? `Spanish word "${found}"` : null;
}

function staticText(text: string): string {
  let output = "";
  let index = 0;
  while (index < text.length) {
    if (text[index] === "$" && text[index + 1] === "{") {
      let depth = 1;
      index += 2;
      while (index < text.length && depth > 0) {
        if (text[index] === "{") depth += 1;
        else if (text[index] === "}") depth -= 1;
        index += 1;
      }
      output += " ";
      continue;
    }
    output += text[index];
    index += 1;
  }
  return output;
}

function readString(source: string, start: number): { text: string; end: number; newlines: number } {
  const quote = source[start];
  let index = start + 1;
  let text = "";
  let newlines = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      const escaped = source[index + 1];
      if (escaped === "\n") newlines += 1;
      text += escaped ?? "";
      index += escaped ? 2 : 1;
      continue;
    }
    if (char === "\n") newlines += 1;
    if (char === quote) return { text, end: index + 1, newlines };
    text += char;
    index += 1;
  }
  return { text, end: index, newlines };
}

function isIdent(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_$]/.test(char);
}

function libFiles(): string[] {
  const found: string[] = [];
  const stack = [LIB];
  while (stack.length > 0) {
    const directory = stack.pop();
    if (!directory) break;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) found.push(path);
    }
  }
  return found;
}

test("a newly added Spanish aviso, mensaje, or detail fails the guard", () => {
  assert.notEqual(spanishReason("Faltan el contrato y la cuenta que firma."), null);
  assert.notEqual(spanishReason("Trustless Work rechazó la solicitud."), null);
  assert.notEqual(spanishReason("Ese hito no está en disputa."), null);
  assert.equal(spanishReason("The contract and the signing account are missing."), null);
  assert.equal(spanishReason("Trustless Work rejected the request."), null);
  assert.equal(spanishReason("Missing ${nombre} on the server. It is ${rol} and cannot repeat another role."), null);

  const unaccented = messageTexts(`export const x = { aviso: "Faltan el contrato y la cuenta que firma." };`);
  assert.equal(unaccented.length, 1);
  assert.notEqual(spanishReason(unaccented[0]?.text ?? ""), null);

  const accented = messageTexts(`const y = { mensaje: "Ese hito no está en disputa." };`);
  assert.notEqual(spanishReason(accented[0]?.text ?? ""), null);

  const detail = messageTexts(`return { detail: detail ?? "Trustless Work rechazó la solicitud.", codigo };`);
  assert.notEqual(spanishReason(detail[0]?.text ?? ""), null);

  const comment = messageTexts(`// aviso: "Faltan el contrato"\nexport const z = { aviso: "The contract is missing." };`);
  assert.equal(comment.some((item) => spanishReason(item.text)), false);

  const block = messageTexts(`/* mensaje: "Ese hito no está en disputa." */\nconst w = { mensaje: "That milestone is not in dispute." };`);
  assert.equal(block.some((item) => spanishReason(item.text)), false);

  const ternary = messageTexts('const t = { mensaje: ready ? `Falta en el servidor` : "The account is ready." };');
  assert.equal(ternary.filter((item) => spanishReason(item.text)).length, 1);
});

test("aviso, mensaje, and detail strings under lib/ are English", () => {
  const failures: string[] = [];
  for (const file of libFiles()) {
    const source = readFileSync(file, "utf8");
    for (const item of messageTexts(source)) {
      const reason = spanishReason(item.text);
      if (!reason) continue;
      failures.push(`${relative(LIB, file)}:${item.line} (${reason}): ${item.text}`);
    }
  }
  assert.deepEqual(failures, []);
});
