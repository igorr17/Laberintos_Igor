const N = 20;
const gridEl = document.getElementById('grid');
const msgEl = document.getElementById('message');
const speedEl = document.getElementById('speed');
const algoEl = document.getElementById('algo');
const weightEl = document.getElementById('weightValue');
const runBtn = document.getElementById('run');

const M = {};
document.querySelectorAll('[data-m]').forEach(e => { M[e.dataset.m] = e; });
const setM = (k, v) => { M[k].textContent = v; };
function resetMetrics() {
  ['reached', 'explored', 'steps', 'cost', 'compute', 'anim'].forEach(k => setM(k, '–'));
  setM('status', 'Listo');
  M.status.className = '';
}
function boardStats() {
  let w = 0, x = 0;
  for (let i = 0; i < N * N; i++) { if (walls[i]) w++; else if (weight[i] > 1) x++; }
  setM('walls', w); setM('weighted', x); setM('targets', targets.size);
}
const exploreBtn = document.getElementById('exploreBtn');
const compareBtn = document.getElementById('compareBtn');
const pauseBtn = document.getElementById('pauseBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
let paused = false;
function syncPause() {
  pauseBtn.classList.toggle('on', paused);
  pauseBtn.querySelector('span').textContent = paused ? 'Reanudar' : 'Pausar';
}
const scenarioEl = document.getElementById('scenario');
const scenarioInfo = document.getElementById('scenarioInfo');

const walls = new Uint8Array(N * N);
const weight = new Uint8Array(N * N).fill(1);
const targets = new Set();
let start = 9 * N + 3;
let running = false;
let runId = 0;
let painting = false;
let paintMode = null;
let drag = null;

const cells = [];
for (let i = 0; i < N * N; i++) {
  const d = document.createElement('div');
  d.className = 'cell';
  d.dataset.i = i;
  gridEl.appendChild(d);
  cells.push(d);
}

function defaults() {
  walls.fill(0); weight.fill(1); targets.clear();
  start = 9 * N + 3;
  targets.add(9 * N + 16);
}

function render(i) {
  const c = cells[i];
  const keep = c.classList.contains('visited') ? ' visited' : c.classList.contains('path') ? ' path' : '';
  c.className = 'cell' + keep + (walls[i] ? ' wall' : '') + (i === start ? ' start' : '') + (targets.has(i) ? ' target' : '');
  const w = weight[i];
  if (w > 1 && !walls[i] && i !== start && !targets.has(i)) {
    c.textContent = w;
    c.style.background = `hsl(38 85% ${Math.max(45, 80 - w * 1.5)}%)`;
  } else {
    c.textContent = '';
    c.style.background = '';
  }
}
const renderAll = () => cells.forEach((_, i) => render(i));

function say(text, type) {
  msgEl.textContent = text;
  msgEl.className = text ? `show ${type}` : '';
}

function clearPath() {
  runId++;
  running = false;
  setLocked(false);
  cells.forEach((c, i) => {
    c.classList.remove('visited', 'path', 'reached');
    render(i);
  });
  say('', '');
  resetMetrics();
}

function setLocked(on) {
  running = on;
  gridEl.classList.toggle('locked', on);
  runBtn.disabled = on;
  algoEl.disabled = on;
  scenarioEl.disabled = on;
  compareBtn.disabled = on;
  shuffleBtn.disabled = on;
  pauseBtn.disabled = !on;
  if (!on) { paused = false; syncPause(); }
}

/* ---------- Editing ---------- */
function currentTool() {
  return document.querySelector('input[name="tool"]:checked').value;
}

function apply(i, first) {
  const tool = currentTool();
  if (tool === 'start') {
    if (walls[i]) return;
    targets.delete(i); weight[i] = 1;
    const old = start; start = i; render(old);
  } else if (tool === 'target') {
    if (i === start) return;
    if (first) paintMode = targets.has(i) ? 'remove' : 'add';
    if (paintMode === 'add') { targets.add(i); walls[i] = 0; weight[i] = 1; }
    else targets.delete(i);
  } else if (tool === 'wall') {
    if (i === start || targets.has(i)) return;
    if (first) paintMode = walls[i] ? 'remove' : 'add';
    walls[i] = paintMode === 'add' ? 1 : 0;
    weight[i] = 1;
  } else if (tool === 'weight') {
    if (i === start || targets.has(i)) return;
    const w = Math.min(99, Math.max(2, parseInt(weightEl.value, 10) || 2));
    walls[i] = 0; weight[i] = w;
  } else if (tool === 'erase') {
    if (i === start) return;
    walls[i] = 0; weight[i] = 1; targets.delete(i);
  }
  render(i);
  boardStats();
}

function cellFromEvent(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  return el && el.classList.contains('cell') ? +el.dataset.i : -1;
}

gridEl.addEventListener('pointerdown', e => {
  if (running) return;
  const i = cellFromEvent(e);
  if (i < 0) return;
  e.preventDefault();
  if (cells.some(c => c.classList.contains('visited') || c.classList.contains('path'))) clearPath();
  // Grab the start or a target to move it (use the Erase tool to delete a target).
  if (i === start) { drag = { type: 'start', at: i }; return; }
  if (targets.has(i) && currentTool() !== 'erase') { drag = { type: 'target', at: i }; return; }
  painting = true;
  apply(i, true);
});
gridEl.addEventListener('pointermove', e => {
  if (running) return;
  const i = cellFromEvent(e);
  if (i < 0) return;
  if (drag) {
    if (i === drag.at || walls[i] || i === start || targets.has(i)) return;
    weight[i] = 1;
    if (drag.type === 'start') start = i; else { targets.delete(drag.at); targets.add(i); }
    const old = drag.at; drag.at = i;
    render(old); render(i); boardStats();
  } else if (painting) {
    apply(i, false);
  }
});
const endDrag = () => { painting = false; drag = null; };
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

/* ---------- Algorithms ---------- */
function neighbors(i) {
  const r = (i / N) | 0, c = i % N, out = [];
  if (r > 0) out.push(i - N);
  if (c < N - 1) out.push(i + 1);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  return out.filter(j => !walls[j]);
}

function heuristic(i, goals) {
  const r = (i / N) | 0, c = i % N;
  let m = Infinity;
  for (const g of goals) m = Math.min(m, Math.abs(r - ((g / N) | 0)) + Math.abs(c - (g % N)));
  return m;
}

function search(s, goals, algo) {
  const parent = new Int16Array(N * N).fill(-1);
  const seen = new Uint8Array(N * N);
  const visited = [];
  let goal = -1;

  if (algo === 'bfs') {
    const q = [s]; seen[s] = 1;
    for (let k = 0; k < q.length; k++) {
      const u = q[k]; visited.push(u);
      if (goals.has(u)) { goal = u; break; }
      for (const v of neighbors(u)) if (!seen[v]) { seen[v] = 1; parent[v] = u; q.push(v); }
    }
  } else if (algo === 'dfs') {
    const stack = [[s, -1]];
    while (stack.length) {
      const [u, p] = stack.pop();
      if (seen[u]) continue;
      seen[u] = 1; parent[u] = p; visited.push(u);
      if (goals.has(u)) { goal = u; break; }
      for (const v of neighbors(u).reverse()) if (!seen[v]) stack.push([v, u]);
    }
  } else {
    const dist = new Float64Array(N * N).fill(Infinity);
    dist[s] = 0;
    const open = [s];
    const f = i => dist[i] + (algo === 'astar' ? heuristic(i, goals) : 0);
    while (open.length) {
      let b = 0;
      for (let k = 1; k < open.length; k++) if (f(open[k]) < f(open[b])) b = k;
      const u = open.splice(b, 1)[0];
      if (seen[u]) continue;
      seen[u] = 1; visited.push(u);
      if (goals.has(u)) { goal = u; break; }
      for (const v of neighbors(u)) {
        const nd = dist[u] + weight[v];
        if (nd < dist[v]) { dist[v] = nd; parent[v] = u; if (!open.includes(v)) open.push(v); }
      }
    }
  }

  if (goal < 0) return { visited, path: null };
  const path = [];
  for (let n = goal; n !== s; n = parent[n]) path.push(n);
  path.reverse();
  return { visited, path, goal, cost: path.reduce((a, n) => a + weight[n], 0) };
}

/* ---------- Animation ---------- */
// Reads the slider on every step, so speed changes apply immediately.
function sleep() {
  const v = +speedEl.value;
  const ms = Math.round(250 * Math.pow((100 - v) / 99, 2)) + 2;
  return new Promise(res => {
    const go = () => (paused ? setTimeout(go, 80) : setTimeout(res, ms));
    go();
  });
}

async function run() {
  if (running) return;
  clearPath();
  if (!targets.size) { say('Coloca al menos un objetivo y vuelve a ejecutar.', 'warn'); return; }

  const token = runId;
  setLocked(true);
  say('Buscando…', 'info');
  resetMetrics();
  setM('status', 'Buscando…'); M.status.className = 'running';
  setM('reached', `0 / ${targets.size}`);
  ['explored', 'steps', 'cost'].forEach(k => setM(k, 0));
  const t0 = performance.now();
  let compute = 0;
  const tick = () => setM('anim', ((performance.now() - t0) / 1000).toFixed(1) + ' s');

  const algo = algoEl.value;
  const remaining = new Set(targets);
  let from = start, steps = 0, cost = 0, explored = 0, reached = 0;

  while (remaining.size) {
    cells.forEach(c => c.classList.remove('visited'));
    const c0 = performance.now();
    const r = search(from, remaining, algo);
    compute += performance.now() - c0;
    setM('compute', compute.toFixed(2) + ' ms');
    const base = explored;
    explored += r.visited.length;
    let n = 0;

    for (const i of r.visited) {
      if (token !== runId) return;
      if (i !== start && !targets.has(i)) cells[i].classList.add('visited');
      setM('explored', base + ++n); tick();
      await sleep();
    }
    if (!r.path) break;

    let k = 0, pc = 0;
    for (const i of r.path) {
      if (token !== runId) return;
      if (!targets.has(i)) cells[i].classList.add('path');
      k++; pc += weight[i];
      setM('steps', steps + k); setM('cost', cost + pc); tick();
      await sleep();
    }
    cells[r.goal].classList.add('reached');
    steps += r.path.length; cost += r.cost; reached++;
    setM('reached', `${reached} / ${targets.size}`);
    remaining.delete(r.goal);
    from = r.goal;
  }

  if (token !== runId) return;
  setLocked(false);
  const total = targets.size;
  tick();
  const done = reached === total;
  setM('status', done ? 'Ruta encontrada' : reached > 0 ? 'Ruta parcial' : 'Sin ruta');
  M.status.className = done ? 'ok' : 'warn';
  if (reached === total) {
    const label = total === 1 ? 'el objetivo' : `los ${total} objetivos`;
    say(`¡Éxito! Ruta encontrada hasta ${label}: ${steps} pasos, costo total ${cost}, ${explored} celdas exploradas.`, 'success');
  } else if (reached > 0) {
    say(`Se alcanzaron ${reached} de ${total} objetivos (${steps} pasos, costo ${cost}). Los muros bloquean el resto.`, 'warn');
  } else {
    say('No se encontró ruta. Los muros bloquean todos los objetivos.', 'warn');
  }
}

/* ---------- Definitions ---------- */
const DEFS = {
  bfs: {
    name: 'Búsqueda en anchura (BFS)',
    text: 'Explora hacia afuera desde el inicio en anillos, un paso más lejos cada vez, usando una cola. La primera vez que llega a un objetivo, lo hace con el menor número posible de pasos.',
    facts: [['Menos pasos', 'Sí'], ['Usa pesos', 'No'], ['Estructura de datos', 'Cola']]
  },
  dfs: {
    name: 'Búsqueda en profundidad (DFS)',
    text: 'Sigue un camino hasta donde puede y solo retrocede en los callejones sin salida, usando una pila. Suele encontrar una ruta rápido, pero esa ruta puede ser mucho más larga de lo necesario.',
    facts: [['Menos pasos', 'No'], ['Usa pesos', 'No'], ['Estructura de datos', 'Pila']]
  },
  ucs: {
    name: 'Búsqueda de costo uniforme (UCS)',
    text: 'Expande siempre la celda sin explorar más barata hasta el momento, donde entrar en una celda cuesta su peso. Garantiza el menor costo total, pero explora en todas direcciones.',
    facts: [['Menor costo', 'Sí'], ['Usa pesos', 'Sí'], ['Estructura de datos', 'Cola de prioridad']]
  },
  astar: {
    name: 'A*',
    text: 'Como la búsqueda de costo uniforme, pero ordena las celdas por el costo acumulado más una estimación en línea recta (distancia Manhattan) hasta el objetivo más cercano. Se orienta hacia la meta y suele explorar menos celdas, sin perder el menor costo.',
    facts: [['Menor costo', 'Sí'], ['Usa pesos', 'Sí'], ['Estructura de datos', 'Cola de prioridad + estimación']]
  }
};

function showDef() {
  const d = DEFS[algoEl.value];
  setM('algo', d.name);
  document.getElementById('algoDef').innerHTML =
    `<h3>${d.name}</h3><p>${d.text}</p><dl>` +
    d.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') + '</dl>';
}

/* ---------- Scenarios ---------- */
const H = (r, c1, c2) => { const a = []; for (let c = c1; c <= c2; c++) a.push([r, c]); return a; };
const V = (c, r1, r2, skip = []) => { const a = []; for (let r = r1; r <= r2; r++) if (!skip.includes(r)) a.push([r, c]); return a; };
const box = (r1, c1, r2, c2, w) => { const a = []; for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) a.push([r, c, w]); return a; };
const ring = (r1, c1, r2, c2) => [...H(r1, c1, c2), ...H(r2, c1, c2), ...V(c1, r1 + 1, r2 - 1), ...V(c2, r1 + 1, r2 - 1)];

const SCENARIOS = {
  steps: {
    algo: 'bfs', start: [10, 2], targets: [[10, 17]], walls: V(9, 0, 19, [4, 14]),
    info: 'Objetivo: cualquier ruta. DFS encuentra una, pero se aleja mucho de la línea recta. Cambia a BFS y ejecuta de nuevo para comparar.'
  },
  dfs: {
    algo: 'dfs', start: [10, 4], targets: [[10, 9]], walls: [],
    info: 'Goal: any route. DFS finds one but wanders far from the straight line. Switch to BFS and run again to compare.'
  },
  weights: {
    algo: 'ucs', start: [10, 2], targets: [[10, 17]], walls: [], weights: box(6, 7, 13, 12, 9),
    info: 'Objetivo: menor costo. El bloque sombreado cuesta 9 por celda, así que UCS lo rodea. Cambia a BFS para verlo atravesarlo de frente.'
  },
  cost: {
    algo: 'astar', start: [2, 2], targets: [[2, 17], [17, 17], [17, 2]], walls: V(10, 5, 14),
    weights: box(8, 3, 11, 16, 6),
    info: 'Objetivo: la ruta más barata a los tres objetivos. A* visita primero el más cercano y evita la costosa franja central cuando puede.'
  },
  nosol: {
    algo: 'bfs', start: [10, 3], targets: [[10, 15]], walls: ring(8, 13, 12, 17),
    info: 'Sin solución: el objetivo está encerrado entre muros. Espera "No se encontró ruta" tras explorar todo lo que se puede alcanzar.'
  },
  split: {
    algo: 'astar', start: [10, 4], targets: [[10, 15]], walls: V(10, 0, 19),
    info: 'Sin solución: un muro completo divide la cuadrícula en dos. Espera "No se encontró ruta".'
  },
  partial: {
    algo: 'ucs', start: [10, 3], targets: [[3, 16], [15, 16]], walls: ring(13, 13, 17, 18),
    info: 'Resultado parcial: un objetivo es alcanzable y el otro está encerrado. Espera un aviso tras alcanzar 1 de 2.'
  }
};

function loadScenario(id) {
  clearPath();
  if (id === 'custom') { scenarioInfo.textContent = 'Dibuja tu propio tablero con las herramientas de abajo.'; return; }
  const s = SCENARIOS[id];
  walls.fill(0); weight.fill(1); targets.clear();
  (s.weights || []).forEach(([r, c, w]) => { weight[r * N + c] = w; });
  s.walls.forEach(([r, c]) => { walls[r * N + c] = 1; weight[r * N + c] = 1; });
  start = s.start[0] * N + s.start[1];
  s.targets.forEach(([r, c]) => targets.add(r * N + c));
  algoEl.value = s.algo;
  showDef();
  renderAll();
  boardStats();
  scenarioInfo.textContent = s.info;
}

/* ---------- Wiring ---------- */
runBtn.addEventListener('click', run);
document.getElementById('clearPath').addEventListener('click', clearPath);
document.getElementById('reset').addEventListener('click', () => {
  clearPath(); defaults(); renderAll(); boardStats();
  scenarioEl.value = 'custom';
  scenarioInfo.textContent = 'Tablero reiniciado. Dibuja el tuyo o elige un escenario.';
});
algoEl.addEventListener('change', showDef);

/* ---------- Top menu ---------- */
exploreBtn.addEventListener('click', () => {
  const on = exploreBtn.getAttribute('aria-pressed') !== 'true';
  exploreBtn.setAttribute('aria-pressed', on);
  gridEl.classList.toggle('hide-explore', !on);
});

pauseBtn.addEventListener('click', () => {
  if (!running) return;
  paused = !paused;
  syncPause();
  setM('status', paused ? 'En pausa' : 'Buscando…');
});

function solveAll(algo) {
  const remaining = new Set(targets);
  let from = start, steps = 0, cost = 0, explored = 0, reached = 0;
  const t = performance.now();
  while (remaining.size) {
    const r = search(from, remaining, algo);
    explored += r.visited.length;
    if (!r.path) break;
    steps += r.path.length; cost += r.cost; reached++;
    remaining.delete(r.goal); from = r.goal;
  }
  return { algo, reached, steps, cost, explored, ms: performance.now() - t };
}

compareBtn.addEventListener('click', () => {
  if (running) return;
  if (!targets.size) { say('Coloca al menos un objetivo para comparar.', 'warn'); return; }
  const names = { bfs: 'BFS', dfs: 'DFS', ucs: 'UCS', astar: 'A*' };
  const rows = ['bfs', 'dfs', 'ucs', 'astar'].map(solveAll);
  const most = Math.max(...rows.map(r => r.reached));
  const tied = rows.filter(r => r.reached === most && most > 0);
  const best = k => (tied.length ? Math.min(...tied.map(r => r[k])) : null);
  const bs = best('steps'), bc = best('cost'), be = best('explored');
  const cls = (r, k, b) => (r.reached === most && b !== null && r[k] === b ? ' class="best"' : '');
  document.getElementById('cmpNote').textContent = most === 0
    ? 'Ningún algoritmo encontró ruta en este tablero.'
    : 'Se ejecutó cada algoritmo sobre el tablero actual. En verde, el mejor valor entre los que alcanzaron más objetivos. BFS y DFS ignoran los pesos al buscar.';
  document.getElementById('cmpTable').innerHTML =
    '<tr><th>Algoritmo</th><th>Objetivos</th><th>Celdas exploradas</th><th>Pasos</th><th>Costo</th><th>Tiempo</th></tr>' +
    rows.map(r => {
      const none = r.reached === 0;
      return `<tr><td>${names[r.algo]}</td>` +
        `<td${r.reached < targets.size ? ' class="bad"' : ''}>${r.reached} / ${targets.size}</td>` +
        `<td${cls(r, 'explored', be)}>${r.explored}</td>` +
        `<td${cls(r, 'steps', bs)}>${none ? '–' : r.steps}</td>` +
        `<td${cls(r, 'cost', bc)}>${none ? '–' : r.cost}</td>` +
        `<td>${r.ms.toFixed(2)} ms</td></tr>`;
    }).join('');
  document.getElementById('compareDlg').showModal();
});

function shuffleBoard() {
  clearPath();
  const rnd = n => Math.floor(Math.random() * n);
  for (let a = 0; a < 40; a++) {
    const density = Math.max(0.08, 0.28 - a * 0.006);
    walls.fill(0); weight.fill(1); targets.clear();
    for (let i = 0; i < N * N; i++) {
      const x = Math.random();
      if (x < density) walls[i] = 1;
      else if (x < density + 0.1) weight[i] = 2 + rnd(8);
    }
    const free = [];
    for (let i = 0; i < N * N; i++) if (!walls[i]) free.push(i);
    start = free.splice(rnd(free.length), 1)[0]; weight[start] = 1;
    for (let k = 1 + rnd(3); k > 0; k--) {
      const t = free.splice(rnd(free.length), 1)[0];
      weight[t] = 1; targets.add(t);
    }
    if ([...targets].every(t => search(start, new Set([t]), 'bfs').path)) break;
  }
  scenarioEl.value = 'custom';
  scenarioInfo.textContent = 'Tablero mezclado al azar (con ruta posible a cada objetivo). Ejecuta o compara algoritmos.';
  renderAll();
  boardStats();
}
shuffleBtn.addEventListener('click', shuffleBoard);
weightEl.addEventListener('input', () => {
  const w = Math.min(99, Math.max(2, parseInt(weightEl.value, 10) || 2));
  document.querySelector('.i-weight').textContent = w;
});
scenarioEl.addEventListener('change', () => loadScenario(scenarioEl.value));

showDef();
defaults();
renderAll();
boardStats();
setLocked(false);
