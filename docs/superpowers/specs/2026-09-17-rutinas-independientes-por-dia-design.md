# Rutinas independientes por día — Design

**Fecha:** 2026-09-17
**Sub-proyecto:** 2 de 2 del feedback de Raúl (ver `docs/BACKLOG.md`, sección "Feedback de Raúl sobre flujo de días/rutinas")

## Contexto

Feedback recibido por PDF (`review_app_gimnasio_Raul-1.pdf`) más aclaraciones habladas después. Puntos cubiertos por este documento (ver `docs/BACKLOG.md` para el texto completo de cada uno):

- PDF #1 — navegación libre entre días, ver la rutina individual de cada uno.
- PDF #2 — botón "Iniciar sesión" visible dentro de cada día.
- PDF #3 y #4 — que dos días con el mismo grupo muscular no estén obligados a compartir configuración; poder agregar/quitar/modificar ejercicios de un día sin afectar otros.
- PDF #5 — que los cambios queden guardados específicamente para ese día.
- Feedback hablado: opción "Crear rutina"/freestyle desde el selector de día; botón grande "Iniciar sesión" que si no hay rutina pregunta crear rutina o freestyle; al editar ejercicios de un día, preguntar alcance (solo este día / todos los días con esa rutina); al crear una rutina desde un día, poder aplicarla también a otros días desde el mismo lugar.

El sub-proyecto 1 (ajustes de UI: fechas en la tira semanal, back físico/gesto, reorden de bottom-nav) ya está implementado y comiteado — no se toca en este documento.

## Decisión de modelo de datos: "fork on edit", no copia automática

Se evaluaron dos enfoques:

1. **Copia independiente automática**: cada día tendría desde el momento de asignación una copia propia embebida de la rutina, en vez de una referencia a `routines[]`. Requeriría migrar los datos ya guardados de los usuarios (`week`, `dayOverrides` pasarían de guardar un `routineId` a guardar un objeto completo) y perdería la reutilización simple de "asignar la misma rutina a dos días".
2. **Fork on edit** (elegido): `week[wd]` y `dayOverrides[iso]` siguen guardando un `routineId` que apunta a `routines[]`, exactamente como hoy — cero migración de datos existentes. Asignar la misma rutina a Lunes y Miércoles sigue siendo instantáneo y sin duplicar nada (esto resuelve directamente la queja del PDF de tener que crear rutinas separadas solo para poder asignarlas a días distintos). La independencia real ocurre recién cuando el usuario **edita el contenido** de la rutina desde el contexto de un día específico: si esa rutina está asignada a más de un día, se pregunta una sola vez, al entrar a editar, si el cambio va a aplicar solo a ese día (lo cual clona la rutina con un id nuevo y reasigna ese slot al clon) o a todos los días que la usan (edita el objeto compartido, comportamiento actual sin cambios).

Se eligió el enfoque 2 porque el editor de rutinas ya no tiene un botón "Guardar" explícito (autoguarda cada cambio, desde el sub-proyecto de "Rutinas: autoguardado") — no existe un momento de "guardar" para preguntar el alcance. Preguntar una sola vez al **entrar** a editar, en vez de en cada autoguardado individual, evita interrumpir al usuario en cada tecla.

## Diseño

### A. Pregunta de alcance al entrar a editar un día compartido

Nueva función `dayEditingContext` (reemplaza el uso directo de `editingRoutineId` cuando se entra al editor desde un día): guarda `{routineId, slotType: 'week'|'override', slotKey}` (el weekday o el iso desde donde se entró).

Al invocar "Editar ejercicios" desde el overlay de día (ver sección B):

1. Se cuenta cuántos slots (`week[*]` + `dayOverrides[*]`) apuntan actualmente a ese `routineId`.
2. Si es 1 (o el slot de origen no tiene routineId aún, ej. recién creada): se entra directo al editor existente (`editRoutineFn(routineId)`), sin preguntar nada — ya es de facto exclusiva de ese día.
3. Si es más de 1: se muestra un mini-diálogo (mismo patrón visual que `renderDayOverlay`) — *"Esta rutina también se usa en [lista de días]. ¿Los cambios que hagas ahora van a aplicar solo a [nombre del día de origen] o a todos esos días?"* con dos botones:
   - **"Solo [día]"**: `forkRoutine(routineId)` — clona `{...routine, id:uid(), exercises: deep copy}`, lo agrega a `routines[]`, llama `saveRoutines()`, reasigna el slot de origen (`week[wd]=newId` o `dayOverrides[iso]=newId`, con su función `save*` correspondiente) al nuevo id, y entra al editor con `editRoutineFn(newId)`.
   - **"Todos esos días"**: entra directo al editor con `editRoutineFn(routineId)` — sin cambios respecto al comportamiento actual.

Este flujo cubre PDF #3, #4 y #5 y el feedback hablado sobre la pregunta de alcance.

### B. Overlay de día — de "solo reasignar" a "ver, editar y arrancar"

Se extiende `day-overlay` (`openDayOverlay`, `renderDayOverlay`, `index.html:1458-1484`) con dos vistas dentro del mismo overlay, controladas por un nuevo estado `dayOverlayMode` ('detail' | 'reassign'):

**Vista 'detail'** (la que se abre por defecto al tocar un día en la tira semanal):
- Nombre del día + fecha (ya calculada en `renderPlanSemanal`, se pasa a través de `openDayOverlay(iso)`).
- Si `effectiveRoutineId(iso)` resuelve a una rutina: nombre + lista de ejercicios (reutiliza el renderer de solo-lectura que ya usa el modo guiado para previsualizar), y tres botones: **"Iniciar sesión"** (primario, grande — sección C), **"Editar ejercicios"** (dispara el flujo de la sección A), **"Cambiar rutina del día"** (pasa a vista 'reassign').
- Si resuelve a `'rest'`: mensaje "Día de descanso" + botón "Cambiar" (pasa a 'reassign').
- Si resuelve a `'freestyle'` (ver sección C): mensaje "Sesión libre, sin rutina fija" + botón **"Iniciar sesión"** + botón "Cambiar" (pasa a 'reassign').
- Si no hay nada asignado (`null`): estado vacío + botón **"Iniciar sesión"** (sección C) + botón "Asignar rutina" (pasa a 'reassign').

**Vista 'reassign'** (la que existe hoy, sin cambios de lógica en `pickDayOverlayChoice`/`applyDayOverride`): lista de Descanso + rutinas de la biblioteca + **nueva entrada "Crear rutina"** y **nueva entrada "Freestyle"**, seguidas de los botones "Solo hoy" / "Todos los [día]" ya existentes.
- Elegir "Crear rutina": al confirmar el alcance (hoy/siempre), se crea la rutina vacía (`newRoutine()`, sin el pre-seed de nombre), se asigna el slot correspondiente al nuevo id, y se navega directo al editor (`editRoutineFn` sobre el id recién creado) — sin pasar por el mini-diálogo de la sección A (una rutina recién creada nunca está compartida).
- Elegir "Freestyle": `applyDayOverride` guarda el sentinel `'freestyle'` en vez de un `routineId` o `'rest'`.

**Ajuste necesario en `renderPlanSemanal` (`index.html:1420-1449`):** hoy `label` es `isRest?'Descanso':(routine?routine.name:'—')` — con el sentinel `'freestyle'`, `routines.find` no matchea nada y caería en `'—'`, indistinguible de "sin asignar". Se agrega una tercera rama: `effId==='freestyle' ? 'Libre' : ...`.

### C. Botón "Iniciar sesión" — con o sin rutina

Reutiliza la lógica ya existente de `pickStart`/`buildActiveWorkout` (`index.html:1024-1075`):

- Si el día resuelve a una rutina real: `pickStart(routineId)` — arranca esa rutina, sin importar si el día que se está viendo es hoy, ayer o mañana (igual de flexible que el selector "Empezar" del bottom-nav hoy).
- Si resuelve a `'freestyle'`: `pickStart(null)` directo, sin preguntar nada más.
- Si no hay nada asignado (`null`): se abre un mini-selector de dos opciones — **"Crear rutina"** (mismo flujo que en B, entra al editor) o **"Freestyle"** (arranca `pickStart(null)` ya mismo).
- Si es `'rest'`: el botón no se muestra (reemplazado por el mensaje de descanso).

**Ajuste necesario en `startWorkout()` (`index.html:1056-1064`):** hoy, si `effectiveRoutineId(todayISO())` no matchea ninguna rutina real, cae silenciosamente a `openStartChooser()` (pide elegir de una lista). Para que "Empezar" del bottom-nav se comporte igual que "Iniciar sesión" desde el día de hoy, se agrega una rama explícita: si `effId==='freestyle'`, arranca `pickStart(null)` directo, sin mostrar el selector.

### D. Asignar una rutina a más días desde el propio editor

Se agrega una sección **"Días asignados"** en `view-routine-edit` (debajo del campo Nombre, `index.html:341-344`): una fila de 7 toggles (L M M J V S D, mismo layout visual que `WEEKDAY_LETTERS`/`WEEK_LAYOUT`), reflejando en qué días de la semana `week[wd]` apunta actualmente a `editingRoutineId`. No incluye `dayOverrides` (esos son excepciones puntuales por fecha, no de la semana recurrente — no tiene sentido representarlos como un toggle semanal).

- Tocar un día que no la tiene: `week[wd] = editingRoutineId; saveWeek();` — no dispara el flujo de fork de la sección A (asignar no es editar contenido).
- Tocar un día que ya la tiene (para sacarla): `week[wd] = null; saveWeek();` — el día vuelve a quedar sin asignar, la rutina no se borra.
- Se re-renderiza esta fila cada vez que se abre el editor (`editRoutineFn` y `newRoutine`) y cada vez que se togglea un día.

Esto cubre el feedback hablado: crear una rutina desde el Lunes y, sin salir del editor, sumarla también al Miércoles.

## Fuera de alcance (decidido explícitamente por el usuario)

- Navegar a semanas futuras/pasadas desde la tira semanal — descartado en la conversación, se evaluará más adelante.
- Cualquier lógica de "sugerir" o "detectar automáticamente" qué días deberían compartir rutina (ej. por grupo muscular) — la relación día↔rutina sigue siendo 100% manual, como hoy.
- Deshacer un fork (volver a "fusionar" dos rutinas en una) — no pedido, no se implementa.

## Testing

Sin test runner en este repo (single-file, sin build). Verificación manual en navegador, sirviendo localmente (`npx http-server hierro-pwa` o vía el `launch.json` del repo raíz), cubriendo:

1. Asignar la misma rutina a Lunes y Miércoles desde el editor (sección D) — confirmar que `week['1']` y `week['3']` quedan con el mismo id y que la tira semanal muestra el mismo nombre en ambos días.
2. Entrar a "Editar ejercicios" desde Lunes (rutina compartida con Miércoles) — confirmar que aparece la pregunta de alcance con el nombre correcto del otro día.
3. Elegir "Solo Lunes" — confirmar que se crea una rutina nueva en `routines[]`, que `week['1']` pasa a apuntar a ese nuevo id, que `week['3']` sigue apuntando al id original, y que editar ejercicios desde ahí en adelante en Lunes no modifica Miércoles.
4. Elegir "Todos esos días" en el mismo escenario — confirmar que los cambios sí se reflejan en ambos días.
5. Entrar a "Editar ejercicios" de un día cuya rutina no está compartida con ningún otro — confirmar que entra directo al editor sin preguntar nada.
6. Día sin rutina asignada: tocar "Iniciar sesión" → elegir "Crear rutina" → confirmar que entra al editor y que al guardar el nombre la tira semanal ya refleja la rutina en ese día. Repetir eligiendo "Freestyle" → confirmar que arranca una sesión libre sin crear ninguna rutina.
7. Asignar "Freestyle" desde la vista de reasignación (no desde Iniciar sesión) — confirmar que el día muestra "Sesión libre" y que "Iniciar sesión" arranca freestyle directo sin preguntar.
8. Confirmar que el modo guiado, exportar/compartir rutina y el CSV de export siguen funcionando igual sobre una rutina forkeada (mismo formato de objeto, distinto id).
9. Regresión: `startWorkout()` (botón "Empezar" del bottom-nav) sigue arrancando la rutina efectiva de hoy sin cambios de comportamiento.
