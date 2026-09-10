# Swipe to Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the explicit 🗑️/✕ delete buttons in HIERRO's 4 borrable lists (Log sessions, Routines list, guided-workout sets, routine-editor exercises) with a swipe-to-reveal-and-confirm gesture on touch devices, while keeping the explicit button on desktop.

**Architecture:** One generic delegated touch-event handler (`initSwipeDelete(container)`) attached once per container at `init()` — never re-attached on re-render, since it delegates from a container that itself never gets destroyed. Each borrable row gets wrapped in a `.swipe-row > .swipe-bg + .swipe-content` structure carrying `data-delete-fn`/`data-delete-arg` attributes that tell the generic handler which existing delete function to call; the row's existing inner HTML is untouched. `removeWorkoutSet`/`removeRoutineExercise` gain a `confirm()` call (they don't have one today) so all 4 delete paths are consistent — the swipe handler never shows its own confirmation, it just calls the real delete function, which already confirms (or now will).

**Tech Stack:** HTML/CSS/vanilla JS, single-file (`index.html`), no build step, no new dependencies (hand-rolled Touch Events, no library).

**Spec:** `docs/superpowers/specs/2026-09-10-swipe-to-delete-design.md`

## Global Constraints

- Desktop (no touch) keeps the existing 🗑️/✕ buttons, unchanged — swipe is additive on touch devices only, detected via `@media (hover: none)` CSS, no JS branching.
- Swipe gesture: horizontal drag past a 60px threshold (max visual travel 88px) triggers the row's delete function; below threshold, or a vertical drag, the row snaps back and nothing happens. Vertical drags must not block the list's normal scroll.
- The 4 containers to delegate from are `#log-content`, `#routines-list`, `#wk-body` (**not** `#wk-sets` — `#wk-sets` is recreated on every `renderWorkoutScreen()` call, `#wk-body` is the actual static ancestor), and `#routine-exercises-container`.
- No test runner exists in this repo. "Testing" a step means: serve the folder locally (`python -m http.server 8099` from `C:\Code\hierro-pwa`, open `http://localhost:8099/index.html`), and manually verify via the browser. This feature specifically needs a **mobile-viewport emulated browser session** (touch events are synthetic in that mode) — a plain desktop browser tab cannot exercise the swipe gesture at all.
- The exercises dataset fetch (`raw.githubusercontent.com`) may be rate-limited/unavailable in some environments — if a plain page load shows "No se pudo cargar la biblioteca.", work around it by injecting a fixture `EXERCISES` array and manually finishing init in the browser console (documented in each task's Step where relevant).
- `weight`/`reps`/`si` etc. field names are unrelated to this feature — not referenced here.

---

### Task 1: Swipe CSS + generic handler + Log sessions

**Files:**
- Modify: `index.html` (CSS: after `.card-ex-sets` rule ~line 69; JS: `renderLog` ~line 764, new `initSwipeDelete` function, `init()` ~line 667)

**Interfaces:**
- Produces: `initSwipeDelete(container)` — global function, takes a DOM element, wires up delegated `touchstart`/`touchmove`/`touchend` listeners on it. Any `.swipe-row` element found via `event.target.closest('.swipe-row')` inside that container is draggable; on threshold-crossing release, calls `window[row.dataset.deleteFn](arg)` where `arg` is `row.dataset.deleteArg`, coerced to `Number` if it's all-digits, else left as a string.
- Produces CSS classes: `.swipe-row`, `.swipe-row.swipe-row-tight` (smaller radius/margin variant for rows with no card styling of their own, used by Task 3), `.swipe-bg`, `.swipe-bg-icon`, `.swipe-content`.
- Consumes (this task): `deleteSession(id)` (already exists, already has `confirm()`, unchanged).

- [ ] **Step 1: Add the swipe CSS**

Find (in `index.html`, ~line 69):
```css
.card-ex-row{margin-bottom:2px}
.card-ex-name{color:#99A;font-size:13px;font-weight:600}
.card-ex-sets{color:#9195A3;font-size:12px;margin-left:5px}

/* ── MUSCLE TAG ── */
```

Replace with:
```css
.card-ex-row{margin-bottom:2px}
.card-ex-name{color:#99A;font-size:13px;font-weight:600}
.card-ex-sets{color:#9195A3;font-size:12px;margin-left:5px}

/* ── SWIPE TO DELETE ── */
.swipe-row{position:relative;overflow:hidden;border-radius:11px;margin-bottom:9px}
.swipe-row.swipe-row-tight{border-radius:8px;margin-bottom:5px}
.swipe-row .session-card,.swipe-row .ex-block,.swipe-row .set-row{margin-bottom:0}
.swipe-bg{position:absolute;inset:0;background:#c0392b;display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:0 20px;color:#fff;font-weight:700;opacity:0}
.swipe-bg-icon{font-size:16px}
.swipe-content{position:relative;background:#0F1117}
@media (hover: none){
  .swipe-row .card-actions,
  .swipe-row .btn-rm-set,
  .swipe-row .btn-remove-ex{display:none}
}

/* ── MUSCLE TAG ── */
```

- [ ] **Step 2: Add the generic `initSwipeDelete` handler**

Find (in `index.html`, immediately before `async function init() {`):
```js
// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
```

Replace with:
```js
// ── SWIPE TO DELETE ───────────────────────────────────────────────────────────
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

// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
```

- [ ] **Step 3: Wrap the Log session row in `.swipe-row`**

Find (in `index.html`, inside `renderLog`, ~line 764):
```js
    return`<div class="session-card">
      <div class="card-top">
        <div><div class="card-date">${s.date}</div><div class="card-meta">${valid.length} ejercicio${valid.length!==1?'s':''} · ${total} serie${total!==1?'s':''}</div></div>
        <div class="card-actions"><button onclick="editSessionFn('${s.id}')">✏️</button><button onclick="deleteSession('${s.id}')">🗑️</button></div>
      </div>
      <div>${grpLabels.map(l=>`<span class="group-tag">${l}</span>`).join('')}</div>
      <div>${valid.map(e=>{const ex=EXERCISES.find(x=>x.id===e.exId);if(!ex)return'';const isCardio=!!e.cardioDuration;const ss=e.sets.map(st=>isCardio?`${st.reps||'—'} min`:`${st.weight||'—'}kg×${st.reps||'—'}`).join(' ');return`<div class="card-ex-row"><span class="card-ex-name">${esName(ex)}</span><span class="card-ex-sets">${ss}</span></div>`;}).join('')}</div>
    </div>`;
```

Replace with:
```js
    return`<div class="swipe-row" data-delete-fn="deleteSession" data-delete-arg="${s.id}">
      <div class="swipe-bg"><span class="swipe-bg-icon">🗑️</span><span>Borrar</span></div>
      <div class="swipe-content session-card">
      <div class="card-top">
        <div><div class="card-date">${s.date}</div><div class="card-meta">${valid.length} ejercicio${valid.length!==1?'s':''} · ${total} serie${total!==1?'s':''}</div></div>
        <div class="card-actions"><button onclick="editSessionFn('${s.id}')">✏️</button><button onclick="deleteSession('${s.id}')">🗑️</button></div>
      </div>
      <div>${grpLabels.map(l=>`<span class="group-tag">${l}</span>`).join('')}</div>
      <div>${valid.map(e=>{const ex=EXERCISES.find(x=>x.id===e.exId);if(!ex)return'';const isCardio=!!e.cardioDuration;const ss=e.sets.map(st=>isCardio?`${st.reps||'—'} min`:`${st.weight||'—'}kg×${st.reps||'—'}`).join(' ');return`<div class="card-ex-row"><span class="card-ex-name">${esName(ex)}</span><span class="card-ex-sets">${ss}</span></div>`;}).join('')}</div>
      </div>
    </div>`;
```

- [ ] **Step 4: Call `initSwipeDelete` for the Log container**

Find (in `index.html`, inside `init()`, ~line 667):
```js
  renderLog();
  renderNotices();
```

Replace with:
```js
  renderLog();
  initSwipeDelete(document.getElementById('log-content'));
  renderNotices();
```

- [ ] **Step 5: Verify in the browser**

Serve the folder and open a **mobile-viewport emulated** browser session (touch events must be synthetic-capable). If the exercises dataset fails to load, inject a minimal fixture and finish init manually in the console:
```js
EXERCISES=[{id:'0025',name:'x',category:'chest',target:'pectorals',secondary_muscles:[],equipment:'barbell',image:'i.jpg',gif_url:'v.gif',instructions:{es:'x'},instruction_steps:{es:['1']}}];
document.getElementById('loader').style.display='none';
document.getElementById('app').style.display='block';
log=[{id:'s1',date:'2026-09-08',routineId:null,routineName:null,exercises:[]},{id:'s2',date:'2026-09-07',routineId:null,routineName:null,exercises:[]}];
renderLog(); initSwipeDelete(document.getElementById('log-content'));
```

1. Confirm both session cards render with the 🗑️/✏️ buttons visible (this is still a non-touch-emulated check of the underlying HTML — the CSS hiding only applies under `hover:none`, verify separately in step 8 below).
2. Emulate a mobile viewport (touch-capable) and reload/re-run the fixture. Confirm the 🗑️/✏️ button row is now hidden (CSS `@media (hover:none)`).
3. Swipe one row left, short (under the 60px threshold) — release and confirm it snaps back, no confirm dialog, `log` unchanged.
4. Swipe the same row left, far enough (past threshold) — confirm a browser `confirm()` dialog appears ("¿Eliminar esta sesión?"). Cancel it — confirm the row snaps back and `log` is unchanged.
5. Repeat the full swipe and accept the confirm — confirm that exact session is removed from `log` (check via `JSON.stringify(log)`) and the other one remains.
6. With 2+ sessions, scroll the list vertically (a vertical drag) — confirm it scrolls normally and does not trigger any swipe/delete behavior.
7. Clean up: `localStorage.removeItem('hierro_log_v3')` if any real data was saved during testing.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add swipe-to-delete: CSS, generic handler, and Log sessions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Wire up the Routines list

**Files:**
- Modify: `index.html` (JS: `renderRoutinesList` ~line 1421, `init()`)

**Interfaces:**
- Consumes: `initSwipeDelete` (Task 1), `.swipe-row`/`.swipe-bg`/`.swipe-content` CSS (Task 1), `deleteRoutine(id)` (already exists, already has `confirm()`, unchanged).
- Produces: nothing new for later tasks — this list's swipe wiring is independent of Tasks 3-4.

- [ ] **Step 1: Wrap the routine row in `.swipe-row`, only in normal (non-picker) mode**

This is one atomic change — find and replace the entire `el.innerHTML=hint+routines.map(...)` block in a single edit (the closing tags shift too, and a separate later find/replace for just the closing `</div>` would be ambiguous once Task 1 gives `renderLog`'s row an identical-looking closing pattern).

Find (in `index.html`, the whole body of `renderRoutinesList` from `el.innerHTML=hint+routines.map` through the matching `}).join('');`, ~line 1426-1440):
```js
  el.innerHTML=hint+routines.map(r=>{
    const tapFn=routinePickMode==='export'?`exportRoutine('${r.id}')`
      :routinePickMode==='share'?`shareRoutine('${r.id}')`
      :`newSessionFromRoutine(routines.find(x=>x.id==='${r.id}'))`;
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
```

Replace with:
```js
  el.innerHTML=hint+routines.map(r=>{
    const tapFn=routinePickMode==='export'?`exportRoutine('${r.id}')`
      :routinePickMode==='share'?`shareRoutine('${r.id}')`
      :`newSessionFromRoutine(routines.find(x=>x.id==='${r.id}'))`;
    const actions=routinePickMode?'':`<div class="card-actions"><button onclick="event.stopPropagation();editRoutineFn('${r.id}')">✏️</button><button onclick="event.stopPropagation();deleteRoutine('${r.id}')">🗑️</button></div>`;
    const rowOpen = routinePickMode ? '<div>' : `<div class="swipe-row" data-delete-fn="deleteRoutine" data-delete-arg="${r.id}"><div class="swipe-bg"><span class="swipe-bg-icon">🗑️</span><span>Borrar</span></div><div class="swipe-content session-card">`;
    const rowClose = routinePickMode ? '</div>' : '</div></div>';
    return `${rowOpen}
      <div class="card-top">
        <div onclick="${tapFn}" style="cursor:pointer;flex:1">
          <div class="card-date">${r.name}</div>
          <div class="card-meta">${r.exercises.length} ejercicio${r.exercises.length!==1?'s':''}</div>
        </div>
        ${actions}
      </div>
    ${rowClose}`;
  }).join('');
```

- [ ] **Step 2: Call `initSwipeDelete` for the Routines container**

Find (in `index.html`, inside `init()`, right after the line added in Task 1 Step 4):
```js
  renderLog();
  initSwipeDelete(document.getElementById('log-content'));
  renderNotices();
```

Replace with:
```js
  renderLog();
  initSwipeDelete(document.getElementById('log-content'));
  initSwipeDelete(document.getElementById('routines-list'));
  renderNotices();
```

- [ ] **Step 3: Verify in the browser**

Using the same served instance (mobile-viewport emulated), with the fixture from Task 1 still loaded:

1. Seed `routines=[{id:'r1',name:'Push Day',exercises:[{exId:'0025',cat:'chest',sets:3,reps:'8'}]},{id:'r2',name:'Pull Day',exercises:[]}]; renderRoutinesList();` (call this from the Routines view/tab, i.e. after `showRoutines()`).
2. Confirm the routine cards render with the 🗑️/✏️ buttons, hidden under touch emulation, same as Task 1's checks.
3. Swipe a routine card past the threshold, accept the confirm — confirm that routine is removed from `routines` and the other remains.
4. Now trigger the export picker (`routinePickMode='export'; renderRoutinesList();`) and confirm the cards render WITHOUT any swipe behavior (swiping them left does nothing — no `.swipe-row` class present in that mode) and tapping a card still calls `exportRoutine` as before.
5. Reset `routinePickMode=null;` and clean up: `localStorage.removeItem('hierro_routines');`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Wire up swipe-to-delete for the Routines list

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Wire up guided-workout sets (and add their missing confirm())

**Files:**
- Modify: `index.html` (JS: `removeWorkoutSet` ~line 1154, `buildWorkoutSetRow` ~line 1025, `init()`)

**Interfaces:**
- Consumes: `initSwipeDelete` (Task 1), `.swipe-row`/`.swipe-row-tight`/`.swipe-bg`/`.swipe-content` CSS (Task 1).
- Produces: `removeWorkoutSet(si)` now shows a `confirm()` before removing — this changes the *existing* desktop ✕ button's behavior too (both paths call the same function), which is intentional per the spec.

- [ ] **Step 1: Add `confirm()` to `removeWorkoutSet`**

Find (in `index.html`, ~line 1154):
```js
function removeWorkoutSet(si){
  const entry=activeWorkout.entries[activeWorkout.cur];
  if(entry.sets.length<=1)return;
  entry.sets.splice(si,1);
  renderWorkoutScreen();
}
```

Replace with:
```js
function removeWorkoutSet(si){
  const entry=activeWorkout.entries[activeWorkout.cur];
  if(entry.sets.length<=1)return;
  if(!confirm('¿Eliminar esta serie?'))return;
  entry.sets.splice(si,1);
  renderWorkoutScreen();
}
```

- [ ] **Step 2: Wrap the set row in `.swipe-row.swipe-row-tight`**

Find (in `index.html`, inside `buildWorkoutSetRow`, ~line 1033):
```js
  return `<div class="set-row">
      <span class="set-dot">●</span>
      ${weightBlock}
      <div class="set-iw stp-wrap">
        <button type="button" class="stp-btn" onclick="bumpWorkoutSet(${si},'reps',-1)">−</button>
        <input type="number" inputmode="numeric" placeholder="${isCardio?'0':(entry.targetReps||'0')}" value="${s.reps}" onchange="updateWorkoutSet(${si},'reps',this.value)">
        <button type="button" class="stp-btn" onclick="bumpWorkoutSet(${si},'reps',1)">+</button>
      </div>
      <button class="btn-rm-set" onclick="removeWorkoutSet(${si})" ${disabled?'disabled style="opacity:0.2"':''}>✕</button>
      <input type="checkbox" class="set-done" ${s.done?'checked':''} onchange="toggleWorkoutSet(${si})">
    </div>`;
}
```

Replace with:
```js
  return `<div class="swipe-row swipe-row-tight" data-delete-fn="removeWorkoutSet" data-delete-arg="${si}" data-swipe-disabled="${disabled}">
    <div class="swipe-bg"><span class="swipe-bg-icon">🗑️</span><span>Borrar</span></div>
    <div class="swipe-content set-row">
      <span class="set-dot">●</span>
      ${weightBlock}
      <div class="set-iw stp-wrap">
        <button type="button" class="stp-btn" onclick="bumpWorkoutSet(${si},'reps',-1)">−</button>
        <input type="number" inputmode="numeric" placeholder="${isCardio?'0':(entry.targetReps||'0')}" value="${s.reps}" onchange="updateWorkoutSet(${si},'reps',this.value)">
        <button type="button" class="stp-btn" onclick="bumpWorkoutSet(${si},'reps',1)">+</button>
      </div>
      <button class="btn-rm-set" onclick="removeWorkoutSet(${si})" ${disabled?'disabled style="opacity:0.2"':''}>✕</button>
      <input type="checkbox" class="set-done" ${s.done?'checked':''} onchange="toggleWorkoutSet(${si})">
    </div>
  </div>`;
}
```

- [ ] **Step 3: Call `initSwipeDelete` on `#wk-body` (not `#wk-sets`)**

Find (in `index.html`, inside `init()`):
```js
  renderLog();
  initSwipeDelete(document.getElementById('log-content'));
  initSwipeDelete(document.getElementById('routines-list'));
  renderNotices();
```

Replace with:
```js
  renderLog();
  initSwipeDelete(document.getElementById('log-content'));
  initSwipeDelete(document.getElementById('routines-list'));
  initSwipeDelete(document.getElementById('wk-body'));
  renderNotices();
```

- [ ] **Step 4: Verify in the browser**

Using the same served instance, with the Task 1 fixture (`EXERCISES` with at least `'0025'`) still loaded:

1. Start a freestyle workout, add exercise `0025`, add a 2nd set (`+ Serie`) so there are 2 sets (`si` 0 and 1).
2. Confirm the ✕ button is hidden under touch emulation, and the row's swipe reveal is smaller/tighter than the card-based rows (visually — `.swipe-row-tight`'s 8px radius vs. 11px).
3. Swipe one set row past the threshold — confirm a browser `confirm()` appears ("¿Eliminar esta serie?"), cancel it, confirm nothing changed.
4. Repeat, accept the confirm — confirm exactly that set is removed from `activeWorkout.entries[activeWorkout.cur].sets` and the other remains.
5. Now with only 1 set left: confirm `data-swipe-disabled` is `"true"` on that row (inspect the DOM), and swiping it does nothing at all (no drag, no confirm) — matching the disabled ✕ button's behavior.
6. On **desktop** (non-touch-emulated), tap the ✕ button directly on a 2-set exercise — confirm it now also shows the `confirm()` dialog before removing (this is the intended change to the existing button path).
7. Discard the workout (`discardWorkout()`) to clean up.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Wire up swipe-to-delete for guided-workout sets, add missing confirm()

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire up routine-editor exercises (and add their missing confirm())

**Files:**
- Modify: `index.html` (JS: `removeRoutineExercise` ~line 1509, `buildRoutineExBlock` ~line 1467, `init()`)

**Interfaces:**
- Consumes: `initSwipeDelete` (Task 1), `.swipe-row`/`.swipe-bg`/`.swipe-content` CSS (Task 1).
- Produces: `removeRoutineExercise(id)` now shows a `confirm()` before removing — same intentional change to the existing ✕ button's behavior as Task 3.

- [ ] **Step 1: Add `confirm()` to `removeRoutineExercise`**

Find (in `index.html`, ~line 1509):
```js
function removeRoutineExercise(id){if(editRoutine.exercises.length<=1)return;editRoutine.exercises=editRoutine.exercises.filter(e=>e.id!==id);renderRoutineExercises();}
```

Replace with:
```js
function removeRoutineExercise(id){
  if(editRoutine.exercises.length<=1)return;
  if(!confirm('¿Quitar este ejercicio de la rutina?'))return;
  editRoutine.exercises=editRoutine.exercises.filter(e=>e.id!==id);
  renderRoutineExercises();
}
```

- [ ] **Step 2: Wrap the exercise block in `.swipe-row`**

Find (in `index.html`, inside `buildRoutineExBlock`, ~line 1467):
```js
function buildRoutineExBlock(ex, hasNext){
  const canRm=editRoutine.exercises.length>1;
  const exData=EXERCISES.find(e=>e.id===ex.exId);
  const groupOpts=GROUPS.map(g=>`<option value="${g.id}"${ex.cat===g.id?' selected':''}>${g.label}</option>`).join('');
  return`<div class="ex-block" id="rexblock-${ex.id}">
```

Replace with:
```js
function buildRoutineExBlock(ex, hasNext){
  const canRm=editRoutine.exercises.length>1;
  const exData=EXERCISES.find(e=>e.id===ex.exId);
  const groupOpts=GROUPS.map(g=>`<option value="${g.id}"${ex.cat===g.id?' selected':''}>${g.label}</option>`).join('');
  return`<div class="swipe-row" data-delete-fn="removeRoutineExercise" data-delete-arg="${ex.id}" data-swipe-disabled="${!canRm}">
    <div class="swipe-bg"><span class="swipe-bg-icon">🗑️</span><span>Borrar</span></div>
    <div class="swipe-content ex-block" id="rexblock-${ex.id}">
```

Find the closing tag at the end of the same function:
```js
    ${showCardioToggle(exData)?`<label class="effort-row" style="cursor:pointer">
      <span class="field-label" style="margin:0">Registrar como duración</span>
      <input type="checkbox" ${ex.cardioDuration?'checked':''} onchange="updateRoutineCardioDuration('${ex.id}', this.checked)">
    </label>`:''}
  </div>`;
}
```

Replace with:
```js
    ${showCardioToggle(exData)?`<label class="effort-row" style="cursor:pointer">
      <span class="field-label" style="margin:0">Registrar como duración</span>
      <input type="checkbox" ${ex.cardioDuration?'checked':''} onchange="updateRoutineCardioDuration('${ex.id}', this.checked)">
    </label>`:''}
    </div>
  </div>`;
}
```

- [ ] **Step 3: Call `initSwipeDelete` on the routine-exercises container**

Find (in `index.html`, inside `init()`):
```js
  renderLog();
  initSwipeDelete(document.getElementById('log-content'));
  initSwipeDelete(document.getElementById('routines-list'));
  initSwipeDelete(document.getElementById('wk-body'));
  renderNotices();
```

Replace with:
```js
  renderLog();
  initSwipeDelete(document.getElementById('log-content'));
  initSwipeDelete(document.getElementById('routines-list'));
  initSwipeDelete(document.getElementById('wk-body'));
  initSwipeDelete(document.getElementById('routine-exercises-container'));
  renderNotices();
```

- [ ] **Step 4: Verify in the browser**

Using the same served instance:

1. Open the routine editor (`newRoutine(null)` or edit an existing routine), add a 2nd exercise (`+ Ejercicio`) so there are 2 `.ex-block`s.
2. Confirm the ✕ button is hidden under touch emulation.
3. Swipe one exercise block past the threshold — confirm the `confirm()` dialog appears ("¿Quitar este ejercicio de la rutina?"), cancel, confirm nothing changed.
4. Repeat, accept — confirm that exact exercise is removed from `editRoutine.exercises` and the other remains, and that a **tap** on the block's `<select>`/exercise-picker button/checkboxes (no significant drag) still works normally and does not trigger a swipe.
5. With only 1 exercise left: confirm `data-swipe-disabled="true"` and swiping does nothing, matching the disabled ✕ button.
6. On desktop, tap the ✕ button directly on a routine with 2+ exercises — confirm it now shows the `confirm()` dialog too.
7. Cancel out of the routine editor to avoid leaving test data (`cancelRoutineEdit()`), and clean up: `localStorage.removeItem('hierro_routines');`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Wire up swipe-to-delete for routine-editor exercises, add missing confirm()

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Final end-to-end verification and backlog update

**Files:**
- Modify: `docs/BACKLOG.md` (mark "swipe para borrar" done)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — verification + bookkeeping only.

- [ ] **Step 1: Full cross-list smoke test in a fresh mobile-emulated session**

Using the same served instance (or a fresh reload with the Task 1 fixture reapplied):

1. Log: swipe-delete a session, confirm it's gone, confirm the other stays.
2. Routines: swipe-delete a routine, confirm it's gone; confirm export/share picker mode still has no swipe behavior.
3. Guided workout: swipe-delete a set (2+ sets present), confirm the disabled (last-set) case still blocks the swipe.
4. Routine editor: swipe-delete an exercise (2+ present), confirm the disabled (last-exercise) case still blocks the swipe, confirm tapping inputs/selects inside a block still works.
5. In each of the 4, do a vertical scroll of the list and confirm it scrolls normally without triggering delete.

- [ ] **Step 2: Desktop regression check**

Reset the viewport to desktop (non-touch-emulated) and confirm, in each of the 4 lists, that the 🗑️/✕ buttons are visible and functional exactly as before this plan — including the two that now confirm (`removeWorkoutSet`, `removeRoutineExercise`).

- [ ] **Step 3: Update the backlog**

Find in `docs/BACKLOG.md`:
```
- **Swipe para borrar**: reemplazar los botones de borrar explícitos (sets, ejercicios, rutinas, sesiones del Log) por un gesto de swipe, aplicado consistentemente en toda la app. Surgió charlando D1 (RPE), es un cambio de patrón de interacción transversal, no parte de D.
```

Replace with:
```
- [x] **Swipe para borrar** — hecho (2026-09-10, gesto táctil con reveal progresivo + confirm() al completar el swipe en las 4 listas; en desktop se mantiene el botón explícito vía `@media (hover:none)`).
```

Also update the "Última actualización" line at the bottom of that file to reference this change, following the file's existing style (look at how the current line reads before editing it).

- [ ] **Step 4: Commit and push**

```bash
git add docs/BACKLOG.md
git commit -m "$(cat <<'EOF'
Mark "swipe para borrar" backlog idea as done

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push
```
