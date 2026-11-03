/* La loupe — un visuel qu'on touche grandit sur place
   ───────────────────────────────────────────────────────────
   Deux fois en easy, trois fois en hard. Il grandit depuis sa
   place, sans passer en plein écran ni être recadré ; s'il
   déborderait, il est ramené dans la fenêtre. Le reste de la page
   passe sous un voile de papier. Toucher, Échap, la molette ou un
   changement de taille de fenêtre le reposent à sa place.
   Si l'écran est trop petit pour grandir vraiment (téléphone en
   portrait), le visuel prend quand même sa taille agrandie et se
   parcourt au doigt, en partant de l'endroit touché.            */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const M0 = 16;       /* marge au bord de l'écran, à défaut de celle de la page */
const CAP = 30;      /* la place de la légende, sous le visuel */
const MIN_GAIN = 1.35;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let cur = null;

/* `margin` : la marge de la page, pour que le visuel agrandi ne dépasse
   jamais l'alignement des autres éléments */
export function loupe(root, { scale = 2, pick = '.shot__img', margin = () => M0 } = {}) {
  const opt = { scale, margin };
  root.addEventListener('click', (e) => {
    const box = e.target.closest(pick);
    if (!box || !box.querySelector('img')) return;
    e.stopPropagation();
    open(box, opt, e.clientX, e.clientY);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const box = e.target.closest && e.target.closest(pick);
    if (!box || !box.querySelector('img')) return;
    e.preventDefault();
    const r = box.getBoundingClientRect();
    open(box, opt, r.left + r.width / 2, r.top + r.height / 2);
  });
}

export const loupeOpen = () => !!cur;

function open(box, { scale, margin }, px, py) {
  if (cur) { close(); return; }
  const src = box.querySelector('img');
  const r = box.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const vw = innerWidth, vh = innerHeight;
  const M = Math.max(M0, margin() || 0);
  const cap = box.parentElement && box.parentElement.querySelector('figcaption');
  /* sans légende, pas de place à lui garder */
  const C = cap ? CAP : 0;
  const fit = Math.min((vw - 2 * M) / r.width, (vh - 2 * M - C) / r.height);
  /* assez de place : il grandit (jusqu'à `scale`) et tient dans la fenêtre ;
     sinon, il prend sa taille agrandie et se parcourt au doigt */
  const pan = Math.min(scale, fit) < MIN_GAIN;
  const S = pan ? scale : Math.min(scale, fit);
  const w = r.width * S, h = r.height * S;

  const el = document.createElement('div');
  el.className = 'loupe' + (pan ? ' loupe--pan' : '');
  el.tabIndex = -1;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', (src.alt || 'Visuel') + ' — agrandi. Toucher ou Échap pour refermer.');
  el.innerHTML =
    `<div class="loupe__veil"></div>` +
    `<div class="loupe__stage"><figure class="loupe__fig"><img alt=""></figure></div>`;
  const stage = el.querySelector('.loupe__stage'), fig = el.querySelector('.loupe__fig'), img = fig.querySelector('img');
  img.src = src.currentSrc || src.src;
  img.alt = src.alt;
  /* la légende suit le visuel ; quand on le parcourt au doigt, elle reste
     en bas de l'écran pour ne pas partir hors champ */
  if (cap) {
    const fc = document.createElement(pan ? 'p' : 'figcaption');
    fc.innerHTML = cap.innerHTML;
    if (pan) { fc.className = 'loupe__cap'; el.append(fc); } else fig.append(fc);
  }

  let x, y;
  if (!pan) {
    /* il grandit autour de son centre, ramené dans la fenêtre */
    x = clamp(r.left + r.width / 2 - w / 2, M, vw - M - w);
    y = clamp(r.top + r.height / 2 - h / 2, M, vh - M - C - h);
    stage.style.cssText = 'width:100%;height:100%';
  } else {
    const sw = Math.max(vw, w + 2 * M), sh = Math.max(vh, h + 2 * M + C);
    x = Math.max(M, (sw - w) / 2);
    y = Math.max(M, (sh - C - h) / 2);
    stage.style.cssText = `width:${sw}px;height:${sh}px`;
  }
  fig.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  document.body.append(el);

  if (pan) {
    /* on part de l'endroit touché */
    const fx = clamp((px - r.left) / r.width, 0, 1), fy = clamp((py - r.top) / r.height, 0, 1);
    el.scrollLeft = x + fx * w - vw / 2;
    el.scrollTop = y + fy * h - vh / 2;
  }

  /* il part exactement de la place du visuel dans la page */
  const from = () => {
    const f = fig.getBoundingClientRect(), b = box.getBoundingClientRect();
    return `translate(${(b.left - f.left).toFixed(1)}px,${(b.top - f.top).toFixed(1)}px) scale(${(b.width / f.width).toFixed(4)})`;
  };
  if (!REDUCED) {
    fig.style.transition = 'none';
    fig.style.transform = from();
    void fig.offsetWidth;
    fig.style.transition = '';
  }
  box.classList.add('is-loupe');
  void el.offsetWidth;
  el.classList.add('is-on');
  fig.style.transform = '';

  const onKey = (e) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (e.key === 'Tab') e.preventDefault();
  };
  const onWheel = () => { if (!pan) close(); };
  el.addEventListener('click', () => close());
  el.addEventListener('wheel', onWheel, { passive: true });
  addEventListener('keydown', onKey, true);
  addEventListener('resize', close, { passive: true });
  el.focus({ preventScroll: true });

  cur = {
    el, box,
    done() {
      removeEventListener('keydown', onKey, true);
      removeEventListener('resize', close);
    },
    back() { return REDUCED ? '' : from(); }
  };
}

function close() {
  if (!cur) return;
  const { el, box } = cur;
  cur.done();
  const fig = el.querySelector('.loupe__fig');
  fig.style.transform = cur.back();
  el.classList.remove('is-on');
  el.classList.add('is-off');
  cur = null;
  const end = () => { el.remove(); box.classList.remove('is-loupe'); };
  if (REDUCED) end(); else setTimeout(end, 340);
  box.focus && box.focus({ preventScroll: true });
}
