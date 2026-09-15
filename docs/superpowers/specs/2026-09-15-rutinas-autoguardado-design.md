# Rutinas: autoguardado, asignación de día y fix del bug del 3er ejercicio — Design

**Fecha:** 2026-09-15
**Sub-proyecto:** 1 de 3 (ver contexto abajo)

## Contexto: por qué esto es un sub-proyecto aislado

El pedido original del usuario tenía 4 frentes independientes:

1. **Rutinas** — arreglar que los cambios no se guardan, el bug del 3er ejercicio, y la asignación de día de la semana (este documento).
2. **Inicio** — que la pestaña Inicio muestre lo que hoy muestra Rutinas, eliminando la pestaña "Rutinas" separada del bottom-nav.
3. **Stats/Historial** — fusionar el Log dentro de Stats, siguiendo el patrón de openGym (sección "Sesiones recientes" + pantalla de historial completo aparte).
4. (Explícito) comparar contra la implementación real de openGym en cada frente, no asumir.

Se decidió este orden porque (2) depende de que Rutinas esté sólido, y (3) es independiente y puede ir en paralelo o después. Este spec cubre **solo (1)**.

## Investigación: cómo lo resuelve openGym

Código fuente revisado: `C:\Code\openGym\frontend\src\views\{Plan,RoutineEdit,Home}.jsx`.

- **Sin borrador ni botón Guardar/Cancelar.** Cada cambio en `RoutineEdit.jsx` llama `update(s => {...})`, que muta el store real y persiste al instante. Volver atrás es solo un chevron `←` en el header — no hay nada que confirmar ni descartar.
- **La asignación de día vive separada del editor de rutina**, en `Plan.jsx`: una lista de 7 días (`Week schedule`) donde tocar un día abre `dayAssignSheet(d)` — un selector para elegir qué rutina aplica ese día (o descanso). El editor de rutina en sí (`RoutineEdit.jsx`) no tiene ningún campo de día.
- Una rutina nueva se crea vacía (`ex: []`) y se agrega al store apenas se toca "+ New" — sin exigir ningún campo completo antes de "guardar", porque no existe ese paso.

## Qué tiene HIERRO hoy (y qué falla)

- El editor de rutina trabaja sobre un borrador en memoria (`editRoutine`), separado de la lista real (`routines[]`). Los cambios solo se escriben a `routines[]` — y a `localStorage` vía `saveRoutines()` — cuando se toca el botón "Guardar rutina" (`saveRoutine()`, index.html:1587).
- **Bug del 3er ejercicio, reproducido en vivo en el navegador** (no es una hipótesis): el editor tiene una barra fija `.editor-footer` (Cancelar/Guardar, ~65px) apilada justo arriba del `.bottom-nav` (56px, siempre visible en toda la app). Juntas ocupan ~121px fijos en la parte inferior de la pantalla. El contenido scrolleable (`.editor-content`) tiene `padding-bottom:0` explícito (index.html:91), heredando solo los 64px que la regla genérica `.view{padding-bottom:64px}` reserva — insuficiente para cubrir las dos barras apiladas. Confirmado con mediciones exactas en el DOM: con 3 ejercicios, el botón "+ Ejercicio" queda posicionado en `y:694–734px`, mientras que `.editor-footer` ocupa `y:647–712px` — **se superponen**, y el botón queda literalmente tapado (invisible e intocable) por la barra fija. Con 1-2 ejercicios el contenido todavía no llega a esa zona, por eso el bug "aparece recién en el 3ro" — es dependiente de la altura del contenido, no un límite fijo de 2 ejercicios.
- La asignación de día de la semana **ya existe parcialmente**: la tira de 7 días (`renderPlanSemanal()`, index.html:1381) permite mantener presionado un día para abrir un selector (`openDayOverlay`) con las opciones "Solo hoy" / "Cambiar todos los [día]". El problema: (a) es mantener-presionado, un gesto poco descubrible; (b) un tap simple en un día con rutina asignada arranca esa rutina directamente en vez de ofrecer reasignarla, lo cual — combinado con (a) — hace que la función de reasignación sea difícil de encontrar y de usar desde el editor de una rutina específica.

## Diseño

### A. Autoguardado real — eliminar el borrador `editRoutine`

Se reemplaza el objeto borrador `editRoutine` por una referencia simple al id de la rutina que se está editando (`editingRoutineId`). Todas las funciones que hoy mutan `editRoutine.exercises.find(...)` pasan a mutar directamente `routines.find(r=>r.id===editingRoutineId)` y llaman `saveRoutines()` inmediatamente después de cada mutación:

- `updateRoutineExCat`, `updateRoutineExId`, `updateRoutineField`, `updateRoutinePerSide`, `updateRoutineLinkedToNext`, `updateRoutineCardioDuration`, `addRoutineExercise`, `removeRoutineExercise` — mismo comportamiento de cada uno, pero ahora persisten al toque en vez de esperar un guardado explícito.
- El campo nombre pasa de `oninput="validateRoutineSave()"` (solo validaba, no guardaba) a `onchange="updateRoutineName(this.value)"` (guarda al perder foco/Enter, no en cada tecla — evita escrituras excesivas a localStorage). Si queda vacío, cae a `'Rutina'` por defecto (igual que el fallback `'Routine'` de openGym).
- **"+ Rutina" crea y persiste de inmediato**: `newRoutine()` ya no toma un parámetro de día (ver sección C). Crea `{id:uid(), name:'', exercises:[emptyRoutineEx()]}`, lo empuja a `routines[]`, llama `saveRoutines()`, y recién ahí abre el editor. Se mantiene el mismo pre-seed de un ejercicio vacío que existe hoy (no se adopta el `ex:[]` vacío de openGym — fuera de alcance, ver "Fuera de alcance").
- `editRoutineFn(id)` deja de clonar exercises con ids nuevos (`.map(e=>({...e,id:uid()}))` — eso era parte del mecanismo de borrador descartable); ahora simplemente setea `editingRoutineId=id` y renderiza directo desde `routines`.
- `saveRoutine()`, `validateRoutineSave()` y el botón "Guardar rutina" se eliminan por completo (ver sección B).
- `cancelRoutineEdit()` se simplifica a una sola línea: siempre `showRoutines()` (la rama de `editRoutinePreassignDay` desaparece junto con el resto de esa variable — ver sección C). Nota para el sub-proyecto 2: cuando Inicio absorba la pestaña Rutinas, este call site cambia de destino, no de lógica.

**Caso límite descubierto durante la investigación — rutinas incompletas ahora pueden "escaparse":** hoy es imposible guardar una rutina con un ejercicio sin `exId` (el botón Guardar se deshabilita). Con autoguardado, un usuario puede agregar un 2do ejercicio, elegir el grupo muscular pero no el ejercicio puntual todavía, y salir del editor — esa rutina queda guardada con un slot incompleto. `buildActiveWorkout()` (index.html:984) hoy mapea `routine.exercises` sin filtrar, así que si esa rutina incompleta se usa para arrancar un entrenamiento, generaría una entrada con `exId:''` que no resuelve contra `EXERCISES`. Fix: `buildActiveWorkout` filtra `routine.exercises.filter(re=>re.exId)` antes de mapear a `entries` — los slots incompletos se ignoran silenciosamente al arrancar una sesión, sin bloquear el guardado ni forzar a completarlos antes de salir del editor.

### B. El editor pierde la barra Cancelar/Guardar

`.editor-footer` (index.html:355-358, el `<div>` con los botones Cancelar/Guardar dentro de `view-routine-edit`) se elimina del HTML. Volver atrás queda a cargo exclusivo de la flecha `←` del header (`cancelRoutineEdit()`, ya existente). Esto resuelve el bug del 3er ejercicio como consecuencia directa: sin la barra `.editor-footer` apilada, el contenido scrolleable solo necesita despejar el `.bottom-nav` (56px), que ya cubre la regla genérica `.view{padding-bottom:64px}` — se verifica en el navegador durante la implementación que ese margen alcanza; si no alcanza por poco, se ajusta ese valor puntualmente (no es una reescritura de layout, es un padding).

### C. Día de la semana — un solo tap, siempre

- El botón de cada día en la tira semanal (`renderPlanSemanal()`) cambia su único handler a `onclick="openDayOverlay('${iso}')"`. Se eliminan `onWeekDayTap`, `startLongPress`, `cancelLongPress`, y los atributos `onmousedown/onmouseup/onmouseleave/ontouchstart/ontouchend/ontouchmove/ontouchcancel` del botón — un solo gesto, sin distinción táctil/mouse.
- `openDayOverlay`, `renderDayOverlay`, `pickDayOverlayChoice`, `applyDayOverride`, `closeDayOverlay` se mantienen sin cambios de lógica — siguen ofreciendo "Solo hoy" (vía `dayOverrides`) y "Cambiar todos los [día]" (vía `week[wd]`), que es más flexible que el sheet de openGym (que no distingue "hoy" de "siempre") y el usuario no pidió sacar esa distinción.
- Arrancar el entrenamiento de hoy deja de ser alcanzable desde un tap en el día — queda exclusivamente a cargo del botón "Empezar" del bottom-nav (`startWorkout()`, ya usa `effectiveRoutineId(todayISO())` para resolver la rutina de hoy, sin cambios).
- `newRoutine()` pierde el parámetro `weekday` y toda la lógica de preasignación (`editRoutinePreassignDay`, la línea `week[String(editRoutinePreassignDay)]=clean.id` dentro de `saveRoutine()`) — crear una rutina y asignarla a un día son ahora dos acciones separadas, igual que en openGym: "+ Rutina" crea una rutina suelta; asignarla a un día se hace después, tocando ese día en la tira y eligiéndola de la lista.

## Fuera de alcance (decidido explícitamente por el usuario)

- Selector de ícono/emoji por rutina, política de progresión por rutina, preview "qué trabaja esta rutina" con mapa muscular, botones de reordenar ejercicios arriba/abajo — openGym los tiene, HIERRO no los va a copiar en este sub-proyecto.
- Pre-sembrar rutinas nuevas sin ningún ejercicio (`ex:[]`, como openGym) — se mantiene el pre-seed de un ejercicio vacío que HIERRO ya tiene hoy.
- Eliminar rutina desde dentro del editor (openGym tiene un botón "Eliminar rutina" al pie de `RoutineEdit`) — se mantiene el mecanismo actual (swipe-to-delete en la lista de rutinas), sin agregar un segundo camino.
- Todo lo referido a la pestaña Inicio y a Stats/Historial — sub-proyectos 2 y 3, specs separados.

## Testing

Sin test runner en este repo (single-file, sin build). Verificación manual en navegador, sirviendo localmente (`python -m http.server` desde `C:\Code\hierro-pwa`), cubriendo:

1. Crear una rutina nueva, agregar 4-5 ejercicios seguidos, confirmar que "+ Ejercicio" nunca queda tapado ni deja de responder (repite la condición exacta del bug reproducido).
2. Cerrar la app (recargar la página) a mitad de edición, sin tocar ningún botón de guardado — confirmar que los cambios persisten en `localStorage` y siguen ahí al reabrir.
3. Editar el nombre, un checkbox, sets/reps de una rutina existente — confirmar que cada cambio persiste individualmente (recargar entre pasos si hace falta) sin necesidad de ninguna acción de "guardar".
4. Crear una rutina, agregar un 2do ejercicio, elegir solo el grupo muscular (sin elegir el ejercicio puntual), salir del editor — confirmar que la rutina quedó guardada con ese slot incompleto, y que intentar arrancar un entrenamiento desde esa rutina no rompe (el slot incompleto se ignora).
5. Tocar un día de la tira semanal (con y sin rutina asignada) — confirmar que siempre abre el selector de reasignación, nunca arranca un entrenamiento ni crea una rutina nueva directamente.
6. Con al menos 2 rutinas creadas, asignar una a un día vía "Cambiar todos los [día]" y otra vía "Solo hoy" — confirmar que ambos caminos siguen funcionando como hoy.
7. Confirmar que "Empezar" (bottom-nav) sigue arrancando la rutina efectiva del día sin cambios.
8. Regresión visual: la barra Cancelar/Guardar ya no aparece en el editor de rutina; el header conserva su flecha "←" funcional.
