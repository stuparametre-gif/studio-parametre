/* Maquette D — la console
   ───────────────────────────────────────────────────────────
   Le tableau de réglage, dessiné comme un petit instrument :
   des touches à voyant, des molettes qu'on tourne en glissant,
   des afficheurs où l'on tape des chiffres. Chaque réglage
   modifie l'aspect du site en direct.                          */

export const LOGO = { step: 0.272, slope: 0.62, depth: 10, rot: 0 };
export const DEFAULTS = { mode: 'trame', pal: 'papier', ...LOGO, speed: 16, glitch: 10, grain: 22, dens: 4 };

const MODES = [['trame', 'trame'], ['ascii', 'ascii'], ['voxel', 'voxel'], ['relief', 'relief'], ['nuage', 'nuage']];
const PALS = [['nuit', '#0c0c0d', '#ecebe6'], ['phosphore', '#030a06', '#8dffb0'], ['thermique', '#07060d', '#faba39'], ['papier', '#ece9e1', '#111111'], ['cobalt', '#f2f2ef', '#1a2bff']];
/* clé, étiquette, min, max, pas de saisie, décimales */
const FIELDS = [['step', 'pas', 0.08, 0.8, 0.01, 3], ['slope', 'pente', -1.2, 1.6, 0.01, 2], ['depth', 'prof.', 0, 80, 1, 0], ['rot', 'rot.', -180, 180, 1, 0]];
/* « glitch » est devenu « décalage » : un défaut de repérage, comme en impression */
const KNOBS = [['speed', 'vitesse', -60, 60], ['dens', 'densité', 1, 10], ['glitch', 'décalage', 0, 100], ['grain', 'grain', 0, 100]];

export function buildConsole(root, st, change) {
  const ui = {};
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const col = (cls) => { const c = el('div', 'cc ' + cls); root.append(c); return c; };
  const title = (c, name) => { const t = el('h3', 'cg__t', `<span>${name}</span>`); c.append(t); return t; };

  /* ── le rendu et la palette : les réglages de l'image, posés dans le
     module objet, là où on voit le résultat (la console garde les
     chiffres). Le dossier projet peut alors couvrir la console. ── */
  const host = document.getElementById('objBody') || root;
  const rowR = el('div', 'modes');
  rowR.setAttribute('role', 'group');
  rowR.setAttribute('aria-label', 'rendu');
  ui.mode = MODES.map(([k, label]) => {
    const b = el('button', 'sk', `<i class="led"></i><span>${label}</span>`);
    b.type = 'button'; b.dataset.v = k; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => change('mode', k));
    rowR.append(b);
    return b;
  });
  host.append(rowR);

  const rowP = el('div', 'pal');
  rowP.setAttribute('role', 'group');
  rowP.setAttribute('aria-label', 'palette');
  ui.pal = PALS.map(([k, bg, ink]) => {
    const b = el('button', 'sw', `<b style="--sb:${bg};--si:${ink}"></b><i class="led"></i>`);
    b.type = 'button'; b.dataset.v = k; b.title = k; b.setAttribute('aria-label', 'palette ' + k); b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => change('pal', k));
    rowP.append(b);
    return b;
  });
  host.append(rowP);

  /* ── colonne 2 : la géométrie du logo, on tape des chiffres (2 × 2) ── */
  const c2 = col('cc--geo');
  const tG = title(c2, 'géométrie');
  const rst = el('button', 'cg__rst', '[ reset logo ]');
  rst.type = 'button'; rst.title = 'revenir aux valeurs du logo';
  rst.addEventListener('click', () => change('*reset'));
  tG.append(rst);
  const grid = el('div', 'g22');
  ui.fields = {};
  FIELDS.forEach(([k, label, min, max, step, dec]) => {
    const f = el('label', 'fld', `<span class="fld__l">${label}</span><span class="lcd"><button type="button" class="fld__b" data-d="-1" aria-label="${label} moins">−</button><input type="text" inputmode="decimal" spellcheck="false" aria-label="${label}"><button type="button" class="fld__b" data-d="1" aria-label="${label} plus">+</button></span>`);
    const inp = f.querySelector('input');
    const fmt = (v) => (+v).toFixed(dec);
    const clampv = (v) => Math.max(min, Math.min(max, v));
    const commit = () => {
      const v = parseFloat(String(inp.value).replace(',', '.'));
      if (Number.isFinite(v)) change(k, clampv(v)); else inp.value = fmt(st[k]);
    };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { commit(); inp.blur(); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); change(k, clampv(+st[k] + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1))); }
    });
    inp.addEventListener('input', () => { const v = parseFloat(String(inp.value).replace(',', '.')); if (Number.isFinite(v)) change(k, clampv(v), true); });
    inp.addEventListener('blur', commit);
    f.querySelectorAll('.fld__b').forEach((b) => {
      let t = 0;
      const bump = () => change(k, clampv(+(+st[k] + +b.dataset.d * step).toFixed(dec + 1)));
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); bump(); t = setInterval(bump, 110); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => clearInterval(t)));
    });
    ui.fields[k] = { inp, fmt };
    grid.append(f);
  });
  c2.append(grid);

  /* ── colonne 3 : les effets, quatre molettes (2 × 2) ── */
  const c3 = col('cc--fx');
  title(c3, 'effets');
  const kg = el('div', 'g22');
  ui.knobs = {};
  KNOBS.forEach(([k, label, min, max]) => {
    const w = el('div', 'knb');
    w.innerHTML = `<div class="knb__d" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="${min}" aria-valuemax="${max}"><i></i></div><span class="knb__txt"><span class="knb__v num"></span><span class="knb__l">${label}</span></span>`;
    const dial = w.querySelector('.knb__d');
    let y0 = 0, v0 = 0;
    const setFrom = (v) => change(k, Math.round(Math.max(min, Math.min(max, v))));
    dial.addEventListener('pointerdown', (e) => { dial.setPointerCapture(e.pointerId); y0 = e.clientY; v0 = +st[k]; dial.classList.add('is-drag'); });
    dial.addEventListener('pointermove', (e) => { if (!dial.hasPointerCapture(e.pointerId)) return; setFrom(v0 + ((y0 - e.clientY) / 140) * (max - min)); });
    dial.addEventListener('pointerup', () => dial.classList.remove('is-drag'));
    dial.addEventListener('wheel', (e) => { e.preventDefault(); setFrom(+st[k] - Math.sign(e.deltaY) * Math.max(1, (max - min) / 40)); }, { passive: false });
    dial.addEventListener('keydown', (e) => {
      const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
      if (d) { e.preventDefault(); setFrom(+st[k] + d * Math.max(1, (max - min) / 40)); }
    });
    ui.knobs[k] = { dial, val: w.querySelector('.knb__v'), min, max };
    kg.append(w);
  });
  c3.append(kg);

  /* ── actions : dans l'en-tête du module objet, là où elles agissent ── */
  const bar = document.getElementById('objAct');
  if (bar) {
    const act = (label, fn, cls = '') => { const b = el('button', 'key key--mini ' + cls, `<span>${label}</span>`); b.type = 'button'; b.addEventListener('click', fn); bar.append(b); return b; };
    act('aléa', () => change('*random'));
    act('capture', () => change('*capture'), 'key--rec');
  }

  return {
    sync() {
      ui.mode.forEach((b) => { const on = b.dataset.v === st.mode; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      ui.pal.forEach((b) => { const on = b.dataset.v === st.pal; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      for (const k in ui.fields) { const f = ui.fields[k]; if (document.activeElement !== f.inp) f.inp.value = f.fmt(st[k]); }
      for (const k in ui.knobs) {
        const q = ui.knobs[k], u = (st[k] - q.min) / (q.max - q.min);
        q.dial.style.setProperty('--a', (-135 + u * 270).toFixed(1) + 'deg');
        q.dial.setAttribute('aria-valuenow', st[k]);
        q.val.textContent = String(Math.round(st[k])).padStart(3, '0');
      }
    }
  };
}
