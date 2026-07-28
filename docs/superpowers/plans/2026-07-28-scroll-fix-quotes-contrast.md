# Guide Scroll Fix, Motivational Quotes & Gray Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Guide's stale-scroll bug, add rotating Spanish Stoic quotes to the loader and Log header, and fix low-contrast gray text across the app.

**Architecture:** Same single-file vanilla JS PWA (`index.html`). All three changes are additive/corrective — no new files, no new dependencies.

**Tech Stack:** HTML/CSS/vanilla JS.

## Global Constraints

- No changes to the `localStorage` data model.
- No new files, no build tooling — everything stays inline in `index.html`, per `docs/superpowers/specs/2026-07-28-scroll-fix-quotes-contrast.md`.
- Quotes: ~40 static Spanish Stoic quotes, hardcoded array, no external API, no persistence of which one was shown.
- Contrast fix: only replace colors that fail WCAG contrast against the dark background; leave `#888`, `#99A`, and `.btn-save:disabled` (`#333`, intentional) untouched.
- No test runner exists in this repo. "Testing" a step means: serve the folder locally (`python -m http.server` from `C:\Code`, open `http://localhost:8080/hierro-pwa/index.html`), and verify via the browser (JS console execution is an acceptable substitute for manual clicking when it exercises the same code paths).

---

### Task 1: Fix the Guide scroll-position bug

**Files:**
- Modify: `index.html` (`selectGuideEx` function)

**Interfaces:** None — self-contained one-line fix, no other task depends on it.

- [ ] **Step 1: Add the window scroll reset**

Find:
```js
function selectGuideEx(id){
  gSelectedId=id;
  document.querySelectorAll('.gex-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.gex-btn').forEach(b=>{if(b.onclick?.toString().includes(`'${id}'`))b.classList.add('active');});
  renderGuideDetail();
  document.getElementById('guide-detail').scrollTop=0;
}
```
Replace with:
```js
function selectGuideEx(id){
  gSelectedId=id;
  document.querySelectorAll('.gex-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.gex-btn').forEach(b=>{if(b.onclick?.toString().includes(`'${id}'`))b.classList.add('active');});
  renderGuideDetail();
  document.getElementById('guide-detail').scrollTop=0;
  window.scrollTo(0,0);
}
```

- [ ] **Step 2: Verify the fix**

Serve (`python -m http.server 8080` from `C:\Code`, open `http://localhost:8080/hierro-pwa/index.html`) at a mobile viewport (375×812). In the browser console:
```js
showGuide();
selectGuideEx(gFiltered[0].id);
window.scrollTo(0, 500);
selectGuideEx(gFiltered[1].id);
window.scrollY // expected: 0
```
Expected: `window.scrollY` is `0` after selecting the second exercise (previously it stayed at `500`).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Fix Guide detail not resetting page scroll when switching exercises"
```

---

### Task 2: Rotating motivational quotes

**Files:**
- Modify: `index.html` (HTML — loader and Log header markup; CSS — new/adjusted rules; JS — `QUOTES` array, `randomQuote()`, `init()`, `showLog()`)

**Interfaces:**
- Produces: `randomQuote()` → returns a random string from `QUOTES`. Used by `init()` and `showLog()`.

- [ ] **Step 1: Add the `QUOTES` array and `randomQuote()`**

Find the top of the state section:
```js
// ── STATE ─────────────────────────────────────────────────────────────────────
let EXERCISES = [];
```
Replace with:
```js
// ── QUOTES ────────────────────────────────────────────────────────────────────
const QUOTES = [
  'Tienes poder sobre tu mente, no sobre los hechos externos. Reconócelo y hallarás fuerza.',
  'La felicidad de tu vida depende de la calidad de tus pensamientos.',
  'Lo que no beneficia a la colmena, no beneficia a la abeja.',
  'Acepta lo que te toca vivir y ama a las personas con quienes te toca vivir.',
  'El obstáculo en el camino se convierte en el camino.',
  'Mientras vivas, mientras puedas, hazte bueno.',
  'Cuando te levantes por la mañana, piensa qué privilegio es estar vivo.',
  'Todo lo que oyes es una opinión, no un hecho. Todo lo que ves es una perspectiva, no la verdad.',
  'Muy poco se necesita para vivir una vida feliz; todo está dentro de ti, en tu manera de pensar.',
  'El mejor modo de vengarte es no parecerte a quien te hizo daño.',
  'No pierdas más tiempo discutiendo qué debe ser un buen hombre. Sé uno.',
  'Nuestra vida es lo que hacen de ella nuestros pensamientos.',
  'Voy a hacer el trabajo de un ser humano.',
  'Confínate al presente.',
  'No es que tengamos poco tiempo, sino que perdemos mucho.',
  'Mientras enseñamos, aprendemos.',
  'La suerte es lo que sucede cuando la preparación se encuentra con la oportunidad.',
  'Ningún viento es favorable para quien no sabe a qué puerto se dirige.',
  'Sufrimos más en la imaginación que en la realidad.',
  'Es propio de un espíritu grande despreciar las grandes cosas y preferir las moderadas.',
  'Mientras haya vida, hay esperanza.',
  'Todos los días deberíamos aprender algo que nos haga fuertes ante la desgracia.',
  'El fuego prueba el oro; la adversidad, a los fuertes.',
  'Empieza a vivir ya, y cuenta cada día como una vida separada.',
  'Lo más difícil de aprender en la vida es qué puente cruzar y qué puente quemar.',
  'La vida es breve si no la sabemos usar.',
  'No son los hechos los que perturban a los hombres, sino los juicios sobre esos hechos.',
  'Solo hay un camino a la felicidad: dejar de preocuparte por cosas que están fuera de tu voluntad.',
  'Primero di quién quieres ser, y luego haz lo que tengas que hacer.',
  'La riqueza no consiste en tener grandes posesiones, sino en tener pocas necesidades.',
  'Es imposible aprender aquello que uno cree ya saber.',
  'No busques que los hechos ocurran como quieres, sino desea que ocurran como ocurren.',
  'Las circunstancias no hacen al hombre, solo lo revelan a sí mismo.',
  'Ninguna cosa grande nace de repente.',
  'El hombre libre es el que puede vivir como elige.',
  'No expliques tu filosofía. Encárnala.',
  'Primero, no te hagas daño a ti mismo.',
  'Somos perturbados no por lo que sucede, sino por nuestra opinión de lo que sucede.',
  'La disciplina, aplicada con paciencia, se convierte en algo natural.',
  'Domina tu mente o ella te dominará a ti.',
];
function randomQuote(){return QUOTES[Math.floor(Math.random()*QUOTES.length)];}

// ── STATE ─────────────────────────────────────────────────────────────────────
let EXERCISES = [];
```

- [ ] **Step 2: Add the loader quote element and populate it in `init()`**

Find:
```html
<div id="loader">
  <div class="lw">HIERRO</div>
  <div class="ls">Cargando biblioteca…</div>
  <div class="spin"></div>
</div>
```
Replace with:
```html
<div id="loader">
  <div class="lw">HIERRO</div>
  <div class="ls">Cargando biblioteca…</div>
  <div class="ls-quote" id="loader-quote"></div>
  <div class="spin"></div>
</div>
```

Find:
```js
async function init() {
  log = loadLog();
```
Replace with:
```js
async function init() {
  document.getElementById('loader-quote').textContent = randomQuote();
  log = loadLog();
```

- [ ] **Step 3: Add CSS for the loader quote**

Find:
```css
.spin{width:22px;height:22px;border:2px solid #1E2130;border-top-color:#FFD200;border-radius:50%;animation:spin 0.7s linear infinite;margin:12px auto 0}
```
Replace with:
```css
.spin{width:22px;height:22px;border:2px solid #1E2130;border-top-color:#FFD200;border-radius:50%;animation:spin 0.7s linear infinite;margin:12px auto 0}
#loader .ls-quote{color:#9195A3;font-size:10px;margin-top:14px;max-width:260px;text-align:center;line-height:1.4;padding:0 20px}
```

- [ ] **Step 4: Replace the Log header's static subtitle with the rotating quote**

Find:
```html
      <div class="logo-block"><div class="wordmark">HIERRO</div><div class="sub">TRAINING LOG</div></div>
      <div class="header-actions">
        <button class="btn-ghost" onclick="exportCSV()">CSV</button>
        <button class="btn-primary" onclick="newSession()">+ Sesión</button>
      </div>
```
Replace with:
```html
      <div class="logo-block"><div class="wordmark">HIERRO</div><div class="sub" id="log-quote"></div></div>
      <div class="header-actions">
        <button class="btn-ghost" onclick="exportCSV()">CSV</button>
        <button class="btn-primary" onclick="newSession()">+ Sesión</button>
      </div>
```

- [ ] **Step 5: Adjust `.sub` CSS for variable-length quote text and readable contrast**

Find:
```css
.logo-block .sub{color:#383C50;font-size:9px;letter-spacing:2.5px;font-weight:700;margin-top:1px}
```
Replace with:
```css
.logo-block .sub{color:#9195A3;font-size:9px;letter-spacing:0.3px;font-weight:600;margin-top:2px;line-height:1.3;max-width:230px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
```
(Was tuned for the short fixed label "TRAINING LOG" — now holds a variable-length quote, so letter-spacing is relaxed and it's clamped to 2 lines so a long quote can't push the header buttons off layout. Color is also bumped from `#383C50` to `#9195A3` here — part of Task 3's contrast fix, done together since it's the same line.)

- [ ] **Step 6: Populate the Log header quote in `showLog()`**

Find:
```js
function showLog(){showView('view-log');setActiveNav('bnav-log');renderLog();}
```
Replace with:
```js
function showLog(){showView('view-log');setActiveNav('bnav-log');renderLog();document.getElementById('log-quote').textContent=randomQuote();}
```

- [ ] **Step 7: Verify quotes rotate**

Serve and open the app. In the browser console:
```js
document.getElementById('loader-quote').textContent // non-empty, one of QUOTES
const seen = new Set();
for(let i=0;i<20;i++){ showLog(); seen.add(document.getElementById('log-quote').textContent); }
seen.size // expected: > 1 (proves it's rotating, not stuck on one quote)
```
Reload the page a few times and confirm the loader briefly shows a quote below "Cargando biblioteca…" before the app appears (network is fast locally, so this may flash quickly — throttling the network in DevTools makes it easier to see).

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "Add rotating Spanish Stoic quotes to loader and Log header"
```

---

### Task 3: Gray-text contrast fixes

**Files:**
- Modify: `index.html` (CSS block only — ~25 selector color changes)

**Interfaces:** None — pure CSS, no JS/HTML structure changes, no other task depends on it (Task 2 Step 5 already applied the `.logo-block .sub` part of this).

- [ ] **Step 1: Apply the Tier A (`#6B6E7A`) replacements**

Apply each of these exact replacements (old → new) in the `<style>` block:

| Selector | Old declaration | New declaration |
|---|---|---|
| `.group-tag` | `color:#555;` | `color:#6B6E7A;` |
| `.field-label` | `color:#444;` | `color:#6B6E7A;` |
| `.btn-remove-ex` | `color:#2A2D40;` | `color:#6B6E7A;` |
| `.sets-hdr span` | `color:#383C50;` | `color:#6B6E7A;` |
| `.set-dot` | `color:#2A2D40;` | `color:#6B6E7A;` |
| `.set-unit` | `color:#444;` | `color:#6B6E7A;` |
| `.btn-rm-set` | `color:#2A2D40;` | `color:#6B6E7A;` |
| `.btn-add-set` | `color:#3A3D55;` | `color:#6B6E7A;` |
| `.guide-search input::placeholder` | `color:#444` | `color:#6B6E7A` |
| `.gd-name-en` | `color:#444;` | `color:#6B6E7A;` |
| `.stat-section-title` | `color:#444;` | `color:#6B6E7A;` |
| `.recent-tag` | `color:#555;` | `color:#6B6E7A;` |

For each row, find the exact selector's CSS rule (e.g. `.group-tag{background:#1A1D2E;color:#555;border-radius:3px;...}`) and change only the `color:` value shown — every other property in that rule stays exactly as-is.

- [ ] **Step 2: Apply the Tier B (`#9195A3`) replacements**

| Selector | Old declaration | New declaration |
|---|---|---|
| `.empty-state h3` | `color:#383C50;` | `color:#9195A3;` |
| `.empty-state p` | `color:#2A2D40` | `color:#9195A3` |
| `.card-meta` | `color:#555;` | `color:#9195A3;` |
| `.card-ex-sets` | `color:#333;` | `color:#9195A3;` |
| `.step-select.ph` | `color:#555` | `color:#9195A3` |
| `.btn-add-ex` | `color:#555;` | `color:#9195A3;` |
| `.btn-cancel` | `color:#666;` | `color:#9195A3;` |
| `.gg-btn` | `color:#555;` | `color:#9195A3;` |
| `.gsg-btn` | `color:#444;` | `color:#9195A3;` |
| `.guide-list-empty` | `color:#333;` | `color:#9195A3;` |
| `.gd-empty` | `color:#444;` | `color:#9195A3;` |
| `.gd-badge` | `color:#666;` | `color:#9195A3;` |
| `.stat-lbl` | `color:#444;` | `color:#9195A3;` |
| `.stat-empty` | `color:#2A2D40;` | `color:#9195A3;` |
| `.bar-label` | `color:#666;` | `color:#9195A3;` |
| `.bar-val` | `color:#555;` | `color:#9195A3;` |
| `.recent-meta` | `color:#555;` | `color:#9195A3;` |
| `#loader .ls` | `color:#444;` | `color:#9195A3;` |

Same rule as Step 1: change only the `color:` value in each selector's existing declaration block.

- [ ] **Step 3: Replace the opacity-dimming trick on section headers**

Find:
```css
.gd-section{color:#fff;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:7px;opacity:0.35}
```
Replace with:
```css
.gd-section{color:#6B6E7A;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:7px}
```

Find:
```css
.picker-section{margin:14px 14px 7px;color:#fff;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;opacity:0.35}
```
Replace with:
```css
.picker-section{margin:14px 14px 7px;color:#6B6E7A;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase}
```

- [ ] **Step 4: Verify no `#333`/`#444`/`#555`/`#666`/`#2A2D40`/`#383C50`/`#3A3D55` text colors remain, except the intentional exception**

Serve and open the app. In the browser console:
```js
const styleText = document.querySelector('style').textContent;
const failing = ['#333', '#444', '#555', '#666', '#2A2D40', '#383C50', '#3A3D55'];
failing.forEach(c => {
  const matches = [...styleText.matchAll(new RegExp('color:\\s*'+c.replace('#','#')+'\\b','gi'))];
  console.log(c, matches.length);
});
```
Expected: every count is `0`, **except** `#333` should show exactly `1` (the intentional `.btn-save:disabled` exception).

- [ ] **Step 5: Visual spot-check**

Load a session with data (reuse the CSV-export test data pattern: a couple of sessions with sets), and look at: Log tab (card meta text, weight×reps values), Editor (field labels, unit suffixes), Guía (empty/placeholder states, badges), Stats (labels under numbers, bar chart labels). Confirm nothing looks near-invisible against the dark background anymore.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Fix low-contrast gray text across the app to meet WCAG readability"
```
