# Exercise Picker & Guide Quick-Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the editor's native exercise `<select>` with an image-thumbnail, searchable picker that includes per-group "Recientes", and add a one-tap "Agregar a hoy" button to the Guide's exercise detail view.

**Architecture:** Same single-file vanilla JS PWA (`index.html`). A new shared list-item renderer feeds both the existing Guide list and the new picker overlay, avoiding duplicated markup.

**Tech Stack:** HTML/CSS/vanilla JS, no new dependencies.

## Global Constraints

- No changes to the `localStorage` data model. All three tasks read/write the existing `log` / `editSession` shapes only.
- No new files, no build tooling — everything stays inline in `index.html`, per `docs/superpowers/specs/2026-07-28-exercise-picker-and-quick-add-design.md`.
- Exercise names shown in lists: single name only (`esName(ex)`), no separate English subtitle line.
- No test runner exists in this repo. "Testing" a step means: serve the folder locally (`python -m http.server` from `C:\Code\hierro-pwa`, open `http://localhost:8080/`), and manually verify via the browser (JS console execution is an acceptable substitute for manual clicking when it exercises the same code paths).

---

### Task 1: Shared exercise-list-item renderer, applied to the Guide list

**Files:**
- Modify: `index.html` (CSS block, `renderGuideList` function, new `renderExerciseListItem` function)

**Interfaces:**
- Produces: `renderExerciseListItem(ex, active, onclickJs)` → HTML string for one list row (thumbnail + single name + click handler). Task 2's picker consumes this.

- [ ] **Step 1: Remove the now-unused English-subtitle CSS rules**

In the `<style>` block, remove these two rules (they style `.gex-name-en`, which this task stops rendering):
```css
.gex-name-en{color:#3A3D55;font-size:9px;font-weight:400;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gex-btn.active .gex-name-en{color:#555}
```

- [ ] **Step 2: Add `renderExerciseListItem` and rewrite `renderGuideList` to use it**

Find:
```js
function renderGuideList(){
  const el=document.getElementById('guide-list');
  if(!gFiltered.length){el.innerHTML=`<div class="guide-list-empty">Sin resultados</div>`;return;}
  el.innerHTML=gFiltered.map(e=>`
    <button class="gex-btn${e.id===gSelectedId?' active':''}" onclick="selectGuideEx('${e.id}')">
      <div class="gex-img-wrap">
        <img src="${RAW+e.image}" loading="lazy" onerror="this.style.display='none'">
      </div>
      <div class="gex-text">
        <span class="gex-name-es">${esName(e)}</span>
        <span class="gex-name-en">${e.name}</span>
      </div>
    </button>`).join('');
}
```

Replace with:
```js
function renderExerciseListItem(ex, active, onclickJs){
  return `<button class="gex-btn${active?' active':''}" onclick="${onclickJs}">
      <div class="gex-img-wrap">
        <img src="${RAW+ex.image}" loading="lazy" onerror="this.style.display='none'">
      </div>
      <div class="gex-text">
        <span class="gex-name-es">${esName(ex)}</span>
      </div>
    </button>`;
}
function renderGuideList(){
  const el=document.getElementById('guide-list');
  if(!gFiltered.length){el.innerHTML=`<div class="guide-list-empty">Sin resultados</div>`;return;}
  el.innerHTML=gFiltered.map(e=>renderExerciseListItem(e, e.id===gSelectedId, `selectGuideEx('${e.id}')`)).join('');
}
```

- [ ] **Step 3: Verify the Guide list still works, single name only**

Serve (`python -m http.server 8080` from `C:\Code\hierro-pwa`) and open `http://localhost:8080/`. Go to tab Guía.

Expected:
- Each row shows exactly one name (no second line below it).
- An exercise with a manual translation shows the Spanish name (e.g. search "sentadilla" and confirm results show Spanish).
- An exercise without a manual translation shows its capitalized English name (e.g. pick an obscure exercise from a group with few translations — any row without a match in `ES_NAMES` — and confirm it shows one capitalized-English line, not two lines).
- Tapping a row still opens its detail (`selectGuideEx` unaffected).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Extract shared exercise list-item renderer, drop English subtitle"
```

---

### Task 2: Exercise picker overlay in the session editor

**Files:**
- Modify: `index.html` (HTML body — new overlay markup; CSS — new picker styles; JS — new state, new picker functions, `buildExBlock` trigger button, `updateExId` call site)

**Interfaces:**
- Consumes: `renderExerciseListItem` from Task 1, existing `EXERCISES`, `GROUP_MERGE`, `SUBGROUP_DEF`, `log`, `editSession`, `esName`, `updateExId`, `renderExercises`.
- Produces: `openPicker(exBlockId)` — called from the new trigger button's `onclick`. No other task depends on this.

- [ ] **Step 1: Add the picker overlay markup**

In `index.html`, right after the closing `</div>` of `<div class="toast" id="toast"></div>`, add:
```html
<div class="picker-overlay" id="picker-overlay">
  <div class="header" style="border-bottom:none">
    <button class="btn-back" onclick="closePicker()">←</button>
    <span class="header-title">Elegir ejercicio</span>
  </div>
  <div class="guide-search"><input type="text" id="picker-search-input" placeholder="Buscar ejercicio…" oninput="filterPicker()"></div>
  <div class="picker-body" id="picker-body"></div>
</div>
```

- [ ] **Step 2: Add picker CSS**

In the `<style>` block, right after the `.toast.show{opacity:1}` rule, add:
```css
/* ── PICKER ── */
.picker-overlay{position:fixed;inset:0;background:#0F1117;z-index:400;display:none;flex-direction:column;max-width:480px;margin:0 auto}
.picker-overlay.active{display:flex}
.picker-body{flex:1;overflow-y:auto;padding-bottom:20px}
.picker-section{margin:14px 14px 7px;color:#fff;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;opacity:0.35}
.picker-trigger{display:flex;align-items:center;gap:7px;text-align:left}
.picker-trigger-thumb{width:22px;height:22px;border-radius:4px;overflow:hidden;flex-shrink:0;background:#0F1117}
.picker-trigger-thumb img{width:100%;height:100%;object-fit:cover}
```

- [ ] **Step 3: Add picker state and logic functions**

Find the GUIDE state block:
```js
let gGroup = 'arms';
let gSubgroup = 'all';
let gSearch = '';
let gSelectedId = '';
let gFiltered = [];
let gChartMetric = 'max';
```
Add after it:
```js
let pickerExBlockId = '';
let pickerSearch = '';
```

Then, right before the `// ── GUIDE ──` section comment, add:
```js
// ── EXERCISE PICKER ──────────────────────────────────────────────────────────
function matchesTokens(ex, query){
  if(!query) return true;
  const haystack=(esName(ex)+' '+ex.name).toLowerCase();
  return query.split(/\s+/).filter(Boolean).every(tok=>haystack.includes(tok));
}
function recentExercisesForCat(cat, limit){
  const seen=new Set(), out=[];
  const sorted=[...log].sort((a,b)=>b.date.localeCompare(a.date));
  for(const s of sorted){
    for(const e of s.exercises){
      if(e.cat===cat && e.exId && !seen.has(e.exId)){
        seen.add(e.exId);
        const ex=EXERCISES.find(x=>x.id===e.exId);
        if(ex) out.push(ex);
        if(out.length>=limit) return out;
      }
    }
  }
  return out;
}
function openPicker(exBlockId){
  pickerExBlockId=exBlockId;
  pickerSearch='';
  document.getElementById('picker-search-input').value='';
  renderPickerBody();
  document.getElementById('picker-overlay').classList.add('active');
}
function closePicker(){
  document.getElementById('picker-overlay').classList.remove('active');
}
function filterPicker(){
  pickerSearch=document.getElementById('picker-search-input').value.trim().toLowerCase();
  renderPickerBody();
}
function renderPickerBody(){
  const block=editSession.exercises.find(e=>e.id===pickerExBlockId);
  if(!block)return;
  const cat=block.cat;
  const body=document.getElementById('picker-body');
  const matched=EXERCISES.filter(e=>GROUP_MERGE[e.category]===cat && matchesTokens(e,pickerSearch));
  let html='';
  if(!pickerSearch){
    const recent=recentExercisesForCat(cat,5);
    if(recent.length){
      html+=`<div class="picker-section">Recientes</div>`;
      html+=recent.map(e=>renderExerciseListItem(e, e.id===block.exId, `selectPickerExercise('${e.id}')`)).join('');
    }
  }
  if(!matched.length){
    html+=`<div class="guide-list-empty">Sin resultados</div>`;
  } else {
    const sgs=(SUBGROUP_DEF[cat]||[]).filter(s=>s.id!=='all'&&s.fn);
    const used=new Set();
    for(const sg of sgs){
      const sgExs=matched.filter(e=>sg.fn(e)&&!used.has(e.id)).sort((a,b)=>a.name.localeCompare(b.name));
      if(!sgExs.length)continue;
      html+=`<div class="picker-section">${sg.label}</div>`;
      for(const e of sgExs){used.add(e.id);html+=renderExerciseListItem(e,e.id===block.exId,`selectPickerExercise('${e.id}')`);}
    }
    const rest=matched.filter(e=>!used.has(e.id)).sort((a,b)=>a.name.localeCompare(b.name));
    if(rest.length){
      if(sgs.length)html+=`<div class="picker-section">Otros</div>`;
      html+=rest.map(e=>renderExerciseListItem(e,e.id===block.exId,`selectPickerExercise('${e.id}')`)).join('');
    }
  }
  body.innerHTML=html;
}
function selectPickerExercise(exId){
  updateExId(pickerExBlockId, exId);
  renderExercises();
  closePicker();
}
```

- [ ] **Step 4: Replace the native exercise `<select>` with the trigger button in `buildExBlock`**

Find:
```js
  let exOpts='';
  if(ex.cat){
    const sgs=SUBGROUP_DEF[ex.cat]||[{id:'all',label:'Todos'}];
    const activeSg=sgs.find(s=>s.id!=='all'&&s.fn)?sgs[0]:null; // no subgroup selected yet in editor, show all
    const exsInGroup=EXERCISES.filter(e=>GROUP_MERGE[e.category]===ex.cat).sort((a,b)=>a.name.localeCompare(b.name));
    // Group by subgroup in optgroups
    const sgsWithContent=sgs.filter(s=>s.id!=='all');
    if(sgsWithContent.length>1){
      const used=new Set();
      let html='<option value="">— Ejercicio —</option>';
      for(const sg of sgsWithContent){
        const sgExs=exsInGroup.filter(e=>sg.fn(e)&&!used.has(e.id));
        if(!sgExs.length)continue;
        html+=`<optgroup label="${sg.label}">`;
        for(const e of sgExs){used.add(e.id);html+=`<option value="${e.id}"${ex.exId===e.id?' selected':''}>${esName(e)} / ${e.name}</option>`;}
        html+=`</optgroup>`;
      }
      // Remaining
      const rest=exsInGroup.filter(e=>!used.has(e.id));
      if(rest.length){html+=`<optgroup label="Otros">`;for(const e of rest){html+=`<option value="${e.id}"${ex.exId===e.id?' selected':''}>${esName(e)} / ${e.name}</option>`;}html+=`</optgroup>`;}
      exOpts=html;
    } else {
      exOpts='<option value="">— Ejercicio —</option>'+exsInGroup.map(e=>`<option value="${e.id}"${ex.exId===e.id?' selected':''}>${esName(e)} / ${e.name}</option>`).join('');
    }
  }
```
Delete this whole block (the picker overlay now owns exercise listing/grouping — see Step 3 of this task).

Then find:
```js
        ${ex.cat?`<select class="step-select${!ex.exId?' ph':''}" onchange="updateExId('${ex.id}',this.value)">${exOpts}</select>`:''}
```
Replace with:
```js
        ${ex.cat?`<button type="button" class="step-select picker-trigger${!ex.exId?' ph':''}" onclick="openPicker('${ex.id}')">${exData?`<span class="picker-trigger-thumb"><img src="${RAW+exData.image}" loading="lazy" onerror="this.style.display='none'"></span><span>${esName(exData)}</span>`:'— Ejercicio —'}</button>`:''}
```

- [ ] **Step 5: Verify group scoping, token search, recientes, and selection**

Serve and open the app. Create a session (or use the editor via "+ Sesión").

1. Pick a muscle group (e.g. "Pecho") for an exercise block. Tap the "— Ejercicio —" button. Expected: overlay opens, title "Elegir ejercicio".
2. Type "inclinado" in the search box. Expected: only Pecho exercises whose Spanish or English name contains "inclinado" appear, grouped or flat, no exercises from other muscle groups.
3. Clear the search. Expected: full Pecho list reappears, grouped by subgroup headers (or ungrouped if that group has no subgroups, e.g. "Pecho" itself has none per `SUBGROUP_DEF`).
4. Tap an exercise. Expected: overlay closes, the trigger button now shows that exercise's thumbnail + Spanish name instead of the placeholder.
5. Save the session, then create/edit another session, pick the same muscle group again, open the picker again. Expected: a "Recientes" section appears at the top with the exercise you just used. Repeat with a couple more distinct exercises in that same group across different sessions (up to 6), confirm the list caps at 5, most-recent first.
6. With text in the search box, confirm "Recientes" is not shown (only matched results).
7. Search for a nonsense string (e.g. "zzzzz"). Expected: "Sin resultados".

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Replace native exercise select with searchable image picker + recientes"
```

---

### Task 3: "Agregar a hoy" button in the Guide detail

**Files:**
- Modify: `index.html` (`renderGuideDetail` function, new `addToToday` function)

**Interfaces:**
- Consumes: `log`, `todayISO`, `emptySet`, `uid`, `GROUP_MERGE`, `editSession` (global), `renderExercises`, `showView`-equivalent view toggling already used by `newSession`/`editSessionFn`.
- Produces: `addToToday()` — called from the new button's `onclick`. No other task depends on this.

- [ ] **Step 1: Add the `addToToday` function**

Add this function right before `renderGuideDetail`:
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

- [ ] **Step 2: Add the button to `renderGuideDetail`'s output**

Find:
```js
    <div class="gd-badges">
      <span class="gd-badge">${grpLabel}</span>
      <span class="gd-badge">${ex.equipment}</span>
      <span class="gd-badge hl">${ex.target}</span>
    </div>
    <img class="gd-gif" src="${RAW+ex.gif_url}" alt="${ex.name}" loading="lazy">
```
Replace with:
```js
    <div class="gd-badges">
      <span class="gd-badge">${grpLabel}</span>
      <span class="gd-badge">${ex.equipment}</span>
      <span class="gd-badge hl">${ex.target}</span>
    </div>
    <button class="btn-primary" style="margin-bottom:14px" onclick="addToToday()">+ Agregar a hoy</button>
    <img class="gd-gif" src="${RAW+ex.gif_url}" alt="${ex.name}" loading="lazy">
```

- [ ] **Step 3: Verify the three cases and the no-persist-until-save rule**

Serve and open the app.

1. With no session logged today (fresh `localStorage`, or delete today's entry if present): go to Guía, pick any exercise, tap "+ Agregar a hoy". Expected: jumps to the editor, title "Nueva sesión", date = today, one exercise block for the picked exercise with one empty set, scrolled into view.
2. Tap "Cancelar". Expected: back to Log, still showing "Sin sesiones registradas" (nothing was persisted).
3. Repeat step 1, this time tap "Guardar sesión". Expected: session now appears in the Log for today.
4. Go back to Guía, pick a **different** exercise (same or different group), tap "+ Agregar a hoy". Expected: jumps to the editor, title "Editar sesión", the existing exercise block from step 3 is still there, plus a new block for this exercise, scrolled to the new one.
5. Tap "Cancelar" again. Expected: back to Log, today's session unchanged (still only the one exercise from step 3 — the second one was not persisted).
6. Repeat step 4 for the exact same exercise added in step 3 (the one already saved). Expected: no duplicate block is created — the editor opens scrolled to the existing block for that exercise.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Add quick-add-to-today button in Guide exercise detail"
```
