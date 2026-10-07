# Examen de fotos de Mile

Mile es la IA que mira la foto de una tarea y pone una nota de 0 a 100.

- Menos de 50: Insuficiente
- De 50 a 79: Parcial
- 80 o más: Cumplió

Este examen mide cuántas acierta. No cambia la app. No guarda nada en la base.

## Qué necesitas

En el archivo `.env.local`, en la raíz del proyecto, pon estas tres:

- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `LAYA_URL`

`LAYA_API_KEY` es opcional. Si la tienes, ponla también.

Si falta una de las tres primeras, el examen se detiene y dice el nombre que falta. No muestra el valor.

## Cómo tomar las fotos

1. Abre `casos.json`.
2. Lee `condicion`. Eso es lo que la foto debe mostrar.
3. Lee `nota_para_tomar_la_foto`. Eso es lo que tienes que hacer.
4. Toma la foto.
5. Guárdala en la carpeta `fotos/` con el nombre exacto de `archivo`.

El nombre tiene que ser igual, letra por letra. Si falta un archivo, ese caso se salta y el examen lo dice.

En la app, un trabajo es tipo `trabajo`. Un recibo es tipo `reembolso`.

Hay un caso de ensayo escrito a mano: `ensayo-escrito-mano`.

## Nombres exactos

- `fotos/01-ensayo-bien.jpg` — ensayo escrito a mano, claro y completo
- `fotos/02-ensayo-borroso.jpg` — el mismo ensayo, borroso
- `fotos/03-otra-cosa.jpg` — otra cosa, no el ensayo
- `fotos/04-ensayo-incompleto.jpg` — solo la mitad de la hoja
- `fotos/05-ensayo-a-medias.jpg` — el ensayo empezado, no terminado
- `fotos/06-sin-lugar.jpg` — el trabajo, pero no en el lugar pedido
- `fotos/07-con-lugar.jpg` — el trabajo en el lugar pedido
- `fotos/08-trabajo-claro.jpg` — el stand completo y nítido
- `fotos/09-sin-empezar.jpg` — la mesa vacía
- `fotos/10-oscuro.jpg` — la foto muy oscura
- `fotos/11-pantalla.jpg` — foto de una pantalla, no del papel
- `fotos/12-selfie.jpg` — una selfie sin la tarea
- `fotos/13-recorte.jpg` — el banner cortado
- `fotos/14-pared.jpg` — una pared vacía
- `fotos/15-recibo-bueno.jpg` — recibo de comida claro
- `fotos/16-recibo-ilegible.jpg` — recibo que no se lee
- `fotos/17-recibo-sin-total.jpg` — recibo sin el total
- `fotos/18-recibo-sin-fecha.jpg` — recibo sin la fecha
- `fotos/19-recibo-otro-gasto.jpg` — un recibo que no es de comida
- `fotos/20-recibo-pantalla.jpg` — el recibo en una pantalla
- `fotos/21-recibo-sobre-tope.jpg` — recibo de más de 15 dólares
- `fotos/22-recibo-a-mano.jpg` — recibo escrito a mano
- `fotos/23-recibo-colones.jpg` — recibo en colones
- `fotos/24-recibo-arrugado.jpg` — recibo arrugado, pero se lee
- `fotos/25-solo-titulo.jpg` — la hoja solo con el título

## Cómo correrlo

Desde la raíz del proyecto:

```bash
npm run examen-mile
```

Al final sale una tabla. Cada fila trae el caso, lo esperado, lo que obtuvo Mile, la nota, si acertó (sí o no) y las etiquetas. Debajo va el porcentaje de aciertos.

Si la revisión falla, la fila dice `error` y no cuenta como acierto.

El detalle se guarda en `pruebas-mile/resultados/`, en un archivo con la fecha. Esa carpeta no se sube a git.
