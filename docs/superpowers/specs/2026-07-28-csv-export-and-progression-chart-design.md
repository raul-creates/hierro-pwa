# HIERRO — Export CSV y gráfico de progresión de peso

Fecha: 2026-07-28

## Contexto

HIERRO es una PWA de un solo archivo (`index.html`, vanilla JS, sin frameworks ni
dependencias) para registrar entrenamientos. Los datos viven únicamente en
`localStorage` (clave `hierro_log_v3`), en el dispositivo del usuario.

Esta ronda de trabajo suma dos ítems del backlog "Pendientes" del proyecto:

1. **Exportar log a CSV** — hoy no existe ningún backup de los datos; si se borra
   el `localStorage` o se cambia de dispositivo, se pierde todo el historial.
2. **Gráfico de progresión de peso por ejercicio** — ver cómo evolucionó la carga
   en un ejercicio específico a lo largo del tiempo.

Antes de esta feature se corrige además un bug de deploy detectado en la
auditoría (rutas absolutas en `manifest.json`, `sw.js` e `index.html` que
rompen el service worker y el `start_url` cuando la app se sirve desde un
subpath, como en GitHub Pages de un repo de proyecto). Ese fix es una
corrección directa (rutas relativas), no requiere diseño — se aplica junto con
esta implementación pero no forma parte del spec.

## Alcance

No se modifica el modelo de datos de `localStorage`. Ambas features son
puramente funciones de lectura sobre el estado ya existente en memoria
(`log`, `EXERCISES`). No se agregan archivos nuevos ni dependencias externas
— todo vive en `index.html`, igual que el resto de la app.

## Feature 1 — Exportar log a CSV

**Trigger**: botón nuevo en el header del tab Log, junto a "+ Sesión"
(`btn-ghost`, ícono de descarga).

**Comportamiento**:
- `log` vacío → `toast('No hay sesiones para exportar')`, no genera archivo.
- `log` con datos → genera el CSV en memoria y dispara la descarga con
  `Blob` + `<a download="hierro-log-YYYY-MM-DD.csv">` (fecha del día de
  exportación, no de las sesiones).

**Formato**: una fila por serie (no por sesión ni por ejercicio), header
incluido:

```
fecha,ejercicio_es,ejercicio_en,grupo,serie,peso_kg,reps
2025-07-04,"Press de banca con barra","Barbell Bench Press",Pecho,1,80,8
2025-07-04,"Press de banca con barra","Barbell Bench Press",Pecho,2,80,6
```

- Columnas de texto (nombres de ejercicio, grupo) siempre entre comillas
  dobles; comillas internas escapadas duplicándolas (`"` → `""`) — CSV
  estándar (RFC 4180).
- Ejercicios sin `exId` (fila incompleta que el usuario nunca terminó de
  cargar) se omiten, igual que ya se omiten del Log y de Stats.
- Orden de filas: por fecha de sesión ascendente, y dentro de la sesión, en
  el orden en que los ejercicios/series están guardados.

**Errores**: la única falla posible es que el navegador bloquee la descarga,
lo cual no debería pasar porque el `<a>` sintético se dispara dentro de un
user-gesture (el click del botón). No se agrega manejo de error adicional.

## Feature 2 — Gráfico de progresión de peso

**Ubicación**: dentro de `renderGuideDetail()` (tab Guía), en una nueva
sección "Progresión" entre "Músculos" e "Instrucciones". Solo se muestra si
el ejercicio actualmente seleccionado (`exId`) aparece en al menos una
sesión de `log`.

**Cálculo de datos** (por sesión donde aparece el ejercicio, ordenado por
fecha ascendente, últimas 12 sesiones):
- `pesoMax` = máximo `weight` entre los sets de ese ejercicio en esa sesión.
- `volumen` = suma de `weight × reps` entre los sets de ese ejercicio en esa
  sesión.

Si hay más de 12 sesiones con historial para ese ejercicio, se recortan las
más viejas y se grafican solo las 12 más recientes (mismo criterio que ya
usa el heatmap de Stats con "últimos 70 días").

**Estados**:
- 0 sesiones con este ejercicio → sección no se renderiza.
- 1 sesión → no alcanza para trazar una línea. Se muestra el valor único y
  un texto: "Registrá otra sesión con este ejercicio para ver la
  progresión."
- 2+ sesiones → gráfico de línea SVG.

**Toggle de métrica**: dos botones estilo `.gsg-btn` (mismo componente visual
que las pestañas de subgrupo en la Guía) — "Peso máx" / "Volumen". Default:
"Peso máx". Cada métrica tiene su propio eje Y auto-escalado
(min/max de esa métrica + ~10% de padding), no se comparten escalas.

**Render del gráfico**: `<svg>` de ancho fijo 280px (igual que `.gd-gif`),
altura ~120px:
- Polyline + un círculo por punto, color acento `#FFD200`.
- Sin ejes ni grillas — consistente con el resto de la app (las barras de
  Stats tampoco usan ejes ni gridlines).
- Cada punto lleva `title="{fecha}: {valor}{unidad}"` para ver el dato
  exacto al pasar el mouse o tocar — mismo patrón que ya usan los `.sday`
  del heatmap de actividad.

## Verificación

No hay test runner en este proyecto (HTML estático sin build). La
verificación es manual en browser:

1. Cargar sesiones de prueba con el mismo ejercicio en fechas distintas y
   pesos/reps variados.
2. Confirmar los 3 estados del gráfico (0 / 1 / 2+ sesiones).
3. Confirmar que el toggle cambia correctamente entre "Peso máx" y
   "Volumen", con escalas independientes.
4. Exportar el CSV y abrirlo en una planilla, verificando que acentos y
   comas en los nombres de ejercicio no rompan columnas.
5. Confirmar que exportar con `log` vacío muestra el toast y no descarga
   nada.
