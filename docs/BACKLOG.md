# HIERRO — Backlog

Roadmap hacia paridad funcional con openGym, más ideas sueltas que todavía no entraron a la lista principal.

## Roadmap de paridad con openGym (A–I)

- [x] **A. Modo de entrenamiento guiado** — hecho, ver `docs/superpowers/plans/2026-09-01-guided-workout-mode.md`
- [x] **B. Progresión automática de peso/reps** — hecho (2026-09-02, doble progresión sobre rango implícito targetReps..+4)
- [x] **C. Estimación de 1RM** — hecho (2026-09-02, fórmula de Epley, tercer toggle en el gráfico de progresión de la Guía)
- [ ] **D. Supersets, peso corporal, reps por lado, cardio, esfuerzo** — descompuesto en sub-proyectos independientes (orden decidido):
  - [x] D1. Esfuerzo (RPE/RIR, configurable en Ajustes, un valor por ejercicio) — hecho (2026-09-02)
  - [x] D2. Peso corporal — hecho (2026-09-02, auto-detectado por equipment del dataset)
  - [x] D3. Reps por lado — hecho (2026-09-02, toggle manual en rutina + modo guiado, sin heurística de nombre)
  - [x] D4. Supersets — hecho (2026-09-02, linkedToNext suprime el rest timer entre ejercicios encadenados, sin rondas)
  - [ ] D5. Cardio
- [ ] **E. Compartir rutina por link/QR**
- [ ] **F. Backup/restore amigable**
- [ ] **G. Guía de instalación PWA**
- [ ] **H. Pasada de diseño (tamaños, tipografía)**
- [ ] **I. Glosario de términos**

## Ideas sueltas (aparte del roadmap A–I)

- **Avisos del admin del gym**: que el admin pueda mandar mensajes desde adentro de la app ("lunes cerrado por feriado nacional", "aumento de cuota en noviembre", etc). Encaja con el modelo white-label (cada gym comunicándose con sus alumnos desde su propia instancia de la app).
- **Swipe para borrar**: reemplazar los botones de borrar explícitos (sets, ejercicios, rutinas, sesiones del Log) por un gesto de swipe, aplicado consistentemente en toda la app. Surgió charlando D1 (RPE), es un cambio de patrón de interacción transversal, no parte de D.

_Última actualización: 2026-09-02 (D4)._
