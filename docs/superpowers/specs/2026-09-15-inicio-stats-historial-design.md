# Inicio + Stats/Historial — Design

**Fecha:** 2026-09-15
**Sub-proyectos:** 2 y 3 de 3 (juntos — ver contexto)

## Contexto: por qué van juntos

El pedido original tenía 3 frentes independientes (ver `docs/superpowers/specs/2026-09-15-rutinas-autoguardado-design.md`, sub-proyecto 1, ya implementado y en vivo):

1. **Rutinas** — hecho.
2. **Inicio** — que la pestaña Inicio muestre lo que hoy muestra Rutinas.
3. **Stats/Historial** — fusionar el Log dentro de Stats, estilo openGym.

(2) y (3) son dos caras de la misma reestructuración: la pantalla que hoy es "Log" (`view-log`/`showLog()`/`bnav-log`, primera pestaña, header HIERRO+⚙️) se divide en dos. Su **contenedor/pestaña** pasa a ser Inicio y se llena con lo que hoy muestra Rutinas. Sus **datos** (el historial de sesiones que hoy renderiza ahí) se mudan a Stats. Separarlos en dos specs obligaría a un estado intermedio incómodo (sacar la pestaña Rutinas antes de que Stats tenga dónde poner el historial, o viceversa) — van en un solo spec y un solo plan.

## Decisiones ya tomadas (confirmadas por el usuario antes de este documento)

- Inicio muestra por defecto el contenido de Rutinas, manteniendo el header de HIERRO y la ruedita de configuración.
- La pestaña "Rutinas" separada del bottom-nav se elimina — el bottom-nav queda en 4 botones: Inicio, Empezar, Stats, Guía.
- Stats sigue el patrón real de openGym (verificado contra `C:\Code\openGym\frontend\src\views\{Stats,History}.jsx`): una sección "Sesiones recientes" acotada dentro de Stats + una pantalla de historial completo aparte — no todas las sesiones inline donde hoy dice "Últimas sesiones".
- Los botones "Plantillas" y "+ Rutina" (hoy en el header de la pestaña Rutinas) pasan a vivir como una fila de contenido, entre la tira semanal y la lista de rutinas — no en el header fijo de Inicio.
- La vista previa "Sesiones recientes" en Stats queda de solo lectura (sin swipe, sin editar/borrar) — esas acciones viven únicamente en la pantalla de Historial completo.
- Historial se abre como overlay de pantalla completa (mismo patrón que Guía/Plantillas: `.picker-overlay`), no como pestaña propia del bottom-nav.

## Investigación de código (post-merge de Rutinas)

- `view-log` (index.html:287) es el destino de "volver a inicio" desde **7 lugares** de la app (`showLog()`: bnav-log, botón "←" de Ajustes, `discardWorkout()`, `finishWorkout()`, `exportRoutine()`, `shareRoutine()`). `view-routines`/`showRoutines()` solo tiene **3** (bnav-routines, su propia definición, `cancelRoutineEdit()`). Por eso el diseño reutiliza `view-log`/`showLog()`/`bnav-log` como Inicio y elimina `view-routines`/`showRoutines()`/`bnav-routines`, en vez de al revés — mucho menos código a tocar, y ningún call site de los 7 necesita cambiar (siguen significando "andá a la pantalla principal", que ahora es Inicio).
- Dos lugares llaman `showView('view-routines')` directo, sin pasar por `showRoutines()`, para entrar en "modo selector" (exportar/compartir rutina) sin resetear `routinePickMode`: `exportRoutinePrompt()` (index.html:1583-1589) y `shareRoutinePrompt()` (index.html:1601-1607). Ambos pasan a `showView('view-log')`.
- `initSwipeDelete(document.getElementById('routines-list'))` (index.html:715) **ya existe** en `init()` y no necesita tocarse — se conecta una sola vez al arrancar la app, independientemente de qué pestaña esté activa al inicio, así que sigue funcionando sin cambios una vez que el HTML de `routines-list` se mude dentro de `view-log`.
- `renderLog()` (index.html:802-826) hoy apunta a `#log-content` y arma las tarjetas de sesión con swipe-to-delete + botones ✏️/🗑️ — exactamente el comportamiento que la pantalla de Historial necesita, tal cual. Se renombra a `renderHistory()` y su único cambio de contenido es el id del contenedor destino (de `log-content` a `history-list`). Sus 4 llamadores (`init()`, `showLog()`, `deleteSession()`, `confirmBackupRestore()`) se actualizan al nuevo nombre — ninguno cambia de lógica, salvo `showLog()` (ver abajo) y `init()` (ver abajo).
- La sección "Últimas sesiones" de Stats (index.html:2087-2100) ya es de solo lectura hoy — sin `onclick` ni botones en `.recent-row`. No hace falta sacarle nada; solo subir el `.slice(0,5)` a `.slice(0,6)` y agregar el enlace a Historial.
- Patrón de overlay existente a replicar (`guide-detail-overlay`, index.html:396-402): `.picker-overlay` con `.header` (back button + título) y un div de contenido — Historial usa exactamente esta forma.

## Diseño

### A. Inicio — repurpose de `view-log`

El HTML de `view-log` cambia de:
```html
<div class="log-content" id="log-content"></div>
<div id="notices"></div>
```
a (moviendo el contenido que hoy tiene `view-routines`, más una fila nueva para los botones que perdían su header):
```html
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
```
`plan-semanal` y `routines-list` mantienen sus ids actuales sin cambios (dejan de colisionar con nada porque `view-routines` desaparece). `notices` se queda al pie, igual que hoy — Inicio sigue siendo la pantalla principal, es el lugar correcto para los avisos.

El header de `view-log` (HIERRO + frase + ⚙️) no cambia.

`showLog()` absorbe lo que hacía `showRoutines()`:
```js
function showLog(){
  routinePickMode=null;
  showView('view-log');
  setActiveNav('bnav-log');
  renderPlanSemanal();
  renderRoutinesList();
  document.getElementById('log-quote').textContent=randomQuote();
}
```
`showRoutines()` se elimina. `cancelRoutineEdit()` pasa a llamar `showLog()` en vez de `showRoutines()` (único call site a tocar en el código de Rutinas). Los dos `showView('view-routines')` directos (exportar/compartir) pasan a `showView('view-log')`.

En el bottom-nav, el botón `bnav-log` cambia su etiqueta de "Log" a "Inicio" y su ícono (hoy un clipboard) a un ícono de casa simple, coherente con el resto de los íconos de la barra (stroke-based, sin relleno, 24×24). El botón `bnav-routines` se elimina completo.

`buildActiveWorkout`, `saveRoutine`-equivalentes, `deleteRoutine`, y todo lo demás de Rutinas quedan exactamente como están — este spec no toca su lógica, solo dónde vive la pantalla que los muestra.

### B. Stats — sección "Sesiones recientes" + acceso a Historial

En `renderStats()` (index.html:1981), la sección final pasa de `Últimas sesiones` / `.slice(0,5)` a:
```html
<div class="stat-section">
  <div class="stat-section-title" style="display:flex;justify-content:space-between;align-items:center">
    <span>Sesiones recientes</span>
    <button class="btn-ghost" onclick="openHistory()" style="font-size:12px;padding:4px 8px">Ver todas →</button>
  </div>
  <div class="recent-list">
    ${[...log].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(s=>{ /* ...idéntico a hoy... */ }).join('')}
  </div>
</div>
```
Las filas (`.recent-row`) no ganan interactividad — siguen siendo de solo lectura, como hoy.

El header de Stats (index.html:405-410, hoy solo el título "Estadísticas") gana un botón de acceso rápido, siguiendo el mismo patrón que el botón "?" de Guía (index.html: `<button class="btn-ghost" onclick="openGlossary()" aria-label="Glosario">?</button>`):
```html
<div class="header">
  <div class="logo-block"><div class="wordmark" style="font-size:17px">Estadísticas</div></div>
  <div class="header-actions">
    <button class="btn-ghost" onclick="openHistory()" aria-label="Historial">🕓</button>
  </div>
</div>
```
Tener dos caminos al mismo lugar (el ícono del header y el "Ver todas →" de la sección) es intencional — así es como openGym lo resuelve también (`Stats.jsx` tiene ambos: un ícono de historial en el header y un botón "All N" al pie de la sección de sesiones recientes).

### C. Pantalla de Historial — overlay nuevo

Nuevo `.picker-overlay`, mismo patrón que `guide-detail-overlay`:
```html
<div class="picker-overlay" id="history-overlay">
  <div class="header" style="border-bottom:none">
    <button class="btn-back" onclick="closeHistory()">←</button>
    <span class="header-title">Historial</span>
  </div>
  <div class="log-content" id="history-list"></div>
</div>
```
(reutiliza la clase `.log-content` para el padding/scroll — la misma que usaba `#log-content` hoy, ya que el contenido que va adentro es idéntico byte a byte al de `renderLog()` actual).

Funciones nuevas:
```js
function openHistory(){ renderHistory(); document.getElementById('history-overlay').classList.add('active'); }
function closeHistory(){ document.getElementById('history-overlay').classList.remove('active'); }
```
`renderLog()` se renombra a `renderHistory()` y su única línea que cambia es el id del contenedor destino (`log-content` → `history-list`). El resto de su cuerpo (ordenar por fecha, armar las tarjetas `.swipe-row` con `data-delete-fn="deleteSession"`, botones ✏️/🗑️, empty state) queda idéntico.

En `init()` (index.html:710-724): la línea `initSwipeDelete(document.getElementById('log-content'))` pasa a `initSwipeDelete(document.getElementById('history-list'))`. La llamada a `renderLog()` en `init()` (línea 713) se elimina — Historial es una pantalla bajo demanda (se renderiza recién cuando `openHistory()` la abre, como hace `openGuideDetail`/`openGlossary` con sus overlays), no necesita render al arrancar la app.

**Detalle importante encontrado durante la revisión de este spec:** hoy `init()` nunca llama `renderPlanSemanal()`/`renderRoutinesList()` — esas funciones solo se ejecutan cuando se entra a la pestaña Rutinas vía `showRoutines()`, porque `view-log` (con sesiones) era la vista inicial, no `view-routines`. Como `view-log` (ahora Inicio) sigue siendo la vista activa por defecto al cargar la app, pero su contenido cambia a la tira semanal + lista de rutinas, `init()` necesita renderizarlas de entrada — si no, Inicio arrancaría en blanco hasta que el usuario hiciera algo que las refresque. `init()` gana `renderPlanSemanal(); renderRoutinesList();` en el lugar donde estaba `renderLog();`, reemplazándola. La línea `document.getElementById('log-quote').textContent = randomQuote()` en `init()` se mantiene (Inicio sigue teniendo esa frase).

`deleteSession()` y `confirmBackupRestore()` actualizan su llamada de `renderLog()` a `renderHistory()`, sin otro cambio.

## Fuera de alcance

- No se toca el mecanismo de eliminar/editar sesión en sí (`deleteSession`, `editSessionFn`) — solo dónde vive la lista que los expone.
- No se construye un visor de detalle de solo lectura nuevo (como el `workoutDetailSheet` de openGym) — la vista previa de Stats no es tappeable, y la pantalla de Historial reutiliza el editar/borrar que ya existe, no agrega un tercer modo "ver sin editar".
- No se toca el bug de `todayISO()` (UTC vs. día local) anotado en el backlog — es preexistente, aparte.
- No se agrega nada del dashboard "hoy" que tiene el Home de openGym (racha, peso corporal, gráfico) — Inicio es explícitamente "lo que hoy muestra Rutinas", no una réplica del Home de openGym.

## Testing

Sin test runner en este repo. Verificación manual en navegador, sirviendo localmente:

1. Abrir la app — confirmar que la primera pestaña visible (antes "Log") ahora dice "Inicio" en el bottom-nav, con un ícono de casa, y muestra la tira semanal + fila Rutinas (Plantillas/+ Rutina) + lista de rutinas + avisos — sin rastro de tarjetas de sesión.
2. Confirmar que el bottom-nav tiene 4 botones (Inicio, Empezar, Stats, Guía) — sin "Rutinas".
3. Crear/editar una rutina desde Inicio, tocar "←" — confirmar que vuelve a Inicio sin errores (ejercitando `cancelRoutineEdit()` → `showLog()`).
4. Tocar "Plantillas" y "+ Rutina" desde la nueva fila — confirmar que abren los flujos de siempre.
5. Exportar y compartir una rutina (con 2+ rutinas guardadas, para que aparezca el selector) — confirmar que el selector se muestra dentro de Inicio y que al terminar vuelve a Inicio.
6. Ir a Stats — confirmar la sección "Sesiones recientes" (hasta 6, no editable, sin swipe) y el ícono de historial en el header.
7. Tocar "Ver todas →" y el ícono del header — ambos abren el mismo overlay de Historial, con todas las sesiones, más reciente primero, con swipe-to-delete y ✏️/🗑️ funcionando igual que el Log de antes.
8. Borrar una sesión desde Historial — confirmar que se refleja también en la vista previa de Stats al volver.
9. Restaurar un backup con sesiones y rutinas — confirmar que tanto la tira semanal (Inicio) como el historial (si se abre después) reflejan los datos restaurados.
10. Terminar un entrenamiento guiado y descartar uno — confirmar que ambos caminos siguen llevando de vuelta a Inicio sin errores.
