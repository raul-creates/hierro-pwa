# HIERRO Training Log — PWA

## Cómo publicar en GitHub Pages (5 minutos)

### 1. Crear repositorio
- Ir a github.com → New repository
- Nombre: `hierro-training-log` (o el que quieras)
- Público ✓ → Create repository

### 2. Subir los archivos
Subir estos 5 archivos al repositorio (arrastrándolos directamente en GitHub):
- `index.html`
- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-512.png`

### 3. Activar GitHub Pages
- Settings → Pages
- Source: Deploy from a branch
- Branch: main / (root)
- Save

En 1-2 minutos la app va a estar en:
`https://TU-USUARIO.github.io/hierro-training-log/`

### 4. Instalar como app en el celu
- Abrir la URL en Chrome (Android) o Safari (iOS)
- Android: menú ⋮ → "Añadir a pantalla de inicio"
- iOS: botón compartir → "Agregar a pantalla de inicio"

## Notas
- El log de sesiones se guarda en localStorage del dispositivo
- Las imágenes y GIFs de ejercicios requieren internet la primera vez
- Una vez vistas, las imágenes quedan cacheadas offline
