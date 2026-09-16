# Inicio + Stats/Historial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repurpose the "Log" tab into "Inicio" (showing what the Rutinas tab shows today, removing the separate Rutinas tab entirely), and move session history out of it into a new Stats-linked "Historial" overlay, following openGym's pattern of a compact "recent sessions" preview inside Stats plus a full history screen reached from there.

**Architecture:** `view-log`/`showLog()`/`bnav-log` are reused as Inicio's container/function/nav-button (they're already the target of "go home" from 7 places in the app, vs. only 3 for `view-routines`/`showRoutines()` — reusing the more-referenced name means fewer call sites to touch). `view-routines`/`showRoutines()`/`bnav-routines` are deleted entirely. Session history's row-rendering logic (`renderLog()`) is renamed to `renderHistory()` and retargeted at a new `#history-overlay`, reached from Stats.

**Tech Stack:** HTML/CSS/vanilla JS, single-file (`index.html`), no build step, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-15-inicio-stats-historial-design.md`

## Global Constraints

- No test runner exists in this repo. "Testing" a step means: serve the folder locally (`python -m http.server 8099` from `C:\Code\hierro-pwa`, open `http://localhost:8099/index.html`), and manually verify in a browser.
- The exercises dataset fetch (`raw.githubusercontent.com`) may be rate-limited/unavailable in some environments — if a plain page load shows "No se pudo cargar la biblioteca.", work around it by injecting a fixture `EXERCISES` array and manually finishing `init()`'s tail in the browser console (documented in Task 1's Step where first needed).
- `view-log`, `showLog()`, and `bnav-log` are the identifiers being *reused* for Inicio, not renamed — do not rename them to `view-home`/`showHome`/`bnav-home` anywhere in this plan; that was a deliberate choice (see spec) to avoid touching 7 unrelated call sites that mean "go to the main screen" regardless of what it's called internally.
- Stats' "Sesiones recientes" preview rows stay non-interactive (no `onclick`, no swipe) — they already are today, this plan must not add any interactivity to `.recent-row`.

---

### Task 1: Repurpose Inicio, remove the Rutinas tab

**Files:**
- Modify: `index.html` (HTML: `view-log`/`view-routines` ~lines 286-309, bottom-nav ~lines 414-421; JS: `showLog`/`showRoutines` ~lines 788, 1457, `cancelRoutineEdit` ~lines 1505-1510, `exportRoutinePrompt`/`shareRoutinePrompt` ~lines 1583-1589, 1602-1608)

**Interfaces:**
- Produces: `showLog()` — same name, new body (does what `showRoutines()` used to: reset `routinePickMode`, render the week strip and routines list, then show `view-log`). This is what Task 2 and Task 3 build on — neither of them needs to know `showRoutines()` ever existed.
- Removes: `view-routines` (HTML), `showRoutines()` (JS), `bnav-routines` (HTML). Nothing later in this plan references any of these.
- Consumes (unchanged): `renderPlanSemanal()`, `renderRoutinesList()`, `showTemplatePicker()`, `newRoutine()`, `routinePickMode` — none of these change shape, only where they're called from.

- [ ] **Step 1: Move the Rutinas content into Inicio, delete the Routines view**

Find (in `index.html`, ~line 286-309):
```html
  <!-- ── LOG ── -->
  <div class="view active" id="view-log">
    <div class="header">
      <div class="logo-block"><div class="wordmark">HIERRO</div><div class="sub" id="log-quote"></div></div>
      <div class="header-actions">
        <button class="btn-ghost" onclick="showSettings()" aria-label="Ajustes">⚙️</button>
      </div>
    </div>
    <div class="log-content" id="log-content"></div>
    <div id="notices"></div>
  </div>

  <!-- ── ROUTINES ── -->
  <div class="view" id="view-routines">
    <div class="header" style="border-bottom:none">
      <div class="logo-block"><div class="wordmark" style="font-size:17px">Rutinas</div></div>
      <div class="header-actions">
        <button class="btn-ghost" onclick="showTemplatePicker()">Plantillas</button>
        <button class="btn-primary" onclick="newRoutine()">+ Rutina</button>
      </div>
    </div>
    <div id="plan-semanal"></div>
    <div class="editor-content" id="routines-list"></div>
  </div>
```

Replace with:
```html
  <!-- ── INICIO ── -->
  <div class="view active" id="view-log">
    <div class="header">
      <div class="logo-block"><div class="wordmark">HIERRO</div><div class="sub" id="log-quote"></div></div>
      <div class="header-actions">
        <button class="btn-ghost" onclick="showSettings()" aria-label="Ajustes">⚙️</button>
      </div>
    </div>
    <div id="plan-semanal"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 2px 10px">
      <div class="field-label" style="margin:0">Rutinas</div>
      <div style="display:flex;gap:8px">
        <button class="btn-ghost" onclick="showTemplatePicker()">Plantillas</button>
        <button class="btn-primary" onclick="newRoutine()">+ Rutina</button>
      </div>
    </div>
    <div class="editor-content" id="routines-list"></div>
    <div id="notices"></div>
  </div>
```

(Notice `log-content` is gone — session cards no longer render inside this view. `plan-semanal` and `routines-list` keep their existing ids, unchanged, just moved up from the deleted Routines view. `notices` moves to the end, after the routines list, since it's still "the main screen's" notice area.)

- [ ] **Step 2: Rename the bottom-nav's Log button to Inicio, delete the Routines button**

Find (in `index.html`, ~line 414-421):
```html
    <button class="bnav-btn active" id="bnav-log" onclick="showLog()">
      <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
      Log
    </button>
    <button class="bnav-btn" id="bnav-routines" onclick="showRoutines()">
      <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
      Rutinas
    </button>
```

Replace with:
```html
    <button class="bnav-btn active" id="bnav-log" onclick="showLog()">
      <svg viewBox="0 0 24 24"><path d="M4 12l8-8 8 8"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-6h4v6"/></svg>
      Inicio
    </button>
```

(The `id="bnav-log"` and `onclick="showLog()"` stay exactly as they are — only the visible label and the icon's inner SVG paths change. The new path draws a simple house: a roof chevron, two walls down to the ground, and a door rectangle — matching the existing icons' style, which is plain stroke paths with no `fill` and no per-icon `stroke-width` — that's inherited from the shared `.bnav-btn svg` CSS rule already in the file, so don't add any inline styling to the new `<svg>`.)

- [ ] **Step 3: Rewrite `showLog()`, delete `showRoutines()`**

Find (in `index.html`, ~line 788):
```js
function showLog(){showView('view-log');setActiveNav('bnav-log');renderLog();document.getElementById('log-quote').textContent=randomQuote();}
```

Replace with:
```js
function showLog(){routinePickMode=null;showView('view-log');setActiveNav('bnav-log');renderPlanSemanal();renderRoutinesList();document.getElementById('log-quote').textContent=randomQuote();}
```

Find (in `index.html`, ~line 1457):
```js
function showRoutines(){ routinePickMode=null; setActiveNav('bnav-routines'); renderPlanSemanal(); renderRoutinesList(); showView('view-routines'); }
```

Replace with: (nothing — delete this line entirely)

- [ ] **Step 4: Point `cancelRoutineEdit()` at Inicio instead of the deleted Routines view**

Find (in `index.html`, ~line 1505-1510):
```js
function cancelRoutineEdit(){
  const r=currentRoutine();
  if(r && !r.name.trim()){ r.name='Rutina'; saveRoutines(); }
  editingRoutineId=null;
  showRoutines();
}
```

Replace with:
```js
function cancelRoutineEdit(){
  const r=currentRoutine();
  if(r && !r.name.trim()){ r.name='Rutina'; saveRoutines(); }
  editingRoutineId=null;
  showLog();
}
```

- [ ] **Step 5: Point the routine export/share picker at Inicio instead of the deleted Routines view**

Find (in `index.html`, ~line 1583-1589):
```js
function exportRoutinePrompt(){
  if(!routines.length){ toast('No hay rutinas guardadas'); return; }
  if(routines.length===1){ exportRoutine(routines[0].id); return; }
  routinePickMode='export';
  renderRoutinesList();
  showView('view-routines');
}
```

Replace with:
```js
function exportRoutinePrompt(){
  if(!routines.length){ toast('No hay rutinas guardadas'); return; }
  if(routines.length===1){ exportRoutine(routines[0].id); return; }
  routinePickMode='export';
  renderRoutinesList();
  showView('view-log');
}
```

Find (in `index.html`, ~line 1602-1608):
```js
function shareRoutinePrompt(){
  if(!routines.length){ toast('No hay rutinas guardadas'); return; }
  if(routines.length===1){ shareRoutine(routines[0].id); return; }
  routinePickMode='share';
  renderRoutinesList();
  showView('view-routines');
}
```

Replace with:
```js
function shareRoutinePrompt(){
  if(!routines.length){ toast('No hay rutinas guardadas'); return; }
  if(routines.length===1){ shareRoutine(routines[0].id); return; }
  routinePickMode='share';
  renderRoutinesList();
  showView('view-log');
}
```

- [ ] **Step 6: Verify in the browser**

Serve the folder and open it. If the exercises dataset fails to load, inject a fixture and finish init manually in the console:
```js
EXERCISES=[{id:'0025',name:'x',category:'chest',target:'pectorals',secondary_muscles:[],equipment:'barbell',image:'i.jpg',gif_url:'v.gif',instructions:{es:'x'},instruction_steps:{es:['1']}}];
document.getElementById('loader').style.display='none';
document.getElementById('app').style.display='block';
routinePickMode=null;showView('view-log');setActiveNav('bnav-log');renderPlanSemanal();renderRoutinesList();
```

1. Confirm the app opens directly on Inicio (bottom-nav shows "Inicio" with a house icon, active/highlighted) and its content is the week strip, the "Rutinas" row (Plantillas / + Rutina buttons), and the routines list — not session cards. (At this point in the plan `init()` still calls the old `renderLog()`/`log-content` code, which no longer has a container to render into since Step 1 removed `#log-content` — this is expected and fixed by Task 2; for this step, verify using the manual console commands above rather than a plain page load, since `init()` isn't fully consistent with the new HTML until Task 2 lands.)
2. Confirm the bottom-nav has exactly 4 buttons: Inicio, Empezar, Stats, Guía — no "Rutinas".
3. Tap "+ Rutina", confirm the editor opens. Tap "←" — confirm it returns to Inicio (exercising the new `cancelRoutineEdit()` → `showLog()` path) and the routines list reflects the change.
4. Tap "Plantillas" — confirm the template picker overlay opens as before.
5. Create a 2nd routine (so `routines.length >= 2`), then call `exportRoutinePrompt()` from the console — confirm the export picker renders inside Inicio (not a blank/broken view) and that picking a routine or backing out returns cleanly to Inicio.
6. Clean up: if no real routines existed before this test (check `routines` in the console first if unsure), clear them with `routines=[]; saveRoutines();`.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Repurpose Log tab into Inicio, remove the separate Routines tab

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Historial overlay, retire session rendering from Inicio's init path

**Files:**
- Modify: `index.html` (HTML: new `#history-overlay` ~after line 402; JS: `renderLog`→`renderHistory` ~line 801-803, `deleteSession` ~line 873-876, `confirmBackupRestore` ~line 929-937, `init()` tail ~line 710-717)

**Interfaces:**
- Produces: `openHistory()` — global function, no args, renders and shows `#history-overlay`. `closeHistory()` — hides it. `renderHistory()` — same body as the old `renderLog()`, retargeted to render into `#history-list` instead of `#log-content`. Task 3 (Stats) calls `openHistory()` from two places.
- Removes: `renderLog()` (renamed, not removed — `renderHistory()` is its full replacement, same logic, same swipe-to-delete row markup, same empty state).
- Consumes (from Task 1): `showLog()`'s new body already calls `renderPlanSemanal()`/`renderRoutinesList()` — this task does NOT touch `showLog()` again; it only changes what `init()` calls directly (which is separate from `showLog()`).

- [ ] **Step 1: Add the Historial overlay and its open/close/render functions**

Find (in `index.html`, ~line 396-404):
```html
  <div class="picker-overlay" id="guide-detail-overlay">
    <div class="header" style="border-bottom:none">
      <button class="btn-back" onclick="closeGuideDetail()">←</button>
      <span class="header-title">Ejercicio</span>
    </div>
    <div class="guide-detail" id="guide-detail"></div>
  </div>

  <!-- ── STATS ── -->
```

Replace with:
```html
  <div class="picker-overlay" id="guide-detail-overlay">
    <div class="header" style="border-bottom:none">
      <button class="btn-back" onclick="closeGuideDetail()">←</button>
      <span class="header-title">Ejercicio</span>
    </div>
    <div class="guide-detail" id="guide-detail"></div>
  </div>

  <div class="picker-overlay" id="history-overlay">
    <div class="header" style="border-bottom:none">
      <button class="btn-back" onclick="closeHistory()">←</button>
      <span class="header-title">Historial</span>
    </div>
    <div class="log-content" id="history-list"></div>
  </div>

  <!-- ── STATS ── -->
```

(`#history-list` reuses the existing `.log-content` CSS class for its padding/spacing — the same class `#log-content` used to have — since the row markup rendered into it is byte-identical to what used to render into `#log-content`.)

- [ ] **Step 2: Rename `renderLog` to `renderHistory`, retarget it, add `openHistory`/`closeHistory`**

Find (in `index.html`, ~line 801-803):
```js
// ── LOG ───────────────────────────────────────────────────────────────────────
function renderLog(){
  const el=document.getElementById('log-content');
```

Replace with:
```js
// ── HISTORIAL ─────────────────────────────────────────────────────────────────
function openHistory(){ renderHistory(); document.getElementById('history-overlay').classList.add('active'); }
function closeHistory(){ document.getElementById('history-overlay').classList.remove('active'); }
function renderHistory(){
  const el=document.getElementById('history-list');
```

(The rest of the function's body — from `const sorted=[...log]...` through its closing `}` — is unchanged. Do not touch it; this Find/Replace only covers the comment line, the function signature, and the `el=` line.)

- [ ] **Step 3: Update `deleteSession`'s call**

Find (in `index.html`, ~line 873-876):
```js
function deleteSession(id){
  if(!confirm('¿Eliminar esta sesión?'))return;
  log=log.filter(s=>s.id!==id);saveLog();renderLog();toast('Sesión eliminada');
}
```

Replace with:
```js
function deleteSession(id){
  if(!confirm('¿Eliminar esta sesión?'))return;
  log=log.filter(s=>s.id!==id);saveLog();renderHistory();toast('Sesión eliminada');
}
```

- [ ] **Step 4: Update `confirmBackupRestore`'s call**

Find (in `index.html`, ~line 929-937):
```js
function confirmBackupRestore(){
  const data=pendingBackupData; if(!data) return;
  const dayOverridesData = (data.hierro_day_overrides && typeof data.hierro_day_overrides==='object' && !Array.isArray(data.hierro_day_overrides)) ? data.hierro_day_overrides : {};
  log=data.log; routines=data.hierro_routines; week=data.hierro_week; dayOverrides=dayOverridesData;
  saveLog(); saveRoutines(); saveWeek(); saveDayOverrides();
  renderLog(); renderPlanSemanal();
  toast(`Backup restaurado: ${log.length} ${log.length!==1?'sesiones':'sesión'}, ${routines.length} rutina${routines.length!==1?'s':''}`);
  cancelBackupRestore();
}
```

Replace with:
```js
function confirmBackupRestore(){
  const data=pendingBackupData; if(!data) return;
  const dayOverridesData = (data.hierro_day_overrides && typeof data.hierro_day_overrides==='object' && !Array.isArray(data.hierro_day_overrides)) ? data.hierro_day_overrides : {};
  log=data.log; routines=data.hierro_routines; week=data.hierro_week; dayOverrides=dayOverridesData;
  saveLog(); saveRoutines(); saveWeek(); saveDayOverrides();
  renderHistory(); renderPlanSemanal();
  toast(`Backup restaurado: ${log.length} ${log.length!==1?'sesiones':'sesión'}, ${routines.length} rutina${routines.length!==1?'s':''}`);
  cancelBackupRestore();
}
```

- [ ] **Step 5: Fix `init()` — Inicio needs its content rendered at startup; Historial does not**

`init()` currently eagerly renders the Log screen's content, because `view-log` (session history) used to be the default active view. Now `view-log` is Inicio (routines content), and Historial is an on-demand overlay (rendered only when `openHistory()` opens it, same as `openGuideDetail`/`openGlossary`) — so `init()` needs to render `plan-semanal`/`routines-list` directly instead of calling the old `renderLog()`.

Find (in `index.html`, ~line 710-717):
```js
  document.getElementById('loader').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('log-quote').textContent = randomQuote();
  renderLog();
  initSwipeDelete(document.getElementById('log-content'));
  initSwipeDelete(document.getElementById('routines-list'));
  initSwipeDelete(document.getElementById('wk-body'));
  initSwipeDelete(document.getElementById('routine-exercises-container'));
```

Replace with:
```js
  document.getElementById('loader').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('log-quote').textContent = randomQuote();
  renderPlanSemanal();
  renderRoutinesList();
  initSwipeDelete(document.getElementById('history-list'));
  initSwipeDelete(document.getElementById('routines-list'));
  initSwipeDelete(document.getElementById('wk-body'));
  initSwipeDelete(document.getElementById('routine-exercises-container'));
```

- [ ] **Step 6: Verify in the browser**

Serve the folder fresh (a plain page load should now work end-to-end, since Task 1 + this step's `init()` fix together make the HTML and JS consistent — no manual console workaround needed for navigation, only for the exercises-dataset fetch if that's rate-limited, same fixture as Task 1 Step 6):

1. Confirm the app loads directly into Inicio with the week strip and routines list populated (not blank) — this specifically exercises this task's `init()` fix.
2. In the console, seed a couple of sessions and call `openHistory()` directly:
```js
log=[{id:'s1',date:'2026-09-08',routineId:null,routineName:null,exercises:[]},{id:'s2',date:'2026-09-07',routineId:null,routineName:null,exercises:[]}];
openHistory();
```
Confirm the Historial overlay opens, showing both sessions, most recent first, each with ✏️/🗑️ buttons.
3. Tap "←" in the Historial overlay — confirm `closeHistory()` returns to whatever was behind it (Stats, once Task 3 lands; for now, just confirm the overlay closes and the app underneath is still Inicio, unaffected).
4. Delete one of the two seeded sessions (via the 🗑️ button) — confirm it disappears from the list (exercising the renamed `renderHistory()` call inside `deleteSession`).
5. Clean up: `localStorage.removeItem('hierro_log_v3')` (or whichever key `STORAGE_KEY` resolves to — check via `grep -n "STORAGE_KEY" index.html` if unsure) if real data wasn't already present.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add Historial overlay, retarget session rendering away from Inicio's init path

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Stats — recent-sessions preview bump + link to Historial

**Files:**
- Modify: `index.html` (HTML: Stats header ~line 405-410; JS: `renderStats()`'s recent-sessions section ~line 2087-2100)

**Interfaces:**
- Consumes: `openHistory()` (Task 2) — called from two places added in this task.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Add a Historial shortcut button to Stats' header**

Find (in `index.html`, ~line 405-410):
```html
  <div class="view" id="view-stats">
    <div class="header">
      <div class="logo-block"><div class="wordmark" style="font-size:17px">Estadísticas</div></div>
    </div>
    <div class="stats-content" id="stats-content"></div>
  </div>
```

Replace with:
```html
  <div class="view" id="view-stats">
    <div class="header">
      <div class="logo-block"><div class="wordmark" style="font-size:17px">Estadísticas</div></div>
      <div class="header-actions">
        <button class="btn-ghost" onclick="openHistory()" aria-label="Historial">🕓</button>
      </div>
    </div>
    <div class="stats-content" id="stats-content"></div>
  </div>
```

- [ ] **Step 2: Bump the recent-sessions preview to 6, rename it, add "Ver todas"**

Find (in `index.html`, ~line 2087-2100):
```js
  <div class="stat-section">
    <div class="stat-section-title">Últimas sesiones</div>
    <div class="recent-list">
      ${[...log].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(s=>{
        const valid=s.exercises.filter(e=>e.exId);
        const grps=[...new Set(valid.map(e=>{const ex=EXERCISES.find(x=>x.id===e.exId);return ex?GROUPS.find(g=>g.id===GROUP_MERGE[ex.category])?.label:null;}).filter(Boolean))];
        const sets=s.exercises.reduce((a,e)=>a+e.sets.length,0);
        return`<div class="recent-row">
          <div><div class="recent-date">${s.date}</div><div class="recent-meta">${valid.length} ejercicios · ${sets} series</div></div>
          <div class="recent-groups">${grps.map(g=>`<span class="recent-tag">${g}</span>`).join('')}</div>
        </div>`;
      }).join('')}
    </div>
  </div>
```

Replace with:
```js
  <div class="stat-section">
    <div class="stat-section-title" style="display:flex;justify-content:space-between;align-items:center">
      <span>Sesiones recientes</span>
      <button class="btn-ghost" onclick="openHistory()" style="font-size:12px;padding:4px 8px">Ver todas →</button>
    </div>
    <div class="recent-list">
      ${[...log].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(s=>{
        const valid=s.exercises.filter(e=>e.exId);
        const grps=[...new Set(valid.map(e=>{const ex=EXERCISES.find(x=>x.id===e.exId);return ex?GROUPS.find(g=>g.id===GROUP_MERGE[ex.category])?.label:null;}).filter(Boolean))];
        const sets=s.exercises.reduce((a,e)=>a+e.sets.length,0);
        return`<div class="recent-row">
          <div><div class="recent-date">${s.date}</div><div class="recent-meta">${valid.length} ejercicios · ${sets} series</div></div>
          <div class="recent-groups">${grps.map(g=>`<span class="recent-tag">${g}</span>`).join('')}</div>
        </div>`;
      }).join('')}
    </div>
  </div>
```

(Only the section title's markup, the "Ver todas" button, and `.slice(0,5)`→`.slice(0,6)` change. The `.map(...)` body that builds each `.recent-row` is byte-identical — still no `onclick`, no swipe, read-only exactly as before.)

- [ ] **Step 3: Verify in the browser**

Using the same served instance, with the two sessions seeded in Task 2 Step 6 still in `log` (or re-seed if needed):

1. Navigate to Stats. Confirm the header now has a 🕓 icon next to "Estadísticas".
2. Confirm the "Sesiones recientes" section shows up to 6 sessions, most recent first, with no buttons or swipe on the rows (still read-only).
3. Tap the 🕓 header icon — confirm it opens the Historial overlay (via `openHistory()`), showing the same sessions with full ✏️/🗑️/swipe functionality.
4. Tap "←" to close it, back on Stats. Tap "Ver todas →" next to "Sesiones recientes" — confirm it also opens the same Historial overlay.
5. Seed a 7th session, confirm the Stats preview still caps at 6 while Historial shows all 7.
6. Clean up test data: `localStorage.removeItem('hierro_log_v3')` (or the actual `STORAGE_KEY` value) if it wasn't real user data.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Link Stats' recent-sessions preview to the new Historial overlay

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Final end-to-end verification

**Files:**
- None modified — verification only.

**Interfaces:**
- Consumes: everything from Tasks 1-3, exercised together in one continuous browser session.

- [ ] **Step 1: Run through the spec's full testing checklist in one session**

Using a fresh served instance (fixture `EXERCISES` re-injected if needed per Task 1 Step 6's script):

1. Open the app — confirm the first visible tab (previously "Log") now says "Inicio" in the bottom-nav, with a house icon, and shows the week strip + Rutinas row (Plantillas/+ Rutina) + routines list + notices — no trace of session cards.
2. Confirm the bottom-nav has 4 buttons (Inicio, Empezar, Stats, Guía) — no "Rutinas".
3. Create/edit a routine from Inicio, tap "←" — confirm it returns to Inicio without errors (`cancelRoutineEdit()` → `showLog()`).
4. Tap "Plantillas" and "+ Rutina" from the new row — confirm both open their usual flows.
5. With 2+ routines saved, export and share a routine — confirm the picker shows inside Inicio and returns to Inicio when done.
6. Go to Stats — confirm the "Sesiones recientes" section (up to 6, non-interactive, no swipe) and the 🕓 icon in the header.
7. Tap "Ver todas →" and the header icon — both open the same Historial overlay, all sessions, most recent first, with swipe-to-delete and ✏️/🗑️ working exactly like the old Log screen.
8. Delete a session from Historial — confirm it's also gone from the Stats preview afterward.
9. Restore a backup containing sessions and routines — confirm both the week strip (Inicio) and Historial (if opened afterward) reflect the restored data.
10. Finish a guided workout, then separately discard one — confirm both paths still return to Inicio without errors.

- [ ] **Step 2: Clean up any test data**

```js
localStorage.removeItem('hierro_log_v3');    // STORAGE_KEY, index.html:505
localStorage.removeItem('hierro_routines');  // ROUTINES_KEY, index.html:513
localStorage.removeItem('hierro_week');      // WEEK_KEY, index.html:514
```

Only run this if real user data wasn't already present before testing started — if in doubt, inspect `localStorage` contents before clearing anything.
