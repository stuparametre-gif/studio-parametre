/* Maquette D — les vues du module 01
   ───────────────────────────────────────────────────────────
   Deux façons de lire les projets, dessinées en SVG dans
   le cadre du module :
   — réseau : les projets reliés à leurs artistes, leurs lieux,
     leurs années, et à leurs mots-clés (ce que le studio y a fait) ;
   — chrono : une horloge des années. Un anneau par an, chaque
     projet placé au mois de son ouverture.
   Aucune donnée n'est inventée : tout sort de js/data.js.      */

import { PROJECTS as P, TILE_PATH, TILE_BOX, TILE_RATIO } from '../js/data.js?v=048a54d5';

/* les mots-clés de chaque fiche, rôle compris : deux projets qui
   partagent « Plein air » ou « Accrochage » se trouvent reliés */
export const KEYS = P.map((p) => p.k);

const N = P.length;
export const pad2 = (i) => String(i + 1).padStart(2, '0');
export const venue = (p) => p.l.split(',')[0];
export const year = (p) => (/\d{4}/.exec(p.d) || [''])[0];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const month = (p) => { const m = new RegExp(`(${MOIS.join('|')})`).exec(p.d || ''); return m ? MOIS.indexOf(m[1]) : -1; };
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const [bx, by, bw, bh] = TILE_BOX.split(' ').map(Number);
const glyph = (h, cls = 'tl') => {
  const w = h * TILE_RATIO;
  return `<svg x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="visible"><path class="${cls}" d="${TILE_PATH}"/></svg>`;
};

/* ══ le réseau ═════════════════════════════════════════════ */

export const NODES = [], EDGES = [], BY = new Map();
function node(id, type, label, ref) {
  if (!BY.has(id)) { const n = { id, type, label, ref, x: 0, y: 0, vx: 0, vy: 0, nb: new Set() }; NODES.push(n); BY.set(id, n); }
  return BY.get(id);
}
P.forEach((p, i) => {
  const pn = node('p' + i, 'p', `${pad2(i)} ${p.t}`, i);
  const link = (n) => { EDGES.push([pn, n]); pn.nb.add(n); n.nb.add(pn); };
  link(node('a:' + p.a, 'a', p.a.toLowerCase()));
  link(node('l:' + venue(p), 'l', venue(p)));
  if (year(p)) link(node('y:' + year(p), 'y', year(p)));
  KEYS[i].forEach((k) => link(node('k:' + k, 'k', k)));
});

/* disposition par forces, calculée une fois pour une taille donnée */
let laidFor = '';
function layout(w, h, compact) {
  const key = `${w | 0}x${h | 0}`;
  if (key === laidFor) return;
  laidFor = key;
  const L = Math.min(w, h) * (compact ? 0.11 : 0.13);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  NODES.forEach((n) => {
    if (n.type === 'p') { const a = (n.ref / N) * Math.PI * 2; n.x = Math.cos(a) * w * 0.22; n.y = Math.sin(a) * h * 0.22; }
    else { n.x = (rnd() - 0.5) * w * 0.8; n.y = (rnd() - 0.5) * h * 0.8; }
    n.vx = n.vy = 0;
  });
  for (let it = 0; it < 420; it++) {
    const cool = 1 - it / 420;
    for (let a = 0; a < NODES.length; a++) for (let b = a + 1; b < NODES.length; b++) {
      const A = NODES[a], B = NODES[b];
      const dx = A.x - B.x, dy = A.y - B.y, d2 = dx * dx + dy * dy + 0.01;
      const f = (L * L * 0.95) / d2;
      A.vx += dx * f; A.vy += dy * f; B.vx -= dx * f; B.vy -= dy * f;
    }
    for (const [A, B] of EDGES) {
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) + 0.01;
      const f = ((d - L) / d) * 0.06;
      A.vx += dx * f; A.vy += dy * f; B.vx -= dx * f; B.vy -= dy * f;
    }
    for (const n of NODES) {
      n.vx -= n.x * 0.012 * (w > h ? h / w : 1); n.vy -= n.y * 0.012 * (h > w ? w / h : 1);
      const lim = L * 0.5 * cool + 0.5;
      n.x += Math.max(-lim, Math.min(lim, n.vx)); n.y += Math.max(-lim, Math.min(lim, n.vy));
      n.vx *= 0.5; n.vy *= 0.5;
    }
  }
  const xs = NODES.map((n) => n.x), ys = NODES.map((n) => n.y);
  const mx = Math.min(...xs), Mx = Math.max(...xs), my = Math.min(...ys), My = Math.max(...ys);
  const pl = 30, pr = compact ? 44 : 90, pv = 30;
  const sx = (w - pl - pr) / (Mx - mx || 1), sy = (h - pv * 2) / (My - my || 1);
  NODES.forEach((n) => { n.px = pl + (n.x - mx) * sx; n.py = pv + (n.y - my) * sy; });
  /* les repères eux-mêmes ne se touchent jamais */
  const rad = (n) => (n.type === 'p' ? (compact ? 12 : 15) : n.type === 'y' ? 14 : n.type === 'k' ? 4 : 7);
  for (let it = 0; it < 120; it++) {
    let moved = false;
    for (let a = 0; a < NODES.length; a++) for (let b = a + 1; b < NODES.length; b++) {
      const A = NODES[a], B = NODES[b];
      const dx = B.px - A.px, dy = B.py - A.py, d = Math.hypot(dx, dy) || 0.01, m = rad(A) + rad(B) + 4;
      if (d >= m) continue;
      const push = (m - d) / 2, ux = dx / d, uy = dy / d;
      A.px -= ux * push; A.py -= uy * push; B.px += ux * push; B.py += uy * push;
      moved = true;
    }
    NODES.forEach((n) => { n.px = Math.max(pl - 10, Math.min(w - VT_STRIP - 8, n.px)); n.py = Math.max(pv - 12, Math.min(h - pv + 12, n.py)); });
    if (!moved) break;
  }
}

/* ── les étiquettes : placées une à une, sans jamais se chevaucher ──
   Chaque étiquette essaie six places autour de son nœud (à droite, à
   gauche, en haut, en bas…) et prend la première libre, dans le cadre,
   sans couvrir un autre nœud ni une autre étiquette. Les projets
   passent d'abord (leur numéro), puis les années, les mots-clés, les
   artistes, les lieux. Ce qui ne trouve pas de place reste caché
   jusqu'à ce qu'on suive une liaison. Le bord droit est laissé au
   titre du projet visé, écrit à la verticale (d.js). */
const VT_STRIP = 34;
const FS = { p: 11, y: 17, k: 10, a: 10, l: 9.5 };
const CW = { p: 0.6, y: 0.64, k: 0.6, a: 0.6, l: 0.63 };
const labelOf = (n) => (n.type === 'p' ? pad2(n.ref) : n.label);
let lastW = 0, lastH = 0, lastC = false;
function placeLabels(w, h, compact, only) {
  const k = compact ? 0.9 : 1;
  const key = only ? 'flab' : 'lab';
  const pool = only ? NODES.filter((n) => only.has(n)) : NODES;
  const boxes = [];
  const hit = (b) => b.x0 < 3 || b.x1 > w - VT_STRIP || b.y0 < 3 || b.y1 > h - 3 || boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  /* les nœuds sont des obstacles */
  pool.forEach((n) => {
    const r = n.type === 'p' ? (compact ? 12 : 16) : n.type === 'y' ? 0 : n.type === 'k' ? 3 : 6;
    if (r) boxes.push({ x0: n.px - r * 0.5, x1: n.px + r * 0.5, y0: n.py - r, y1: n.py + r });
  });
  const order = ['p', 'y', 'k', 'a', 'l'];
  for (const t of order) for (const n of pool.filter((m) => m.type === t)) {
    const fs = FS[t] * k, lw = labelOf(n).length * fs * CW[t], lh = fs * 1.15;
    const g = t === 'p' ? (compact ? 7 : 9) : t === 'k' ? 5 : t === 'y' ? 0 : 9;
    const C = t === 'y'
      ? [[-lw / 2, -lh / 2, 'middle'], [-lw / 2, -lh - 4, 'middle'], [-lw / 2, 4, 'middle']]
      : [[g, -lh / 2, 'start'], [-g - lw, -lh / 2, 'end'], [g - 2, -lh - 4, 'start'], [g - 2, 4, 'start'], [-g - lw + 2, -lh - 4, 'end'], [-g - lw + 2, 4, 'end']];
    n[key] = null;
    for (const [ox, oy, an] of C) {
      const b = { x0: n.px + ox - 1, x1: n.px + ox + lw + 1, y0: n.py + oy - 1, y1: n.py + oy + lh + 1 };
      if (hit(b)) continue;
      boxes.push(b);
      n[key] = { x: an === 'end' ? ox + lw : an === 'middle' ? 0 : ox, y: oy + lh * 0.8, an, fs };
      break;
    }
    if (!n[key]) { const [ox, oy, an] = C[0]; n[key] = { x: an === 'middle' ? 0 : ox, y: oy + lh * 0.8, an, fs, hid: true }; }
  }
}
function setLabel(t, L) {
  t.setAttribute('x', L.x.toFixed(1));
  t.setAttribute('y', L.y.toFixed(1));
  if (L.an === 'start') t.removeAttribute('text-anchor'); else t.setAttribute('text-anchor', L.an);
  t.classList.toggle('hid', !!L.hid);
}

export function drawNet(svg, w, h, compact) {
  layout(w, h, compact);
  placeLabels(w, h, compact);
  lastW = w; lastH = h; lastC = compact;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const lines = EDGES.map(([a, b]) =>
    `<line data-a="${a.id}" data-b="${b.id}" x1="${a.px.toFixed(1)}" y1="${a.py.toFixed(1)}" x2="${b.px.toFixed(1)}" y2="${b.py.toFixed(1)}"/>`).join('');
  const nodes = NODES.map((n) => {
    const L = n.lab;
    const txt = `<text class="lb${L.hid ? ' hid' : ''}" x="${L.x.toFixed(1)}" y="${L.y.toFixed(1)}"${L.an === 'start' ? '' : ` text-anchor="${L.an}"`} style="font-size:${L.fs.toFixed(1)}px">${esc(labelOf(n))}</text>`;
    let g = '';
    /* le projet ne porte que son numéro ; son titre s'écrit à la verticale
       sur le bord droit de la vue quand on le vise */
    if (n.type === 'p') g = glyph(compact ? 24 : 30) + txt;
    if (n.type === 'a') g = `<circle r="4.5"/>` + txt;
    if (n.type === 'l') g = `<rect x="-3.5" y="-3.5" width="7" height="7"/>` + txt;
    if (n.type === 'y') g = txt;
    if (n.type === 'k') g = `<circle r="1.8"/>` + txt;
    return `<g class="nd nd--${n.type}" data-id="${n.id}"${n.type === 'p' ? ` data-ref="${n.ref}"` : ''} transform="translate(${n.px.toFixed(1)},${n.py.toFixed(1)})">${g}</g>`;
  }).join('');
  svg.innerHTML = `<g class="ed">${lines}</g><g>${nodes}</g>`;
}

/* n'allume que ce qui est relié à `id` */
export function focus(svg, id) {
  svg.classList.toggle('is-focus', !!id);
  svg.querySelectorAll('.is-lit, .is-hot').forEach((e) => e.classList.remove('is-lit', 'is-hot'));
  /* on remet chaque étiquette à sa place de repos */
  svg.querySelectorAll('.nd').forEach((g) => { const m = BY.get(g.dataset.id), t = g.querySelector('text.lb'); if (m && t && m.lab) setLabel(t, m.lab); });
  NODES.forEach((m) => { m.hot = false; });
  if (!id) return;
  const n = BY.get(id);
  if (!n) return;
  const lit = new Set([n, ...n.nb]);
  /* ce qu'on suit est replacé à part : seules ses étiquettes s'écrivent,
     et aucune ne recouvre l'autre */
  n.hot = n.type === 'p';
  placeLabels(lastW, lastH, lastC, lit);
  svg.querySelectorAll('.nd').forEach((g) => { const m = BY.get(g.dataset.id), t = g.querySelector('text.lb'); if (m && t && lit.has(m) && m.flab) setLabel(t, m.flab); });
  svg.querySelectorAll('.nd').forEach((g) => { if (lit.has(BY.get(g.dataset.id))) g.classList.add('is-lit'); });
  svg.querySelectorAll('line').forEach((l) => { if (l.dataset.a === id || l.dataset.b === id) l.classList.add('is-lit'); });
  if (n.type === 'p') svg.querySelector(`.nd[data-id="${CSS.escape(id)}"]`)?.classList.add('is-hot');
}

/* ══ la chronologie radiale ═══════════════════════════════ */

export const CHRONO = new Map();          /* id → {px, py, ref} */
export function drawChrono(svg, w, h, compact) {
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  CHRONO.clear();
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - (compact ? 26 : 44);
  const years = [...new Set(P.map(year).filter(Boolean))].map(Number).sort();
  const y0 = years[0], y1 = years[years.length - 1];
  const r0 = R * 0.2;
  const ry = (y) => r0 + ((y - y0 + 1) / (y1 - y0 + 1)) * (R - r0);
  let out = '';
  /* les anneaux des années, et les douze rayons des mois */
  for (let y = y0; y <= y1; y++) {
    const r = ry(y);
    const has = years.includes(y);
    out += `<circle class="ring${has ? ' ring--on' : ''}" cx="${cx}" cy="${cy}" r="${r.toFixed(1)}"/>`;
    out += `<text class="yr" x="${cx + 4}" y="${(cy - r + 12).toFixed(1)}">${y}</text>`;
  }
  const MM = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  const months = [];
  for (let m = 0; m < 12; m++) {
    const a = (m / 12) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(a) * r0 * 0.6, y1b = cy + Math.sin(a) * r0 * 0.6, x2 = cx + Math.cos(a) * (R + 10), y2 = cy + Math.sin(a) * (R + 10);
    out += `<line class="ray" x1="${x1.toFixed(1)}" y1="${y1b.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    months.push({ x: cx + Math.cos(a) * (R + 22), y: cy + Math.sin(a) * (R + 22) + 3, t: MM[m] });
  }
  /* la place prise par chaque projet (sa tuile et son numéro) : une
     étiquette de mois qui tomberait dessus cède la place */
  const taken = [];
  /* les projets : au mois d'ouverture, sur l'anneau de leur année ;
     sans mois connu, répartis sur l'anneau ; sans année, au centre */
  const byYear = {}, slots = {};
  P.forEach((p, i) => {
    const y = +year(p), m = month(p);
    let a, r;
    if (!y) { a = -Math.PI / 2 + (i % 2 ? 0.9 : -0.9); r = r0 * 0.55; }
    else {
      byYear[y] = (byYear[y] || 0) + 1;
      r = ry(y);
      a = m >= 0 ? (m / 12) * Math.PI * 2 - Math.PI / 2 : ((byYear[y] * 3.7 + i) % 12) / 12 * Math.PI * 2 - Math.PI / 2;
      /* deux projets ouverts le même mois de la même année : on les écarte */
      const slot = `${y}-${m}`;
      slots[slot] = (slots[slot] || 0) + 1;
      if (slots[slot] > 1) a += (slots[slot] % 2 ? -1 : 1) * Math.ceil((slots[slot] - 1) / 2) * 0.11;
    }
    const x = cx + Math.cos(a) * r, yy = cy + Math.sin(a) * r;
    CHRONO.set('p' + i, { px: x, py: yy, ref: i });
    const right = x > cx;
    out += `<line class="spoke" data-ref="${i}" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${yy.toFixed(1)}"/>`;
    /* le numéro seul, vers l'extérieur. Le titre du projet visé s'écrit à
       la verticale sur le bord droit de la vue (d.js) ; au téléphone, il
       s'écrit vers le centre pour ne jamais sortir du cadre */
    const g = compact ? 9 : 10, gh = compact ? 22 : 28;
    taken.push([x - 7, yy - gh / 2, x + 7, yy + gh / 2], right ? [x + g, yy - 7, x + g + 18, yy + 7] : [x - g - 18, yy - 7, x - g, yy + 7]);
    const lab =
      `<text class="c" x="${right ? g : -g}" y="4"${right ? '' : ' text-anchor="end"'}>${pad2(i)}</text>` +
      `<text class="f" x="${right ? -12 : 12}" y="-14"${right ? ' text-anchor="end"' : ''}>${esc(pad2(i) + ' ' + p.t)}</text>`;
    out += `<g class="nd nd--p" data-id="p${i}" data-ref="${i}" transform="translate(${x.toFixed(1)},${yy.toFixed(1)})">${glyph(compact ? 22 : 28)}${lab}</g>`;
  });
  for (const { x, y, t } of months) {
    const box = [x - 12, y - 10, x + 12, y + 3];
    if (taken.some((b) => b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1])) continue;
    out += `<text class="mo" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${t}</text>`;
  }
  out += `<circle class="hub" cx="${cx}" cy="${cy}" r="3"/>`;
  svg.innerHTML = `<g>${out}</g>`;
}

export function focusChrono(svg, id) {
  svg.classList.toggle('is-focus', !!id);
  svg.querySelectorAll('.is-lit, .is-hot').forEach((e) => e.classList.remove('is-lit', 'is-hot'));
  if (!id || !CHRONO.has(id)) return;
  const { ref } = CHRONO.get(id);
  svg.querySelector(`.nd[data-id="${id}"]`)?.classList.add('is-lit', 'is-hot');
  svg.querySelector(`.spoke[data-ref="${ref}"]`)?.classList.add('is-lit');
}

/* ══ la matrice ═══════════════════════════════════════════
   Les liaisons, sans le fouillis d'un graphe : une grille de onze
   sur onze, un projet par ligne et par colonne. Au croisement de
   deux projets, un point dont la taille dit combien ils partagent
   (artiste, lieu, année, mots-clés). Les lignes montent (01 en bas),
   si bien que la diagonale — chaque projet face à lui-même — est une
   file de tuiles qui monte vers la droite : la diagonale du logo.
   Viser un projet allume sa ligne et sa colonne, et écrit dessous
   avec qui il est lié, et par quoi. */

export function shared(i, j) {
  const a = P[i], b = P[j], out = [];
  if (a.a === b.a) out.push(a.a);
  if (venue(a) === venue(b)) out.push(venue(a));
  if (year(a) && year(a) === year(b)) out.push(year(a));
  KEYS[i].forEach((k) => { if (KEYS[j].includes(k)) out.push(k); });
  return out;
}
let MX = null;                              /* géométrie de la dernière matrice */
/* l'ordre d'allumage des pixels d'un bloc 3 × 3 */
const PIX = [[1, 1], [1, 0], [0, 1], [2, 1], [1, 2], [0, 0], [2, 2], [2, 0], [0, 2]];
export function drawMatrix(svg, w, h, compact) {
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const lab = compact ? 20 : 26;            /* marge des numéros */
  const legend = w < h ? Math.min(h * 0.3, 190) : 0;   /* portrait : la légende dessous */
  const side = w < h ? 0 : Math.min(w * 0.36, 320);    /* paysage : la légende à droite */
  const cell = Math.floor(Math.min((w - side - lab - 16) / N, (h - legend - lab - 16) / N));
  const gw = cell * N;
  const x0 = Math.round((w - side - gw - lab) / 2 + lab), y0 = Math.round(12 + Math.max(0, (h - legend - lab - 12 - gw) / 2) * 0.4);
  MX = { x0, y0, cell, w, h, lx: side ? x0 + gw + 28 : x0 - lab, ly: side ? y0 + 4 : y0 + gw + lab + 20, lw: side ? w - (x0 + gw + 28) - 10 : gw + lab, compact };
  const [bx0, by0, bw0, bh0] = [bx, by, bw, bh];
  let out = '';
  /* les bandes de ligne et de colonne, allumées par la visée */
  out += `<rect class="mx__row" x="${x0}" y="0" width="${gw}" height="${cell}" opacity="0"/>`;
  out += `<rect class="mx__col" x="0" y="${y0}" width="${cell}" height="${gw}" opacity="0"/>`;
  const rowY = (i) => y0 + (N - 1 - i) * cell;          /* 01 en bas */
  MX.rowY = rowY;
  for (let i = 0; i < N; i++) {
    const c = x0 + i * cell + cell / 2, r = rowY(i) + cell / 2;
    out += `<text class="mx__n" x="${c}" y="${y0 + gw + 14}" text-anchor="middle">${pad2(i)}</text>`;
    out += `<text class="mx__n" x="${x0 - 8}" y="${r + 3.5}" text-anchor="end">${pad2(i)}</text>`;
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const cx = x0 + j * cell + cell / 2, cy = rowY(i) + cell / 2;
    if (i === j) {
      /* la diagonale : une tuile par projet */
      const th = cell * 0.86, tw = th * TILE_RATIO;
      out += `<g class="nd nd--p mx__d" data-id="p${i}" data-ref="${i}" transform="translate(${cx},${cy})">` +
        `<rect class="mx__hit" x="${-cell / 2}" y="${-cell / 2}" width="${cell}" height="${cell}"/>` +
        `<svg x="${(-tw / 2).toFixed(1)}" y="${(-th / 2).toFixed(1)}" width="${tw.toFixed(1)}" height="${th.toFixed(1)}" viewBox="${bx0} ${by0} ${bw0} ${bh0}" overflow="visible"><path class="tl" d="${TILE_PATH}"/></svg></g>`;
      continue;
    }
    /* chaque croisement est un petit bloc de 3 × 3 pixels : autant de
       pixels allumés que de choses partagées (le centre d'abord, puis la
       croix, puis les coins) — une trame, comme le reste de hard */
    const n = shared(i, j).length;
    const q = Math.max(2, Math.round(cell * 0.17)), gp = Math.max(1, Math.round(q * 0.35));
    const o = -(3 * q + 2 * gp) / 2;
    let px = '';
    if (!n) px = `<rect class="mx__p mx__p--0" x="${(cx - 0.75).toFixed(1)}" y="${(cy - 0.75).toFixed(1)}" width="1.5" height="1.5"/>`;
    else for (let k = 0; k < Math.min(n, 9); k++) {
      const [a, b] = PIX[k];
      px += `<rect class="mx__p" x="${(cx + o + a * (q + gp)).toFixed(1)}" y="${(cy + o + b * (q + gp)).toFixed(1)}" width="${q}" height="${q}"/>`;
    }
    out += `<g class="mx" data-i="${i}" data-j="${j}" data-n="${n}"><rect class="mx__hit" x="${cx - cell / 2}" y="${cy - cell / 2}" width="${cell}" height="${cell}"/>${px}</g>`;
  }
  out += `<g class="mx__leg" transform="translate(${MX.lx},${MX.ly})"></g>`;
  svg.innerHTML = `<g>${out}</g><g class="lk"></g>`;
  legendFor(svg, null);
}

function legendFor(svg, text) {
  const g = svg.querySelector('.mx__leg');
  if (!g || !MX) return;
  const lines = text || [MX.compact ? 'viser un projet : ses liaisons s’écrivent ici' : 'survoler un projet ou un croisement : les liaisons s’écrivent ici'];
  const max = Math.max(8, Math.floor(MX.lw / 6.2));
  g.innerHTML = lines.slice(0, 9).map((l, k) => {
    const t = l.length > max ? l.slice(0, max - 1) + '…' : l;
    return `<text class="${k === 0 && text ? 'mx__lt' : 'mx__l'}" x="0" y="${k * 16}">${esc(t)}</text>`;
  }).join('');
}

/* visée d'un projet (ligne + colonne) ou d'un croisement */
export function focusMatrix(svg, id, pair) {
  svg.classList.toggle('is-focus', !!(id || pair));
  svg.querySelectorAll('.is-lit, .is-hot').forEach((e) => e.classList.remove('is-lit', 'is-hot'));
  const row = svg.querySelector('.mx__row'), col = svg.querySelector('.mx__col');
  if (!MX || !row) return;
  row.setAttribute('opacity', '0'); col.setAttribute('opacity', '0');
  let i = -1, j = -1;
  if (pair) [i, j] = pair;
  else if (id && /^p\d+$/.test(id)) i = +id.slice(1);
  if (i < 0) { legendFor(svg, null); return; }
  row.setAttribute('y', MX.rowY(i)); row.setAttribute('opacity', '1');
  const cc = j >= 0 ? j : i;
  col.setAttribute('x', MX.x0 + cc * MX.cell); col.setAttribute('opacity', '1');
  svg.querySelectorAll(`.mx[data-i="${i}"], .mx[data-j="${i}"]`).forEach((m) => { if (+m.dataset.n) m.classList.add('is-lit'); });
  svg.querySelector(`.mx__d[data-ref="${i}"]`)?.classList.add('is-hot');
  if (j >= 0) {
    svg.querySelector(`.mx[data-i="${i}"][data-j="${j}"]`)?.classList.add('is-hot');
    svg.querySelector(`.mx__d[data-ref="${j}"]`)?.classList.add('is-hot');
    const sh = shared(i, j);
    legendFor(svg, [`${pad2(i)} × ${pad2(j)}`, `${P[i].t}`, `${P[j].t}`, sh.length ? '— ' + sh.join(' · ') : '— aucune liaison']);
    return;
  }
  const links = P.map((q, k) => ({ k, s: k === i ? [] : shared(i, k) })).filter((o) => o.s.length).sort((a, b) => b.s.length - a.s.length);
  legendFor(svg, [`${pad2(i)} ${P[i].t}`, ...(links.length ? links.map((o) => `${pad2(o.k)} ${P[o.k].t} — ${o.s.join(' · ')}`) : ['aucune liaison'])]);
}

/* ══ les tranches ═════════════════════════════════════════
   La tuile de tête du logo — celle du dégradé — découpée en autant
   de tranches qu'il y a de projets, parallèlement à son bord haut
   (comme on tranche une plaque). La plus récente en haut. Toutes
   les tranches sont éteintes sauf celle du projet choisi : elle
   s'allume dans son dégradé et glisse hors de la tuile, comme un
   tiroir qu'on tire. Au doigt, on choisit en faisant glisser le
   pouce le long de la réglette de numéros, à droite (comme l'index
   alphabétique des contacts de l'iPhone), ou avec le téléscripteur. */

const T30 = Math.tan(Math.PI / 6), C30 = Math.cos(Math.PI / 6);
let TR = null;
/* l'étendue de la tuile le long de son axe « vertical » de plaque */
function tileRange() {
  const c = document.createElement('canvas');
  c.width = Math.ceil(bw) + 2; c.height = Math.ceil(bh) + 2;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.translate(-bx + 1, -by + 1);
  x.fill(new Path2D(TILE_PATH));
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let lo = Infinity, hi = -Infinity;
  for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
    if (d[(py * c.width + px) * 4 + 3] < 128) continue;
    const Y = px * T30 - py;
    if (Y < lo) lo = Y; if (Y > hi) hi = Y;
  }
  return [lo, hi];
}
let RANGE = null;
export function drawStrata(svg, w, h, compact) {
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  if (!RANGE) RANGE = tileRange();
  const [lo, hi] = RANGE;
  /* la tuile en grand, à gauche ; la place du tiroir à droite */
  /* le tiroir glisse en diagonale : on lui réserve sa place en bas et à
     droite, pour que même la dernière tranche reste dans la fenêtre */
  const slide = compact ? Math.min(w * 0.18, 64) : Math.min(w * 0.1, 90);
  const padT = compact ? 40 : 34, padB = slide * T30 + 22;
  const k = Math.min((h - padT - padB) / bh, (w * (compact ? 0.5 : 0.36)) / bw);
  const tw = bw * k, th = bh * k;
  /* la tuile, vers le centre ; le titre de la tranche choisie s'écrit à
     la verticale sur le bord droit de la vue (d.js) */
  const ox = compact ? 56 : Math.round(w * 0.46 - (tw + slide) / 2), oy = padT + ((h - padT - padB) - th) / 2;
  TR = { k, ox, oy, slide, compact, w, h };
  const gap = (hi - lo) * 0.012;
  const band = (hi - lo + gap) / N;
  /* une tranche : la bande de la tuile entre deux parallèles à son bord haut */
  const clip = (i) => {
    const Ya = hi - i * band, Yb = Ya - band + gap;
    const x0 = -2, x1 = bw + 2;
    const P4 = [[x0, x0 * T30 - Ya], [x1, x1 * T30 - Ya], [x1, x1 * T30 - Yb], [x0, x0 * T30 - Yb]];
    return P4.map(([px, py]) => `${(bx - 1 + px).toFixed(2)},${(by - 1 + py).toFixed(2)}`).join(' ');
  };
  let defs = '', out = '';
  for (let i = 0; i < N; i++) defs += `<clipPath id="tr${i}"><polygon points="${clip(i)}"/></clipPath>`;
  /* les années, à gauche, en face de leur première tranche */
  let lastY = null;
  for (let i = 0; i < N; i++) {
    const y = year(P[i]) || '····';
    if (y !== lastY) {
      const Ya = hi - i * band - band / 2;
      out += `<text class="tr__y" x="${(ox - (compact ? 12 : 40)).toFixed(1)}" y="${(oy + (-Ya - 1) * k + 4).toFixed(1)}" text-anchor="end">${y}</text>`;
    }
    lastY = y;
  }
  const vb = `${bx} ${by} ${bw} ${bh}`;
  for (let i = 0; i < N; i++) {
    const Ya = hi - i * band - band / 2;
    /* le numéro, à gauche, en face du bord gauche de la tranche ; la
       droite reste libre pour le tiroir */
    const nx = ox - 10, ny = oy + (-Ya - 1) * k + 4;
    const ty = oy + (bw * T30 - Ya - 1) * k + 4;
    out += `<g class="nd nd--p tr" data-id="p${i}" data-ref="${i}" style="--sx:${slide}px;--sy:${(slide * T30).toFixed(1)}px">` +
      `<svg x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" width="${tw.toFixed(1)}" height="${th.toFixed(1)}" viewBox="${vb}" overflow="visible">` +
      `<g clip-path="url(#tr${i})"><path class="tr__base" d="${TILE_PATH}"/><path class="tr__dot" d="${TILE_PATH}"/><path class="tr__gel" d="${TILE_PATH}"/></g></svg>` +
      `<text class="tr__n" x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" text-anchor="end">${pad2(i)}</text>` +
      (compact ? `<text class="f" x="${(ox + tw + slide + 12).toFixed(1)}" y="${(ty + slide * T30).toFixed(1)}">${pad2(i)}</text>` : '') + `</g>`;
  }
  svg.innerHTML = `<defs>${defs}</defs><g>${out}</g>`;
}
export const strataOrder = () => P.map((_, i) => i);
export function focusStrata(svg, id) {
  svg.classList.toggle('is-focus', !!id);
  svg.querySelectorAll('.is-hot').forEach((e) => e.classList.remove('is-hot'));
  if (!id) return;
  svg.querySelector(`.tr[data-id="${id}"]`)?.classList.add('is-hot');
}
