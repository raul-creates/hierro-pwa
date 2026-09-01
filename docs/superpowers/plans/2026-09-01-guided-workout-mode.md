# Guided Workout Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace HIERRO's flat session-editor form with a one-exercise-at-a-time guided workout screen (openGym-inspired UX, own code), give routines their own bottom-nav tab, and add a rest timer and a minimal Settings screen.

**Architecture:** Same single-file vanilla JS PWA (`index.html`). A new in-memory `activeWorkout` state object (mirrors the shape of a saved session, plus `done`/`start`/`cur` fields) replaces `editSession` for all logging. A new `view-workout` screen renders one `activeWorkout.entries[cur]` at a time. The existing exercise picker overlay gains a third consumer (workout entries) after the old session-editor consumer is retired.

**Tech Stack:** HTML/CSS/vanilla JS, no new dependencies, no build step.

**Spec:** `docs/superpowers/specs/2026-09-01-guided-workout-mode-design.md`

## Global Constraints

- The guided screen is the ONLY way to log or edit a session by the end of this plan — the flat editor (`view-edit` and its functions) is fully retired in Task 5, not just hidden.
- A saved session's shape in `log` does not change: `{id, date, routineId, routineName, exercises: [{id, cat, exId, targetReps, sets: [{weight, reps}]}]}`. `done` is an `activeWorkout`-only field, stripped on save.
- Editing a past session must show NO elapsed clock, NO rest timer, NO sound/vibration — these are gated on `activeWorkout.start` being truthy (a live session), which is `null` when editing history.
- Rest timer duration is a single global value (`localStorage` key `hierro_rest_sec`, default 90), no push notifications (no backend exists).
- Bottom nav becomes 5 items: Log · Rutinas · [Empezar — circular center button] · Stats · Guía. "Rutinas" absorbs the existing `#plan-semanal` card content (week strip + buttons) that currently lives on the Log screen.
- No test runner exists in this repo. "Testing" a step means: serve the folder locally (`python -m http.server 8080` from `C:\Code\hierro-pwa`, open `http://localhost:8080/`), and manually verify via the browser.

---

### Task 1: Bottom nav restructure — 5 tabs, Rutinas promoted to its own tab

**Files:**
- Modify: `index.html` (CSS: nav styles; HTML: bottom nav markup, Log header, `view-routines`; JS: `showLog`, `showRoutines`, `init`)

**Interfaces:**
- Produces: `#bnav-start` (the center nav button, temporarily wired to the existing `newSession()` — Task 3 rewires it to the real `startWorkout()`), `updateStartButton()` (no-op stub in this task, real logic added in Task 3), a `showRoutines()` that also acts as the "Rutinas" tab handler.
- Consumes: existing `renderPlanSemanal()`, `renderRoutinesList()`, `showView()`, `setActiveNav()` (all unchanged).

- [ ] **Step 1: Move the Plan-semanal card into `view-routines`, simplify the Log header**

Find:
```html
  <!-- ── LOG ── -->
  <div class="view active" id="view-log">
    <div class="header">
      <div class="logo-block"><div class="wordmark">HIERRO</div><div class="sub" id="log-quote"></div></div>
      <div class="header-actions">
        <button class="btn-primary" onclick="newSession()">+ Sesión libre</button>
      </div>
    </div>
    <div id="plan-semanal"></div>
    <div class="log-content" id="log-content"></div>
    <div class="backup-footer">
      <button class="btn-ghost" onclick="exportBackup()">Exportar backup</button>
      <button class="btn-ghost" onclick="importBackupFile()">Importar backup</button>
    </div>
  </div>

  <!-- ── ROUTINES ── -->
  <div class="view" id="view-routines">
    <div class="header">
      <button class="btn-back" onclick="showLog()">←</button>
      <span class="header-title">Rutinas</span>
      <div class="header-actions">
        <button class="btn-ghost" onclick="showTemplatePicker()">Plantillas</button>
        <button class="btn-primary" onclick="newRoutine(null)">+ Rutina</button>
      </div>
    </div>
    <div class="editor-content" id="routines-list"></div>
  </div>
```
Replace with:
```html
  <!-- ── LOG ── -->
  <div class="view active" id="view-log">
    <div class="header">
      <div class="logo-block"><div class="wordmark">HIERRO</div><div class="sub" id="log-quote"></div></div>
    </div>
    <div class="log-content" id="log-content"></div>
    <div class="backup-footer">
      <button class="btn-ghost" onclick="exportBackup()">Exportar backup</button>
      <button class="btn-ghost" onclick="importBackupFile()">Importar backup</button>
    </div>
  </div>

  <!-- ── ROUTINES ── -->
  <div class="view" id="view-routines">
    <div class="header" style="border-bottom:none">
      <div class="logo-block"><div class="wordmark" style="font-size:17px">Rutinas</div></div>
      <div class="header-actions">
        <button class="btn-ghost" onclick="showTemplatePicker()">Plantillas</button>
        <button class="btn-primary" onclick="newRoutine(null)">+ Rutina</button>
      </div>
    </div>
    <div id="plan-semanal"></div>
    <div class="editor-content" id="routines-list"></div>
  </div>
```

- [ ] **Step 2: Replace the 3-item bottom nav with the 5-item version**

Find:
```html
  <!-- ── BOTTOM NAV ── -->
  <nav class="bottom-nav">
    <button class="bnav-btn active" id="bnav-log" onclick="showLog()">
      <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
      Log
    </button>
    <button class="bnav-btn" id="bnav-guide" onclick="showGuide()">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      Guía
    </button>
    <button class="bnav-btn" id="bnav-stats" onclick="showStats()">
      <svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
      Stats
    </button>
  </nav>
```
Replace with:
```html
  <!-- ── BOTTOM NAV ── -->
  <nav class="bottom-nav">
    <button class="bnav-btn active" id="bnav-log" onclick="showLog()">
      <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
      Log
    </button>
    <button class="bnav-btn" id="bnav-routines" onclick="showRoutines()">
      <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
      Rutinas
    </button>
    <button class="bnav-start" id="bnav-start" onclick="newSession()">
      <span class="bnav-start-circle"><svg viewBox="0 0 24 24"><path d="M6 8v8M4 10v4M20 10v4M18 8v8M8 12h8"/></svg></span>
      <span>Empezar</span>
    </button>
    <button class="bnav-btn" id="bnav-stats" onclick="showStats()">
      <svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
      Stats
    </button>
    <button class="bnav-btn" id="bnav-guide" onclick="showGuide()">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      Guía
    </button>
  </nav>
```

- [ ] **Step 3: Add CSS for the center nav button**

Find:
```css
.bnav-btn.active{color:#FFD200}
```
Replace with:
```css
.bnav-btn.active{color:#FFD200}
.bnav-start{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;background:none;border:none;cursor:pointer;color:#9195A3;font-size:10px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;padding-bottom:6px}
.bnav-start-circle{width:44px;height:44px;border-radius:50%;background:#FFD200;display:flex;align-items:center;justify-content:center;margin-top:-22px;margin-bottom:2px;box-shadow:0 2px 8px rgba(0,0,0,0.4)}
.bnav-start-circle svg{width:22px;height:22px;stroke:#0F1117;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.bnav-start.resume .bnav-start-circle{background:#FF8A00}
```

- [ ] **Step 4: `showLog()` stops rendering the Plan-semanal card; `showRoutines()` starts rendering it and sets nav state**

Find:
```js
function showLog(){showView('view-log');setActiveNav('bnav-log');renderPlanSemanal();renderLog();document.getElementById('log-quote').textContent=randomQuote();}
```
Replace with:
```js
function showLog(){showView('view-log');setActiveNav('bnav-log');renderLog();document.getElementById('log-quote').textContent=randomQuote();}
```

Find:
```js
function showRoutines(){ routinePickMode=null; renderRoutinesList(); showView('view-routines'); }
```
Replace with:
```js
function showRoutines(){ routinePickMode=null; setActiveNav('bnav-routines'); renderPlanSemanal(); renderRoutinesList(); showView('view-routines'); }
```

- [ ] **Step 5: Stop rendering the Plan-semanal card at init (it now renders lazily when the Rutinas tab opens)**

Find:
```js
  document.getElementById('log-quote').textContent = randomQuote();
  renderPlanSemanal();
  renderLog();
```
Replace with:
```js
  document.getElementById('log-quote').textContent = randomQuote();
  renderLog();
```

- [ ] **Step 6: Verify in the browser**

Serve and open the app.

1. Confirm the bottom nav shows 5 items: Log, Rutinas, a bigger circular "Empezar" button in the middle, Stats, Guía.
2. Confirm the Log screen no longer has a "+ Sesión libre" button or a "Plan semanal" card — just the session history and the backup footer.
3. Tap "Rutinas" in the nav: confirm it shows the "PLAN SEMANAL" week strip at the top (with its "+ Nueva rutina"/"Importar rutina"/"Exportar rutina" buttons still working) followed by the routines list below it, all in one scrollable tab — and that the Rutinas nav icon highlights active.
4. Tap "Empezar" — confirm it still opens the (old, unchanged for now) blank session editor, since this task hasn't rewired it yet.
5. Confirm Stats and Guía tabs still work exactly as before.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "Restructure bottom nav to 5 tabs, promote Rutinas out of the Log screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Settings screen (rest-timer duration)

**Files:**
- Modify: `index.html` (HTML: Log header gear button, new `view-settings`; JS: `loadRestSec`/`saveRestSec`, `showSettings`, `updateRestSec`, `init`)

**Interfaces:**
- Produces: global `restSec` (number, default 90), used by Task 4's rest timer. `showSettings()` — called from the new gear button.
- Consumes: `showView`, `showLog`, existing `.editor-content`/`.field-group`/`.field-label`/`input[type=number]` CSS.

- [ ] **Step 1: Add a settings button to the Log header**

Find:
```html
    <div class="header">
      <div class="logo-block"><div class="wordmark">HIERRO</div><div class="sub" id="log-quote"></div></div>
    </div>
    <div class="log-content" id="log-content"></div>
```
Replace with:
```html
    <div class="header">
      <div class="logo-block"><div class="wordmark">HIERRO</div><div class="sub" id="log-quote"></div></div>
      <div class="header-actions">
        <button class="btn-ghost" onclick="showSettings()" aria-label="Ajustes">⚙️</button>
      </div>
    </div>
    <div class="log-content" id="log-content"></div>
```

- [ ] **Step 2: Add the `view-settings` screen**

Find:
```html
  <!-- ── ROUTINE EDITOR ── -->
```
Replace with:
```html
  <!-- ── SETTINGS ── -->
  <div class="view" id="view-settings">
    <div class="header">
      <button class="btn-back" onclick="showLog()">←</button>
      <span class="header-title">Ajustes</span>
    </div>
    <div class="editor-content">
      <div class="field-group">
        <div class="field-label">Descanso entre series (segundos)</div>
        <input type="number" id="settings-rest-sec" inputmode="numeric" min="0" step="5" oninput="updateRestSec(this.value)">
      </div>
    </div>
  </div>

  <!-- ── ROUTINE EDITOR ── -->
```

- [ ] **Step 3: Add the rest-seconds storage and the settings functions**

Find:
```js
const DAY_OVERRIDES_KEY = 'hierro_day_overrides';
```
Replace with:
```js
const DAY_OVERRIDES_KEY = 'hierro_day_overrides';
const REST_SEC_KEY = 'hierro_rest_sec';
```

Find:
```js
let editRoutinePreassignDay = null;
```
Replace with:
```js
let editRoutinePreassignDay = null;
let restSec = 90;
```

Find:
```js
function loadDayOverrides(){try{return JSON.parse(localStorage.getItem(DAY_OVERRIDES_KEY))||{};}catch{return{};}}
function saveDayOverrides(){localStorage.setItem(DAY_OVERRIDES_KEY,JSON.stringify(dayOverrides));}
```
Replace with:
```js
function loadDayOverrides(){try{return JSON.parse(localStorage.getItem(DAY_OVERRIDES_KEY))||{};}catch{return{};}}
function saveDayOverrides(){localStorage.setItem(DAY_OVERRIDES_KEY,JSON.stringify(dayOverrides));}
function loadRestSec(){const v=parseInt(localStorage.getItem(REST_SEC_KEY),10);return Number.isFinite(v)&&v>=0?v:90;}
function saveRestSec(){localStorage.setItem(REST_SEC_KEY,String(restSec));}
function showSettings(){document.getElementById('settings-rest-sec').value=restSec;showView('view-settings');}
function updateRestSec(val){const n=parseInt(val,10);restSec=Number.isFinite(n)&&n>=0?n:0;saveRestSec();}
```

- [ ] **Step 4: Load `restSec` at init**

Find:
```js
  dayOverrides = loadDayOverrides();
```
Replace with:
```js
  dayOverrides = loadDayOverrides();
  restSec = loadRestSec();
```

- [ ] **Step 5: Verify in the browser**

Serve and open the app.

1. Confirm a "⚙️" button appears in the Log header (where "+ Sesión libre" used to be).
2. Tap it, confirm "Ajustes" opens with "Descanso entre series (segundos)" showing `90`.
3. Change it to `60`, tap back, reopen Ajustes — confirm it still shows `60` (persisted).
4. Reload the page fully, reopen Ajustes — confirm it still shows `60`.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Add minimal Settings screen with rest-timer duration

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Guided workout screen — data model, start routing, core logging loop

**Files:**
- Modify: `index.html` (HTML: `view-workout`, generic list-overlay; CSS: workout screen styles; JS: `activeWorkout` state, `buildActiveWorkout`, `startWorkout`/`openStartChooser`/`pickStart`, `enterWorkoutScreen`, render + set-editing functions, `finishWorkout`/`discardWorkout`, `updateStartButton`)

**Interfaces:**
- Consumes: `effectiveRoutineId`, `routines`, `EXERCISES`, `esName`, `RAW`, `uid`, `todayISO`, `log`, `saveLog`, `toast`, `showView`, `GROUPS` (existing).
- Produces: global `activeWorkout` (shape: `{id, date, routineId, routineName, start, editingSessionId, cur, entries: [{id, cat, exId, targetReps, sets: [{weight, reps, done}]}]}` — `start` is `Date.now()` for a live session, `null` when editing history), `buildActiveWorkout(routine, editingSession)`, `enterWorkoutScreen()`, `finishWorkout()`, `discardWorkout()`, `openListOverlay(title, items)`/`closeListOverlay()` (generic — Task 4 reuses this for the "add exercise" group picker). Task 4 extends `toggleWorkoutSet` (rest timer) and the `#wk-actions-container` div. Task 5 rewires `editSessionFn`/`addToToday` to call into `buildActiveWorkout`/`enterWorkoutScreen`, and deletes the old flat editor this task's nav button (`onclick="newSession()"`) still points at for now.

- [ ] **Step 1: Add the generic list-overlay and the `view-workout` screen**

Find:
```html
<div class="picker-overlay" id="template-overlay">
```
Replace with:
```html
<div class="picker-overlay" id="list-overlay">
  <div class="header" style="border-bottom:none">
    <button class="btn-back" onclick="closeListOverlay()">←</button>
    <span class="header-title" id="list-overlay-title"></span>
  </div>
  <div class="picker-body" id="list-overlay-body"></div>
</div>

<div class="picker-overlay" id="template-overlay">
```

Find:
```html
  <!-- ── GUIDE ── -->
```
Replace with:
```html
  <!-- ── WORKOUT (GUIDED) ── -->
  <div class="view" id="view-workout">
    <div class="wk-header">
      <button class="wk-icon-btn" onclick="discardWorkout()" aria-label="Descartar">✕</button>
      <div class="wk-header-mid">
        <div class="wk-name" id="wk-name"></div>
        <div class="wk-sub"><span id="wk-elapsed"></span><span id="wk-sub-text"></span></div>
      </div>
      <button class="wk-icon-btn wk-finish" onclick="finishWorkout()" aria-label="Terminar">✓</button>
    </div>
    <div class="wk-progress"><i id="wk-progress-fill"></i></div>
    <div class="wk-body" id="wk-body"></div>
    <div class="wk-nav-row">
      <button class="btn-cancel" id="wk-prev" onclick="workoutPrev()">← Anterior</button>
      <button class="btn-cancel" id="wk-next" onclick="workoutNext()">Siguiente →</button>
    </div>
    <div class="editor-content" id="wk-actions-container">
      <button class="btn-save" id="wk-finish-btn" onclick="finishWorkout()" style="width:100%;margin:12px 0 20px"></button>
    </div>
  </div>

  <!-- ── GUIDE ── -->
```

- [ ] **Step 2: Add CSS for the workout screen**

Find:
```css
/* ── PICKER ── */
```
Replace with:
```css
/* ── WORKOUT (GUIDED) ── */
.wk-header{padding:12px 14px;border-bottom:1px solid #1E2130;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#0F1117;z-index:10}
.wk-icon-btn{background:#1A1D2E;border:none;border-radius:50%;width:34px;height:34px;color:#9195A3;font-size:16px;cursor:pointer;flex-shrink:0}
.wk-icon-btn.wk-finish{background:#FFD200;color:#0F1117}
.wk-header-mid{text-align:center;flex:1;min-width:0;padding:0 8px}
.wk-name{color:#fff;font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wk-sub{color:#9195A3;font-size:11px;margin-top:1px;font-variant-numeric:tabular-nums}
.wk-progress{height:3px;background:#1A1D2E}
.wk-progress i{display:block;height:100%;width:0;background:#FFD200;transition:width 0.3s ease}
.wk-body{padding:14px 14px 0}
.wk-ex-img{width:100%;max-width:220px;display:block;margin:0 auto 10px;border-radius:8px;background:#1A1D2E}
.wk-ex-name{color:#FFD200;font-weight:800;font-size:19px;text-align:center;margin-bottom:4px}
.wk-ex-last{color:#9195A3;font-size:12px;text-align:center;margin-bottom:12px}
.wk-nav-row{display:flex;gap:9px;padding:12px 14px 0}
.wk-nav-row button:disabled{opacity:0.3;cursor:default}
.set-done{width:24px;height:24px;flex-shrink:0;accent-color:#FFD200}

/* ── PICKER ── */
```

- [ ] **Step 3: Add `activeWorkout` state and `buildActiveWorkout`**

Find:
```js
let editRoutinePreassignDay = null;
let restSec = 90;
```
Replace with:
```js
let editRoutinePreassignDay = null;
let restSec = 90;
let activeWorkout = null;
let workoutTimerInterval = null;
```

Right before the `// ── ROUTINES ──` section comment, add:
```js
// ── WORKOUT (GUIDED) ─────────────────────────────────────────────────────────
function buildActiveWorkout(routine, editingSession){
  if(editingSession){
    return {
      id: editingSession.id, date: editingSession.date,
      routineId: editingSession.routineId||null, routineName: editingSession.routineName||null,
      start: null, editingSessionId: editingSession.id, cur: 0,
      entries: editingSession.exercises.map(e=>({
        id: uid(), cat: e.cat, exId: e.exId, targetReps: e.targetReps||'',
        sets: e.sets.map(s=>({weight: s.weight, reps: s.reps, done: !!(s.weight || s.reps)}))
      }))
    };
  }
  const entries = routine ? routine.exercises.map(re=>({
    id: uid(), cat: re.cat, exId: re.exId, targetReps: re.reps||'',
    sets: Array.from({length: re.sets||1}, ()=>({weight:'', reps:'', done:false}))
  })) : [];
  return {
    id: uid(), date: todayISO(), routineId: routine?routine.id:null, routineName: routine?routine.name:null,
    start: Date.now(), editingSessionId: null, cur: 0, entries
  };
}
function openListOverlay(title, items){
  document.getElementById('list-overlay-title').textContent=title;
  document.getElementById('list-overlay-body').innerHTML = items.map((it,i)=>
    `<div style="padding:11px 14px;cursor:pointer;${i>0?'border-top:1px solid #1E2130;':''}${it.accent?'color:#FFD200;font-weight:700;':''}" onclick="${it.onclick}">${it.label}</div>`
  ).join('');
  document.getElementById('list-overlay').classList.add('active');
}
function closeListOverlay(){ document.getElementById('list-overlay').classList.remove('active'); }
function startWorkout(){
  if(activeWorkout){ enterWorkoutScreen(); return; }
  const effId = effectiveRoutineId(todayISO());
  if(effId && effId!=='rest'){
    const r = routines.find(x=>x.id===effId);
    if(r){ activeWorkout = buildActiveWorkout(r, null); enterWorkoutScreen(); return; }
  }
  openStartChooser();
}
function openStartChooser(){
  const items=[{label:'Freestyle (sin rutina)', accent:true, onclick:'pickStart(null)'}]
    .concat(routines.map(r=>({label:r.name, onclick:`pickStart('${r.id}')`})));
  openListOverlay('Empezar', items);
}
function pickStart(routineId){
  closeListOverlay();
  const r = routineId ? routines.find(x=>x.id===routineId) : null;
  activeWorkout = buildActiveWorkout(r, null);
  enterWorkoutScreen();
}
function enterWorkoutScreen(){
  showView('view-workout');
  renderWorkoutScreen();
  startWorkoutClock();
}
function fmtElapsed(ms){ const s=Math.floor(ms/1000); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function tickWorkoutClock(){
  const el=document.getElementById('wk-elapsed');
  if(!el)return;
  if(!activeWorkout || !activeWorkout.start){ el.textContent=''; return; }
  el.textContent = fmtElapsed(Date.now()-activeWorkout.start) + ' · ';
}
function startWorkoutClock(){ stopWorkoutClock(); tickWorkoutClock(); workoutTimerInterval=setInterval(tickWorkoutClock,1000); }
function stopWorkoutClock(){ if(workoutTimerInterval){clearInterval(workoutTimerInterval);workoutTimerInterval=null;} }
function lastTimeSummary(exId){
  const sorted=[...log].sort((a,b)=>b.date.localeCompare(a.date));
  const s=sorted.find(x=>x.exercises.some(e=>e.exId===exId));
  if(!s)return'';
  const e=s.exercises.find(x=>x.exId===exId);
  const ss=e.sets.map(st=>`${st.weight||'—'}kg×${st.reps||'—'}`).join(' ');
  return `Última vez (${s.date}): ${ss}`;
}
function buildWorkoutSetRow(entry, si){
  const s=entry.sets[si];
  const disabled = entry.sets.length<=1;
  return `<div class="set-row">
      <span class="set-dot">●</span>
      <div class="set-iw"><input type="number" inputmode="decimal" placeholder="0" value="${s.weight}" onchange="updateWorkoutSet(${si},'weight',this.value)"><span class="set-unit">kg</span></div>
      <div class="set-iw"><input type="number" inputmode="numeric" placeholder="${entry.targetReps||'0'}" value="${s.reps}" onchange="updateWorkoutSet(${si},'reps',this.value)"><span class="set-unit">reps</span></div>
      <button class="btn-rm-set" onclick="removeWorkoutSet(${si})" ${disabled?'disabled style="opacity:0.2"':''}>✕</button>
      <input type="checkbox" class="set-done" ${s.done?'checked':''} onchange="toggleWorkoutSet(${si})">
    </div>`;
}
function renderWorkoutScreen(){
  const A=activeWorkout; if(!A)return;
  const total=A.entries.reduce((a,e)=>a+e.sets.length,0);
  const done=A.entries.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0);
  document.getElementById('wk-progress-fill').style.width=(total?done/total*100:0)+'%';
  document.getElementById('wk-name').textContent = A.editingSessionId && !A.start ? 'Editar sesión' : (A.routineName || 'Freestyle');
  document.getElementById('wk-sub-text').textContent = A.entries.length
    ? `Ejercicio ${A.cur+1}/${A.entries.length} · ${done}/${total} series`
    : 'Agregá un ejercicio para arrancar';
  const body=document.getElementById('wk-body');
  if(!A.entries.length){
    body.innerHTML=`<div class="empty-state"><div class="icon">🏋️</div><h3>Sin ejercicios</h3><p>Agregá el primero con el botón de abajo</p></div>`;
  } else {
    const entry=A.entries[A.cur];
    const ex=EXERCISES.find(e=>e.id===entry.exId);
    body.innerHTML=`
      ${ex?`<img class="wk-ex-img" src="${RAW+ex.image}" loading="lazy" onerror="this.style.display='none'">`:''}
      <div class="wk-ex-name">${ex?esName(ex):'—'}</div>
      <div class="wk-ex-last">${lastTimeSummary(entry.exId)}</div>
      <div class="sets-hdr"><span style="width:14px;flex-shrink:0"></span><span>Peso</span><span>Reps</span><span class="col-x"></span><span style="width:24px;flex-shrink:0"></span></div>
      <div id="wk-sets">${entry.sets.map((s,si)=>buildWorkoutSetRow(entry,si)).join('')}</div>
      <button class="btn-add-set" onclick="addWorkoutSet()">+ Serie</button>`;
  }
  document.getElementById('wk-prev').disabled = A.cur<=0;
  document.getElementById('wk-next').disabled = A.cur>=A.entries.length-1;
  const exDone=A.entries.filter(e=>e.sets.length&&e.sets.every(s=>s.done)).length;
  const allDone=A.entries.length>0 && exDone===A.entries.length;
  const fb=document.getElementById('wk-finish-btn');
  fb.textContent = allDone ? 'Terminar entrenamiento' : `Terminar antes de tiempo · ${exDone}/${A.entries.length} ejercicios`;
  fb.className = allDone ? 'btn-save' : 'btn-cancel';
  fb.style.width='100%'; fb.style.margin='12px 0 20px';
}
function updateWorkoutSet(si,field,val){ activeWorkout.entries[activeWorkout.cur].sets[si][field]=val; }
function toggleWorkoutSet(si){
  const A=activeWorkout, entry=A.entries[A.cur];
  entry.sets[si].done=!entry.sets[si].done;
  renderWorkoutScreen();
}
function addWorkoutSet(){
  const entry=activeWorkout.entries[activeWorkout.cur];
  const last=entry.sets[entry.sets.length-1];
  entry.sets.push({weight:last?last.weight:'', reps:last?last.reps:'', done:false});
  renderWorkoutScreen();
}
function removeWorkoutSet(si){
  const entry=activeWorkout.entries[activeWorkout.cur];
  if(entry.sets.length<=1)return;
  entry.sets.splice(si,1);
  renderWorkoutScreen();
}
function workoutPrev(){ if(activeWorkout.cur>0){activeWorkout.cur--;renderWorkoutScreen();} }
function workoutNext(){ if(activeWorkout.cur<activeWorkout.entries.length-1){activeWorkout.cur++;renderWorkoutScreen();} }
function discardWorkout(){
  if(!confirm('Se va a perder lo cargado en esta sesión. ¿Descartar?'))return;
  activeWorkout=null; stopWorkoutClock(); showLog();
}
function finishWorkout(){
  const A=activeWorkout;
  const clean={
    id: A.editingSessionId || A.id, date: A.date, routineId: A.routineId, routineName: A.routineName,
    exercises: A.entries.map(e=>({ id: uid(), cat: e.cat, exId: e.exId, targetReps: e.targetReps,
      sets: e.sets.map(({weight,reps})=>({weight,reps})) }))
  };
  const idx=log.findIndex(s=>s.id===clean.id);
  if(idx>=0) log[idx]=clean; else log.unshift(clean);
  saveLog();
  activeWorkout=null; stopWorkoutClock();
  toast('Sesión guardada');
  showLog();
}
```

- [ ] **Step 4: Wire the nav center button to the real start logic and keep its label in sync**

Find:
```html
    <button class="bnav-start" id="bnav-start" onclick="newSession()">
```
Replace with:
```html
    <button class="bnav-start" id="bnav-start" onclick="startWorkout()">
```

Find:
```js
function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}
```
Replace with:
```js
function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  updateStartButton();
}
function updateStartButton(){
  const btn=document.getElementById('bnav-start');
  if(!btn)return;
  btn.classList.toggle('resume', !!activeWorkout);
  btn.querySelector('span:last-child').textContent = activeWorkout ? 'Reanudar' : 'Empezar';
}
```

Find:
```js
  buildGuideGroups();
  applyGuideFilter();
}
```
Replace with:
```js
  buildGuideGroups();
  applyGuideFilter();
  updateStartButton();
}
```

- [ ] **Step 5: Verify in the browser**

Serve and open the app. Create at least one routine first (via the Rutinas tab) and assign it to today via the week strip.

1. Tap "Empezar" — confirm it jumps straight into the guided screen with today's routine's exercises, first exercise showing (image, name, "Última vez" if you have history, set rows with peso/reps/✕/checkbox).
2. Mark a set's checkbox done, add a set with "+ Serie", remove one with the row's ✕. Confirm the progress bar at the top updates.
3. Tap "Siguiente"/"Anterior", confirm it moves between exercises and the buttons disable at the ends.
4. Tap "Terminar antes de tiempo" (or the ✓ icon) with some sets marked — confirm it saves to Log with the right exercise/set count, and the nav returns to Log.
5. Tap "Empezar" again — since no `activeWorkout` remains (it was cleared on finish), confirm it goes through the same start logic again (today's routine or the chooser).
6. Start a workout, navigate to another tab (Guía) without finishing, come back and tap "Empezar" — confirm the button now says "Reanudar" and returns you exactly where you left off (same exercise, same set values).
7. Start a workout, tap ✕ discard, confirm the browser's confirm dialog, accept it — confirm nothing was added to Log and the button goes back to "Empezar".
8. Delete the today-assignment (or test on a day with nothing assigned) and tap "Empezar" — confirm the chooser overlay opens with "Freestyle (sin rutina)" first, then your saved routines; picking one starts it, picking Freestyle starts an empty session (shows the "Sin ejercicios" empty state — that's expected, "+ Agregar ejercicio" comes in Task 4).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Add guided workout screen: data model, start routing, core logging loop

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Rest timer + "Agregar ejercicio" mid-workout

**Files:**
- Modify: `index.html` (HTML: rest-timer bar, "+ Agregar ejercicio" button; CSS: rest-timer styles; JS: rest timer functions, `addExerciseToWorkout`/`pickWorkoutGroup`, picker generalization to a `'workout'` mode)

**Interfaces:**
- Consumes: `restSec`, `activeWorkout`, `openListOverlay`/`closeListOverlay`, `renderWorkoutScreen`, `GROUPS`, `openPicker` (existing, generalized here).
- Produces: `startRestTimer()`/`skipRestTimer()` (called from the amended `toggleWorkoutSet`), `addExerciseToWorkout()`, `pickWorkoutGroup(cat)`. Task 5 reuses none of these directly but must not break them while retiring the old picker mode.

- [ ] **Step 1: Add the rest-timer bar and the "+ Agregar ejercicio" button**

Find:
```html
    <div class="wk-progress"><i id="wk-progress-fill"></i></div>
    <div class="wk-body" id="wk-body"></div>
```
Replace with:
```html
    <div class="wk-progress"><i id="wk-progress-fill"></i></div>
    <div class="rest-timer" id="rest-timer">
      <span>Descanso</span><span class="rt-time" id="rt-time">0:00</span>
      <button onclick="skipRestTimer()">Saltar</button>
    </div>
    <div class="wk-body" id="wk-body"></div>
```

Find:
```html
    <div class="editor-content" id="wk-actions-container">
      <button class="btn-save" id="wk-finish-btn" onclick="finishWorkout()" style="width:100%;margin:12px 0 20px"></button>
    </div>
```
Replace with:
```html
    <div class="editor-content" id="wk-actions-container">
      <button class="btn-add-ex" onclick="addExerciseToWorkout()">+ Agregar ejercicio</button>
      <button class="btn-save" id="wk-finish-btn" onclick="finishWorkout()" style="width:100%;margin:0 0 20px"></button>
    </div>
```

- [ ] **Step 2: Add rest-timer CSS**

Find:
```css
.set-done{width:24px;height:24px;flex-shrink:0;accent-color:#FFD200}
```
Replace with:
```css
.set-done{width:24px;height:24px;flex-shrink:0;accent-color:#FFD200}
.rest-timer{display:none;align-items:center;justify-content:space-between;gap:10px;background:#1A1D2E;padding:8px 14px;font-size:13px;font-weight:700;color:#FFD200}
.rest-timer.active{display:flex}
.rest-timer .rt-time{font-variant-numeric:tabular-nums;font-size:16px}
.rest-timer button{background:none;border:1px solid #FFD200;border-radius:6px;color:#FFD200;padding:3px 9px;font-size:12px;cursor:pointer;font-weight:700}
```

- [ ] **Step 3: Add rest-timer logic, gated on a live session**

Find:
```js
function workoutPrev(){ if(activeWorkout.cur>0){activeWorkout.cur--;renderWorkoutScreen();} }
```
Replace with:
```js
let restTimerInterval=null, restTimerEnd=0;
function startRestTimer(){
  restTimerEnd = Date.now() + restSec*1000;
  document.getElementById('rest-timer').classList.add('active');
  tickRestTimer();
  clearInterval(restTimerInterval);
  restTimerInterval=setInterval(tickRestTimer,250);
}
function tickRestTimer(){
  const remain=Math.max(0, Math.ceil((restTimerEnd-Date.now())/1000));
  document.getElementById('rt-time').textContent = Math.floor(remain/60)+':'+String(remain%60).padStart(2,'0');
  if(remain<=0){
    clearInterval(restTimerInterval); restTimerInterval=null;
    try{ navigator.vibrate?.(400); }catch(e){}
    beepSound();
    hideRestTimer();
  }
}
function hideRestTimer(){ document.getElementById('rest-timer').classList.remove('active'); }
function skipRestTimer(){ clearInterval(restTimerInterval); restTimerInterval=null; hideRestTimer(); }
function beepSound(){
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    o.start(); o.stop(ctx.currentTime+0.15);
  }catch(e){}
}
function workoutPrev(){ if(activeWorkout.cur>0){activeWorkout.cur--;renderWorkoutScreen();} }
```

- [ ] **Step 4: Trigger the rest timer only on a live session, at the last set of a non-final exercise**

Find:
```js
function toggleWorkoutSet(si){
  const A=activeWorkout, entry=A.entries[A.cur];
  entry.sets[si].done=!entry.sets[si].done;
  renderWorkoutScreen();
}
```
Replace with:
```js
function toggleWorkoutSet(si){
  const A=activeWorkout, entry=A.entries[A.cur];
  entry.sets[si].done=!entry.sets[si].done;
  if(A.start && entry.sets[si].done && entry.sets.every(s=>s.done) && A.cur<A.entries.length-1){
    startRestTimer();
  }
  renderWorkoutScreen();
}
```

- [ ] **Step 5: Add "+ Agregar ejercicio" (group picker → exercise picker, 3rd picker mode)**

Find:
```js
function selectPickerExercise(exId){
  if(pickerMode==='routine'){ updateRoutineExId(pickerExBlockId, exId); renderRoutineExercises(); }
  else { updateExId(pickerExBlockId, exId); renderExercises(); }
  closePicker();
}
```
Replace with:
```js
function selectPickerExercise(exId){
  if(pickerMode==='routine'){ updateRoutineExId(pickerExBlockId, exId); renderRoutineExercises(); }
  else if(pickerMode==='workout'){
    const entry=activeWorkout.entries.find(e=>e.id===pickerExBlockId);
    if(entry) entry.exId=exId;
    renderWorkoutScreen();
  }
  else { updateExId(pickerExBlockId, exId); renderExercises(); }
  closePicker();
}
function addExerciseToWorkout(){
  const items = GROUPS.map(g=>({label:g.label, onclick:`pickWorkoutGroup('${g.id}')`}));
  openListOverlay('Elegir grupo muscular', items);
}
function pickWorkoutGroup(cat){
  closeListOverlay();
  const entry={id:uid(), cat, exId:'', targetReps:'', sets:[{weight:'',reps:'',done:false}]};
  activeWorkout.entries.push(entry);
  activeWorkout.cur = activeWorkout.entries.length-1;
  openPicker(entry.id, 'workout');
}
```

Find:
```js
function renderPickerBody(){
  const block=(pickerMode==='routine'?editRoutine:editSession).exercises.find(e=>e.id===pickerExBlockId);
  if(!block)return;
```
Replace with:
```js
function renderPickerBody(){
  const block = pickerMode==='routine' ? editRoutine.exercises.find(e=>e.id===pickerExBlockId)
    : pickerMode==='workout' ? activeWorkout.entries.find(e=>e.id===pickerExBlockId)
    : editSession.exercises.find(e=>e.id===pickerExBlockId);
  if(!block)return;
```

- [ ] **Step 6: Verify in the browser**

Serve and open the app, start a live workout (from a routine with 2+ exercises).

1. Complete every set of the FIRST exercise (all checkboxes on) — confirm the rest-timer bar appears with a countdown, that "Saltar" hides it immediately, and that letting it run to 0 vibrates/beeps (if your device supports it) and hides itself.
2. Complete every set of the LAST exercise — confirm the rest timer does NOT appear (no next exercise to rest before).
3. Tap "+ Agregar ejercicio" — confirm a "Elegir grupo muscular" list opens; pick one, confirm the exercise picker opens scoped to that group; pick an exercise — confirm it becomes the current exercise on screen with one empty set, and the progress totals updated.
4. Confirm the routine editor's exercise picker (`view-routine-edit` → tap an exercise slot) still works exactly as before (picker mode `'routine'` untouched).

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "Add rest timer and mid-workout exercise picker to guided mode

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Edit history via guided mode, retire the flat editor

**Files:**
- Modify: `index.html` (HTML: remove `view-edit`; CSS: remove `#view-edit` rule; JS: rewrite `editSessionFn`, rewrite `addToToday`, delete the old flat-editor functions, drop the dead `'session'` picker branch)

**Interfaces:**
- Consumes: `buildActiveWorkout`, `enterWorkoutScreen` (Task 3), `openPicker`/`renderPickerBody`/`selectPickerExercise` (Task 4).
- Produces: nothing new — this task only rewires two existing entry points (`editSessionFn`, `addToToday`) onto the guided screen and deletes now-unreachable code. Terminal task of this plan.

- [ ] **Step 1: Remove the flat editor view**

Find:
```html
  <!-- ── EDITOR ── -->
  <div class="view" id="view-edit">
    <div class="header">
      <button class="btn-back" onclick="showLog()">←</button>
      <span class="header-title" id="editor-title">Nueva sesión</span>
    </div>
    <div class="editor-content">
      <div class="field-group">
        <div class="field-label">Fecha</div>
        <input type="date" id="session-date">
      </div>
      <div id="exercises-container"></div>
      <button class="btn-add-ex" onclick="addExercise()">+ Ejercicio</button>
    </div>
    <div class="editor-footer">
      <button class="btn-cancel" onclick="showLog()">Cancelar</button>
      <button class="btn-save" id="btn-save" onclick="saveSession()" disabled>Guardar sesión</button>
    </div>
  </div>

  <!-- ── GUIDE ── -->
```
Replace with:
```html
  <!-- ── GUIDE ── -->
```

- [ ] **Step 2: Remove the now-dead `#view-edit` CSS rule**

Find:
```css
.view{display:none;padding-bottom:64px}
#view-edit{padding-bottom:130px}
.view.active{display:block}
```
Replace with:
```css
.view{display:none;padding-bottom:64px}
.view.active{display:block}
```

- [ ] **Step 3: Rewrite `editSessionFn` to enter the guided screen in edit mode, resuming at the first incomplete exercise**

Find:
```js
function editSessionFn(id){
  const s=log.find(x=>x.id===id);if(!s)return;
  editSession=JSON.parse(JSON.stringify(s));
  editSession.exercises.forEach(e=>{if(!e.cat&&e.exId){const ex=EXERCISES.find(x=>x.id===e.exId);if(ex)e.cat=GROUP_MERGE[ex.category]||ex.category;}});
  document.getElementById('editor-title').textContent='Editar sesión';
  document.getElementById('session-date').value=editSession.date;
  renderExercises();
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-edit').classList.add('active');
  window.scrollTo(0,0);
}
```
Replace with:
```js
function editSessionFn(id){
  const s=log.find(x=>x.id===id);if(!s)return;
  activeWorkout = buildActiveWorkout(null, s);
  const firstIncomplete = activeWorkout.entries.findIndex(e=>e.sets.some(st=>!st.done));
  activeWorkout.cur = firstIncomplete>=0 ? firstIncomplete : 0;
  enterWorkoutScreen();
}
```

- [ ] **Step 4: Rewrite `addToToday` (Guide's quick-add) onto the guided screen**

Find:
```js
function addToToday(){
  const ex=EXERCISES.find(e=>e.id===gSelectedId);if(!ex)return;
  const cat=GROUP_MERGE[ex.category];
  const today=todayISO();
  const existing=log.find(s=>s.date===today);
  if(existing){
    editSession=JSON.parse(JSON.stringify(existing));
  } else {
    editSession={id:uid(), date:today, exercises:[]};
  }
  let block=editSession.exercises.find(e=>e.exId===ex.id);
  if(!block){
    block={id:uid(), cat, exId:ex.id, sets:[emptySet()]};
    editSession.exercises.push(block);
  }
  document.getElementById('editor-title').textContent=existing?'Editar sesión':'Nueva sesión';
  document.getElementById('session-date').value=editSession.date;
  renderExercises();
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-edit').classList.add('active');
  window.scrollTo(0,0);
  setTimeout(()=>{const el=document.getElementById(`exblock-${block.id}`);if(el)el.scrollIntoView({behavior:'smooth',block:'center'});},50);
}
```
Replace with:
```js
function addToToday(){
  const ex=EXERCISES.find(e=>e.id===gSelectedId);if(!ex)return;
  const cat=GROUP_MERGE[ex.category];
  const today=todayISO();
  const existing=log.find(s=>s.date===today);
  activeWorkout = existing ? buildActiveWorkout(null, existing)
    : {id:uid(), date:today, routineId:null, routineName:null, start:Date.now(), editingSessionId:null, cur:0, entries:[]};
  if(existing) activeWorkout.start = Date.now();
  let idx = activeWorkout.entries.findIndex(e=>e.exId===ex.id);
  if(idx<0){
    activeWorkout.entries.push({id:uid(), cat, exId:ex.id, targetReps:'', sets:[{weight:'',reps:'',done:false}]});
    idx = activeWorkout.entries.length-1;
  }
  activeWorkout.cur = idx;
  enterWorkoutScreen();
}
```

- [ ] **Step 5: Delete the retired flat-editor functions**

Find:
```js
function renderExercises(){
  document.getElementById('exercises-container').innerHTML=editSession.exercises.map(ex=>buildExBlock(ex)).join('');
  validateSave();
}
function buildSetRow(exId,s,si,disabled,repsPlaceholder){
  return `<div class="set-row">
      <span class="set-dot">●</span>
      <div class="set-iw"><input type="number" inputmode="decimal" placeholder="0" value="${s.weight}" onchange="updateSet('${exId}',${si},'weight',this.value)"><span class="set-unit">kg</span></div>
      <div class="set-iw"><input type="number" inputmode="numeric" placeholder="${repsPlaceholder||'0'}" value="${s.reps}" onchange="updateSet('${exId}',${si},'reps',this.value)"><span class="set-unit">reps</span></div>
      <button class="btn-rm-set" onclick="removeSet('${exId}',${si})" ${disabled?'disabled style="opacity:0.2"':''}>✕</button>
    </div>`;
}
function buildExBlock(ex){
  const canRm=editSession.exercises.length>1;
  const exData=EXERCISES.find(e=>e.id===ex.exId);
  const muscles=[exData?.target,...(exData?.secondary_muscles||[])].filter(Boolean);
  const muscleTags=muscles.map(m=>`<span class="mtag">${m}</span>`).join('');

  const groupOpts=GROUPS.map(g=>`<option value="${g.id}"${ex.cat===g.id?' selected':''}>${g.label}</option>`).join('');

  const setsHTML=ex.sets.map((s,si)=>buildSetRow(ex.id,s,si,ex.sets.length===1,si===0?ex.targetReps:null)).join('');

  return`<div class="ex-block" id="exblock-${ex.id}">
    <div class="ex-block-top">
      <div class="ex-selectors">
        <select class="step-select${!ex.cat?' ph':''}" onchange="updateExCat('${ex.id}',this.value)">
          <option value="">— Grupo muscular —</option>${groupOpts}
        </select>
        ${ex.cat?`<button type="button" class="step-select picker-trigger${!ex.exId?' ph':''}" onclick="openPicker('${ex.id}')">${exData?`<span class="picker-trigger-thumb"><img src="${RAW+exData.image}" loading="lazy" onerror="this.style.display='none'"></span><span>${esName(exData)}</span>`:'— Ejercicio —'}</button>`:''}
      </div>
      <button class="btn-remove-ex" onclick="removeExercise('${ex.id}')" ${!canRm?'disabled style="color:#1E2130"':''}>✕</button>
    </div>
    <div class="muscles-row" id="muscles-${ex.id}">${muscleTags}</div>
    <div class="sets-hdr"><span style="width:14px;flex-shrink:0"></span><span>Peso</span><span>Reps</span><span class="col-x"></span></div>
    <div class="sets-list" id="sets-${ex.id}">${setsHTML}</div>
    <button class="btn-add-set" onclick="addSet('${ex.id}')">+ Serie</button>
  </div>`;
}

function updateExCat(exId,cat){const ex=editSession.exercises.find(e=>e.id===exId);if(!ex)return;ex.cat=cat;ex.exId='';renderExercises();}
function updateExId(exId,val){
  const ex=editSession.exercises.find(e=>e.id===exId);if(!ex)return;ex.exId=val;
  const exData=EXERCISES.find(e=>e.id===val);
  const el=document.getElementById(`muscles-${exId}`);
  if(el){const muscles=[exData?.target,...(exData?.secondary_muscles||[])].filter(Boolean);el.innerHTML=muscles.map(m=>`<span class="mtag">${m}</span>`).join('');}
  validateSave();
}
function updateSet(exId,si,field,val){const ex=editSession.exercises.find(e=>e.id===exId);if(ex&&ex.sets[si])ex.sets[si][field]=val;}
function addSet(exId){
  const ex=editSession.exercises.find(e=>e.id===exId);if(!ex)return;
  ex.sets.push(emptySet());
  const container=document.getElementById(`sets-${exId}`);
  if(!container){renderExercises();return;}
  const si=ex.sets.length-1;
  container.insertAdjacentHTML('beforeend',buildSetRow(exId,ex.sets[si],si,false));
  container.querySelectorAll('.btn-rm-set').forEach(b=>{b.disabled=false;b.removeAttribute('style');});
}
function removeSet(exId,si){const ex=editSession.exercises.find(e=>e.id===exId);if(!ex||ex.sets.length<=1)return;ex.sets.splice(si,1);renderExercises();}
function addExercise(){editSession.exercises.push(emptyEx());renderExercises();setTimeout(()=>{const b=document.querySelectorAll('.ex-block');if(b.length)b[b.length-1].scrollIntoView({behavior:'smooth'});},50);}
function removeExercise(exId){if(editSession.exercises.length<=1)return;editSession.exercises=editSession.exercises.filter(e=>e.id!==exId);renderExercises();}
function validateSave(){document.getElementById('btn-save').disabled=!(editSession&&editSession.exercises.every(e=>e.exId));}
function saveSession(){
  editSession.date=document.getElementById('session-date').value||todayISO();
  const idx=log.findIndex(s=>s.id===editSession.id);
  if(idx>=0)log[idx]=editSession;else log.unshift(editSession);
  saveLog();toast('Sesión guardada');showLog();
}
```
Replace with:
```js
```
(deletes the block entirely — replace with nothing)

- [ ] **Step 6: Drop the dead `'session'` picker mode and the now-unused `newSession`/`emptySet`/`emptyEx`/`emptySession`/`editSession`**

Find:
```js
let editSession = null;
```
Replace with:
```js
```
(deletes the line)

Find:
```js
function emptySet(){return{id:uid(),weight:'',reps:''};}
function emptyEx(){return{id:uid(),cat:'',exId:'',sets:[emptySet()]};}
function emptySession(){return{id:uid(),date:todayISO(),exercises:[emptyEx()]};}
```
Replace with:
```js
```
(deletes the block)

Find:
```js
function newSession(){
  editSession=emptySession();
  document.getElementById('editor-title').textContent='Nueva sesión';
  document.getElementById('session-date').value=editSession.date;
  renderExercises();
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-edit').classList.add('active');
  window.scrollTo(0,0);
}
```
Replace with:
```js
```
(deletes the block)

Find:
```js
let pickerMode = 'session';
function openPicker(exBlockId, mode){
  pickerMode = mode || 'session';
```
Replace with:
```js
let pickerMode = 'workout';
function openPicker(exBlockId, mode){
  pickerMode = mode || 'workout';
```

Find:
```js
function renderPickerBody(){
  const block = pickerMode==='routine' ? editRoutine.exercises.find(e=>e.id===pickerExBlockId)
    : pickerMode==='workout' ? activeWorkout.entries.find(e=>e.id===pickerExBlockId)
    : editSession.exercises.find(e=>e.id===pickerExBlockId);
  if(!block)return;
```
Replace with:
```js
function renderPickerBody(){
  const block = pickerMode==='routine' ? editRoutine.exercises.find(e=>e.id===pickerExBlockId)
    : activeWorkout.entries.find(e=>e.id===pickerExBlockId);
  if(!block)return;
```

Find:
```js
function selectPickerExercise(exId){
  if(pickerMode==='routine'){ updateRoutineExId(pickerExBlockId, exId); renderRoutineExercises(); }
  else if(pickerMode==='workout'){
    const entry=activeWorkout.entries.find(e=>e.id===pickerExBlockId);
    if(entry) entry.exId=exId;
    renderWorkoutScreen();
  }
  else { updateExId(pickerExBlockId, exId); renderExercises(); }
  closePicker();
}
```
Replace with:
```js
function selectPickerExercise(exId){
  if(pickerMode==='routine'){ updateRoutineExId(pickerExBlockId, exId); renderRoutineExercises(); }
  else {
    const entry=activeWorkout.entries.find(e=>e.id===pickerExBlockId);
    if(entry) entry.exId=exId;
    renderWorkoutScreen();
  }
  closePicker();
}
```

- [ ] **Step 7: Verify in the browser**

Serve and open the app.

1. Open DevTools console: `typeof newSession`, `typeof saveSession`, `typeof renderExercises`, `typeof buildExBlock`, `typeof editSession` — all should log `"undefined"`.
2. Confirm no `view-edit` element exists in the DOM (`document.getElementById('view-edit')` → `null`).
3. Log a session (via "Empezar"), confirm it saves and shows correctly in Log.
4. Tap the ✏️ icon on a session card in Log — confirm it opens the guided screen with NO elapsed clock (blank where the timer would be) and NO rest-timer ever appearing, resuming at the first exercise with an incomplete set (test with a session that has one exercise fully logged and another empty — confirm it opens on the empty one).
5. Edit some values, tap ✓/"Terminar" — confirm it updates that same session in place (no duplicate card in Log).
6. Go to Guía, pick an exercise, tap "+ Agregar a hoy" — confirm it opens the guided screen (WITH a running clock this time, since this is a live add), scrolled/focused to that exercise, and that saving adds it to today's session (creating one if none exists yet, or merging into today's existing one without duplicating an already-present exercise).
7. Confirm the routine editor (create/edit a routine) still works fully unaffected — its own picker mode (`'routine'`) and its own exercise blocks (`buildRoutineExBlock`, untouched by this task) are unrelated code paths.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "Route session editing through the guided screen, retire the flat editor

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
