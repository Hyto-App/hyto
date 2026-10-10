/**
 * Mounts the same iframe and IntersectionObserver options as `@cavos/kit` 0.2.5
 * `guard()` (`dist/vault/index.mjs`): `{ threshold: [0], trackVisibility: true, delay: 100 }`
 * on a card inside an opaque-origin iframe. Chrome reports `isVisible` false when a control
 * covers the iframe, when a modal dialog is open, or when html has opacity, a transform,
 * a filter, or will-change.
 *
 * The harness, not the gate, is what used to fail on a busy runner. Chrome sometimes took
 * longer than 8s to open the DevTools port (`fetch failed`), and `fs.rm` of the profile
 * sometimes threw `ENOTEMPTY` because a child kept writing `Default/` after the parent
 * was killed. Launch is retried once, the whole process group is killed, and the profile
 * delete is retried while those codes last.
 */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const CHROME = ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/local/bin/google-chrome"].find((ruta) => existsSync(ruta));

const PAGINA = `<!DOCTYPE html>
<meta charset="utf-8">
<pre id="result">pending</pre>
<iframe id="vault" sandbox="allow-scripts" style="position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647;background:transparent" srcdoc="<!doctype html><meta charset=utf-8><body style=margin:0><div id=card style='width:280px;height:160px;margin:100px auto;background:#fff'>Approve</div><script>
const card = document.getElementById('card');
const can = 'isVisible' in IntersectionObserverEntry.prototype;
const obs = new IntersectionObserver((entries) => {
  parent.postMessage({ type: 's', vis: entries[0].isVisible === true }, '*');
}, { threshold: [0], trackVisibility: true, delay: 100 });
obs.observe(card);
parent.postMessage({ type: 'ready', can }, '*');
</script>"></iframe>
<script>
const phases = [];
let buf = [];
let ready = false;
let can = false;
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'ready') { ready = true; can = !!e.data.can; }
  if (e.data && e.data.type === 's') buf.push(e.data.vis);
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function fase(name, setup) {
  buf = [];
  await setup();
  await wait(400);
  phases.push({ name, anyTrue: buf.includes(true), anyFalse: buf.includes(false), n: buf.length });
}
(async () => {
  for (let i = 0; i < 40 && !ready; i++) await wait(50);
  await wait(400);
  phases.push({ name: 'clean', anyTrue: buf.includes(true), anyFalse: buf.includes(false), n: buf.length });
  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#fff';
  await fase('cancel', async () => { document.body.append(cancel); });
  await fase('cancel-gone', async () => { cancel.remove(); });
  const dialog = document.createElement('dialog');
  dialog.textContent = 'Lock this task budget';
  dialog.style.cssText = 'margin:auto 0 0';
  document.body.append(dialog);
  await fase('modal', async () => { dialog.showModal(); });
  await fase('modal-gone', async () => { dialog.close(); dialog.remove(); });
  await fase('opacity', async () => { document.documentElement.style.opacity = '0.99'; });
  await fase('opacity-reset', async () => { document.documentElement.style.opacity = '1'; });
  await fase('transform', async () => { document.documentElement.style.transform = 'translateZ(0)'; });
  await fase('transform-reset', async () => { document.documentElement.style.transform = 'none'; });
  await fase('filter', async () => { document.documentElement.style.filter = 'blur(0px)'; });
  await fase('filter-reset', async () => { document.documentElement.style.filter = 'none'; });
  await fase('will-change', async () => { document.documentElement.style.willChange = 'transform'; });
  await fase('will-reset', async () => { document.documentElement.style.willChange = 'auto'; });
  document.getElementById('result').textContent = JSON.stringify({ ready, can, phases });
})();
</script>`;

type Fase = { name: string; anyTrue: boolean; anyFalse: boolean; n: number };
type Resultado = { ready: boolean; can: boolean; phases: Fase[] };

const ARGUMENTOS_CHROME = [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-breakpad",
  "--disable-crash-reporter",
  "--no-first-run",
  "--disable-background-networking",
  "--disable-sync",
  "--remote-allow-origins=*",
  "--window-size=1280,800",
];

test("the Cavos visibility gate stays shut while Hyto covers the iframe or paints an effect on html", { skip: CHROME ? false : "Chrome is not installed", timeout: 90_000 }, async () => {
  const directorio = await mkdtemp(join(tmpdir(), "hyto-vis-"));
  const archivo = join(directorio, "index.html");
  await writeFile(archivo, PAGINA);
  try {
    const resultado = await medirVisibilidad(directorio, archivo);
    assert.equal(resultado.ready, true);
    assert.equal(resultado.can, true);
    const fase = (nombre: string) => {
      const hallada = resultado.phases.find((item) => item.name === nombre);
      assert.ok(hallada, nombre);
      return hallada;
    };
    for (const nombre of ["clean", "cancel-gone", "modal-gone", "opacity-reset", "transform-reset", "filter-reset", "will-reset"]) {
      assert.equal(fase(nombre).anyTrue, true, nombre);
    }
    for (const nombre of ["cancel", "modal", "opacity", "transform", "filter", "will-change"]) {
      assert.equal(fase(nombre).anyTrue, false, `${nombre} still reported visible: ${JSON.stringify(fase(nombre))}`);
      assert.equal(fase(nombre).anyFalse, true, nombre);
    }
  } finally {
    await borrarDirectorio(directorio);
  }
});

async function medirVisibilidad(directorio: string, archivo: string): Promise<Resultado> {
  let ultimo = "Chrome did not open a DevTools port.";
  for (let intento = 0; intento < 2; intento++) {
    const puerto = 9300 + Math.floor(Math.random() * 500);
    const errores = join(directorio, `chrome-${intento}.err`);
    const descriptor = openSync(errores, "w");
    const proceso = spawn(
      CHROME!,
      [
        ...ARGUMENTOS_CHROME,
        `--remote-debugging-port=${puerto}`,
        `--user-data-dir=${join(directorio, `perfil-${intento}`)}`,
        "about:blank",
      ],
      { detached: true, stdio: ["ignore", "ignore", descriptor] },
    );
    closeSync(descriptor);
    try {
      await esperarPuerto(puerto, proceso, errores);
      const abierta = await fetch(`http://127.0.0.1:${puerto}/json/new?file://${archivo}`, { method: "PUT" });
      if (!abierta.ok) throw new Error(`DevTools /json/new answered ${abierta.status}.`);
      const pagina = (await abierta.json()) as { webSocketDebuggerUrl?: string };
      if (!pagina.webSocketDebuggerUrl) throw new Error("DevTools did not return a page socket.");
      return await leerResultado(pagina.webSocketDebuggerUrl);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      const detalle = cola(errores);
      ultimo = detalle ? `${mensaje} ${detalle}` : mensaje;
    } finally {
      await cerrarChrome(proceso);
    }
  }
  throw new Error(ultimo);
}

async function esperarPuerto(puerto: number, proceso: ChildProcess, errores: string): Promise<void> {
  const limite = Date.now() + 20_000;
  let ultimo = "Chrome did not open a DevTools port.";
  while (Date.now() < limite) {
    if (proceso.exitCode !== null || proceso.signalCode) {
      throw new Error(`Chrome exited (${proceso.exitCode ?? proceso.signalCode}) before DevTools. ${cola(errores)}`.trim());
    }
    try {
      const respuesta = await fetch(`http://127.0.0.1:${puerto}/json/version`);
      if (respuesta.ok) return;
      ultimo = `DevTools answered ${respuesta.status}.`;
    } catch (error) {
      ultimo = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolver) => setTimeout(resolver, 100));
  }
  throw new Error(`${ultimo} ${cola(errores)}`.trim());
}

async function leerResultado(url: string): Promise<Resultado> {
  const ws = new WebSocket(url);
  let id = 0;
  const pendientes = new Map<number, { resolver: (valor: unknown) => void; rechazar: (error: Error) => void }>();
  const enviar = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<unknown>((resolver, rechazar) => {
      const msgId = ++id;
      pendientes.set(msgId, { resolver, rechazar });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  ws.addEventListener("message", (evento) => {
    const mensaje = JSON.parse(String(evento.data)) as { id?: number; result?: unknown; error?: { message: string } };
    if (!mensaje.id || !pendientes.has(mensaje.id)) return;
    const pendiente = pendientes.get(mensaje.id)!;
    pendientes.delete(mensaje.id);
    if (mensaje.error) pendiente.rechazar(new Error(mensaje.error.message));
    else pendiente.resolver(mensaje.result);
  });
  await new Promise<void>((resolver, rechazar) => {
    ws.addEventListener("open", () => resolver(), { once: true });
    ws.addEventListener("error", () => rechazar(new Error("DevTools socket failed.")), { once: true });
  });
  try {
    await enviar("Runtime.enable");
    const limite = Date.now() + 20_000;
    let texto = "pending";
    while (Date.now() < limite) {
      const resultado = (await enviar("Runtime.evaluate", {
        expression: "document.getElementById('result').textContent",
        returnByValue: true,
      })) as { result?: { value?: string } };
      texto = resultado.result?.value ?? "pending";
      if (texto !== "pending") return JSON.parse(texto) as Resultado;
      await new Promise((resolver) => setTimeout(resolver, 150));
    }
    throw new Error(`Visibility page did not finish: ${texto}`);
  } finally {
    ws.close();
  }
}

async function cerrarChrome(proceso: ChildProcess): Promise<void> {
  const pid = proceso.pid;
  if (pid) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        proceso.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }
  }
  if (proceso.exitCode === null && !proceso.signalCode) {
    await new Promise<void>((resolver) => {
      const espera = setTimeout(resolver, 2_000);
      proceso.once("exit", () => {
        clearTimeout(espera);
        resolver();
      });
    });
  }
}

async function borrarDirectorio(directorio: string): Promise<void> {
  let ultimo: unknown;
  for (let intento = 0; intento < 8; intento++) {
    try {
      await rm(directorio, { recursive: true, force: true });
      return;
    } catch (error) {
      ultimo = error;
      if (!["ENOTEMPTY", "EBUSY", "EPERM", "EACCES"].includes(codigoDe(error))) throw error;
      await new Promise((resolver) => setTimeout(resolver, 80 * (intento + 1)));
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error("Could not remove the Chrome profile.");
}

function codigoDe(error: unknown): string {
  return error && typeof error === "object" && "code" in error ? String(error.code) : "";
}

function cola(archivo: string): string {
  try {
    const texto = readFileSync(archivo, "utf8").trim().replace(/\s+/g, " ");
    return texto.slice(-400);
  } catch {
    return "";
  }
}
