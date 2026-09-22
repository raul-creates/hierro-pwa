# HIERRO — Backlog

Roadmap hacia paridad funcional con openGym, más ideas sueltas que todavía no entraron a la lista principal.

## Roadmap de paridad con openGym (A–I)

- [x] **A. Modo de entrenamiento guiado** — hecho, ver `docs/superpowers/plans/2026-09-01-guided-workout-mode.md`
- [x] **B. Progresión automática de peso/reps** — hecho (2026-09-02, doble progresión sobre rango implícito targetReps..+4)
- [x] **C. Estimación de 1RM** — hecho (2026-09-02, fórmula de Epley, tercer toggle en el gráfico de progresión de la Guía)
- [x] **D. Supersets, peso corporal, reps por lado, cardio, esfuerzo** — descompuesto en sub-proyectos independientes (orden decidido):
  - [x] D1. Esfuerzo (RPE/RIR, configurable en Ajustes, un valor por ejercicio) — hecho (2026-09-02)
  - [x] D2. Peso corporal — hecho (2026-09-02, auto-detectado por equipment del dataset)
  - [x] D3. Reps por lado — hecho (2026-09-02, toggle manual en rutina + modo guiado, sin heurística de nombre)
  - [x] D4. Supersets — hecho (2026-09-02, linkedToNext suprime el rest timer entre ejercicios encadenados, sin rondas)
  - [x] D5. Cardio — hecho (2026-09-02, duración en minutos reinterpretando `reps`, sin campos nuevos; B y C desactivados para cardio)
- [x] **E. Compartir rutina por link/QR** — hecho (2026-09-10, solo link — sin QR para no agregar dependencias; ver commit)
- [x] **F. Backup/restore amigable** — hecho (2026-09-10, movido a Ajustes + recordatorio de último backup + vista previa antes de restaurar)
- [x] **G. Guía de instalación PWA** — hecho (2026-09-10, tarjeta de aviso al pie del Log, misma infraestructura pensada para futuros avisos del admin del gym)
- [x] **H. Pasada de diseño (tamaños, tipografía)** — hecho (2026-09-10, botones plan semanal, contraste de tags toggle, nombres truncados en Stats — ver commit)
- [x] **I. Glosario de términos** — hecho (2026-09-10, botón "?" en el header de la Guía)

## Ideas sueltas (aparte del roadmap A–I)

- [x] **Avisos del admin del gym** — hecho (2026-09-10, sin backend propio: Google Form → Sheet publicada → HIERRO la lee como JSON vía el endpoint gviz de Google Sheets, cacheada por sesión, se integra al mismo sistema de NOTICES de G. Configuración: constante `ADMIN_NOTICES_SHEET_ID` en `index.html`, vacía por default).
- [x] **Swipe para borrar** — hecho (2026-09-10, gesto táctil con reveal progresivo + confirm() al completar el swipe en las 4 listas; en desktop se mantiene el botón explícito vía `@media (hover:none)`).
- **Tarjetas de aviso rotativas**: en vez de apilar todas las tarjetas de `NOTICES` una debajo de la otra en el Log, que vayan rotando (tipo carrusel) — mezclando avisos urgentes del admin, tips de features de la app (ej. "¿Sabías que hay un glosario en la Guía?"), y frases motivacionales cortas. Surgió charlando las tarjetas de G/avisos del admin.
- **Fix: desfasaje de "hoy" en la tira semanal por UTC vs. hora local**: `todayISO()` calcula "hoy" con `new Date().toISOString().slice(0,10)` (UTC), pero la tira semanal arma sus columnas con el día de la semana local (`new Date().getDay()`). En husos horarios detrás de UTC, esto puede hacer que el resaltado de "hoy" se corra de columna cerca de la medianoche UTC (confirmado en vivo durante la verificación de "Rutinas: autoguardado"). Preexistente, no introducido por esa rama — bug aparte, sin tocar todavía. Nota extra encontrada en la misma revisión: `todayISO()` está definida dos veces, de forma idéntica, en el archivo (la segunda gana en silencio) — limpiar de paso si se toca esta zona.

## Rediseño Inicio / Rutinas / Stats (charlado el 2026-09-15, fuera del roadmap A–I y de las ideas sueltas de arriba)

- [x] **Rutinas: autoguardado + fix del bug del 3er ejercicio + selección de día** — hecho (2026-09-15, ver `docs/superpowers/specs/2026-09-15-rutinas-autoguardado-design.md` y `docs/superpowers/plans/2026-09-15-rutinas-autoguardado.md`). Reemplaza el borrador `editRoutine` por autoguardado directo; saca la barra Cancelar/Guardar (lo que arregla el bug del 3er ejercicio); la tira de 7 días pasa a un solo tap que siempre abre el selector de reasignación. La revisión final encontró y arregló un bug crítico no anticipado en el diseño original: el guardado viejo le sacaba el `id` a cada ejercicio y solo se lo volvía a poner al abrir el editor — sin ese mecanismo, cualquier rutina previa a esta rama (o cargada de plantilla) quedaba imposible de editar en silencio.
- [x] **Inicio + Stats/Historial** — hecho (2026-09-16, ver `docs/superpowers/specs/2026-09-15-inicio-stats-historial-design.md` y `docs/superpowers/plans/2026-09-15-inicio-stats-historial.md`). La pestaña Inicio reutiliza `view-log`/`showLog()` (no los renombra) para mostrar por defecto lo que mostraba Rutinas — tira semanal + botones Plantillas/+ Rutina + lista de rutinas — manteniendo el header de HIERRO y la ruedita de configuración; la pestaña "Rutinas" separada se elimina (bottom-nav queda en 4: Inicio, Empezar, Stats, Guía). El historial de sesiones se muda a un overlay nuevo ("Historial") accesible desde Stats — sección "Sesiones recientes" (últimas 6, solo lectura) + ícono en el header + botón "Ver todas →", siguiendo el patrón real de openGym. La revisión final encontró y arregló 2 bugs críticos que las tareas individuales no podían haber visto (aparecen solo al juntar las piezas): el overlay de Historial no scrolleaba más allá de las primeras sesiones, y quedaba pegado visualmente encima de la pantalla de entrenamiento al editar una sesión pasada — más un bug importante de Stats mostrando datos viejos después de borrar una sesión desde Historial.

## Feedback de Raúl sobre flujo de días/rutinas (2026-09-17)

Review recibida por PDF más feedback hablado adicional. Dividido en dos sub-proyectos:

- [x] **Sub-proyecto 1 — Ajustes de UI** — hecho (2026-09-17, sin tocar el modelo de datos de rutinas):
  - Fecha real bajo cada día de la tira semanal (semana actual solamente, sin navegación a otras semanas por ahora).
  - Botón "atrás" global agrandado; se agrega manejo de `history`/`popstate` para que el botón físico o el gesto de atrás del teléfono cierre overlays/subvistas (Ajustes, editor de rutina) en vez de salir de la app.
  - Ajustes se muda del header a la bottom-nav; nuevo orden: Inicio, Guía, Empezar, Stats, Ajustes.
- [x] **Sub-proyecto 2 — Rutinas independientes por día** — hecho (2026-09-17, ver `docs/superpowers/specs/2026-09-17-rutinas-independientes-por-dia-design.md` y `docs/superpowers/plans/2026-09-17-rutinas-independientes-por-dia.md`):
  - Navegación libre entre días desde Inicio: cada día abre una vista de detalle con su rutina, en vez de solo permitir reasignar (PDF #1).
  - Botón grande "Iniciar sesión" dentro de la vista de cada día; si no hay rutina cargada, pregunta si crear una rutina nueva o arrancar una sesión freestyle en vez de deshabilitar el botón (PDF #2 + feedback hablado).
  - Selector de día suma la opción "Crear rutina"/freestyle además de Descanso y rutinas existentes (feedback hablado).
  - Al editar ejercicios/pesos o agregar/quitar ejercicios de un día, si la rutina es compartida por 2+ días se pregunta el alcance: solo ese día o todos los días que usan esa misma rutina (PDF #3, #4, #5, refinado en el feedback hablado).
  - Enfoque de datos final ("fork on edit"): `week`/`dayOverrides` siguen guardando un id de `routines[]` como antes (sin migrar datos existentes); recién al editar el contenido desde un día compartido se pregunta el alcance, y "solo este día" clona la rutina con un id nuevo en vez de mantener copias por defecto desde la asignación.
  - Sumado durante el brainstorming: toggles de días de la semana ("Días asignados") dentro del propio editor de rutina, para asignar la misma rutina a otros días sin salir del editor.
  - Descartado por ahora: navegar a semanas futuras/pasadas desde la tira semanal (se evaluará más adelante, y si se hace, sin permitir editar esas semanas).
  - Verificación final end-to-end (los 10 puntos del testing checklist de la spec, incluyendo fork "solo este día"/"todos esos días", freestyle desde día vacío y desde el selector, y regresión de back-navigation) pasó sin encontrar bugs nuevos.
- [x] **Sub-proyecto 3 — Editor de ejercicios de rutina** — hecho (2026-09-18, ver `docs/superpowers/specs/2026-09-17-series-con-peso-planificado-design.md` y `docs/superpowers/plans/2026-09-17-series-con-peso-planificado.md`):
  - Botón "Terminar"/"Guardar" explícito al editar una rutina, y renombrado "set" → "serie" en toda la app (hecho como parte de la rama previa, ver commit `289729e`).
  - El editor de rutina pasó de "cantidad de series + reps objetivo" a un modelo de series individuales editables, cada una con su propio peso y reps, con toggles "Mismo peso"/"Mismas reps para todas las series"; un toggle "Progresión automática" en Ajustes (default activado) permite desactivar la progresión automática por serie y dejar que el plan de la rutina mande siempre. Verificación final end-to-end (los 10 puntos del testing checklist de la spec) pasó sin encontrar bugs nuevos.
- [x] **Sub-proyecto 4 — Ajuste post-lanzamiento (feedback de Raúl tras probar la v1.0)** — hecho (2026-09-18, ver commits `7102f63` y `d7b98db`):
  - Sacados los toggles "Mismo peso"/"Mismas reps para todas las series" del editor de rutina (introducidos en el Sub-proyecto 3, arriba): se juzgaron innecesarios porque "+ Serie" ya copia el valor de la serie anterior, que se puede editar a mano.
  - Las rutinas forkeadas "solo para este día" (Sub-proyecto 2, rutinas independientes por día) ahora se marcan `hidden:true` y dejan de aparecer en la lista de Rutinas, en el selector de "Empezar" y en el selector de reasignación de un día — solo las rutinas permanentes/compartidas se listan ahí.
  - Al arrancar una sesión, cada serie se precarga con los valores reales de la última vez que se hizo ese ejercicio (no con el plan estático de la rutina ni con una sugerencia auto-aplicada); si "Progresión automática" está activada, la sugerencia se muestra como texto ("Probá: ...") al lado del ejercicio en vez de cargarse sola en los inputs.
  - Versión de la app subida a v1.1 con el changelog correspondiente (ver constante `CHANGELOG` en `index.html`).

## Marca blanca por gimnasio (2026-09-21)

- [x] **Branding configurable por gimnasio (white-label)** — hecho (2026-09-21, ver `docs/superpowers/specs/2026-09-21-white-label-branding-design.md` y `docs/superpowers/plans/2026-09-21-white-label-branding.md`):
  - Color de acento parametrizado vía variables CSS `--accent`/`--accent-rgb`, con todo el `#FFD200` hardcodeado de la app reapuntado a ellas.
  - Tabla `GYM_BRANDING` (vacía por default, una entrada por hostname) + `currentBranding()`/`hexToRgb()`/`applyBranding()`: aplica color de acento, `theme-color` de la meta tag, y nombre/tagline/logo en el header y en el título de la pestaña.
  - Header muestra nombre, logo y tagline del gym cuando hay branding activo; sin branding, sigue mostrando "HIERRO v1.1" como siempre.
  - Frases motivacionales configurables por gym vía `quotesMode` ('default' = las `QUOTES` de HIERRO, 'custom' = lista propia del gym, 'none' = sin frase).
  - Footer "Desarrollado por HIERRO" en Ajustes cuando la app está brandeada (o el texto propio de `poweredBy` si el gym lo pisa).
  - Verificación final end-to-end con un gym de prueba completo (todos los campos a la vez) confirmó que color de acento, header, frases y footer conviven sin pisarse entre sí, y que sin ningún gym configurado (`GYM_BRANDING` vacío) la app queda indistinguible de HIERRO original.

_Última actualización: 2026-09-21 (branding white-label por gimnasio) — roadmap A–I completo + 2 de 3 ideas sueltas + rediseño Inicio/Rutinas/Stats completo + los 4 sub-proyectos del feedback de Raúl completos + branding white-label por gimnasio completo._
