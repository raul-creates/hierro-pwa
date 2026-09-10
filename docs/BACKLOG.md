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

_Última actualización: 2026-09-10 (swipe para borrar, avisos del admin del gym) — roadmap A–I completo + 2 de 3 ideas sueltas._
