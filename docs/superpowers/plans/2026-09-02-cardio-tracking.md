# Cardio Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cardio exercises (treadmill, bike, rower, etc — `GROUP_MERGE[ex.category]==='cardio'`) render sensibly in the guided workout screen (duration instead of weight/reps), and stop B (auto progression) and C (1RM/progression chart) from operating on them, since both assume a weight/reps set shape that doesn't apply to cardio.

**Architecture:** No new data fields. A cardio set keeps the existing `{weight, reps}` shape — `weight` stays unused (always `''`), `reps` is reinterpreted as duration in minutes. Cardio is detected on the fly wherever the current exercise is already resolved (`EXERCISES.find(...)`), via `GROUP_MERGE[ex.category]==='cardio'` — same pattern as `isBodyweight` (D2) and `isCardio` needs no storage, no migration.

**Tech Stack:** HTML/CSS/vanilla JS, single-file (`index.html`), no build step.

**Spec:** `docs/superpowers/specs/2026-09-02-cardio-tracking-design.md`

## Global Constraints

- No new fields on a set or an exercise entry — `weight`/`reps` keep their existing meaning at the storage level; only the UI and B/C reinterpret `reps` as minutes for cardio.
- Distance is explicitly out of scope (spec — only duration).
- A cardio-specific progression metric (e.g. total duration per session) is explicitly out of scope (spec) — C just shows a message for cardio, no new chart.
- No test runner exists in this repo. "Testing" a step means: serve the folder locally (`python -m http.server 8099` from `C:\Code\hierro-pwa`, open `http://localhost:8099/index.html`), and manually verify via the browser (or the `mcp__Claude_Browser__*` tools if working in an agentic session with browser access).
- `weight` and `reps` here refer to `activeWorkout.entries[i].sets[j].weight` / `.reps` (in-session) and the equivalent saved-session shape `log[i].exercises[j].sets[k].weight` / `.reps` — same fields throughout, unchanged.

---

### Task 1: Detect cardio and adjust the guided workout screen's set row + header

**Files:**
- Modify: `index.html` (JS: `buildWorkoutSetRow` ~line 843, `renderWorkoutScreen` ~line 909)

**Interfaces:**
- Consumes: `EXERCISES` (global array, each item has `.category`), `GROUP_MERGE` (global object mapping dataset category → merged group id, `GROUP_MERGE[ex.category]==='cardio'` for cardio), `entry.exId`, `entry.perSide` (D3), `entry.sets[si]` (`{weight, reps, done}`).
- Produces: `buildWorkoutSetRow(entry, si, isBodyweight, isCardio)` — new 4th parameter. When `isCardio` is true, the returned HTML omits the weight `.set-iw.stp-wrap` block entirely (no weight input, no −/+ buttons for it) and keeps only the second `.set-iw.stp-wrap` block (still calling `bumpWorkoutSet(si,'reps',...)`/`updateWorkoutSet(si,'reps',...)` — same field, `reps`, now meaning minutes).

- [ ] **Step 1: Update `buildWorkoutSetRow` to accept and use `isCardio`**

Find (in `index.html`, ~line 843):
```js
function buildWorkoutSetRow(entry, si, isBodyweight){
  const s=entry.sets[si];
  const disabled = entry.sets.length<=1;
  return `<div class="set-row">
      <span class="set-dot">●</span>
      <div class="set-iw stp-wrap">
        <button type="button" class="stp-btn" onclick="bumpWorkoutSet(${si},'weight',-2.5)">−</button>
        <input type="number" inputmode="decimal" placeholder="${isBodyweight?'Corporal':'0'}" value="${s.weight}" onchange="updateWorkoutSet(${si},'weight',this.value)">
        <button type="button" class="stp-btn" onclick="bumpWorkoutSet(${si},'weight',2.5)">+</button>
      </div>
      <div class="set-iw stp-wrap">
        <button type="button" class="stp-btn" onclick="bumpWorkoutSet(${si},'reps',-1)">−</button>
        <input type="number" inputmode="numeric" placeholder="${entry.targetReps||'0'}" value="${s.reps}" onchange="updateWorkoutSet(${si},'reps',this.value)">
        <button type="button" class="stp-btn" onclick="bumpWorkoutSet(${si},'reps',1)">+</button>
      </div>
      <button class="btn-rm-set" onclick="removeWorkoutSet(${si})" ${disabled?'disabled style="opacity:0.2"':''}>✕</button>
      <input type="checkbox" class="set-done" ${s.done?'checked':''} onchange="toggleWorkoutSet(${si})">
    </div>`;
}
```

Replace with:
```js
function buildWorkoutSetRow(entry, si, isBodyweight, isCardio){
  const s=entry.sets[si];
  const disabled = entry.sets.length<=1;
  const weightBlock = isCardio ? '' : `<div class="set-iw stp-wrap">
        <button type="button" class="stp-btn" onclick="bumpWorkoutSet(${si},'weight',-2.5)">−</button>
        <input type="number" inputmode="decimal" placeholder="${isBodyweight?'Corporal':'0'}" value="${s.weight}" onchange="updateWorkoutSet(${si},'weight',this.value)">
        <button type="button" class="stp-btn" onclick="bumpWorkoutSet(${si},'weight',2.5)">+</button>
      </div>`;
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

- [ ] **Step 2: Compute `isCardio` and pass it through in `renderWorkoutScreen`**

Find (in `index.html`, ~line 921-935):
```js
    const entry=A.entries[A.cur];
    const ex=EXERCISES.find(e=>e.id===entry.exId);
    const isBodyweight = ex?.equipment==='body weight';
    body.innerHTML=`
      ${ex?`<img class="wk-ex-img" src="${RAW+ex.image}" loading="lazy" onerror="this.style.display='none'">`:''}
      <div class="wk-ex-name">${ex?esName(ex):'—'}</div>
      <div style="text-align:center;margin-bottom:4px">
        ${isBodyweight?'<span class="mtag">Peso corporal</span>':''}
        <span class="mtag" style="cursor:pointer;${entry.perSide?'':'opacity:0.45'}" onclick="togglePerSide()">Por lado</span>
        ${A.cur<A.entries.length-1?`<span class="mtag" style="cursor:pointer;${entry.linkedToNext?'':'opacity:0.45'}" onclick="toggleLinkedToNext()">Superset con el siguiente</span>`:''}
      </div>
      <div class="wk-ex-last">${lastTimeSummary(entry.exId)}</div>
      <div class="sets-hdr"><span style="width:14px;flex-shrink:0"></span><span>${isBodyweight?'Peso extra':'Peso'}</span><span>${entry.perSide?'Reps (c/lado)':'Reps'}</span><span class="col-x"></span><span style="width:24px;flex-shrink:0"></span></div>
      <div id="wk-sets">${entry.sets.map((s,si)=>buildWorkoutSetRow(entry,si,isBodyweight)).join('')}</div>
      <button class="btn-add-set" onclick="addWorkoutSet()">+ Serie</button>
      ${buildEffortRow(entry)}
      <button class="btn-add-set" onclick="removeCurrentWorkoutExercise()" style="border-style:solid;color:#FF6B6B;margin-top:6px">Quitar este ejercicio</button>`;
```

Replace with:
```js
    const entry=A.entries[A.cur];
    const ex=EXERCISES.find(e=>e.id===entry.exId);
    const isBodyweight = ex?.equipment==='body weight';
    const isCardio = ex && GROUP_MERGE[ex.category]==='cardio';
    body.innerHTML=`
      ${ex?`<img class="wk-ex-img" src="${RAW+ex.image}" loading="lazy" onerror="this.style.display='none'">`:''}
      <div class="wk-ex-name">${ex?esName(ex):'—'}</div>
      <div style="text-align:center;margin-bottom:4px">
        ${isBodyweight?'<span class="mtag">Peso corporal</span>':''}
        <span class="mtag" style="cursor:pointer;${entry.perSide?'':'opacity:0.45'}" onclick="togglePerSide()">Por lado</span>
        ${A.cur<A.entries.length-1?`<span class="mtag" style="cursor:pointer;${entry.linkedToNext?'':'opacity:0.45'}" onclick="toggleLinkedToNext()">Superset con el siguiente</span>`:''}
      </div>
      <div class="wk-ex-last">${lastTimeSummary(entry.exId)}</div>
      <div class="sets-hdr"><span style="width:14px;flex-shrink:0"></span>${isCardio?'':'<span>'+(isBodyweight?'Peso extra':'Peso')+'</span>'}<span>${isCardio?'Duración (min)':(entry.perSide?'Reps (c/lado)':'Reps')}</span><span class="col-x"></span><span style="width:24px;flex-shrink:0"></span></div>
      <div id="wk-sets">${entry.sets.map((s,si)=>buildWorkoutSetRow(entry,si,isBodyweight,isCardio)).join('')}</div>
      <button class="btn-add-set" onclick="addWorkoutSet()">+ Serie</button>
      ${buildEffortRow(entry)}
      <button class="btn-add-set" onclick="removeCurrentWorkoutExercise()" style="border-style:solid;color:#FF6B6B;margin-top:6px">Quitar este ejercicio</button>`;
```

- [ ] **Step 3: Verify in the browser**

Serve the folder (`python -m http.server 8099` from `C:\Code\hierro-pwa`, open `http://localhost:8099/index.html`).

1. Open the console and run:
   ```js
   pickStart(null);
   pickWorkoutGroup('cardio');
   const ex = EXERCISES.find(e=>GROUP_MERGE[e.category]==='cardio');
   selectPickerExercise(ex.id);
   ```
2. Confirm the set row shows only **one** input field (no weight/−/+ block at all), and the column header above it reads **"Duración (min)"** with no "Peso" header to its left.
3. Confirm a non-cardio exercise (e.g. `pickWorkoutGroup('waist')` → any exercise) still renders both weight and reps fields exactly as before — no regression.
4. Load a value into the duration field, mark the set done, finish the workout (`finishWorkout()`), and confirm in `log` that the saved exercise has `sets:[{weight:'', reps:'<the value>'}]` (or whatever was typed) — same shape as any other exercise.
5. Clean up: `localStorage.removeItem('hierro_log_v3')` if you created a real log entry while testing.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Hide weight and relabel reps to duration for cardio in the guided screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Stop B (auto progression) from suggesting anything for cardio

**Files:**
- Modify: `index.html` (JS: `suggestSets` ~line 820)

**Interfaces:**
- Consumes: `EXERCISES`, `GROUP_MERGE` (same as Task 1), `log` (global array of saved sessions).
- Produces: `suggestSets(exId)` returns `null` for any cardio exercise, same as it already does when there's no history — no change to its return shape for non-cardio exercises, no change to any caller (`applySuggestedSets` already treats `null` as "don't pre-fill anything").

- [ ] **Step 1: Add an early-return guard for cardio**

Find (in `index.html`, ~line 820):
```js
function suggestSets(exId){
  const sorted=[...log].sort((a,b)=>b.date.localeCompare(a.date));
  const s=sorted.find(x=>x.exercises.some(e=>e.exId===exId));
  if(!s) return null;
```

Replace with:
```js
function suggestSets(exId){
  const ex=EXERCISES.find(e=>e.id===exId);
  if(ex && GROUP_MERGE[ex.category]==='cardio') return null;
  const sorted=[...log].sort((a,b)=>b.date.localeCompare(a.date));
  const s=sorted.find(x=>x.exercises.some(e=>e.exId===exId));
  if(!s) return null;
```

- [ ] **Step 2: Verify in the browser**

Using the same served instance as Task 1:

1. Seed a fake past session for a cardio exercise and confirm no suggestion comes back:
   ```js
   const ex = EXERCISES.find(e=>GROUP_MERGE[e.category]==='cardio');
   log.push({id:'t1', date:'2026-08-01', routineId:null, routineName:null,
     exercises:[{id:'e1', cat:'cardio', exId:ex.id, targetReps:20, sets:[{weight:'',reps:25}]}]});
   JSON.stringify(suggestSets(ex.id)); // must log "null"
   ```
2. Confirm a non-cardio exercise with matching history still returns a suggestion (unchanged behavior) — e.g. re-run the scenario from item B's original verification (a past session with `targetReps:8`, sets reaching `targetReps+4`, should still suggest `weight+2.5`).
3. Clean up: `log.pop()` (or `localStorage.removeItem('hierro_log_v3')` if it was saved) to remove the seeded session.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Skip progression suggestions for cardio exercises

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Replace the 1RM/progression chart with a message for cardio in the Guide

**Files:**
- Modify: `index.html` (JS: `renderGuideDetail` ~line 1608)

**Interfaces:**
- Consumes: `EXERCISES`, `GROUP_MERGE` (same as Tasks 1-2), `exerciseHistory(exId)` (existing, unchanged — returns `[{date, max, volume, oneRM}]`), the existing `.gd-prog-empty` CSS class (already used for the "only one session" case, reused here — no new CSS).
- Produces: for a cardio exercise, `progressionHTML` is always `<div class="gd-section">Progresión</div><div class="gd-prog-empty">Sin datos de progresión para cardio.</div>` regardless of `history.length` — the max/volume/1RM toggle and chart never render for cardio.

- [ ] **Step 1: Branch on cardio before building `progressionHTML`**

Find (in `index.html`, ~line 1617-1629):
```js
  const history=exerciseHistory(ex.id);
  let progressionHTML='';
  if(history.length===1){
    progressionHTML=`<div class="gd-section">Progresión</div><div class="gd-prog-empty">Registrá otra sesión con este ejercicio para ver la progresión.</div>`;
  } else if(history.length>1){
    progressionHTML=`<div class="gd-section">Progresión</div>
      <div class="gd-prog-toggle">
        <button class="gsg-btn${gChartMetric==='max'?' active':''}" onclick="setChartMetric('max')">Peso máx</button>
        <button class="gsg-btn${gChartMetric==='volume'?' active':''}" onclick="setChartMetric('volume')">Volumen</button>
        <button class="gsg-btn${gChartMetric==='oneRM'?' active':''}" onclick="setChartMetric('oneRM')">1RM est.</button>
      </div>
      <div class="gd-prog-chart">${buildProgressionSVG(history,gChartMetric)}</div>`;
  }
```

Replace with:
```js
  const isCardio = GROUP_MERGE[ex.category]==='cardio';
  const history=exerciseHistory(ex.id);
  let progressionHTML='';
  if(isCardio){
    progressionHTML=`<div class="gd-section">Progresión</div><div class="gd-prog-empty">Sin datos de progresión para cardio.</div>`;
  } else if(history.length===1){
    progressionHTML=`<div class="gd-section">Progresión</div><div class="gd-prog-empty">Registrá otra sesión con este ejercicio para ver la progresión.</div>`;
  } else if(history.length>1){
    progressionHTML=`<div class="gd-section">Progresión</div>
      <div class="gd-prog-toggle">
        <button class="gsg-btn${gChartMetric==='max'?' active':''}" onclick="setChartMetric('max')">Peso máx</button>
        <button class="gsg-btn${gChartMetric==='volume'?' active':''}" onclick="setChartMetric('volume')">Volumen</button>
        <button class="gsg-btn${gChartMetric==='oneRM'?' active':''}" onclick="setChartMetric('oneRM')">1RM est.</button>
      </div>
      <div class="gd-prog-chart">${buildProgressionSVG(history,gChartMetric)}</div>`;
  }
```

- [ ] **Step 2: Verify in the browser**

Using the same served instance:

1. Open the Guía tab, select "Cardio" as the muscle group, pick any exercise.
2. Confirm the "Progresión" section shows **"Sin datos de progresión para cardio."** and no Peso máx/Volumen/1RM toggle, even after seeding 2+ fake past sessions for that exercise (reuse the seeding pattern from Task 2's Step 2, adjusted to two sessions with different dates).
3. Select a non-cardio exercise with 2+ real or seeded sessions and confirm the toggle + chart still render exactly as before (no regression to C).
4. Clean up any seeded `log` entries (`localStorage.removeItem('hierro_log_v3')`).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Show a message instead of the progression chart for cardio exercises

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Final review pass and backlog update

**Files:**
- Modify: `docs/BACKLOG.md` (mark D5 done)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this task is verification + bookkeeping only.

- [ ] **Step 1: Re-verify the full cardio flow end to end in the browser**

Using the same served instance:

1. Start a freestyle workout, add a cardio exercise via `+ Agregar ejercicio` → group "Cardio" → pick one.
2. Confirm: no weight field, header says "Duración (min)", no suggestion pre-filled even if you've logged that same cardio exercise before in this test session.
3. Load a duration, mark the set done, finish the workout.
4. Edit that same session back open (`editSessionFn` via the ✏️ on the Log card) and confirm the duration value is still there, still no weight field.
5. Go to the Guide, open that cardio exercise's detail, confirm "Sin datos de progresión para cardio." shows.
6. Add and complete a normal (non-cardio) exercise in the same session to confirm nothing cardio-specific leaked into the weights flow.
7. Clean up: `localStorage.removeItem('hierro_log_v3')`.

- [ ] **Step 2: Update the backlog**

Find in `docs/BACKLOG.md`:
```
  - [ ] D5. Cardio
```

Replace with:
```
  - [x] D5. Cardio — hecho (2026-09-02, duración en minutos reinterpretando `reps`, sin campos nuevos; B y C desactivados para cardio)
```

Also update the "Última actualización" line at the bottom of the file to reference D5 instead of whatever it currently says.

- [ ] **Step 3: Commit and push**

```bash
git add docs/BACKLOG.md
git commit -m "$(cat <<'EOF'
Mark backlog item D5 as done

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push
```

This completes item D of the backlog (D1-D5 all done).
