/* studio, paramètre — le panneau Paramètres
   Ctrl + , (⌘ + , sur Mac) : le raccourci des Paramètres dans
   Adobe, SketchUp, AutoCAD. Au doigt, la touche dessinée en haut
   à droite fait la même chose. Studio, périmètre et contact y
   tiennent ensemble — l'ancien about et l'ancien contact fusionnés. */

import { drawGlyph, STEP, SLOPE, LOGO_GREYS } from './logo.js?v=1bbe07d1';
import { TILE_PATH, TILE_BOX } from '../js/data.js?v=1bbe07d1';

document.documentElement.dataset.type = 'cabinet';

const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const CTRL = MAC ? '⌘' : 'ctrl';

const ICONS = {
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="1.5"/><path d="M3 6.5l9 6.5 9-6.5"/>',
  wa: '<path d="M3.5 20.5l1.3-4.6A8.2 8.2 0 1 1 8 19.3l-4.5 1.2z"/><path d="M9 8.6c.3 1 .8 2 1.6 2.8.8.8 1.8 1.4 2.8 1.7l1-1.2 2 .9-.3 1.6c-1.9.5-4-.4-5.6-2s-2.5-3.7-2-5.6l1.6-.3.9 2L9 8.6z"/>',
  tel: '<path d="M8.2 3.5l2 4-1.7 1.6a11 11 0 0 0 6.4 6.4l1.6-1.7 4 2-.6 3a2 2 0 0 1-2.2 1.6A16.5 16.5 0 0 1 3.6 5.3 2 2 0 0 1 5.2 3.1l3-.2z"/>',
  ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/>',
  x: '<path d="M5 5l14 14M19 5L5 19"/>'
};
export const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

export const keycap = () =>
  `<kbd class="ctrl">${CTRL}</kbd><kbd class="comma">,</kbd>`;

/* coordonnées assemblées à l'affichage, jamais dans la source */
const MAIL = ['stu.parametre', 'gmail.com'].join('@');
const RAW = '33' + '782429838';
export function wire(root = document) {
  root.querySelectorAll('[data-mail]').forEach((el) => (el.href = 'mailto:' + MAIL));
  root.querySelectorAll('[data-mail-txt]').forEach((el) => (el.textContent = MAIL));
  root.querySelectorAll('[data-wa]').forEach((el) => { el.href = 'https://wa.me/' + RAW; el.rel = 'noopener'; el.target = '_blank'; });
  root.querySelectorAll('[data-tel]').forEach((el) => (el.href = 'tel:+' + RAW));
  root.querySelectorAll('[data-ig]').forEach((el) => { el.href = 'https://www.instagram.com/studio_parametre/'; el.rel = 'me noopener'; el.target = '_blank'; });
  root.querySelectorAll('[data-key]').forEach((el) => (el.innerHTML = keycap()));
}

const el = document.createElement('div');
el.className = 'prm';
el.id = 'prm';
el.setAttribute('role', 'dialog');
el.setAttribute('aria-modal', 'true');
el.setAttribute('aria-labelledby', 'prm-t');
el.innerHTML = `
  <div class="prm__drift" aria-hidden="true"></div>
  <div class="prm__veil" data-close></div>
  <section class="prm__win" tabindex="-1">
    <header class="prm__bar">
      <h2 id="prm-t">Paramètres</h2>
      <div>
        <span class="key" aria-hidden="true">${keycap()}</span>
        <button class="ico" type="button" data-close aria-label="Fermer">${icon('x')}</button>
      </div>
    </header>
    <div class="prm__logo">
      <svg aria-hidden="true" focusable="false"></svg>
      <p><svg class="mark" viewBox="0 0 7033 1000" role="img" aria-label="studio, paramètre" focusable="false"><path d="M 447,524 C 440,418 376,362 234,362 84,362 27,425 27,508 c 0,44 16,82 62,111 35,22 81,36 164,56 42,10 79,21 79,56 0,37 -41,51 -87,51 -63,0 -102,-27 -102,-73 H 9 c 2,100 86,171 237,171 140,0 215,-61 215,-163 0,-64 -29,-98 -81,-119 -38,-15 -91,-26 -147,-42 -53,-15 -80,-27 -80,-56 0,-29 28,-41 77,-41 59,0 85,17 92,65 z m 303.9996,147 c 0,61 -24,96 -76,96 -53,0 -75,-36 -75,-98 V 467 h 272 v -92 h -272 V 242 h -128 v 440 c 0,106 57,198 201,198 139,0 199,-93 199,-197 V 543 h -121 z m 596.9991,196 V 375 h -129 v 284 c 0,65 -35,112 -101,112 -55,0 -83,-30 -83,-92 V 375 H 904.99872 v 324 c 0,108 69,181 166.99998,181 68,0 119,-26 153,-82 v 69 z m 270.0001,-93 c -65,0 -111,-61 -111,-149 0,-101 36,-152 112,-152 72,0 109,53 109,160 0,83 -48,141 -110,141 z m 233,93 V 195 h -128 v 244 c -37,-52 -85,-77 -146,-77 -127,0 -202,105 -202,254 0,166 89,264 213,264 60,0 106,-23 137,-73 l 1,60 z m 170.0007,0 V 375 h -130 v 492 z m 0,-551 V 195 h -130 v 121 z m 280.9994,455 c -79,0 -119,-50 -119,-150 0,-100 40,-149 119,-149 79,0 119,49 119,149 0,100 -40,150 -119,150 z m 0,109 c 153,0 250,-103 250,-259 0,-157 -96,-259 -250,-259 -156,0 -253,103 -253,259 0,153 94,259 253,259 z m 249.9994,143 c 104,-22 138,-76 138,-189 V 732 h -138 v 135 h 77 c -1,63 -26,93 -77,106 z m 622.9995,-254 c -72,0 -109,-53 -109,-160 0,-83 48,-141 110,-141 65,0 111,61 111,149 0,101 -36,152 -112,152 z m -104,331 V 803 c 37,52 85,77 146,77 127,0 202,-105 202,-254 0,-166 -89,-264 -213,-264 -60,0 -106,23 -137,73 l -1,-60 h -125 v 725 z m 673.0007,-420 c -1,58 -51,107 -118,107 -41,0 -63,-18 -63,-55 0,-42 24,-63 98,-77 48,-9 71,-16 84,-29 z m 131,187 V 556 c 0,-124 -54,-194 -210,-194 -158,0 -214,71 -216,173 h 121 c 6,-44 30,-73 89,-73 51,0 83,19 83,51 0,34 -18,47 -83,56 -131,18 -226,34 -226,176 0,80 52,135 164,135 66,0 118,-23 149,-57 1,15 4,32 8,44 z m 167,0 V 611 c 0,-79 39,-119 119,-119 12,0 24,1 36,3 V 362 h -17 c -53,0 -103,6 -146,72 v -59 h -122 v 492 z m 444.9991,-187 c -1,58 -51,107 -118,107 -41,0 -63,-18 -63,-55 0,-42 24,-63 98,-77 48,-9 71,-16 84,-29 z m 131,187 V 556 c 0,-124 -54,-194 -210,-194 -158,0 -214,71 -216,173 h 121 c 6,-44 30,-73 89,-73 51,0 83,19 83,51 0,34 -18,47 -83,56 -131,18 -226,34 -226,176 0,80 52,135 164,135 66,0 118,-23 149,-57 1,15 4,32 8,44 z m 741,0 V 526 c 0,-92 -69,-164 -168,-164 -62,0 -106,24 -133,78 -38,-57 -70,-78 -137,-78 -65,0 -111,20 -144,85 v -72 h -122 v 492 h 130 V 568 c 0,-64 27,-96 79,-96 57,0 78,20 78,99 v 296 h 130 V 573 c 0,-60 35,-105 83,-105 46,0 77,42 77,101 v 298 z m 152.9995,-294 c 5,-68 48,-108 100,-108 51,0 99,35 101,108 z m 335,82 c 0,-195 -80,-293 -231,-293 -151,0 -238,98 -238,250 0,178 82,268 246,268 105,0 186,-57 216,-158 h -134 c -9,34 -46,55 -88,55 -64,0 -106,-48 -110,-122 z m -166,-342 31,-55 -207,-121 -47,82 z m 470.0005,358 c 0,61 -24,96 -76,96 -53,0 -75,-36 -75,-98 V 467 h 272 v -92 h -272 V 242 h -128 v 440 c 0,106 57,198 201,198 139,0 199,-93 199,-197 V 543 h -121 z m 283.999,196 V 611 c 0,-79 39,-119 119,-119 12,0 24,1 36,3 V 362 h -17 c -53,0 -103,6 -146,72 v -59 h -122 v 492 z m 263.9985,-294 c 5,-68 48,-108 100,-108 51,0 99,35 101,108 z m 335,82 c 0,-195 -80,-293 -231,-293 -151,0 -238,98 -238,250 0,178 82,268 246,268 105,0 186,-57 216,-158 h -134 c -9,34 -46,55 -88,55 -64,0 -106,-48 -110,-122 z"/></svg></p>
    </div>
    <dl>
      <div class="prm__row">
        <dt>Studio</dt>
        <dd class="lead">Studio Paramètre conçoit des scénographies d’exposition, du conseil spatial et des aménagements d’espace. Il est ouvert au théâtre et à d’autres formes de mise en scène.</dd>
      </div>
      <div class="prm__row">
        <dt>Contact</dt>
        <dd><div class="prm__chan">
          <a class="ico" data-mail aria-label="E-mail">${icon('mail')}</a>
          <a class="ico" data-wa aria-label="WhatsApp">${icon('wa')}</a>
          <a class="ico" data-tel aria-label="Téléphone">${icon('tel')}</a>
          <a class="ico" data-ig aria-label="Instagram">${icon('ig')}</a>
        </div></dd>
      </div>
      <div class="prm__row">
        <dt>Méthode</dt>
        <dd>Je m’imprègne du travail des artistes et de ce que les curateurs tissent, puis je construis des liaisons. Quand c’est réussi, le visiteur se sent guidé, comprend et s’intéresse sans savoir comment.</dd>
      </div>
      <div class="prm__row">
        <dt>Périmètre</dt>
        <dd><ul>
          <li>Scénographie d’exposition</li>
          <li>Muséographie</li>
          <li>Conseil spatial</li>
          <li>Agencement d’espace</li>
          <li class="more">Théâtre et autres projets sur demande</li>
        </ul></dd>
      </div>
    </dl>
    <p class="prm__foot"><span>© 2026 studio, paramètre</span><span class="prm__hint"><kbd>${CTRL}</kbd> <kbd>,</kbd> ouvre et ferme ce panneau</span></p>
    <div class="prm__lgw">
    <button class="prm__lg" type="button" aria-expanded="false" aria-controls="prm-lg">mentions légales</button>
    <dl class="prm__legal" id="prm-lg" hidden>
      <dt>Éditeur</dt>
      <dd>Studio Paramètre<br>Jérôme Talleux, entrepreneur individuel<br>SIRET 840 980 080 00021<br><a data-mail data-mail-txt></a></dd>
      <dt>Publication</dt>
      <dd>Jérôme Talleux, directeur de la publication</dd>
      <dt>Hébergement</dt>
      <dd>GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États‑Unis</dd>
      <dt>Données</dt>
      <dd>Aucun cookie, aucune mesure d’audience. Le navigateur garde seulement vos réglages d’affichage, qui ne quittent pas votre appareil.</dd>
      <dt>Site</dt>
      <dd>Pensé par studio, paramètre. Bâti par Claude<i class="px" aria-hidden="true"></i></dd>
    </dl>
    </div>
  </section>`;
document.body.appendChild(el);
drawGlyph(el.querySelector('.prm__logo svg'), 5);

/* derrière le voile, les tuiles du logo dérivent lentement : on devine
   qu'il se passe quelque chose, sans jamais le voir net */
(() => {
  const drift = el.querySelector('.prm__drift');
  const fills = ['url(#gel)', ...LOGO_GREYS];
  fills.forEach((f, k) => {
    const d = document.createElement('div');
    d.className = 'drift drift--' + k;
    d.innerHTML = `<svg viewBox="${TILE_BOX}"><path d="${TILE_PATH}" fill="${f}"/></svg>`;
    drift.prepend(d);
  });
})();
wire(el);

/* easy / hard : la même maison, deux réglages. On entre dans le
   « paramétrage » par un petit bouton creusé dans la page, à la
   manière d'un instrument ; on en ressort par le même bouton,
   allumé. Le projet ouvert suit (#p-05). */
const HARD = /\/hard\/(index\.html)?$/.test(location.pathname);
function modeHref(hard) {
  const base = location.pathname.replace(/(hard\/)?(index\.html)?$/, '');
  return base + (hard ? 'hard/' : '') + location.search + location.hash;
}
document.querySelectorAll('[data-mode-switch]').forEach((m) => {
  m.innerHTML =
    `<a class="tek${HARD ? ' is-on' : ''}" href="${modeHref(!HARD)}" aria-label="${HARD ? 'Quitter le paramétrage : revenir à la version easy' : 'Paramétrage : passer à la version hard'}">` +
    `<span class="tek__key"><i class="tek__led"></i></span><span class="tek__lbl">paramétrage</span></a>`;
  const a = m.firstElementChild;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    a.classList.add('is-down');
    try { localStorage.setItem('sp-mode', HARD ? 'easy' : 'hard'); } catch (_) {}
    document.documentElement.classList.add(HARD ? 'is-leaving-soft' : 'is-leaving-hard');
    setTimeout(() => { location.href = modeHref(!HARD); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420);
  });
});

/* revenir sur une page par « précédent » la ressert telle qu'on l'a
   quittée (cache du navigateur) : on relève le rideau du passage */
addEventListener('pageshow', () => {
  document.documentElement.classList.remove('is-leaving-hard', 'is-leaving-soft');
  document.querySelectorAll('.tek.is-down').forEach((a) => a.classList.remove('is-down'));
});

const win = el.querySelector('.prm__win');
let back = null;

/* les mentions légales : repliées sous le pied, on les déplie sur place */
const lgBtn = el.querySelector('.prm__lg');
const lg = el.querySelector('.prm__legal');
function legal(open) {
  lg.hidden = !open;
  lgBtn.setAttribute('aria-expanded', open);
  if (open) win.scrollTo({ top: win.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
lgBtn.addEventListener('click', () => legal(lg.hidden));

export function openParams() {
  if (el.classList.contains('is-on')) return;
  back = document.activeElement;
  el.classList.add('is-on');
  document.documentElement.dataset.params = 'on';
  legal(false);
  win.scrollTop = 0;
  requestAnimationFrame(() => el.querySelector('[data-close].ico').focus({ preventScroll: true }));
}
export function closeParams() {
  if (!el.classList.contains('is-on')) return;
  el.classList.remove('is-on');
  delete document.documentElement.dataset.params;
  if (back && back.focus) back.focus({ preventScroll: true });
}
export const paramsOpen = () => el.classList.contains('is-on');

el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeParams(); });

addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault();
    paramsOpen() ? closeParams() : openParams();
    return;
  }
  if (!paramsOpen()) return;
  if (e.key === 'Escape') { e.stopImmediatePropagation(); closeParams(); return; }
  /* le focus reste dans la fenêtre tant qu'elle est ouverte */
  if (e.key === 'Tab') {
    const f = [...win.querySelectorAll('a[href], button')];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}, true);

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-params]')) { e.preventDefault(); openParams(); }
});

wire();
