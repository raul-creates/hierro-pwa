# Rutinas Independientes por Día Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the day-strip's overlay from a plain reassignment picker into a full day-detail screen (ver rutina, iniciar sesión, editar, cambiar o crear), and let editing a day's routine content fork it into an independent copy when that routine is shared with other days — without migrating any existing saved data.

**Architecture:** `week[wd]` and `dayOverrides[iso]` keep storing a `routineId` (or the sentinels `'rest'`/`'freestyle'`/`null`) exactly as today — no data migration. The day-overlay (`day-overlay` picker) gains a small internal mode machine (`dayOverlayMode`: `'detail' | 'reassign' | 'start-chooser' | 'edit-scope'`) rendered by one dispatcher, `renderDayOverlay()`. Editing a shared routine's content is intercepted by `editRoutineFromDay()`, which forks (`forkRoutine()`) into a new `routines[]` entry only when the user picks "solo este día". This is a single-file change (`index.html`), no new dependencies.

**Tech Stack:** HTML/CSS/vanilla JS, single-file (`index.html`), no build step, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-17-rutinas-independientes-por-dia-design.md`

## Global Constraints

- No test runner exists in this repo. "Testing" a step means: serve the folder locally from `C:\Code\hierro-pwa` (`npx http-server hierro-pwa -p 5175` from `C:\Code`, or use the `hierro-pwa` entry already in `C:\Code\.claude\launch.json`), open it in a browser, and manually verify — including reloading the page to confirm `localStorage` persistence where a step calls for it.
- Every new user-facing string must match the existing Spanish/Argentina copy conventions already used elsewhere in this file (informal "vos", sentence case, no exclamation marks on functional copy).
- `week`/`dayOverrides` never change shape in this plan — they keep storing a bare `routineId` string, `'rest'`, `null` (only in `week`), or (new) `'freestyle'`. Do not introduce any embedded-object storage.
- Known, accepted scope limitation (do not try to fix): pressing the phone's physical back / gesture while inside the day-overlay's `'reassign'`, `'start-chooser'`, or `'edit-scope'` sub-mode closes the whole overlay (via the existing `popstate` handler from the previous sub-project, which only knows about the overlay's outer `.active` class, not its internal mode) instead of stepping back one sub-mode. This plan does not add per-mode back-stack entries — it was not asked for and would meaningfully expand scope.

---

### Task 1: Freestyle sentinel — week-strip label and "Empezar" button

**Files:**
- Modify: `index.html` (JS: `renderPlanSemanal` ~line 1421-1454, `startWorkout` ~line 1056-1064)

**Interfaces:**
- Produces: the string `'freestyle'` becomes a valid value for `week[wd]` and `dayOverrides[iso]`, alongside the existing `'rest'`, a real `routineId`, or `null`. Nothing writes this value yet (that lands in Task 2) — this task only makes existing readers (`renderPlanSemanal`, `startWorkout`) handle it correctly so it can be tested in isolation via the console.
- Consumes (unchanged): `effectiveRoutineId(iso)`, `routines`, `buildActiveWorkout(routine, editingSession)`, `enterWorkoutScreen()`, `openStartChooser()`.

- [ ] **Step 1: Handle the `'freestyle'` sentinel in the week-strip label**

Find (in `index.html`, ~line 1429-1438):
```js
    const effId=effectiveRoutineId(iso);
    const isRest=effId==='rest';
    const routine=(!isRest && effId) ? routines.find(r=>r.id===effId) : null;
    const hasOverride=Object.prototype.hasOwnProperty.call(dayOverrides, iso);
    const isToday=iso===todayIso;
    const label=isRest?'Descanso':(routine?routine.name:'—');
    const dateLabel=`${iso.slice(8,10)}/${iso.slice(5,7)}`;
    const cls=['week-day'];
    if(isToday)cls.push('today');
    if(routine||isRest)cls.push('has-routine');
```

Replace with:
```js
    const effId=effectiveRoutineId(iso);
    const isRest=effId==='rest';
    const isFreestyle=effId==='freestyle';
    const routine=(!isRest && !isFreestyle && effId) ? routines.find(r=>r.id===effId) : null;
    const hasOverride=Object.prototype.hasOwnProperty.call(dayOverrides, iso);
    const isToday=iso===todayIso;
    const label=isRest?'Descanso':(isFreestyle?'Libre':(routine?routine.name:'—'));
    const dateLabel=`${iso.slice(8,10)}/${iso.slice(5,7)}`;
    const cls=['week-day'];
    if(isToday)cls.push('today');
    if(routine||isRest||isFreestyle)cls.push('has-routine');
```

- [ ] **Step 2: Handle the `'freestyle'` sentinel in `startWorkout`**

Find (in `index.html`, ~line 1056-1064):
```js
function startWorkout(){
  if(activeWorkout){ enterWorkoutScreen(); return; }
  const effId = effectiveRoutineId(todayISO());
  if(effId && effId!=='rest'){
    const r = routines.find(x=>x.id===effId);
    if(r){ activeWorkout = buildActiveWorkout(r, null); enterWorkoutScreen(); return; }
  }
  openStartChooser();
}
```

Replace with:
```js
function startWorkout(){
  if(activeWorkout){ enterWorkoutScreen(); return; }
  const effId = effectiveRoutineId(todayISO());
  if(effId==='freestyle'){ activeWorkout = buildActiveWorkout(null, null); enterWorkoutScreen(); return; }
  if(effId && effId!=='rest'){
    const r = routines.find(x=>x.id===effId);
    if(r){ activeWorkout = buildActiveWorkout(r, null); enterWorkoutScreen(); return; }
  }
  openStartChooser();
}
```

- [ ] **Step 3: Verify in the browser**

Serve the folder and open it (inject the `EXERCISES` fixture from the sub-proyecto-1 plan's Task 1 Step 9 in the console if the dataset fetch fails). In the console:

```js
week['1']='freestyle'; saveWeek(); renderPlanSemanal();
```

1. Confirm Monday's cell in the week strip now shows "Libre" (not "—"), styled the same yellow-accented way a real routine or "Descanso" would be (`has-routine` class applied).
2. If today is Monday, tap "Empezar" (bottom-nav). Confirm it goes straight into a workout screen with **zero exercises listed** (a bare freestyle session) — it must NOT open the "Empezar" chooser list.
3. If today is not Monday, verify the same by temporarily running `week[String(new Date().getDay())]='freestyle'; saveWeek();` in the console, tapping "Empezar", then cleaning up: `week[String(new Date().getDay())]=null; saveWeek();`.
4. Clean up: `delete week['1']; saveWeek(); renderPlanSemanal();` (or reload the page without having saved, if you didn't want to keep any test state).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add freestyle sentinel handling to week-strip label and startWorkout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Day-overlay becomes a detail screen (ver rutina, iniciar sesión, cambiar, crear)

**Files:**
- Modify: `index.html` (JS: the day-overlay block, `index.html:1456-1502`; `newRoutine`, `index.html:1530-1538`)

**Interfaces:**
- Produces: `dayOverlayMode` (module-level `let`, one of `'detail'|'reassign'|'start-chooser'`), `renderDayOverlayDetail()`, `showDayReassign()`, `renderDayOverlayReassign()` (replaces the old `renderDayOverlay()` body), `startDaySession()`, `openDayStartChooser()`, `renderDayOverlayStartChooser()`, `createRoutineFromStartChooser()`, `startFreestyleSession()`, `createRoutineAssignedToDay(scope)`. `newRoutine()` now returns the new routine's `id` (existing callers that ignore the return value are unaffected).
- Consumes: `effectiveRoutineId(iso)`, `routines`, `EXERCISES`, `esName(ex)`, `WEEKDAY_NAMES`, `newSessionFromRoutine(routine)` (`index.html:1737`, already guards against an in-progress workout), `buildActiveWorkout`, `enterWorkoutScreen`, `stopWorkoutClock`, `skipRestTimer`, `activeWorkout`, `toast`.
- The `'Editar ejercicios'` button calls `editRoutineFn('${routine.id}')` directly in this task — Task 3 replaces that one call site with `editRoutineFromDay('${routine.id}')` to add the fork-on-edit check. Do not add fork logic in this task.

- [ ] **Step 1: Replace the day-overlay state, open/close, and render dispatcher**

Find (in `index.html`, ~line 1456-1502):
```js
let dayOverlayIso='';
let dayOverlayChoice=null;
function openDayOverlay(iso){
  dayOverlayIso=iso;
  dayOverlayChoice=null;
  renderDayOverlay();
  document.getElementById('day-overlay').classList.add('active');
}
function closeDayOverlay(){
  document.getElementById('day-overlay').classList.remove('active');
}
function renderDayOverlay(){
  const body=document.getElementById('day-overlay-body');
  const wd=new Date(dayOverlayIso+'T12:00:00').getDay();
  const dayName=WEEKDAY_NAMES[wd];
  document.getElementById('day-overlay-title').textContent = dayName.charAt(0).toUpperCase()+dayName.slice(1);
  let html=`<div style="padding:14px 14px 4px;color:#9195A3;font-size:14px;line-height:1.5">¿Enfermo, te salteaste un día o querés algo distinto? Elegí qué entrenar en su lugar.</div>`;
  const items=[{id:'rest',label:'Descanso'},...routines.map(r=>({id:r.id,label:r.name}))];
  html+=`<div style="padding:10px 14px">`+items.map(it=>
    `<div style="padding:9px 0;cursor:pointer;font-weight:${dayOverlayChoice===it.id?'700':'400'};color:${dayOverlayChoice===it.id?'#FFD200':'#fff'}" onclick="pickDayOverlayChoice('${it.id}')">${it.label}</div>`
  ).join('')+`</div>`;
  if(dayOverlayChoice){
    html+=`<div style="padding:10px 14px;display:flex;flex-direction:column;gap:8px">
      <button class="btn-primary" style="padding:11px 0" onclick="applyDayOverride('today')">Solo hoy</button>
      <button class="btn-ghost" style="padding:9px 0" onclick="applyDayOverride('always')">Cambiar todos los ${dayName}</button>
    </div>`;
  }
  body.innerHTML=html;
}
function pickDayOverlayChoice(id){ dayOverlayChoice=id; renderDayOverlay(); }
function applyDayOverride(scope){
  if(scope==='today'){
    dayOverrides[dayOverlayIso]=dayOverlayChoice;
    saveDayOverrides();
  } else {
    const wd=new Date(dayOverlayIso+'T12:00:00').getDay();
    week[String(wd)]=dayOverlayChoice==='rest'?null:dayOverlayChoice;
    saveWeek();
    if(Object.prototype.hasOwnProperty.call(dayOverrides,dayOverlayIso)){
      delete dayOverrides[dayOverlayIso];
      saveDayOverrides();
    }
  }
  closeDayOverlay();
  renderPlanSemanal();
  toast('Día actualizado');
}
```

Replace with:
```js
let dayOverlayIso='';
let dayOverlayChoice=null;
let dayOverlayMode='detail';
function openDayOverlay(iso){
  dayOverlayIso=iso;
  dayOverlayChoice=null;
  dayOverlayMode='detail';
  renderDayOverlay();
  document.getElementById('day-overlay').classList.add('active');
}
function closeDayOverlay(){
  document.getElementById('day-overlay').classList.remove('active');
}
function renderDayOverlay(){
  if(dayOverlayMode==='reassign') renderDayOverlayReassign();
  else if(dayOverlayMode==='start-chooser') renderDayOverlayStartChooser();
  else renderDayOverlayDetail();
}
function renderDayOverlayDetail(){
  const body=document.getElementById('day-overlay-body');
  const wd=new Date(dayOverlayIso+'T12:00:00').getDay();
  const dayName=WEEKDAY_NAMES[wd];
  const dayNameCap=dayName.charAt(0).toUpperCase()+dayName.slice(1);
  const dateLabel=`${dayOverlayIso.slice(8,10)}/${dayOverlayIso.slice(5,7)}`;
  document.getElementById('day-overlay-title').textContent=`${dayNameCap} ${dateLabel}`;
  const effId=effectiveRoutineId(dayOverlayIso);
  const routine=(effId && effId!=='rest' && effId!=='freestyle') ? routines.find(r=>r.id===effId) : null;
  let html='';
  if(effId==='rest'){
    html=`<div style="padding:24px 14px;text-align:center;color:#9195A3">Día de descanso</div>
      <div style="padding:0 14px 14px"><button class="btn-ghost" style="width:100%;padding:11px 0" onclick="showDayReassign()">Cambiar</button></div>`;
  } else if(effId==='freestyle'){
    html=`<div style="padding:24px 14px;text-align:center;color:#9195A3">Sesión libre, sin rutina fija</div>
      <div style="padding:0 14px 14px;display:flex;flex-direction:column;gap:8px">
        <button class="btn-primary" style="width:100%;padding:12px 0" onclick="startDaySession()">Iniciar sesión</button>
        <button class="btn-ghost" style="width:100%;padding:11px 0" onclick="showDayReassign()">Cambiar</button>
      </div>`;
  } else if(routine){
    const exList=routine.exercises.map(re=>{
      const exData=EXERCISES.find(e=>e.id===re.exId);
      return `<div style="padding:7px 0;border-bottom:1px solid #1E2130;color:#fff;font-size:14px">${exData?esName(exData):'—'}</div>`;
    }).join('');
    html=`<div style="padding:10px 14px 0;color:#FFD200;font-weight:700;font-size:16px">${routine.name}</div>
      <div style="padding:6px 14px 4px">${exList}</div>
      <div style="padding:10px 14px 14px;display:flex;flex-direction:column;gap:8px">
        <button class="btn-primary" style="width:100%;padding:12px 0" onclick="startDaySession()">Iniciar sesión</button>
        <button class="btn-ghost" style="width:100%;padding:11px 0" onclick="editRoutineFn('${routine.id}')">Editar ejercicios</button>
        <button class="btn-ghost" style="width:100%;padding:11px 0" onclick="showDayReassign()">Cambiar rutina del día</button>
      </div>`;
  } else {
    html=`<div style="padding:24px 14px;text-align:center;color:#9195A3">Sin rutina asignada</div>
      <div style="padding:0 14px 14px;display:flex;flex-direction:column;gap:8px">
        <button class="btn-primary" style="width:100%;padding:12px 0" onclick="startDaySession()">Iniciar sesión</button>
        <button class="btn-ghost" style="width:100%;padding:11px 0" onclick="showDayReassign()">Asignar rutina</button>
      </div>`;
  }
  body.innerHTML=html;
}
function showDayReassign(){
  dayOverlayMode='reassign';
  dayOverlayChoice=null;
  renderDayOverlay();
}
function renderDayOverlayReassign(){
  const body=document.getElementById('day-overlay-body');
  const wd=new Date(dayOverlayIso+'T12:00:00').getDay();
  const dayName=WEEKDAY_NAMES[wd];
  document.getElementById('day-overlay-title').textContent = dayName.charAt(0).toUpperCase()+dayName.slice(1);
  let html=`<div style="padding:14px 14px 4px;color:#9195A3;font-size:14px;line-height:1.5">¿Enfermo, te salteaste un día o querés algo distinto? Elegí qué entrenar en su lugar.</div>`;
  const items=[{id:'rest',label:'Descanso'},{id:'freestyle',label:'Freestyle (sin rutina)'},{id:'__new__',label:'Crear rutina'},...routines.map(r=>({id:r.id,label:r.name}))];
  html+=`<div style="padding:10px 14px">`+items.map(it=>
    `<div style="padding:9px 0;cursor:pointer;font-weight:${dayOverlayChoice===it.id?'700':'400'};color:${dayOverlayChoice===it.id?'#FFD200':'#fff'}" onclick="pickDayOverlayChoice('${it.id}')">${it.label}</div>`
  ).join('')+`</div>`;
  if(dayOverlayChoice){
    html+=`<div style="padding:10px 14px;display:flex;flex-direction:column;gap:8px">
      <button class="btn-primary" style="padding:11px 0" onclick="applyDayOverride('today')">Solo hoy</button>
      <button class="btn-ghost" style="padding:9px 0" onclick="applyDayOverride('always')">Cambiar todos los ${dayName}</button>
    </div>`;
  }
  body.innerHTML=html;
}
function pickDayOverlayChoice(id){ dayOverlayChoice=id; renderDayOverlay(); }
function applyDayOverride(scope){
  if(dayOverlayChoice==='__new__'){
    closeDayOverlay();
    createRoutineAssignedToDay(scope);
    return;
  }
  if(scope==='today'){
    dayOverrides[dayOverlayIso]=dayOverlayChoice;
    saveDayOverrides();
  } else {
    const wd=new Date(dayOverlayIso+'T12:00:00').getDay();
    week[String(wd)]=dayOverlayChoice==='rest'?null:dayOverlayChoice;
    saveWeek();
    if(Object.prototype.hasOwnProperty.call(dayOverrides,dayOverlayIso)){
      delete dayOverrides[dayOverlayIso];
      saveDayOverrides();
    }
  }
  dayOverlayMode='detail';
  renderDayOverlay();
  renderPlanSemanal();
  toast('Día actualizado');
}
function createRoutineAssignedToDay(scope){
  const newId=newRoutine();
  if(scope==='today'){ dayOverrides[dayOverlayIso]=newId; saveDayOverrides(); }
  else {
    const wd=new Date(dayOverlayIso+'T12:00:00').getDay();
    week[String(wd)]=newId; saveWeek();
    if(Object.prototype.hasOwnProperty.call(dayOverrides,dayOverlayIso)){ delete dayOverrides[dayOverlayIso]; saveDayOverrides(); }
  }
}
function startDaySession(){
  const effId=effectiveRoutineId(dayOverlayIso);
  if(effId==='freestyle'){ startFreestyleSession(); return; }
  if(effId && effId!=='rest'){
    const routine=routines.find(r=>r.id===effId);
    if(routine){ closeDayOverlay(); newSessionFromRoutine(routine); return; }
  }
  openDayStartChooser();
}
function openDayStartChooser(){
  dayOverlayMode='start-chooser';
  renderDayOverlay();
}
function renderDayOverlayStartChooser(){
  const body=document.getElementById('day-overlay-body');
  document.getElementById('day-overlay-title').textContent='¿Qué querés hacer?';
  body.innerHTML=`<div style="padding:14px;display:flex;flex-direction:column;gap:8px">
    <button class="btn-primary" style="padding:12px 0" onclick="createRoutineFromStartChooser()">Crear rutina</button>
    <button class="btn-ghost" style="padding:11px 0" onclick="startFreestyleSession()">Freestyle</button>
  </div>`;
}
function createRoutineFromStartChooser(){
  closeDayOverlay();
  createRoutineAssignedToDay('always');
}
function startFreestyleSession(){
  if(activeWorkout && !confirm('Tenés un entrenamiento en curso. ¿Descartarlo y arrancar otro?')) return;
  if(activeWorkout){ stopWorkoutClock(); skipRestTimer(); }
  closeDayOverlay();
  activeWorkout = buildActiveWorkout(null, null);
  enterWorkoutScreen();
}
```

- [ ] **Step 2: `newRoutine()` returns the new routine's id**

Find (in `index.html`, ~line 1530-1538):
```js
function newRoutine(){
  const r={id:uid(), name:'', exercises:[emptyRoutineEx()]};
  routines.push(r);
  saveRoutines();
  editingRoutineId=r.id;
  document.getElementById('routine-editor-title').textContent='Nueva rutina';
  document.getElementById('routine-name').value='';
  renderRoutineExercises();
  showView('view-routine-edit');
}
```

Replace with:
```js
function newRoutine(){
  const r={id:uid(), name:'', exercises:[emptyRoutineEx()]};
  routines.push(r);
  saveRoutines();
  editingRoutineId=r.id;
  document.getElementById('routine-editor-title').textContent='Nueva rutina';
  document.getElementById('routine-name').value='';
  renderRoutineExercises();
  showView('view-routine-edit');
  return r.id;
}
```

- [ ] **Step 3: Verify in the browser**

Serve the folder, reload. Create at least 2 routines beforehand via "+ Rutina" (name them, e.g., "Espalda" and "Piernas") so the reassign list has real options.

1. Tap a day in the week strip that shows "—" (unassigned). Confirm the overlay opens showing "Sin rutina asignada" with "Iniciar sesión" and "Asignar rutina" buttons — NOT the old plain list.
2. Tap "Asignar rutina". Confirm the list now shows: Descanso, Freestyle (sin rutina), Crear rutina, then your saved routines. Pick "Espalda", tap "Cambiar todos los [día]". Confirm it returns to the **detail view** (not closed) showing "Espalda" and its exercise list, with "Iniciar sesión" / "Editar ejercicios" / "Cambiar rutina del día" buttons.
3. Tap "Editar ejercicios". Confirm it opens the routine editor for "Espalda" directly (no scope question yet — that's Task 3).
4. Go back (← ), tap the same day again. Confirm it opens straight to the detail view showing "Espalda" (not the reassignment list).
5. Tap "Iniciar sesión". Confirm it starts a workout with Espalda's exercises pre-loaded, exactly like tapping the routine from the "Rutinas" list does.
6. Tap a different day, "Asignar rutina" → "Freestyle (sin rutina)" → "Solo hoy". Confirm it returns to the detail view showing "Sesión libre, sin rutina fija" with "Iniciar sesión" and "Cambiar". Tap "Iniciar sesión" — confirm it starts a workout with zero exercises, no extra prompt.
7. Tap a third, still-unassigned day → "Iniciar sesión" directly (skipping "Asignar rutina"). Confirm a "¿Qué querés hacer?" chooser appears with "Crear rutina" / "Freestyle". Tap "Crear rutina" — confirm it opens the routine editor for a brand-new empty routine, and (via console) `week[String(<that weekday number>)]` now equals that new routine's id.
8. Repeat step 7 on another unassigned day, this time tapping "Freestyle" in the chooser — confirm it starts an empty workout immediately, with no routine created.
9. Confirm `renderPlanSemanal()`'s week strip reflects every change made above (routine names, "Libre" for freestyle days) without needing a manual reload.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Turn day-overlay into a detail screen: ver rutina, iniciar sesión, crear, freestyle

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Fork-on-edit — scope question when editing a shared day's routine

**Files:**
- Modify: `index.html` (JS: `renderDayOverlay` dispatcher and the `'Editar ejercicios'` button from Task 2; new functions appended after `startFreestyleSession`; new state var alongside `dayOverlayMode`)

**Interfaces:**
- Produces: `countRoutineUsage(routineId)` → integer count of how many `week[*]`/`dayOverrides[*]` slots currently equal `routineId`. `forkRoutine(routineId)` → deep-clones the routine (new `id`, new exercise `id`s, same `name`/fields), pushes it to `routines[]`, persists, returns the new id (or `null` if the source routine doesn't exist). `editRoutineFromDay(routineId)` → the new entry point the day-overlay's "Editar ejercicios" button calls. `dayOverlayEditRoutineId` (module-level `let`, string or `null`).
- Consumes: `routines`, `week`, `dayOverrides`, `saveRoutines`, `saveWeek`, `saveDayOverrides`, `uid()`, `editRoutineFn(id)`, `closeDayOverlay()`, `WEEK_LAYOUT`, `WEEKDAY_NAMES`, `dayOverlayIso`.

- [ ] **Step 1: Add the `'edit-scope'` mode to the dispatcher**

Find (in `index.html`, produced by Task 2 Step 1):
```js
function renderDayOverlay(){
  if(dayOverlayMode==='reassign') renderDayOverlayReassign();
  else if(dayOverlayMode==='start-chooser') renderDayOverlayStartChooser();
  else renderDayOverlayDetail();
}
```

Replace with:
```js
function renderDayOverlay(){
  if(dayOverlayMode==='reassign') renderDayOverlayReassign();
  else if(dayOverlayMode==='start-chooser') renderDayOverlayStartChooser();
  else if(dayOverlayMode==='edit-scope') renderDayOverlayEditScope();
  else renderDayOverlayDetail();
}
```

- [ ] **Step 2: Add `dayOverlayEditRoutineId` state**

Find (in `index.html`, produced by Task 2 Step 1):
```js
let dayOverlayIso='';
let dayOverlayChoice=null;
let dayOverlayMode='detail';
```

Replace with:
```js
let dayOverlayIso='';
let dayOverlayChoice=null;
let dayOverlayMode='detail';
let dayOverlayEditRoutineId=null;
```

- [ ] **Step 3: Route "Editar ejercicios" through the new entry point**

Find (in `index.html`, inside `renderDayOverlayDetail` — this exact string is unique in the file. Note: Task 2's implementation added `closeDayOverlay();` before the `editRoutineFn` call, a necessary fix over the plan's original text, which would have left the day-overlay stacked on top of the routine editor. `editRoutineFromDay`, defined in this task's Step 4, already calls `closeDayOverlay()` itself in its direct-edit branch, so the replacement below drops the inline `closeDayOverlay();` rather than keeping a redundant one):
```js
        <button class="btn-ghost" style="width:100%;padding:11px 0" onclick="closeDayOverlay();editRoutineFn('${routine.id}')">Editar ejercicios</button>
```

Replace with:
```js
        <button class="btn-ghost" style="width:100%;padding:11px 0" onclick="editRoutineFromDay('${routine.id}')">Editar ejercicios</button>
```

- [ ] **Step 4: Append the fork-on-edit functions**

Find (in `index.html`, the last function produced by Task 2 Step 1):
```js
function startFreestyleSession(){
  if(activeWorkout && !confirm('Tenés un entrenamiento en curso. ¿Descartarlo y arrancar otro?')) return;
  if(activeWorkout){ stopWorkoutClock(); skipRestTimer(); }
  closeDayOverlay();
  activeWorkout = buildActiveWorkout(null, null);
  enterWorkoutScreen();
}
```

Replace with:
```js
function startFreestyleSession(){
  if(activeWorkout && !confirm('Tenés un entrenamiento en curso. ¿Descartarlo y arrancar otro?')) return;
  if(activeWorkout){ stopWorkoutClock(); skipRestTimer(); }
  closeDayOverlay();
  activeWorkout = buildActiveWorkout(null, null);
  enterWorkoutScreen();
}
function countRoutineUsage(routineId){
  let n=0;
  Object.values(week).forEach(v=>{ if(v===routineId) n++; });
  Object.values(dayOverrides).forEach(v=>{ if(v===routineId) n++; });
  return n;
}
function forkRoutine(routineId){
  const orig=routines.find(r=>r.id===routineId);
  if(!orig) return null;
  const clone={id:uid(), name:orig.name, exercises:orig.exercises.map(e=>({...e,id:uid()}))};
  routines.push(clone);
  saveRoutines();
  return clone.id;
}
function editRoutineFromDay(routineId){
  if(countRoutineUsage(routineId)<=1){ closeDayOverlay(); editRoutineFn(routineId); return; }
  dayOverlayEditRoutineId=routineId;
  dayOverlayMode='edit-scope';
  renderDayOverlay();
}
function renderDayOverlayEditScope(){
  const body=document.getElementById('day-overlay-body');
  const wd=new Date(dayOverlayIso+'T12:00:00').getDay();
  const dayNameCap=WEEKDAY_NAMES[wd].charAt(0).toUpperCase()+WEEKDAY_NAMES[wd].slice(1);
  const otherDays=[];
  WEEK_LAYOUT.forEach(w=>{ if(week[String(w)]===dayOverlayEditRoutineId && w!==wd) otherDays.push(WEEKDAY_NAMES[w]); });
  Object.keys(dayOverrides).forEach(iso=>{
    if(dayOverrides[iso]===dayOverlayEditRoutineId && iso!==dayOverlayIso){
      const owd=new Date(iso+'T12:00:00').getDay();
      otherDays.push(WEEKDAY_NAMES[owd]);
    }
  });
  document.getElementById('day-overlay-title').textContent='¿Alcance del cambio?';
  body.innerHTML=`<div style="padding:14px;color:#9195A3;font-size:14px;line-height:1.5">Esta rutina también se usa en ${otherDays.join(', ')}. ¿Los cambios que hagas ahora van a aplicar solo a ${dayNameCap} o a todos esos días?</div>
    <div style="padding:10px 14px 14px;display:flex;flex-direction:column;gap:8px">
      <button class="btn-primary" style="padding:11px 0" onclick="confirmEditScope('only')">Solo ${dayNameCap}</button>
      <button class="btn-ghost" style="padding:9px 0" onclick="confirmEditScope('all')">Todos esos días</button>
    </div>`;
}
function confirmEditScope(scope){
  const routineId=dayOverlayEditRoutineId;
  if(scope==='only'){
    const newId=forkRoutine(routineId);
    if(Object.prototype.hasOwnProperty.call(dayOverrides,dayOverlayIso) && dayOverrides[dayOverlayIso]===routineId){
      dayOverrides[dayOverlayIso]=newId; saveDayOverrides();
    } else {
      const wd=new Date(dayOverlayIso+'T12:00:00').getDay();
      week[String(wd)]=newId; saveWeek();
    }
    closeDayOverlay();
    editRoutineFn(newId);
  } else {
    closeDayOverlay();
    editRoutineFn(routineId);
  }
}
```

- [ ] **Step 5: Verify in the browser**

Using the same served instance:

1. Create a routine "Espalda". Assign it to Lunes and Miércoles (via each day's "Asignar rutina" → "Espalda" → "Cambiar todos los [día]" — do this twice, once per day).
2. Open Lunes, tap "Editar ejercicios". Confirm a "¿Alcance del cambio?" screen appears, mentioning "miércoles" in its text, with "Solo Lunes" / "Todos esos días" buttons — it must NOT go straight into the editor.
3. Tap "Solo Lunes". Confirm it opens the routine editor for a **new** routine (check via console: `editingRoutineId !== ` the original "Espalda" id). Add/rename an exercise there, then check `week['1']` (Lunes) now points at the new id while `week['3']` (Miércoles) still points at the original.
4. Reopen Miércoles, tap "Editar ejercicios" on the original "Espalda" — confirm it now says the shared day is "lunes"... wait, re-check: since Lunes now points to the forked copy, "Espalda" (the original) should now show usage count 1 (only Miércoles) — confirm it goes **straight into the editor**, no scope question (since it's no longer shared).
5. Create a second routine "Piernas", assign it to Viernes only. Open Viernes → "Editar ejercicios" — confirm it goes straight into the editor (never shared, no question ever needed).
6. Test the "Todos esos días" path: assign "Piernas" to Sábado too (now shared between Viernes and Sábado). Open Viernes → "Editar ejercicios" → "Todos esos días". Confirm it opens the editor for the **original** "Piernas" id (same id as before), and that editing it there is reflected when you check Sábado's assigned routine too (same id, same content).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Ask edit scope (solo este día / todos los días) before editing a shared routine

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: "Días asignados" toggle row in the routine editor

**Files:**
- Modify: `index.html` (HTML: `view-routine-edit` ~line 334-348; CSS: ~line 239; JS: `updateRoutineName` ~line 1606, `newRoutine` ~line 1530-1539 post-Task-2, `editRoutineFn` ~line 1540-1550, `createRoutineAssignedToDay` ~ post-Task-2)

**Interfaces:**
- Produces: `renderRoutineDayToggles()` — renders the L M M J V S D toggle row into `#routine-day-toggles`, reflecting `week[wd]===currentRoutine().id`. `toggleRoutineDay(wd)` — flips `week[wd]` between the current routine's id and `null`, persists, re-renders the row and the week strip.
- Consumes: `currentRoutine()`, `week`, `saveWeek`, `WEEK_LAYOUT`, `WEEKDAY_LETTERS`, `renderPlanSemanal()`.

- [ ] **Step 1: Add the toggle row to the routine editor's HTML**

Find (in `index.html`, ~line 340-345):
```html
    <div class="editor-content">
      <div class="field-group">
        <div class="field-label">Nombre</div>
        <input type="text" id="routine-name" placeholder="Ej. Push, Pull, Piernas" onchange="updateRoutineName(this.value)" style="width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:15px;outline:none">
      </div>
      <div id="routine-exercises-container"></div>
```

Replace with:
```html
    <div class="editor-content">
      <div class="field-group">
        <div class="field-label">Nombre</div>
        <input type="text" id="routine-name" placeholder="Ej. Push, Pull, Piernas" onchange="updateRoutineName(this.value)" style="width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:15px;outline:none">
      </div>
      <div class="field-group">
        <div class="field-label">Días asignados</div>
        <div class="week-strip" id="routine-day-toggles"></div>
      </div>
      <div id="routine-exercises-container"></div>
```

- [ ] **Step 2: Add the toggle button CSS**

Find (in `index.html`, ~line 239):
```css
.wd-ovr{color:#FF8A00}
```

Replace with:
```css
.wd-ovr{color:#FF8A00}
.rdt-btn{flex:1;text-align:center;border-radius:8px;padding:9px 2px;background:#1A1D2E;border:none;font-family:inherit;font-size:12px;font-weight:700;color:#9195A3;cursor:pointer}
.rdt-btn.on{background:#FFD200;color:#0F1117}
```

- [ ] **Step 3: Add `renderRoutineDayToggles` and `toggleRoutineDay`**

Find (in `index.html`, ~line 1606):
```js
function updateRoutineName(val){const r=currentRoutine();if(!r)return;r.name=val.trim()||'Rutina';saveRoutines();document.getElementById('routine-name').value=r.name;}
```

Replace with:
```js
function updateRoutineName(val){const r=currentRoutine();if(!r)return;r.name=val.trim()||'Rutina';saveRoutines();document.getElementById('routine-name').value=r.name;}
function renderRoutineDayToggles(){
  const el=document.getElementById('routine-day-toggles');
  if(!el)return;
  const r=currentRoutine(); if(!r)return;
  el.innerHTML=WEEK_LAYOUT.map(wd=>
    `<button type="button" class="rdt-btn${week[String(wd)]===r.id?' on':''}" onclick="toggleRoutineDay(${wd})">${WEEKDAY_LETTERS[wd]}</button>`
  ).join('');
}
function toggleRoutineDay(wd){
  const r=currentRoutine(); if(!r)return;
  week[String(wd)] = (week[String(wd)]===r.id) ? null : r.id;
  saveWeek();
  renderRoutineDayToggles();
  renderPlanSemanal();
}
```

- [ ] **Step 4: Render the toggle row when the editor opens (`newRoutine`)**

Find (in `index.html`, produced by Task 2 Step 2):
```js
function newRoutine(){
  const r={id:uid(), name:'', exercises:[emptyRoutineEx()]};
  routines.push(r);
  saveRoutines();
  editingRoutineId=r.id;
  document.getElementById('routine-editor-title').textContent='Nueva rutina';
  document.getElementById('routine-name').value='';
  renderRoutineExercises();
  showView('view-routine-edit');
  return r.id;
}
```

Replace with:
```js
function newRoutine(){
  const r={id:uid(), name:'', exercises:[emptyRoutineEx()]};
  routines.push(r);
  saveRoutines();
  editingRoutineId=r.id;
  document.getElementById('routine-editor-title').textContent='Nueva rutina';
  document.getElementById('routine-name').value='';
  renderRoutineExercises();
  renderRoutineDayToggles();
  showView('view-routine-edit');
  return r.id;
}
```

- [ ] **Step 5: Render the toggle row when the editor opens (`editRoutineFn`)**

Find (in `index.html`, ~line 1540-1550):
```js
function editRoutineFn(id){
  const r=routines.find(x=>x.id===id); if(!r)return;
  let patched=false;
  r.exercises.forEach(e=>{ if(!e.id){ e.id=uid(); patched=true; } });
  if(patched) saveRoutines();
  editingRoutineId=id;
  document.getElementById('routine-editor-title').textContent='Editar rutina';
  document.getElementById('routine-name').value=r.name;
  renderRoutineExercises();
  showView('view-routine-edit');
}
```

Replace with:
```js
function editRoutineFn(id){
  const r=routines.find(x=>x.id===id); if(!r)return;
  let patched=false;
  r.exercises.forEach(e=>{ if(!e.id){ e.id=uid(); patched=true; } });
  if(patched) saveRoutines();
  editingRoutineId=id;
  document.getElementById('routine-editor-title').textContent='Editar rutina';
  document.getElementById('routine-name').value=r.name;
  renderRoutineExercises();
  renderRoutineDayToggles();
  showView('view-routine-edit');
}
```

- [ ] **Step 6: Keep the toggle row correct when a routine is created from the day-overlay**

Find (in `index.html`, produced by Task 2 Step 1):
```js
function createRoutineAssignedToDay(scope){
  const newId=newRoutine();
  if(scope==='today'){ dayOverrides[dayOverlayIso]=newId; saveDayOverrides(); }
  else {
    const wd=new Date(dayOverlayIso+'T12:00:00').getDay();
    week[String(wd)]=newId; saveWeek();
    if(Object.prototype.hasOwnProperty.call(dayOverrides,dayOverlayIso)){ delete dayOverrides[dayOverlayIso]; saveDayOverrides(); }
  }
}
```

Replace with:
```js
function createRoutineAssignedToDay(scope){
  const newId=newRoutine();
  if(scope==='today'){ dayOverrides[dayOverlayIso]=newId; saveDayOverrides(); }
  else {
    const wd=new Date(dayOverlayIso+'T12:00:00').getDay();
    week[String(wd)]=newId; saveWeek();
    if(Object.prototype.hasOwnProperty.call(dayOverrides,dayOverlayIso)){ delete dayOverrides[dayOverlayIso]; saveDayOverrides(); }
  }
  renderRoutineDayToggles();
}
```

- [ ] **Step 7: Verify in the browser**

Using the same served instance:

1. Tap "+ Rutina". Confirm the editor shows a "Días asignados" row of 7 toggle buttons (L M M J V S D), all unlit.
2. Name it "Full body", tap the "L" toggle. Confirm it lights up (yellow) immediately, and `week['1']` now equals this routine's id (check console). Go back to Inicio — confirm Lunes' cell in the week strip shows "Full body".
3. Re-open this routine via its ✏️ in the "Rutinas" list. Confirm "L" is already lit. Tap "M" (miércoles, `wd=3`) too. Confirm both light up, and `week['3']` now also equals this routine's id — check the week strip reflects both days without navigating away first.
4. Tap "L" again to turn it off. Confirm it un-lights, `week['1']` becomes `null`, and Lunes' cell in the week strip goes back to "—" — Miércoles is unaffected.
5. From an unassigned day's overlay, tap "Iniciar sesión" → "Crear rutina" (Task 2's flow). Confirm the resulting editor's toggle row already shows that day lit, without needing a manual refresh.
6. Confirm this toggle row has no effect on `dayOverrides` — assign a `dayOverrides` override to some date via the reassign flow, then open a *different* routine's editor; confirm its toggle row only reflects `week[wd]`, never a one-off override.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add weekday assignment toggles to the routine editor

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Final end-to-end verification

**Files:**
- None modified — verification only.

**Interfaces:**
- Consumes: everything from Tasks 1-4, exercised together in one continuous session to catch anything that only shows up when the pieces interact (mirrors the spec's own Testing section).

- [ ] **Step 1: Run through the spec's full testing checklist in one session**

Using a fresh reload of the served instance (fixture `EXERCISES` re-injected if needed):

1. Assign the same routine to two different days via the routine editor's "Días asignados" toggles (Task 4). Confirm the week strip shows the same name on both.
2. Open one of those days, "Editar ejercicios" — confirm the scope question appears, naming the other day correctly.
3. Choose "Solo [día]" — confirm a fork happened (new id in `routines[]`, that day's slot repointed, the other day's slot untouched, edits from here on only affect this day).
4. Choose "Todos esos días" on a similarly-shared pair — confirm edits land on the shared object and both days reflect them.
5. Open a day whose routine isn't shared with anyone — confirm "Editar ejercicios" skips the question entirely.
6. From an empty day, "Iniciar sesión" → "Crear rutina" — confirm the editor opens, the day gets assigned, and the toggle row already shows it. Repeat choosing "Freestyle" instead — confirm an empty workout starts with no routine created.
7. Assign "Freestyle" to a day from the reassign list directly — confirm the week strip shows "Libre" and the day's detail view offers "Iniciar sesión" (straight to an empty workout) and "Cambiar", no "Editar ejercicios".
8. Confirm the guided workout mode, "Exportar rutina", "Compartir rutina", and the CSV export in Stats still work normally against a forked routine (pick one that went through a fork in step 3).
9. Confirm `startWorkout()` (the "Empezar" bottom-nav button) still starts today's effective routine/freestyle/rest correctly without any change in behavior from before this plan.
10. Regression: confirm the back-navigation behavior from the previous sub-project (physical back / gesture closing the day-overlay instead of exiting the app) still works — open a day, press back (or use the browser's back navigation in the preview), confirm it closes the overlay and returns to Inicio, not out of the app.

- [ ] **Step 2: Clean up any test data**

```js
localStorage.removeItem('hierro_routines'); // ROUTINES_KEY, index.html:513
localStorage.removeItem('hierro_week');     // WEEK_KEY, index.html:514
localStorage.removeItem('hierro_day_overrides'); // DAY_OVERRIDES_KEY, index.html:515
```

Only run this if real user data wasn't already present before testing started — if in doubt, inspect `localStorage` contents before clearing anything.

- [ ] **Step 3: Update the backlog**

Mark sub-proyecto 2 as done in `docs/BACKLOG.md` (same section updated when sub-proyecto 1 shipped), describing what was built, then commit:

```bash
git add docs/BACKLOG.md
git commit -m "$(cat <<'EOF'
Mark rutinas independientes por día as done in backlog

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
