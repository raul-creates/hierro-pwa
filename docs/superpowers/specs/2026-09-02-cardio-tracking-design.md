# HIERRO — Registro de cardio

Fecha: 2026-09-02

## Contexto

Item D5 del backlog (último de los 5 sub-proyectos de D — paridad con
openGym), y el más grande de los cinco porque toca la forma de un set,
de la que dependen B (progresión automática) y C (estimación de 1RM).

Hoy un set siempre tiene la forma `{weight, reps}`, pensada para
ejercicios de pesas. El dataset de ejercicios ya trae `category ===
'cardio'` (cinta, bici, remo, elíptico, etc), y "Cardio" ya es un grupo
muscular elegible en rutinas y freestyle (`GROUPS`, `GROUP_MERGE`) —
hoy se puede agregar un ejercicio de cardio a un entreno, pero se
muestra con los mismos campos de peso/reps de un ejercicio de pesas,
que no tienen sentido para él.

Alcance decidido con el usuario: solo duración (minutos), sin
distancia. `weight` queda siempre vacío, `reps` se reinterpreta como
duración — sin campos nuevos en el modelo. B y C se desactivan
completamente para cardio en vez de intentar una métrica de progresión
de cardio nueva (eso queda fuera de alcance).

## Alcance

**Cambia**: cómo se renderiza la fila de un set en el modo guiado
cuando el ejercicio es de cardio (oculta peso, relabelea reps a
"Duración (min)"); `suggestSets`/`applySuggestedSets` (B) para que no
sugieran nada en cardio; la sección de progresión de la Guía (C) para
que muestre un mensaje en vez del gráfico peso/volumen/1RM cuando el
ejercicio es cardio.

**No cambia**: el modelo de datos guardado (`{weight, reps}` se
mantiene igual, `weight` simplemente no se usa para cardio); Stats;
backup/export; `finishWorkout` (ya copia `weight`/`reps` tal cual,
sin importarle su significado); el flujo de agregar un ejercicio de
cardio a una rutina o al entreno (ya funciona, "Cardio" ya es un grupo
elegible).

**Fuera de alcance explícitamente**: distancia; una métrica de
progresión específica para cardio (duración total por sesión, por
ejemplo) — quedó descartado en la conversación de diseño para no
agrandar D5; sets de cardio con distintos tipos de intervalos
(sprints/descanso) — se sigue usando el mismo array `sets[]` genérico,
sin estructura especial para intervalos.

## Detección de cardio

En cualquier punto donde ya se resuelve el ejercicio actual (`ex =
EXERCISES.find(e=>e.id===...)`), se agrega:

```js
const isCardio = ex && GROUP_MERGE[ex.category]==='cardio';
```

Mismo patrón ya usado para `isBodyweight` en D2
(`ex?.equipment==='body weight'`). No hace falta un flag nuevo en el
modelo — se deriva del dataset en cada render, igual que D2.

## Modo guiado — fila del set

`buildWorkoutSetRow(entry, si, isBodyweight, isCardio)` gana un cuarto
parámetro. Cuando `isCardio` es true:

- El bloque `.set-iw.stp-wrap` del peso (con sus botones −/+ e input)
  **no se renderiza** — a diferencia de D2 (peso corporal), donde el
  campo de peso se mantenía como "extra" opcional, en cardio no hay
  ningún concepto de peso que registrar.
- El campo de "reps" cambia su placeholder/semántica a minutos: los
  botones −/+ siguen sumando/restando de a 1 (mismo mecanismo que hoy,
  sin incrementos especiales), pero conceptualmente representan
  minutos.

En `renderWorkoutScreen`, el header de columnas (`sets-hdr`) también
se ajusta: sin columna "Peso" cuando es cardio, y "Duración (min)" en
vez de "Reps".

El tag "Peso corporal" (D2) no debería aparecer nunca simultáneamente
con cardio en la práctica (son `equipment`/`category` distintos en el
dataset), así que no hace falta lógica de prioridad entre ambos —
simplemente `isBodyweight` será `false` para un ejercicio de cardio.

## B — progresión automática

`suggestSets(exId)` gana un guard temprano: si el ejercicio
correspondiente a `exId` es cardio, retorna `null` inmediatamente (el
mismo valor que ya retorna hoy cuando no hay historial). Esto hace que
`applySuggestedSets` no pre-cargue nada para cardio, sin tocar sus
otros call-sites (`buildActiveWorkout`, `selectPickerExercise`,
`addToToday` ×2) — el guard vive en un solo lugar.

## C — progresión/1RM en la Guía

En `renderGuideDetail`, antes de construir `progressionHTML` con el
historial y el toggle Peso máx/Volumen/1RM, se agrega una rama: si
`GROUP_MERGE[ex.category]==='cardio'`, se muestra en su lugar:

```html
<div class="gd-section">Progresión</div>
<div class="gd-prog-empty">Sin datos de progresión para cardio.</div>
```

(mismo bloque/clase ya usado hoy para el caso "una sola sesión
registrada" — se reutiliza el estilo, no hace falta CSS nuevo).

## Testing

Sin test runner (HTML estático). Verificación manual en browser:

1. Agregar un ejercicio de categoría cardio (ej. "cinta caminadora") a
   un entreno freestyle — confirmar que la fila del set no muestra
   campo de peso, y que el segundo campo dice "Duración (min)" en el
   header.
2. Cargar una duración, completar el set, terminar el entreno — abrir
   la sesión guardada en el Log/editar y confirmar que el valor
   persiste.
3. Repetir el mismo ejercicio de cardio en una sesión nueva — confirmar
   que el campo de duración **no** viene pre-cargado (B desactivado).
4. Ir a la Guía, abrir el detalle de ese ejercicio de cardio con 2+
   sesiones registradas — confirmar que se ve el mensaje "Sin datos de
   progresión para cardio" en vez del gráfico.
5. Confirmar que un ejercicio de pesas normal y uno de peso corporal
   (D2) siguen funcionando exactamente igual que antes (sin regresión).
