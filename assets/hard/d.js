/* Maquette D — « paramétrage », la version hard
   ───────────────────────────────────────────────────────────
   Le poste de travail : il relie la console (04) à tout ce
   qu'elle règle — le logo en direct (03), la vue des liaisons
   (01), l'index (02), le signal (05), les photos du dossier —
   et gère le glitch, le grain, le journal et les liens.
   Les réglages du visiteur restent dans son navigateur.       */

import { PROJECTS as P, TILE_PATH, TILE_BOX, RATIO } from '../js/data.js?v=aabfc6ee';
import { STEP, SLOPE } from '../commun/logo.js?v=aabfc6ee';
import { icon, paramsOpen } from '../commun/params.js?v=aabfc6ee';
import { drawLogo, drawPhoto, PALETTES } from './render.js?v=aabfc6ee';
import { KEYS, pad2, venue, year, BY, NODES, EDGES, CHRONO, drawNet, focus as focusNet, drawChrono, focusChrono, drawMatrix, focusMatrix, drawStrata, focusStrata, strataOrder } from './views.js?v=aabfc6ee';
import { buildConsole, DEFAULTS, LOGO } from './console.js?v=aabfc6ee';
import { loupe } from '../commun/loupe.js?v=aabfc6ee';

const N = P.length;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)');
const DEV = false;
const $ = (id) => document.getElementById(id);
const rig = $('rig');
/* téléphone et tablette en portrait : un écran de logo, puis la vue */
const MOB = matchMedia('(max-width: 900px)');
const MODES = ['trame', 'ascii', 'voxel', 'relief', 'nuage'];
/* la place des réglettes de palette et de rendu, de chaque côté du logo */
const OBJ_SIDE = 90;
const PALS = Object.keys(PALETTES);
document.querySelector('.tools [data-mail]').innerHTML = icon('mail');
$('recClose').innerHTML = icon('x');

/* ══ l'état, et sa mémoire ════════════════════════════════ */

const st = { ...DEFAULTS, burst: false };
try { Object.assign(st, JSON.parse(localStorage.getItem('sp-hard3') || '{}')); } catch (e) {}
/* un réglage gardé d'une version précédente, ou retouché à la main, ne
   doit jamais casser le rendu : on ne garde que ce qui existe encore */
if (!PALETTES[st.pal]) st.pal = DEFAULTS.pal;
if (!MODES.includes(st.mode)) st.mode = DEFAULTS.mode;
for (const k in DEFAULTS) if (typeof DEFAULTS[k] === 'number') st[k] = Number.isFinite(+st[k]) ? +st[k] : DEFAULTS[k];
st.burst = false;
st.rot = ((+st.rot || 0) + 540) % 360 - 180;
/* au téléphone, on arrive sur un rendu tiré au hasard */
if (MOB.matches && !DEV) st.mode = MODES[Math.floor(Math.random() * MODES.length)];
const save = () => { try { const { burst, phase, ...keep } = st; localStorage.setItem('sp-hard3', JSON.stringify(keep)); } catch (e) {} };

/* ══ le journal ═══════════════════════════════════════════ */

const logEl = $('log'), LOG = [];
function log(m) {
  const t = new Date();
  const ts = [t.getHours(), t.getMinutes(), t.getSeconds()].map((v) => String(v).padStart(2, '0')).join(':');
  LOG.push(`${ts}  ${m}`);
  if (LOG.length > 5) LOG.shift();
  logEl.innerHTML = LOG.map((l) => `<span>${l.replace(/</g, '&lt;')}</span>`).join('');
}
let logT = 0;
const logSoon = (m) => { clearTimeout(logT); logT = setTimeout(() => log(m), 400); };

/* ══ la console ═══════════════════════════════════════════ */

const LABEL = { step: 'pas', slope: 'pente', depth: 'prof.', rot: 'rot.', speed: 'vitesse', glitch: 'décalage', grain: 'grain', dens: 'densité', mode: 'rendu', pal: 'palette' };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function change(k, v, live) {
  if (k === '*reset') { Object.assign(st, LOGO); log('géométrie : valeurs du logo'); }
  else if (k === '*random') {
    Object.assign(st, {
      step: +(0.08 + Math.random() * 0.6).toFixed(3), slope: +(-0.8 + Math.random() * 2.2).toFixed(2),
      depth: Math.round(Math.random() * 60), rot: Math.round(-180 + Math.random() * 360),
      mode: pick(['trame', 'ascii', 'voxel', 'relief', 'nuage']), dens: 1 + Math.round(Math.random() * 7)
    });
    burst(420);
    log(`aléa → ${st.mode} · pas ${st.step} · pente ${st.slope}`);
  } else if (k === '*capture') { capture(); return; }
  else {
    st[k] = v;
    if (k === 'mode' || k === 'pal') { burst(160); log(`${LABEL[k]} → ${v}`); }
    else if (k === 'glitch') burst(220);
    else logSoon(`${LABEL[k]} = ${typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(3).replace(/0+$/, '') : v}`);
  }
  if (k !== 'speed' && k !== 'grain') flash();
  apply(live);
}
const ctl = buildConsole($('console'), st, change);

let photoT = 0;
function apply() {
  const root = document.documentElement;
  if (root.dataset.pal !== st.pal) root.dataset.pal = st.pal;
  root.style.setProperty('--grain-o', (st.grain / 100) * 0.26);
  $('objT').textContent = `${st.mode} · ${st.pal}`;
  if (typeof syncColo === 'function' && coloPal) syncColo();
  ctl.sync();
  save();
  still = true;
  clearTimeout(photoT);
  photoT = setTimeout(() => shots.forEach((s) => s.draw && s.draw()), 120);
}

/* ══ l'objet, l'écho, le décalage : une seule boucle ═════ */

const obj = $('obj'), echo = $('echo');
let burstEnd = 0, still = true, last = 0, lastEcho = 0, prevT = 0, flashAt = -1e9;
let objSeen = true;
new IntersectionObserver((es) => { objSeen = es[0].isIntersecting; still = true; }).observe(obj);
/* le décalage de repérage ne se produit qu'en réponse à un geste,
   et son amplitude suit la molette (0 = jamais) */
function burst(ms) { if (!REDUCED && st.glitch > 0) burstEnd = performance.now() + ms; }
/* l'écho s'allume à chaque réglage, puis redescend en 1,6 s */
function flash() { flashAt = performance.now(); }
const ECHO_REST = 0.07, ECHO_PEAK = 0.62;

function frame(t) {
  requestAnimationFrame(frame);
  if (document.hidden) { prevT = t; return; }
  /* la rotation s'accumule : lâcher la souris ne fait jamais sauter l'objet */
  if (!drag && !REDUCED) st.phase = ((st.phase || 0) + (t - (prevT || t)) * st.speed * 0.00004) % (Math.PI * 2);
  prevT = t;
  st.burst = t < burstEnd;
  rig.classList.toggle('is-glitch', st.burst);
  if (st.burst) rig.style.setProperty('--gx', ((Math.random() < 0.5 ? -1 : 1) * (1.5 + st.glitch * 0.05)).toFixed(1) + 'px');
  const fl = Math.max(0, 1 - (t - flashAt) / 1600);
  echo.style.setProperty('--echo', (ECHO_REST + (ECHO_PEAK - ECHO_REST) * fl * fl).toFixed(3));
  if (REDUCED && !still) return;
  if (t - last < 32 && !still) return;               /* ~30 images par seconde suffisent */
  last = t;
  still = false;
  const tt = REDUCED ? 0 : t;
  /* hors de l'écran, l'objet ne se dessine pas : le défilement reste fluide */
  /* sur ordinateur, le logo ne passe jamais sous les réglettes qui l'encadrent */
  if (objSeen) drawLogo(obj, MOB.matches ? st : { ...st, side: OBJ_SIDE }, tt);
  /* l'écho est grand : on le redessine moins souvent, sauf pendant qu'il brille */
  if (fl > 0 || t - lastEcho > 90) { lastEcho = t; drawLogo(echo, { ...st, burst: false, zoom: 1.1 }, tt); }
}
requestAnimationFrame(frame);

/* l'objet se tourne à la main : on glisse, la rotation suit */
let drag = false, dragX = 0, dragRot = 0;
obj.addEventListener('pointerdown', (e) => {
  if (MOB.matches) return;
  drag = true; dragX = e.clientX; dragRot = st.rot; obj.setPointerCapture(e.pointerId);
});
obj.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = ((Math.round(dragRot + (e.clientX - dragX) * 0.6) + 540) % 360) - 180;
  st.rot = r; ctl.sync(); still = true;
});
obj.addEventListener('pointerup', () => { if (drag) { drag = false; log(`rot. = ${st.rot}° (à la main)`); apply(); } });

/* ── au pouce (téléphone) : glisser à gauche ou à droite change le
   rendu, toucher le logo change la palette ; le défilement vertical
   de la page reste libre ── */
const stepMode = (d) => change('mode', MODES[(MODES.indexOf(st.mode) + d + MODES.length) % MODES.length]);
const stepPal = () => change('pal', PALS[(PALS.indexOf(st.pal) + 1) % PALS.length]);
(() => {
  let x0 = 0, y0 = 0, t0 = 0, on = false;
  obj.addEventListener('pointerdown', (e) => { if (!MOB.matches) return; on = true; x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); });
  obj.addEventListener('pointerup', (e) => {
    if (!on) return;
    on = false;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) stepMode(dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && Date.now() - t0 < 400) stepPal();
  });
  obj.addEventListener('pointercancel', () => { on = false; });
})();
/* au téléphone, comment régler : une indication discrète à l'arrivée,
   qui s'efface au premier geste (ou au bout de six secondes) */
const gesture = $('gesture');
const hideGesture = () => gesture.classList.add('is-gone');
setTimeout(hideGesture, 6000);
obj.addEventListener('pointerdown', hideGesture, { once: true });
/* et, sur le bord de la fenêtre du logo, les couleurs du site en petits
   onglets, comme les intercalaires d'un classeur */
const coloPal = $('palTabs');
coloPal.innerHTML = PALS.map((k) => `<button type="button" class="ptab" data-v="${k}" aria-label="couleurs ${k}" style="--sb:${PALETTES[k].bg};--si:${PALETTES[k].ink}"><i></i></button>`).join('');
coloPal.addEventListener('click', (e) => { const b = e.target.closest('.ptab'); if (b) { hideGesture(); change('pal', b.dataset.v); } });
function syncColo() { coloPal.querySelectorAll('.ptab').forEach((b) => b.classList.toggle('is-on', b.dataset.v === st.pal)); }

/* le pied de page : le mot seul, calé au pixel sur la largeur */
const coloWord = $('coloWord');
function fitColo() {
  if (!MOB.matches) return;
  coloWord.style.fontSize = '100px';
  const avail = coloWord.parentElement.clientWidth;
  coloWord.style.fontSize = ((100 * avail) / coloWord.scrollWidth).toFixed(2) + 'px';
}
addEventListener('resize', fitColo, { passive: true });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitColo);

/* capture : le logo tel que réglé, au format d'un post (4:5), signé */
function makeCapture() {
  const W = 1080, H = 1350, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const off = document.createElement('canvas');
  /* le logo dans sa bande, entre le titre et la légende, sans les toucher */
  drawLogo(off, { ...st, burst: false, zoom: 1.05 }, performance.now(), { w: W, h: H - 330 });
  const c = cv.getContext('2d'), Pl = PALETTES[st.pal];
  c.fillStyle = Pl.bg; c.fillRect(0, 0, W, H);
  c.drawImage(off, 0, 170);
  c.fillStyle = Pl.ink;
  /* le mot-symbole dessiné (celui du panneau Paramètres) : 52 px de
     corps, la ligne de base à 108 px, comme le texte d'avant */
  const word = document.querySelector('.prm__logo .mark path');
  if (word) {
    c.save();
    c.translate(64, 108 - 52 * 0.867);
    c.scale(52 / 1000, 52 / 1000);
    c.fill(new Path2D(word.getAttribute('d')));
    c.restore();
  }
  c.font = "22px 'Geist Mono', monospace";
  c.fillStyle = Pl.dim;
  c.fillText(`rendu ${st.mode} · palette ${st.pal}`, 64, H - 110);
  c.fillText(`pas ${(+st.step).toFixed(3)} · pente ${(+st.slope).toFixed(2)} · prof. ${st.depth} · rot. ${st.rot}°`, 64, H - 76);
  c.fillStyle = Pl.ink;
  c.textAlign = 'right';
  c.fillText('@studio_parametre', W - 64, H - 76);
  return cv;
}
/* Partager : sur téléphone (et sur les ordinateurs qui le permettent),
   la feuille de partage du système s'ouvre avec l'image prête — on y
   choisit Instagram, et l'image arrive dans l'éditeur de publication.
   Ailleurs, l'image est téléchargée. Aucun site ne peut ouvrir
   Instagram directement avec une image : c'est la seule voie. */
const probe = (() => { try { return new File([''], 'a.png', { type: 'image/png' }); } catch (e) { return null; } })();
const CAN_SHARE = !!(probe && navigator.canShare && navigator.canShare({ files: [probe] }));
function capture() {
  const cv = makeCapture();
  const name = `studio-parametre_${st.mode}_${st.pal}.png`;
  burst(260);
  if (CAN_SHARE) {
    /* conversion synchrone : le partage doit partir dans le geste même */
    const url = cv.toDataURL('image/png'), bin = atob(url.split(',')[1]);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const file = new File([buf], name, { type: 'image/png' });
    navigator.share({ files: [file] })
      .then(() => log('partagé · ' + name))
      .catch((e) => { if (e.name !== 'AbortError') download(url, name); });
    return;
  }
  download(cv.toDataURL('image/png'), name);
}
function download(url, name) {
  const a = document.createElement('a');
  a.download = name;
  a.href = url;
  a.click();
  log(`capture → ${name}`);
}
const capKey = document.querySelector('#objAct .key--rec span');
if (capKey && CAN_SHARE) { capKey.textContent = 'partager'; capKey.parentElement.title = 'Partager l’image, par exemple sur Instagram'; }
else if (capKey) capKey.parentElement.title = 'Télécharger l’image au format Instagram (1080 × 1350)';

/* ══ 01 la vue : réseau ou chrono ═════════════════════════ */

const view = $('view'), viewBox = $('viewBox'), vt = $('vt');
let vmode = MOB.matches ? 'chrono' : 'net', filter = null, hover = null;
document.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.v === vmode)));
/* sous 760 px de large, le réseau n'écrit que les projets et les artistes */
const compact = () => viewBox.clientWidth < 760;
function drawView() {
  const w = viewBox.clientWidth, h = viewBox.clientHeight;
  if (!w || !h) return;
  /* au téléphone, le réseau est trop petit pour se lire : on passe à la chrono */
  if (MOB.matches && vmode === 'net') setTab('chrono', true);
  /* les tranches ne passent en version « au doigt » (réglette, numéro près
     du tiroir) qu'au téléphone ; sur ordinateur, même étroit, le titre est
     sur le bord droit */
  const cp = compact() && (vmode !== 'strates' || MOB.matches);
  view.classList.toggle('is-compact', cp);
  view.classList.toggle('has-vt', !MOB.matches);
  view.classList.toggle('is-mx', vmode === 'matrice');
  view.classList.toggle('is-st', vmode === 'strates');
  scrub.classList.toggle('is-shown', vmode === 'strates');
  viewBox.classList.toggle('is-st-on', vmode === 'strates');
  vtSet(null);
  if (vmode === 'net') drawNet(view, w, h, cp);
  else if (vmode === 'chrono') drawChrono(view, w, h, cp);
  else if (vmode === 'strates') { drawStrata(view, w, h, cp); const k = stSel >= 0 ? stSel : 0; stSel = -1; focusIn('p' + k); }
  else drawMatrix(view, w, h, cp);
  if (filter) markFilter();
  if (MOB.matches && tickSel >= 0) focusIn('p' + tickSel);
}
new ResizeObserver(() => drawView()).observe(viewBox);
function setTab(v, quiet) {
  vmode = v;
  document.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.v === v)));
  if (quiet) return;
  drawView();
  burst(140);
  log({ net: `vue réseau · ${NODES.length} nœuds, ${EDGES.length} liaisons`, chrono: 'vue chrono · un anneau par année', matrice: `vue matrice · ${N} sur ${N}, la diagonale du logo`, strates: 'vue tranches · la tuile du dégradé, une tranche par projet' }[v]);
}
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.v)));

const FOCUS = { net: focusNet, chrono: focusChrono, matrice: focusMatrix, strates: focusStrata };
const focusIn = (id) => { FOCUS[vmode](view, id); vtSet(id); if (vmode === 'strates') syncDial(id ? +id.slice(1) : -1); };

/* le titre du projet visé, à la verticale sur le bord droit de la vue :
   le même endroit et la même voix dans le réseau, la chrono et les
   tranches (sur ordinateur ; la matrice écrit ses liaisons à côté) */
function vtSet(id) {
  const m = id && /^p(\d+)$/.exec(id);
  const on = !!m && !MOB.matches && vmode !== 'matrice';
  if (on) {
    const i = +m[1];
    if (vt.dataset.i !== String(i)) { vt.innerHTML = `<span class="vt__n">${pad2(i)}</span>${P[i].t.replace(/</g, '&lt;')}`; vt.dataset.i = String(i); }
  }
  vt.classList.toggle('is-on', on);
}

/* ══ la réglette des tranches ════════════════════════════
   Onze crans, un par projet, sur le bord droit de la vue : on y fait
   glisser le pouce (comme l'index alphabétique des contacts), la
   tranche suit, cran par cran. Toucher une tranche la choisit ; la
   toucher encore ouvre le dossier. */
const scrub = $('scrub');
scrub.innerHTML = P.map((_, i) => `<i data-i="${i}"><b class="num">${pad2(i)}</b></i>`).join('');
scrub.setAttribute('aria-valuemax', N);
let stSel = -1;
function syncDial(i) {
  stSel = i;
  scrub.querySelectorAll('i').forEach((t) => t.classList.toggle('is-on', +t.dataset.i === i));
  scrub.setAttribute('aria-valuenow', i + 1);
}
function selectStrate(i) {
  if (i === stSel) return;
  if (MOB.matches) tickTo(i); else focusIn('p' + i);
  syncDial(i);
}
(() => {
  let on = false;
  const at = (e) => { const r = scrub.getBoundingClientRect(); return Math.max(0, Math.min(N - 1, Math.floor(((e.clientY - r.top) / r.height) * N))); };
  scrub.addEventListener('pointerdown', (e) => { on = true; scrub.setPointerCapture(e.pointerId); scrub.classList.add('is-drag'); selectStrate(at(e)); });
  scrub.addEventListener('pointermove', (e) => { if (on) selectStrate(at(e)); });
  const end = () => { on = false; scrub.classList.remove('is-drag'); };
  scrub.addEventListener('pointerup', end);
  scrub.addEventListener('pointercancel', end);
  scrub.addEventListener('keydown', (e) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); selectStrate(Math.max(0, Math.min(N - 1, (stSel < 0 ? 0 : stSel) + d))); }
    if (e.key === 'Enter' && stSel >= 0) { e.preventDefault(); openProject(stSel); }
  });
})();
view.addEventListener('pointerover', (e) => {
  /* matrice : un croisement visé écrit ce que les deux projets partagent */
  const m = e.target.closest('.mx');
  if (m) { const key = 'x' + m.dataset.i + '-' + m.dataset.j; if (key !== hover) { hover = key; focusMatrix(view, null, [+m.dataset.i, +m.dataset.j]); } return; }
  const g = e.target.closest('.nd');
  if (!g || g.dataset.id === hover) return;
  hover = g.dataset.id;
  focusIn(hover);
  const ref = g.dataset.ref;
  rows.forEach((r, i) => r.classList.toggle('is-on', ref !== undefined && +ref === i));
  const n = BY.get(hover);
  if (n && n.type !== 'p') logSoon(`nœud « ${n.label.toLowerCase()} » · ${n.nb.size} liaison${n.nb.size > 1 ? 's' : ''}`);
  else if (ref !== undefined) logSoon(`visée ${pad2(+ref)} · ${P[+ref].t.toLowerCase()}`);
});
view.addEventListener('pointerleave', () => { hover = null; focusIn(MOB.matches && tickSel >= 0 ? 'p' + tickSel : null); rows.forEach((r) => r.classList.remove('is-on')); });
view.addEventListener('click', (e) => {
  const m = e.target.closest('.mx');
  if (m) { focusMatrix(view, null, [+m.dataset.i, +m.dataset.j]); return; }
  const g = e.target.closest('.nd');
  if (!g) return;
  if (g.dataset.ref !== undefined) {
    const r = +g.dataset.ref;
    /* au doigt, dans les strates : un premier toucher choisit la couche, le second l'ouvre */
    if (vmode === 'strates' && MOB.matches && stSel !== r) { selectStrate(r); return; }
    openProject(r); return;
  }
  const n = BY.get(g.dataset.id);
  const kind = { a: 'artiste', l: 'lieu', y: 'année', k: 'mot' }[n.type];
  const q = `${kind}=${n.label.toLowerCase()}`;
  applyFilter(filter && filter.q === q ? null : { q, v: [...n.nb].map((m) => m.ref) });
});

function markFilter() {
  view.querySelectorAll('.nd--p').forEach((g) => g.classList.toggle('is-off', !!filter && !filter.v.includes(+g.dataset.ref)));
}
function applyFilter(f) {
  filter = f;
  $('termQ').textContent = filter ? '--' + filter.q : '--tout';
  rows.forEach((r, i) => r.classList.toggle('is-off', !!filter && !filter.v.includes(i)));
  markFilter();
  log(filter ? `filtre ${filter.q} → ${filter.v.length} projet${filter.v.length > 1 ? 's' : ''}` : 'filtre levé');
}

/* ══ 02 l'index : titre et année ══════════════════════════ */

document.documentElement.style.setProperty('--n', N);
const rows = P.map((p, i) => {
  const li = document.createElement('li');
  li.innerHTML = `<button type="button" class="ir"><span class="n num">${pad2(i)}</span><span class="t"></span><i class="dl"></i><span class="y num">${year(p) || '····'}</span></button>`;
  li.querySelector('.t').textContent = p.tc || p.t;
  if (p.tc) li.firstElementChild.title = p.t;
  $('idxList').appendChild(li);
  const b = li.firstElementChild;
  b.addEventListener('pointerenter', () => { if (FINE.matches) focusIn('p' + i); });
  b.addEventListener('pointerleave', () => { if (FINE.matches) focusIn(null); });
  b.addEventListener('focus', () => focusIn('p' + i));
  b.addEventListener('click', () => openProject(i));
  return b;
});

/* ══ le téléscripteur (téléphone) ═════════════════════════
   L'index au pouce : une bande qu'on fait glisser du 01 au 11, à
   son rythme, calée projet par projet. Au-dessus, une bande de
   cotation (numéro, titre, année, lieu) file trois fois plus vite,
   comme un écran de bourse. Le projet au centre s'allume dans la
   vue ; le toucher ouvre son dossier. */
const tickSc = $('tickSc'), tape = $('tape');
const tickCards = P.map((p, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tk';
  b.innerHTML = `<span class="tk__n num">${pad2(i)}</span><span class="tk__t"></span><span class="tk__m num"></span>`;
  b.querySelector('.tk__t').textContent = p.tc || p.t;
  b.querySelector('.tk__m').textContent = [year(p), venue(p)].filter(Boolean).join(' · ');
  b.addEventListener('click', () => { if (tickAt() === i) openProject(i); else tickTo(i); });
  tickSc.appendChild(b);
  return b;
});
const tapeText = P.map((p, i) => `${pad2(i)} ${p.t.toUpperCase()} ${year(p) || '····'} ${venue(p).toUpperCase()}`).join('   ▪   ') + '   ▪   ';
tape.textContent = tapeText + tapeText + tapeText;
const tickW = () => (tickCards[0] ? tickCards[0].offsetWidth : 1);
const tickAt = () => Math.max(0, Math.min(N - 1, Math.round(tickSc.scrollLeft / tickW())));
const tickTo = (i) => tickSc.scrollTo({ left: i * tickW(), behavior: REDUCED ? 'instant' : 'smooth' });
let tickSel = -1;
function tickPaint() {
  const k = tickAt();
  const w = tape.scrollWidth / 3 || 1;
  tape.style.transform = `translate3d(${(-((tickSc.scrollLeft * 3) % w)).toFixed(1)}px,0,0)`;
  if (k === tickSel) return;
  tickSel = k;
  tickCards.forEach((c, i) => c.classList.toggle('is-on', i === k));
  if (MOB.matches) { focusIn('p' + k); rows.forEach((r, i) => r.classList.toggle('is-on', i === k)); }
}
tickSc.addEventListener('scroll', () => requestAnimationFrame(tickPaint), { passive: true });

/* ══ le dossier ═══════════════════════════════════════════ */

function adn(html) {
  const txt = html.replace(/<[^>]+>/g, '').toLowerCase();
  let x = 0, r = '';
  for (const ch of txt) {
    if (/\s/.test(ch)) { x += 3; continue; }
    if (!/[a-zà-ÿœ]/.test(ch)) { x += 1; continue; }
    const w = ch.charCodeAt(0) % 2 ? 1 : 2, v = /[aeiouyàâéèêëîïôûùœ]/.test(ch);
    r += `<rect x="${x}" y="${v ? 0 : 9}" width="${w}" height="${v ? 26 : 17}"/>`;
    x += w + 1;
  }
  return `<svg viewBox="0 0 ${x} 26" preserveAspectRatio="none" aria-hidden="true">${r}</svg><span>adn · ${txt.replace(/[^a-zà-ÿœ]/g, '').length} lettres</span>`;
}
/* le logo du dossier : cinq tuiles, la tête en dégradé tramé */
(() => {
  const [bx, by, bw, bh] = TILE_BOX.split(' ').map(Number);
  const sx = bw * STEP, sy = -sx * SLOPE;
  const g = $('recGlyph');
  g.setAttribute('viewBox', `${bx - 2} ${by + 4 * sy - 2} ${bw + 4 * sx + 4} ${bh - 4 * sy + 4}`);
  let s = '';
  for (let k = 4; k >= 0; k--) s += `<path class="${k ? 'gk' : 'g0'}" d="${TILE_PATH}" transform="translate(${k * sx},${k * sy})"/>`;
  g.innerHTML = s;
})();

let shots = [], openIdx = -1;
const HANG = [1, 0.74, 0.88, 0.68, 0.82, 0.72, 0.94];
const seen = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { setTimeout(() => e.target._reveal(), 350); seen.unobserve(e.target); }
}), { threshold: 0.55 });

function openProject(i) {
  const p = P[i];
  openIdx = i;
  $('recN').textContent = pad2(i);
  $('recNum').innerHTML = `${pad2(i)}<small>/${N}</small>`;
  $('recT').textContent = p.t;
  $('recAdn').innerHTML = adn(p.k.join(' '));
  const rel = P.map((q, j) => ({ q, j })).filter(({ q, j }) => j !== i && (q.a === p.a || venue(q) === venue(p)));
  /* l'essentiel, comme en easy : lieu, artistes, année, ce que le studio a fait */
  const kv = [
    ['lieu', p.l], ['artiste', p.a], ['année', year(p) || '—'],
    ['mots-clés', `<span class="kw">${KEYS[i].map((k) => `<span>${k}</span>`).join('')}</span>`, 1],
    ['liaisons', rel.length ? rel.map(({ q, j }) => `<a href="#p-${pad2(j)}" data-go="${j}">${pad2(j)} ${q.t}</a>`).join(' · ') : '—', 1]
  ];
  $('recM').innerHTML = kv.map(([k, v, w]) => `<div${w ? ' class="wide"' : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const reel = $('reel');
  reel.innerHTML = '';
  shots = [];
  const list = p.ph.length ? p.ph : [[null, ''], [null, ''], [null, '']];
  list.forEach(([file, cap]) => {
    const r = file ? RATIO[file] || 1.5 : 1.5;
    const f = document.createElement('figure');
    f.className = file ? 'shot' : 'shot shot--empty';
    /* rien sous les visuels : la légende ne sert plus qu'au texte alternatif */
    f.innerHTML = file
      ? `<div class="shot__img" style="aspect-ratio:${r}" tabindex="0" role="button" aria-label="Agrandir : ${cap}"><img src="../img/${file}.webp" alt="${p.t} : ${cap}" decoding="async"><canvas></canvas><i class="scan"></i></div>`
      : `<div class="shot__img" style="aspect-ratio:${r}"></div>`;
    reel.appendChild(f);
    const s = { el: f };
    if (file) {
      const img = f.querySelector('img'), cv = f.querySelector('canvas');
      s.draw = () => drawPhoto(cv, img, st);
      if (img.complete && img.naturalWidth) s.draw(); else img.addEventListener('load', s.draw, { once: true });
      let t = 0;
      f._reveal = () => { clearTimeout(t); f.classList.add('is-seen'); t = setTimeout(() => f.classList.add('is-done'), 950); };
      const cover = () => { clearTimeout(t); f.classList.remove('is-seen', 'is-done'); };
      if (FINE.matches) { f.addEventListener('pointerenter', f._reveal); f.addEventListener('pointerleave', cover); }
      else seen.observe(f);
    }
    shots.push(s);
  });
  rig.dataset.open = '';
  rows.forEach((r, j) => r.classList.toggle('is-open', j === i));
  $('recScroll').scrollTop = 0;
  requestAnimationFrame(layoutReel);
  burst(200);
  log(`ouverture ${pad2(i)} · ${p.t.toLowerCase()}`);
  syncHash();
}
function layoutReel() {
  /* la hauteur des visuels suit celle de la bande, repères des coins compris : rien ne déborde */
  const reel = $('reel'), H = reel.clientHeight - 30, narrow = innerWidth <= 900;
  /* plafonnés : des visuels de catalogue, jamais en plein cadre */
  const Hc = Math.min(H, 250);
  shots.forEach((s, k) => s.el.style.setProperty('--sh', narrow ? '' : Math.max(90, Math.round(Hc * HANG[k % HANG.length])) + 'px'));
  requestAnimationFrame(edge);
  requestAnimationFrame(() => shots.forEach((s) => s.draw && s.draw()));
}
function closeProject() {
  if (openIdx < 0) return;
  /* ouverte ici : on revient en arrière, « précédent » fait pareil */
  if (history.state && history.state.sp === 'open') { history.back(); return; }
  shutProject();
}
function shutProject() {
  if (openIdx < 0) return;
  log(`fermeture ${pad2(openIdx)}`);
  delete rig.dataset.open;
  rows.forEach((r) => r.classList.remove('is-open'));
  openIdx = -1;
  syncHash();
}
$('recClose').addEventListener('click', closeProject);
/* la bande de visuels défile à la molette comme au trackpad, et un
   fondu au bord droit dit qu'il y en a d'autres */
const track = $('reel');
function edge() {
  const more = track.scrollWidth - track.clientWidth - track.scrollLeft > 4;
  $('reelWrap').classList.toggle('has-more', more);
  $('reelWrap').classList.toggle('has-less', track.scrollLeft > 4);
}
track.addEventListener('scroll', edge, { passive: true });
/* toucher un visuel montre la photo elle-même, trois fois plus grande, sur place */
loupe(track, { scale: 3, margin: () => parseFloat(getComputedStyle(rig).paddingLeft) || 0 });
track.addEventListener('wheel', (e) => {
  if (innerWidth <= 900 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  if (track.scrollWidth <= track.clientWidth) return;
  e.preventDefault();
  track.scrollLeft += e.deltaY;
}, { passive: false });
$('recM').addEventListener('click', (e) => { const a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); openProject(+a.dataset.go); } });
addEventListener('resize', () => { if (openIdx >= 0) layoutReel(); }, { passive: true });

/* ══ clavier, liens ═══════════════════════════════════════ */

/* dans un dossier, sur ordinateur, les flèches passent d'un visuel à
   l'autre : le suivant vient se caler au bord gauche de la bande */
function reelStep(d) {
  const reel = $('reel');
  if (!shots.length) return;
  const x0 = shots[0].el.offsetLeft, xs = shots.map((s) => s.el.offsetLeft - x0);
  const max = reel.scrollWidth - reel.clientWidth;
  let k = 0;
  xs.forEach((x, i) => { if (Math.abs(x - reel.scrollLeft) < Math.abs(xs[k] - reel.scrollLeft)) k = i; });
  const j = Math.max(0, Math.min(xs.length - 1, k + d));
  reel.scrollTo({ left: Math.min(xs[j], max), behavior: 'smooth' });
}
addEventListener('keydown', (e) => {
  if (paramsOpen() || e.ctrlKey || e.metaKey) return;
  if (e.target.closest && e.target.closest('input')) return;
  if (e.key === 'Escape') { if (openIdx >= 0) closeProject(); else if (filter) applyFilter(null); }
  if (openIdx >= 0 && !MOB.matches && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')
      && (e.target === document.body || (e.target.closest && e.target.closest('#rec')))) {
    e.preventDefault();
    reelStep(e.key === 'ArrowRight' ? 1 : -1);
  }
});
/* ouvrir un dossier ajoute une entrée à l'historique : le bouton
   « précédent » le referme au lieu de quitter le site */
function syncHash() {
  const h = openIdx >= 0 ? '#p-' + pad2(openIdx) : '';
  if (!h) { history.replaceState(null, '', location.pathname + location.search); return; }
  if (location.hash === h) return;
  if (history.state && history.state.sp === 'open') history.replaceState({ sp: 'open' }, '', h);
  else history.pushState({ sp: 'open' }, '', h);
}
addEventListener('popstate', () => { if (!fromHash()) shutProject(); });
function fromHash() {
  const m = /^#p-(\d{1,2})/.exec(location.hash);
  if (m) { const i = +m[1] - 1; if (i >= 0 && i < N) { openProject(i); return true; } }
  return false;
}

/* ══ l'amorçage ═══════════════════════════════════════════ */

apply();
const boot = $('boot');
const BOOT = [
  '> paramétrage',
  `> chargement : ${N} projets · ${new Set(P.map((p) => p.a)).size} artistes · ${new Set(P.map(venue)).size} lieux · ${NODES.length} nœuds`,
  `> logo : pas ${LOGO.step.toFixed(3)} · pente ${LOGO.slope.toFixed(2)} · 5 tuiles`,
  `> rendu ${st.mode} · palette ${st.pal}`,
  '> prêt'
];
function up() {
  document.body.classList.add('is-up');
  fitColo();
  drawView();
  tickSel = -1; tickPaint();
  log('prêt · réglez, tournez, filtrez, capturez');
  setTimeout(fromHash, 500);
}
if (DEV || REDUCED) { boot.textContent = BOOT.join('\n'); up(); }
else {
  let k = 0;
  const it = setInterval(() => {
    boot.textContent = BOOT.slice(0, ++k).join('\n');
    if (k >= BOOT.length) { clearInterval(it); setTimeout(up, 60); }
  }, 90);
}

if (DEV) {
  window.SP = {
    set(k, v) { change(k, v); },
    open(i) { openProject(i); },
    close: closeProject,
    view(v) { document.querySelector(`.tabs [data-v="${v}"]`).click(); },
    focus(id) { focusIn(id); },
    reveal(n) { shots[n] && shots[n].el._reveal && shots[n].el._reveal(); },
    burst(ms) { burst(ms); },
    phase(v) { st.phase = v; still = true; },
    cap() { return makeCapture().toDataURL('image/png'); }
  };
}
