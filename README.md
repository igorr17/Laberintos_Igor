# Laberintos_Igor
# Laboratorio de rutas y algoritmos de búsqueda

Visualizador interactivo de búsqueda de rutas sobre una cuadrícula de 20×20, con nodo de
inicio, objetivos múltiples, muros, celdas con peso personalizado y cuatro algoritmos de
búsqueda (BFS, DFS, UCS y A*).

## Objetivo

El enunciado pedía reconstruir, sin plantilla ni código de partida, el laboratorio de rutas
mostrado en clase: un tablero editable de 20×20 donde se pudiera definir un inicio, una o
varias metas, obstáculos y celdas con coste, y comparar sobre el mismo mapa cómo se
comportan BFS, DFS, UCS y A*. La idea no era solo que los algoritmos dieran el resultado
correcto, sino que se pudiera *ver* cómo cada uno explora el tablero de forma distinta, y
por qué llegan a rutas distintas cuando hay pesos de por medio.

## Tecnologías

- HTML, CSS y JavaScript puros — sin frameworks ni librerías externas.
- Se descartó cualquier framework porque, para un tablero de 20×20, añadir una capa extra
  solo suma peso y complejidad sin aportar nada: la aplicación necesitaba cargar rápido,
  no depender de instalar nada, y funcionar igual en local que subida a Netlify. Con los
  tres archivos sueltos (`index.html`, `style.css`, `script.js`) alcanza de sobra.

## Cómo usarlo

1. Clona el repositorio o descarga los tres archivos (`index.html`, `style.css`, `script.js`)
   en la misma carpeta.
2. Abre `index.html` en el navegador (funciona sin servidor, o desplegado en Netlify).
3. Elige una herramienta (Inicio, Objetivo, Muro, Peso, Borrar) y dibuja sobre la cuadrícula,
   o carga uno de los escenarios del menú "Escenario".
4. Elige un algoritmo, ajusta la velocidad si quieres, y pulsa "Ejecutar".
5. Usa el menú de arriba para mostrar u ocultar la exploración, comparar los cuatro
   algoritmos a la vez, pausar la animación o mezclar el tablero al azar.

## Algoritmos implementados

- **BFS** (búsqueda en anchura) — menor número de pasos; ignora los pesos.
- **DFS** (búsqueda en profundidad) — encuentra una ruta, no necesariamente la mejor.
- **UCS** (coste uniforme) — menor coste total, teniendo en cuenta los pesos.
- **A\*** — igual que UCS pero usando la distancia Manhattan como estimación hacia el
  objetivo más cercano; llega al mismo coste óptimo explorando muchas menos celdas.

Ver las secciones 3 y 4 del informe técnico para el detalle de estructura de datos, criterio
de selección, tratamiento de visitados, reconstrucción de la ruta y la heurística de A*.

## Los cuatro escenarios de desafío

| # | Escenario | Qué pone a prueba | Algoritmo recomendado |
|---|-----------|--------------------|------------------------|
| 1 | Ruta más corta por una abertura | Menos pasos, sin pesos | BFS |
| 2 | Desvío alrededor de terreno costoso | Coste con pesos altos | UCS |
| 3 | Recorrido más barato de tres objetivos | Varias metas + coste | A* |
| 4 | Objetivo encerrado | Mapa sin solución | BFS (o cualquiera) |

## Pruebas realizadas

El detalle completo, con capturas, está en la sección 5 del informe técnico ("Casos de
prueba obligatorios"). Resumen:

| Caso | Resultado |
|---|---|
| Ruta simple (sin muros ni pesos) | Encuentra la ruta más corta posible entre inicio y objetivo. |
| Ausencia de objetivo | La aplicación avisa ("Coloca al menos un objetivo...") y no ejecuta nada. |
| Varias metas | Visita los objetivos del más cercano al más lejano. |
| Pesos | UCS y A* rodean el bloque de celdas caras en vez de cruzarlo. |
| Obstáculos | BFS encuentra la abertura más cercana en el muro. |
| Mapa sin solución | Explora todo lo alcanzable y termina en "No se encontró ruta." |
| Edición tras ejecutar | Dibujar sobre el tablero después de una búsqueda borra la ruta anterior sola. |

Nota sobre "ausencia de inicio": el nodo de inicio no se puede borrar (solo mover), así que
esa situación no llega a darse — no hace falta que la aplicación la detecte porque el
propio diseño la hace imposible.

## Limitaciones conocidas

- UCS y A* buscan el nodo de menor coste revisando la lista completa de candidatos en cada
  paso, en vez de usar una cola de prioridad real (montículo binario). No se nota en una
  cuadrícula de 20×20 —todas las búsquedas tardan menos de tres milisegundos—, pero no
  escalaría bien a mapas mucho más grandes.
- No hay una penalización configurable específica por objetivo: todas las celdas objetivo
  cuestan lo mismo que cualquier otra celda transitable.
- El peso de una celda va de 2 a 99; no admite decimales ni valores negativos.
- "Mezclar" reintenta hasta 40 veces si el tablero aleatorio deja algún objetivo aislado;
  en tableros muy densos de muros podría tardar un poco más de lo normal en encontrar uno
  válido.

## Enlaces

- Repositorio: [añadir aquí la URL de GitHub]
- Demo en Netlify: [añadir aquí la URL de Netlify]
- Informe técnico: `informe_tecnico_visualizador_rutas.pdf`

## Uso de asistentes de IA

Ver la sección 8 del informe técnico para el registro completo: herramienta usada,
consultas representativas, qué se aceptó tal cual y qué se modificó, y cómo se verificó
cada resultado.
