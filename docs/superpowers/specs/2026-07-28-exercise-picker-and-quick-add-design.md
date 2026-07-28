# HIERRO — Picker de ejercicios con imágenes + "Agregar a hoy" desde la Guía

Fecha: 2026-07-28

## Contexto

Después de usar HIERRO instalada como PWA en el celular, surgió feedback de uso real.
De la lista completa de feedback, este spec cubre el sub-proyecto priorizado
primero: **el picker de ejercicios**. Quedan afuera de este spec (sub-proyectos
separados, a definir después):

- Traducción completa del dataset (hoy ~60/1.324 ejercicios tienen nombre en
  español; el resto cae a inglés capitalizado vía el fallback de `esName()`).
- Favoritos manuales (estrella + tab propia) — evaluado y pospuesto a
  próxima iteración, una vez probado cómo funciona "Recientes" solo.
- Asistente de sugerencias basado en historial reciente — quedó como idea a
  evaluar más adelante, no forma parte de este trabajo.

Este spec cubre tres piezas relacionadas: un componente de lista compartido,
el picker de ejercicios del editor de sesiones, y un botón de alta rápida
desde la Guía.

## Alcance

No se modifica el modelo de datos de `localStorage`. Las tres piezas operan
sobre el estado ya existente (`log`, `EXERCISES`, `editSession`). No se
agregan archivos nuevos ni dependencias — todo sigue en `index.html`.

## Pieza 1 — Componente compartido: fila de ejercicio

Función nueva `renderExerciseListItem(ex, active)`, que genera el HTML de
una fila (thumbnail + nombre) reemplazando el marcado hoy duplicado dentro
de `renderGuideList()`. Se usa tanto en la lista de la Guía como en el
picker nuevo del editor (Pieza 2).

**Cambio de contenido**: se muestra un solo nombre, `esName(ex)` — se
elimina la línea secundaria en inglés (`.gex-name-en`) que hoy se muestra
siempre debajo. `esName()` no se toca: su fallback ya devuelve el nombre en
inglés capitalizado cuando no hay traducción manual, así que el
comportamiento "en español salvo que se use en inglés" sale gratis de la
función existente.

## Pieza 2 — Picker de ejercicios en el editor de sesiones

Reemplaza el segundo `<select>` (Ejercicio) de cada bloque de ejercicio en
el editor. El primer `<select>` (Grupo muscular) no cambia.

**Trigger**: el `<select>` de Ejercicio pasa a ser un botón (mismo estilo
visual `.step-select`) que muestra el ejercicio elegido (thumbnail + nombre)
o el placeholder "— Ejercicio —". Sigue apareciendo solo cuando ya hay un
grupo muscular elegido, igual que hoy. Al tocarlo, abre un overlay a
pantalla completa (mismo patrón `position:fixed;inset:0` que ya usa
`#loader`).

**Contenido del overlay**, siempre scopeado al grupo ya elegido (`ex.cat`
del bloque que lo abrió):

- Header con botón volver + título "Elegir ejercicio".
- Buscador de texto libre, con matching por **tokens**: cada palabra
  escrita (separadas por espacio) tiene que aparecer como substring en
  `esName(ex)` **o** en `ex.name` (no interesa en cuál de los dos, ni el
  orden entre palabras). Todas las palabras escritas tienen que matchear
  (AND), no alcanza con que matchee una sola.
- Sección **"Recientes"**: hasta 5 ejercicios. Se calculan filtrando `log`
  por `e.cat === ex.cat` (el grupo activo), ordenando las sesiones por
  fecha descendente, y tomando los primeros 5 `exId` únicos encontrados
  (dedupe manteniendo la primera aparición = uso más reciente). Se oculta
  esta sección si no hay ninguno, y también se oculta mientras el buscador
  tiene texto (no aporta durante una búsqueda activa).
- Lista completa de ejercicios del grupo activo, agrupada por subgrupo
  (mismo criterio que ya usan los `<optgroup>` actuales), usando
  `renderExerciseListItem` de la Pieza 1.

**Selección**: tocar un ítem corre la misma lógica que hoy tiene
`updateExId` (asigna `exId`, refresca los tags de músculos), cierra el
overlay, y el bloque de ejercicio en el editor pasa a mostrar el thumbnail +
nombre del ejercicio elegido en el botón (la confirmación visual pedida),
en vez del placeholder.

**Vacíos**: 0 resultados de búsqueda → mismo mensaje "Sin resultados" que ya
existe en la Guía (`.guide-list-empty`).

## Pieza 3 — "Agregar a hoy" desde la Guía

**Ubicación**: botón nuevo (`.btn-primary`, texto "+ Agregar a hoy") en el
detalle de la Guía (`renderGuideDetail`), debajo de los badges
(grupo/equipo/músculo) y antes del GIF.

**Comportamiento al tocarlo**:

1. Busca en `log` una sesión con `date === todayISO()`.
2. Casos:
   - Existe sesión de hoy **y ya tiene este ejercicio** (mismo `exId`) → no
     se agrega nada nuevo.
   - Existe sesión de hoy **pero no tiene este ejercicio** → se le agrega un
     bloque nuevo para este ejercicio, con una serie vacía (`emptySet()`).
   - **No existe sesión de hoy** → se arma una sesión nueva en memoria
     (fecha de hoy) con este ejercicio como único bloque, una serie vacía.
3. En los tres casos, navega al editor (`view-edit`) sobre esa sesión (igual
   que `editSessionFn`/`newSession` ya hacen: toggle de `.view`, sin tocar
   la bottom nav), con scroll automático (`scrollIntoView`, mismo patrón que
   ya usa `addExercise()`) hasta el bloque de ese ejercicio específico.
4. **No se persiste nada en `localStorage` en este paso** — igual que el
   resto del flujo de edición, hace falta tocar "Guardar sesión" para que
   quede guardado. Si se cancela, no se modifica `log`.

## Verificación

Sin test runner (HTML estático). Verificación manual en browser:

1. **Pieza 1**: abrir la Guía, confirmar que cada fila muestra un solo
   nombre — en español para ejercicios traducidos, en inglés capitalizado
   para los que no tienen traducción (sin línea secundaria en ningún caso).
2. **Pieza 2**: en el editor, elegir un grupo muscular, tocar "Ejercicio",
   confirmar que abre el overlay scopeado a ese grupo. Buscar por una
   palabra suelta (ej. "inclinado") y confirmar que aparecen todos los
   ejercicios de ese grupo que la contienen, sin importar posición. Elegir
   un ejercicio, confirmar que el bloque muestra su thumbnail + nombre.
   Repetir la selección en ese mismo grupo un par de veces (con sesiones
   guardadas) y confirmar que "Recientes" muestra los últimos usados,
   máximo 5, y que desaparece al escribir en el buscador.
3. **Pieza 3**: sin sesión de hoy, ir a la Guía, elegir un ejercicio, tocar
   "+ Agregar a hoy", confirmar que abre el editor con la sesión de hoy y
   ese ejercicio cargado. Repetir con una sesión de hoy ya existente sin ese
   ejercicio (debe agregarse) y con una que ya lo tenga (no debe duplicarse,
   debe llevar directo a ese bloque). Confirmar que si se cancela sin
   guardar, `log` queda sin cambios.
