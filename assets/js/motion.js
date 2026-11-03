/* studio, paramètre — moteur de mouvement
   ───────────────────────────────────────────────────────────
   Aucune transition CSS n'anime la scène. Chaque grandeur
   visible (x, y, rotation, échelle, opacité) est un ressort qui
   poursuit sa cible. Changer d'avis en cours de route ne coupe
   donc jamais un mouvement : ça déplace la cible, et la vitesse
   acquise est conservée. C'est ce qui fait le glissé.            */

const SUBS = new Set();
let running = false;
let prev = 0;

function frame(t) {
  const dt = Math.min((t - prev) / 1000, 1 / 24); /* frame perdue : on plafonne */
  prev = t;
  let alive = false;
  for (const fn of SUBS) { if (fn(dt) === true) alive = true; }
  if (alive) requestAnimationFrame(frame);
  else running = false;
}

/** Réveille la boucle. Appelé à chaque intention de l'utilisateur. */
export function wake() {
  if (running) return;
  running = true;
  prev = performance.now();
  requestAnimationFrame(frame);
}

/** Enregistre un rendu. `fn(dt)` renvoie true tant qu'il lui faut des frames. */
export function onFrame(fn) { SUBS.add(fn); wake(); }

/* Deux profils suffisent :
   — `glide` : amorti critique, aucun rebond, pour les déplacements ;
   — `soft`  : plus lent encore, pour les opacités et les textes.   */
export const GLIDE = { stiffness: 128, damping: 23, precision: 0.02 };
export const SOFT  = { stiffness: 92,  damping: 21, precision: 0.002 };
export const SNAP  = { stiffness: 210, damping: 27, precision: 0.02 };

export class Spring {
  constructor(value, cfg = GLIDE) {
    this.v = value;
    this.target = value;
    this.vel = 0;
    this.k = cfg.stiffness;
    this.c = cfg.damping;
    this.eps = cfg.precision;
    this.wait = 0;        /* retard restant avant de prendre la cible */
    this.queued = null;
    this.settled = true;
  }

  /** Vise `t`, éventuellement après `delay` secondes. */
  set(t, delay = 0) {
    if (delay > 0) {
      if (this.queued === t && this.wait > 0) return;
      this.queued = t; this.wait = delay; this.settled = false;
      return;
    }
    this.queued = null; this.wait = 0;
    if (t !== this.target) { this.target = t; this.settled = false; }
  }

  /** Se téléporte : ni vitesse, ni trainée. */
  jump(t) {
    this.target = this.v = t;
    this.vel = 0; this.wait = 0; this.queued = null;
    this.settled = true;
  }

  /** Force la valeur sur la cible, sans mouvement (mise au point, tests). */
  snap() {
    if (this.queued !== null) { this.target = this.queued; this.queued = null; }
    this.wait = 0; this.v = this.target; this.vel = 0; this.settled = true;
  }

  step(dt) {
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0 && this.queued !== null) {
        this.target = this.queued; this.queued = null;
      }
    }
    if (this.settled) return false;

    /* sous-pas fixes : le ressort reste stable même à 30 fps */
    const n = Math.max(1, Math.ceil(dt * 200));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -this.k * (this.v - this.target) - this.c * this.vel;
      this.vel += a * h;
      this.v += this.vel * h;
    }

    if (this.wait <= 0 &&
        Math.abs(this.v - this.target) < this.eps &&
        Math.abs(this.vel) < this.eps * 12) {
      this.v = this.target; this.vel = 0; this.settled = true;
      return false;
    }
    return true;
  }
}

/** Un paquet de ressorts nommés, avancés ensemble. */
export class Rig {
  constructor(spec) {
    this.s = {};
    for (const key in spec) this.s[key] = new Spring(spec[key][0], spec[key][1]);
  }
  set(key, t, delay) { this.s[key].set(t, delay); }
  jump(key, t) { this.s[key].jump(t); }
  get(key) { return this.s[key].v; }
  snap() { for (const k in this.s) this.s[k].snap(); }
  step(dt) {
    let alive = false;
    for (const k in this.s) { if (this.s[k].step(dt)) alive = true; }
    return alive;
  }
}

/* petites fonctions de forme */
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const mix = (a, b, t) => a + (b - a) * t;
/** cloche gaussienne, 1 au centre */
export const bell = (d, sigma) => Math.exp(-(d * d) / (2 * sigma * sigma));
