/* studio, paramètre — le logo, en ses déclinaisons
   La géométrie est mesurée sur Ressources_site/02 Logo StuPar
   seul fond blanc.jpg : d'une tuile à la suivante, 27,2 % de la
   largeur d'une tuile vers la droite, et une montée de 0,62 fois
   ce pas. Les gris sont ceux du fichier (#666 → #e6e6e6).       */

import { TILE_PATH, TILE_BOX } from '../js/data.js';

export const STEP = 0.272;
export const SLOPE = 0.62;
export const LOGO_GREYS = ['#666666', '#999999', '#cccccc', '#e6e6e6'];

const NS = 'http://www.w3.org/2000/svg';

/** Dessine la pile de `n` tuiles dans `svg`, la première en dégradé. */
export function drawGlyph(svg, n = 5, greys = LOGO_GREYS) {
  const [bx, by, bw, bh] = TILE_BOX.split(' ').map(Number);
  const sx = bw * STEP, sy = -sx * SLOPE;
  svg.setAttribute('viewBox',
    `${bx} ${by + (n - 1) * sy} ${bw + (n - 1) * sx} ${bh - (n - 1) * sy}`);
  svg.innerHTML = '';
  for (let k = n - 1; k >= 0; k--) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', TILE_PATH);
    p.setAttribute('transform', `translate(${k * sx},${k * sy})`);
    p.setAttribute('fill', k === 0 ? 'url(#gel)' : greys[Math.min(k - 1, greys.length - 1)]);
    svg.appendChild(p);
  }
  return svg;
}

document.querySelectorAll('svg[data-glyph]').forEach((s) => drawGlyph(s, +s.dataset.glyph || 5));
