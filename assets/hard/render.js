/* Maquette D — le moteur de rendu
   ───────────────────────────────────────────────────────────
   Le logo n'est plus une image : c'est un nuage de points en
   trois dimensions, calculé depuis le tracé de la tuile, et
   dessiné selon un « rendu » au choix — trame, ascii, voxel,
   relief, nuage. Les photos des projets passent par les mêmes
   rendus. Tout ce que règle la console (pas, pente, profondeur,
   rotation, densité, glitch, palette) arrive ici.              */

import { TILE_PATH, TILE_BOX } from '../js/data.js?v=105b4359';

const [BX, BY, BW, BH] = TILE_BOX.split(' ').map(Number);
const TAU = Math.PI * 2;

/* ── palettes : fond, encre, et une rampe de couleur t∈[0,1] ── */
const GEL = ['#e2007b', '#c60270', '#720c60', '#3c1355', '#221958', '#546289', '#a2c2cd', '#d4f1ed'];
const GEL_AT = [0, 0.07, 0.2, 0.4, 0.53, 0.73, 0.87, 1];
/* la rampe « turbo » des cartes thermiques, approchée en 9 points */
const TURBO = ['#30123b', '#4662d7', '#36aaf9', '#1ae4b6', '#72fe5e', '#c8ef34', '#faba39', '#f66b19', '#ca2a04'];

const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const lerp = (a, b, t) => a + (b - a) * t;
function ramp(stops, t, at) {
  t = Math.min(1, Math.max(0, t));
  const n = stops.length - 1;
  let i = 0;
  if (at) { while (i < n - 1 && t > at[i + 1]) i++; }
  else i = Math.min(n - 1, Math.floor(t * n));
  const t0 = at ? at[i] : i / n, t1 = at ? at[i + 1] : (i + 1) / n;
  const u = (t - t0) / (t1 - t0 || 1);
  const a = hex(stops[i]), b = hex(stops[i + 1]);
  return `rgb(${lerp(a[0], b[0], u) | 0},${lerp(a[1], b[1], u) | 0},${lerp(a[2], b[2], u) | 0})`;
}
export const PALETTES = {
  nuit:      { bg: '#0c0c0d', ink: '#ecebe6', dim: '#7a7975', acc: '#ff5a1f', gel: true },
  phosphore: { bg: '#030a06', ink: '#8dffb0', dim: '#2f7a4a', acc: '#d6ff4a', gel: false, lo: '#0f3a22' },
  thermique: { bg: '#07060d', ink: '#eef0ff', dim: '#6b6a86', acc: '#faba39', gel: false, turbo: true },
  papier:    { bg: '#ece9e1', ink: '#111111', dim: '#77746c', acc: '#ff4d00', gel: true },
  cobalt:    { bg: '#f2f2ef', ink: '#1a2bff', dim: '#8a92e8', acc: '#ff2e63', gel: false, lo: '#d9dcff' }
};
/* couleur d'un point : t = clarté (0 sombre → 1 clair), k = rang de la tuile */
const TINT = new Map();
export function tint(pal, t, k = 1, v = 0.5) {
  const P = PALETTES[pal];
  const g = k === 0 && P.gel && !P.turbo;
  const key = pal + (g ? 'g' + Math.round(v * 47) : Math.round(t * 47));
  let col = TINT.get(key);
  if (col) return col;
  if (P.turbo) col = ramp(TURBO, t);
  else if (g) col = ramp(GEL, v, GEL_AT);
  else col = ramp([P.lo || P.bg, P.ink], 0.25 + t * 0.75);
  TINT.set(key, col);
  return col;
}

/* ══ le logo en volume, reconstruit ═══════════════════════
   Le logo est un dessin isométrique : chaque tuile est une plaque
   plane (une virgule), dressée à la verticale, vue de trois quarts.
   Le bord haut de la tuile descend à 30° : c'est l'axe horizontal de
   la plaque vu en isométrie ; le pas d'une tuile à l'autre monte à
   30° : c'est l'axe d'empilement. On « déplie » donc le dessin pour
   retrouver la vraie plaque (X horizontal, Y vertical), on empile les
   cinq plaques le long de Z, et on regarde le tout en isométrie.
   Au repos (rotation 0), la projection redonne exactement le logo.
   Pour l'animer, les cinq plaques tournent ensemble, d'un bloc, autour
   d'un seul axe vertical passant par le milieu de la pile — comme un
   objet posé sur un plateau tournant. La rotation s'attarde sur les
   poses où le logo se lit (de face et de dos) et passe plus vite par
   la tranche. */
const C30 = Math.cos(Math.PI / 6), T30 = Math.tan(Math.PI / 6);

/* le masque du dessin, pour savoir si un point de la plaque est dans la virgule */
let MASK = null;
function mask() {
  if (MASK) return MASK;
  const c = document.createElement('canvas');
  c.width = Math.ceil(BW) + 2; c.height = Math.ceil(BH) + 2;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.translate(-BX + 1, -BY + 1);
  x.fill(new Path2D(TILE_PATH));
  const d = x.getImageData(0, 0, c.width, c.height).data;
  MASK = (px, py) => {
    px = Math.round(px + 1); py = Math.round(py + 1);
    if (px < 0 || py < 0 || px >= c.width || py >= c.height) return false;
    return d[(py * c.width + px) * 4 + 3] > 128;
  };
  return MASK;
}
/* les points d'une plaque, sur une grille régulière de la plaque elle-même
   (la trame est « imprimée » sur la plaque et tourne avec elle) */
const CACHE = new Map();
function plate(step) {
  const key = step.toFixed(2);
  if (CACHE.has(key)) return CACHE.get(key);
  const inside = mask();
  const toDraw = (X, Y) => [X * C30, X * 0.5 - Y];            /* plaque → dessin */
  const In = (X, Y) => { const [px, py] = toDraw(X, Y); return inside(px, py); };
  const pts = [];
  const Xmax = BW / C30, Ymin = -BH, Ymax = BW * T30;
  for (let Y = Ymax; Y >= Ymin; Y -= step) for (let X = 0; X <= Xmax; X += step) {
    if (!In(X, Y)) continue;
    const e = !In(X - step, Y) || !In(X + step, Y) || !In(X, Y - step) || !In(X, Y + step);
    const [, py] = toDraw(X, Y);
    pts.push([X, Y, py / BH, e]);
  }
  CACHE.set(key, pts);
  return pts;
}

/* le nuage : cinq plaques empilées le long de Z, placées par les paramètres */
export function cloud(prm, step) {
  const base = plate(step), out = [];
  const dz = (BW * prm.step) / C30;                   /* le pas, le long de l'axe d'empilement */
  const dy = BW * prm.step * (prm.slope - T30);       /* ce que la pente ajoute à l'isométrie pure */
  /* le centre de la plaque : l'essieu passe par là */
  if (!base.c) { let sx = 0, sy = 0; for (const [X, Y] of base) { sx += X; sy += Y; } base.c = [sx / base.length, sy / base.length]; }
  const [cx, cy] = base.c;
  for (let k = 0; k < 5; k++) {
    for (const [X, Y, v, e] of base) out.push({ x: X, y: Y + k * dy, z: -k * dz, k, v, e, cy: cy + k * dy });
  }
  /* l'axe vertical passe par le milieu de la pile (en x et en z) */
  out.axis = { x: cx, y: cy + 2 * dy, z: -2 * dz, cx };
  out.key = `${step}|${prm.step}|${prm.slope}`;
  return out;
}

/* ── projection isométrique, après rotation autour de l'axe vertical ── */
/* l'échelle ne dépend pas de l'angle : on la calcule une fois sur un
   tour complet, pour que le logo garde la même taille en tournant */
const FIT = new Map();
function extent(pts) {
  if (FIT.has(pts.key)) return FIT.get(pts.key);
  const A = pts.axis;
  let mx = 0, my = 0;
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
    for (let i = 0; i < pts.length; i += 3) {
      const p = pts[i], dx = p.x - A.x, dz = p.z - A.z;
      const x = dx * ct - dz * st, z = dx * st + dz * ct, y = p.y - A.y;
      mx = Math.max(mx, Math.abs((x - z) * C30)); my = Math.max(my, Math.abs((x + z) * 0.5 - y));
    }
  }
  FIT.set(pts.key, [mx, my]);
  return [mx, my];
}
export function project(pts, w, h, theta, persp, zoom, side = 0) {
  const A = pts.axis, ct = Math.cos(theta), st = Math.sin(theta);
  const [mx, my] = extent(pts);
  /* `side` : la place laissée de chaque côté (les réglettes du module objet) */
  const hw = side ? Math.min(w * 0.45, w / 2 - side) : w * 0.45;
  const fit = Math.min(hw / mx, (h * 0.44) / my) * zoom;
  const R = Math.max(mx, my);
  let qmin = Infinity, qmax = -Infinity;
  for (const p of pts) {
    const dx = p.x - A.x, dz = p.z - A.z;
    const X = dx * ct - dz * st, Z = dx * st + dz * ct, Y = p.y - A.y;
    const q = (X + Y + Z) / Math.sqrt(3);              /* vers le spectateur */
    const s = fit / (1 - persp * q / (R * 2.4));
    p.sx = w / 2 + (X - Z) * C30 * s;
    p.sy = h / 2 + ((X + Z) * 0.5 - Y) * s;
    p.sz = -q; p.ss = s;
    if (-q < qmin) qmin = -q; if (-q > qmax) qmax = -q;
  }
  for (const p of pts) p.d = (p.sz - qmin) / (qmax - qmin || 1);   /* 0 = devant */
  /* l'ordre de dessin se fait plaque par plaque, selon sa profondeur moyenne */
  const sum = [0, 0, 0, 0, 0], cnt = [0, 0, 0, 0, 0];
  for (const p of pts) { sum[p.k] += p.sz; cnt[p.k]++; }
  for (const p of pts) p.o = sum[p.k] / (cnt[p.k] || 1) + p.sz * 0.001;
  /* combien la plaque nous fait face (0 = par la tranche) */
  return Math.abs(ct - st) / Math.SQRT2;
}

const ASCII = ' .,:;-=+*oxO#%@';
/* chaque tuile garde son ton, comme les gris du logo (#666, #999,
   #ccc, #e6e6e6) : sans ça, les quatre tuiles de derrière fusionnent
   en une seule masse et on ne lit plus la pile */
const TONE = [1, 0.86, 0.66, 0.47, 0.3];
const tone = (p, depth = 0.25) => TONE[p.k] * (1 - p.d * depth);

/* ══ le logo, en direct ════════════════════════════════════ */
export function drawLogo(cv, st, t, size) {
  /* `size` permet de rendre hors écran, à une taille donnée (capture) */
  const dpr = size ? 1 : Math.min(devicePixelRatio || 1, 2);
  const w = size ? size.w : cv.clientWidth, h = size ? size.h : cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const P = PALETTES[st.pal];
  /* à l'écran, fond transparent (la trame du papier se voit derrière) ;
     en capture, fond plein */
  if (size) { c.fillStyle = P.bg; c.fillRect(0, 0, w, h); } else c.clearRect(0, 0, w, h);

  const dens = st.dens;                                            /* 1 (fin) → 10 (gros) */
  const step = { trame: 3 + dens * 0.6, nuage: 1.4 + dens * 0.25, voxel: 5 + dens * 0.9, ascii: 1.6 + dens * 0.18, relief: 2.4 + dens * 0.25 }[st.mode];
  const pts = cloud(st, step);
  /* une seule rotation : toutes les plaques ensemble, autour de l'axe
     vertical ; l'angle réglé (rot.) plus la rotation continue (vitesse),
     ralentie sur les poses lisibles (0 et 180°), accélérée par la tranche */
  const ph = st.phase || 0;
  const theta = (st.rot * Math.PI) / 180 + ph - 0.38 * Math.sin(2 * ph);
  const face = project(pts, w, h, theta, Math.min(0.6, st.depth / 100), st.zoom || 1, st.side || 0);

  if (st.mode === 'trame') {
    pts.sort((a, b) => b.o - a.o);
    for (const p of pts) {
      /* chaque point efface d'abord sa cellule : une tuile de devant
         cache vraiment celles de derrière, la trame reste opaque */
      const q = step * p.ss;
      c.fillStyle = P.bg; c.fillRect(p.sx - q / 2, p.sy - q / 2, q + 0.5, q + 0.5);
      c.fillStyle = tint(st.pal, tone(p), p.k, p.v);
      c.beginPath(); c.arc(p.sx, p.sy, Math.max(0.5, q * 0.36), 0, TAU); c.fill();
    }
  } else if (st.mode === 'nuage') {
    pts.sort((a, b) => b.o - a.o);
    for (const p of pts) {
      c.globalAlpha = 0.45 + TONE[p.k] * 0.55;
      c.fillStyle = tint(st.pal, tone(p), p.k, p.v);
      const q = Math.max(1.1, step * p.ss * 0.42);           /* grandit avec l'image */
      const j = Math.sin(p.x * 12.9 + p.y * 78.2) * q * 0.6;
      c.fillRect(p.sx + j - q / 2, p.sy - j - q / 2, q, q);
    }
    c.globalAlpha = 1;
  } else if (st.mode === 'voxel') {
    pts.sort((a, b) => b.o - a.o);
    for (const p of pts) {
      const s = step * p.ss * 0.5, lit = tone(p, 0.3);
      const top = tint(st.pal, Math.min(1, lit + 0.2), p.k, p.v), left = tint(st.pal, lit * 0.75, p.k, p.v), right = tint(st.pal, lit * 0.5, p.k, p.v);
      const x = p.sx, y = p.sy;
      c.fillStyle = top; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s, y - s * 0.5); c.lineTo(x, y); c.lineTo(x - s, y - s * 0.5); c.fill();
      c.fillStyle = left; c.beginPath(); c.moveTo(x - s, y - s * 0.5); c.lineTo(x, y); c.lineTo(x, y + s); c.lineTo(x - s, y + s * 0.5); c.fill();
      c.fillStyle = right; c.beginPath(); c.moveTo(x + s, y - s * 0.5); c.lineTo(x, y); c.lineTo(x, y + s); c.lineTo(x + s, y + s * 0.5); c.fill();
    }
  } else if (st.mode === 'ascii') {
    /* la taille des caractères suit celle de l'image : lisible en capture */
    const cw = Math.max(4.2 + dens * 0.45, h / 95 + dens * 0.6), ch = cw * 1.7;
    const cols = Math.ceil(w / cw), rows = Math.ceil(h / ch);
    const zb = new Float32Array(cols * rows).fill(Infinity), cell = new Array(cols * rows);
    for (const p of pts) {
      const i = Math.floor(p.sx / cw), j = Math.floor(p.sy / ch);
      if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
      const q = j * cols + i;
      if (p.o < zb[q]) { zb[q] = p.o; cell[q] = p; }
    }
    c.font = `500 ${ch * 0.92}px 'Geist Mono', monospace`;
    c.textBaseline = 'top';
    for (let q = 0; q < cell.length; q++) {
      const p = cell[q];
      if (!p) continue;
      const lum = Math.min(1, (p.e ? 0.25 : 0) + TONE[p.k] * (0.45 + face * 0.4));
      c.fillStyle = tint(st.pal, lum, p.k, p.v);
      c.fillText(ASCII[Math.min(ASCII.length - 1, 1 + Math.floor(lum * (ASCII.length - 2)))], (q % cols) * cw, Math.floor(q / cols) * ch);
    }
  } else if (st.mode === 'relief') {
    /* le logo comme un relief : des lignes horizontales soulevées là où il se trouve */
    const gap = (5 + dens * 0.5) * Math.max(1, h / 480), res = Math.max(3, h / 160);
    const cols = Math.ceil(w / res), rows = Math.ceil(h / gap);
    const hb = new Float32Array(cols * rows), kb = new Int8Array(cols * rows).fill(-1), vb = new Float32Array(cols * rows);
    for (const p of pts) {
      const i = Math.floor(p.sx / res), j = Math.floor(p.sy / gap);
      if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
      const q = j * cols + i, hv = 0.35 + TONE[p.k] * 0.65;
      if (hv > hb[q]) { hb[q] = hv; kb[q] = p.k; vb[q] = p.v; }
    }
    const amp = gap * 2.2;
    c.lineWidth = Math.max(1, h / 520);
    for (let j = 0; j < rows; j++) {
      const y0 = j * gap + gap;
      c.beginPath();
      c.moveTo(0, y0);
      let peak = 0, pk = 1, pv = 0.5;
      for (let i = 0; i < cols; i++) {
        /* un peu de bruit, et le logo qui soulève la ligne */
        const q = j * cols + i;
        const s = (hb[q] + (hb[q - 1] || 0) * 0.6 + (hb[q + 1] || 0) * 0.6) / 2.2;
        const n = Math.sin(i * 0.21 + j * 1.7) * 0.04 + Math.sin(i * 0.05) * 0.03;
        const y = y0 - (s + n) * amp;
        if (s > peak) { peak = s; pk = kb[q]; pv = vb[q]; }
        c.lineTo(i * res, y);
      }
      c.lineTo(w, y0); c.lineTo(w, y0 + gap * 3); c.lineTo(0, y0 + gap * 3); c.closePath();
      c.fillStyle = P.bg; c.fill();
      c.strokeStyle = peak > 0.1 ? tint(st.pal, 0.55 + peak * 0.45, pk, pv) : P.dim;
      c.stroke();
    }
  }
}

/* ══ les photos, par les mêmes rendus ════════════════════ */
export function drawPhoto(cv, img, st) {
  const box = cv.parentElement;
  const w = box.clientWidth, h = box.clientHeight;
  if (!w || !h || !img.naturalWidth) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const P = PALETTES[st.pal];
  c.fillStyle = P.bg; c.fillRect(0, 0, w, h);
  const cell = { trame: 4 + st.dens * 0.5, nuage: 2, voxel: 5 + st.dens * 0.7, ascii: 5 + st.dens * 0.45, relief: 4 + st.dens * 0.4 }[st.mode];
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / (st.mode === 'ascii' ? cell * 1.7 : cell));
  const off = document.createElement('canvas'); off.width = cols; off.height = rows;
  const o = off.getContext('2d', { willReadFrequently: true });
  o.drawImage(img, 0, 0, cols, rows);
  const d = o.getImageData(0, 0, cols, rows).data;
  const L = (x, y) => { const k = (y * cols + x) * 4; return (0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]) / 255; };
  const light = P.bg !== '#0c0c0d' && P.bg !== '#030a06' && P.bg !== '#07060d';   /* fond clair : l'encre dessine les ombres */

  if (st.mode === 'trame' || st.mode === 'nuage') {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let l = L(x, y); if (light) l = 1 - l;
      c.fillStyle = tint(st.pal, l);
      if (st.mode === 'trame') {
        const r = (cell / 2) * Math.sqrt(l) * 1.05;
        if (r < 0.25) continue;
        c.beginPath(); c.arc((x + 0.5) * cell, (y + 0.5) * cell, r, 0, TAU); c.fill();
      } else if (Math.random() < l * 0.9) c.fillRect(x * cell + Math.random(), y * cell + Math.random(), 1, 1);
    }
  } else if (st.mode === 'voxel') {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let l = Math.round(L(x, y) * 5) / 5; if (light) l = 1 - l;
      c.fillStyle = tint(st.pal, l);
      c.fillRect(x * cell, y * cell, cell - 1, cell - 1);
    }
  } else if (st.mode === 'ascii') {
    const ch = cell * 1.7;
    c.font = `500 ${ch * 0.92}px 'Geist Mono', monospace`;
    c.textBaseline = 'top';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let l = L(x, y); if (light) l = 1 - l;
      const g = ASCII[Math.floor(l * (ASCII.length - 1))];
      if (g === ' ') continue;
      c.fillStyle = tint(st.pal, l);
      c.fillText(g, x * cell, y * ch);
    }
  } else if (st.mode === 'relief') {
    c.lineWidth = 1;
    for (let y = 0; y < rows; y++) {
      c.beginPath();
      let m = 0;
      for (let x = 0; x < cols; x++) {
        let l = L(x, y); if (light) l = 1 - l;
        m = Math.max(m, l);
        const yy = (y + 1) * cell - l * cell * 2.2;
        x ? c.lineTo(x * cell, yy) : c.moveTo(0, yy);
      }
      c.strokeStyle = tint(st.pal, 0.4 + m * 0.6);
      c.stroke();
    }
  }
}

/* ── la courbe du signal : un harmonographe réglé par les paramètres ── */
export function drawSignal(cv, st, t) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const P = PALETTES[st.pal];
  c.fillStyle = P.bg; c.fillRect(0, 0, w, h);
  /* réticule */
  c.strokeStyle = P.dim; c.globalAlpha = 0.35; c.lineWidth = 1;
  c.beginPath(); c.moveTo(w / 2, 6); c.lineTo(w / 2, h - 6); c.moveTo(6, h / 2); c.lineTo(w - 6, h / 2); c.stroke();
  for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo((w / 8) * i, h / 2 - 3); c.lineTo((w / 8) * i, h / 2 + 3); c.stroke(); }
  c.globalAlpha = 1;
  const f1 = 2 + st.step * 7, f2 = 3 + st.slope * 2.2, f3 = 2 + st.depth / 24, f4 = 3 + (st.rot / 180 + 1) * 1.5;
  const ph = t * 0.00035 * (0.3 + Math.abs(st.speed) / 40);
  const R = Math.min(w, h) * 0.42;
  c.strokeStyle = P.ink; c.lineWidth = 0.8; c.globalAlpha = 0.85;
  c.beginPath();
  const N = 1400;
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * 60, dmp = Math.exp(-s * 0.035);
    let x = (Math.sin(f1 * s * 0.1 + ph) + Math.sin(f2 * s * 0.1 + ph * 1.3) * 0.6) * dmp;
    let y = (Math.sin(f3 * s * 0.1 + ph * 0.7 + 1.2) + Math.sin(f4 * s * 0.1) * 0.6) * dmp;
    const X = w / 2 + x * R * (w / h > 1.3 ? 1.5 : 1) * 0.62, Y = h / 2 + y * R * 0.62;
    i ? c.lineTo(X, Y) : c.moveTo(X, Y);
  }
  c.stroke();
  c.globalAlpha = 1;
}
