# HIERRO — Swipe para borrar

Fecha: 2026-09-10

## Contexto

Idea suelta del backlog, surgida charlando el item D1 (RPE): reemplazar
los botones de borrar explícitos (🗑️/✕) por un gesto de swipe,
consistente en toda la app. Hoy hay **4 lugares** con ese patrón, cada
uno con su propio botón y (en 2 de los 4 casos) sin ninguna
confirmación antes de borrar:

| Lugar | Contenedor | Fila | Función de borrado | ¿Confirm hoy? |
|---|---|---|---|---|
| Sesiones del Log | `#log-content` | `.session-card` (en `renderLog`, index.html ~L764) | `deleteSession(id)` (~L820) | Sí |
| Rutinas de la lista | `#routines-list` | `.session-card` (en `renderRoutinesList`, ~L1431) | `deleteRoutine(id)` (~L1525) | Sí |
| Sets del modo guiado | `#wk-body` (no `#wk-sets` — ver más abajo) | `.set-row` (en `buildWorkoutSetRow`, ~L1033) | `removeWorkoutSet(si)` (~L1154) | No |
| Ejercicios del editor de rutina | `#routine-exercises-container` | `.ex-block` (en `buildRoutineExBlock`, ~L1471) | `removeRoutineExercise(id)` (~L1509) | No |

Este spec cubre las 4 listas de una sola vez porque comparten el mismo
patrón (una lista de filas, cada una con una acción de borrado) y la
implementación es un único mecanismo reusable, no 4 features separadas.

## Alcance

**Cambia**: cómo se dispara el borrado en las 4 listas de arriba
(gesto de swipe en pantallas táctiles), y agrega confirmación a
`removeWorkoutSet`/`removeRoutineExercise` (hoy borran sin preguntar
nada — inconsistente con las otras dos, que sí confirman).

**No cambia**: el botón 🗑️/✕ explícito sigue existiendo en el DOM y
visible en **desktop** (sin touch) — no se reemplaza ahí, solo se
oculta vía CSS en pantallas táctiles. No se toca ninguna otra
interacción de estas 4 pantallas (edición, selección, etc).

**Fuera de alcance explícitamente**: swipe con mouse/drag en desktop
(decisión ya tomada — en desktop se mantiene el botón, sin inventar un
gesto de arrastre con mouse que nadie va a descubrir solo); swipe hacia
la derecha o cualquier acción que no sea borrar (ej. no hay "swipe para
archivar" ni nada similar); librerías externas (se implementa a mano
con Touch Events, cero dependencias nuevas, consistente con el resto
de la app).

## Detección de gesto: horizontal vs. vertical

Las 4 listas viven dentro de contenedores con scroll vertical. Un
swipe horizontal de borrado **no debe** interferir con el scroll
normal de la lista, y viceversa: si el usuario arranca a scrollear
verticalmente, el gesto de borrado no debe activarse a mitad de camino.

Solución: en `touchmove`, no se decide la dirección del gesto hasta
que el movimiento supera un umbral chico (8px) en cualquier eje. En
ese momento se "bloquea" la dirección (`'x'` u `'y'`) para el resto del
gesto:

- Si se bloquea en `'y'`: se suelta la fila (no se aplica ninguna
  transformación) y el scroll nativo del navegador sigue su curso
  normal, sin `preventDefault()`.
- Si se bloquea en `'x'`: se llama `preventDefault()` en cada
  `touchmove` subsiguiente (para que el navegador no intente scrollear
  la página mientras se arrastra la fila), y se aplica la
  transformación visual descripta abajo.

Un toque simple (sin movimiento superando el umbral en ningún eje) no
bloquea ninguna dirección — el `touchend` no dispara nada, y el tap
normal sobre cualquier elemento interactivo de la fila (un checkbox,
un `<select>`, un input) funciona exactamente igual que hoy, porque
nunca se llama `preventDefault()` en ese caso.

## Estructura HTML de una fila borrable

Cada una de las 4 filas se envuelve así (el contenido interno de cada
una NO cambia, solo se envuelve):

```html
<div class="swipe-row" data-delete-fn="removeWorkoutSet" data-delete-arg="3" data-swipe-disabled="false">
  <div class="swipe-bg"><span class="swipe-bg-icon">🗑️</span><span>Borrar</span></div>
  <div class="swipe-content">
    <!-- contenido exacto que ya existe hoy para esa fila -->
  </div>
</div>
```

- `data-delete-fn`: nombre de la función global a invocar al confirmar
  el swipe (uno de `deleteSession`, `deleteRoutine`,
  `removeWorkoutSet`, `removeRoutineExercise`).
- `data-delete-arg`: el argumento que recibe esa función (el `id` del
  set/sesión/rutina/ejercicio; para `removeWorkoutSet` es el índice
  `si`, que ya es lo que la función espera hoy).
- `data-swipe-disabled`: `"true"` cuando el botón explícito de esa fila
  también estaría deshabilitado hoy (ej. `.set-row` con un solo set,
  `.ex-block` cuando `editRoutine.exercises.length<=1`) — el handler
  delegado ignora el gesto por completo en ese caso, igual que el botón
  deshabilitado no responde a click hoy.

`removeWorkoutSet`/`removeRoutineExercise` ya tienen sus propios guards
internos contra el caso "es la última fila" (`if(entry.sets.length<=1)
return;` / equivalente), así que `data-swipe-disabled` es una mejora de
UX (no arrancar el gesto en una fila que no puede borrarse) sobre una
red de seguridad que ya existe en la lógica — no reemplaza esos guards.

Para las **rutinas de la lista**, el wrapper `.swipe-row` solo se
agrega cuando `routinePickMode` es `null` (modo normal) — en modo
exportar/compartir (`routinePickMode==='export'|'share'`) no hay acción
de borrado disponible hoy tampoco, así que ahí no se envuelve nada.

## CSS

```css
.swipe-row{position:relative;overflow:hidden}
.swipe-bg{position:absolute;inset:0;background:#c0392b;display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:0 20px;color:#fff;font-weight:700;opacity:0}
.swipe-content{position:relative;background:inherit;transition:transform 0.15s ease}
@media (hover: none){
  .swipe-row .card-actions,
  .swipe-row .btn-rm-set,
  .swipe-row .btn-remove-ex{display:none}
}
```

`background:inherit` en `.swipe-content` asegura que, al deslizarse
sobre `.swipe-bg`, tape completamente el fondo rojo detrás (necesario
porque `.session-card`/`.set-row`/`.ex-block` ya tienen sus propios
fondos definidos en otro lado — `inherit` toma el fondo del padre
`.swipe-row`, que a su vez no define background propio, dejando pasar
el de la clase original de la fila sin duplicar reglas).

`@media (hover: none)` es la detección estándar sin JS de "dispositivo
sin mouse" (todos los navegadores mobile la cumplen) — oculta ahí los
botones explícitos que quedan redundantes una vez que el swipe está
disponible, sin tocar su comportamiento en desktop.

## El handler genérico

Una única función, llamada una vez por contenedor al iniciar la app
(no en cada render). Los contenedores tienen que ser elementos que
**nunca se recrean** — solo se les reemplaza el `innerHTML` por dentro
— para que el listener delegado sobreviva a todos los re-renders
futuros sin volver a engancharse:

- `#log-content` (`renderLog`) — estático, ok.
- `#routines-list` (`renderRoutinesList`) — estático, ok.
- `#routine-exercises-container` (`renderRoutineExercises`) — estático, ok.
- **`#wk-sets` NO sirve**: es parte del `innerHTML` que
  `renderWorkoutScreen()` le asigna a `#wk-body` (index.html, función
  `renderWorkoutScreen`, línea del `body.innerHTML=` que arma toda la
  pantalla) — se recrea de cero en cada render, así que un listener
  puesto ahí se pierde apenas cambiás de ejercicio. Hay que delegar
  sobre **`#wk-body`** en su lugar (ese sí es estático — el `<div
  class="wk-body" id="wk-body"></div>` vive en el HTML fijo, y
  `renderWorkoutScreen` solo reemplaza su contenido, no el div en sí).
  `#wk-body` contiene más que los sets (también el nombre del
  ejercicio, los botones de navegación, etc.), pero eso no importa:
  `closest('.swipe-row')` en el handler ya filtra a qué elemento
  aplica el gesto, delegar desde más arriba en el árbol no cambia el
  comportamiento.

```js
function initSwipeDelete(container){
  const THRESHOLD=60, MAX=88;
  let row=null, startX=0, startY=0, dx=0, axis=null;
  container.addEventListener('touchstart', e=>{
    row=e.target.closest('.swipe-row');
    if(!row || row.dataset.swipeDisabled==='true'){ row=null; return; }
    startX=e.touches[0].clientX; startY=e.touches[0].clientY; dx=0; axis=null;
  }, {passive:true});
  container.addEventListener('touchmove', e=>{
    if(!row) return;
    const t=e.touches[0];
    const ddx=t.clientX-startX, ddy=t.clientY-startY;
    if(axis===null){
      if(Math.abs(ddx)<8 && Math.abs(ddy)<8) return;
      axis = Math.abs(ddx)>Math.abs(ddy) ? 'x' : 'y';
      if(axis==='y'){ row=null; return; }
    }
    dx=Math.max(-MAX, Math.min(0, ddx));
    row.querySelector('.swipe-content').style.transform=`translateX(${dx}px)`;
    row.querySelector('.swipe-bg').style.opacity=String(Math.min(1,(-dx)/THRESHOLD));
    e.preventDefault();
  }, {passive:false});
  container.addEventListener('touchend', ()=>{
    if(!row) return;
    const r=row, wasThreshold=(-dx)>=THRESHOLD;
    r.querySelector('.swipe-content').style.transform='translateX(0)';
    r.querySelector('.swipe-bg').style.opacity='0';
    if(wasThreshold){
      const fn=window[r.dataset.deleteFn];
      const rawArg=r.dataset.deleteArg;
      const arg=/^\d+$/.test(rawArg) ? Number(rawArg) : rawArg;
      if(typeof fn==='function') fn(arg);
    }
    row=null; dx=0; axis=null;
  });
}
```

Se llama así, una vez, al final de `init()`:

```js
initSwipeDelete(document.getElementById('log-content'));
initSwipeDelete(document.getElementById('routines-list'));
initSwipeDelete(document.getElementById('wk-body'));
initSwipeDelete(document.getElementById('routine-exercises-container'));
```

Los 4 son `<div>` vacíos en el HTML estático que después se llenan vía
`innerHTML`, así que `initSwipeDelete` puede llamarse sobre los 4 sin
esperar a que tengan contenido.

## Confirmación al completar el swipe

Al llegar al umbral, se llama directamente la función de borrado real
(`deleteSession`, `deleteRoutine`, `removeWorkoutSet`,
`removeRoutineExercise`) — el `confirm()` ya vive *adentro* de esas
funciones, no en el handler de swipe. Para que las 4 queden
consistentes (hoy solo 2 de las 4 confirman), se agrega un
`confirm()` a las otras dos:

```js
function removeWorkoutSet(si){
  const entry=activeWorkout.entries[activeWorkout.cur];
  if(entry.sets.length<=1)return;
  if(!confirm('¿Eliminar esta serie?'))return;
  entry.sets.splice(si,1);
  renderWorkoutScreen();
}
function removeRoutineExercise(id){
  if(editRoutine.exercises.length<=1)return;
  if(!confirm('¿Quitar este ejercicio de la rutina?'))return;
  editRoutine.exercises=editRoutine.exercises.filter(e=>e.id!==id);
  renderRoutineExercises();
}
```

Esto también cambia el comportamiento del botón ✕ explícito en
desktop para esos dos casos (gana confirmación) — es intencional:
ambos caminos (botón y swipe) llaman a la misma función, así que
quedan consistentes entre sí sin duplicar lógica de confirmación.

Nota sobre tipos: `removeWorkoutSet(si)` recibe `si` como número hoy
(el `onclick` del botón explícito pasa un literal numérico), pero
`data-delete-arg` en el HTML es siempre un string vía `dataset`. El
handler genérico (código de arriba) ya resuelve esto: si el valor es
solo dígitos (`/^\d+$/`), lo convierte con `Number(...)` antes de
llamar la función; si no, lo pasa tal cual como string. Los ids de
sesión/rutina/ejercicio son siempre alfanuméricos (nunca solo
dígitos), así que no hay ambigüedad entre los 4 casos.

## Testing

Sin test runner (HTML estático). Verificación manual, sirviendo la
carpeta local y usando **emulación táctil** del navegador (la app se
sirve en un viewport mobile emulado, que sí despacha eventos touch
sintéticos):

1. En cada una de las 4 listas, con 2+ filas: swipe corto (por debajo
   del umbral) en una fila — confirmar que vuelve a su lugar sin
   borrar nada y sin mostrar confirmación.
2. Swipe completo (por encima del umbral) — confirmar que aparece el
   `confirm()` con el texto correcto para esa lista, y que
   cancelándolo la fila vuelve a su lugar sin borrar.
3. Repetir el swipe completo aceptando el `confirm()` — confirmar que
   la fila correcta se borra (verificar el id/índice correcto, no
   "la última" ni "la primera" por error) y las demás quedan intactas.
4. Con un scroll vertical largo en cada lista: confirmar que
   scrollear la lista con el dedo sigue funcionando normal y no
   dispara el swipe de borrado a mitad de camino.
5. Sets del modo guiado con un solo set, y ejercicio de rutina cuando
   es el único de la rutina: confirmar que el swipe no hace nada
   (`data-swipe-disabled="true"`), igual que el botón deshabilitado
   hoy.
6. Rutinas en modo exportar/compartir (`routinePickMode` activo):
   confirmar que no hay wrapper de swipe ahí (tocar/arrastrar una fila
   no debe intentar borrar nada, debe exportar/compartir como siempre).
7. Confirmar que tocar un checkbox/select/input dentro de `.ex-block`
   (sin arrastrar) sigue funcionando exactamente igual que antes.
8. Confirmar en **desktop** (viewport sin emulación táctil) que los
   botones 🗑️/✕ siguen visibles y funcionando como hoy en las 4
   listas, con las dos confirmaciones nuevas incluidas.
