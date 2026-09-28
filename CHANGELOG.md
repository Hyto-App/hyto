# Changelog

Lo más nuevo va arriba. Cada punto dice quién lo hizo y, si entró por pull request, el número.

## 2026-09-28

### Nuevo

- Quedó creado el repositorio y se compartió el plan del proyecto, los roles de cada persona y cómo está armada la aplicación. Josué Valles (entró directo, sin pull request).
- El integrante ya puede ver sus tareas, con monto y estado, y subir una foto como evidencia de un trabajo o de un reembolso. Si el servidor todavía no responde, se muestra el ejemplo del evento ZEEK: tres trabajos de US$20 y un reembolso de comida de hasta US$15. También está la pantalla de las cuatro cuentas de prueba; espera el identificador de Cavos para mostrar la dirección y dejar el pago listo. Raúl (Milasur), PR #1.
- El módulo de firma ya prepara el XDR de fondear, marcar el hito y aprobar y liberar, y envía el XDR firmado. Las rutas son `POST /api/firma` y `POST /api/firma/enviar`. El script `scripts/hito-prueba.ts` usa ese módulo en testnet. Fondear y Aprobar del admin todavía no lo llaman. Sebastián Ceciliano, PR #8.
- El organizador ya tiene la bandeja de inicio (presupuesto, lo pagado, lo pendiente y lo que falta aprobar), la pantalla para crear un proyecto, la revisión de una evidencia y un informe para imprimir. Usan el mismo ejemplo de ZEEK. El botón Entrar llama a Cavos solo si ya existe el identificador. Fondear y Aprobar todavía no firman un pago. Josué Valles, PR #3.

### Arreglado

- La revisión de una tarea se ve de inmediato, sin quedar en blanco mientras carga la página. Josué Valles, PR #3.
- En el informe, el reembolso muestra el monto ya revisado, la misma cifra que suma el total pagado. Si no se puede guardar, la pantalla avisa y no borra lo que ya estaba. Josué Valles, PR #3.
- El color del botón queda definido en un solo lugar, y la aplicación ya no crea sola un archivo de reglas al arrancar. Raúl (Milasur), PR #1.

### Cambiado

- La documentación quedó al día con lo que ya está después de las pantallas del integrante: qué está hecho, qué sigue y de quién es cada parte. Josué Valles, PR #2.
- Quedó escrito que cada cambio va en una rama con el nombre de la persona y la tarea, y entra por pull request. Josué Valles (entró directo, sin pull request).
- Se alineó el orden del trabajo de cada persona y quedó claro que el Acta entra solo después de un pago. Josué Valles (entró directo, sin pull request).
- Se sacaron del contexto del proyecto herramientas que el equipo no va a usar. Josué Valles (entró directo, sin pull request).

### Pendiente para el equipo

- Sebas: publicar el identificador de Cavos. Sin eso, las cuentas de prueba no se preparan y el botón Entrar avisa que lo está esperando.
- Sebas: correr el hito de prueba cuando `TRUSTLESS_API_KEY` esté en el servidor, guardar el hash y, solo después de ese pago, el Acta. El módulo de firma ya prepara el XDR y envía el XDR firmado.
- Esteban: guardar los datos y las fotos, y publicar las rutas que las pantallas ya llaman. Mientras no existan, se sigue viendo el ejemplo de ZEEK.
- Abdiel: el diseño de las seis pantallas, el color de acento y la dirección de Laya.
- Josué: conectar la bandeja con las rutas de Esteban, y los botones Fondear y Aprobar con la firma de Sebas. El 30 de septiembre, actualizar la versión de la aplicación.
- Raúl: dejar listas las cuatro cuentas del demo cuando exista el identificador de Cavos.
