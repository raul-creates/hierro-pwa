# CSV Export & Weight Progression Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the deploy-path bug found in the HIERRO PWA audit, then add CSV export of the training log and a per-exercise weight progression chart in the Guide tab.

**Architecture:** Single-file vanilla JS PWA (`index.html`, `manifest.json`, `sw.js`). No frameworks, no npm, no build step, no automated test runner — everything is manual functions added inline, verified by hand in a browser via a local static file server.

**Tech Stack:** HTML/CSS/vanilla JS, PWA (manifest + service worker), inline SVG for the chart, `Blob`/`URL.createObjectURL` for the CSV download.

## Global Constraints

- No new files, no new dependencies, no build tooling. Everything stays inline in the existing three files (`index.html`, `manifest.json`, `sw.js`).
- No changes to the `localStorage` data model (`hierro_log_v3`). Both features are pure reads over existing `log` / `EXERCISES` state.
- CSV format: one row per set, RFC 4180 quoting, UTF-8 with BOM (so Excel on Windows shows accented Spanish names correctly).
- Chart: inline SVG, no axes/gridlines, capped at the 12 most recent sessions for that exercise, matching the spec at `docs/superpowers/specs/2026-07-28-csv-export-and-progression-chart-design.md`.
- There is no test runner in this repo. "Testing" a step means: serve the folder locally, open it in a browser, and manually confirm the described behavior. Do not add Jest/Vitest/etc — that would be new tooling outside scope.

---

### Task 1: Fix deploy-path bug (relative paths)

**Files:**
- Modify: `manifest.json:5`
- Modify: `sw.js:4-7`
- Modify: `index.html:845`

**Interfaces:** None — this task touches no JS functions used elsewhere, only literal path strings.

**Context:** Audit finding — `manifest.json`'s `start_url`, `sw.js`'s cached shell list, and the service worker registration call all use absolute root paths (`/`, `/sw.js`, `/index.html`). This breaks when the app is deployed under a subpath (e.g. GitHub Pages project site at `https://user.github.io/hierro-training-log/`): the SW registers against the wrong URL (404, silently caught) and `start_url` points at the domain root instead of the app.

- [ ] **Step 1: Change `manifest.json` start_url to a relative path**

In `manifest.json`, change:
```json
  "start_url": "/",
```
to:
```json
  "start_url": "./",
```

- [ ] **Step 2: Change `sw.js` SHELL array to relative paths**

In `sw.js`, change:
```js
const SHELL = [
  '/',
  '/index.html'
];
```
to:
```js
const SHELL = [
  './',
  './index.html'
];
```

- [ ] **Step 3: Change the service worker registration path in `index.html`**

In `index.html`, change:
```js
    navigator.serviceWorker.register('/sw.js')
```
to:
```js
    navigator.serviceWorker.register('./sw.js')
```

- [ ] **Step 4: Verify the fix simulates a subpath deployment correctly**

This bug only shows up when the app is served from a subpath, so verify from the *parent* of `hierro-pwa/` (this mimics `https://user.github.io/hierro-pwa/`, the exact GitHub Pages project-site scenario from the audit):

Run from `C:\Code`:
```bash
python -m http.server 8080
```
Then open `http://localhost:8080/hierro-pwa/index.html` in a browser.

Expected:
- DevTools → Application → Service Workers shows a registered worker with scope `http://localhost:8080/hierro-pwa/` (not `http://localhost:8080/`).
- No 404 for `sw.js` in the Network tab.
- Reloading with the network throttled to "Offline" (DevTools → Network → Offline) still loads the app shell.

Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 5: Commit**

```bash
git add manifest.json sw.js index.html
git commit -m "Fix service worker and manifest to use relative paths for subpath deploys"
```

---

### Task 2: CSV export

**Files:**
- Modify: `index.html` (header button around line 209, new JS functions near line 536, after `deleteSession`)

**Interfaces:**
- Consumes: existing globals `log` (array of sessions), `EXERCISES` (array of exercise objects), `GROUPS` / `GROUP_MERGE` (group id → label), `esName(ex)` (Spanish name resolver), `toast(msg)`, `todayISO()`.
- Produces: `exportCSV()` — called from the new header button's `onclick`. No other task depends on this.

- [ ] **Step 1: Add the CSV export button to the Log header**

In `index.html`, find the Log view header:
```html
      <div class="header-actions">
        <button class="btn-primary" onclick="newSession()">+ Sesión</button>
      </div>
```
Change to:
```html
      <div class="header-actions">
        <button class="btn-ghost" onclick="exportCSV()">CSV</button>
        <button class="btn-primary" onclick="newSession()">+ Sesión</button>
      </div>
```

- [ ] **Step 2: Add the CSV-building and export functions**

Immediately after the existing `deleteSession` function (the one ending `saveLog();renderLog();toast('Sesión eliminada');}`), add:

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
  const csv='\ufeff'+buildCSV();
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

- [ ] **Step 3: Verify empty-log behavior**

Serve and open the app (`python -m http.server 8080` from `C:\Code\hierro-pwa`, open `http://localhost:8080/`). With no sessions logged (fresh `localStorage`), click "CSV" in the Log header.

Expected: a toast reading "No hay sesiones para exportar" appears; no file downloads.

- [ ] **Step 4: Verify CSV content with real data**

In the app, create at least two sessions:
- One with an exercise whose Spanish name has an accent and no comma (e.g. "Sentadilla con barra").
- One with an exercise whose Spanish name would need comma-handling if present (any multi-word name is fine — the escaping only activates on comma/quote/newline, so this step is about eyeballing correct columns, not forcing a comma case).

Click "CSV". Open the downloaded `hierro-log-YYYY-MM-DD.csv` in Excel or Google Sheets.

Expected:
- File opens with 7 columns: `fecha, ejercicio_es, ejercicio_en, grupo, serie, peso_kg, reps`.
- One row per set (a session with 3 sets of one exercise produces 3 rows).
- Accented characters (í, é, ó, á, ñ) render correctly, not as mojibake.
- Row order is chronological by session date.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Add CSV export of the training log"
```

---

### Task 3: Weight progression chart in the Guide tab

**Files:**
- Modify: `index.html` (state section near line 444, `renderGuideDetail` near lines 684-708, CSS near line 143)

**Interfaces:**
- Consumes: `log`, `EXERCISES`, existing `renderGuideDetail()` call sites (`selectGuideEx`, `applyGuideFilter`) — unchanged signatures, this task only changes what `renderGuideDetail()` renders internally.
- Produces: `exerciseHistory(exId)` → `[{date, max, volume}]` (chronological, capped to last 12), `buildProgressionSVG(history, metric)` → SVG markup string, `setChartMetric(metric)` — called from the new toggle buttons' `onclick`, no other task depends on these.

- [ ] **Step 1: Add the chart metric toggle state**

In `index.html`, find the GUIDE state block:
```js
let gGroup = 'arms';
let gSubgroup = 'all';
let gSearch = '';
let gSelectedId = '';
let gFiltered = [];
```
Add a new line after it:
```js
let gChartMetric = 'max';
```

- [ ] **Step 2: Add `exerciseHistory` and `buildProgressionSVG`**

Add these two functions right before `renderGuideDetail` (the function starting `function renderGuideDetail(){`):

```js
function exerciseHistory(exId){
  return log
    .filter(s=>s.exercises.some(e=>e.exId===exId))
    .map(s=>{
      const sets=s.exercises.filter(e=>e.exId===exId).flatMap(e=>e.sets);
      const weights=sets.map(st=>parseFloat(st.weight)||0);
      const volume=sets.reduce((a,st)=>a+(parseFloat(st.weight)||0)*(parseFloat(st.reps)||0),0);
      return {date:s.date, max:Math.max(...weights,0), volume};
    })
    .sort((a,b)=>a.date.localeCompare(b.date))
    .slice(-12);
}
function buildProgressionSVG(history, metric){
  const W=280, H=120, PAD=8;
  const vals=history.map(h=>h[metric]);
  const min=Math.min(...vals), max=Math.max(...vals);
  const range=(max-min)||1;
  const padRange=range*0.1;
  const lo=min-padRange, hi=max+padRange;
  const n=history.length;
  const stepX=n>1?(W-PAD*2)/(n-1):0;
  const pts=history.map((h,i)=>{
    const x=PAD+i*stepX;
    const y=H-PAD-((h[metric]-lo)/(hi-lo))*(H-PAD*2);
    return {x,y,h};
  });
  const poly=pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const unit=metric==='max'?'kg':'kg\u00b7rep';
  const circles=pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#FFD200"><title>${p.h.date}: ${p.h[metric]}${unit}</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><polyline points="${poly}" fill="none" stroke="#FFD200" stroke-width="2"/>${circles}</svg>`;
}
function setChartMetric(metric){gChartMetric=metric;renderGuideDetail();}
```

- [ ] **Step 3: Insert the Progresión section into `renderGuideDetail`**

Find the current `renderGuideDetail` body:
```js
function renderGuideDetail(){
  const el=document.getElementById('guide-detail');
  if(!gSelectedId){el.innerHTML=`<div class="gd-empty">Seleccioná un ejercicio</div>`;return;}
  const ex=EXERCISES.find(e=>e.id===gSelectedId);if(!ex){el.innerHTML='';return;}
  const muscles=[ex.target,...(ex.secondary_muscles||[])].filter(Boolean);
  const steps=ex.instruction_steps?.es||ex.instruction_steps?.en||[];
  const instrText=ex.instructions?.es||ex.instructions?.en||'';
  const grpLabel=GROUPS.find(g=>g.id===GROUP_MERGE[ex.category])?.label||ex.category;
  el.innerHTML=`
    <div class="gd-name-es">${esName(ex)}</div>
    <div class="gd-name-en">${ex.name}</div>
    <div class="gd-badges">
      <span class="gd-badge">${grpLabel}</span>
      <span class="gd-badge">${ex.equipment}</span>
      <span class="gd-badge hl">${ex.target}</span>
    </div>
    <img class="gd-gif" src="${RAW+ex.gif_url}" alt="${ex.name}" loading="lazy">
    <div class="gd-section">Músculos</div>
    <div class="gd-muscles">${muscles.map(m=>`<span class="mtag">${m}</span>`).join('')}</div>
    <div class="gd-section">Instrucciones</div>
    <div class="gd-steps">${steps.length
      ?steps.map((s,i)=>`<div class="gd-step"><span class="gd-step-n">${i+1}</span><span class="gd-step-t">${s}</span></div>`).join('')
      :`<div class="gd-step"><span class="gd-step-n">→</span><span class="gd-step-t">${instrText}</span></div>`
    }</div>`;
}
```

Replace it with:
```js
function renderGuideDetail(){
  const el=document.getElementById('guide-detail');
  if(!gSelectedId){el.innerHTML=`<div class="gd-empty">Seleccioná un ejercicio</div>`;return;}
  const ex=EXERCISES.find(e=>e.id===gSelectedId);if(!ex){el.innerHTML='';return;}
  const muscles=[ex.target,...(ex.secondary_muscles||[])].filter(Boolean);
  const steps=ex.instruction_steps?.es||ex.instruction_steps?.en||[];
  const instrText=ex.instructions?.es||ex.instructions?.en||'';
  const grpLabel=GROUPS.find(g=>g.id===GROUP_MERGE[ex.category])?.label||ex.category;

  const history=exerciseHistory(ex.id);
  let progressionHTML='';
  if(history.length===1){
    progressionHTML=`<div class="gd-section">Progresión</div><div class="gd-prog-empty">Registrá otra sesión con este ejercicio para ver la progresión.</div>`;
  } else if(history.length>1){
    progressionHTML=`<div class="gd-section">Progresión</div>
      <div class="gd-prog-toggle">
        <button class="gsg-btn${gChartMetric==='max'?' active':''}" onclick="setChartMetric('max')">Peso máx</button>
        <button class="gsg-btn${gChartMetric==='volume'?' active':''}" onclick="setChartMetric('volume')">Volumen</button>
      </div>
      <div class="gd-prog-chart">${buildProgressionSVG(history,gChartMetric)}</div>`;
  }

  el.innerHTML=`
    <div class="gd-name-es">${esName(ex)}</div>
    <div class="gd-name-en">${ex.name}</div>
    <div class="gd-badges">
      <span class="gd-badge">${grpLabel}</span>
      <span class="gd-badge">${ex.equipment}</span>
      <span class="gd-badge hl">${ex.target}</span>
    </div>
    <img class="gd-gif" src="${RAW+ex.gif_url}" alt="${ex.name}" loading="lazy">
    <div class="gd-section">Músculos</div>
    <div class="gd-muscles">${muscles.map(m=>`<span class="mtag">${m}</span>`).join('')}</div>
    ${progressionHTML}
    <div class="gd-section">Instrucciones</div>
    <div class="gd-steps">${steps.length
      ?steps.map((s,i)=>`<div class="gd-step"><span class="gd-step-n">${i+1}</span><span class="gd-step-t">${s}</span></div>`).join('')
      :`<div class="gd-step"><span class="gd-step-n">→</span><span class="gd-step-t">${instrText}</span></div>`
    }</div>`;
}
```

- [ ] **Step 4: Add CSS for the new elements**

In the `<style>` block, right after the existing `.gd-steps{margin-bottom:14px}` rule, add:
```css
.gd-prog-toggle{display:flex;gap:6px;margin-bottom:10px}
.gd-prog-empty{color:#444;font-size:11px;margin-bottom:14px}
.gd-prog-chart{margin-bottom:14px}
```

- [ ] **Step 5: Verify the three history states**

Serve and open the app (`python -m http.server 8080` from `C:\Code\hierro-pwa`, open `http://localhost:8080/`).

1. Go to Guía, pick an exercise you've never logged. Expected: no "Progresión" section at all (straight from Músculos to Instrucciones).
2. Log one session with that exercise (Log → + Sesión → pick the same exercise → add a set → Guardar). Go back to Guía, select it again. Expected: "Progresión" section shows the "Registrá otra sesión..." message, no chart.
3. Log a second session on a different date with the same exercise, different weight. Select it in Guía again. Expected: an SVG line chart with 2 points appears, "Peso máx" tab active by default.
4. Click "Volumen". Expected: the chart redraws with a different Y-scale (volume numbers, not weight), "Volumen" tab now highlighted.
5. Hover/tap a point. Expected: a native tooltip shows `YYYY-MM-DD: <value>kg` or `<value>kg·rep`.
6. Log 13+ sessions with the same exercise (can reuse the same date+exercise combo with edits, or several dates). Expected: chart still renders cleanly with only the 12 most recent sessions (check the leftmost tooltip date is not the oldest one you entered).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Add weight progression chart to exercise Guide detail"
```
