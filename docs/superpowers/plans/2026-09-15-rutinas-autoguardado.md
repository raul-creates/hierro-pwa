# Rutinas: Autoguardado + Asignación de Día + Fix del Bug del 3er Ejercicio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the routine editor's discardable in-memory draft with real-time autosave straight to `routines[]`, remove the now-unnecessary Cancelar/Guardar footer (which also fixes a reproduced layout bug that hides the "+ Ejercicio" button once a routine has enough exercises), and simplify the weekly day-strip to a single tap that always opens the day-reassignment overlay.

**Architecture:** A module-level `editingRoutineId` (a string id into the real `routines[]` array) replaces the `editRoutine` draft object. Every function that today mutates `editRoutine` is rewritten to look up the live routine via a small `currentRoutine()` helper and call `saveRoutines()` immediately after each mutation — no separate draft, no explicit save step, no "unsaved changes" state to reconcile. This is a mechanical, single-file rewrite (`index.html`) with no new files and no dependencies.

**Tech Stack:** HTML/CSS/vanilla JS, single-file (`index.html`), no build step, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-15-rutinas-autoguardado-design.md`

## Global Constraints

- No test runner exists in this repo. "Testing" a step means: serve the folder locally (`python -m http.server 8099` from `C:\Code\hierro-pwa`, open `http://localhost:8099/index.html`), and manually verify in a browser — including reloading the page to confirm `localStorage` persistence where the step calls for it.
- The exercises dataset fetch (`raw.githubusercontent.com`) may be rate-limited/unavailable in some environments — if a plain page load shows "No se pudo cargar la biblioteca.", work around it by injecting a fixture `EXERCISES` array and manually finishing `init()`'s tail in the browser console (documented in Task 1's Step where first needed).
- Every mutator that used to touch `editRoutine.exercises` must instead resolve the live routine via `editingRoutineId` and persist with `saveRoutines()` immediately — there is no scenario in this plan where a change should sit unsaved in memory.
- Spanish/Argentina copy conventions used elsewhere in this file apply to any new user-facing string (there are none planned, but if a fallback string is needed, e.g. `'Rutina'` for an empty name, it must match this convention — already specified below).

---

### Task 1: Autosave core — replace `editRoutine` with `editingRoutineId`, rewrite every mutator, remove the save/cancel footer

**Files:**
- Modify: `index.html` (state declarations ~line 650-651; HTML ~lines 305, 342-359; CSS ~line 119; JS ~lines 1508-1609, 1771-1773)

**Interfaces:**
- Produces: `editingRoutineId` (module-level `let`, string id or `null`) — the id of the routine currently open in the editor. `currentRoutine()` — helper, returns `routines.find(r=>r.id===editingRoutineId)` or `undefined`. `updateRoutineName(val)` — new function, saves the routine's name (trimmed, falls back to `'Rutina'` if empty) on the name input's `change` event.
- Removes: `editRoutine` (global var), `editRoutinePreassignDay` (global var), `saveRoutine()`, `validateRoutineSave()`, the `.editor-footer` HTML block and its CSS rule, the `btn-routine-save` button.
- Consumes (unchanged): `saveRoutines()` (index.html:734, persists `routines` to `localStorage`), `routines` (global array), `uid()`, `emptyRoutineEx()`, `showView`, `showRoutines`.
- Known intentional intermediate state: after this task, `onWeekDayTap` (index.html:1471-1479, untouched until Task 3) still calls `newRoutine(wd)` with an argument — `newRoutine` no longer takes a parameter after this task, so that argument is silently ignored by JavaScript. The call still works (creates a new routine, just without day-preassignment, which matches this plan's end state anyway). Task 3 deletes `onWeekDayTap` entirely, so this is not a bug to fix here — do not "fix" `onWeekDayTap` in this task.
- Why the footer removal (the spec's section B) is folded into this task instead of being its own task: `saveRoutine()` is deleted in this same task (Step 5), and the footer's "Guardar rutina" button calls `saveRoutine()` — leaving the footer in place after deleting the function it calls would ship a dead button mid-task. The footer's removal is therefore mechanically inseparable from Step 5, not an arbitrary scope grab.

- [ ] **Step 1: Replace the state declarations**

Find (in `index.html`, ~line 650-651):
```js
let editRoutine = null;
let editRoutinePreassignDay = null;
```

Replace with:
```js
let editingRoutineId = null;
function currentRoutine(){ return routines.find(r=>r.id===editingRoutineId); }
```

- [ ] **Step 2: Rewrite `newRoutine`, `editRoutineFn`, `cancelRoutineEdit`**

Find (in `index.html`, ~line 1508-1526):
```js
function newRoutine(weekday){
  editRoutine={id:uid(), name:'', exercises:[emptyRoutineEx()]};
  editRoutinePreassignDay=weekday;
  const dayName = weekday!=null ? WEEKDAY_NAMES[weekday] : null;
  document.getElementById('routine-editor-title').textContent = dayName ? `Nueva rutina — ${dayName.charAt(0).toUpperCase()+dayName.slice(1)}` : 'Nueva rutina';
  document.getElementById('routine-name').value='';
  renderRoutineExercises();
  showView('view-routine-edit');
}
function editRoutineFn(id){
  const r=routines.find(x=>x.id===id); if(!r)return;
  editRoutine={id:r.id, name:r.name, exercises:r.exercises.map(e=>({...e,id:uid()}))};
  editRoutinePreassignDay=null;
  document.getElementById('routine-editor-title').textContent='Editar rutina';
  document.getElementById('routine-name').value=r.name;
  renderRoutineExercises();
  showView('view-routine-edit');
}
function cancelRoutineEdit(){ editRoutinePreassignDay!=null ? showLog() : showRoutines(); }
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
}
function editRoutineFn(id){
  const r=routines.find(x=>x.id===id); if(!r)return;
  editingRoutineId=id;
  document.getElementById('routine-editor-title').textContent='Editar rutina';
  document.getElementById('routine-name').value=r.name;
  renderRoutineExercises();
  showView('view-routine-edit');
}
function cancelRoutineEdit(){ showRoutines(); }
```

- [ ] **Step 3: Rewrite `renderRoutineExercises` and `buildRoutineExBlock`'s exercise-count check**

Find (in `index.html`, ~line 1528-1569):
```js
function renderRoutineExercises(){
  document.getElementById('routine-exercises-container').innerHTML=editRoutine.exercises.map((ex,i)=>buildRoutineExBlock(ex, i<editRoutine.exercises.length-1)).join('');
  validateRoutineSave();
}
function buildRoutineExBlock(ex, hasNext){
  const canRm=editRoutine.exercises.length>1;
```

Replace with:
```js
function renderRoutineExercises(){
  const r=currentRoutine(); if(!r)return;
  document.getElementById('routine-exercises-container').innerHTML=r.exercises.map((ex,i)=>buildRoutineExBlock(ex, i<r.exercises.length-1, r.exercises.length)).join('');
}
function buildRoutineExBlock(ex, hasNext, totalCount){
  const canRm=totalCount>1;
```

(The rest of `buildRoutineExBlock`'s body — from `const exData=EXERCISES.find(...)` through its closing `}` — is unchanged. Do not touch it; this Find/Replace only covers the function signature line and the `renderRoutineExercises` function above it.)

- [ ] **Step 4: Rewrite the six field-update functions, `addRoutineExercise`, and `removeRoutineExercise`, add `updateRoutineName`**

Find (in `index.html`, ~line 1570-1582):
```js
function updateRoutineExCat(id,cat){const ex=editRoutine.exercises.find(e=>e.id===id);if(!ex)return;ex.cat=cat;ex.exId='';renderRoutineExercises();}
function updateRoutineExId(id,val){const ex=editRoutine.exercises.find(e=>e.id===id);if(!ex)return;ex.exId=val;ex.cardioDuration=defaultCardioDuration(EXERCISES.find(x=>x.id===val));validateRoutineSave();}
function updateRoutineField(id,field,val){const ex=editRoutine.exercises.find(e=>e.id===id);if(!ex)return;ex[field]=field==='sets'?(parseInt(val,10)||0):val;}
function updateRoutinePerSide(id,checked){const ex=editRoutine.exercises.find(e=>e.id===id);if(!ex)return;ex.perSide=checked;}
function updateRoutineLinkedToNext(id,checked){const ex=editRoutine.exercises.find(e=>e.id===id);if(!ex)return;ex.linkedToNext=checked;}
function updateRoutineCardioDuration(id,checked){const ex=editRoutine.exercises.find(e=>e.id===id);if(!ex)return;ex.cardioDuration=checked;}
function addRoutineExercise(){editRoutine.exercises.push(emptyRoutineEx());renderRoutineExercises();setTimeout(()=>{const b=document.querySelectorAll('#routine-exercises-container .ex-block');if(b.length)b[b.length-1].scrollIntoView({behavior:'smooth'});},50);}
function removeRoutineExercise(id){
  if(editRoutine.exercises.length<=1)return;
  if(!confirm('¿Quitar este ejercicio de la rutina?'))return;
  editRoutine.exercises=editRoutine.exercises.filter(e=>e.id!==id);
  renderRoutineExercises();
}
```

Replace with:
```js
function updateRoutineExCat(id,cat){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex.cat=cat;ex.exId='';saveRoutines();renderRoutineExercises();}
function updateRoutineExId(id,val){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex.exId=val;ex.cardioDuration=defaultCardioDuration(EXERCISES.find(x=>x.id===val));saveRoutines();}
function updateRoutineField(id,field,val){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex[field]=field==='sets'?(parseInt(val,10)||0):val;saveRoutines();}
function updateRoutinePerSide(id,checked){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex.perSide=checked;saveRoutines();}
function updateRoutineLinkedToNext(id,checked){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex.linkedToNext=checked;saveRoutines();}
function updateRoutineCardioDuration(id,checked){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex.cardioDuration=checked;saveRoutines();}
function updateRoutineName(val){const r=currentRoutine();if(!r)return;r.name=val.trim()||'Rutina';saveRoutines();document.getElementById('routine-name').value=r.name;}
function addRoutineExercise(){const r=currentRoutine();if(!r)return;r.exercises.push(emptyRoutineEx());saveRoutines();renderRoutineExercises();setTimeout(()=>{const b=document.querySelectorAll('#routine-exercises-container .ex-block');if(b.length)b[b.length-1].scrollIntoView({behavior:'smooth'});},50);}
function removeRoutineExercise(id){
  const r=currentRoutine(); if(!r)return;
  if(r.exercises.length<=1)return;
  if(!confirm('¿Quitar este ejercicio de la rutina?'))return;
  r.exercises=r.exercises.filter(e=>e.id!==id);
  saveRoutines();
  renderRoutineExercises();
}
```

- [ ] **Step 5: Delete `validateRoutineSave` and `saveRoutine`**

Find (in `index.html`, ~line 1583-1597):
```js
function validateRoutineSave(){
  const name=document.getElementById('routine-name')?.value.trim();
  document.getElementById('btn-routine-save').disabled=!(editRoutine && name && editRoutine.exercises.every(e=>e.exId));
}
function saveRoutine(){
  const name=document.getElementById('routine-name').value.trim();
  const clean={id:editRoutine.id, name, exercises:editRoutine.exercises.map(({cat,exId,sets,reps,perSide,linkedToNext,cardioDuration})=>({cat,exId,sets:sets||3,reps:reps||'',perSide:!!perSide,linkedToNext:!!linkedToNext,cardioDuration:!!cardioDuration}))};
  const idx=routines.findIndex(r=>r.id===clean.id);
  if(idx>=0) routines[idx]=clean; else routines.push(clean);
  saveRoutines();
  if(editRoutinePreassignDay!=null){ week[String(editRoutinePreassignDay)]=clean.id; saveWeek(); }
  toast('Rutina guardada');
  renderPlanSemanal();
  editRoutinePreassignDay!=null ? showLog() : showRoutines();
}
function deleteRoutine(id){
```

Replace with:
```js
function deleteRoutine(id){
```

(This deletes both functions entirely and leaves `deleteRoutine`, which follows immediately after, untouched.)

- [ ] **Step 6: Fix the exercise picker's routine-mode lookup**

Find (in `index.html`, ~line 1771-1773):
```js
function renderPickerBody(){
  const block = pickerMode==='routine' ? editRoutine.exercises.find(e=>e.id===pickerExBlockId)
    : activeWorkout.entries.find(e=>e.id===pickerExBlockId);
```

Replace with:
```js
function renderPickerBody(){
  const block = pickerMode==='routine' ? currentRoutine()?.exercises.find(e=>e.id===pickerExBlockId)
    : activeWorkout.entries.find(e=>e.id===pickerExBlockId);
```

- [ ] **Step 7: Update the "+ Rutina" button and the name input's HTML**

Find (in `index.html`, ~line 305):
```html
        <button class="btn-primary" onclick="newRoutine(null)">+ Rutina</button>
```

Replace with:
```html
        <button class="btn-primary" onclick="newRoutine()">+ Rutina</button>
```

Find (in `index.html`, ~line 350):
```html
        <input type="text" id="routine-name" placeholder="Ej. Push, Pull, Piernas" oninput="validateRoutineSave()" style="width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:15px;outline:none">
```

Replace with:
```html
        <input type="text" id="routine-name" placeholder="Ej. Push, Pull, Piernas" onchange="updateRoutineName(this.value)" style="width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:15px;outline:none">
```

- [ ] **Step 8: Remove the Cancelar/Guardar footer (HTML + CSS)**

Find (in `index.html`, ~line 347-359):
```html
    <div class="editor-content">
      <div class="field-group">
        <div class="field-label">Nombre</div>
        <input type="text" id="routine-name" placeholder="Ej. Push, Pull, Piernas" onchange="updateRoutineName(this.value)" style="width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:15px;outline:none">
      </div>
      <div id="routine-exercises-container"></div>
      <button class="btn-add-ex" onclick="addRoutineExercise()">+ Ejercicio</button>
    </div>
    <div class="editor-footer">
      <button class="btn-cancel" onclick="cancelRoutineEdit()">Cancelar</button>
      <button class="btn-save" id="btn-routine-save" onclick="saveRoutine()" disabled>Guardar rutina</button>
    </div>
  </div>
```

Replace with:
```html
    <div class="editor-content">
      <div class="field-group">
        <div class="field-label">Nombre</div>
        <input type="text" id="routine-name" placeholder="Ej. Push, Pull, Piernas" onchange="updateRoutineName(this.value)" style="width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:15px;outline:none">
      </div>
      <div id="routine-exercises-container"></div>
      <button class="btn-add-ex" onclick="addRoutineExercise()">+ Ejercicio</button>
    </div>
  </div>
```

Find (in `index.html`, ~line 119):
```css
.editor-footer{position:fixed;bottom:56px;left:0;right:0;padding:10px 14px;background:#0F1117;border-top:1px solid #1E2130;display:flex;gap:9px;max-width:480px;margin:0 auto}
```

Replace with: (nothing — delete this line entirely, including its trailing newline)

**Do not delete** `.btn-cancel` or `.btn-save` (the CSS classes, ~lines 120-122) — they're shared with the guided-workout screen's nav buttons (`.wk-nav-row`, `#wk-finish-btn`), which are untouched by this plan.

- [ ] **Step 9: Verify in the browser**

Serve the folder and open it in a browser. If the exercises dataset fails to load (503 from `raw.githubusercontent.com`), inject a fixture and finish init manually in the console:
```js
EXERCISES=[
  {id:'0025',name:'x',category:'chest',target:'pectorals',secondary_muscles:[],equipment:'barbell',image:'i.jpg',gif_url:'v.gif',instructions:{es:'x'},instruction_steps:{es:['1']}},
  {id:'0007',name:'y',category:'back',target:'lats',secondary_muscles:[],equipment:'barbell',image:'i.jpg',gif_url:'v.gif',instructions:{es:'y'},instruction_steps:{es:['1']}},
  {id:'1512',name:'z',category:'legs',target:'quads',secondary_muscles:[],equipment:'barbell',image:'i.jpg',gif_url:'v.gif',instructions:{es:'z'},instruction_steps:{es:['1']}}
];
document.getElementById('loader').style.display='none';
document.getElementById('app').style.display='block';
showRoutines();
```

1. Tap "+ Rutina". Confirm the editor opens with an empty name field and one empty exercise row, and confirm via `JSON.stringify(routines[routines.length-1])` in the console that a routine was already pushed into `routines` (name `''`, one exercise with `exId:''`) — i.e. it's saved before you've typed anything.
2. Type a name, tab/click away (blur the field). Confirm `routines[routines.length-1].name` reflects it without touching any save button (there is none anymore).
3. Set the first exercise's group + specific exercise via the pickers. Add exercises one at a time (tap "+ Ejercicio") until there are 5. After each addition, confirm the "+ Ejercicio" button is fully visible and clickable — not obscured by anything — this is the condition that used to break at the 3rd exercise. Confirm no `.editor-footer`/Cancelar/Guardar bar is present anywhere in the editor.
4. With the routine still open and un-navigated-away-from, **reload the page** (`location.reload()` or the browser's reload button). Re-run the fixture injection from above if needed, then check `JSON.stringify(routines[routines.length-1])` in the console: confirm the name and all 5 exercises you set are still there, proving persistence survived a reload without any explicit save.
5. Tap the "←" back arrow. Confirm it returns to the Rutinas view without any prompt (nothing to lose, nothing to confirm).
6. Edit that same routine again via its card's ✏️ button. Change one exercise's sets/reps value, blur the field, reload the page again, and confirm the change persisted.
7. Clean up test data: `localStorage.removeItem('hierro_routines')` (the value of `ROUTINES_KEY`, index.html:513) if you don't want the test routines to linger.

- [ ] **Step 10: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Replace routine editor draft with direct autosave to routines[]

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `buildActiveWorkout` skips incomplete exercise slots

**Files:**
- Modify: `index.html` (JS: `buildActiveWorkout` ~line 984-1007)

**Interfaces:**
- Consumes: nothing new from Task 1 — this is an independent fix for a risk that autosave (Task 1) introduces (a routine can now be saved with an exercise slot that has no `exId` yet, where previously that was impossible because Guardar was disabled until every slot was complete).
- Produces: `buildActiveWorkout(routine, editingSession)` — same signature and return shape as before; when building from a `routine` (not an `editingSession`), exercises with an empty `exId` are silently skipped instead of becoming a broken entry.

- [ ] **Step 1: Add the filter**

Find (in `index.html`, ~line 997-1001):
```js
  const entries = routine ? routine.exercises.map(re=>({
    id: uid(), cat: re.cat, exId: re.exId, targetReps: re.reps||'', effort: '', perSide: !!re.perSide, linkedToNext: !!re.linkedToNext,
    cardioDuration: entryCardioDuration(re),
    sets: Array.from({length: re.sets||1}, ()=>({weight:'', reps:'', done:false}))
  })) : [];
```

Replace with:
```js
  const entries = routine ? routine.exercises.filter(re=>re.exId).map(re=>({
    id: uid(), cat: re.cat, exId: re.exId, targetReps: re.reps||'', effort: '', perSide: !!re.perSide, linkedToNext: !!re.linkedToNext,
    cardioDuration: entryCardioDuration(re),
    sets: Array.from({length: re.sets||1}, ()=>({weight:'', reps:'', done:false}))
  })) : [];
```

- [ ] **Step 2: Verify in the browser**

Using the same served instance (fixture `EXERCISES` from Task 1 still loaded if needed):

```js
routines.push({id:'testr1', name:'Test incompleta', exercises:[
  {cat:'chest', exId:'0025', sets:3, reps:'8-10', perSide:false, linkedToNext:false, cardioDuration:false},
  {cat:'back', exId:'', sets:3, reps:'', perSide:false, linkedToNext:false, cardioDuration:false}
]});
const aw = buildActiveWorkout(routines.find(r=>r.id==='testr1'), null);
JSON.stringify({entryCount: aw.entries.length, exIds: aw.entries.map(e=>e.exId)});
```

1. Confirm `entryCount` is `1` (not `2`) and `exIds` is `['0025']` — the incomplete second exercise was skipped, not turned into a broken entry.
2. Clean up: `routines=routines.filter(r=>r.id!=='testr1'); saveRoutines();`

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Skip exercises without a picked exId when building a workout from a routine

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Day-of-week tap always opens the reassignment overlay

**Files:**
- Modify: `index.html` (JS: `renderPlanSemanal` ~line 1381-1412, the long-press block ~line 1414-1424, `onWeekDayTap` ~line 1471-1479)

**Interfaces:**
- Consumes: `openDayOverlay(iso)` (unchanged — already exists, already does everything this task needs).
- Removes: `onWeekDayTap(iso)`, `startLongPress(iso)`, `cancelLongPress()`, the module-level `longPressTimer`/`longPressFired` variables, and the `onmousedown/onmouseup/onmouseleave/ontouchstart/ontouchend/ontouchmove/ontouchcancel` attributes on the week-strip day buttons.
- Does not touch: `openDayOverlay`, `closeDayOverlay`, `renderDayOverlay`, `pickDayOverlayChoice`, `applyDayOverride`, `dayOverlayIso`, `dayOverlayChoice` — all unchanged, all still used exactly as before, just reached by a plain tap now instead of a long-press.

- [ ] **Step 1: Simplify the day-strip button markup**

Find (in `index.html`, ~line 1398):
```js
    cellsHtml+=`<button class="${cls.join(' ')}" onclick="onWeekDayTap('${iso}')" onmousedown="startLongPress('${iso}')" onmouseup="cancelLongPress()" onmouseleave="cancelLongPress()" ontouchstart="startLongPress('${iso}')" ontouchend="cancelLongPress()" ontouchmove="cancelLongPress()" ontouchcancel="cancelLongPress()">
```

Replace with:
```js
    cellsHtml+=`<button class="${cls.join(' ')}" onclick="openDayOverlay('${iso}')">
```

- [ ] **Step 2: Remove the long-press timer state and functions**

Find (in `index.html`, ~line 1414-1424):
```js
let longPressTimer=null;
let longPressFired=false;
let dayOverlayIso='';
let dayOverlayChoice=null;
function startLongPress(iso){
  longPressFired=false;
  longPressTimer=setTimeout(()=>{longPressFired=true;openDayOverlay(iso);}, 500);
}
function cancelLongPress(){
  if(longPressTimer){clearTimeout(longPressTimer);longPressTimer=null;}
}
```

Replace with:
```js
let dayOverlayIso='';
let dayOverlayChoice=null;
```

- [ ] **Step 3: Delete `onWeekDayTap`**

Find (in `index.html`, ~line 1471-1479):
```js
function onWeekDayTap(iso){
  if(longPressFired){ longPressFired=false; return; }
  const effId=effectiveRoutineId(iso);
  if(effId==='rest'){ toast('Día de descanso'); return; }
  const routine=effId?routines.find(r=>r.id===effId):null;
  if(routine){ newSessionFromRoutine(routine); return; }
  const wd=new Date(iso+'T12:00:00').getDay();
  newRoutine(wd);
}
```

Replace with: (nothing — delete this function entirely, including its trailing blank line)

- [ ] **Step 4: Verify in the browser**

Using the same served instance, with at least 2 routines saved (from Task 1's testing, or create fresh ones via "+ Rutina"):

1. Tap a day in the week strip that currently shows "—" (no routine assigned). Confirm the day-reassignment overlay opens immediately (no delay, no need to hold) — it must NOT create a new routine or do anything else.
2. Pick a routine from the overlay's list, tap "Cambiar todos los [día]". Confirm the overlay closes, the strip updates to show that routine's name on that day, and `week[String(weekdayNumber)]` reflects the chosen routine's id.
3. Tap that same day again (now showing an assigned routine). Confirm it opens the reassignment overlay again — it must NOT start a workout.
4. Tap "Solo hoy" with a different routine selected (if today happens to be the day you're testing) or verify via console that `dayOverrides` gets the override id when choosing "Solo hoy" instead of "Cambiar todos los...".
5. Confirm the "Empezar" button (bottom-nav) still correctly starts today's effective routine (unchanged behavior, `startWorkout()` was not touched by this task).
6. Confirm no console errors reference `onWeekDayTap`, `startLongPress`, or `cancelLongPress` anywhere in the app (search `grep -n "onWeekDayTap\|startLongPress\|cancelLongPress" index.html` — should return zero results after this task).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Simplify week-strip day tap to always open the reassignment overlay

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Final end-to-end verification

**Files:**
- None modified — verification only.

**Interfaces:**
- Consumes: everything from Tasks 1-3, exercised together in one continuous session to catch anything that only shows up when the three changes interact.

- [ ] **Step 1: Run through the spec's full testing checklist in one session**

Using the same served instance (fresh reload, fixture `EXERCISES` re-injected if needed per Task 1 Step 9's script):

1. Create a routine, add 4-5 exercises in a row. Confirm "+ Ejercicio" never becomes unclickable or hidden at any point (re-run of Task 1's core repro, now with the full flow — creation through multiple additions — in one pass).
2. Reload the page mid-edit (after adding exercises but without navigating away first). Confirm everything persisted — name, all exercises, their sets/reps/toggles.
3. Edit an existing routine's name, one checkbox, and sets/reps. Confirm each persists individually (spot-check with a reload between a couple of the edits).
4. Create a routine, add a 2nd exercise, pick only its muscle group (not the specific exercise), then tap "←" to leave. Confirm the routine is in the list with that incomplete slot, and confirm starting a workout from that routine (via the week-strip or "Empezar") does not error and simply omits the incomplete exercise (Task 2's fix).
5. Tap a day in the week strip with and without a routine assigned. Confirm it always opens the reassignment overlay, never starts a workout or creates a routine directly.
6. With 2+ routines, assign one via "Cambiar todos los [día]" and another via "Solo hoy". Confirm both paths still work as before.
7. Confirm "Empezar" still starts the effective routine for today without any change in behavior.
8. Visual regression check: confirm the Cancelar/Guardar bar is gone from the routine editor, the header's "←" is the only way back, and nothing else in the app (guided workout's own Anterior/Siguiente/Terminar buttons, which share the `.btn-cancel`/`.btn-save` CSS classes) changed appearance.

- [ ] **Step 2: Clean up any test data**

```js
localStorage.removeItem('hierro_routines'); // ROUTINES_KEY, index.html:513
localStorage.removeItem('hierro_week');     // WEEK_KEY, index.html:514
```

Only run this if real user data wasn't already present before testing started — if in doubt, inspect `localStorage` contents before clearing anything.
