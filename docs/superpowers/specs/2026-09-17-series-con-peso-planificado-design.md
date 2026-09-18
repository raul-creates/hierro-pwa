# Series con peso planificado — Design

**Fecha:** 2026-09-17
**Sub-proyecto:** 3 de 3 del feedback sobre el editor de rutinas (ver `docs/BACKLOG.md`, sección "Sub-proyecto 3 — Editor de ejercicios de rutina")

## Contexto

Feedback recibido en la misma sesión que originó el sub-proyecto de rutinas independientes por día, sobre el editor de ejercicios de una rutina:

1. Botón "Terminar" explícito al editar una rutina — **ya implementado** (commit `289729e`, fuera de esta spec, no tocaba modelo de datos).
2. Terminología "set" → "serie" en toda la app — **ya implementado** (mismo commit; la app ya decía "serie" en casi todos lados, solo quedaba un label suelto).
3. El editor de rutina hoy solo permite definir "cantidad de series + reps objetivo" (un número + un rango de texto tipo "8-10"), sin peso. Pasar a series individuales editables, cada una con su propio peso y reps — **esta spec**.

Ampliado durante el brainstorming:
- Ajuste global en Ajustes para prender/apagar la progresión automática.
- Toggles opcionales por ejercicio: "mismo peso para todas las series" y "mismas reps para todas las series", pensados para que un profe no tenga que repetir el mismo número en cada fila.
- La progresión automática pasa a calcularse **por serie**, no con un único objetivo compartido — habilita esquemas piramidales reales (ej. 12/10/8 reps con peso creciente).

## Decisión de compatibilidad: normalizar en los puntos de entrada, no migrar en el guardado

Hoy cada ejercicio de una rutina guarda `sets: 3, reps: '8-10'` (cantidad + rango). Pasa a `sets: [{weight, reps}, {weight, reps}, ...]` — misma forma que ya usa el entrenamiento en vivo (`entry.sets`, sin el campo `done` que ahí es exclusivo de la sesión activa).

Hay rutinas ya guardadas (locales, en plantillas hardcodeadas, y en rutinas compartidas/importadas por otros usuarios) con el formato viejo. En vez de escribir un migrador que se corre una vez, se agrega una función pura `normalizeRoutineExercise(ex)` que se llama en **todos los puntos donde una rutina entra al sistema**:

- `loadRoutines()` (carga inicial desde `localStorage`)
- `cleanImportedRoutineData()` (importar archivo `.json`)
- `acceptSharedRoutine()` (aceptar rutina recibida por link)
- `loadTemplate()` (cargar una de las `STARTER_TEMPLATES` hardcodeadas)

```js
function normalizeRoutineExercise(ex){
  if(Array.isArray(ex.sets)) return ex;
  const count = ex.sets || 1;
  return {...ex, sets: Array.from({length:count}, ()=>({weight:'', reps:''}))};
}
```

Si `ex.sets` ya es un array, no toca nada (formato nuevo). Si es un número (formato viejo), lo convierte a esa cantidad de series **con peso y reps en blanco** — no se intenta parsear el rango de texto viejo (ej. "8-10") a un número de reps por serie, porque sería inventar un dato que el usuario nunca cargó explícitamente por serie. El usuario ve la misma cantidad de series que tenía antes, ahora editables una por una.

Esto significa que `STARTER_TEMPLATES` (los ~20 objetos hardcodeados en `index.html`, todos con formato viejo `sets:N,reps:'X'`) **no se reescriben** — se normalizan al vuelo cuando se cargan vía `loadTemplate()`, igual que cualquier rutina vieja de un usuario real.

## Diseño

### A. Ajuste global: progresión automática (Ajustes)

Nuevo toggle en `view-settings`, mismo patrón visual que el de escala de esfuerzo (RPE/RIR): dos botones "Activada" / "Desactivada". Persiste en `localStorage` bajo `AUTO_PROGRESSION_KEY = 'hierro_auto_progression'`, variable global `autoProgressionEnabled` (booleano, default `true` — no cambia el comportamiento de nadie que ya usa la app hoy).

### B. Editor de rutina: filas de serie individuales

`buildRoutineExBlock` reemplaza la fila única "Series / Reps objetivo" (un input numérico de cantidad + un input de texto de rango) por:

- Una fila por serie, cada una con dos inputs numéricos con steppers +/- (mismo estilo visual que `buildWorkoutSetRow` en el entrenamiento en vivo): peso (placeholder "Corporal" si el ejercicio es de peso corporal, vía la misma lógica que ya existe para eso) y reps.
- Un botón "+ Serie" al pie de la lista de series de ese ejercicio (agrega `{weight:'',reps:''}`).
- Un botón para quitar una serie puntual (deshabilitado si solo queda una — mismo patrón que "no se puede dejar un ejercicio sin ninguna serie").
- Dos checkboxes: **"Mismo peso para todas las series"** y **"Mismas reps para todas las series"**, independientes entre sí. Al activar uno, todas las series pasan a tener el valor que tenía la primera serie, y el editor colapsa esa columna a un único input compartido (editarlo actualiza todas las series). Al desactivar, vuelve a mostrar inputs individuales sin tocar los valores ya cargados (quedan como estaban, ahora editables por separado).

Nuevas funciones: `updateRoutineSetField(exId, si, field, val)`, `addRoutineSet(exId)`, `removeRoutineSet(exId, si)`, `toggleSameWeight(exId, checked)`, `toggleSameReps(exId, checked)`, `updateRoutineSameWeight(exId, val)`, `updateRoutineSameReps(exId, val)`. Se elimina `updateRoutineField` (operaba sobre los campos planos `sets`/`reps`, que dejan de existir en ese formato).

`emptyRoutineEx()` cambia su forma inicial:
```js
function emptyRoutineEx(){return{id:uid(),cat:'',exId:'',sets:[{weight:'',reps:''}],perSide:false,linkedToNext:false,cardioDuration:false,sameWeightForAllSets:false,sameRepsForAllSets:false};}
```

### C. Arrancar una sesión: copia directa en vez de series vacías

`buildActiveWorkout`, rama de rutina (no `editingSession`): en vez de generar `Array.from({length: re.sets||1}, ()=>({weight:'', reps:'', done:false}))`, copia directamente `re.sets` (ya es el array planificado):

```js
sets: re.sets.map(s=>({weight: s.weight||'', reps: s.reps||'', done:false}))
```

`entry.targetReps` deja de ser la fuente de la progresión automática (ver sección D), pero se mantiene poblado como valor de referencia/placeholder para el input de reps en `buildWorkoutSetRow` (ya lo usa así, sin cambios en esa función): `targetReps: (re.sets[0] && re.sets[0].reps) || ''`.

### D. Progresión automática por serie, no por objetivo compartido

Hoy `suggestSets(exId)` calcula una única sugerencia comparando contra un solo objetivo de reps (`e.targetReps` de la última sesión). Pasa a calcularse **serie por serie**, comparando la serie *i* de la última sesión contra el objetivo planificado de esa misma serie *i* en la rutina actual:

```js
function suggestSetValue(exId, si, plannedReps){
  const s=mostRecentSessionWith(exId);
  if(!s) return null;
  const e=s.exercises.find(x=>x.exId===exId);
  if(entryCardioDuration(e)) return null;
  const prevSet=e.sets[si];
  if(!prevSet) return null;
  const base=parseFloat(plannedReps);
  if(!base) return null;
  if(prevSet.weight==='' || prevSet.weight==null || prevSet.reps==='' || prevSet.reps==null) return null;
  const top=base+4;
  const weight=parseFloat(prevSet.weight)||0;
  const reps=parseFloat(prevSet.reps)||0;
  if(reps<base) return {weight, reps:base};
  if(reps>=top) return {weight:Math.round((weight+2.5)*100)/100, reps:base};
  return {weight, reps:Math.min(reps+1, top)};
}
function applySuggestedSets(entry){
  if(!entry || !entry.exId) return;
  if(entry.cardioDuration) return;
  if(!autoProgressionEnabled) return;
  entry.sets.forEach((s,si)=>{
    const sug=suggestSetValue(entry.exId, si, s.reps);
    if(sug){ s.weight=sug.weight; s.reps=sug.reps; }
  });
}
```

Comportamiento resultante, por serie:
- **`autoProgressionEnabled=true`** (default): si existe una sesión anterior con esa misma serie (mismo índice) resuelta, la sugerencia **sobreescribe** lo que se copió del plan de la rutina (sección C) — igual que hoy, la sugerencia manda cuando hay historial. Si no hay sesión anterior con esa serie, se respeta el peso/reps planificado en la rutina (en vez de arrancar en blanco, que es lo que pasa hoy).
- **`autoProgressionEnabled=false`**: `applySuggestedSets` no hace nada — lo planificado en la rutina se carga siempre tal cual (o vacío si esa serie no tenía nada planificado).

Si la cantidad de series cambió entre la última sesión y la rutina actual (por ejemplo, la última vez el ejercicio tenía 4 series y ahora la rutina tiene 3), las series sin contraparte en la sesión anterior (`prevSet` inexistente) simplemente conservan su valor planificado — no rompe ni se recorta el array.

## Fuera de alcance (decidido explícitamente por el usuario)

- Migrar/reescribir los datos ya guardados en `localStorage` o en `STARTER_TEMPLATES` — se normalizan al vuelo, nunca se reescriben en el guardado (ver "Decisión de compatibilidad").
- Intentar reconstruir un objetivo de reps por serie a partir del rango de texto viejo ("8-10") al normalizar — las series migradas arrancan con peso y reps en blanco.
- Cualquier UI para copiar/pegar series entre ejercicios o rutinas — no se pidió, no se agrega.

## Testing

Sin test runner en este repo (single-file, sin build). Verificación manual en navegador, sirviendo localmente, cubriendo:

1. Crear una rutina nueva, agregar un ejercicio con 3 series, cargar peso y reps distintos en cada una. Recargar la página — confirmar que persistió (autoguardado, sin botón Guardar).
2. Activar "Mismo peso para todas las series" en un ejercicio con pesos distintos ya cargados — confirmar que las 3 series pasan a mostrar el valor de la primera, y que el editor colapsa a un único input. Cambiar ese input — confirmar que las 3 series lo reciben. Desactivar el toggle — confirmar que vuelven los 3 inputs individuales, todos con el último valor compartido (no se pierde el dato).
3. Repetir el punto 2 con "Mismas reps para todas las series", de forma independiente (activar uno sin afectar el otro).
4. Cargar una rutina de una plantilla inicial (`STARTER_TEMPLATES`) — confirmar que sus ejercicios (formato viejo, hardcodeado) se ven correctamente como N series con peso/reps en blanco, editables una por una, sin haber tocado el array hardcodeado del código.
5. Con datos existentes de antes de este cambio (una rutina real guardada con el formato viejo `sets:3,reps:'8-10'` en `localStorage`) — recargar la app y confirmar que se ve y se puede editar sin errores ni pérdida de la cantidad de series.
6. Compartir una rutina por link y aceptarla en otra sesión/pestaña — confirmar que llega correctamente normalizada.
7. Progresión automática ON: hacer una sesión con pesos/reps concretos en cada serie de un ejercicio, terminarla. Arrancar una sesión nueva con ese mismo ejercicio — confirmar que cada serie sugiere en base a su propia serie correspondiente de la sesión anterior (no un solo objetivo compartido), y que si la rutina tenía un peso planificado distinto al sugerido, gana la sugerencia.
8. Mismo escenario pero sin haber hecho nunca ese ejercicio antes (sin historial) — confirmar que se carga el peso/reps planificado en la rutina tal cual, sin sugerencia.
9. Progresión automática OFF (cambiarlo en Ajustes) — repetir el punto 7 y confirmar que esta vez se carga siempre lo planificado en la rutina, ignorando el historial.
10. Cambiar la cantidad de series de un ejercicio entre una sesión y la siguiente (agregar o quitar una serie en el editor) — confirmar que la sugerencia solo aplica a las series que tienen contraparte en la sesión anterior, y las demás mantienen su valor planificado sin romper nada.
