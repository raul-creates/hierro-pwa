# Rutinas opcionales + plan semanal + backup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional routines, a weekly plan (with per-day overrides), backup/restore, and per-routine import/export to HIERRO, without ever adding friction to the existing freestyle logging flow.

**Architecture:** Same single-file vanilla JS PWA (`index.html`). Three new `localStorage`-backed collections (`routines`, `week`, `dayOverrides`) alongside the existing `log`. New screens (`view-routines`, `view-routine-edit`) follow the exact pattern already used by `view-edit`. The existing exercise picker overlay is generalized to serve both the session editor and the routine editor.

**Tech Stack:** HTML/CSS/vanilla JS, no new dependencies, no build step.

## Global Constraints

- No test runner exists in this repo. "Testing" a step means: serve the folder locally (`python -m http.server 8080` from `C:\Code\hierro-pwa`, open `http://localhost:8080/`), and manually verify via the browser. Browser DevTools console execution is an acceptable substitute for manual clicking when a step has no UI yet to click (Task 1 only).
- "+ Sesión libre" (renamed from "+ Sesión") must NEVER gain a confirmation step, a sheet, or any reference to routines — it always opens the blank editor directly, exactly as `newSession()` does today, regardless of how many routines exist.
- The "Plan semanal" card is always visible on the Log screen, even with zero routines saved — it never hides itself based on data state (unlike the freestyle rule above, this one is meant to change from today's behavior, per spec).
- `routineName` on a saved session is a snapshot, never re-read from `routines` after creation — editing or deleting a routine must never change a past session's display.
- Deleting a routine clears any `week` entries pointing to it (set to `null`), but never touches past sessions' `routineId`/`routineName` snapshots.
- Per `docs/superpowers/specs/2026-08-26-routines-and-weekly-plan-design.md`, this plan resolves one implementation-level gap the spec left implicit: the Pieza 2 "+ Nueva rutina" button opens the **routine list/management screen** (`view-routines`), which itself has a "+ Rutina" action to create one — this is how existing routines get browsed, started (when not assigned to any weekday), edited, or deleted. Tapping an **empty day** in the week strip skips the list and jumps straight into creation (`newRoutine(weekday)`), since intent is already clear from which day was tapped.

---

### Task 1: Data model — routines, week plan, day overrides

**Files:**
- Modify: `index.html` (script section: constants near `EX_CACHE_KEY`, load/save functions near `loadLog`/`saveLog`, state block near `let editSession = null;`, `init()`)

**Interfaces:**
- Produces: globals `routines` (array), `week` (object), `dayOverrides` (object); functions `loadRoutines()`, `saveRoutines()`, `loadWeek()`, `saveWeek()`, `loadDayOverrides()`, `saveDayOverrides()`, `effectiveRoutineId(iso)`. Every later task consumes these — the shapes below are final, don't change them later.
  - `routines`: `[{ id, name, exercises: [{ exId, cat, sets, reps }] }]`
  - `week`: `{ "0": routineId|null, ..., "6": routineId|null }` (keys are `String(Date.getDay())`)
  - `dayOverrides`: `{ "YYYY-MM-DD": routineId | "rest" }`
  - `effectiveRoutineId(iso)`: returns `dayOverrides[iso]` if present, else `week[String(weekdayOf(iso))] || null`.

- [ ] **Step 1: Add the three storage keys**

Find:
```js
const RAW = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';
const STORAGE_KEY = 'hierro_log_v3';
const EX_CACHE_KEY = 'hierro_ex_cache_v1';
```
Replace with:
```js
const RAW = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';
const STORAGE_KEY = 'hierro_log_v3';
const EX_CACHE_KEY = 'hierro_ex_cache_v1';
const ROUTINES_KEY = 'hierro_routines';
const WEEK_KEY = 'hierro_week';
const DAY_OVERRIDES_KEY = 'hierro_day_overrides';
```

- [ ] **Step 2: Add state variables**

Find:
```js
let EXERCISES = [];
let log = [];
let editSession = null;
```
Replace with:
```js
let EXERCISES = [];
let log = [];
let editSession = null;
let routines = [];
let week = {};
let dayOverrides = {};
```

- [ ] **Step 3: Add load/save functions and `effectiveRoutineId`**

Find:
```js
function loadLog(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[];}catch{return[];}}
function saveLog(){localStorage.setItem(STORAGE_KEY,JSON.stringify(log));}
```
Replace with:
```js
function loadLog(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[];}catch{return[];}}
function saveLog(){localStorage.setItem(STORAGE_KEY,JSON.stringify(log));}
function loadRoutines(){try{return JSON.parse(localStorage.getItem(ROUTINES_KEY))||[];}catch{return[];}}
function saveRoutines(){localStorage.setItem(ROUTINES_KEY,JSON.stringify(routines));}
function loadWeek(){try{return JSON.parse(localStorage.getItem(WEEK_KEY))||{};}catch{return{};}}
function saveWeek(){localStorage.setItem(WEEK_KEY,JSON.stringify(week));}
function loadDayOverrides(){try{return JSON.parse(localStorage.getItem(DAY_OVERRIDES_KEY))||{};}catch{return{};}}
function saveDayOverrides(){localStorage.setItem(DAY_OVERRIDES_KEY,JSON.stringify(dayOverrides));}
function effectiveRoutineId(iso){
  if(Object.prototype.hasOwnProperty.call(dayOverrides, iso)) return dayOverrides[iso];
  const wd=new Date(iso+'T12:00:00').getDay();
  return week[String(wd)] || null;
}
```

- [ ] **Step 4: Load the three collections on init**

Find:
```js
async function init() {
  document.getElementById('loader-quote').textContent = randomQuote();
  log = loadLog();
```
Replace with:
```js
async function init() {
  document.getElementById('loader-quote').textContent = randomQuote();
  log = loadLog();
  routines = loadRoutines();
  week = loadWeek();
  dayOverrides = loadDayOverrides();
```

- [ ] **Step 5: Verify via browser console**

Serve (`python -m http.server 8080` from `C:\Code\hierro-pwa`) and open `http://localhost:8080/`. Open DevTools console and run:
```js
const testIso = todayISO();
const testWd = new Date().getDay();
week[String(testWd)] = 'routineA';
effectiveRoutineId(testIso); // "routineA"
dayOverrides[testIso] = 'rest';
effectiveRoutineId(testIso); // "rest"
delete dayOverrides[testIso];
effectiveRoutineId(testIso); // "routineA" again
delete week[String(testWd)];
effectiveRoutineId(testIso); // null
```
Then reload the page and confirm no console errors on load (routines/week/dayOverrides all start as `[]`/`{}`/`{}` since nothing was saved — the test above never called the `save*` functions).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Add routines, weekly plan and day-override data model"
```

---

### Task 2: Routines — create, list, edit, delete, and the "Plan semanal" week strip

**Files:**
- Modify: `index.html` (HTML body: header button rename, new `#plan-semanal` container, new `view-routines` and `view-routine-edit` views; CSS: new rules; JS: new render/CRUD functions, generalized exercise picker)

**Interfaces:**
- Consumes: `routines`, `week`, `saveRoutines`, `saveWeek`, `effectiveRoutineId` from Task 1; `EXERCISES`, `GROUPS`, `esName`, `RAW`, `uid`, `todayISO`, `showView`, `showLog`, `toast`, `renderExerciseListItem`, `matchesTokens` (existing).
- Produces: `renderPlanSemanal()` (called by `init()`/`showLog()`, and by later tasks after any routine/week/override change), `showRoutines()`, `newRoutine(weekday)` (weekday: 0-6 or `null`), `editRoutineFn(id)`, `deleteRoutine(id)`, `saveRoutine()`, `newSessionFromRoutine(routine)`, `onWeekDayTap(iso)`. Tasks 3 and 4 call into these and extend `renderPlanSemanal()`'s output.
- Modifies existing: `openPicker(exBlockId, mode)` gains an optional second parameter (`'session'` default, `'routine'` for the new editor); `renderPickerBody()` and `selectPickerExercise()` branch on it. `buildSetRow()` gains an optional 5th parameter for a dynamic reps placeholder; `buildExBlock()` passes it for the first set of each block.

- [ ] **Step 1: Rename the header button and remove CSV (text only — button stays here until Task 5 removes it)**

Find:
```html
      <div class="header-actions">
        <button class="btn-ghost" onclick="exportCSV()">CSV</button>
        <button class="btn-primary" onclick="newSession()">+ Sesión</button>
      </div>
```
Replace with:
```html
      <div class="header-actions">
        <button class="btn-ghost" onclick="exportCSV()">CSV</button>
        <button class="btn-primary" onclick="newSession()">+ Sesión libre</button>
      </div>
```
(The CSV button itself is removed in Task 5, alongside the backup feature that replaces it — leaving it here keeps this task's diff focused on routines.)

- [ ] **Step 2: Add the "Plan semanal" container and the two new views**

Find:
```html
    <div class="log-content" id="log-content"></div>
  </div>

  <!-- ── EDITOR ── -->
```
Replace with:
```html
    <div id="plan-semanal"></div>
    <div class="log-content" id="log-content"></div>
  </div>

  <!-- ── ROUTINES ── -->
  <div class="view" id="view-routines">
    <div class="header">
      <button class="btn-back" onclick="showLog()">←</button>
      <span class="header-title">Rutinas</span>
      <button class="btn-primary" style="margin-left:auto" onclick="newRoutine(null)">+ Rutina</button>
    </div>
    <div class="editor-content" id="routines-list"></div>
  </div>

  <!-- ── ROUTINE EDITOR ── -->
  <div class="view" id="view-routine-edit">
    <div class="header">
      <button class="btn-back" onclick="cancelRoutineEdit()">←</button>
      <span class="header-title" id="routine-editor-title">Nueva rutina</span>
    </div>
    <div class="editor-content">
      <div class="field-group">
        <div class="field-label">Nombre</div>
        <input type="text" id="routine-name" placeholder="Ej. Push, Pull, Piernas" oninput="validateRoutineSave()" style="width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:15px;outline:none">
      </div>
      <div id="routine-exercises-container"></div>
      <button class="btn-add-ex" onclick="addRoutineExercise()">+ Ejercicio</button>
    </div>
    <div class="editor-footer">
      <button class="btn-cancel" onclick="cancelRoutineEdit()">Cancelar</button>
      <button class="btn-save" id="btn-routine-save" onclick="saveRoutine()" disabled>Guardar rutina</button>
    </div>
  </div>

  <!-- ── EDITOR ── -->
```

- [ ] **Step 3: Add CSS for the Plan semanal card and week strip**

Find:
```css
/* ── PICKER ── */
```
Replace with:
```css
/* ── PLAN SEMANAL ── */
.plan-card{background:#13151F;border:1px solid #1E2130;border-radius:11px;padding:12px 13px;margin:12px 14px 0}
.week-strip{display:flex;gap:5px;margin:9px 0 11px}
.week-day{flex:1;text-align:center;border-radius:8px;padding:7px 2px;background:#1A1D2E;cursor:pointer;border:none;font-family:inherit}
.week-day .wd-letter{font-size:10px;font-weight:700;letter-spacing:0.3px;color:#9195A3}
.week-day .wd-name{font-size:10px;font-weight:600;margin-top:3px;color:#6B6E7A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.week-day.has-routine .wd-name{color:#FFD200}
.week-day.today{background:#FFD200}
.week-day.today .wd-letter,.week-day.today .wd-name{color:#0F1117}
.wd-ovr{color:#FF8A00}
.plan-buttons{display:flex;gap:8px}
.plan-buttons button{flex:1;background:#1A1D2E;border:1px solid #252840;border-radius:8px;color:#9195A3;padding:9px 0;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}

/* ── PICKER ── */
```

- [ ] **Step 4: Generalize the exercise picker for routine use**

Find:
```js
function openPicker(exBlockId){
  pickerExBlockId=exBlockId;
  pickerSearch='';
  document.getElementById('picker-search-input').value='';
  renderPickerBody();
  document.getElementById('picker-overlay').classList.add('active');
}
```
Replace with:
```js
let pickerMode = 'session';
function openPicker(exBlockId, mode){
  pickerMode = mode || 'session';
  pickerExBlockId=exBlockId;
  pickerSearch='';
  document.getElementById('picker-search-input').value='';
  renderPickerBody();
  document.getElementById('picker-overlay').classList.add('active');
}
```

Find:
```js
function renderPickerBody(){
  const block=editSession.exercises.find(e=>e.id===pickerExBlockId);
  if(!block)return;
```
Replace with:
```js
function renderPickerBody(){
  const block=(pickerMode==='routine'?editRoutine:editSession).exercises.find(e=>e.id===pickerExBlockId);
  if(!block)return;
```

Find:
```js
function selectPickerExercise(exId){
  updateExId(pickerExBlockId, exId);
  renderExercises();
  closePicker();
}
```
Replace with:
```js
function selectPickerExercise(exId){
  if(pickerMode==='routine'){ updateRoutineExId(pickerExBlockId, exId); renderRoutineExercises(); }
  else { updateExId(pickerExBlockId, exId); renderExercises(); }
  closePicker();
}
```

- [ ] **Step 5: Let a session exercise block show its routine's target reps as a placeholder**

Find:
```js
function buildSetRow(exId,s,si,disabled){
  return `<div class="set-row">
      <span class="set-dot">●</span>
      <div class="set-iw"><input type="number" inputmode="decimal" placeholder="0" value="${s.weight}" onchange="updateSet('${exId}',${si},'weight',this.value)"><span class="set-unit">kg</span></div>
      <div class="set-iw"><input type="number" inputmode="numeric" placeholder="0" value="${s.reps}" onchange="updateSet('${exId}',${si},'reps',this.value)"><span class="set-unit">reps</span></div>
      <button class="btn-rm-set" onclick="removeSet('${exId}',${si})" ${disabled?'disabled style="opacity:0.2"':''}>✕</button>
    </div>`;
}
```
Replace with:
```js
function buildSetRow(exId,s,si,disabled,repsPlaceholder){
  return `<div class="set-row">
      <span class="set-dot">●</span>
      <div class="set-iw"><input type="number" inputmode="decimal" placeholder="0" value="${s.weight}" onchange="updateSet('${exId}',${si},'weight',this.value)"><span class="set-unit">kg</span></div>
      <div class="set-iw"><input type="number" inputmode="numeric" placeholder="${repsPlaceholder||'0'}" value="${s.reps}" onchange="updateSet('${exId}',${si},'reps',this.value)"><span class="set-unit">reps</span></div>
      <button class="btn-rm-set" onclick="removeSet('${exId}',${si})" ${disabled?'disabled style="opacity:0.2"':''}>✕</button>
    </div>`;
}
```

Find:
```js
  const setsHTML=ex.sets.map((s,si)=>buildSetRow(ex.id,s,si,ex.sets.length===1)).join('');
```
Replace with:
```js
  const setsHTML=ex.sets.map((s,si)=>buildSetRow(ex.id,s,si,ex.sets.length===1,si===0?ex.targetReps:null)).join('');
```

- [ ] **Step 6: Add routine editor state, CRUD functions, and `newSessionFromRoutine`**

Find:
```js
let pickerExBlockId = '';
let pickerSearch = '';
```
Replace with:
```js
let pickerExBlockId = '';
let pickerSearch = '';
let editRoutine = null;
let editRoutinePreassignDay = null;
```

Then, right before the `// ── EXERCISE PICKER ──` section comment, add:
```js
// ── ROUTINES ─────────────────────────────────────────────────────────────────
const WEEKDAY_LETTERS = ['D','L','M','M','J','V','S']; // indexed by Date.getDay()
const WEEK_LAYOUT = [1,2,3,4,5,6,0]; // Monday..Sunday, values are Date.getDay()
const WEEKDAY_NAMES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

function isoOffset(daysFromToday){
  const d=new Date(); d.setDate(d.getDate()+daysFromToday); return d.toISOString().slice(0,10);
}
function emptyRoutineEx(){return{id:uid(),cat:'',exId:'',sets:3,reps:''};}

function renderPlanSemanal(){
  const el=document.getElementById('plan-semanal'); if(!el) return;
  const todayIso=todayISO();
  const todayMonFirst=(new Date().getDay()+6)%7;
  let cellsHtml='';
  WEEK_LAYOUT.forEach((wd,visualIdx)=>{
    const diff=visualIdx-todayMonFirst;
    const iso=isoOffset(diff);
    const effId=effectiveRoutineId(iso);
    const isRest=effId==='rest';
    const routine=(!isRest && effId) ? routines.find(r=>r.id===effId) : null;
    const hasOverride=Object.prototype.hasOwnProperty.call(dayOverrides, iso);
    const isToday=iso===todayIso;
    const label=isRest?'Descanso':(routine?routine.name:'—');
    const cls=['week-day'];
    if(isToday)cls.push('today');
    if(routine||isRest)cls.push('has-routine');
    cellsHtml+=`<button class="${cls.join(' ')}" onclick="onWeekDayTap('${iso}')">
      <div class="wd-letter">${WEEKDAY_LETTERS[wd]}</div>
      <div class="wd-name">${label}${hasOverride?' <span class="wd-ovr">·rep</span>':''}</div>
    </button>`;
  });
  el.innerHTML=`<div class="plan-card">
    <div class="field-label">Plan semanal</div>
    <div class="week-strip">${cellsHtml}</div>
    <div class="plan-buttons" id="plan-buttons">
      <button onclick="showRoutines()">+ Nueva rutina</button>
    </div>
  </div>`;
}

function onWeekDayTap(iso){
  const effId=effectiveRoutineId(iso);
  if(effId==='rest'){ toast('Día de descanso'); return; }
  const routine=effId?routines.find(r=>r.id===effId):null;
  if(routine){ newSessionFromRoutine(routine); return; }
  const wd=new Date(iso+'T12:00:00').getDay();
  newRoutine(wd);
}

function showRoutines(){ renderRoutinesList(); showView('view-routines'); }

function renderRoutinesList(){
  const el=document.getElementById('routines-list');
  if(!routines.length){ el.innerHTML=`<div class="empty-state"><div class="icon">📋</div><h3>Sin rutinas guardadas</h3><p>Creá una con "+ Rutina"</p></div>`; return; }
  el.innerHTML=routines.map(r=>`
    <div class="session-card">
      <div class="card-top">
        <div onclick="newSessionFromRoutine(routines.find(x=>x.id==='${r.id}'))" style="cursor:pointer;flex:1">
          <div class="card-date">${r.name}</div>
          <div class="card-meta">${r.exercises.length} ejercicio${r.exercises.length!==1?'s':''}</div>
        </div>
        <div class="card-actions"><button onclick="event.stopPropagation();editRoutineFn('${r.id}')">✏️</button><button onclick="event.stopPropagation();deleteRoutine('${r.id}')">🗑️</button></div>
      </div>
    </div>`).join('');
}

function newRoutine(weekday){
  editRoutine={id:uid(), name:'', exercises:[emptyRoutineEx()]};
  editRoutinePreassignDay=weekday;
  document.getElementById('routine-editor-title').textContent='Nueva rutina';
  document.getElementById('routine-name').value='';
  renderRoutineExercises();
  showView('view-routine-edit');
}
function editRoutineFn(id){
  const r=routines.find(x=>x.id===id); if(!r)return;
  editRoutine={id:r.id, name:r.name, exercises:r.exercises.map(e=>({id:uid(),...e}))};
  editRoutinePreassignDay=null;
  document.getElementById('routine-editor-title').textContent='Editar rutina';
  document.getElementById('routine-name').value=r.name;
  renderRoutineExercises();
  showView('view-routine-edit');
}
function cancelRoutineEdit(){ editRoutinePreassignDay!=null ? showLog() : showRoutines(); }

function renderRoutineExercises(){
  document.getElementById('routine-exercises-container').innerHTML=editRoutine.exercises.map(ex=>buildRoutineExBlock(ex)).join('');
  validateRoutineSave();
}
function buildRoutineExBlock(ex){
  const canRm=editRoutine.exercises.length>1;
  const exData=EXERCISES.find(e=>e.id===ex.exId);
  const groupOpts=GROUPS.map(g=>`<option value="${g.id}"${ex.cat===g.id?' selected':''}>${g.label}</option>`).join('');
  return`<div class="ex-block" id="rexblock-${ex.id}">
    <div class="ex-block-top">
      <div class="ex-selectors">
        <select class="step-select${!ex.cat?' ph':''}" onchange="updateRoutineExCat('${ex.id}',this.value)">
          <option value="">— Grupo muscular —</option>${groupOpts}
        </select>
        ${ex.cat?`<button type="button" class="step-select picker-trigger${!ex.exId?' ph':''}" onclick="openPicker('${ex.id}','routine')">${exData?`<span class="picker-trigger-thumb"><img src="${RAW+exData.image}" loading="lazy" onerror="this.style.display='none'"></span><span>${esName(exData)}</span>`:'— Ejercicio —'}</button>`:''}
      </div>
      <button class="btn-remove-ex" onclick="removeRoutineExercise('${ex.id}')" ${!canRm?'disabled style="color:#1E2130"':''}>✕</button>
    </div>
    <div class="sets-hdr"><span style="width:14px;flex-shrink:0"></span><span>Sets</span><span>Reps objetivo</span><span class="col-x"></span></div>
    <div class="set-row">
      <span class="set-dot">●</span>
      <div class="set-iw"><input type="number" inputmode="numeric" placeholder="3" value="${ex.sets||''}" onchange="updateRoutineField('${ex.id}','sets',this.value)"></div>
      <div class="set-iw"><input type="text" placeholder="ej. 8-10" value="${ex.reps||''}" onchange="updateRoutineField('${ex.id}','reps',this.value)"></div>
      <span class="col-x"></span>
    </div>
  </div>`;
}
function updateRoutineExCat(id,cat){const ex=editRoutine.exercises.find(e=>e.id===id);if(!ex)return;ex.cat=cat;ex.exId='';renderRoutineExercises();}
function updateRoutineExId(id,val){const ex=editRoutine.exercises.find(e=>e.id===id);if(!ex)return;ex.exId=val;validateRoutineSave();}
function updateRoutineField(id,field,val){const ex=editRoutine.exercises.find(e=>e.id===id);if(!ex)return;ex[field]=field==='sets'?(parseInt(val,10)||0):val;}
function addRoutineExercise(){editRoutine.exercises.push(emptyRoutineEx());renderRoutineExercises();setTimeout(()=>{const b=document.querySelectorAll('#routine-exercises-container .ex-block');if(b.length)b[b.length-1].scrollIntoView({behavior:'smooth'});},50);}
function removeRoutineExercise(id){if(editRoutine.exercises.length<=1)return;editRoutine.exercises=editRoutine.exercises.filter(e=>e.id!==id);renderRoutineExercises();}
function validateRoutineSave(){
  const name=document.getElementById('routine-name')?.value.trim();
  document.getElementById('btn-routine-save').disabled=!(editRoutine && name && editRoutine.exercises.every(e=>e.exId));
}
function saveRoutine(){
  const name=document.getElementById('routine-name').value.trim();
  const clean={id:editRoutine.id, name, exercises:editRoutine.exercises.map(({cat,exId,sets,reps})=>({cat,exId,sets:sets||3,reps:reps||''}))};
  const idx=routines.findIndex(r=>r.id===clean.id);
  if(idx>=0) routines[idx]=clean; else routines.push(clean);
  saveRoutines();
  if(editRoutinePreassignDay!=null){ week[String(editRoutinePreassignDay)]=clean.id; saveWeek(); }
  toast('Rutina guardada');
  renderPlanSemanal();
  editRoutinePreassignDay!=null ? showLog() : showRoutines();
}
function deleteRoutine(id){
  if(!confirm('¿Eliminar esta rutina?'))return;
  routines=routines.filter(r=>r.id!==id);
  saveRoutines();
  Object.keys(week).forEach(k=>{if(week[k]===id) week[k]=null;});
  saveWeek();
  renderRoutinesList();
  renderPlanSemanal();
  toast('Rutina eliminada');
}
function newSessionFromRoutine(routine){
  if(!routine)return;
  editSession={id:uid(), date:todayISO(), routineId:routine.id, routineName:routine.name,
    exercises:routine.exercises.map(re=>({id:uid(), cat:re.cat, exId:re.exId, targetReps:re.reps||'', sets:Array.from({length:re.sets||1},()=>emptySet())}))};
  document.getElementById('editor-title').textContent='Nueva sesión';
  document.getElementById('session-date').value=editSession.date;
  renderExercises();
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-edit').classList.add('active');
  window.scrollTo(0,0);
}
```

- [ ] **Step 7: Render the Plan semanal card on load and when returning to Log**

Find:
```js
  document.getElementById('log-quote').textContent = randomQuote();
  renderLog();
  buildGuideGroups();
```
Replace with:
```js
  document.getElementById('log-quote').textContent = randomQuote();
  renderPlanSemanal();
  renderLog();
  buildGuideGroups();
```

Find:
```js
function showLog(){showView('view-log');setActiveNav('bnav-log');renderLog();document.getElementById('log-quote').textContent=randomQuote();}
```
Replace with:
```js
function showLog(){showView('view-log');setActiveNav('bnav-log');renderPlanSemanal();renderLog();document.getElementById('log-quote').textContent=randomQuote();}
```

- [ ] **Step 8: Verify the full routines flow in the browser**

Serve and open the app.

1. Confirm the header button now reads "+ Sesión libre" and tapping it opens the blank editor exactly as before (no sheet, no prompt).
2. Confirm a "PLAN SEMANAL" card is visible above the session list, with 7 day cells all showing "—", today's cell highlighted yellow, and a single "+ Nueva rutina" button.
3. Tap "+ Nueva rutina" → opens "Rutinas" (empty state). Tap "+ Rutina" → opens the routine editor. Enter a name, pick a muscle group + exercise via the picker (confirm the picker opens and behaves identically to the session editor's), set sets=4 and reps="8-10". Add a second exercise the same way. Tap "Guardar rutina".
4. Confirm you land back on "Rutinas" with the new routine listed (name + "2 ejercicios"). Tap the routine's name/row (not the icons) → confirm it opens the session editor with both exercises pre-filled, correct number of empty sets each, and the reps input showing "8-10" as a greyed placeholder (not a real value) on the first set of each.
5. Cancel out, go back to Log, confirm the week strip still shows "—" everywhere (creating a routine alone doesn't assign it to any day).
6. Tap an empty day cell in the strip → confirm it jumps straight into a new routine editor (skipping "Rutinas"). Create and save one → confirm you land back on Log (not "Rutinas") and that day's cell now shows the routine's name, highlighted-if-today logic still correct.
7. Tap that same day cell again (now with a routine) → confirm it starts a session directly (session editor pre-filled), no intermediate screen.
8. Go to "Rutinas", edit the first routine's name, save, confirm the change reflects both in the list and in the week strip cell (if assigned).
9. Delete a routine that's assigned to a day → confirm that day's cell reverts to "—", and the other routine (if any) is unaffected.

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "Add routine creation/editing, routines list, and the weekly plan strip"
```

---

### Task 3: Reprogram a single day ("solo hoy")

**Files:**
- Modify: `index.html` (HTML body: new day-override overlay; JS: long-press detection, day-override sheet logic; modifies `renderPlanSemanal`'s cell markup from Task 2)

**Interfaces:**
- Consumes: `routines`, `dayOverrides`, `week`, `saveDayOverrides`, `saveWeek`, `effectiveRoutineId`, `renderPlanSemanal`, `toast` from Tasks 1-2.
- Produces: `startLongPress(iso)`, `cancelLongPress()`, `openDayOverlay(iso)`, `closeDayOverlay()`, `applyDayOverride(scope)`. No later task depends on these directly.

- [ ] **Step 1: Add the day-override overlay markup**

Find:
```html
<div class="picker-overlay" id="picker-overlay">
```
Replace with:
```html
<div class="picker-overlay" id="day-overlay">
  <div class="header" style="border-bottom:none">
    <button class="btn-back" onclick="closeDayOverlay()">←</button>
    <span class="header-title">Reprogramar día</span>
  </div>
  <div class="picker-body" id="day-overlay-body"></div>
</div>

<div class="picker-overlay" id="picker-overlay">
```

- [ ] **Step 2: Wire long-press onto each day cell**

Find:
```js
    cellsHtml+=`<button class="${cls.join(' ')}" onclick="onWeekDayTap('${iso}')">
      <div class="wd-letter">${WEEKDAY_LETTERS[wd]}</div>
      <div class="wd-name">${label}${hasOverride?' <span class="wd-ovr">·rep</span>':''}</div>
    </button>`;
```
Replace with:
```js
    cellsHtml+=`<button class="${cls.join(' ')}" onclick="onWeekDayTap('${iso}')" onmousedown="startLongPress('${iso}')" onmouseup="cancelLongPress()" onmouseleave="cancelLongPress()" ontouchstart="startLongPress('${iso}')" ontouchend="cancelLongPress()">
      <div class="wd-letter">${WEEKDAY_LETTERS[wd]}</div>
      <div class="wd-name">${label}${hasOverride?' <span class="wd-ovr">·rep</span>':''}</div>
    </button>`;
```

- [ ] **Step 3: Add the long-press timer and the reprogram sheet logic**

Right before the `function onWeekDayTap(iso){` line, add:
```js
let longPressTimer=null;
let dayOverlayIso='';
let dayOverlayChoice=null;
function startLongPress(iso){
  longPressTimer=setTimeout(()=>openDayOverlay(iso), 500);
}
function cancelLongPress(){
  if(longPressTimer){clearTimeout(longPressTimer);longPressTimer=null;}
}
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

- [ ] **Step 4: Verify in the browser**

Serve and open the app. Create at least two routines first (Task 2's flow) and assign one to today's weekday via the week strip.

1. Mantené presionada (mouse: click and hold ~600ms, or on a touch device tap and hold) la celda de hoy. Confirm it opens "Reprogramar día" with the exact copy "¿Enfermo, te salteaste un día o querés algo distinto? Elegí qué entrenar en su lugar." and a list with "Descanso" + your routines.
2. Tap a different routine from the list → confirm "Solo hoy" and "Cambiar todos los {día}" buttons appear, and the chosen item is highlighted yellow.
3. Tap "Solo hoy" → confirm the overlay closes, today's cell now shows the new routine's name with a "·rep" marker, and a normal tap on it starts a session from THAT routine (not the original weekly one).
4. Open DevTools console: `week[String(new Date().getDay())]` should still be the ORIGINAL routine's id (the template didn't change).
5. Long-press today again, pick "Descanso", tap "Solo hoy" → confirm the cell shows "Descanso" with the "·rep" marker, and a normal tap on it shows a "Día de descanso" toast instead of starting anything.
6. Long-press today again, pick a routine, tap "Cambiar todos los {día}" this time → confirm the "·rep" marker disappears (override cleared) and `week[String(new Date().getDay())]` in the console now equals that routine's id.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Add per-day reprogram sheet (long-press) without touching the weekly template"
```

---

### Task 4: Import / export a single routine

**Files:**
- Modify: `index.html` (JS: new import/export functions, `routinePickMode` state; modifies `renderPlanSemanal` and `renderRoutinesList` from Task 2)

**Interfaces:**
- Consumes: `routines`, `saveRoutines`, `EXERCISES`, `uid`, `toast`, `renderPlanSemanal`, `showView`, `showLog` from Tasks 1-2.
- Produces: `importRoutineFile()`, `exportRoutinePrompt()`, `exportRoutine(id)`.

- [ ] **Step 1: Reset export-pick mode whenever the routines list is opened normally**

Find:
```js
function showRoutines(){ renderRoutinesList(); showView('view-routines'); }
```
Replace with:
```js
function showRoutines(){ routinePickMode=null; renderRoutinesList(); showView('view-routines'); }
```
(`routinePickMode` doesn't exist yet — it's declared in Step 3 below. This ordering is fine: nothing calls `showRoutines()` until Step 3 also runs, since both are part of the same task.)

- [ ] **Step 2: Add the two buttons to the Plan semanal card**

Find:
```js
    <div class="plan-buttons" id="plan-buttons">
      <button onclick="showRoutines()">+ Nueva rutina</button>
    </div>
```
Replace with:
```js
    <div class="plan-buttons" id="plan-buttons">
      <button onclick="showRoutines()">+ Nueva rutina</button>
      <button onclick="importRoutineFile()">Importar rutina</button>
      <button onclick="exportRoutinePrompt()">Exportar rutina</button>
    </div>
```

- [ ] **Step 3: Make the routines list support an "export pick" mode**

Find:
```js
function renderRoutinesList(){
  const el=document.getElementById('routines-list');
  if(!routines.length){ el.innerHTML=`<div class="empty-state"><div class="icon">📋</div><h3>Sin rutinas guardadas</h3><p>Creá una con "+ Rutina"</p></div>`; return; }
  el.innerHTML=routines.map(r=>`
    <div class="session-card">
      <div class="card-top">
        <div onclick="newSessionFromRoutine(routines.find(x=>x.id==='${r.id}'))" style="cursor:pointer;flex:1">
          <div class="card-date">${r.name}</div>
          <div class="card-meta">${r.exercises.length} ejercicio${r.exercises.length!==1?'s':''}</div>
        </div>
        <div class="card-actions"><button onclick="event.stopPropagation();editRoutineFn('${r.id}')">✏️</button><button onclick="event.stopPropagation();deleteRoutine('${r.id}')">🗑️</button></div>
      </div>
    </div>`).join('');
}
```
Replace with:
```js
let routinePickMode = null;
function renderRoutinesList(){
  const el=document.getElementById('routines-list');
  if(!routines.length){ el.innerHTML=`<div class="empty-state"><div class="icon">📋</div><h3>Sin rutinas guardadas</h3><p>Creá una con "+ Rutina"</p></div>`; return; }
  const hint=routinePickMode==='export'?`<div class="field-label" style="margin-bottom:8px">Elegí cuál exportar</div>`:'';
  el.innerHTML=hint+routines.map(r=>{
    const tapFn=routinePickMode==='export'?`exportRoutine('${r.id}')`:`newSessionFromRoutine(routines.find(x=>x.id==='${r.id}'))`;
    const actions=routinePickMode?'':`<div class="card-actions"><button onclick="event.stopPropagation();editRoutineFn('${r.id}')">✏️</button><button onclick="event.stopPropagation();deleteRoutine('${r.id}')">🗑️</button></div>`;
    return `<div class="session-card">
      <div class="card-top">
        <div onclick="${tapFn}" style="cursor:pointer;flex:1">
          <div class="card-date">${r.name}</div>
          <div class="card-meta">${r.exercises.length} ejercicio${r.exercises.length!==1?'s':''}</div>
        </div>
        ${actions}
      </div>
    </div>`;
  }).join('');
}
```

- [ ] **Step 4: Add export/import functions**

Right after `deleteRoutine`'s closing brace, add:
```js
function exportRoutinePrompt(){
  if(!routines.length){ toast('No hay rutinas guardadas'); return; }
  if(routines.length===1){ exportRoutine(routines[0].id); return; }
  routinePickMode='export';
  renderRoutinesList();
  showView('view-routines');
}
function exportRoutine(id){
  const r=routines.find(x=>x.id===id); if(!r)return;
  const data={hierro_routine:1, name:r.name, exercises:r.exercises};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`rutina-${r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'sin-nombre'}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  routinePickMode=null;
  showLog();
}
function importRoutineFile(){
  const input=document.createElement('input');
  input.type='file'; input.accept='application/json,.json';
  input.onchange=e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      let data;
      try{ data=JSON.parse(reader.result); }catch{ toast('Archivo inválido'); return; }
      if(!data || data.hierro_routine!==1 || !Array.isArray(data.exercises)){ toast('No es un archivo de rutina válido'); return; }
      const cleanExercises=data.exercises.filter(ex=>EXERCISES.some(x=>x.id===ex.exId)).map(({exId,cat,sets,reps})=>({exId,cat,sets:sets||3,reps:reps||''}));
      if(!cleanExercises.length){ toast('Ningún ejercicio del archivo es válido'); return; }
      const imported={id:uid(), name:data.name||'Rutina importada', exercises:cleanExercises};
      routines.push(imported);
      saveRoutines();
      renderPlanSemanal();
      toast('Rutina importada: '+imported.name);
    };
    reader.readAsText(file);
  };
  input.click();
}
```

- [ ] **Step 5: Verify in the browser**

Serve and open the app, with at least two routines already created.

1. Tap "Exportar rutina" → confirm it opens "Rutinas" in pick mode (label "Elegí cuál exportar", no edit/delete icons, no "+ Rutina" needed). Tap one → confirm a `.json` file downloads and you land back on Log.
2. Open the downloaded file, confirm it has `hierro_routine: 1`, the routine's `name`, and its `exercises` array.
3. With only ONE routine saved (delete the others via "Rutinas" first, or test fresh), tap "Exportar rutina" → confirm it downloads immediately without showing the picker screen.
4. Tap "Importar rutina", select the file from step 1 → confirm a toast "Rutina importada: {nombre}" and that "Rutinas" now lists it as a NEW, separate entry (two routines with identical content, different ids) — not a duplicate rejection, not an overwrite.
5. Edit the downloaded JSON file by hand: change one `exId` to a nonsense string like `"doesnotexist"`. Re-import it. Confirm that exercise is silently dropped from the imported routine (fewer exercises than the original) rather than crashing or leaving a broken reference.
6. Edit the file again, set ALL `exId`s to nonsense. Re-import. Confirm the toast says "Ningún ejercicio del archivo es válido" and nothing is added to the list.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Add per-routine import/export as shareable JSON files"
```

---

### Task 5: Full backup/restore, removing CSV export

**Files:**
- Modify: `index.html` (HTML body: remove CSV button, add backup footer; CSS: footer styling; JS: remove `exportCSV`/`buildCSV`/`csvEscape`, add backup functions)

**Interfaces:**
- Consumes: `log`, `routines`, `week`, `saveLog`, `saveRoutines`, `saveWeek`, `renderLog`, `renderPlanSemanal`, `todayISO`, `toast` from Tasks 1-2 and the existing codebase.
- Produces: `exportBackup()`, `importBackupFile()`.

- [ ] **Step 1: Remove the CSV button from the header**

Find:
```html
      <div class="header-actions">
        <button class="btn-ghost" onclick="exportCSV()">CSV</button>
        <button class="btn-primary" onclick="newSession()">+ Sesión libre</button>
      </div>
```
Replace with:
```html
      <div class="header-actions">
        <button class="btn-primary" onclick="newSession()">+ Sesión libre</button>
      </div>
```

- [ ] **Step 2: Add the backup footer to the Log view**

Find:
```html
    <div id="plan-semanal"></div>
    <div class="log-content" id="log-content"></div>
  </div>
```
Replace with:
```html
    <div id="plan-semanal"></div>
    <div class="log-content" id="log-content"></div>
    <div class="backup-footer">
      <button class="btn-ghost" onclick="exportBackup()">Exportar backup</button>
      <button class="btn-ghost" onclick="importBackupFile()">Importar backup</button>
    </div>
  </div>
```

- [ ] **Step 3: Add footer CSS**

Find:
```css
/* ── PLAN SEMANAL ── */
```
Replace with:
```css
/* ── BACKUP FOOTER ── */
.backup-footer{display:flex;gap:8px;padding:20px 14px 24px;justify-content:center}
.backup-footer button{flex:1;max-width:200px}

/* ── PLAN SEMANAL ── */
```

- [ ] **Step 4: Remove the CSV export functions**

Find:
```js
// ── CSV EXPORT ───────────────────────────────────────────────────────────────
function csvEscape(val){
  const s=String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}
function buildCSV(){
  const rows=[['fecha','ejercicio_es','ejercicio_en','grupo','serie','peso_kg','reps']];
  const sorted=[...log].sort((a,b)=>a.date.localeCompare(b.date));
  sorted.forEach(s=>{
    s.exercises.filter(e=>e.exId).forEach(e=>{
      const ex=EXERCISES.find(x=>x.id===e.exId);if(!ex)return;
      const grpLabel=GROUPS.find(g=>g.id===GROUP_MERGE[ex.category])?.label||ex.category;
      e.sets.forEach((set,i)=>{
        rows.push([s.date, esName(ex), ex.name, grpLabel, i+1, set.weight, set.reps]);
      });
    });
  });
  return rows.map(r=>r.map(csvEscape).join(',')).join('\r\n');
}
function exportCSV(){
  if(!log.length){toast('No hay sesiones para exportar');return;}
  const csv=String.fromCharCode(0xFEFF)+buildCSV();
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`hierro-log-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```
Replace with:
```js
// ── BACKUP / RESTORE ─────────────────────────────────────────────────────────
function exportBackup(){
  const data={version:1, exported:new Date().toISOString(), log, hierro_routines:routines, hierro_week:week};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`hierro-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function importBackupFile(){
  const input=document.createElement('input');
  input.type='file'; input.accept='application/json,.json';
  input.onchange=e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      let data;
      try{ data=JSON.parse(reader.result); }catch{ toast('Archivo inválido'); return; }
      if(!data || !data.version || !Array.isArray(data.log) || !Array.isArray(data.hierro_routines) || typeof data.hierro_week!=='object'){
        toast('No es un archivo de backup válido'); return;
      }
      if(!confirm('Esto va a reemplazar todos tus datos actuales por los del backup. ¿Confirmás?')) return;
      log=data.log; routines=data.hierro_routines; week=data.hierro_week;
      saveLog(); saveRoutines(); saveWeek();
      renderLog(); renderPlanSemanal();
      toast('Backup restaurado');
    };
    reader.readAsText(file);
  };
  input.click();
}
```

- [ ] **Step 5: Verify in the browser**

Serve and open the app.

1. Confirm the header no longer shows a "CSV" button — only "+ Sesión libre".
2. Confirm two buttons appear below the session list: "Exportar backup" and "Importar backup".
3. With at least one session, one routine, and one weekday assignment in place, tap "Exportar backup" → confirm a `.json` downloads with `version`, `exported`, `log`, `hierro_routines`, `hierro_week` all present and populated.
4. Delete that session from the Log (🗑️ icon). Tap "Importar backup", select the file from step 3 → confirm the browser's native confirm dialog appears with the exact text "Esto va a reemplazar todos tus datos actuales por los del backup. ¿Confirmás?". Accept it.
5. Confirm the deleted session reappears, the routine list and week strip are exactly as they were at export time, and a "Backup restaurado" toast shows.
6. Repeat step 4 but cancel the confirm dialog instead of accepting → confirm nothing changes (the session stays deleted).
7. Try importing an unrelated JSON file (e.g. `{"foo":"bar"}`) → confirm the toast "No es un archivo de backup válido" and no confirm dialog appears.
8. Open DevTools console and run `typeof exportCSV` → confirm it logs `"undefined"` (the function no longer exists).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Replace CSV export with full JSON backup/restore, remove exportCSV"
```
