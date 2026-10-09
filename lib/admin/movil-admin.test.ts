import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../../app/movil-admin.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
const bandeja = readFileSync(new URL("../../components/admin/Bandeja.tsx", import.meta.url), "utf8");
const revision = readFileSync(new URL("../../components/admin/Revision.tsx", import.meta.url), "utf8");

test("el CSS móvil cubre 360–430 y no toca landing ni motion", () => {
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /\.hyto-bandeja/);
  assert.match(css, /\.hyto-revision/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /min-height:\s*52px/);
  assert.equal(css.includes("landing/"), false);
  assert.equal(css.includes("motion/"), false);
  assert.equal(css.includes("plata"), false);
});

test("la bandeja y la revisión marcan su raíz, y el layout carga el CSS", () => {
  assert.match(layout, /movil-admin\.css/);
  assert.match(bandeja, /hyto-bandeja/);
  assert.match(revision, /hyto-revision/);
});
