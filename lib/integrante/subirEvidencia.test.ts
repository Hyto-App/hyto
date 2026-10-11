import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { jpegDePrueba } from "../evidencia/muestras";
import { tareasEjemplo } from "../integrante/ejemplos";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

if (typeof URL.createObjectURL !== "function") {
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: () => "blob:foto" });
}
if (typeof URL.revokeObjectURL !== "function") {
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: () => undefined });
}

function definirCamara(getUserMedia: ((restricciones?: unknown) => Promise<MediaStream>) | undefined) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: getUserMedia ? { getUserMedia } : undefined,
  });
}

async function montarTarea({ demo = false }: { demo?: boolean } = {}) {
  const fetchPrevio = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      const stand = tareasEjemplo().find((tarea) => tarea.id === "stand");
      return new Response(JSON.stringify({ tareas: stand ? [stand] : [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error("offline");
  };
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: demo,
        rol: demo ? "voluntario" : null,
        children: createElement(SubirEvidencia, { tareaId: "stand" }),
      }),
    );
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
  } finally {
    globalThis.fetch = fetchPrevio;
  }
}

/** The `capture` fallback for a browser without getUserMedia. */
function inputArchivo(): HTMLInputElement {
  const input = document.querySelector('input[type="file"][capture]');
  if (!(input instanceof HTMLInputElement)) throw new Error("Sin input de captura.");
  return input;
}

function boton(etiqueta: string): HTMLButtonElement {
  const encontrado = [...document.querySelectorAll("button")].find((item) => item.textContent === etiqueta);
  if (!(encontrado instanceof HTMLButtonElement)) throw new Error(`Sin botón ${etiqueta}.`);
  return encontrado;
}

async function elegir(archivo: File) {
  const input = inputArchivo();
  Object.defineProperty(input, "files", {
    configurable: true,
    value: { 0: archivo, length: 1, item: () => archivo },
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolver) => setTimeout(resolver, 40));
  });
}

async function jpegReciente(): Promise<File> {
  return new File([await jpegDePrueba()], "ahora.jpg", { type: "image/jpeg", lastModified: Date.now() });
}

test("Tomar foto abre la cámara en vivo y Subir archivo es un selector sin capture", async () => {
  limpiarPantalla();
  const pedidos: unknown[] = [];
  let clicks = 0;
  const clickPrevio = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function click() {
    clicks += 1;
    return clickPrevio.apply(this);
  };
  const media = document.defaultView!.HTMLMediaElement.prototype;
  const srcPrevio = Object.getOwnPropertyDescriptor(media, "srcObject");
  const playPrevio = media.play;
  Object.defineProperty(media, "srcObject", {
    configurable: true,
    enumerable: true,
    get() {
      return null;
    },
    set() {},
  });
  media.play = function play() {
    return Promise.resolve();
  };
  definirCamara(async (restricciones) => {
    pedidos.push(restricciones);
    return { getTracks: () => [{ stop() {} }] } as MediaStream;
  });
  try {
    await montarTarea();
    assert.match(texto(), /Take photo/);
    assert.match(texto(), /Upload file/);
    assert.match(texto(), /Drag your evidence here or choose a file/);
    assert.match(texto(), /Photo, invoice, PDF, or list/);
    assert.match(texto(), /Send one piece of evidence/);
    assert.match(texto(), /Your evidence must show/);
    assert.doesNotMatch(texto(), /gallery/i);
    assert.doesNotMatch(texto(), /Receipt|What you are sending/);
    assert.equal(document.querySelector('[role="tablist"]'), null);
    const lima = boton("Take photo");
    assert.match(lima.className, /hyto-btn-grande/);
    assert.match(boton("Upload file").className, /hyto-evid-contorno/);
    assert.ok(document.querySelector(".hyto-evid-soltar"));
    const selector = inputSelector();
    assert.equal(selector.getAttribute("capture"), null);
    assert.match(selector.accept, /application\/pdf/);
    assert.match(selector.accept, /image\/png/);
    assert.match(selector.accept, /text\/plain/);
    assert.match(selector.accept, /text\/html/);
    assert.equal(document.querySelector("input[capture]"), null);
    await act(async () => {
      lima.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(clicks, 0);
    assert.equal(pedidos.length, 1);
    assert.deepEqual(pedidos[0], { audio: false, video: { facingMode: { ideal: "environment" } } });
    assert.equal(document.querySelector('video[aria-label="Camera preview"]')?.tagName, "VIDEO");
    assert.equal(boton("Take photo").textContent, "Take photo");
  } finally {
    if (srcPrevio) Object.defineProperty(media, "srcObject", srcPrevio);
    media.play = playPrevio;
    HTMLInputElement.prototype.click = clickPrevio;
    await desmontar();
    limpiarPantalla();
  }
});

test("Subir archivo abre el selector y la zona resalta al arrastrar", async () => {
  limpiarPantalla();
  let clicks = 0;
  const clickPrevio = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function click() {
    clicks += 1;
  };
  definirCamara(async () => ({ getTracks: () => [{ stop() {} }] }) as unknown as MediaStream);
  try {
    await montarTarea();
    await act(async () => {
      boton("Upload file").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(clicks, 1);
    const zona = document.querySelector(".hyto-evid-soltar");
    assert.ok(zona instanceof HTMLElement);
    await act(async () => {
      zona.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(clicks, 2);
    await act(async () => {
      zona.dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));
    });
    assert.match(document.querySelector(".hyto-evid-soltar")?.className ?? "", /is-encima/);
    await act(async () => {
      zona.dispatchEvent(new Event("dragleave", { bubbles: true }));
    });
    assert.doesNotMatch(document.querySelector(".hyto-evid-soltar")?.className ?? "", /is-encima/);
  } finally {
    HTMLInputElement.prototype.click = clickPrevio;
    await desmontar();
    limpiarPantalla();
  }
});

test("si la cámara falla, Subir archivo sigue disponible", async () => {
  limpiarPantalla();
  definirCamara(async () => {
    throw new Error("denied");
  });
  try {
    await montarTarea();
    await act(async () => {
      boton("Take photo").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.match(texto(), /Allow the camera and try again/);
    assert.equal(boton("Take photo").disabled, false);
    assert.equal(boton("Upload file").disabled, false);
    assert.ok(inputSelector());
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("sin getUserMedia, la captura abre el input con capture y un archivo viejo pasa como archivo", async () => {
  limpiarPantalla();
  definirCamara(undefined);
  let clicks = 0;
  const clickPrevio = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function click() {
    clicks += 1;
    return clickPrevio.apply(this);
  };
  try {
    await montarTarea();
    const input = inputArchivo();
    assert.equal(input.getAttribute("capture"), "environment");
    assert.equal(input.getAttribute("accept"), "image/jpeg");
    await act(async () => {
      boton("Take photo").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(clicks, 1);

    await elegir(new File([Uint8Array.from([1, 2, 3])], "ahora.png", { type: "image/png", lastModified: Date.now() }));
    assert.match(texto(), /not a real JPEG, PNG, WebP, PDF, or text file/);
    assert.doesNotMatch(texto(), /gallery/i);
    assert.equal(document.querySelector('img[alt="Evidence"]'), null);

    const vieja = new File([await jpegDePrueba()], "vieja.jpg", { type: "image/jpeg", lastModified: Date.now() - 60 * 60 * 1000 });
    await elegir(vieja);
    assert.ok(document.querySelector('img[alt="Evidence"]'));
    assert.equal(boton("Send evidence").textContent, "Send evidence");
    assert.equal(boton("Choose another file").textContent, "Choose another file");

    await act(async () => {
      boton("Choose another file").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await elegir(await jpegReciente());
    assert.ok(document.querySelector('img[alt="Evidence"]'));
    assert.equal(boton("Take another").textContent, "Take another");
  } finally {
    HTMLInputElement.prototype.click = clickPrevio;
    await desmontar();
    limpiarPantalla();
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const standRemoto = {
  id: "stand",
  titulo: "Set up the stand",
  tipo: "trabajo",
  monto: "20",
  condicion: "The stand is up",
  miembroId: "voluntario-1",
  estado: "pendiente",
  proyectoId: "zeek",
};

type Respuestas = { token?: () => Response; subida: (init?: RequestInit) => Response; tareas?: () => Response };

async function enviarCaptura(respuestas: Respuestas): Promise<string[]> {
  const pedidos: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    pedidos.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("/api/tareas")) return respuestas.tareas ? respuestas.tareas() : json({ tareas: [standRemoto] });
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    if (url.endsWith("/api/evidencias/token")) return respuestas.token ? respuestas.token() : json({ token: "t-1" });
    if (url.endsWith("/api/evidencias") && init?.method === "POST") return respuestas.subida(init);
    if (url.includes("/api/evidencias/")) return json({ id: "ev-1", tareaId: "stand", blobId: "blob-1" });
    return json({}, 404);
  };
  await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 30));
  });
  await elegir(await jpegReciente());
  assert.ok(document.querySelector('img[alt="Evidence"]'));
  await act(async () => {
    boton("Send evidence").dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 30));
  });
  return pedidos;
}

function sinRevisionLocal() {
  assert.doesNotMatch(JSON.stringify({ ...window.localStorage }), /en revisión/);
}

test("una foto de cámara que el servidor rechaza no dice Your evidence arrived", async () => {
  limpiarPantalla();
  definirCamara(undefined);
  const original = globalThis.fetch;
  const aviso = "Evidence checks need migration 0005_evidencia_antifraude.sql before new files can be saved.";
  try {
    const pedidos = await enviarCaptura({ subida: () => json({ aviso }, 503) });
    assert.ok(pedidos.includes("POST /api/evidencias"));
    assert.doesNotMatch(texto(), /Your evidence arrived/);
    assert.ok(document.querySelector('[role="alert"]')?.textContent?.includes("Photo checks are not ready on the server yet."));
    assert.equal(boton("Send evidence").textContent, "Send evidence");
    sinRevisionLocal();
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("si la red cae al subir la foto de cámara, no hay envío de ejemplo", async () => {
  limpiarPantalla();
  definirCamara(undefined);
  const original = globalThis.fetch;
  try {
    await enviarCaptura({
      subida: () => {
        throw new Error("offline");
      },
    });
    assert.doesNotMatch(texto(), /Your evidence arrived/);
    assert.match(texto(), /Check your connection and try again/);
    sinRevisionLocal();
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("si la conexión se corta después de guardar la foto, la pantalla dice Sent y no muestra error", async () => {
  limpiarPantalla();
  definirCamara(undefined);
  const original = globalThis.fetch;
  let guardada = false;
  try {
    const pedidos = await enviarCaptura({
      subida: () => {
        guardada = true;
        throw new TypeError("Failed to fetch");
      },
      tareas: () => json({ tareas: [{ ...standRemoto, estado: guardada ? "en revisión" : "pendiente" }] }),
    });
    assert.ok(pedidos.includes("POST /api/evidencias"));
    assert.match(texto(), /Sent/);
    assert.doesNotMatch(texto(), /Check your connection/);
    assert.equal(document.querySelector('[role="alert"]'), null);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("si el token de captura falla, se ve el aviso del servidor y no se sube nada", async () => {
  limpiarPantalla();
  definirCamara(undefined);
  const original = globalThis.fetch;
  const aviso = "Evidence uploads are paused. Try again later.";
  try {
    const pedidos = await enviarCaptura({ token: () => json({ aviso }, 503), subida: () => json({}, 500) });
    assert.ok(!pedidos.includes("POST /api/evidencias"));
    assert.doesNotMatch(texto(), /Your evidence arrived/);
    assert.ok(document.querySelector('[role="alert"]')?.textContent?.includes(aviso));
    sinRevisionLocal();
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("una foto de cámara con 201 y aviso de cobro pide acción", async () => {
  limpiarPantalla();
  definirCamara(undefined);
  const original = globalThis.fetch;
  const aviso = "This sign-in has no payout account. Sign in again and open the task so we know where to pay.";
  try {
    await enviarCaptura({ subida: () => json({ evidencia: { id: "ev-1", tareaId: "stand", blobId: "blob-1" }, aviso }, 201) });
    assert.match(texto(), /Evidence sent, action needed/);
    assert.doesNotMatch(texto(), /Your evidence arrived/);
    assert.ok(document.querySelector('[role="alert"]')?.textContent?.includes(aviso));
    sinRevisionLocal();
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("una foto de cámara con 201 limpio dice Your evidence arrived y manda el token y la hora de captura", async () => {
  limpiarPantalla();
  definirCamara(undefined);
  const original = globalThis.fetch;
  let cuerpo: FormData | null = null;
  try {
    await enviarCaptura({
      subida: (init) => {
        cuerpo = init?.body instanceof FormData ? init.body : null;
        return json({ evidencia: { id: "ev-1", tareaId: "stand", blobId: "blob-1" } }, 201);
      },
    });
    const enviado = cuerpo as FormData | null;
    assert.equal(enviado?.get("token"), "t-1");
    assert.ok(!Number.isNaN(Date.parse(String(enviado?.get("capturadaEn")))));
    assert.match(texto(), /Your evidence arrived/);
    assert.doesNotMatch(texto(), /action needed/);
    assert.match(texto(), /as soon as the organizer approves it/);
    assert.match(texto(), /What happens now/);
    sinRevisionLocal();
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

function inputSelector(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]:not([capture])');
  if (!(input instanceof HTMLInputElement)) throw new Error("Sin selector de archivo.");
  return input;
}

async function elegirEnSelector(archivo: File) {
  const input = inputSelector();
  Object.defineProperty(input, "files", {
    configurable: true,
    value: { 0: archivo, length: 1, item: () => archivo },
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolver) => setTimeout(resolver, 40));
  });
}

test("fuera del demo, una foto vieja de la galería entra por Subir archivo", async () => {
  limpiarPantalla();
  definirCamara(async () => ({ getTracks: () => [{ stop() {} }] }) as unknown as MediaStream);
  try {
    await montarTarea();
    const vieja = new File([await jpegDePrueba()], "vieja.jpg", { type: "image/jpeg", lastModified: Date.now() - 24 * 60 * 60 * 1000 });
    await elegirEnSelector(vieja);
    assert.ok(document.querySelector('img[alt="Evidence"]'));
    assert.equal(boton("Send evidence").disabled, false);
    assert.equal(boton("Choose another file").textContent, "Choose another file");
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("un archivo que no es foto ni documento se rechaza con el aviso de archivo y Enviar queda apagado", async () => {
  limpiarPantalla();
  definirCamara(async () => ({ getTracks: () => [{ stop() {} }] }) as unknown as MediaStream);
  try {
    await montarTarea();
    await elegirEnSelector(new File([Uint8Array.from([1, 2, 3])], "nota.png", { type: "image/png", lastModified: Date.now() }));
    assert.match(texto(), /not a real JPEG, PNG, WebP, PDF, or text file/);
    assert.equal(document.querySelector('img[alt="Evidence"]'), null);
    assert.equal(boton("Send evidence").disabled, true);

    await elegirEnSelector(new File([Uint8Array.from([0x4d, 0x5a, 0x90, 0])], "programa.exe", { type: "application/x-msdownload" }));
    assert.match(texto(), /Choose a PDF, HTML, text, JPEG, PNG, or WebP file/);
    assert.equal(boton("Send evidence").disabled, true);

    await elegirEnSelector(new File(["- Banner\n- Mesa\n"], "lista.txt", { type: "text/plain" }));
    assert.match(texto(), /lista\.txt/);
    assert.equal(boton("Send evidence").disabled, false);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

for (const demo of [false, true]) {
  test(`${demo ? "en modo demo" : "fuera del demo"} un archivo elegido se envía sin token de cámara y con origen archivo`, async () => {
    limpiarPantalla();
    definirCamara(async () => ({ getTracks: () => [{ stop() {} }] }) as unknown as MediaStream);
    const original = globalThis.fetch;
    const pedidos: string[] = [];
    let cuerpo: FormData | null = null;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      pedidos.push(`${init?.method ?? "GET"} ${url}`);
      if (url.includes("/api/tareas")) {
        const stand = tareasEjemplo().find((tarea) => tarea.id === "stand");
        return json({ tareas: stand ? [stand] : [] });
      }
      if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "demo", nombre: "Demo" }] });
      if (url.endsWith("/api/evidencias") && init?.method === "POST") {
        cuerpo = init.body instanceof FormData ? init.body : null;
        return json({ evidencia: { id: "ev-1", tareaId: "stand", blobId: "blob-1" } }, 201);
      }
      return json({}, 404);
    };
    try {
      await montar(
        createElement(ProveedorModoDemo, {
          activo: demo,
          rol: demo ? "voluntario" : null,
          children: createElement(SubirEvidencia, { tareaId: "stand" }),
        }),
      );
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 30));
      });
      await elegirEnSelector(new File(["%PDF-1.4"], "factura.pdf", { type: "application/pdf" }));
      assert.match(texto(), /factura\.pdf/);
      await act(async () => {
        boton("Send evidence").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 30));
      });
      const enviado = cuerpo as FormData | null;
      assert.ok(pedidos.includes("POST /api/evidencias"));
      assert.ok(!pedidos.some((pedido) => pedido.includes("/api/evidencias/token")));
      assert.equal(enviado?.get("origen"), "archivo");
      assert.equal(enviado?.get("token"), null);
      assert.equal(enviado?.get("capturadaEn"), null);
      assert.equal((enviado?.get("foto") as File | null)?.name, "factura.pdf");
    } finally {
      globalThis.fetch = original;
      await desmontar();
      limpiarPantalla();
    }
  });
}

test("en español la pantalla dice Tomar foto, Subir archivo y la zona para soltar, en usted y sin prohibir la galería", async () => {
  limpiarPantalla();
  definirCamara(async () => ({ getTracks: () => [{ stop() {} }] }) as unknown as MediaStream);
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      const stand = tareasEjemplo().find((tarea) => tarea.id === "stand");
      return json({ tareas: stand ? [stand] : [] });
    }
    return json({}, 404);
  };
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }),
      }),
    );
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.equal(boton("Tomar foto").textContent, "Tomar foto");
    assert.equal(boton("Subir archivo").textContent, "Subir archivo");
    assert.match(texto(), /Arrastre su evidencia o elija un archivo/);
    assert.match(texto(), /Foto, factura, PDF o lista/);
    assert.match(texto(), /Envíe una sola evidencia/);
    assert.doesNotMatch(texto(), /No se aceptan fotos de la galería|solo con la cámara/);
    for (const voseo of ["subí", "arrastrá", "elegí", "tomá", "tenés", "podés"]) {
      assert.equal(new RegExp(`(^|[^a-záéíóúüñ])${voseo}([^a-záéíóúüñ]|$)`, "i").test(texto()), false, voseo);
    }
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
