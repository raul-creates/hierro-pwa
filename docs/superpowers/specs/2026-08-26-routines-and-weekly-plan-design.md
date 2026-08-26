# HIERRO — Rutinas opcionales + plan semanal + backup

Fecha: 2026-08-26

## Contexto

Hoy HIERRO es 100% freestyle: cada sesión se arma eligiendo ejercicios uno
por uno desde el picker (Guía). No existe ningún concepto de "rutina" ni de
plan semanal. El uso real hoy es justamente ese: loguear lo que se entrena
cada día que se va, sin plantilla fija.

Este spec agrega rutinas y plan semanal como una capa **opcional** sobre ese
flujo, inspirada en cómo lo resuelve openGym (self-hosted training tracker,
AGPL — revisado como referencia de diseño, sin copiar código directo por la
licencia). Se validó el layout con un mockup fiel a los estilos reales de la
app antes de escribir esta versión del spec.

La regla no negociable, ahora acotada a lo que realmente importa: **"+
Sesión libre" nunca gana fricción, pase lo que pase con las rutinas** — sigue
siendo 1 toque, directo al editor en blanco, sin preguntas, exista 0 o 10
rutinas guardadas.

Quedan afuera de este spec (sub-proyectos separados, a definir después):

- Progresión automática de peso/reps (lo que openGym llama "progression
  engine" — lineal, Greyskull LP, etc.). Las rutinas acá solo guardan un
  objetivo de referencia (texto libre), nunca calculan ni fuerzan un valor.
- Agrandar la miniatura de ejercicio en la pantalla de carga de sesión
  (pedido suelto, anotado para una iteración de ajustes visuales aparte).

## Alcance

Se agregan tres claves nuevas a `localStorage`, junto a `STORAGE_KEY`
(`hierro_log_v3`) ya existente. No se toca el modelo de `log`/sesiones salvo
dos campos opcionales nuevos. No se agrega ninguna pestaña al bottom nav —
nav queda igual (Log / Guía / Stats). Todo sigue en `index.html` (sin build
step, sin dependencias nuevas), siguiendo el patrón del proyecto. Se elimina
el botón "CSV" del header y su función `exportCSV()` — reemplazado por el
backup/restore completo de la Pieza 4 (ver esa pieza para el porqué).

## Modelo de datos

```js
// localStorage key: 'hierro_routines'
// [{ id, name, exercises: [{ exId, cat, sets, reps }] }]
// - sets: número entero (ej. 3)
// - reps: texto libre (ej. "8-10", "AMRAP") — es una referencia visual,
//   nunca se valida ni se usa para calcular nada.

// localStorage key: 'hierro_week'
// { "0": routineId|null, "1": routineId|null, ..., "6": routineId|null }
// Claves 0-6 = Date.getDay() (0 = domingo). El layout visual va lunes a
// domingo (mapeo fijo de posición → índice, no cambia el valor de la clave).
// Es la plantilla RECURRENTE ("los martes toca Push"), no lo que pasa un
// día puntual — para eso está hierro_day_overrides.

// localStorage key: 'hierro_day_overrides'
// { "YYYY-MM-DD": routineId | "rest" }
// Excepción para UNA fecha puntual, sin tocar la plantilla semanal. Una
// fecha sin entrada acá cae al valor de hierro_week para su día de semana.
```

Las sesiones guardadas (`log`) suman dos campos opcionales:

```js
// en cada sesión de `log`:
// routineId: string | null   — de qué rutina salió (o null si freestyle)
// routineName: string | null — nombre de la rutina AL MOMENTO de crear la
//   sesión (snapshot, no referencia viva)
```

`routineName` se guarda como snapshot y no se vuelve a leer de
`hierro_routines` después: si la rutina se edita o se borra más adelante,
las sesiones pasadas no cambian ni se rompen. Mismo principio que usa
openGym en `plan-share.js` (import nunca pisa lo existente, IDs propios).

## Layout general del Log (de arriba hacia abajo)

1. Header: logo + frase, botón **"+ Sesión libre"** (el `+ Sesión` de hoy,
   renombrado — mismo botón, mismo comportamiento, sin el CSV al lado).
2. Bloque **"Plan semanal"** (Piezas 1, 1b y 2) — tarjeta propia, mismo
   lenguaje visual que las session-cards (fondo `#13151F`, borde `#1E2130`,
   radio `11px`), con label `PLAN SEMANAL` estilo `.field-label`. Siempre
   visible, incluso con 0 rutinas.
3. Lista de sesiones (como hoy).
4. Footer nuevo (Pieza 4): backup/restore.
5. Bottom nav (como hoy).

## Pieza 1 — Tira semanal

Dentro del bloque "Plan semanal", una fila de 7 celdas (L a D, orden visual
fijo). Cada celda muestra la abreviatura del día + nombre corto de la
rutina **efectiva** de ese día (`effectiveRoutineId(iso)`: mira primero
`hierro_day_overrides[iso]`, si no hay entrada cae a `hierro_week[weekday]`)
— o "—" si ninguna de las dos tiene algo. El día de **hoy** se resalta en
`#FFD200`. Un día con override activo (Pieza 1b) suma una marca chica
("· reprogramado", mismo patrón que ya usa openGym) para que se note que
no es lo que dice la plantilla habitual.

**Tocar una celda:**
- **Si ese día ya tiene rutina efectiva** → arranca la sesión directo
  (mismo camino que `newSessionFromRoutine`, Pieza 3), 1 toque, sin hoja
  intermedia.
- **Si no tiene rutina efectiva** → abre el flujo de "+ Nueva rutina"
  (Pieza 3), con ese día ya pre-marcado para asignarla a la plantilla
  semanal al guardar.

Este comportamiento es independiente de "+ Sesión libre": tocar la semana
nunca es requisito para loguear freestyle, y "+ Sesión libre" nunca abre ni
menciona la semana.

## Pieza 1b — Reprogramar un día puntual ("solo hoy")

Mantener presionada una celda (long-press, ~500ms — no compite con el toque
normal de arrancar) abre una hoja, sin importar si ese día tiene rutina
efectiva o no:

> **¿Enfermo, te salteaste un día o querés algo distinto? Elegí qué
> entrenar en su lugar.**

Lista debajo: todas las rutinas guardadas + **"Descanso"** (marca ese día
como `"rest"`, sin sesión sugerida). Elegir una opción muestra dos botones
para confirmar el alcance del cambio:

- **"Solo hoy"** (acción principal, la más común) → escribe únicamente en
  `hierro_day_overrides[iso]`. La plantilla semanal (`hierro_week`) no se
  toca — el próximo {día de la semana} vuelve a ser lo de siempre.
- **"Cambiar todos los {día de la semana}"** (acción secundaria, estilo
  link, menos prominente) → escribe en `hierro_week[weekday]` en vez de
  `hierro_day_overrides`, cambiando la plantilla recurrente de ahí en más.
  Si esa fecha puntual ya tenía un override propio, se limpia (pasa a
  seguir la plantilla, que es la que se acaba de cambiar).

Esta hoja aplica a cualquier día de la tira, no solo a hoy — sirve igual
para reprogramar un día pasado (corregir un error de carga) o futuro.

## Pieza 2 — Botones del bloque "Plan semanal"

Debajo de la tira semanal, 3 botones en fila:

- **"+ Nueva rutina"** → Pieza 3.
- **"Importar rutina"** → Pieza 5.
- **"Exportar rutina"** → Pieza 5.

## Pieza 3 — Crear / gestionar rutinas

Pantalla nueva (no es una vista del bottom nav — se llega desde "+ Nueva
rutina" o desde tocar un día vacío de la semana).

- Lista de rutinas guardadas: nombre + cantidad de ejercicios. Tocar una
  fila de la lista (fuera de los íconos de editar/borrar) arranca una
  sesión con esa rutina — es la forma de usar una rutina que no está
  asignada a ningún día de la semana, sin necesidad de un botón aparte.
- Crear: pide un nombre, y reusa el picker de ejercicios ya existente del
  editor de sesiones (mismo overlay, buscador, sección "Recientes"). Cada
  ejercicio agregado suma sets objetivo (number input) y reps objetivo
  (text input, placeholder "ej. 8-10"). Si se llegó acá tocando un día
  vacío de la semana, al guardar la rutina queda asignada a ese día
  automáticamente en `hierro_week`.
- Elegir una rutina ya guardada (desde la tira semanal o desde la lista de
  esta pantalla) llama a `newSessionFromRoutine(routine)`: arma una sesión
  igual que
  `emptySession()`, pero con `exercises: routine.exercises.map(re => ({ id:
  uid(), cat: re.cat, exId: re.exId, sets: Array(re.sets || 1).fill(null)
  .map(emptySet) }))`. El `reps` objetivo se muestra como placeholder en el
  primer input de reps de cada bloque — nunca como valor cargado. La sesión
  arranca con `routineId`/`routineName` seteados.
- Borrar una rutina: si estaba asignada a algún día en `hierro_week`, esos
  días quedan sin rutina (`null`). Las sesiones pasadas que la usaron
  conservan su `routineName` snapshot intacto — no se rompe nada.

## Pieza 4 — Backup / restore (footer del Log)

Reemplaza al botón "CSV" del header. Dos botones al pie de la pantalla Log,
debajo de la lista de sesiones: **"Exportar backup"** e **"Importar
backup"**.

**Exportar backup**: genera y descarga un `.json` con las tres claves de
`localStorage` completas — `log`, `hierro_routines`, `hierro_week` — más un
campo `exported` (fecha ISO) y `version` (por si el formato cambia a
futuro). Es un backup total, pensado para restaurar tal cual, no para abrir
en Excel (eso ya no lo cubre nada — se elimina `exportCSV()` sin
reemplazo en ese formato).

**Importar backup**: input de archivo, valida que el JSON tenga la marca
esperada (`version` presente + las 3 claves con la forma correcta), y
**reemplaza** `log`, `hierro_routines` y `hierro_week` enteros — a
diferencia del import de rutinas (Pieza 5), que mergea, este es un
restore real: pisa lo que había. Por eso pide confirmación explícita antes
("Esto va a reemplazar todos tus datos actuales por los del backup. ¿Confirmás?")
con la misma UI de confirmación que ya usa el botón de borrar
sesión/rutina.

## Pieza 5 — Importar / exportar una rutina individual

Formato de archivo distinto al backup — chico, pensado para compartir o
guardar UNA rutina aparte (misma idea que `plan-share.js` de openGym, pero
sin el plan semanal ni los ejercicios custom, que acá no existen).

**Exportar rutina**: si hay más de una guardada, primero pide elegir cuál
(reusa un picker simple tipo lista); genera un `.json`:
```js
// { hierro_routine: 1, name, exercises: [{ exId, cat, sets, reps }] }
```

**Importar rutina**: input de archivo, valida la marca `hierro_routine`,
agrega la rutina a `hierro_routines` con un `id` nuevo (nunca pisa una
existente, nunca toca `hierro_week`) — mergea, no reemplaza. Si un `exId`
del archivo no existe en el `EXERCISES` cargado actualmente, ese ejercicio
se descarta de la rutina importada (igual criterio que `parsePlan` de
openGym) en vez de dejar una referencia rota.

## Verificación

Sin test runner (HTML estático). Verificación manual en browser:

1. **Estado inicial (sin rutinas)**: el bloque "Plan semanal" se muestra
   igual (semana en "—", los 3 botones visibles) — eso es esperado, ya no
   se oculta. "+ Sesión libre" sigue abriendo directo el editor en blanco,
   sin ninguna hoja ni pregunta de por medio.
2. **Crear rutina desde "+ Nueva rutina"**: armar una con 2-3 ejercicios y
   sets/reps objetivo. Confirmar que aparece en la lista.
3. **Crear rutina tocando un día vacío**: tocar un día en "—", confirmar
   que arranca el mismo flujo de creación y que al guardar ese día queda
   asignado automáticamente.
4. **Tocar un día con rutina asignada**: confirmar que arranca la sesión
   directo (sin hoja intermedia), con los ejercicios precargados y el
   objetivo de reps como placeholder.
5. **Freestyle sigue andando**: con rutinas ya creadas, "+ Sesión libre"
   sigue abriendo el editor vacío, sin ejercicios precargados, sin
   ninguna referencia a rutinas en el camino.
6. **Borrar rutina asignada**: confirmar que el día vuelve a "—" y que una
   sesión pasada que la usó conserva su nombre en el historial.
6b. **Reprogramar "solo hoy"**: con un día que ya tiene rutina de la
   plantilla, mantener presionado, elegir otra rutina (o "Descanso") y
   "Solo hoy". Confirmar que la celda muestra la marca "reprogramado" y la
   nueva rutina/descanso, pero que `hierro_week` no cambió — recargar la
   página y confirmar que otro día con el mismo día de semana (ej. la
   semana que viene, cambiando la fecha del sistema o revisando el cálculo
   a mano) sigue mostrando la rutina original de la plantilla.
6c. **Cambiar la plantilla desde el long-press**: repetir el paso anterior
   pero eligiendo "Cambiar todos los {día}". Confirmar que `hierro_week`
   cambió para ese día de semana, y que si esa fecha tenía un override
   propio de un paso previo, se limpió.
7. **Exportar/importar rutina individual**: exportar una rutina, confirmar
   el JSON descargado tiene la marca `hierro_routine`. Importarla de nuevo
   (mismo archivo) y confirmar que se agrega como rutina NUEVA (no
   duplicado silencioso, no reemplazo) — queda una lista con 2 rutinas de
   igual contenido y nombre, cada una con su propio id.
8. **Backup completo**: cargar algunas sesiones, rutinas y plan semanal.
   Exportar backup, confirmar el JSON tiene las 3 claves. Modificar algo
   (borrar una sesión), importar el backup exportado, confirmar el pedido
   de confirmación, aceptar, y confirmar que el estado vuelve exactamente
   al momento del export (sesión borrada reaparece).
9. **CSV eliminado**: confirmar que el botón "CSV" ya no está en el header
   y que `exportCSV()` no se llama desde ningún lado.
