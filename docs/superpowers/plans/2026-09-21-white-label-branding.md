# White-Label Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let HIERRO show a different gym's name, tagline, logo, accent color, and motivational-quote set depending on which domain it's loaded from, while every gym shares the exact same codebase and gets every future feature automatically.

**Architecture:** A single hardcoded table, `GYM_BRANDING`, keyed by `location.hostname` — a hostname with no entry means "plain HIERRO, no branding" and runs zero new code paths. A new `applyBranding()` function, called once at boot, reads the matching entry (if any) and mutates a handful of specific DOM elements and one CSS custom property (`--accent`). No new files, no build step, no backend — a single-file (`index.html`) change.

**Tech Stack:** HTML/CSS/vanilla JS, single-file (`index.html`), no build step, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-21-white-label-branding-design.md`

## Global Constraints

- No test runner exists in this repo. "Testing" a step means: serve the folder locally (`npx http-server hierro-pwa -p 5175` from `C:\Code`, or the `hierro-pwa` entry in `C:\Code\.claude\launch.json`), and manually verify in a browser.
- `location.hostname` cannot be reassigned reliably from the browser console. To test branding locally, add a temporary entry to `GYM_BRANDING` keyed `'localhost'` (which matches the real hostname of the local dev server), verify, then remove that entry before committing — never leave test-only branding entries in a committed `GYM_BRANDING`.
- A hostname with no matching `GYM_BRANDING` entry must produce byte-for-byte the same visible behavior as before this plan — this is the single most important regression to avoid, since it's what every existing HIERRO user sees.
- Only the accent color (`--accent`, default `#FFD200`) is customizable. No other color (background, surfaces, text grays) becomes configurable in this plan.
- `manifest.json` is explicitly out of scope — it is not read or written by any code in this plan.

---

### Task 1: Accent color becomes a CSS custom property

**Files:**
- Modify: `index.html` (CSS: add `:root` rule after `<style>` ~line 13; the `#FFD200` literal at ~34 locations throughout the file; the two `rgba(255,210,0,...)` rules at `.mtag` ~line 88 and `.gd-badge.hl` ~line 167; the `<meta name="theme-color">` tag ~line 7)

**Interfaces:**
- Produces: CSS custom properties `--accent` (default `#FFD200`) and `--accent-rgb` (default `255,210,0`), usable anywhere in the stylesheet or in inline `style="..."` attributes as `var(--accent)` / `rgba(var(--accent-rgb), <alpha>)`. Nothing reads or writes these yet — this task only introduces the variable and repoints every existing use of the literal color at it, so the page renders identically to before.
- Consumes: nothing new.

- [ ] **Step 1: Add the `:root` rule**

Find (in `index.html`, right after the `<style>` tag opens):
```html
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
```

Replace with:
```html
<style>
:root{--accent:#FFD200;--accent-rgb:255,210,0}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
```

- [ ] **Step 2: Replace every literal `#FFD200` with `var(--accent)`**

Run this exact command from the repo root (`C:\Code\hierro-pwa`):
```bash
sed -i 's/#FFD200/var(--accent)/g' index.html
```
This touches every occurrence in the file, including inside the two `rgba(...)`-adjacent CSS rules (which still need Step 3) and the `<meta name="theme-color">` tag (which needs Step 4 to undo, since an HTML attribute can't contain a CSS `var()`).

- [ ] **Step 3: Fix the two rules that use the color with transparency**

Find (in `index.html`, the `.mtag` rule, now partially converted by Step 2):
```css
.mtag{display:inline-block;background:rgba(255,210,0,0.09);color:var(--accent);border:1px solid rgba(255,210,0,0.2);border-radius:3px;font-size:12px;padding:1px 6px;margin:2px 3px 2px 0;font-weight:600}
```

Replace with:
```css
.mtag{display:inline-block;background:rgba(var(--accent-rgb),0.09);color:var(--accent);border:1px solid rgba(var(--accent-rgb),0.2);border-radius:3px;font-size:12px;padding:1px 6px;margin:2px 3px 2px 0;font-weight:600}
```

Find (in `index.html`, the `.gd-badge.hl` rule):
```css
.gd-badge.hl{color:var(--accent);border:1px solid rgba(255,210,0,0.3);background:rgba(255,210,0,0.07)}
```

Replace with:
```css
.gd-badge.hl{color:var(--accent);border:1px solid rgba(var(--accent-rgb),0.3);background:rgba(var(--accent-rgb),0.07)}
```

- [ ] **Step 4: Restore the meta theme-color tag to a literal hex value**

Find (in `index.html`, now incorrectly converted by Step 2):
```html
<meta name="theme-color" content="var(--accent)">
```

Replace with:
```html
<meta name="theme-color" content="#FFD200">
```
(A later task updates this tag's `content` attribute dynamically via JS when a gym's branding is active — a static HTML attribute can't reference a CSS variable.)

- [ ] **Step 5: Verify nothing was missed**

```bash
grep -n "#FFD200" index.html
grep -n "255,210,0" index.html
```
Expected: the FIRST command returns exactly one line (the meta tag from Step 4). The SECOND command returns zero lines (both rgba rules were fixed in Step 3).

- [ ] **Step 6: Verify in the browser**

Serve the folder and open it (inject the `EXERCISES` fixture from earlier plans in the console if the dataset fetch fails). Confirm the app looks pixel-identical to before this task — this is a pure refactor, nothing should visibly change yet:

1. Bottom-nav active tab, "+ Rutina"/"+ Ejercicio"/primary buttons — still yellow.
2. Open the Guía, tap an exercise — its name, step numbers, and the "1RM"/progression chart line and dots — still yellow.
3. Open the glossary (Guía header "?") — term names still yellow.
4. Week strip — today's highlighted cell still yellow; a day with a routine assigned still shows the yellow name text.
5. Start a workout — the finish checkmark button, the progress bar, the exercise name, and the "Reanudar" bottom-nav circle — all still yellow.
6. Tag chips that use `.mtag` (e.g. a superset or override tag, wherever one currently shows in the UI) — still yellow background tint and border.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Make the accent color a CSS custom property

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `GYM_BRANDING` table and `applyBranding()` core (accent color)

**Files:**
- Modify: `index.html` (JS: add new consts/functions after the `CHANGELOG` array ~line 1058; `init()` ~line 729-730)

**Interfaces:**
- Produces: `GYM_BRANDING` (module-level `const`, object, empty `{}` for now — real gym entries are added later by editing this object directly, never through this plan's code), `currentBranding()` → returns `GYM_BRANDING[location.hostname]` or `null`, `hexToRgb(hex)` → returns a `"R,G,B"` string, `applyBranding()` → reads `currentBranding()`; if `null`, returns immediately with no side effects; if an entry exists and has an `accent` field, sets `--accent`/`--accent-rgb` on `document.documentElement` and updates the `theme-color` meta tag.
- Consumes: the `--accent`/`--accent-rgb` CSS custom properties from Task 1 (already wired into every stylesheet rule that needs them — this task only needs to set their values).
- Later tasks (3, 4, 5) extend `applyBranding()`'s body with more branches (name/logo/tagline, then the settings "powered by" line) — they do not touch `currentBranding()`, `hexToRgb()`, or this task's accent-setting code.

- [ ] **Step 1: Add the branding table and helper functions**

Find (in `index.html`, end of the `CHANGELOG` array, right before `GLOSSARY`):
```js
  ]},
];
const GLOSSARY = [
```

Replace with:
```js
  ]},
];
const GYM_BRANDING = {
};
function currentBranding(){ return GYM_BRANDING[location.hostname] || null; }
function hexToRgb(hex){
  const h=hex.replace('#','');
  const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h, 16);
  return `${(n>>16)&255},${(n>>8)&255},${n&255}`;
}
function applyBranding(){
  const b=currentBranding();
  if(!b) return;
  if(b.accent){
    document.documentElement.style.setProperty('--accent', b.accent);
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(b.accent));
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', b.accent);
  }
}
const GLOSSARY = [
```

- [ ] **Step 2: Call it at the very start of `init()`**

Find (in `index.html`, ~line 729-730):
```js
async function init() {
  document.getElementById('loader-quote').textContent = randomQuote();
```

Replace with:
```js
async function init() {
  applyBranding();
  document.getElementById('loader-quote').textContent = randomQuote();
```

- [ ] **Step 3: Verify in the browser**

Serve the folder. In the console, before the app finishes loading (or after — `applyBranding` can be called again manually), test with a temporary entry:

```js
GYM_BRANDING['localhost'] = {accent:'#C41E3A'};
applyBranding();
getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
```

1. Confirm the returned value is `#C41E3A`.
2. Confirm every previously-yellow UI element from Task 1's Step 6 checklist is now red (`#C41E3A`) — the CSS variable change should propagate everywhere automatically since Task 1 already wired every rule to `var(--accent)`.
3. Confirm `document.querySelector('meta[name="theme-color"]').getAttribute('content')` is now `#C41E3A`.
4. Reload the page (without re-running the console snippet). Confirm the app is back to plain yellow HIERRO — `GYM_BRANDING` is in-memory only in this test, so a fresh load has no `'localhost'` entry and `currentBranding()` correctly returns `null`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add GYM_BRANDING table and applyBranding() core (accent color)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Header shows the gym's name, logo, and tagline

**Files:**
- Modify: `index.html` (HTML: the Inicio header ~line 293-294; CSS: near `.app-version` ~line 34; JS: `applyBranding()` from Task 2)

**Interfaces:**
- Produces: three new DOM ids in the Inicio header — `header-name` (wraps the existing "HIERRO" text + version badge), `header-logo` (an `<img>`, hidden by default), `header-tagline` (a `<span>`, empty by default). `applyBranding()` gains a second block (after the accent-color block from Task 2) that sets `document.title`, swaps `header-name`/`header-logo` visibility when `b.logo` is set, and fills `header-tagline` when `b.tagline` is set.
- Consumes: `currentBranding()`, `applyBranding()` (both from Task 2 — this task extends the same function body, does not redefine it).

- [ ] **Step 1: Restructure the Inicio header HTML**

Find (in `index.html`, ~line 293-294):
```html
    <div class="header">
      <div class="logo-block"><div class="wordmark">HIERRO <span class="app-version" id="header-version"></span></div><div class="sub" id="log-quote"></div></div>
    </div>
```

Replace with:
```html
    <div class="header">
      <div class="logo-block">
        <div class="wordmark">
          <span id="header-name">HIERRO <span class="app-version" id="header-version"></span></span>
          <img id="header-logo" style="display:none;height:26px;vertical-align:middle" alt="">
          <span class="header-tagline" id="header-tagline"></span>
        </div>
        <div class="sub" id="log-quote"></div>
      </div>
    </div>
```

- [ ] **Step 2: Add the tagline's CSS**

Find (in `index.html`):
```css
.app-version{color:#6B6E7A;font-weight:600;font-size:11px;letter-spacing:0;vertical-align:middle}
```

Replace with:
```css
.app-version{color:#6B6E7A;font-weight:600;font-size:11px;letter-spacing:0;vertical-align:middle}
.header-tagline{color:#6B6E7A;font-weight:500;font-size:11px;margin-left:6px;vertical-align:middle}
```

- [ ] **Step 3: Extend `applyBranding()`**

Find (in `index.html`, the end of `applyBranding()` from Task 2):
```js
function applyBranding(){
  const b=currentBranding();
  if(!b) return;
  if(b.accent){
    document.documentElement.style.setProperty('--accent', b.accent);
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(b.accent));
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', b.accent);
  }
}
```

Replace with:
```js
function applyBranding(){
  const b=currentBranding();
  if(!b) return;
  if(b.accent){
    document.documentElement.style.setProperty('--accent', b.accent);
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(b.accent));
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', b.accent);
  }
  if(b.name){
    document.title = `${b.name} — Training Log`;
    document.getElementById('header-name').textContent = b.name;
  }
  if(b.tagline) document.getElementById('header-tagline').textContent = b.tagline;
  if(b.logo){
    document.getElementById('header-name').style.display='none';
    const img=document.getElementById('header-logo');
    img.src=b.logo;
    img.style.display='inline-block';
  }
}
```

- [ ] **Step 4: Verify in the browser**

Using the same served instance:

1. Reload with no test branding — confirm the header still shows "HIERRO v1.1" exactly as before, no tagline text visible, browser tab title unchanged ("HIERRO — Training Log").
2. In the console:
```js
GYM_BRANDING['localhost'] = {name:'POWER GIMNASIO', tagline:'TU GYM EN EL CENTRO'};
applyBranding();
```
Confirm the header now shows "POWER GIMNASIO" (no version badge, since `header-name`'s whole text content was replaced) with "TU GYM EN EL CENTRO" in small gray text next to it, and the browser tab title changes to "POWER GIMNASIO — Training Log".
3. In the console, add a logo and re-apply:
```js
GYM_BRANDING['localhost'].logo = 'icon-192.png'; // any existing image in the repo, just to verify the swap
applyBranding();
```
Confirm the text name disappears and the icon image appears in its place, roughly 26px tall, inline with the tagline.
4. Reload the page. Confirm everything reverts to plain HIERRO (in-memory test data only, as in Task 2).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Show gym name, tagline, and logo in the header when branded

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Motivational quotes respect `quotesMode`

**Files:**
- Modify: `index.html` (JS: `randomQuote()` ~line 666)

**Interfaces:**
- Produces: `activeQuotes()` → returns `QUOTES` when there's no branding or `quotesMode` is `'default'`/unset; returns `b.customQuotes` when `quotesMode==='custom'` and `customQuotes` is a non-empty array; returns `[]` otherwise (covers `'none'`, or a misconfigured `'custom'` with no quotes). `randomQuote()` — same signature as before, now picks from `activeQuotes()` and returns `''` when that list is empty (instead of crashing on an empty array).
- Consumes: `currentBranding()` (from Task 2), `QUOTES` (existing global array, unchanged).

- [ ] **Step 1: Replace `randomQuote` with `activeQuotes` + `randomQuote`**

Find (in `index.html`, ~line 666):
```js
function randomQuote(){return QUOTES[Math.floor(Math.random()*QUOTES.length)];}
```

Replace with:
```js
function activeQuotes(){
  const b=currentBranding();
  if(!b || !b.quotesMode || b.quotesMode==='default') return QUOTES;
  if(b.quotesMode==='custom' && Array.isArray(b.customQuotes) && b.customQuotes.length) return b.customQuotes;
  return [];
}
function randomQuote(){ const q=activeQuotes(); return q.length ? q[Math.floor(Math.random()*q.length)] : ''; }
```

- [ ] **Step 2: Verify in the browser**

Using the same served instance:

1. Reload with no test branding — confirm the loader screen and the Inicio header both still show a random stoic quote, exactly as before.
2. In the console:
```js
GYM_BRANDING['localhost'] = {quotesMode:'custom', customQuotes:['Frase de prueba uno.', 'Frase de prueba dos.']};
document.getElementById('log-quote').textContent = randomQuote();
```
Run the second line several times — confirm it only ever shows one of the two test phrases, never one of the original `QUOTES`.
3. Set `GYM_BRANDING['localhost'] = {quotesMode:'none'};` and re-run `document.getElementById('log-quote').textContent = randomQuote();` — confirm the element becomes empty, no error in the console.
4. Set `GYM_BRANDING['localhost'] = {quotesMode:'custom'};` (no `customQuotes` at all) and re-run — confirm it also safely returns empty, not a crash.
5. Reload the page — confirm quotes go back to the normal `QUOTES` pool.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Make motivational quotes configurable per gym (default/custom/none)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: "Desarrollado por HIERRO" in Ajustes

**Files:**
- Modify: `index.html` (HTML: end of `view-settings`'s `editor-content` ~line 341-347; JS: `applyBranding()` from Task 3)

**Interfaces:**
- Produces: a new element `settings-powered-by`, hidden by default (`display:none`), shown only when a branding entry is active. `applyBranding()` gains a third block that sets its text (from `b.poweredBy`, defaulting to `'Desarrollado por HIERRO'`) and reveals it.
- Consumes: `applyBranding()` (from Task 3 — extends the same function body once more).

- [ ] **Step 1: Add the hidden footer element to Ajustes**

Find (in `index.html`, the end of the "Versión" field-group in `view-settings`):
```html
      <div class="field-group">
        <div class="field-label">Versión</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="color:#9195A3;font-size:14px" id="settings-version"></span>
          <button class="btn-ghost" onclick="openChangelog()">Ver changelog</button>
        </div>
      </div>
    </div>
  </div>
```

Replace with:
```html
      <div class="field-group">
        <div class="field-label">Versión</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="color:#9195A3;font-size:14px" id="settings-version"></span>
          <button class="btn-ghost" onclick="openChangelog()">Ver changelog</button>
        </div>
      </div>
      <div id="settings-powered-by" style="display:none;text-align:center;color:#6B6E7A;font-size:12px;padding:16px 0 4px">Desarrollado por HIERRO</div>
    </div>
  </div>
```

- [ ] **Step 2: Extend `applyBranding()` once more**

Find (in `index.html`, the end of `applyBranding()` from Task 3):
```js
  if(b.logo){
    document.getElementById('header-name').style.display='none';
    const img=document.getElementById('header-logo');
    img.src=b.logo;
    img.style.display='inline-block';
  }
}
```

Replace with:
```js
  if(b.logo){
    document.getElementById('header-name').style.display='none';
    const img=document.getElementById('header-logo');
    img.src=b.logo;
    img.style.display='inline-block';
  }
  const poweredByEl=document.getElementById('settings-powered-by');
  if(poweredByEl){
    poweredByEl.textContent = b.poweredBy || 'Desarrollado por HIERRO';
    poweredByEl.style.display='block';
  }
}
```

- [ ] **Step 3: Verify in the browser**

Using the same served instance:

1. Reload with no test branding, open Ajustes — confirm there is NO "Desarrollado por HIERRO" text anywhere (the element stays `display:none`).
2. In the console:
```js
GYM_BRANDING['localhost'] = {};
applyBranding();
```
Open/re-open Ajustes (`showSettings()` in console, or tap the bottom-nav) — confirm "Desarrollado por HIERRO" now appears centered at the bottom, below "Versión".
3. Set a custom value and re-apply:
```js
GYM_BRANDING['localhost'] = {poweredBy:'Con tecnología de HIERRO'};
applyBranding();
```
Confirm Ajustes now shows "Con tecnología de HIERRO" instead of the default.
4. Reload the page — confirm the element goes back to hidden.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add "Desarrollado por HIERRO" footer to Ajustes when branded

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Final end-to-end verification

**Files:**
- None modified — verification only.

**Interfaces:**
- Consumes: everything from Tasks 1-5, exercised together with one full test `GYM_BRANDING` entry covering every field at once.

- [ ] **Step 1: Full combined verification**

Using a fresh reload of the served instance (plain, no branding yet — let the page finish loading first), then paste this into the console:
```js
GYM_BRANDING['localhost'] = {
  name: 'POWER GIMNASIO',
  tagline: 'TU GYM EN EL CENTRO',
  logo: null,
  accent: '#C41E3A',
  quotesMode: 'default',
  poweredBy: null,
};
applyBranding();
showLog();
```
`GYM_BRANDING` is in-memory only (not persisted to `localStorage` or the file), so do NOT reload the page during this check — a reload would wipe the test entry and put the app back to plain HIERRO before you can inspect it.

1. Header shows "POWER GIMNASIO" with "TU GYM EN EL CENTRO" beside it, in the accent-colored wordmark styling, now red (`#C41E3A`).
2. Every UI element from Task 1's Step 6 checklist (buttons, guided workout chart/names, glossary terms, week-strip highlight, workout screen) is red, not yellow.
3. Browser tab title reads "POWER GIMNASIO — Training Log".
4. The daily quote is still one of the original `QUOTES` (since `quotesMode:'default'` here).
5. Ajustes shows "Desarrollado por HIERRO" at the bottom.
6. Now change only `quotesMode` to `'custom'` with a `customQuotes` array and re-run `applyBranding()` (quotes don't need re-applying since `randomQuote()` reads live state, but re-rendering the header via `showLog()` will pick it up) — confirm the quote source switches.
7. Reload the page fresh (no console setup at all) — confirm the app is indistinguishable from HIERRO before this entire plan: yellow accent, "HIERRO v1.1" header, no tagline, no "Desarrollado por HIERRO" in Ajustes, quotes from `QUOTES`.
8. Grep the committed file to make sure no test-only branding entry was accidentally left in: `grep -n "GYM_BRANDING\['localhost'\]\|GYM_BRANDING.localhost" index.html` should return nothing (the console-only test assignments in this plan never touch the file — this is a sanity check that no step in any task accidentally wrote one into the source).

- [ ] **Step 2: Update the backlog**

Add a new entry to `docs/BACKLOG.md` documenting this feature, following the same style as the "Feedback de Raúl" sections already in that file (a new top-level section with a checked-off summary), then commit:

```bash
git add docs/BACKLOG.md
git commit -m "$(cat <<'EOF'
Mark white-label branding as done in backlog

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
