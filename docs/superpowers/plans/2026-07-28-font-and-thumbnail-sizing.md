# Larger Font & Thumbnail Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bump every font-size in the app by the spec's fixed scale, and enlarge exercise thumbnails from 44px to 60px (plus the list column that holds them), per `docs/superpowers/specs/2026-07-28-font-and-thumbnail-sizing.md`.

**Architecture:** Pure CSS edit in `index.html` (`<style>` block and a few inline `style=` attributes in HTML/JS templates). No HTML structure, JS logic, or data model changes.

**Tech Stack:** CSS only.

## Global Constraints

- Font scale (apply to every `font-size` declaration in the file, no exceptions): 9→11, 10→12, 11→13, 12→14, 13→15, 14→16, 15px and above → current value + 2px.
- Thumbnail: `.gex-img-wrap` 44×44px → 60×60px. List column: `.guide-list` width 160px → 180px.
- Detail GIF (`.gd-gif`, 280px) is explicitly out of scope — do not change it.
- No test runner. Verify by serving locally (`python -m http.server 8080` from `C:\Code`, open `http://localhost:8080/hierro-pwa/index.html`) and visually inspecting each tab, plus a programmatic check that no old font-size values remain.

---

### Task 1: Apply the font-size scale and thumbnail/column resize

**Files:**
- Modify: `index.html` (`<style>` block, and inline `style=` attributes at the Guía/Stats header wordmarks, the loader error message, and the Stats heatmap legend)

**Interfaces:** None — pure CSS, no other task depends on this.

- [ ] **Step 1: Apply every font-size change below**

For each row, find the exact **Old** text in `index.html` and replace it with **New** (only the `font-size` number changes; every other property in the line stays identical):

| Old | New |
|---|---|
| `html,body{height:100%;background:#0F1117;color:#fff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-tap-highlight-color:transparent;font-size:13px}` | `html,body{height:100%;background:#0F1117;color:#fff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-tap-highlight-color:transparent;font-size:15px}` |
| `.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:none;border:none;cursor:pointer;color:#9195A3;font-size:9px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;transition:color 0.15s}` | `.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:none;border:none;cursor:pointer;color:#9195A3;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;transition:color 0.15s}` |
| `.logo-block .wordmark{color:#FFD200;font-weight:900;font-size:18px;letter-spacing:-0.5px;line-height:1}` | `.logo-block .wordmark{color:#FFD200;font-weight:900;font-size:20px;letter-spacing:-0.5px;line-height:1}` |
| `.logo-block .sub{color:#9195A3;font-size:9px;letter-spacing:0.3px;font-weight:600;margin-top:2px;line-height:1.3;max-width:230px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}` | `.logo-block .sub{color:#9195A3;font-size:11px;letter-spacing:0.3px;font-weight:600;margin-top:2px;line-height:1.3;max-width:230px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}` |
| `.btn-ghost{background:#1A1D2E;border:none;border-radius:7px;color:#888;padding:6px 11px;font-size:11px;font-weight:600;cursor:pointer}` | `.btn-ghost{background:#1A1D2E;border:none;border-radius:7px;color:#888;padding:6px 11px;font-size:13px;font-weight:600;cursor:pointer}` |
| `.btn-primary{background:#FFD200;border:none;border-radius:7px;color:#0F1117;padding:6px 12px;font-size:11px;font-weight:800;cursor:pointer}` | `.btn-primary{background:#FFD200;border:none;border-radius:7px;color:#0F1117;padding:6px 12px;font-size:13px;font-weight:800;cursor:pointer}` |
| `.btn-back{background:none;border:none;color:#666;font-size:20px;cursor:pointer;padding:0 6px 0 0;line-height:1}` | `.btn-back{background:none;border:none;color:#666;font-size:22px;cursor:pointer;padding:0 6px 0 0;line-height:1}` |
| `.header-title{color:#fff;font-weight:700;font-size:14px}` | `.header-title{color:#fff;font-weight:700;font-size:16px}` |
| `.empty-state .icon{font-size:38px;margin-bottom:14px}` | `.empty-state .icon{font-size:40px;margin-bottom:14px}` |
| `.empty-state h3{font-size:13px;font-weight:700;color:#9195A3;margin-bottom:5px}` | `.empty-state h3{font-size:15px;font-weight:700;color:#9195A3;margin-bottom:5px}` |
| `.empty-state p{font-size:11px;color:#9195A3}` | `.empty-state p{font-size:13px;color:#9195A3}` |
| `.card-date{color:#fff;font-weight:700;font-size:14px}` | `.card-date{color:#fff;font-weight:700;font-size:16px}` |
| `.card-meta{color:#9195A3;font-size:10px;margin-top:2px}` | `.card-meta{color:#9195A3;font-size:12px;margin-top:2px}` |
| `.card-actions button{background:none;border:none;cursor:pointer;font-size:14px;opacity:0.5;padding:2px;margin-left:8px}` | `.card-actions button{background:none;border:none;cursor:pointer;font-size:16px;opacity:0.5;padding:2px;margin-left:8px}` |
| `.group-tag{background:#1A1D2E;color:#6B6E7A;border-radius:3px;font-size:9px;padding:2px 6px;margin-right:3px;font-weight:700;display:inline-block;letter-spacing:0.3px;margin-bottom:6px}` | `.group-tag{background:#1A1D2E;color:#6B6E7A;border-radius:3px;font-size:11px;padding:2px 6px;margin-right:3px;font-weight:700;display:inline-block;letter-spacing:0.3px;margin-bottom:6px}` |
| `.card-ex-name{color:#99A;font-size:11px;font-weight:600}` | `.card-ex-name{color:#99A;font-size:13px;font-weight:600}` |
| `.card-ex-sets{color:#9195A3;font-size:10px;margin-left:5px}` | `.card-ex-sets{color:#9195A3;font-size:12px;margin-left:5px}` |
| `.mtag{display:inline-block;background:rgba(255,210,0,0.09);color:#FFD200;border:1px solid rgba(255,210,0,0.2);border-radius:3px;font-size:10px;padding:1px 6px;margin:2px 3px 2px 0;font-weight:600}` | `.mtag{display:inline-block;background:rgba(255,210,0,0.09);color:#FFD200;border:1px solid rgba(255,210,0,0.2);border-radius:3px;font-size:12px;padding:1px 6px;margin:2px 3px 2px 0;font-weight:600}` |
| `.field-label{color:#6B6E7A;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}` | `.field-label{color:#6B6E7A;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}` |
| `input[type=date]{width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:13px;outline:none;appearance:none;-webkit-appearance:none;color-scheme:dark}` | `input[type=date]{width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:15px;outline:none;appearance:none;-webkit-appearance:none;color-scheme:dark}` |
| `input[type=number]{width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:12px;outline:none;appearance:none;-webkit-appearance:none}` | `input[type=number]{width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:8px 9px;font-size:14px;outline:none;appearance:none;-webkit-appearance:none}` |
| `.step-select{width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:7px 24px 7px 9px;font-size:11px;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23555'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center}` | `.step-select{width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:7px 24px 7px 9px;font-size:13px;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23555'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center}` |
| `.btn-remove-ex{background:none;border:none;color:#6B6E7A;font-size:16px;cursor:pointer;padding:0 2px;flex-shrink:0;line-height:1;margin-top:5px}` | `.btn-remove-ex{background:none;border:none;color:#6B6E7A;font-size:18px;cursor:pointer;padding:0 2px;flex-shrink:0;line-height:1;margin-top:5px}` |
| `.sets-hdr span{flex:1;color:#6B6E7A;font-size:9px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase}` | `.sets-hdr span{flex:1;color:#6B6E7A;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase}` |
| `.set-dot{color:#6B6E7A;font-size:9px;width:14px;text-align:center;flex-shrink:0}` | `.set-dot{color:#6B6E7A;font-size:11px;width:14px;text-align:center;flex-shrink:0}` |
| `.set-unit{position:absolute;right:7px;top:50%;transform:translateY(-50%);color:#6B6E7A;font-size:9px;pointer-events:none}` | `.set-unit{position:absolute;right:7px;top:50%;transform:translateY(-50%);color:#6B6E7A;font-size:11px;pointer-events:none}` |
| `.btn-rm-set{background:none;border:none;color:#6B6E7A;font-size:12px;cursor:pointer;padding:0;width:24px;text-align:center;flex-shrink:0}` | `.btn-rm-set{background:none;border:none;color:#6B6E7A;font-size:14px;cursor:pointer;padding:0;width:24px;text-align:center;flex-shrink:0}` |
| `.btn-add-set{background:none;border:1px dashed #1E2130;border-radius:7px;color:#6B6E7A;padding:6px 0;width:100%;font-size:11px;cursor:pointer;font-weight:600;margin-top:1px}` | `.btn-add-set{background:none;border:1px dashed #1E2130;border-radius:7px;color:#6B6E7A;padding:6px 0;width:100%;font-size:13px;cursor:pointer;font-weight:600;margin-top:1px}` |
| `.btn-add-ex{background:#1A1D2E;border:1px solid #1E2130;border-radius:9px;color:#9195A3;padding:10px 0;width:100%;font-size:12px;cursor:pointer;font-weight:600;margin-bottom:12px}` | `.btn-add-ex{background:#1A1D2E;border:1px solid #1E2130;border-radius:9px;color:#9195A3;padding:10px 0;width:100%;font-size:14px;cursor:pointer;font-weight:600;margin-bottom:12px}` |
| `.btn-cancel{flex:1;background:#1A1D2E;border:none;border-radius:9px;color:#9195A3;padding:12px 0;font-size:13px;cursor:pointer;font-weight:600}` | `.btn-cancel{flex:1;background:#1A1D2E;border:none;border-radius:9px;color:#9195A3;padding:12px 0;font-size:15px;cursor:pointer;font-weight:600}` |
| `.btn-save{flex:2;background:#FFD200;border:none;border-radius:9px;color:#0F1117;padding:12px 0;font-size:13px;cursor:pointer;font-weight:800}` | `.btn-save{flex:2;background:#FFD200;border:none;border-radius:9px;color:#0F1117;padding:12px 0;font-size:15px;cursor:pointer;font-weight:800}` |
| `.gg-btn{white-space:nowrap;padding:5px 12px;border-radius:16px;border:none;cursor:pointer;font-size:11px;font-weight:600;background:#1A1D2E;color:#9195A3;flex-shrink:0;transition:all 0.12s}` | `.gg-btn{white-space:nowrap;padding:5px 12px;border-radius:16px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:#1A1D2E;color:#9195A3;flex-shrink:0;transition:all 0.12s}` |
| `.gsg-btn{white-space:nowrap;padding:4px 10px;border-radius:12px;border:1px solid #1E2130;cursor:pointer;font-size:10px;font-weight:600;background:none;color:#9195A3;flex-shrink:0;transition:all 0.12s}` | `.gsg-btn{white-space:nowrap;padding:4px 10px;border-radius:12px;border:1px solid #1E2130;cursor:pointer;font-size:12px;font-weight:600;background:none;color:#9195A3;flex-shrink:0;transition:all 0.12s}` |
| `.guide-search input{width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:7px 10px 7px 30px;font-size:11px;outline:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Ccircle cx='5' cy='5' r='4' stroke='%23555' stroke-width='1.5' fill='none'/%3E%3Cline x1='8.5' y1='8.5' x2='11' y2='11' stroke='%23555' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:9px center}` | `.guide-search input{width:100%;background:#1A1D2E;border:1px solid #252840;border-radius:7px;color:#fff;padding:7px 10px 7px 30px;font-size:13px;outline:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Ccircle cx='5' cy='5' r='4' stroke='%23555' stroke-width='1.5' fill='none'/%3E%3Cline x1='8.5' y1='8.5' x2='11' y2='11' stroke='%23555' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:9px center}` |
| `.guide-list-empty{color:#9195A3;font-size:11px;padding:16px 10px;text-align:center}` | `.guide-list-empty{color:#9195A3;font-size:13px;padding:16px 10px;text-align:center}` |
| `.gex-name-es{color:#888;font-size:10px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}` | `.gex-name-es{color:#888;font-size:12px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}` |
| `.gd-empty{color:#9195A3;font-size:12px;padding:40px 0;text-align:center}` | `.gd-empty{color:#9195A3;font-size:14px;padding:40px 0;text-align:center}` |
| `.gd-name-es{color:#FFD200;font-weight:800;font-size:17px;margin-bottom:2px}` | `.gd-name-es{color:#FFD200;font-weight:800;font-size:19px;margin-bottom:2px}` |
| `.gd-name-en{color:#6B6E7A;font-size:11px;font-style:italic;margin-bottom:10px}` | `.gd-name-en{color:#6B6E7A;font-size:13px;font-style:italic;margin-bottom:10px}` |
| `.gd-badge{background:#1A1D2E;border-radius:3px;padding:2px 7px;font-size:9px;font-weight:700;color:#9195A3;letter-spacing:0.3px}` | `.gd-badge{background:#1A1D2E;border-radius:3px;padding:2px 7px;font-size:11px;font-weight:700;color:#9195A3;letter-spacing:0.3px}` |
| `.gd-section{color:#6B6E7A;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:7px}` | `.gd-section{color:#6B6E7A;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:7px}` |
| `.gd-prog-empty{color:#9195A3;font-size:11px;margin-bottom:14px}` | `.gd-prog-empty{color:#9195A3;font-size:13px;margin-bottom:14px}` |
| `.gd-step-n{color:#FFD200;font-size:10px;font-weight:800;flex-shrink:0;width:16px;margin-top:1px}` | `.gd-step-n{color:#FFD200;font-size:12px;font-weight:800;flex-shrink:0;width:16px;margin-top:1px}` |
| `.gd-step-t{color:#99A;font-size:11px;line-height:1.6}` | `.gd-step-t{color:#99A;font-size:13px;line-height:1.6}` |
| `.stat-section-title{color:#6B6E7A;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px}` | `.stat-section-title{color:#6B6E7A;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px}` |
| `.stat-val{color:#FFD200;font-size:22px;font-weight:900;line-height:1;margin-bottom:3px}` | `.stat-val{color:#FFD200;font-size:24px;font-weight:900;line-height:1;margin-bottom:3px}` |
| `.stat-val.sm{font-size:16px}` | `.stat-val.sm{font-size:18px}` |
| `.stat-lbl{color:#9195A3;font-size:10px;font-weight:600}` | `.stat-lbl{color:#9195A3;font-size:12px;font-weight:600}` |
| `.stat-empty{color:#9195A3;font-size:12px;text-align:center;padding:50px 0}` | `.stat-empty{color:#9195A3;font-size:14px;text-align:center;padding:50px 0}` |
| `.bar-label{color:#9195A3;font-size:10px;font-weight:600;width:80px;flex-shrink:0;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}` | `.bar-label{color:#9195A3;font-size:12px;font-weight:600;width:80px;flex-shrink:0;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}` |
| `.bar-val{color:#9195A3;font-size:9px;font-weight:700;width:28px;flex-shrink:0}` | `.bar-val{color:#9195A3;font-size:11px;font-weight:700;width:28px;flex-shrink:0}` |
| `.recent-date{color:#fff;font-size:11px;font-weight:700}` | `.recent-date{color:#fff;font-size:13px;font-weight:700}` |
| `.recent-meta{color:#9195A3;font-size:10px;margin-top:1px}` | `.recent-meta{color:#9195A3;font-size:12px;margin-top:1px}` |
| `.recent-tag{background:#1A1D2E;color:#6B6E7A;border-radius:3px;font-size:9px;padding:1px 5px;font-weight:700}` | `.recent-tag{background:#1A1D2E;color:#6B6E7A;border-radius:3px;font-size:11px;padding:1px 5px;font-weight:700}` |
| `#loader .lw{color:#FFD200;font-weight:900;font-size:24px;margin-bottom:12px}` | `#loader .lw{color:#FFD200;font-weight:900;font-size:26px;margin-bottom:12px}` |
| `#loader .ls{color:#9195A3;font-size:11px}` | `#loader .ls{color:#9195A3;font-size:13px}` |
| `#loader .ls-quote{color:#9195A3;font-size:10px;margin-top:14px;max-width:260px;text-align:center;line-height:1.4;padding:0 20px}` | `#loader .ls-quote{color:#9195A3;font-size:12px;margin-top:14px;max-width:260px;text-align:center;line-height:1.4;padding:0 20px}` |
| `.toast{position:fixed;bottom:68px;left:50%;transform:translateX(-50%);background:#FFD200;color:#0F1117;padding:8px 18px;border-radius:18px;font-size:12px;font-weight:700;opacity:0;transition:opacity 0.2s;pointer-events:none;z-index:300;white-space:nowrap}` | `.toast{position:fixed;bottom:68px;left:50%;transform:translateX(-50%);background:#FFD200;color:#0F1117;padding:8px 18px;border-radius:18px;font-size:14px;font-weight:700;opacity:0;transition:opacity 0.2s;pointer-events:none;z-index:300;white-space:nowrap}` |
| `.picker-section{margin:14px 14px 7px;color:#6B6E7A;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase}` | `.picker-section{margin:14px 14px 7px;color:#6B6E7A;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase}` |

- [ ] **Step 2: Apply the two inline-style font-size changes at the Guía/Stats headers**

Find (appears twice, once for each header — use `replace_all`):
```html
<div class="wordmark" style="font-size:15px">
```
This exact string appears in two places: the Guía header (`>Guía</div>`) and the Stats header (`>Estadísticas</div>`). Replace **both** occurrences with:
```html
<div class="wordmark" style="font-size:17px">
```

- [ ] **Step 3: Apply the inline font-size changes in the loader error message**

Find:
```js
document.getElementById('loader').innerHTML='<div style="color:#ff4444;text-align:center;padding:40px 20px"><div style="font-size:32px;margin-bottom:12px">⚠️</div><div style="font-size:12px;color:#888">No se pudo cargar la biblioteca.<br>Verificá tu conexión.</div></div>';
```
Replace with:
```js
document.getElementById('loader').innerHTML='<div style="color:#ff4444;text-align:center;padding:40px 20px"><div style="font-size:34px;margin-bottom:12px">⚠️</div><div style="font-size:14px;color:#888">No se pudo cargar la biblioteca.<br>Verificá tu conexión.</div></div>';
```

- [ ] **Step 4: Apply the inline font-size change in the Stats heatmap legend**

Find:
```html
      <div style="color:#9195A3;font-size:9px;margin-top:8px">● = sesión entrenada</div>
```
Replace with:
```html
      <div style="color:#9195A3;font-size:11px;margin-top:8px">● = sesión entrenada</div>
```

- [ ] **Step 5: Resize the exercise thumbnail and list column**

Find:
```css
.gex-img-wrap{width:44px;height:44px;border-radius:6px;background:#1A1D2E;flex-shrink:0;overflow:hidden;position:relative}
```
Replace with:
```css
.gex-img-wrap{width:60px;height:60px;border-radius:8px;background:#1A1D2E;flex-shrink:0;overflow:hidden;position:relative}
```

Find:
```css
.guide-list{width:160px;flex-shrink:0;overflow-y:auto;border-right:1px solid #1E2130}
```
Replace with:
```css
.guide-list{width:180px;flex-shrink:0;overflow-y:auto;border-right:1px solid #1E2130}
```

- [ ] **Step 6: Verify no old font-size values remain**

Serve (`python -m http.server 8080` from `C:\Code`) and open `http://localhost:8080/hierro-pwa/index.html`. In the browser console:
```js
const styleText = document.querySelector('style').textContent;
const oldSizes = ['font-size:9px','font-size:10px','font-size:12px','font-size:13px','font-size:16px','font-size:38px','font-size:14px','font-size:18px','font-size:22px','font-size:20px','font-size:24px','font-size:17px'];
oldSizes.map(s => [s, [...styleText.matchAll(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))].length]);
```
Cross-check each count against the table in Step 1 — every remaining count should correspond only to a *target* (new) value that legitimately equals a number also used as an old value elsewhere (e.g. `.header-title` becomes `font-size:16px`, which is a valid new value, not a leftover old one — use the table to confirm, don't just expect all-zero).

- [ ] **Step 7: Visual spot-check**

Load a session with data in `log` (reuse the pattern from earlier rounds: a couple of sessions with sets). Check every tab (Log, Editor, Guía list + detail, Stats, the picker overlay) and confirm:
- Text reads noticeably larger everywhere, nothing looks cut off, overlapping, or wrapped awkwardly.
- The bottom nav (fixed 56px) still fits its icon + label without clipping.
- Exercise thumbnails in the Guía list and the editor's picker are visibly bigger (60×60px) and easier to recognize.
- The Guía list column doesn't overflow into or crowd out the detail panel.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "Increase font sizes and exercise thumbnail size app-wide"
```
