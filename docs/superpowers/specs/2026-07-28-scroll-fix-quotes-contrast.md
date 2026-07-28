# HIERRO — Fix de scroll en Guía, cita motivacional, contraste de grises

Fecha: 2026-07-28

## Contexto

Primeros 3 ítems (de menor costo) del backlog cargado en Notion. Cada uno es
independiente; se agrupan en un solo spec/plan por ser chicos.

## Pieza 1 — Fix del scroll en la Guía

**Root cause** (confirmado con systematic-debugging, ver transcript): `#app`
usa `min-height:100vh` en vez de una altura acotada, así que
`#view-guide`/`.guide-body`/`.guide-detail` nunca quedan realmente recortados
al viewport — el contenido largo de un ejercicio (GIF + instrucciones)
expande toda la página en vez de generar scroll interno en `.guide-detail`.
Por eso, cuando el usuario scrollea la **ventana** (no el panel) y elige otro
ejercicio, `selectGuideEx()` resetea `guide-detail.scrollTop` (que ya estaba
en 0, no hace nada) pero nunca resetea el scroll real de la página.

**Fix**: agregar `window.scrollTo(0,0);` dentro de `selectGuideEx()`, mismo
patrón que ya usa `showView()` al cambiar de tab. No se toca el layout CSS
general (arreglar la arquitectura de altura de `#app` afectaría Log/Stats/
Editor también, fuera de alcance de este bug puntual).

## Pieza 2 — Cita motivacional estoica

**Fuente**: array estático de ~40 citas estoicas en español (Marco Aurelio,
Séneca, Epicteto), hardcodeado en `index.html`. Sin API externa, sin
persistencia de cuál se mostró.

**Dónde y cuándo**:
- En `#loader`, debajo de "Cargando biblioteca…" — una cita al azar elegida
  al iniciar la app.
- En el header del tab Log, reemplazando el subtítulo estático "TRAINING
  LOG" — una cita al azar elegida **cada vez que se llama `showLog()`**
  (rota en cada visita al tab, no solo al abrir la app).

Ambos sorteos son independientes entre sí (no hace falta que coincidan).

## Pieza 3 — Contraste de texto gris

**Auditoría**: se calculó el contraste WCAG real de cada tono gris usado hoy
contra el fondo oscuro (`#0F1117`/`#13151F`). La mayoría está muy por debajo
del mínimo legible (algunos en ~1.3:1, cuando el estándar pide 4.5:1 para
texto normal). Dos tonos ya cumplen y no se tocan: `#888` (5.3:1) y `#99A`
(6.7:1, ej. `.card-ex-name`, `.gd-step-t`).

**Dos tonos de reemplazo**, elegidos para preservar la jerarquía visual
actual (qué es más apagado que qué) mientras se vuelven legibles:

- **Tier A `#6B6E7A`** (~3.2:1) — para labels/chrome cortos que no son el
  contenido principal: `.logo-block .sub`\* , `.group-tag`, `.field-label`,
  `.btn-remove-ex`, `.sets-hdr span`, `.set-dot`, `.set-unit`, `.btn-rm-set`,
  `.btn-add-set`, `.guide-search input::placeholder`, `.gd-name-en`,
  `.gd-section`/`.picker-section` (se reemplaza el truco de `opacity:0.35`
  por este color sólido — mismo resultado visual, contraste predecible),
  `.stat-section-title`, `.recent-tag`.
- **Tier B `#9195A3`** (~6:1) — para contenido que el usuario necesita leer
  de verdad: `.empty-state h3`, `.empty-state p`, `.card-meta`,
  `.card-ex-sets` (los valores peso×reps — el caso más flagrante hoy, a
  1.5:1), `.step-select.ph`, `.btn-add-ex`, `.btn-cancel`, `.gg-btn`,
  `.gsg-btn`, `.guide-list-empty`, `.gd-empty`, `.gd-badge`, `.stat-lbl`,
  `.stat-empty`, `.bar-label`, `.bar-val`, `.recent-meta`, `#loader .ls`.

\* `.logo-block .sub` es el subtítulo del header del Log — con la Pieza 2
pasa a mostrar la cita rotativa, así que en realidad necesita **Tier B**
(es contenido para leer, no un label decorativo). Se lista acá para dejar
constancia del cambio de criterio respecto al rol original del elemento.

**No se toca**: `.btn-save:disabled` (`#333`) — el bajo contraste en un
control deshabilitado es intencional y una excepción válida de WCAG (no se
espera que el usuario lo lea activamente).

## Verificación

Sin test runner. Verificación manual en browser:

1. **Pieza 1**: en la Guía, seleccionar un ejercicio con instrucciones
   largas, scrollear la página hacia abajo más allá del nombre/imagen,
   elegir otro ejercicio de la lista. Confirmar que la vista vuelve
   arriba del todo automáticamente.
2. **Pieza 2**: recargar la app varias veces, confirmar que la frase del
   loader cambia. Ir a Log, volver a Guía/Stats y volver a Log varias
   veces, confirmar que la frase del header rota (no siempre la misma).
3. **Pieza 3**: revisar visualmente cada pantalla (Log con sesiones
   cargadas, Editor, Guía, Stats) y confirmar que ya no hay texto casi
   invisible — en particular los valores peso×reps en las tarjetas del Log,
   que eran el caso más grave.
