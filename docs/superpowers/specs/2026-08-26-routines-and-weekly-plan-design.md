# HIERRO — Rutinas opcionales + plan semanal

Fecha: 2026-08-26

## Contexto

Hoy HIERRO es 100% freestyle: cada sesión se arma eligiendo ejercicios uno
por uno desde el picker (Guía). No existe ningún concepto de "rutina" ni de
plan semanal. El uso real hoy es justamente ese: loguear lo que se entrena
cada día que se va, sin plantilla fija.

Este spec agrega rutinas y plan semanal como una capa **opcional** sobre ese
flujo, inspirada en cómo lo resuelve openGym (self-hosted training tracker,
AGPL — revisado como referencia de diseño, sin copiar código directo por la
licencia). La regla no negociable: si no hay ninguna rutina guardada, el
comportamiento de HIERRO no cambia ni un pixel respecto a hoy.

Quedan afuera de este spec (sub-proyectos separados, a definir después):

- Progresión automática de peso/reps (lo que openGym llama "progression
  engine" — lineal, Greyskull LP, etc.). Las rutinas acá solo guardan un
  objetivo de referencia (texto libre), nunca calculan ni fuerzan un valor.
- Export/import de rutinas como archivo (JSON compartible, como
  `plan-share.js` de openGym). Buena idea a futuro, no entra acá.
- Agrandar la miniatura de ejercicio en la pantalla de carga de sesión
  (pedido suelto, anotado para una iteración de ajustes visuales aparte).

## Alcance

Se agregan dos claves nuevas a `localStorage`, junto a `STORAGE_KEY` (log)
ya existente. No se toca el modelo de `log`/sesiones salvo un campo opcional
nuevo. No se agrega ninguna pestaña al bottom nav — nav queda igual
(Log / Guía / Stats). Todo sigue en `index.html` (sin build step, sin
dependencias nuevas), siguiendo el patrón del proyecto.

## Modelo de datos

```js
// localStorage key: 'hierro_routines'
// [{ id, name, exercises: [{ exId, cat, sets, reps }] }]
// - sets: número entero (ej. 3)
// - reps: texto libre (ej. "8-10", "AMRAP") — es una referencia visual,
//   nunca se valida ni se usa para calcular nada.

// localStorage key: 'hierro_week'
// { "0": routineId|null, "1": routineId|null, ..., "6": routineId|null }
// Claves 0-6 = Date.getDay() (0 = domingo), igual convención que el resto
// del código. Ausencia de clave o null = sin rutina asignada ese día.
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
las sesiones pasadas no cambian ni se rompen. Es exactamente el mismo
principio que usa openGym en `plan-share.js` (import nunca pisa lo
existente, ID propios por sesión).

## Pieza 1 — Tira semanal en el Log

Arriba de la lista de sesiones (`#log-content`, antes de las session-cards),
una fila nueva de 7 celdas, una por día de la semana (lunes a domingo, orden
visual fijo aunque `Date.getDay()` empiece en domingo — mismo mapeo que ya
resuelve `DAYN`-style helpers en proyectos hermanos).

Cada celda muestra:
- Abreviatura del día (L M M J V S D).
- Nombre corto de la rutina asignada ese día de la semana, o "—" si no hay
  ninguna.
- El día de **hoy** resaltado (mismo color de acento `#FFD200` que el resto
  de la UI activa).

**Tocar una celda** abre una hoja/overlay chico (reusa el patrón visual del
picker ya existente) con la lista de rutinas guardadas + una opción
"Sin rutina", para asignar o limpiar ese día de la semana. Esto solo escribe
en `hierro_week` — nunca crea ni borra sesiones, nunca fuerza nada.

**Si `hierro_routines` está vacío** (nadie guardó ninguna rutina todavía):
la tira semanal completa NO se muestra. El Log queda exactamente como hoy.

## Pieza 2 — Flujo de "+ Sesión"

**Si `hierro_routines` está vacío**: comportamiento idéntico a hoy — el
botón "+ Sesión" abre directo el editor en blanco (`newSession()` sin
cambios). Cero fricción para el uso freestyle actual.

**Si hay rutinas guardadas**: "+ Sesión" abre primero una hoja chica con
opciones, en este orden:

1. Si hoy tiene una rutina asignada en `hierro_week` → "Usar {nombre}
   (hoy)", resaltada como opción principal.
2. "Elegir otra rutina" → lista el resto de rutinas guardadas.
3. **"Empezar en blanco"** → siempre presente, nunca oculta ni relegada al
   fondo sin más. Es la opción que preserva el uso freestyle de hoy.
4. "Gestionar rutinas" → lleva a la Pieza 3.

Elegir una rutina llama a una función nueva `newSessionFromRoutine(routine)`
que arma una sesión igual que `emptySession()`, pero con
`exercises: routine.exercises.map(re => ({ id: uid(), cat: re.cat, exId:
re.exId, sets: Array(re.sets || 1).fill(null).map(emptySet) }))` — mismos
bloques que ya arma el editor hoy, solo pre-poblados. El campo `reps`
objetivo de la rutina se muestra como placeholder/hint visual en el primer
input de reps de cada bloque (no se escribe como valor real — el usuario
sigue cargando lo que hizo ese día). La sesión arranca con
`routineId`/`routineName` seteados; "Empezar en blanco" arranca ambos en
`null`, igual que hoy.

## Pieza 3 — Gestionar rutinas

Pantalla nueva (no es una vista del bottom nav — se llega solo desde la
hoja de "+ Sesión", como una vista más del stack tipo `view-edit`).

- Lista de rutinas guardadas: nombre + cantidad de ejercicios, con editar y
  borrar por ítem.
- "+ Rutina": pide un nombre, y reusa el picker de ejercicios ya existente
  del editor de sesiones (mismo overlay, mismo buscador, misma sección
  "Recientes") para ir agregando ejercicios. Cada ejercicio agregado suma
  dos campos chicos: sets objetivo (number input) y reps objetivo (text
  input, placeholder "ej. 8-10").
- Borrar una rutina: si estaba asignada a algún día en `hierro_week`, esos
  días quedan sin rutina (`null`) — no rompe nada, no hay referencias
  colgadas. Las sesiones pasadas que la usaron conservan su
  `routineName` snapshot intacto.

## Verificación

Sin test runner (HTML estático). Verificación manual en browser:

1. **Estado inicial (sin rutinas)**: confirmar que el Log no muestra tira
   semanal, y que "+ Sesión" abre directo el editor en blanco — cero
   diferencia visual/funcional contra el comportamiento actual.
2. **Crear una rutina**: desde "+ Sesión" → "Gestionar rutinas" → "+
   Rutina", armar una con 2-3 ejercicios y sets/reps objetivo. Confirmar
   que aparece en la lista.
3. **Tira semanal**: confirmar que ahora sí aparece en el Log, con todos los
   días en "—". Asignar la rutina creada a "hoy", confirmar que la celda de
   hoy la muestra y queda resaltada.
4. **"+ Sesión" con plan**: tocar "+ Sesión", confirmar que aparece la hoja
   con "Usar {rutina} (hoy)" primero, y "Empezar en blanco" siempre visible.
   Elegir la rutina, confirmar que el editor abre con los ejercicios
   pre-cargados y el objetivo de reps como placeholder, no como valor fijo.
   Guardar, confirmar que la session-card en el Log muestra de qué rutina
   salió.
5. **Freestyle sigue andando**: con rutinas ya creadas, tocar "+ Sesión" →
   "Empezar en blanco", confirmar que abre el editor vacío igual que
   siempre, sin ningún ejercicio pre-cargado.
6. **Borrar rutina asignada**: borrar una rutina que estaba asignada a un
   día de la semana, confirmar que esa celda vuelve a "—" y que una sesión
   pasada que la usó sigue mostrando su nombre en el historial.
