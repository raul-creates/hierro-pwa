# Personalización por gym (white-label) — Design

**Fecha:** 2026-09-21

## Contexto

HIERRO va a empezar a probarse con usuarios reales a través de gimnasios amigos — el primero es Power Gimnasio ("TU GYM EN EL CENTRO", logo P rojo/negro/blanco, dueño amigo de Raúl). El pedido explícito: que cada gym pueda tener su propia identidad (nombre, logo, color de marca, frases motivacionales) sin fragmentar el código — **una sola base de código, un solo repo, un solo deploy por gym pero mismo origen**, de forma que cualquier feature nueva (como la de series con peso de esta misma sesión) llegue automáticamente a todos los gyms en el próximo deploy, sin trabajo extra por gym.

Decisión de mecanismo: cada gym va a tener su propio dominio/web (no un query param ni subdominios de un dominio compartido). Eso significa que `location.hostname` es distinto por gym en producción, y es la señal natural para elegir qué marca mostrar — sin necesidad de configuración de build, login, ni backend.

## Diseño

### A. `GYM_BRANDING` — tabla de configuración por hostname

Un objeto constante en `index.html`, agregado una sola vez por gym nuevo, sin tocar ninguna otra parte del código:

```js
const GYM_BRANDING = {
  'powergimnasio.com': {
    name: 'POWER GIMNASIO',
    tagline: 'TU GYM EN EL CENTRO',
    logo: null, // URL a un PNG/SVG con fondo transparente, cuando Fer lo provea — null = usa el nombre como texto
    accent: '#C41E3A',
    quotesMode: 'default', // 'default' | 'custom' | 'none'
    customQuotes: null, // array de strings, solo si quotesMode==='custom'
    poweredBy: null, // null = usa el default "Desarrollado por HIERRO"
  },
};
function currentBranding(){ return GYM_BRANDING[location.hostname] || null; }
```

`currentBranding()` devuelve `null` para cualquier hostname no listado (desarrollo local, el dominio propio de HIERRO, etc.) — en ese caso la app se comporta exactamente como hoy, sin ninguna rama de código nueva ejecutándose. Agregar Power Gimnasio de verdad es sumar una entrada a este objeto; no requiere tocar `renderPlanSemanal`, el editor de rutinas, ni ninguna otra lógica — la tabla es el único lugar que un gym nuevo toca.

**`manifest.json` (ícono/nombre al instalar la PWA) queda fuera de esta tabla**: como cada gym tiene su propio dominio/deploy, ese archivo se edita una única vez a mano por gym al configurar su dominio (no es parte de la lógica compartida ni se actualiza con cada feature — es config de infraestructura, no de producto).

### B. Aplicar la marca al arrancar

Nueva función `applyBranding()`, llamada al principio de `init()` (antes de renderizar nada):

```js
function applyBranding(){
  const b = currentBranding();
  if(!b) return; // HIERRO por defecto, nada que hacer
  document.title = `${b.name} — Training Log`;
  document.getElementById('header-name').textContent = b.name;
  if(b.tagline) document.getElementById('header-tagline').textContent = b.tagline;
  if(b.logo){
    document.getElementById('header-name').style.display='none';
    const img=document.getElementById('header-logo');
    img.src=b.logo; img.style.display='block';
  }
  if(b.accent){
    document.documentElement.style.setProperty('--accent', b.accent);
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(b.accent));
  }
  document.getElementById('settings-powered-by').textContent = b.poweredBy || 'Desarrollado por HIERRO';
}
function hexToRgb(hex){
  const h=hex.replace('#','');
  const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h, 16);
  return `${(n>>16)&255},${(n>>8)&255},${n&255}`;
}
```

### C. Header: nombre/logo + tagline

Estructura actual (`index.html`, header de Inicio): `<div class="wordmark">HIERRO <span id="header-version">...</span></div><div class="sub" id="log-quote"></div>`.

Pasa a:
```html
<div class="logo-block">
  <div class="wordmark">
    <span id="header-name">HIERRO <span class="app-version" id="header-version"></span></span>
    <img id="header-logo" style="display:none;height:28px" alt="">
  </div>
  <span class="header-tagline" id="header-tagline"></span>
  <div class="sub" id="log-quote"></div>
</div>
```
Sin marca (HIERRO): `header-tagline` queda vacío (no ocupa espacio visible), todo se ve exactamente igual que hoy. Con marca: `header-name` se oculta y `header-logo` se muestra si hay `logo`; si no hay `logo`, `header-name` se actualiza con el nombre del gym (sin el badge de versión — la versión de HIERRO no es relevante para la marca del gym, sigue visible en Ajustes). `header-tagline` muestra el tagline al lado del nombre, chico y gris.

### D. Frases motivacionales (`quotesMode`)

`randomQuote()` (hoy siempre lee de `QUOTES`) pasa a resolver la lista según la marca activa:

```js
function activeQuotes(){
  const b=currentBranding();
  if(!b || b.quotesMode==='default' || !b.quotesMode) return QUOTES;
  if(b.quotesMode==='custom' && Array.isArray(b.customQuotes) && b.customQuotes.length) return b.customQuotes;
  return []; // 'none', o 'custom' mal configurado sin frases cargadas
}
function randomQuote(){ const q=activeQuotes(); return q.length ? q[Math.floor(Math.random()*q.length)] : ''; }
```
Con `quotesMode:'none'` (o un `'custom'` sin `customQuotes`), `log-quote` queda vacío — no se muestra nada en esa línea, sin necesidad de ocultar el elemento (una frase vacía ya no ocupa espacio visual notorio, mismo patrón que hoy usa `.sub` para texto opcional).

### E. Ajustes: "Desarrollado por HIERRO"

Nuevo campo al final de `view-settings`, después del grupo de "Versión":
```html
<div style="text-align:center;color:#6B6E7A;font-size:12px;padding:16px 0 4px" id="settings-powered-by">Desarrollado por HIERRO</div>
```
`applyBranding()` lo sobreescribe si el gym define `poweredBy`; si no, queda el default. Para HIERRO sin marca, este texto simplemente no tiene sentido mostrarlo (sería "Desarrollado por HIERRO" en la propia app HIERRO) — se deja oculto (`display:none` por defecto) y `applyBranding()` lo muestra (`display:block`) solo cuando hay una marca activa.

### F. Color de acento (`--accent`)

Se define `:root { --accent:#FFD200; --accent-rgb:255,210,0; }` en el bloque `<style>`, y **todo** uso del literal `#FFD200` en el archivo (37 líneas / 41 apariciones al momento de este spec, tanto en el `<style>` como en estilos inline generados por JS) se reemplaza por `var(--accent)`. Las dos reglas que usan el amarillo con transparencia (`rgba(255,210,0,0.09)`, `rgba(255,210,0,0.2)`, `rgba(255,210,0,0.3)`, `rgba(255,210,0,0.07)` — 4 apariciones en 2 reglas, `.mtag` y `.gd-badge.hl`) se reemplazan por `rgba(var(--accent-rgb), <mismo alpha>)`, aprovechando `--accent-rgb` que `applyBranding()` ya calcula.

Ningún otro color (fondo oscuro, superficies, grises de texto, rojos de error) se vuelve configurable — decisión explícita del usuario para mantener consistencia visual entre gyms y acotar el refactor.

## Fuera de alcance (decidido explícitamente por el usuario)

- Selección de gym por query param o subdominio — cada gym tiene dominio propio, se detecta por `location.hostname`.
- Personalizar `manifest.json` (ícono/nombre al instalar como PWA) desde la tabla compartida — es config de infraestructura por dominio, se edita una vez a mano por gym.
- Customizar cualquier color más allá del acento (fondo, superficies, grises).
- Backend, panel de administración, o cualquier forma de que el gym edite su propia marca sin tocar código — por ahora la tabla `GYM_BRANDING` la edita Raúl a mano por gym nuevo, consistente con "pocas o ninguna personalización, deployment simple".

## Testing

Sin test runner en este repo (single-file, sin build). Verificación manual en navegador, sirviendo localmente. Como `location.hostname` no se puede reasignar de forma confiable desde la consola, se prueba agregando una entrada temporal a `GYM_BRANDING` con la clave `'localhost'` (que sí matchea el hostname real del servidor local) y llamando `applyBranding()` — se saca esa entrada de prueba antes de comitear. Cubriendo:

1. Sin ninguna entrada de `GYM_BRANDING` matcheando (comportamiento actual): confirmar que la app se ve exactamente igual que antes de este cambio — mismo header, mismo acento amarillo, mismas frases, sin el texto de "Desarrollado por HIERRO" en Ajustes.
2. Con una entrada de prueba (nombre, tagline, accent rojo, sin logo, `quotesMode:'default'`): confirmar que el header muestra el nombre y tagline del gym, el acento cambia a rojo en botones/tabs activos/highlights (incluida al menos una de las dos reglas con transparencia, ej. los tags `.mtag`), las frases motivacionales siguen siendo las de `QUOTES`, y Ajustes muestra "Desarrollado por HIERRO" al pie.
3. Con `logo` configurado (una URL de imagen de prueba): confirmar que el logo reemplaza el nombre de texto en el header.
4. Con `quotesMode:'custom'` y `customQuotes` cargado: confirmar que las frases mostradas salen de esa lista, nunca de `QUOTES`.
5. Con `quotesMode:'none'`: confirmar que la línea de frase queda vacía, sin texto ni error en consola.
6. Con `poweredBy` custom: confirmar que Ajustes muestra ese texto en vez del default.
7. Confirmar visualmente que el gráfico de progresión (modo guiado) y el glosario, que también usan el amarillo, respetan el nuevo acento cuando está configurado.
