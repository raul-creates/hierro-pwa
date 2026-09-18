# Series Con Peso Planificado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a routine's exercises define individual series with their own planned weight and reps (instead of a single "cantidad de series + rango de reps" pair), with optional per-exercise "same weight"/"same reps for all series" shortcuts, a global on/off setting for automatic progression, and progression that now compares per-serie against the matching serie of the last session — all without migrating any already-saved user data.

**Architecture:** `routine.exercises[i].sets` changes shape from a number to an array of `{weight, reps}` objects — the same shape the live workout already uses for `entry.sets` (minus the live-only `done` flag). A single pure function, `normalizeRoutineExercise(ex)`, is called at every point a routine enters the app (load from `localStorage`, import a file, load a starter template — the share-link path already funnels through the same import cleaner) so old-shape data is converted on the fly, never rewritten in place. This is a single-file change (`index.html`), no new dependencies.

**Tech Stack:** HTML/CSS/vanilla JS, single-file (`index.html`), no build step, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-17-series-con-peso-planificado-design.md`

## Global Constraints

- No test runner exists in this repo. "Testing" a step means: serve the folder locally (`npx http-server hierro-pwa -p 5175` from `C:\Code`, or the `hierro-pwa` entry in `C:\Code\.claude\launch.json`), and manually verify in a browser — including reloading the page to confirm `localStorage` persistence where a step calls for it.
- Never migrate or rewrite already-saved data (`localStorage`, `STARTER_TEMPLATES`) in place. `normalizeRoutineExercise(ex)` is the only place old-shape data gets converted, and it runs on read, not on write.
- Migrating an old-shape exercise (`sets` as a number) produces that many series with **blank** weight and reps — never attempt to parse the old `reps` range string (e.g. "8-10") into a number.
- `autoProgressionEnabled` defaults to `true` (no behavior change for existing users until they touch the new setting).
- Every new user-facing string matches existing Spanish/Argentina copy conventions (informal "vos", sentence case, no exclamation marks on functional copy).

---

### Task 1: "Progresión automática" toggle in Ajustes

**Files:**
- Modify: `index.html` (HTML: `view-settings` ~line 308-334; JS: key/state declarations ~line 525-528, 661-662; `init()` ~line 704-711; `showSettings()` ~line 752-756)

**Interfaces:**
- Produces: `autoProgressionEnabled` (module-level `let`, boolean, default `true`), `AUTO_PROGRESSION_KEY` (const, `'hierro_auto_progression'`), `loadAutoProgression()` (reads the key, returns `false` only if the stored value is exactly `'off'`, `true` otherwise — including when nothing is stored yet), `saveAutoProgression()`, `setAutoProgression(on)` (sets `autoProgressionEnabled`, persists, updates the two toggle buttons' `active` class).
- Consumes: nothing new — mirrors the existing `effortScale`/`EFFORT_SCALE_KEY`/`loadEffortScale`/`saveEffortScale`/`setEffortScale` pattern exactly, same file, same conventions.
- A later task (Task 4) reads `autoProgressionEnabled` directly — this task must leave it correctly initialized before `init()` renders anything that depends on it.

- [ ] **Step 1: Add the storage key**

Find (in `index.html`, ~line 525-528):
```js
const REST_SEC_KEY = 'hierro_rest_sec';
const EFFORT_SCALE_KEY = 'hierro_effort_scale';
const LAST_BACKUP_KEY = 'hierro_last_backup';
const DISMISSED_NOTICES_KEY = 'hierro_dismissed_notices';
```

Replace with:
```js
const REST_SEC_KEY = 'hierro_rest_sec';
const EFFORT_SCALE_KEY = 'hierro_effort_scale';
const AUTO_PROGRESSION_KEY = 'hierro_auto_progression';
const LAST_BACKUP_KEY = 'hierro_last_backup';
const DISMISSED_NOTICES_KEY = 'hierro_dismissed_notices';
```

- [ ] **Step 2: Add the module-level state**

Find (in `index.html`, ~line 661-664):
```js
let restSec = 90;
let effortScale = 'rpe';
let activeWorkout = null;
let workoutTimerInterval = null;
```

Replace with:
```js
let restSec = 90;
let effortScale = 'rpe';
let autoProgressionEnabled = true;
let activeWorkout = null;
let workoutTimerInterval = null;
```

- [ ] **Step 3: Add load/save/set functions**

Find (in `index.html`, ~line 768-774, right after `loadEffortScale`/`saveEffortScale`):
```js
function loadEffortScale(){const v=localStorage.getItem(EFFORT_SCALE_KEY);return v==='rir'?'rir':'rpe';}
function saveEffortScale(){localStorage.setItem(EFFORT_SCALE_KEY,effortScale);}
```

Replace with:
```js
function loadEffortScale(){const v=localStorage.getItem(EFFORT_SCALE_KEY);return v==='rir'?'rir':'rpe';}
function saveEffortScale(){localStorage.setItem(EFFORT_SCALE_KEY,effortScale);}
function loadAutoProgression(){return localStorage.getItem(AUTO_PROGRESSION_KEY)!=='off';}
function saveAutoProgression(){localStorage.setItem(AUTO_PROGRESSION_KEY, autoProgressionEnabled?'on':'off');}
function setAutoProgression(on){
  autoProgressionEnabled=on;
  saveAutoProgression();
  document.getElementById('settings-autoprog-on').classList.toggle('active', on);
  document.getElementById('settings-autoprog-off').classList.toggle('active', !on);
}
```

- [ ] **Step 4: Load the setting on init**

Find (in `index.html`, ~line 704-711):
```js
async function init() {
  document.getElementById('loader-quote').textContent = randomQuote();
  log = loadLog();
  routines = loadRoutines();
  week = loadWeek();
  dayOverrides = loadDayOverrides();
  restSec = loadRestSec();
  effortScale = loadEffortScale();
```

Replace with:
```js
async function init() {
  document.getElementById('loader-quote').textContent = randomQuote();
  log = loadLog();
  routines = loadRoutines();
  week = loadWeek();
  dayOverrides = loadDayOverrides();
  restSec = loadRestSec();
  effortScale = loadEffortScale();
  autoProgressionEnabled = loadAutoProgression();
```

- [ ] **Step 5: Add the HTML toggle to Ajustes**

Find (in `index.html`, ~line 318-324):
```html
      <div class="field-group">
        <div class="field-label">Escala de esfuerzo</div>
        <div class="gd-prog-toggle">
          <button type="button" class="gsg-btn" id="settings-effort-rpe" onclick="setEffortScale('rpe')">RPE (1-10)</button>
          <button type="button" class="gsg-btn" id="settings-effort-rir" onclick="setEffortScale('rir')">RIR (0-5)</button>
        </div>
      </div>
```

Replace with:
```html
      <div class="field-group">
        <div class="field-label">Escala de esfuerzo</div>
        <div class="gd-prog-toggle">
          <button type="button" class="gsg-btn" id="settings-effort-rpe" onclick="setEffortScale('rpe')">RPE (1-10)</button>
          <button type="button" class="gsg-btn" id="settings-effort-rir" onclick="setEffortScale('rir')">RIR (0-5)</button>
        </div>
      </div>
      <div class="field-group">
        <div class="field-label">Progresión automática</div>
        <div class="gd-prog-toggle">
          <button type="button" class="gsg-btn" id="settings-autoprog-on" onclick="setAutoProgression(true)">Activada</button>
          <button type="button" class="gsg-btn" id="settings-autoprog-off" onclick="setAutoProgression(false)">Desactivada</button>
        </div>
      </div>
```

- [ ] **Step 6: Reflect the setting when Ajustes opens**

Find (in `index.html`, ~line 752-756):
```js
function showSettings(){
  document.getElementById('settings-rest-sec').value=restSec;
  document.getElementById('settings-effort-rpe').classList.toggle('active', effortScale==='rpe');
  document.getElementById('settings-effort-rir').classList.toggle('active', effortScale==='rir');
  renderLastBackupLabel();
```

Replace with:
```js
function showSettings(){
  document.getElementById('settings-rest-sec').value=restSec;
  document.getElementById('settings-effort-rpe').classList.toggle('active', effortScale==='rpe');
  document.getElementById('settings-effort-rir').classList.toggle('active', effortScale==='rir');
  document.getElementById('settings-autoprog-on').classList.toggle('active', autoProgressionEnabled);
  document.getElementById('settings-autoprog-off').classList.toggle('active', !autoProgressionEnabled);
  renderLastBackupLabel();
```

- [ ] **Step 7: Verify in the browser**

Serve the folder and open it (inject the `EXERCISES` fixture from earlier plans in the console if the dataset fetch fails).

1. Open Ajustes. Confirm a new "Progresión automática" row appears below "Escala de esfuerzo", with "Activada" highlighted by default.
2. Tap "Desactivada". Confirm it highlights instead, and `localStorage.getItem('hierro_auto_progression')` is `'off'`.
3. Reload the page, reopen Ajustes. Confirm "Desactivada" is still highlighted (persisted).
4. In the console, run `localStorage.removeItem('hierro_auto_progression'); location.reload();` — reopen Ajustes and confirm it defaults back to "Activada" (never-set = on).

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add Progresión automática toggle to Ajustes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Data model normalization + per-serie editor UI

**Files:**
- Modify: `index.html` (JS: `loadRoutines` ~line 741, `loadTemplate` ~line 1402-1420, `emptyRoutineEx` ~line 1429, `buildRoutineExBlock` and the six `updateRoutine*` functions ~line 1746-1789; JS: `cleanImportedRoutineData` ~line 1907-1913)

**Interfaces:**
- Produces: `normalizeRoutineExercise(ex)` — pure function, returns `ex` unchanged if `ex.sets` is already an array, otherwise returns a new object with `sets` replaced by an array of that many `{weight:'', reps:''}` entries (dropping the old top-level `reps` field). `emptyRoutineEx()` now returns `sets:[{weight:'',reps:''}]` plus two new boolean fields `sameWeightForAllSets`/`sameRepsForAllSets` (both `false`). New editor functions: `updateRoutineSetField(id,si,field,val)`, `bumpRoutineSet(id,si,field,delta)`, `addRoutineSet(id)`, `removeRoutineSet(id,si)`, `toggleRoutineSameWeight(id,checked)`, `toggleRoutineSameReps(id,checked)`, `updateRoutineSameWeight(id,val)`, `updateRoutineSameReps(id,val)`, `bumpRoutineSameWeight(id,delta)`, `bumpRoutineSameReps(id,delta)`.
- Removes: `updateRoutineField(id,field,val)` (operated on the old flat `sets`/`reps` fields, which no longer exist in that form).
- Consumes: `currentRoutine()`, `saveRoutines()`, `EXERCISES`, `esName(ex)`, `GROUPS`, `showCardioToggle(ex)`, `defaultCardioDuration(ex)`, `openPicker(id,mode)`, `removeRoutineExercise(id)` (all unchanged, already exist).
- Note on `acceptSharedRoutine()` (index.html:1894-1902): it is **not** touched by this task. It builds a routine directly from `pendingSharedRoutine.exercises`, which was already produced by `cleanImportedRoutineData` (this task normalizes there) — normalizing twice would be redundant.

- [ ] **Step 1: Add `normalizeRoutineExercise` and use it in `loadRoutines`**

Find (in `index.html`, ~line 741):
```js
function loadRoutines(){try{return JSON.parse(localStorage.getItem(ROUTINES_KEY))||[];}catch{return[];}}
```

Replace with:
```js
function normalizeRoutineExercise(ex){
  if(Array.isArray(ex.sets)) return ex;
  const {reps, sets, ...rest} = ex;
  const count = sets || 1;
  return {...rest, sets: Array.from({length:count}, ()=>({weight:'', reps:''}))};
}
function loadRoutines(){
  let r; try{ r=JSON.parse(localStorage.getItem(ROUTINES_KEY))||[]; }catch{ r=[]; }
  r.forEach(routine=>{ routine.exercises=routine.exercises.map(normalizeRoutineExercise); });
  return r;
}
```

- [ ] **Step 2: Normalize on template load**

Find (in `index.html`, ~line 1402-1409):
```js
function loadTemplate(id){
  routinePickMode=null;
  const t=STARTER_TEMPLATES.find(x=>x.id===id); if(!t)return;
  const createdIds = t.routines.map(r=>{
    const newId=uid();
    routines.push({id:newId, name:r.name, exercises:r.exercises.map(e=>({...e}))});
    return newId;
  });
```

Replace with:
```js
function loadTemplate(id){
  routinePickMode=null;
  const t=STARTER_TEMPLATES.find(x=>x.id===id); if(!t)return;
  const createdIds = t.routines.map(r=>{
    const newId=uid();
    routines.push({id:newId, name:r.name, exercises:r.exercises.map(e=>normalizeRoutineExercise({...e}))});
    return newId;
  });
```

- [ ] **Step 3: Normalize on file/share import**

Find (in `index.html`, ~line 1907-1910):
```js
function cleanImportedRoutineData(data){
  if(!data || data.hierro_routine!==1 || !Array.isArray(data.exercises)) return {error:'No es una rutina válida'};
  const cleanExercises=data.exercises.filter(ex=>EXERCISES.some(x=>x.id===ex.exId)).map(({exId,cat,sets,reps})=>({exId,cat,sets:sets||3,reps:reps||''}));
  if(!cleanExercises.length) return {error:'Ningún ejercicio de la rutina es válido'};
```

Replace with:
```js
function cleanImportedRoutineData(data){
  if(!data || data.hierro_routine!==1 || !Array.isArray(data.exercises)) return {error:'No es una rutina válida'};
  const cleanExercises=data.exercises.filter(ex=>EXERCISES.some(x=>x.id===ex.exId)).map(({exId,cat,sets,reps})=>normalizeRoutineExercise({exId,cat,sets,reps}));
  if(!cleanExercises.length) return {error:'Ningún ejercicio de la rutina es válido'};
```

- [ ] **Step 4: New shape for `emptyRoutineEx`**

Find (in `index.html`, ~line 1429):
```js
function emptyRoutineEx(){return{id:uid(),cat:'',exId:'',sets:3,reps:'',perSide:false,linkedToNext:false,cardioDuration:false};}
```

Replace with:
```js
function emptyRoutineEx(){return{id:uid(),cat:'',exId:'',sets:[{weight:'',reps:''}],perSide:false,linkedToNext:false,cardioDuration:false,sameWeightForAllSets:false,sameRepsForAllSets:false};}
```

- [ ] **Step 5: Rewrite `buildRoutineExBlock` with per-serie rows and the two toggles**

Find (in `index.html`, ~line 1746-1783):
```js
function buildRoutineExBlock(ex, hasNext, totalCount){
  const canRm=totalCount>1;
  const exData=EXERCISES.find(e=>e.id===ex.exId);
  const groupOpts=GROUPS.map(g=>`<option value="${g.id}"${ex.cat===g.id?' selected':''}>${g.label}</option>`).join('');
  return`<div class="swipe-row" data-delete-fn="removeRoutineExercise" data-delete-arg="${ex.id}" data-swipe-disabled="${!canRm}">
    <div class="swipe-bg"><span class="swipe-bg-icon">🗑️</span><span>Borrar</span></div>
    <div class="swipe-content ex-block" id="rexblock-${ex.id}">
    <div class="ex-block-top">
      <div class="ex-selectors">
        <select class="step-select${!ex.cat?' ph':''}" onchange="updateRoutineExCat('${ex.id}',this.value)">
          <option value="">— Grupo muscular —</option>${groupOpts}
        </select>
        ${ex.cat?`<button type="button" class="step-select picker-trigger${!ex.exId?' ph':''}" onclick="openPicker('${ex.id}','routine')">${exData?`<span class="picker-trigger-thumb"><img src="${RAW+exData.image}" loading="lazy" onerror="this.style.display='none'"></span><span>${esName(exData)}</span>`:'— Ejercicio —'}</button>`:''}
      </div>
      <button class="btn-remove-ex" onclick="removeRoutineExercise('${ex.id}')" ${!canRm?'disabled style="color:#1E2130"':''}>✕</button>
    </div>
    <div class="sets-hdr"><span style="width:14px;flex-shrink:0"></span><span>Series</span><span>Reps objetivo</span><span class="col-x"></span></div>
    <div class="set-row">
      <span class="set-dot">●</span>
      <div class="set-iw"><input type="number" inputmode="numeric" placeholder="3" value="${ex.sets||''}" onchange="updateRoutineField('${ex.id}','sets',this.value)"></div>
      <div class="set-iw"><input type="text" placeholder="ej. 8-10" value="${ex.reps||''}" onchange="updateRoutineField('${ex.id}','reps',this.value)"></div>
      <span class="col-x"></span>
    </div>
    <label class="effort-row" style="cursor:pointer">
      <span class="field-label" style="margin:0">Por lado</span>
      <input type="checkbox" ${ex.perSide?'checked':''} onchange="updateRoutinePerSide('${ex.id}', this.checked)">
    </label>
    ${hasNext?`<label class="effort-row" style="cursor:pointer">
      <span class="field-label" style="margin:0">Superset con el siguiente ejercicio</span>
      <input type="checkbox" ${ex.linkedToNext?'checked':''} onchange="updateRoutineLinkedToNext('${ex.id}', this.checked)">
    </label>`:''}
    ${showCardioToggle(exData)?`<label class="effort-row" style="cursor:pointer">
      <span class="field-label" style="margin:0">Registrar como duración</span>
      <input type="checkbox" ${ex.cardioDuration?'checked':''} onchange="updateRoutineCardioDuration('${ex.id}', this.checked)">
    </label>`:''}
    </div>
  </div>`;
}
```

Replace with:
```js
function buildRoutineExBlock(ex, hasNext, totalCount){
  const canRm=totalCount>1;
  const exData=EXERCISES.find(e=>e.id===ex.exId);
  const groupOpts=GROUPS.map(g=>`<option value="${g.id}"${ex.cat===g.id?' selected':''}>${g.label}</option>`).join('');
  const isBodyweight = exData?.equipment==='body weight';
  const sameW=!!ex.sameWeightForAllSets, sameR=!!ex.sameRepsForAllSets;
  const sharedWeight=(ex.sets[0]&&ex.sets[0].weight)||'', sharedReps=(ex.sets[0]&&ex.sets[0].reps)||'';
  const sharedRowHtml=(sameW||sameR)?`<div class="set-row">
      <span class="set-dot">◆</span>
      ${sameW?`<div class="set-iw stp-wrap">
        <button type="button" class="stp-btn" onclick="bumpRoutineSameWeight('${ex.id}',-2.5)">−</button>
        <input type="number" inputmode="decimal" placeholder="${isBodyweight?'Corporal':'0'}" value="${sharedWeight}" onchange="updateRoutineSameWeight('${ex.id}',this.value)">
        <button type="button" class="stp-btn" onclick="bumpRoutineSameWeight('${ex.id}',2.5)">+</button>
      </div>`:'<span class="set-iw"></span>'}
      ${sameR?`<div class="set-iw stp-wrap">
        <button type="button" class="stp-btn" onclick="bumpRoutineSameReps('${ex.id}',-1)">−</button>
        <input type="number" inputmode="numeric" placeholder="0" value="${sharedReps}" onchange="updateRoutineSameReps('${ex.id}',this.value)">
        <button type="button" class="stp-btn" onclick="bumpRoutineSameReps('${ex.id}',1)">+</button>
      </div>`:'<span class="set-iw"></span>'}
      <span class="col-x"></span>
    </div>`:'';
  const rowsHtml=ex.sets.map((s,si)=>{
    const canRmSet=ex.sets.length>1;
    const weightCell=sameW?'<span class="set-iw"></span>':`<div class="set-iw stp-wrap">
        <button type="button" class="stp-btn" onclick="bumpRoutineSet('${ex.id}',${si},'weight',-2.5)">−</button>
        <input type="number" inputmode="decimal" placeholder="${isBodyweight?'Corporal':'0'}" value="${s.weight}" onchange="updateRoutineSetField('${ex.id}',${si},'weight',this.value)">
        <button type="button" class="stp-btn" onclick="bumpRoutineSet('${ex.id}',${si},'weight',2.5)">+</button>
      </div>`;
    const repsCell=sameR?'<span class="set-iw"></span>':`<div class="set-iw stp-wrap">
        <button type="button" class="stp-btn" onclick="bumpRoutineSet('${ex.id}',${si},'reps',-1)">−</button>
        <input type="number" inputmode="numeric" placeholder="0" value="${s.reps}" onchange="updateRoutineSetField('${ex.id}',${si},'reps',this.value)">
        <button type="button" class="stp-btn" onclick="bumpRoutineSet('${ex.id}',${si},'reps',1)">+</button>
      </div>`;
    return `<div class="set-row">
      <span class="set-dot">●</span>
      ${weightCell}${repsCell}
      <button class="btn-rm-set" onclick="removeRoutineSet('${ex.id}',${si})" ${!canRmSet?'disabled style="opacity:0.2"':''}>✕</button>
    </div>`;
  }).join('');
  return`<div class="swipe-row" data-delete-fn="removeRoutineExercise" data-delete-arg="${ex.id}" data-swipe-disabled="${!canRm}">
    <div class="swipe-bg"><span class="swipe-bg-icon">🗑️</span><span>Borrar</span></div>
    <div class="swipe-content ex-block" id="rexblock-${ex.id}">
    <div class="ex-block-top">
      <div class="ex-selectors">
        <select class="step-select${!ex.cat?' ph':''}" onchange="updateRoutineExCat('${ex.id}',this.value)">
          <option value="">— Grupo muscular —</option>${groupOpts}
        </select>
        ${ex.cat?`<button type="button" class="step-select picker-trigger${!ex.exId?' ph':''}" onclick="openPicker('${ex.id}','routine')">${exData?`<span class="picker-trigger-thumb"><img src="${RAW+exData.image}" loading="lazy" onerror="this.style.display='none'"></span><span>${esName(exData)}</span>`:'— Ejercicio —'}</button>`:''}
      </div>
      <button class="btn-remove-ex" onclick="removeRoutineExercise('${ex.id}')" ${!canRm?'disabled style="color:#1E2130"':''}>✕</button>
    </div>
    <div class="sets-hdr"><span style="width:14px;flex-shrink:0"></span><span>${sameW?'':'Peso'}</span><span>${sameR?'':'Reps'}</span><span class="col-x"></span></div>
    ${sharedRowHtml}
    ${rowsHtml}
    <button type="button" class="btn-add-set" onclick="addRoutineSet('${ex.id}')">+ Serie</button>
    <label class="effort-row" style="cursor:pointer">
      <span class="field-label" style="margin:0">Mismo peso para todas las series</span>
      <input type="checkbox" ${sameW?'checked':''} onchange="toggleRoutineSameWeight('${ex.id}', this.checked)">
    </label>
    <label class="effort-row" style="cursor:pointer">
      <span class="field-label" style="margin:0">Mismas reps para todas las series</span>
      <input type="checkbox" ${sameR?'checked':''} onchange="toggleRoutineSameReps('${ex.id}', this.checked)">
    </label>
    <label class="effort-row" style="cursor:pointer">
      <span class="field-label" style="margin:0">Por lado</span>
      <input type="checkbox" ${ex.perSide?'checked':''} onchange="updateRoutinePerSide('${ex.id}', this.checked)">
    </label>
    ${hasNext?`<label class="effort-row" style="cursor:pointer">
      <span class="field-label" style="margin:0">Superset con el siguiente ejercicio</span>
      <input type="checkbox" ${ex.linkedToNext?'checked':''} onchange="updateRoutineLinkedToNext('${ex.id}', this.checked)">
    </label>`:''}
    ${showCardioToggle(exData)?`<label class="effort-row" style="cursor:pointer">
      <span class="field-label" style="margin:0">Registrar como duración</span>
      <input type="checkbox" ${ex.cardioDuration?'checked':''} onchange="updateRoutineCardioDuration('${ex.id}', this.checked)">
    </label>`:''}
    </div>
  </div>`;
}
```

- [ ] **Step 6: Replace `updateRoutineField` with the new per-serie and shared-value functions**

Find (in `index.html`, ~line 1786):
```js
function updateRoutineField(id,field,val){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex[field]=field==='sets'?(parseInt(val,10)||3):val;saveRoutines();}
```

Replace with:
```js
function updateRoutineSetField(id,si,field,val){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;const s=ex.sets[si];if(!s)return;s[field]=val;saveRoutines();}
function bumpRoutineSet(id,si,field,delta){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;const s=ex.sets[si];if(!s)return;const cur=parseFloat(s[field])||0;s[field]=Math.max(0, Math.round((cur+delta)*100)/100);saveRoutines();renderRoutineExercises();}
function addRoutineSet(id){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;const last=ex.sets[ex.sets.length-1];ex.sets.push({weight:last?last.weight:'', reps:last?last.reps:''});saveRoutines();renderRoutineExercises();}
function removeRoutineSet(id,si){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;if(ex.sets.length<=1)return;if(!confirm('¿Eliminar esta serie?'))return;ex.sets.splice(si,1);saveRoutines();renderRoutineExercises();}
function toggleRoutineSameWeight(id,checked){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex.sameWeightForAllSets=checked;if(checked){const w=(ex.sets[0]&&ex.sets[0].weight)||'';ex.sets.forEach(s=>s.weight=w);}saveRoutines();renderRoutineExercises();}
function toggleRoutineSameReps(id,checked){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex.sameRepsForAllSets=checked;if(checked){const rp=(ex.sets[0]&&ex.sets[0].reps)||'';ex.sets.forEach(s=>s.reps=rp);}saveRoutines();renderRoutineExercises();}
function updateRoutineSameWeight(id,val){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex.sets.forEach(s=>s.weight=val);saveRoutines();}
function updateRoutineSameReps(id,val){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;ex.sets.forEach(s=>s.reps=val);saveRoutines();}
function bumpRoutineSameWeight(id,delta){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;const cur=parseFloat(ex.sets[0]&&ex.sets[0].weight)||0;const next=Math.max(0, Math.round((cur+delta)*100)/100);ex.sets.forEach(s=>s.weight=next);saveRoutines();renderRoutineExercises();}
function bumpRoutineSameReps(id,delta){const r=currentRoutine();if(!r)return;const ex=r.exercises.find(e=>e.id===id);if(!ex)return;const cur=parseFloat(ex.sets[0]&&ex.sets[0].reps)||0;const next=Math.max(0, Math.round((cur+delta)*100)/100);ex.sets.forEach(s=>s.reps=next);saveRoutines();renderRoutineExercises();}
```

- [ ] **Step 7: Verify in the browser**

Serve the folder, reload (inject the `EXERCISES` fixture in the console if needed).

1. Tap "+ Rutina", pick a group/exercise for the first slot. Confirm it shows one serie row (peso + reps, each with +/- steppers) instead of the old "cantidad + rango" row, and a "+ Serie" button below it.
2. Tap "+ Serie" twice (3 series total). Load different weight/reps into each (e.g. 20kg×12, 22.5kg×10, 25kg×8). Reload the page — confirm all 3 series and their distinct values persisted.
3. Tap "Mismo peso para todas las series". Confirm the 3 individual weight inputs collapse into a single shared one, pre-filled with the first serie's weight (20kg). Change it to 30kg — confirm (via console, `JSON.stringify(currentRoutine())` won't work since `editingRoutineId` may be null after navigating; instead check `routines[routines.length-1].exercises[0].sets`) that all 3 series now show `weight:30`. Untick the checkbox — confirm 3 individual inputs reappear, all showing 30.
4. Repeat step 3 for "Mismas reps para todas las series", independently (weight toggle should stay whatever you left it at).
5. Remove a serie via its ✕ (with 2+ series left) — confirm a confirm() dialog appears (matching the live workout's own set-removal confirm), and canceling it leaves the serie in place.
6. Load a starter template (Plantillas → any). Confirm its exercises show up with the right number of series (matching the template's original `sets` number), all with blank weight/reps, individually editable — and confirm via `grep -c "sets:\[{weight" index.html` (or just eyeballing the `STARTER_TEMPLATES` block) that the hardcoded template data itself was NOT rewritten in the source file.
7. Export a routine (Exportar rutina), then import that same file back in (Importar rutina) — confirm the imported copy shows the same series/weights/reps.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Replace routine sets-count+reps-range with individual per-serie rows

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `buildActiveWorkout` copies planned series directly

**Files:**
- Modify: `index.html` (JS: `buildActiveWorkout`, routine branch, ~line 1046-1050)

**Interfaces:**
- Produces: `buildActiveWorkout(routine, editingSession)` — same signature and return shape as before. When building from a `routine`, each entry's `sets` array is now a direct copy of that exercise's planned `re.sets` (each with `done:false` added), instead of a blank array sized by a count. `targetReps` is now derived from the first planned serie's reps (`re.sets[0].reps`) instead of the old flat `re.reps` field, kept only as a UI placeholder fallback for `buildWorkoutSetRow` (unchanged elsewhere).
- Consumes: `routine.exercises[i].sets` now being an array (guaranteed by Task 2's `normalizeRoutineExercise`, already run by the time any `routine` object reaches this function — every routine in `routines[]` was normalized on load/import/template).

- [ ] **Step 1: Copy planned sets instead of generating blank ones**

Find (in `index.html`, ~line 1046-1050):
```js
  const entries = routine ? routine.exercises.filter(re=>re.exId).map(re=>({
    id: uid(), cat: re.cat, exId: re.exId, targetReps: re.reps||'', effort: '', perSide: !!re.perSide, linkedToNext: !!re.linkedToNext,
    cardioDuration: entryCardioDuration(re),
    sets: Array.from({length: re.sets||1}, ()=>({weight:'', reps:'', done:false}))
  })) : [];
```

Replace with:
```js
  const entries = routine ? routine.exercises.filter(re=>re.exId).map(re=>({
    id: uid(), cat: re.cat, exId: re.exId, targetReps: (re.sets[0]&&re.sets[0].reps)||'', effort: '', perSide: !!re.perSide, linkedToNext: !!re.linkedToNext,
    cardioDuration: entryCardioDuration(re),
    sets: re.sets.map(s=>({weight: s.weight||'', reps: s.reps||'', done:false}))
  })) : [];
```

- [ ] **Step 2: Verify in the browser**

Using a routine from Task 2's testing with distinct per-serie weight/reps already loaded (e.g. 20kg×12, 22.5kg×10, 25kg×8):

1. Start a workout from that routine (via its day assignment, the Rutinas list, or "Empezar"). Confirm the live workout screen shows exactly those 3 series with exactly those weight/reps values already pre-filled — not blank.
2. Confirm the number of series in the live workout matches the number planned in the routine (test with a routine that has 1 serie, and one with 5).
3. Finish (or discard) the session, and confirm nothing else broke — the rest timer, per-serie done checkboxes, and adding/removing a serie mid-workout (via the existing `addWorkoutSet`/`removeWorkoutSet`, untouched by this task) still work exactly as before.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Copy planned per-serie weight/reps directly when starting a workout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Per-serie automatic progression

**Files:**
- Modify: `index.html` (JS: `suggestSets`/`applySuggestedSets` ~line 1106-1127)

**Interfaces:**
- Removes: `suggestSets(exId)`.
- Produces: `suggestSetValue(exId, si, plannedReps)` — returns `{weight, reps}` or `null`. Looks up the most recent session with `exId` (`mostRecentSessionWith`, unchanged), finds that session's serie at index `si` (not necessarily the same serie count as today's plan — returns `null` if that index doesn't exist), and compares its actual reps against `plannedReps` (parsed as a number) using the same implicit-range logic as before (`plannedReps..+4`). `applySuggestedSets(entry)` — same signature, now iterates every serie in `entry.sets` and, only when `autoProgressionEnabled` is `true`, overwrites each serie's weight/reps with `suggestSetValue`'s result whenever one is available (i.e. whenever real history exists for that serie index) — leaving the serie's already-copied planned value in place otherwise. When `autoProgressionEnabled` is `false`, does nothing at all.
- Consumes: `mostRecentSessionWith(exId)`, `entryCardioDuration(e)` (both unchanged), `autoProgressionEnabled` (from Task 1 — must be loaded before any workout starts; `init()` already guarantees this since Task 1 Step 4 runs before the app becomes interactive).

- [ ] **Step 1: Replace `suggestSets`/`applySuggestedSets`**

Find (in `index.html`, ~line 1106-1127):
```js
function suggestSets(exId){
  const s=mostRecentSessionWith(exId);
  if(!s) return null;
  const e=s.exercises.find(x=>x.exId===exId);
  if(entryCardioDuration(e)) return null;
  const base=parseFloat(e.targetReps);
  if(!base) return null;
  const validSets=e.sets.filter(st=>st.weight!=='' && st.weight!=null && st.reps!=='' && st.reps!=null);
  if(!validSets.length) return null;
  const top=base+4;
  const weight=parseFloat(validSets[0].weight)||0;
  const minReps=Math.min(...validSets.map(st=>parseFloat(st.reps)||0));
  if(minReps<base) return {weight, reps:base};
  if(minReps>=top) return {weight:Math.round((weight+2.5)*100)/100, reps:base};
  return {weight, reps:Math.min(minReps+1, top)};
}
function applySuggestedSets(entry){
  if(!entry || !entry.exId) return;
  if(entry.cardioDuration) return;
  if(entry.sets.some(s=>s.weight!=='' || s.reps!=='')) return;
  const sug=suggestSets(entry.exId);
  if(!sug) return;
  entry.sets.forEach(s=>{ s.weight=sug.weight; s.reps=sug.reps; });
}
```

Replace with:
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

- [ ] **Step 2: Verify in the browser**

Using a routine with a single exercise, 3 planned series (e.g. 20kg×12, 22.5kg×10, 25kg×8), with "Progresión automática" set to **Activada** (Task 1's default):

1. With no history at all for that exercise (pick one you've never logged, or clear `log` for it in the console), start a workout from the routine. Confirm all 3 series show exactly the planned values (20/12, 22.5/10, 25/8) — the routine's plan wins when there's no history.
2. Finish that session as-is (mark all sets done, finish workout) so it becomes history.
3. Start a **new** workout from the same routine. Confirm each serie now shows a suggestion computed independently per serie index (not one shared number) — e.g. if serie 1's actual reps last time matched or exceeded its own planned target, it should suggest a weight bump or a rep increase for serie 1 specifically, while serie 2 and 3 are evaluated independently against their own planned targets.
4. Go to Ajustes, set "Progresión automática" to **Desactivada**. Start a third workout from the same routine. Confirm all 3 series now show exactly the routine's planned values again, ignoring the history from step 2/3 entirely.
5. Set it back to **Activada**. Change the routine's serie count (remove serie 3, so only 2 remain) via the editor. Start a workout. Confirm series 1 and 2 still get suggestions based on the last session's series 1/2, and nothing errors out from the mismatched serie count between the current plan and the historical session (which had 3).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Make automatic progression compare per-serie against last session

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Final end-to-end verification

**Files:**
- None modified — verification only.

**Interfaces:**
- Consumes: everything from Tasks 1-4, exercised together in one continuous session.

- [ ] **Step 1: Run through the spec's full testing checklist in one session**

Using a fresh reload of the served instance (fixture `EXERCISES` re-injected if needed):

1. Create a routine, add an exercise with 3 series with distinct weight/reps. Reload — confirm it persisted (autosave, no Guardar button).
2. Toggle "Mismo peso"/"Mismas reps" independently, confirm both the seed-from-first-serie behavior and that turning either off preserves the (now-uniform) values as individually editable again.
3. Load a starter template — confirm its exercises show the right series count with blank weight/reps, and confirm the `STARTER_TEMPLATES` block in `index.html` was never modified by any earlier task (`git diff` across the whole branch should show zero changes inside that block).
4. Take a routine saved before this feature existed (or simulate one: in the console, `routines.push({id:uid(),name:'Rutina vieja',exercises:[{id:uid(),cat:'chest',exId:'0025',sets:3,reps:'8-10',perSide:false,linkedToNext:false,cardioDuration:false}]}); saveRoutines(); location.reload();` using a real `exId` from your loaded `EXERCISES`) — reopen it in the editor and confirm it shows 3 blank, individually editable series, with no console errors.
5. Export/import and share/accept a routine with per-serie weights already set — confirm the values survive both round trips.
6. Start a session from a routine — confirm series arrive pre-filled with the plan, not blank.
7. With "Progresión automática" Activada and real session history, confirm per-serie suggestions override the plan; with no history, confirm the plan wins.
8. With "Progresión automática" Desactivada, confirm the plan always wins regardless of history.
9. Change a routine's serie count between two sessions and confirm nothing errors, with unmatched series falling back to their planned values.
10. Regression: confirm the guided workout screen, `buildWorkoutSetRow`'s bodyweight placeholder, and the rest timer are all unaffected by any of this — same appearance and behavior as before this plan.

- [ ] **Step 2: Clean up any test data**

```js
localStorage.removeItem('hierro_routines'); // ROUTINES_KEY, index.html:513
localStorage.removeItem('hierro_auto_progression'); // AUTO_PROGRESSION_KEY, index.html:527
```

Only run this if real user data wasn't already present before testing started — if in doubt, inspect `localStorage` contents before clearing anything.

- [ ] **Step 3: Update the backlog**

Mark sub-proyecto 3 as done in `docs/BACKLOG.md` (same section updated when sub-proyectos 1 and 2 shipped), then commit:

```bash
git add docs/BACKLOG.md
git commit -m "$(cat <<'EOF'
Mark series con peso planificado as done in backlog

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
