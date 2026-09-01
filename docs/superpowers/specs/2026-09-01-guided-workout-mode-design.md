# HIERRO — Modo de entrenamiento guiado

Fecha: 2026-09-01

## Contexto

Hoy, cargar un entrenamiento en HIERRO es un formulario plano: elegís
grupo muscular → ejercicio → cargás cada serie a mano, todos los
ejercicios visibles a la vez en una sola pantalla larga. Es el mismo
editor tanto para armar una sesión nueva como para editar una vieja del
historial.

Este spec reemplaza esa experiencia por un **modo guiado**, tomando como
referencia de diseño (organización, tamaños, tipografía, mecánica) la
pantalla de entrenamiento de openGym — sin usar su código, reimplementado
desde cero en el estilo vanilla JS de HIERRO. Es el ítem "A" de la hoja
de ruta hacia paridad funcional con openGym; ítems B (progresión
automática), C (1RM) y D (supersets, peso corporal, reps por lado,
cardio, esfuerzo) quedan explícitamente afuera y se construyen después
sobre esta base.

Es también el punto donde las rutinas dejan de vivir escondidas en una
tarjeta del Log y pasan a tener su propio lugar de primer nivel en la
navegación.

## Alcance

**Reemplaza por completo** el editor plano (`view-edit`,
`newSession()`, `editSessionFn()`, `renderExercises()`/`buildExBlock()`,
`saveSession()` tal como existen hoy) tanto para sesiones nuevas
(freestyle o desde rutina) como para editar sesiones guardadas del
historial. No queda ninguna otra forma de cargar/editar una sesión.

**No cambia** el formato en que una sesión se guarda en `log`
(`{id, date, routineId, routineName, exercises: [{id, cat, exId,
targetReps, sets: [{weight, reps}]}]}`) — el modo guiado es una UX
nueva sobre el mismo dato de siempre, así que el historial ya guardado
sigue siendo válido sin migración.

**No cambia** el editor de rutinas (`view-routine-edit`) — seguís
definiendo una rutina con el formulario plano de siempre (nombre +
lista de ejercicios con sets/reps objetivo). Ese formulario define un
plan, no registra lo que pasó; el modo guiado es exclusivamente para
*loguear* un entrenamiento, sea en vivo o editando el historial.

Explícitamente afuera de este spec (van en B, C o D):

- Sugerencias de progresión automática ("por qué este peso").
- Detección de PR (récord personal).
- Estimación de 1RM.
- Supersets, ejercicios con peso corporal (sin columna de peso),
  reps por lado, modo cardio, columna de esfuerzo (RIR/RPE).
- Notificación push del timer de descanso con la app cerrada (necesita
  backend — HIERRO sigue siendo 100% estático).

## Navegación

El bottom nav pasa de 3 a 5 ítems, calcado del `TabBar` de openGym:

**Log · Rutinas · [Empezar] · Stats · Guía**

- **Log**: pura lista de sesiones del historial. Se le saca el botón
  "+ Sesión libre" del header (arrancar un entreno ahora vive en el
  botón central de la nav) y se le saca la tarjeta "Plan semanal"
  completa (tira semanal + los 3 botones de rutinas) — esa tarjeta se
  muda entera a la pestaña **Rutinas**.
- **Rutinas**: pestaña nueva. Contenido: lo que hoy es la tarjeta "Plan
  semanal" (tira de 7 días, long-press para reprogramar) más la
  pantalla de gestión de rutinas (`view-routines`) y el editor de
  rutinas (`view-routine-edit`), reorganizados como la sección propia
  que ya son — sin cambiar su funcionamiento interno, solo su lugar en
  la navegación.
- **[Empezar]**: botón circular, más grande que el resto, centrado.
  Ver "Arranque" abajo. Cambia a "Reanudar" si hay un entrenamiento
  activo sin terminar.
- **Stats** y **Guía**: sin cambios, solo se reordenan en la barra.

## Modelo de datos — sesión activa

Nueva variable de estado en memoria, `activeWorkout` (reemplaza a
`editSession` para todo lo que sea logueo — el editor de rutinas sigue
usando su propio `editRoutine`, sin tocar):

```js
// activeWorkout = {
//   id, date, routineId, routineName,     // igual que una sesión guardada
//   start: timestamp,                     // solo si es una sesión EN VIVO (null al editar historial)
//   entries: [{ id, cat, exId, targetReps, sets: [{weight, reps, done}] }],
//   cur: 0,                               // índice del ejercicio actual
//   editingSessionId: string|null         // si no es null, "Terminar" actualiza esa sesión en vez de crear una
// }
```

`sets[].done` es nuevo — no existía en el modelo de sesión guardada.
Al guardar (`Terminar`), se descarta ese campo (una serie guardada
sigue siendo solo `{weight, reps}`, igual que hoy) — `done` es un
detalle de la experiencia en vivo, no del historial.

## Arranque (botón "Empezar")

Misma lógica que el `TabBar` de openGym:

1. Si `activeWorkout` ya existe (sesión en curso sin terminar) →
   entra directo a la pantalla guiada, donde quedó.
2. Si no, mira `effectiveRoutineId(hoy)` (la función que ya existe):
   si hay una rutina asignada a hoy → arranca esa directo
   (`activeWorkout` se arma con sus ejercicios, sets vacíos,
   `sets.length` según el `sets` objetivo de la rutina).
3. Si no hay nada asignado a hoy → abre una hoja chica (mismo patrón
   visual que las hojas ya existentes): "Rutina de hoy" (si hay
   alguna, aunque no esté asignada a hoy — lista corta), "Elegir otra
   rutina" (lista completa), y **"Freestyle"** (siempre presente,
   arranca `activeWorkout` con `entries: []`) — la regla de que
   loguear sin rutina nunca pida más de un toque de más se mantiene.

## Pantalla de entrenamiento guiado

Muestra **un ejercicio a la vez** (`entries[cur]`), con:

- **Header**: barra de progreso (sets marcados como `done` / total),
  cronómetro corriendo desde `activeWorkout.start` (formato `m:ss`,
  se actualiza cada segundo — oculto si `start` es `null`, o sea al
  editar historial), botón ✕ (descartar, con confirmación tipo
  `confirm()` nativo como ya usa el resto de la app) y botón ✓
  (terminar).
- **Card del ejercicio**: imagen (`RAW+ex.image`), nombre en español
  (`esName`), grupo muscular, línea "Última vez: {fecha} — {resumen de
  sets}" si existe una sesión previa con ese `exId` (reusa la lógica
  que ya calcula esto para la Guía). Debajo, las filas de series:
  cada una con dos steppers (peso en kg, reps) con botones +/- y el
  valor tocable para escribir directo, más un checkbox "hecho". Botón
  "+ Serie" al final de la lista (igual que ya existe hoy en el
  editor).
- **Marcar un set como hecho**: si es el último set sin marcar del
  ejercicio actual, arranca el timer de descanso (ver abajo) y, si es
  el último ejercicio también completo, ofrece pasar a la pantalla de
  "entrenamiento completo" (mismo patrón de confirmación/toast que ya
  usa la app, sin sheet elaborada — alcanza con un toast + volver a
  Log).
- **Navegación entre ejercicios**: botones "Anterior"/"Siguiente"
  debajo de la card, deshabilitados en los extremos.
- **"+ Agregar ejercicio"**: reusa el picker de ejercicios ya
  existente (`openPicker`, en un tercer modo `'workout'` junto a los
  ya existentes `'session'`/`'routine'`), agrega un `entries` nuevo al
  final y salta ahí.
- **Terminar**: si todos los sets de todos los ejercicios están
  `done`, el botón dice "Terminar entrenamiento" (acción primaria). Si
  no, dice "Terminar antes de tiempo · {x}/{y} ejercicios" (ghost,
  menos prominente) — igual criterio que el botón de abajo de todo en
  `ActiveWorkout` de openGym.

## Timer de descanso

Al completarse el último set de un ejercicio (y no ser el último
ejercicio del entreno), arranca una cuenta regresiva visible en
pantalla desde un valor global (default 90 segundos, `localStorage`
key `hierro_rest_sec`). Al llegar a 0: sonido corto + vibración (Web
Vibration API, con manejo de "no soportado" silencioso) — nada de
push ni Notification API con la app en segundo plano, ver Alcance.
Botón para saltear el descanso.

HIERRO no tiene pantalla de Ajustes hoy. Se agrega una mínima: un
ícono de engranaje en el header de Log (donde antes estaba el botón
"+ Sesión libre"), que abre una vista chica con un solo campo por
ahora — "Descanso entre series (segundos)" — pensada para sumarle más
opciones más adelante sin rehacerla.

## Guardar / Descartar

- **Terminar**: si `editingSessionId` es `null`, hace
  `log.unshift(...)` con un id nuevo (sesión nueva); si no, reemplaza
  la sesión existente con ese id en `log` (edición). Limpia
  `activeWorkout`, guarda, vuelve a Log.
- **Descartar**: confirmación nativa ("Se va a perder lo cargado en
  esta sesión. ¿Descartar?"), limpia `activeWorkout` sin tocar `log`,
  vuelve a Log.

## Editar una sesión pasada

Tocar el lápiz de una tarjeta del historial arma un `activeWorkout` a
partir de esa sesión guardada (`start: null`, `editingSessionId:
esa.id`, cada set con `done: true` salvo que el dato esté vacío —
`weight`/`reps` ambos vacíos cuenta como no completado, para sesiones
viejas que se guardaron a medias). Misma pantalla guiada, pero:

- Sin cronómetro (porque `start` es `null`).
- Sin timer de descanso (no tiene sentido editando algo ya pasado).
- Sin sonido/vibración.
- Arranca mostrando el primer ejercicio con algún set no completado
  (`done: false`); si están todos completos, arranca en el primero de
  la lista.

## Qué se retira del código

`view-edit` (HTML), `newSession()`, `editSessionFn()`,
`renderExercises()`, `buildExBlock()`, `buildSetRow()`, `updateExCat`,
`updateExId`, `updateSet`, `addSet`, `removeSet`, `addExercise`,
`removeExercise`, `validateSave`, `saveSession()` — todo lo que sea
específico del editor plano de sesiones. El picker de ejercicios
(`openPicker`/`renderPickerBody`/`selectPickerExercise`) se queda y se
generaliza a un tercer modo, igual que ya se generalizó de
`'session'` a `'routine'` en la feature de rutinas.

## Verificación

Sin test runner (HTML estático). Verificación manual en browser:

1. **Nav de 5 ítems**: confirmar Log/Rutinas/[Empezar]/Stats/Guía, con
   el botón central más grande y sin el header-button viejo de "+
   Sesión libre" ni la tarjeta de Plan semanal en Log.
2. **Arranque sin rutina de hoy**: tocar "Empezar" sin nada asignado,
   confirmar la hoja con "Freestyle" siempre presente y accesible en
   un toque.
3. **Arranque con rutina de hoy**: asignar una rutina a hoy, tocar
   "Empezar", confirmar que entra directo a la pantalla guiada con el
   primer ejercicio de esa rutina, sets vacíos según lo configurado.
4. **Flujo completo**: marcar todos los sets de un ejercicio,
   confirmar que arranca el timer de descanso, que Siguiente lleva al
   próximo ejercicio, que "+ Agregar ejercicio" abre el picker y suma
   uno al final. Terminar el entreno, confirmar que aparece en Log con
   el resumen correcto.
5. **Descartar**: arrancar un entreno, cargar algo, descartar,
   confirmar que no quedó nada en Log.
6. **Reanudar**: arrancar un entreno, salir de la app (o navegar a
   otra pestaña) sin terminar, volver a tocar "Empezar" (ahora dice
   "Reanudar"), confirmar que vuelve exactamente donde quedó.
7. **Editar historial**: editar una sesión guardada, confirmar que NO
   hay cronómetro ni timer de descanso, que arranca en el primer
   ejercicio incompleto (probar con una sesión completa y una
   incompleta), y que guardar reemplaza esa sesión en vez de crear una
   nueva.
8. **Rutinas siguen andando**: confirmar que crear/editar/borrar
   rutinas, la tira semanal, el long-press de reprogramar, y
   exportar/importar rutina funcionan igual que antes, ahora dentro de
   la pestaña Rutinas.
