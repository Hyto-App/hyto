# Entrega: Mile animado por código (para implementar en el repo de Hyto)

Decisión de Abdiel (5-oct, 15:37): las animaciones de Mile van **por código**, sin Lottie. Todo está probado en navegador (Edge) y en render de video. Esta carpeta es solo para que ARGOS la pase al repo: Motion no abre PR ni toca el repo.

## Qué hay
| Ruta | Qué es | Para |
|---|---|---|
| `app/mile-rig.js` | **El rig.** Un archivo, sin dependencias. 38 KB (12 KB comprimido). | **App y landing** |
| `app/mile-lab.html` | Laboratorio interactivo en un solo archivo (rig incluido): estados, cofre, gestos, toques, movimiento reducido. Se abre con doble clic. | Probar y revisar |
| `app/mile-tap-reactions.mp4` | Las 8 reacciones al toque y el escalado (se enoja / se esconde). | Referencia de diseño |
| `app/mile-rig-demo.mp4` | Estados, cofre, chispa que explota (31 s). | Referencia de diseño |
| `redes/hyto-landing-launch-mile.gif` | Mile buscando y saliendo con la respuesta (540 px). | **Redes** (X) |
| `redes/countdown-mile/` | 7 imágenes 4:5 de la cuenta regresiva (7 a 1 días) con Mile cada día más nervioso. | **Redes** (X), no va en la app |

## Qué estado de Mile va en cada pantalla
Mile es **él**, sin boca. Los SVG oficiales de ARGOS (`docs/rediseno-mockups/mile/`) son la referencia del look; el rig usa la misma geometría.

| Pantalla / momento | Llamada del rig | Qué se ve |
|---|---|---|
| **Reposo:** login, Mis tareas, estados vacíos | `create(el, { chest: 'peek' })` (nace en `neutral`) | Asoma del cofre, respira, parpadea, mira el puntero; la chispa orbita |
| Mis tareas (saludo) | `mood('happy')` | Contento, salto corto |
| **Pensando / buscando:** enviando el código, subiendo la foto, "Mile está revisando…" | `search()` | Se mete al cofre, el cofre tiembla, salen moneda y hoja; la chispa se asoma al borde |
| **¡La tengo!:** recomendación lista, "Cumple", código correcto | `reveal('happy')` | Sale de un salto con ojos `^^`; la chispa da una vuelta y brilla |
| **Pagado / aprobado** | `reveal('excited')` | Como "¡La tengo!" y la chispa explota y se rearma |
| **Parcial** | `mood('thinking')` | Mira hacia arriba, un ojo entrecerrado |
| **Error / reintento:** foto rechazada, "Insuficiente", código incorrecto | `reveal('sad')` | Sale lento y triste; la chispa se desinfla a su lado |
| Error de subida / Mile no disponible | `mood('worried')` | Preocupado, la chispa se esconde detrás |
| Bandeja vacía | `mood('sleepy')` | Ojos casi cerrados |
| **Toque a Mile** (app y landing) | `create(el, { interactive: true })` | Ver "Toques" abajo |

Para volver al reposo después de un gesto: `mood('neutral')`.

## Cómo se monta
1. **Dependencias:** ninguna. Es SVG creado por JS. Poppins solo se usa para el "hey!" del toque (la app ya la carga).
2. **Carga:** `<script src="mile-rig.js">` define `window.MileRig`; también exporta con `module.exports` (en Next.js: `import MileRig from './mile-rig'` o `require`).
3. **Siempre del lado del cliente** (necesita `document`): en Next, componente `'use client'` y crear en `useEffect`; destruir al desmontar.
4. **Tamaño:** el SVG llena el contenedor (`width/height 100%`, `viewBox` cuadrado). Dale al contenedor un cuadrado con tamaño explícito (200–260 px en la app, 400+ en la landing). El cofre ocupa la mitad de abajo.
5. **Ejemplo (React):**
```tsx
'use client';
import { useEffect, useRef } from 'react';
import MileRig from './mile-rig';

export function MileAnimada({ estado = 'neutral', onToque }: { estado?: string; onToque?: (r: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const mile = useRef<any>(null);
  useEffect(() => {
    mile.current = MileRig.create(host.current!, { chest: 'peek', idleSeconds: 6, interactive: true, title: 'Mile', onTap: onToque });
    return () => mile.current?.destroy();
  }, []);
  useEffect(() => {
    const m = mile.current; if (!m) return;
    if (estado === 'buscando') m.search();
    else if (estado === 'lo-tengo') m.reveal('happy');
    else if (estado === 'pagado') m.reveal('excited');
    else if (estado === 'rechazado') m.reveal('sad');
    else m.mood(estado);
  }, [estado]);
  return <div ref={host} style={{ width: 240, aspectRatio: '1' }} />;
}
```
6. **API:** `mood(nombre)`, `search()`, `reveal(resultado)`, `chest('open'|'closed'|'absent')`, `layout('free'|'peek'|'out'|'hidden'|'tuft')`, `explode()`, `poke()`, `cheer()`, `look(x, y)`, `tap()`, `destroy()`. Moods: `neutral happy excited sad angry thinking worried surprised sleepy`.
7. **Opciones de `create`:** `chest`, `mood`, `aura` (true en la app; apagar en video), `idleSeconds`, `reduced` (null = automático), `interactive`, `onTap(reacción)`, `title`, `heyText`.

## Accesibilidad y rendimiento (ya incluidos)
- **`prefers-reduced-motion`:** lo detecta solo. Sin movimiento, los estados cambian de golpe, sin loops, partículas ni gestos; un toque pone una cara breve y vuelve.
- **WCAG 2.2.2:** con `idleSeconds: 6` el reposo se detiene a los 6 s y vuelve con cualquier interacción (puntero, toque, teclado).
- Se pausa con la pestaña oculta y fuera de pantalla (IntersectionObserver). Solo anima `transform`, `opacity` y atributos del SVG; sin filtros animados.
- Decorativo (`aria-hidden`) salvo con `interactive: true` o `title`: ahí es `role="button"` / `role="img"`, con foco visible y Enter/Espacio. **El texto de estado sigue en `aria-live`** como hoy en el login.

## Toques
Con `interactive: true`, Mile es un botón (clic, toque, Enter/Espacio). El primer toque es el "hey!" del brief (saltito, la chispa da una vuelta, sube "hey!"); luego alterna: se ríe, salta del susto, guiña, da una vuelta, cosquillas, la chispa responde. A los 5 toques seguidos se enoja; al 8.º se esconde en el cofre (y vuelve a asomar); sin cofre, la chispa explota. `onTap` recibe el nombre de la reacción (`hey, giggle, hop, wink, spin, wiggle, sparkle, annoyed, hide, pop`). La app decide qué hace un toque; Mile solo reacciona.

## Para la app vs. para redes
- **App y landing:** solo `app/mile-rig.js`. El lab y los videos son de referencia.
- **Redes:** el GIF y la serie countdown. La serie es opcional y se publica una imagen por día (hoy 5-oct: la de 7 días).

## Qué falta o ojo
- **Falta el componente real** (`.tsx` con tipos) y probarlo dentro de Next.js 16: aquí se probó el JS puro. El ejemplo de arriba es el punto de partida; si preferís, Motion lo escribe cuando ARGOS diga.
- **No probado todavía en celular de gama media** (60 fps y CPU en reposo). Hacerlo antes del deploy.
- Rediseño del voluntario sale **sin animación** (un SVG por estado, #062). El rig es el reemplazo cuando Abdiel lo apruebe: el SVG estático oficial queda como respaldo mientras carga.
- El brief del 4-oct pedía Lottie con póster PNG para movimiento reducido: ya no aplica; el rig lo resuelve solo.
- Los PNG oscuros del rediseño todavía dibujan a Mile con boca: ignorar esa cara; la correcta sale del rig o de `mile/*.svg`.
