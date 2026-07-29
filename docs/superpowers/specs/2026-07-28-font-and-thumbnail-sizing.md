# HIERRO — Fuente más grande y miniaturas de ejercicio más grandes

Fecha: 2026-07-28

## Contexto

Feedback de uso real: el texto de la app es muy chico en general, y las
miniaturas de ejercicio (tanto en la lista de la Guía como en el picker del
editor de sesiones — es el mismo componente compartido,
`renderExerciseListItem`) son demasiado chicas para reconocer visualmente
el ejercicio.

## Alcance

Cambio puramente visual (CSS). No se toca HTML estructural, JS, ni el
modelo de datos. No se modifica el GIF grande del detalle de cada ejercicio
(280px) — la queja era específicamente sobre las miniaturas chicas de la
lista, no sobre el detalle.

## Regla de escalado de fuente

La app usa `font-size` en `px` fijos en cada selector (no `rem`/`em`), así
que no alcanza con subir un único valor base — hay que subir cada tamaño
usado individualmente. Regla pareja aplicada a **todas** las declaraciones
`font-size` del archivo (`<style>` y los `style=` inline generados por JS):

| Tamaño actual | Tamaño nuevo |
|---|---|
| 9px | 11px |
| 10px | 12px |
| 11px | 13px |
| 12px | 14px |
| 13px (incluye `html,body`, el tamaño base) | 15px |
| 14px | 16px |
| 15px+ | +2px sobre el valor actual |

Mismo criterio en todo el archivo (Log, Editor, Guía, Stats, picker,
loader) — sin excepciones ni casos especiales.

**Por qué es seguro**: nada en el CSS usa `em`/`rem` relativo al tamaño
base de `html,body`, así que subir ese valor de 13px a 15px no dispara
efectos en cadena — es un cambio aislado como cualquier otro de la tabla.

## Miniaturas de ejercicio

- `.gex-img-wrap` (thumbnail cuadrado, usado en la lista de la Guía y en
  el picker del editor — mismo componente): de **44×44px a 60×60px**
  (+36%).
- `.guide-list` (columna donde vive la lista con las miniaturas): de
  **160px a 180px** de ancho, para que la miniatura más grande y el
  nombre del ejercicio (que también crece por la regla de fuente) entren
  cómodos sin apretarse.

## Verificación

Sin test runner. Verificación manual en browser:

1. Confirmar visualmente que el texto en Log, Editor, Guía y Stats se lee
   más grande que antes, sin que ningún elemento se corte o se superponga
   (en particular la bottom-nav de 56px fijos, y los inputs de peso/reps
   del editor).
2. En la Guía y en el picker del editor, confirmar que las miniaturas
   ahora se ven a 60×60px y el ejercicio se reconoce visualmente mejor
   que antes.
3. Confirmar que la columna de la lista de la Guía sigue sin desbordar ni
   tapar el panel de detalle a la derecha.
