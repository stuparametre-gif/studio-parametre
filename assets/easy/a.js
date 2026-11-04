/* Maquette A — « Salle blanche »
   ───────────────────────────────────────────────────────────
   Même mécanique que la v3 (trois états, des ressorts qui
   poursuivent des cibles), avec quatre changements :
   — plus de page « entrer » : le logo officiel accueille, puis
     se déploie tout seul, ou au premier geste ;
   — la diagonale est celle du logo mesuré (pas 0,272, pente 0,62) ;
   — un index textuel des projets tient à côté de l'éventail ;
   — les visuels gardent leurs proportions : rien n'est recadré.   */

import { Rig, onFrame, wake, GLIDE, SOFT, SNAP, clamp, bell } from '../js/motion.js?v=089766d5';
import { PROJECTS as P, TILE_PATH, TILE_BOX, TILE_RATIO, RATIO } from '../js/data.js?v=089766d5';
import { STEP as STEP_X, SLOPE, LOGO_GREYS } from '../commun/logo.js?v=089766d5';
import { icon, paramsOpen, openParams } from '../commun/params.js?v=089766d5';
import { loupe } from '../commun/loupe.js?v=089766d5';

const N = P.length;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)');
const DEV = false;

/* le temps de lire le logo avant qu'il ne se déploie */
/* le logo reste seul ~1,3 s une fois posé (il met ~0,4 s à apparaître) */
const HOLD = 1700;
/* au déploiement : le mot s'efface d'abord, puis les lamelles se déplient */
const UNFOLD_DELAY = 0.35;
let unfoldAt = 0;

/* gris : ceux du logo pour les quatre premières, puis la pile
   s'efface dans le papier */
const GREYS = (() => {
  const a = [0x5e, 0x5e, 0x63], b = [0xe4, 0xe3, 0xdf];
  return Array.from({ length: N }, (_, i) => {
    const t = Math.pow(i / (N - 1), 0.85);
    return '#' + a.map((v, k) => Math.round(v + (b[k] - v) * t).toString(16).padStart(2, '0')).join('');
  });
})();

const SIGMA = 0.95, MAG = 0.10, PIVOT = 9;
const DEPTH = 10, PERSP = 2600;
const FACE_SPIN = -360;

const $ = (id) => document.getElementById(id);
const app = $('app'), scene = $('scene'), deckEl = $('deck');
const hero = $('hero'), head = $('head'), idx = $('idx'), idxList = $('idxList');
const recN = $('recN'), recT = $('recT'), recM = $('recM'), recX = $('recX'), rel = $('rel'), relSc = $('relSc');
const reelWrap = $('reelWrap'), reel = $('reel'), recClose = $('recClose'), recScroll = $('recScroll');
const recText = document.querySelector('.rec__text');
const recTBox = document.querySelector('.rec__t');
const rule = $('rule'), ruleSc = $('ruleSc'), band = $('band');
recClose.innerHTML = icon('x');
document.querySelector('.tools [data-mail]').innerHTML = icon('mail');

const pad2 = (i) => String(i + 1).padStart(2, '0');
const venue = (p) => p.l.split(',')[0];
/* les mots-clés, dans la voix du titre, à 44 % de sa taille */
const KW_FS = (fs) => clamp(fs * TITLE_K() * 0.44, 17, 26);
const TITLE_K = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--title-k')) || 1;
/* les mots-clés relient les fiches : chacun, les projets qui le portent */
const BY_KW = new Map();
P.forEach((p, i) => p.k.forEach((k) => { if (!BY_KW.has(k)) BY_KW.set(k, []); BY_KW.get(k).push(i); }));
/* la place gardée sous les visuels pour la bande des projets liés */
const REL_H = 44;
const year = (p) => (/\d{4}/.exec(p.d) || [''])[0];

/* ══ construction ═════════════════════════════════════════ */

const tiles = P.map((p, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tile';
  b.dataset.i = String(i);
  b.setAttribute('aria-label', `${pad2(i)} — ${[p.t, p.l, p.a, year(p)].filter(Boolean).join(', ')}`);
  b.innerHTML =
    `<svg viewBox="${TILE_BOX}" aria-hidden="true" focusable="false">` +
      `<rect class="tile__hit" x="96" y="144" width="104" height="316"/>` +
      `<path class="tile__fill" d="${TILE_PATH}" fill="${GREYS[i]}"/>` +
      `<path class="tile__gel" d="${TILE_PATH}"/>` +
    `</svg>`;
  deckEl.appendChild(b);
  const cfg = REDUCED ? SNAP : GLIDE;
  return {
    el: b,
    fill: b.querySelector('.tile__fill'),
    gel: b.querySelector('.tile__gel'),
    rig: new Rig({
      x: [0, cfg], y: [0, cfg], z: [0, cfg], rz: [0, cfg], ry: [0, cfg], sc: [1, cfg],
      op: [0, SOFT], gel: [0, SOFT], fil: [1, SOFT]
    }),
    /* rang dans le logo (1–4 : ses gris exacts), -1 hors du logo */
    lg: -1
  };
});

const rows = P.map((p, i) => {
  const li = document.createElement('li');
  li.style.setProperty('--k', i);
  li.innerHTML =
    `<button type="button" class="idx__r" data-i="${i}">` +
      `<span class="t"></span><span class="l"></span></button>`;
  li.querySelector('.t').textContent = p.t;
  /* le lieu : c'est lui qui porte la crédibilité (Palais de Tokyo,
     Maison Gacha). Au survol sur ordinateur, toujours au doigt. */
  li.querySelector('.l').textContent = venue(p);
  idxList.appendChild(li);
  return li.firstElementChild;
});

/* ══ la réglette (téléphone) ═════════════════════════════
   L'index au pouce (03/11, à la place du rouleau) : une graduation
   discrète en bas, qu'on fait glisser de gauche à droite, un cran par
   projet ; à l'arrêt, elle se cale toujours sur un cran, jamais entre
   deux. Au-dessus, les titres glissent avec elle, sans filet : celui
   du repère à l'encre, avec son lieu ; ses voisins s'éteignent. La
   lamelle du projet choisi se lève et prend le dégradé. Sous le doigt,
   c'est un vrai défilement natif (l'inertie est celle du téléphone) ;
   les titres le suivent, d'un centre de titre à l'autre. Toucher le
   titre du repère ouvre le projet ; toucher un autre titre, ou un cran,
   l'amène au repère. */
/* l'écart entre deux crans (--cell dans a.css) ; plus il est grand,
   moins la réglette file sous le pouce (44 px jugés trop sensibles) */
const RULE_CELL = 64;
const ruleTitles = $('ruleTitles');
const ruleItems = P.map((p) => {
  const it = document.createElement('span');
  it.className = 'rule__it';
  it.innerHTML = `<span class="t"></span><span class="l"></span>`;
  it.querySelector('.t').textContent = p.tc || p.t;
  it.querySelector('.l').textContent = venue(p);
  ruleTitles.appendChild(it);
  return it;
});
ruleSc.innerHTML = '<i class="rule__pad"></i>' +
  P.map((p, i) => `<span class="rule__cell" role="option" aria-selected="false" aria-label="${pad2(i)} — ${p.t}"></span>`).join('') +
  '<i class="rule__pad"></i>';
const ruleCells = [...ruleSc.querySelectorAll('.rule__cell')];

const rulePos = () => clamp(ruleSc.scrollLeft / RULE_CELL, 0, N - 1);
const ruleAt = () => Math.round(rulePos());
const ruleGo = (i, smooth) => ruleSc.scrollTo({ left: clamp(i, 0, N - 1) * RULE_CELL, behavior: smooth && !REDUCED ? 'smooth' : 'instant' });
/* amène le projet i au repère */
function ruleTo(i, smooth) {
  if (!G.mob) return;
  ruleGo(i, smooth);
  rulePaint();
}
/* le centre de chaque titre dans la bande, mesuré une fois posé (et à
   l'arrivée des polices) : la bande passe d'un centre à l'autre */
let ruleX = [];
function ruleLayout() { ruleX = ruleItems.map((it) => it.offsetLeft + it.offsetWidth / 2); }
let ruleSel = -1;
function rulePaint() {
  if (!G.mob || !ruleX.length) return;
  const pos = rulePos(), k0 = Math.min(Math.floor(pos), N - 2), f = pos - k0;
  const x = ruleX[k0] + (ruleX[k0 + 1] - ruleX[k0]) * f;
  ruleTitles.style.transform = `translate3d(${(rule.clientWidth / 2 - x).toFixed(1)}px,0,0)`;
  ruleItems.forEach((it, i) => { it.style.opacity = Math.max(0, 1 - Math.abs(i - pos) * 0.62).toFixed(3); });
  const k = ruleAt();
  if (k !== ruleSel) {
    ruleSel = k;
    ruleItems.forEach((it, i) => it.classList.toggle('is-on', i === k));
    ruleCells.forEach((c, i) => c.setAttribute('aria-selected', String(i === k)));
    ruleSc.setAttribute('aria-label', `Projet ${pad2(k)} sur ${N} : ${P[k].t}. Entrée pour ouvrir.`);
    /* la lamelle du projet choisi se lève et prend le dégradé */
    ptr.set('i', k); ptr.set('prox', 1); wake();
    /* le cran : le repère marque chaque passage */
    rule.classList.remove('is-tick'); void rule.offsetWidth; rule.classList.add('is-tick');
    active = k;
  }
}
/* à l'arrêt, toujours sur un cran (au cas où le calage natif manque) */
let ruleIdle = 0;
function ruleSettle() {
  const pos = rulePos(), j = Math.round(pos);
  if (Math.abs(pos - j) > 0.01) ruleGo(j, true);
}
/* un seul dessin par image, quel que soit le nombre d'événements de
   défilement (Safari en envoie plusieurs par image) */
let ruleQueued = false;
ruleSc.addEventListener('scroll', () => {
  if (!ruleQueued) { ruleQueued = true; requestAnimationFrame(() => { ruleQueued = false; rulePaint(); }); }
  clearTimeout(ruleIdle);
  ruleIdle = setTimeout(ruleSettle, 140);
}, { passive: true });
ruleSc.addEventListener('click', (e) => {
  const box = ruleSc.getBoundingClientRect();
  /* dans la graduation : le cran visé ; plus haut : le titre visé */
  let i = -1;
  if (e.clientY < box.bottom - 30) i = ruleItems.findIndex((it) => { const b = it.getBoundingClientRect(); return +it.style.opacity > 0.05 && e.clientX >= b.left && e.clientX <= b.right; });
  if (i < 0) i = clamp(Math.round(rulePos() + (e.clientX - (box.left + box.width / 2)) / RULE_CELL), 0, N - 1);
  if (i === ruleAt()) openProject(i); else ruleGo(i, true);
});
ruleSc.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); ruleGo(ruleAt() + 1, true); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); ruleGo(ruleAt() - 1, true); }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(ruleAt()); }
});

const ui = new Rig({
  heroOp: [1, SOFT], heroY: [0, GLIDE],
  headOp: [0, SOFT], headY: [-8, GLIDE],
  titleX: [0, GLIDE], textOp: [0, SOFT], textY: [-14, GLIDE],
  titleOp: [0, SOFT], ruleX: [0, GLIDE], metaOp: [0, SOFT], bodyOp: [0, SOFT],
  reelOp: [0, SOFT], reelY: [24, GLIDE]
});
const ptr = new Rig({ i: [0, GLIDE], prox: [0, GLIDE] });

let shots = [];
let view = 'intro';
let openIdx = -1;
let kwOn = null;          /* le mot-clé ouvert dans la bande des projets liés */
let active = 0;
let G = {};
let holdTimer = 0;

/* ══ géométrie ════════════════════════════════════════════ */

function measure() {
  const vw = innerWidth, vh = innerHeight;
  const pad = clamp(vw * 0.032, 16, 52);
  /* l'index va à droite dès qu'il y a la place, sinon dessous */
  const side = vw >= 1000 || (vw > vh * 1.15 && vw >= 640);
  /* la fiche défile en colonne sur écran étroit ou très bas */
  const stack = !side || vh < 560;
  const headB = pad + 44;

  const VEXT = 1 + (N - 1) * TILE_RATIO * STEP_X * SLOPE;
  const HEXT = TILE_RATIO * (1 + (N - 1) * STEP_X);

  /* ── l'index ── */
  let idxX, idxY, idxW, row, dx0, dx1, dy0, dy1;
  if (side) {
    idxW = clamp(vw * 0.28, 280, 400);
    row = Math.min(clamp(vh * 0.05, 30, 46), (vh - headB - 12 - pad) / N);
    idxX = vw - pad - idxW;
    dx0 = pad; dx1 = idxX - Math.max(pad, vw * 0.04);
    dy0 = headB + 12; dy1 = vh - pad;
    idxY = clamp((dy0 + dy1) / 2 - (row * N) / 2, headB + 12, vh - pad - row * N);
  } else {
    idxW = vw - pad * 2;
    row = clamp(vh * 0.044, 34, 44);
    idxX = pad;
    idxY = vh - pad - row * N;
    dx0 = pad; dx1 = vw - pad;
    dy0 = headB + 12; dy1 = idxY - 20;
  }
  idx.classList.toggle('idx--tight', idxW < 380);
  const availW = dx1 - dx0, availH = dy1 - dy0;

  /* ── l'éventail : une marge pour la levée et le grossissement ── */
  let th = clamp(Math.min((availH * 0.86) / VEXT, (availW * 0.9) / HEXT), 110, 420);
  let tw = th * TILE_RATIO;

  /* ── l'accueil : le logo à son échelle, le mot dessous ── */
  const herofs = clamp(Math.min(vw * 0.07, vh * 0.085), 30, 72);
  const introH = herofs * 2.95;   /* rapport tuile / corps relevé sur le logo */
  const introW = introH * TILE_RATIO;
  /* le logo 5 tuiles monte de 4 pas ; on centre l'ensemble logo + mot */
  const rise = 4 * introW * STEP_X * SLOPE;
  const gap = herofs * 0.2;
  const blockH = rise + introH + gap + herofs;
  const top = vh / 2 - blockH / 2;
  const introCy = top + rise + introH / 2;          /* centre de la tuile de tête */

  /* ── la fiche ── */
  let openH, ancX, ancY;
  const s = app.style;
  /* le logo entier : sa largeur et sa montée, pour une hauteur de tuile h */
  const logoW = (h) => h * TILE_RATIO * (1 + 4 * STEP_X);
  const logoRise = (h) => 4 * h * TILE_RATIO * STEP_X * SLOPE;
  if (stack) {
    openH = clamp(vh * 0.11, 64, 104);   /* discrètes : le logo signe, il n'envahit pas */
    ancX = pad + (openH * TILE_RATIO) / 2;
    ancY = headB + 16 + logoRise(openH) + openH / 2;
    s.setProperty('--scroll-y', ancY + openH / 2 + 26 + 'px');
    s.setProperty('--rec-fs', clamp(vw * 0.085, 28, 44) + 'px');
    s.setProperty('--kw-fs', KW_FS(clamp(vw * 0.085, 28, 44)) + 'px');
  } else {
    const band0 = headB + 20;
    const fs = clamp(vw * 0.034, 30, 58), kwfs = KW_FS(fs);
    /* la fiche est un cartel (03/11) : la tuile la plus haute touche le
       filet supérieur du titre, le pied du logo tombe sur le pied des
       mots-clés. Hauteur d'un cartel au titre sur une ligne, d'après
       a.css : bande du titre, méta et mots-clés avec leurs marges.
       Le filet est à rec-y + la hauteur du numéro (offsetTop réel). */
    let cartH = fs * TITLE_K() * 1.3 + 14 + 12.5 * 1.55 + 26 + kwfs * 1.25;
    /* une fiche ouverte dont le titre ou les mots-clés passent sur deux
       lignes : on mesure son vrai cartel, le logo le suit */
    if (recT.textContent) {
      s.setProperty('--rec-fs', fs + 'px');
      s.setProperty('--kw-fs', kwfs + 'px');
      s.setProperty('--rec-w', vw - Math.max(pad + logoW(cartH / (1 + logoRise(1))) + 64, vw * 0.3) - pad + 'px');
      cartH = Math.max(cartH, recX.offsetTop + recX.offsetHeight - recTBox.offsetTop);
    }
    openH = Math.min(cartH / (1 + logoRise(1)), 250);
    const ruleY = band0 - 6 + (recTBox.offsetTop || 27);
    ancY = ruleY + logoRise(openH) + openH / 2;
    /* dessous, l'accrochage : la bande court du cartel (plus une marge
       de page) jusqu'à la bande des projets liés ; les visuels se
       centrent sur son axe */
    const reelY = Math.round(ruleY + cartH + pad);
    const rx = Math.max(pad + logoW(openH) + 64, vw * 0.3);
    /* le logo quitte la marge (03/11) : centré dans sa colonne, entre
       la marge et le texte */
    ancX = pad + (rx - pad - logoW(openH)) / 2 + (openH * TILE_RATIO) / 2;
    s.setProperty('--rec-x', rx + 'px');
    s.setProperty('--rec-y', band0 - 6 + 'px');
    /* les filets du titre courent jusqu'à la marge droite, comme la bande */
    s.setProperty('--rec-w', vw - rx - pad + 'px');
    s.setProperty('--rec-h', reelY - pad / 2 - (band0 - 6) + 'px');
    s.setProperty('--rec-fs', fs + 'px');
    s.setProperty('--kw-fs', kwfs + 'px');
    s.setProperty('--reel-y', reelY + 'px');
    s.setProperty('--reel-h', vh - reelY - pad - REL_H + 'px');
  }
  app.dataset.col = stack ? 'stack' : 'side';

  /* ── téléphone (portrait) : le logo officiel en grand à l'arrivée ; puis
     il se déplie en éventail au-dessus de la réglette, et la lamelle du
     projet choisi prend le dégradé, comme sur ordinateur. À l'ouverture
     d'une fiche, le logo remonte dans le bandeau ── */
  const mob = !side;
  app.dataset.mob = mob ? '1' : '';
  let M = {};
  if (mob) {
    const ruleH = vh < 640 ? 92 : 104;               /* la réglette : les titres, puis la graduation */
    const topB = pad + 44;
    let fs = clamp(Math.min(vw * 0.1, vh * 0.062), 28, 50);
    const blockOf = (f) => { const h = f * 2.95, w = h * TILE_RATIO; return 4 * w * STEP_X * SLOPE + h + f * 0.2 + f; };
    const hH = fs * 2.95, hW = hH * TILE_RATIO, hRise = 4 * hW * STEP_X * SLOPE, hGap = fs * 0.2;
    const blockH = blockOf(fs);
    const logoTop = topB;
    /* la réglette en bas, l'éventail dans tout l'espace au-dessus */
    const ruleTop = vh - pad - ruleH;
    dx0 = pad; dx1 = vw - pad; dy0 = topB + 18; dy1 = ruleTop - 22;
    th = clamp(Math.min(((dy1 - dy0) * 0.84) / VEXT, ((dx1 - dx0) * 0.9) / HEXT), 90, 420);
    tw = th * TILE_RATIO;
    const cyOf = (headY) => headY - vh / 2 - 2 * hW * STEP_X * SLOPE;
    const introHead = vh / 2 - blockH / 2 + hRise + hH / 2;
    const deckHead = logoTop + hRise + hH / 2;
    M = {
      ruleH, ruleTop, fs, hH, hW,
      introCy: cyOf(introHead), deckCy: cyOf(deckHead),
      introHeroY: introHead + hH / 2 + hGap, deckHeroY: deckHead + hH / 2 + hGap,
      band: topB + 4
    };
    s.setProperty('--scroll-y', M.band + 'px');
    s.setProperty('--band', M.band + 'px');
    rule.style.top = ruleTop + 'px';
    rule.style.height = ruleH + 'px';
  }

  G = {
    vw, vh, side, stack, th, tw, pad, mob, M,
    stepX: tw * STEP_X, stepY: -tw * STEP_X * SLOPE, lift: th * 0.08,
    deckX: (dx0 + dx1) / 2 - vw / 2,
    deckY: (dy0 + dy1) / 2 - vh / 2,
    introSc: introH / th, introW, herofs,
    introX: introW * STEP_X, introY: -introW * STEP_X * SLOPE,
    /* centre du logo 5 tuiles = milieu de la tuile de tête + 2 pas */
    introCx: 2 * introW * STEP_X,
    introCy: introCy - vh / 2 - 2 * introW * STEP_X * SLOPE,
    heroY: top + rise + introH + gap,
    openSc: openH / th, openH, ancX: ancX - vw / 2, ancY: ancY - vh / 2,
    oX: openH * TILE_RATIO * STEP_X, oY: -openH * TILE_RATIO * STEP_X * SLOPE
  };

  if (mob) {
    /* en portrait, l'accueil est à l'échelle du téléphone */
    G.introSc = M.hH / th; G.introW = M.hW; G.herofs = M.fs;
    G.introX = M.hW * STEP_X; G.introY = -M.hW * STEP_X * SLOPE;
    G.introCy = M.introCy; G.heroY = M.introHeroY;
  }
  scene.style.perspective = PERSP + 'px';
  document.documentElement.style.setProperty('--herofs', G.herofs + 'px');
  deckEl.style.setProperty('--tw', tw + 'px');
  deckEl.style.setProperty('--th', th + 'px');
  idx.style.setProperty('--idx-x', idxX + 'px');
  idx.style.setProperty('--idx-y', idxY + 'px');
  idx.style.setProperty('--idx-w', idxW + 'px');
  idx.style.setProperty('--row', row + 'px');
  if (view === 'open') { layoutReel(); relEdge(); }
  if (mob) { measureGlyph(); ruleLayout(); rulePaint(); }
  chrome();
}

/* où se trouve le petit logo du bandeau : c'est là que le grand logo
   va se poser quand une fiche s'ouvre sur téléphone */
function measureGlyph() {
  const svg = document.querySelector('#brand svg');
  if (!svg) return;
  const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  if (!r.height || !vb || !vb.height) return;
  const [bx, by, bw, bh] = TILE_BOX.split(' ').map(Number);
  const k = r.height / vb.height;
  const dy = ui.get('headY');
  G.gTileH = bh * k;
  G.gX = r.left + (bx + bw / 2 - vb.x) * k - G.vw / 2;
  G.gY = r.top - dy + (by + bh / 2 - vb.y) * k - G.vh / 2;
  G.gStepX = bw * k * STEP_X;
  G.gStepY = -bw * k * STEP_X * SLOPE;
}

/* ce qui entoure la scène — le grand mot, le petit logo — selon l'état
   et selon l'écran */
function chrome(delay = 0) {
  if (G.mob) {
    if (view === 'deck') {
      ui.set('heroOp', 0); ui.set('heroY', -18);
      ui.set('headOp', 1, delay); ui.set('headY', 0, delay);
    } else if (view === 'open') {
      ui.set('heroOp', 0); ui.set('heroY', G.M.deckHeroY - G.heroY - 24);
      ui.set('headOp', 1, 0.28); ui.set('headY', 0, 0.28);
    }
  } else if (view === 'deck') {
    ui.set('heroOp', 0); ui.set('heroY', -18);
    ui.set('headOp', 1, delay); ui.set('headY', 0, delay);
  } else if (view === 'open') {
    ui.set('heroOp', 0); ui.set('heroY', -18);
    ui.set('headOp', 1); ui.set('headY', 0);
  }
}

/* ══ cibles ═══════════════════════════════════════════════ */

/* Pose une tuile pour que son centre VISUEL tombe en (X, Y) à l'échelle S.
   Deux corrections, sans lesquelles le logo se décale de plusieurs
   pixels : l'échelle se fait autour du point d'origine à 62 % de la
   hauteur (pas du centre), et la profondeur z rapetisse la tuile et la
   rapproche du centre de la scène. */
function place(r, X, Y, S, z) {
  const k = (PERSP - z) / PERSP;
  const sc = S * k;
  r.set('x', X * k);
  r.set('y', Y * k - 0.12 * G.th * (1 - sc));
  r.set('z', z);
  r.set('sc', sc);
}

function targets() {
  const p = ptr.get('i'), prox = ptr.get('prox');
  const mid = (N - 1) / 2;
  const lit = prox > 0.4 ? active : 0;     /* au repos, la tête porte le dégradé, comme le logo */

  for (let i = 0; i < N; i++) {
    const r = tiles[i].rig;

    if (view === 'intro' || (view === 'deck' && performance.now() < unfoldAt)) {
      const shown = 5, k = Math.min(i, shown - 1), u = k - (shown - 1) / 2;
      place(r, u * G.introX, G.introCy + u * G.introY, G.introSc, -k * 4);
      r.set('rz', 0); r.set('ry', 0);
      r.set('op', i < shown ? 1 : 0);
      r.set('gel', i === 0 ? 1 : 0);
      r.set('fil', i === 0 ? 0 : 1);
      tiles[i].lg = i > 0 && i < shown ? i : -1;
      continue;
    }

    if (G.mob && view === 'open' && G.gTileH) {
      /* téléphone : le logo remonte se poser sur le petit logo du
         bandeau, la tuile du projet devant, puis s'efface derrière lui */
      const k = (i - openIdx + N) % N;
      const inLogo = k < 5, kk = inLogo ? k : 4;
      place(r, G.gX + kk * G.gStepX, G.gY + kk * G.gStepY, G.gTileH / G.th, -kk * 4);
      r.set('rz', 0); r.set('ry', 0);
      r.set('op', 0, inLogo ? 0.32 : 0);
      r.set('gel', k === 0 ? 1 : 0);
      r.set('fil', k === 0 ? 0 : 1);
      tiles[i].lg = k > 0 && inLogo ? k : -1;
      continue;
    }

    if (view === 'open') {
      /* la fiche montre le logo entier : la lamelle ouverte devant,
         quatre autres derrière elle, aux places et aux gris du logo */
      const k = (i - openIdx + N) % N;
      const inLogo = k < 5;
      const kk = inLogo ? k : 4;
      place(r, G.ancX + kk * G.oX, G.ancY + kk * G.oY, G.openSc, -kk * 4 - (inLogo ? 0 : 20));
      r.set('rz', 0);
      r.set('ry', k === 0 ? FACE_SPIN : 0);
      r.set('op', inLogo ? 1 : 0);
      r.set('gel', k === 0 ? 1 : 0);
      r.set('fil', k === 0 ? 0 : 1);
      tiles[i].lg = k > 0 && inLogo ? k : -1;
      continue;
    }

    tiles[i].lg = -1;
    const u = i - mid, d = i - p;
    const g = bell(d, SIGMA) * prox;
    r.set('x', G.deckX + u * G.stepX);
    r.set('y', G.deckY + u * G.stepY - G.lift * g);
    r.set('z', -i * DEPTH + g * 6);
    r.set('rz', 0);
    r.set('ry', -PIVOT * g);
    r.set('sc', 1 + MAG * g);
    r.set('op', 1);
    r.set('gel', i === lit ? 1 : 0);
    r.set('fil', i === lit ? 0 : 1);
  }
  rows.forEach((b, i) => b.classList.toggle('is-on', view === 'deck' && prox > 0.4 && i === active));
}

/* ══ rendu ════════════════════════════════════════════════ */

function paint() {
  tiles.forEach((t, i) => {
    const r = t.rig, s = t.el.style;
    s.transform =
      `translate3d(${r.get('x').toFixed(2)}px,${r.get('y').toFixed(2)}px,${r.get('z').toFixed(2)}px)` +
      ` rotateY(${r.get('ry').toFixed(2)}deg) rotate(${r.get('rz').toFixed(2)}deg) scale(${r.get('sc').toFixed(4)})`;
    s.opacity = r.get('op').toFixed(3);
    t.gel.style.opacity = r.get('gel').toFixed(3);
    t.fill.style.opacity = r.get('fil').toFixed(3);
    /* dans le logo (accueil, fiche), les gris exacts du fichier */
    const fill = t.lg > 0 ? LOGO_GREYS[t.lg - 1] : GREYS[i];
    if (t.fillNow !== fill) { t.fill.setAttribute('fill', fill); t.fillNow = fill; }
  });

  hero.style.transform = `translate3d(-50%,${(G.heroY + ui.get('heroY')).toFixed(1)}px,0)`;
  hero.style.opacity = ui.get('heroOp').toFixed(3);
  head.style.transform = `translate3d(0,${ui.get('headY').toFixed(1)}px,0)`;
  head.style.opacity = ui.get('headOp').toFixed(3);

  const ty = ui.get('textY');
  recText.style.opacity = ui.get('textOp').toFixed(3);
  recT.style.transform = `translate3d(${ui.get('titleX').toFixed(1)}px,0,0)`;
  recTBox.style.opacity = ui.get('titleOp').toFixed(3);
  recN.style.opacity = ui.get('titleOp').toFixed(3);
  recTBox.style.setProperty('--rule', ui.get('ruleX').toFixed(3));
  recM.style.transform = `translate3d(0,${(ty * 0.6).toFixed(1)}px,0)`;
  recM.style.opacity = ui.get('metaOp').toFixed(3);
  recX.style.transform = `translate3d(0,${ty.toFixed(1)}px,0)`;
  recX.style.opacity = ui.get('bodyOp').toFixed(3);
  reelWrap.style.transform = `translate3d(0,${ui.get('reelY').toFixed(1)}px,0)`;
  reelWrap.style.opacity = ui.get('reelOp').toFixed(3);
  for (const s of shots) {
    s.el.style.transform = `translate3d(0,${s.rig.get('y').toFixed(1)}px,0)`;
    s.el.style.opacity = s.rig.get('op').toFixed(3);
  }
}

onFrame((dt) => {
  targets();
  let alive = ptr.step(dt);
  for (const t of tiles) if (t.rig.step(dt)) alive = true;
  if (ui.step(dt)) alive = true;
  for (const s of shots) if (s.rig.step(dt)) alive = true;
  paint();
  return alive;
});

/* ══ états ════════════════════════════════════════════════ */

function setView(v) {
  if (view === v) return;
  const prevView = view;
  view = v;
  app.dataset.view = v;
  clearTimeout(holdTimer);

  if (v === 'intro') {
    ui.set('heroOp', 1, 0.2); ui.set('heroY', 0, 0.2);
    ui.set('headOp', 0); ui.set('headY', -8);
    closeRecord();
    ptr.set('prox', 0);
    if (!DEV) holdTimer = setTimeout(() => setView('deck'), HOLD + 600);
  }
  if (v !== 'open') showRel(null);
  if (v === 'deck') {
    if (prevView === 'intro') { unfoldAt = performance.now() + UNFOLD_DELAY * 1000; setTimeout(wake, UNFOLD_DELAY * 1000 + 20); }
    chrome(0.25); closeRecord(); if (G.mob) ruleTo(active, false);
  }
  if (v === 'open') chrome();
  syncHash();
  wake();
}

function closeRecord() {
  ui.set('textOp', 0); ui.set('textY', -14); ui.set('titleX', -60);
  ui.set('titleOp', 0); ui.set('ruleX', 0);
  ui.set('metaOp', 0); ui.set('bodyOp', 0);
  ui.set('reelOp', 0); ui.set('reelY', 24);
  for (const s of shots) { s.rig.set('op', 0); s.rig.set('y', 24); }
}

function buildRecord(i) {
  const p = P[i];
  recN.textContent = `${pad2(i)} / ${N}`;
  recT.textContent = p.t;
  /* l'essentiel, dans cet ordre : le lieu, les artistes, l'année */
  recM.innerHTML = [p.l, p.a && `<b>${p.a}</b>`, year(p)].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
  /* ce que le studio a fait, en cartouches, le rôle en premier (plein).
     Un mot-clé que d'autres projets portent aussi s'ouvre : « +3 » dit
     combien d'autres, et la bande du bas les nomme */
  recX.innerHTML = p.k.map((k) => {
    const n = BY_KW.get(k).length - 1;
    return n
      ? `<button type="button" class="kw kw--link" data-k="${k}" aria-controls="rel" aria-expanded="false" aria-label="${k} : ${n} autre${n > 1 ? 's' : ''} projet${n > 1 ? 's' : ''}"><span>${k}<small aria-hidden="true">+${n}</small></span></button>`
      : `<span class="kw"><span>${k}</span></span>`;
  }).join('');
  /* venu par la bande : le mot-clé reste ouvert sur la nouvelle fiche */
  showRel(kwOn && p.k.includes(kwOn) ? kwOn : null, i);

  reel.innerHTML = '';
  shots = [];
  const list = p.ph.length ? p.ph : [[null, ''], [null, ''], [null, '']];
  list.forEach(([file, cap]) => {
    const f = document.createElement('figure');
    const r = file ? RATIO[file] || 1.5 : 1.5;
    f.className = file ? 'shot' : 'shot shot--empty';
    f.dataset.r = r;
    /* rien sous les visuels : la légende ne sert plus qu'au texte alternatif */
    f.innerHTML = file
      ? `<div class="shot__img" style="aspect-ratio:${r}" tabindex="0" role="button" aria-label="Agrandir : ${cap}"><img src="img/${file}.webp" alt="${p.t} : ${cap}" loading="lazy" decoding="async"></div>`
      : `<div class="shot__img" style="aspect-ratio:${r}"></div>`;
    reel.appendChild(f);
    shots.push({ el: f, rig: new Rig({ y: [24, GLIDE], op: [0, SOFT] }) });
  });
  recScroll.scrollTop = 0;
  reel.scrollLeft = 0;
  /* le cartel dépend du titre de la fiche (une ou deux lignes) */
  measure();
  layoutReel();
}

recScroll.addEventListener('scroll', () => band.classList.toggle('is-scrolled', recScroll.scrollTop > 4), { passive: true });

/* la largeur de chaque visuel découle de sa hauteur et de ses
   proportions : on ne sait qu'après coup si la bande déborde */
/* l'accrochage : des visuels de tailles différentes, centrés sur une
   même ligne, comme des œuvres pendues à la même hauteur d'axe */
const HANG = [1, 0.74, 0.88, 0.68, 0.82, 0.72, 0.94];
function layoutReel() {
  /* plus de légende dessous ; le plus grand visuel est plafonné à 40 %
     de la fenêtre, pour qu'on en voie plusieurs côte à côte */
  const H = Math.min(reel.clientHeight, Math.round(innerHeight * 0.4));
  shots.forEach((s, k) => {
    s.el.style.setProperty('--sh', G.stack ? '' : Math.round(H * HANG[k % HANG.length]) + 'px');
  });
  requestAnimationFrame(() => {
    reelWrap.classList.toggle('reel--many', !G.stack && reel.scrollWidth > reel.clientWidth + 4);
    syncArrows();
  });
}

function openProject(i) {
  openIdx = i;
  active = i;
  buildRecord(i);
  setView('open');
  ui.set('titleX', -60); ui.set('textY', -14);
  ui.set('textOp', 1);
  ui.set('titleOp', 1, 0.22);
  ui.set('titleX', 0, 0.22);
  ui.set('ruleX', 1, 0.38);
  ui.set('metaOp', 1, 0.5);
  ui.set('textY', 0, 0.5);
  ui.set('bodyOp', 1, 0.62);
  ui.set('reelOp', 1, 0.72);
  ui.set('reelY', 0, 0.72);
  shots.forEach((s, k) => { s.rig.set('op', 1, 0.78 + k * 0.06); s.rig.set('y', 0, 0.78 + k * 0.06); });
  wake();
}

/* ── les projets liés par un mot-clé ───────────────────────
   Toucher un mot-clé partagé écrit, en bas sous un filet, les projets
   qui le portent ; toucher un titre ouvre sa fiche sans repasser par
   l'index, et le mot-clé reste ouvert. Le retoucher, ou Échap, ferme. */
function showRel(k, here = openIdx) {
  kwOn = k;
  for (const b of recX.querySelectorAll('.kw--link')) {
    const on = b.dataset.k === k;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-expanded', String(on));
  }
  rel.classList.toggle('is-on', !!k);
  app.dataset.rel = k ? '1' : '';
  if (!k) return;
  rel.setAttribute('aria-label', `Projets liés : ${k}`);
  relSc.innerHTML = `<span class="rel__k">${k}</span>` + BY_KW.get(k).filter((j) => j !== here).map((j) =>
    `<button type="button" class="rel__p" data-go="${j}"><span class="num">${pad2(j)}</span>${P[j].t}</button>`).join('');
  relSc.scrollLeft = 0;
  relEdge();
}
/* une seule ligne, quel que soit le nombre de projets : elle défile si
   elle déborde (la molette la fait glisser), un fondu le signale */
function relEdge() {
  const max = relSc.scrollWidth - relSc.clientWidth - 2;
  relSc.classList.toggle('has-more', relSc.scrollLeft < max);
  relSc.classList.toggle('has-less', relSc.scrollLeft > 2);
}
relSc.addEventListener('scroll', relEdge, { passive: true });
relSc.addEventListener('wheel', (e) => {
  if (relSc.scrollWidth <= relSc.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  e.preventDefault();
  relSc.scrollLeft += e.deltaY;
}, { passive: false });
recX.addEventListener('click', (e) => {
  const b = e.target.closest('.kw--link');
  if (b) showRel(kwOn === b.dataset.k ? null : b.dataset.k);
});
rel.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (!b || view !== 'open') return;
  /* la fiche s'efface, puis la suivante s'ouvre à sa place ; l'adresse
     change sans ajouter d'entrée à l'historique */
  closeRecord();
  setTimeout(() => { if (view === 'open') { openProject(+b.dataset.go); syncHash(); } }, 220);
});

function closeProject() {
  /* si la fiche a été ouverte ici, on revient en arrière : l'historique
     reste propre, et « précédent » ne ferme pas deux fois */
  if (history.state && history.state.sp === 'open') { history.back(); return; }
  setView('deck'); openIdx = -1;
}

function setActive(i) { active = (i + N) % N; wake(); }

/* ══ visée ════════════════════════════════════════════════ */

function tileAtRest(i) {
  const mid = (N - 1) / 2, ox = G.vw / 2, oy = G.vh / 2;
  const f = PERSP / (PERSP + i * DEPTH);
  return {
    right: ox + (G.deckX + G.tw / 2 + (i - mid) * G.stepX) * f,
    mid_y: oy + (G.deckY + (i - mid) * G.stepY) * f,
    band: G.stepX * f,
    tall: G.th * f
  };
}

function aim(cx, cy) {
  if (view !== 'deck') return;
  let k = -1, i = 0;
  for (let j = 0; j < N; j++) {
    const e = tileAtRest(j);
    const t = (cx - (e.right - e.band)) / e.band;
    if (t >= 0) { k = j; i = j + clamp(t - 0.5, -0.5, 0.5); }
  }
  /* à gauche de la tuile de tête : la tête reste visée si on est dessus */
  if (k < 0) {
    const e = tileAtRest(0);
    if (cx < e.right - G.tw) { ptr.set('prox', 0); wake(); return; }
    k = 0; i = 0;
  }
  const e = tileAtRest(k);
  const reach = e.tall * 0.62;
  let prox = clamp(1 - (Math.abs(cy - e.mid_y) - reach * 0.55) / reach, 0, 1);
  /* au-delà de la dernière tuile, on s'éteint */
  if (cx > tileAtRest(N - 1).right + 8) prox = 0;
  ptr.set('i', clamp(i, -0.6, N - 0.4));
  ptr.set('prox', prox);
  if (k !== active && prox > 0.2) setActive(k);
  wake();
}

if (FINE.matches) {
  addEventListener('pointermove', (e) => {
    if (e.target.closest && e.target.closest('.idx, .tools, .head')) return;
    aim(e.clientX, e.clientY);
  }, { passive: true });
}

/* ══ gestes ═══════════════════════════════════════════════ */

/* l'accueil se déploie au premier geste, sans attendre */
function skipIntro() { if (view === 'intro') { setActive(0); setView('deck'); } }
addEventListener('pointerdown', (e) => { if (view === 'intro' && !e.target.closest('.prm')) skipIntro(); }, true);
addEventListener('wheel', skipIntro, { passive: true });

scene.addEventListener('click', (e) => {
  if (view === 'open') { closeProject(); return; }
  if (view !== 'deck') return;
  if (FINE.matches) {
    if (ptr.get('prox') < 0.35) return;
    openProject(active);
    return;
  }
  const b = e.target.closest('.tile');
  if (G.mob) {
    if (!b) return;
    const i = +b.dataset.i;
    if (i === active) openProject(i); else ruleTo(i, true);
    return;
  }
  const i = b ? +b.dataset.i : clamp(Math.round(ptr.s.i.target), 0, N - 1);
  if (i !== active || ptr.get('prox') < 0.5) { setActive(i); ptr.set('i', i); ptr.set('prox', 1); wake(); return; }
  openProject(i);
});

rows.forEach((b, i) => {
  b.addEventListener('pointerenter', () => {
    if (view !== 'deck' || !FINE.matches) return;
    setActive(i); ptr.set('i', i); ptr.set('prox', 1); wake();
  });
  b.addEventListener('focus', () => { if (view === 'deck') { setActive(i); ptr.set('i', i); ptr.set('prox', 1); wake(); } });
  b.addEventListener('click', () => { if (view === 'deck') openProject(i); });
});
idx.addEventListener('pointerleave', () => { if (FINE.matches) { ptr.set('prox', 0); wake(); } });

recClose.addEventListener('click', closeProject);
/* au téléphone, le logo (le grand à l'accueil, le petit du bandeau sur
   une fiche) ouvre « à propos » ; on revient à l'accueil par la croix */
$('brand').addEventListener('click', (e) => {
  if (!e.target.closest('.brand__home')) return;
  if (G.mob) { e.preventDefault(); openParams(); return; }
  e.preventDefault();
  if (view === 'open') closeProject();
  else setView('intro');
});

/* ── bande de visuels ─────────────────────────────────────── */
function syncArrows() {
  const max = reel.scrollWidth - reel.clientWidth - 2;
  $('reelPrev').disabled = reel.scrollLeft <= 2;
  $('reelNext').disabled = reel.scrollLeft >= max;
}
const stepBy = () => reel.clientWidth * 0.6;
$('reelPrev').addEventListener('click', () => reel.scrollBy({ left: -stepBy(), behavior: 'smooth' }));
$('reelNext').addEventListener('click', () => reel.scrollBy({ left: stepBy(), behavior: 'smooth' }));
reel.addEventListener('scroll', syncArrows, { passive: true });
/* au clavier, sur ordinateur, d'un visuel à l'autre : le suivant vient
   se caler au bord gauche de la bande (la loupe a ses propres flèches) */
function reelStep(d) {
  if (!shots.length) return;
  const x0 = shots[0].el.offsetLeft, xs = shots.map((s) => s.el.offsetLeft - x0);
  const max = reel.scrollWidth - reel.clientWidth;
  let k = 0;
  xs.forEach((x, i) => { if (Math.abs(x - reel.scrollLeft) < Math.abs(xs[k] - reel.scrollLeft)) k = i; });
  const j = clamp(k + d, 0, xs.length - 1);
  reel.scrollTo({ left: Math.min(xs[j], max), behavior: REDUCED ? 'instant' : 'smooth' });
}
/* toucher un visuel l'agrandit deux fois, sur place */
loupe(reel, { scale: 2, margin: () => G.pad });

/* ── clavier ──────────────────────────────────────────────── */
addEventListener('keydown', (e) => {
  if (paramsOpen() || e.ctrlKey || e.metaKey) return;
  if (view === 'intro') { skipIntro(); return; }
  if (e.key === 'Escape') { if (kwOn) showRel(null); else if (view === 'open') closeProject(); return; }
  if (view === 'open' && !G.stack && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); reelStep(e.key === 'ArrowRight' ? 1 : -1); return; }
  if (view !== 'deck') return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(active + 1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(active - 1); }
  else if ((e.key === 'Enter' || e.key === ' ') && e.target === document.body) { e.preventDefault(); openProject(active); }
});

function step(i) {
  const k = (i + N) % N;
  setActive(k); ptr.set('i', k); ptr.set('prox', 1);
  rows[k].focus({ preventScroll: true });
  wake();
}

/* glissé au doigt sur l'éventail. Au téléphone, un coup de doigt passe
   au projet voisin. Sur tablette (04/11), le doigt fait ce que fait la
   souris sur ordinateur : on le promène sur l'éventail, la lamelle qu'il
   survole se lève ; à l'arrêt elle reste levée, la toucher l'ouvre. */
function scrub(cx) {
  let k = 0, i = 0;
  for (let j = 0; j < N; j++) {
    const e = tileAtRest(j);
    const t = (cx - (e.right - e.band)) / e.band;
    if (t >= 0) { k = j; i = j + clamp(t - 0.5, -0.5, 0.5); }
  }
  ptr.set('i', clamp(i, -0.6, N - 0.4));
  ptr.set('prox', 1);
  if (k !== active) setActive(k);
  wake();
}
(() => {
  let x0 = null, t0 = 0, drag = false, dragEnd = 0;
  scene.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; t0 = Date.now(); drag = false; }, { passive: true });
  scene.addEventListener('touchmove', (e) => {
    if (x0 === null || view !== 'deck' || G.mob) return;
    const x = e.touches[0].clientX;
    if (!drag && Math.abs(x - x0) > 8) drag = true;
    if (drag) scrub(x);
  }, { passive: true });
  scene.addEventListener('touchend', (e) => {
    if (x0 === null || view !== 'deck') { x0 = null; return; }
    if (G.mob) {
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 36 && Date.now() - t0 < 600) {
        const k = clamp(active + (dx < 0 ? 1 : -1), 0, N - 1);
        setActive(k); ptr.set('i', k); ptr.set('prox', 1); wake();
      }
    } else if (drag) {
      /* la lamelle se cale, et le doigt levé n'ouvre rien */
      ptr.set('i', active); wake();
      dragEnd = Date.now();
    }
    x0 = null;
  }, { passive: true });
  scene.addEventListener('click', (e) => { if (Date.now() - dragEnd < 400) e.stopImmediatePropagation(); }, true);
})();

/* ══ liens profonds ═══════════════════════════════════════ */

/* Le bouton « précédent » du navigateur doit fermer une fiche, pas
   quitter le site : ouvrir une fiche ajoute une entrée à l'historique,
   la fermer (croix, Échap) revient en arrière, et « précédent » fait
   la même chose. Les autres états (accueil, index) remplacent l'entrée
   courante, pour ne pas encombrer l'historique. */
function syncHash() {
  const h = view === 'open' ? '#p-' + pad2(openIdx) : view === 'deck' ? '#projets' : '';
  const here = location.pathname + location.search;
  if (view === 'open') {
    if (location.hash === h) return;
    if (history.state && history.state.sp === 'open') history.replaceState({ sp: 'open' }, '', h);
    else history.pushState({ sp: 'open' }, '', h);
    return;
  }
  if (!h) history.replaceState(null, '', here);
  else if (location.hash !== h) history.replaceState(null, '', h);
}
addEventListener('popstate', () => {
  if (fromHash()) return;
  if (view === 'open') { setView('deck'); openIdx = -1; }
});
function fromHash(first) {
  const m = /^#p-(\d{1,2})$/.exec(location.hash);
  if (m) { const i = +m[1] - 1; if (i >= 0 && i < N) { setView('deck'); openProject(i); return true; } }
  /* à l'arrivée sur le site, « #projets » (reste d'une visite précédente)
     ne doit pas sauter le logo : seul un lien vers un projet le fait */
  if (location.hash === '#projets' && !first) { setView('deck'); return true; }
  return false;
}

/* ══ démarrage ════════════════════════════════════════════ */

addEventListener('resize', () => { measure(); wake(); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

measure();
for (const t of tiles) t.rig.jump('op', 0);
targets();
for (const t of tiles) for (const k in t.rig.s) if (k !== 'op') t.rig.jump(k, t.rig.s[k].target);
paint();
tiles.forEach((t, i) => t.rig.set('op', i < 5 ? 1 : 0, 0.1 + i * 0.06));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); wake(); });

if (!fromHash(true) && !DEV) holdTimer = setTimeout(() => setView('deck'), HOLD);

if (DEV) {
  const snap = () => {
    for (let n = 0; n < 2; n++) {
      targets(); ptr.snap(); ui.snap();
      for (const t of tiles) t.rig.snap();
      for (const s of shots) s.rig.snap();
    }
    paint();
  };
  window.SP = {
    snap,
    go(v, i = 0) { if (v === 'open') { setView('deck'); openProject(i); } else setView(v); snap(); },
    aim(i) { setActive(Math.round(i)); ptr.jump('i', i); ptr.jump('prox', 1); snap(); }
  };
}
