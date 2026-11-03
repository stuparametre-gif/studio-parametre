/* studio, paramètre — le fonds
   Une entrée par projet. `ph` ne contient que des visuels réels :
   les vues manquantes ne sont pas affichées en cadres vides.
   Une fiche ne dit que l'essentiel (03/11) : titre, lieu, artistes,
   année, et quelques mots-clés sur ce que le studio a fait (`k`, le
   rôle en premier). Les dates complètes (`d`) ne s'affichent plus ;
   la chrono hard en tire le mois. La légende de `ph` ne sert plus
   qu'au texte alternatif.                                          */

/* La virgule, reprise telle quelle de Ressources_site/TuileX.svg */
export const TILE_PATH =
  'M188.09,205.61l.09,106.29-35.32-20.47c-1.31,38.75,10.66,72.34,35.39,102.25l.05,51.91c-90.9-72.58-81.33-181.45-81.65-286.9l81.44,46.93h0Z';
/* cadre exact du tracé — bounding box réelle (SVGGeometryElement.getBBox()
   sur le path ci-dessus), pas un rectangle de recadrage approximatif.
   C'est la seule source fiable : n'importe quelle marge ici fausse
   le ratio et donne l'impression d'une tuile déformée. */
export const TILE_BOX = '106.496 158.69 81.804 286.9';
export const TILE_RATIO = 81.804 / 286.9;

export const PROJECTS = [
  {
    t: 'Ndop, filer le bleu pour raconter un monde',
    /* titre court (03/11) : là où la place manque, rouleau du téléphone,
       index et téléscripteur de hard ; la fiche garde le titre entier */
    tc: 'Ndop, filer le bleu',
    a: 'Artistes variés',
    l: 'Maison Gacha, Paris',
    d: '21 octobre 2026 – 27 février 2027',
    k: ['Scénographie complète', 'Création technique', 'Modélisation'],
    ph: [
      ['ndop-01', 'Les alcôves de fils bleus, textiles de Ly Dumas'],
      ['ndop-02', 'L’entrée, photographie monumentale'],
      ['ndop-03', 'Le trône sur son socle rouge, entre les ndop'],
      ['ndop-04', 'Le costume présenté en fragments'],
      ['ndop-05', 'Masque, salle rouge'],
      ['ndop-06', 'Création de Ly Dumas devant les ndop'],
      ['ndop-07', 'À travers le rideau de fils d’une alcôve'],
      ['ndop-08', 'Modélisation des alcôves'],
      ['ndop-09', 'Modélisation de l’entrée'],
      ['ndop-10', 'Modélisation de l’espace du trône']
    ]
  },
  {
    t: 'The Proxy Collection',
    a: 'Livia Melzi',
    l: 'Lee Ufan Arles × Guerlain, Prix Art & Environnement, projet lauréat',
    d: 'octobre 2026',
    /* l'idée est celle de l'artiste ; les images sont des simulations
       (textures, lumières, placement des œuvres), d'après la maquette 3D */
    k: ['Conseil spatial', 'Modélisation', 'Simulation'],
    ph: [
      ['proxy-01', 'Simulation de l’accrochage'],
      ['proxy-02', 'Simulation, variante de couleur murale'],
      ['proxy-03', 'Simulation, étude d’objet'],
      ['proxy-04', 'Simulation, étude d’objet']
    ]
  },
  {
    t: 'Fenêtre sur l’Afrique',
    a: 'Gonçalo Ivo',
    l: 'Maison Gacha, Paris',
    d: '20 mars – 9 juillet 2026',
    k: ['Scénographie complète'],
    ph: [
      ['fenetre-01', 'Vue d’accrochage'],
      ['fenetre-02', 'Face-à-face toile / textile'],
      ['fenetre-03', 'Le vide comme intervalle'],
      ['fenetre-04', 'Volumes et surfaces planes'],
      ['fenetre-accroches', 'Étude d’accroches'],
      ['fenetre-socle', 'Étude du socle type'],
      ['fenetre-mobilier', 'Étude du mobilier']
    ]
  },
  {
    t: 'Paroles du tissu-monde',
    a: 'Barbara Asei Dantoni',
    l: 'Maison Gacha, Paris',
    d: '30 juin – 27 septembre 2025',
    k: ['Conseil spatial', 'Modélisation'],
    ph: [['tissu-01', 'Vue d’exposition'], ['tissu-02', 'Détail']]
  },
  {
    t: 'Par quatre chemins',
    a: '35 artistes de Poush',
    l: 'Château La Coste, Provence',
    d: '12 avril – 9 juin 2025',
    k: ['Conseil spatial', 'Implantation', 'Visibilité', 'Modélisation'],
    ph: [
      ['poush-05', 'Vue d’exposition'],
      ['poush-06', 'Vue d’exposition'],
      ['poush-07', 'Vue d’exposition'],
      ['poush-08', 'Vue d’exposition'],
      ['poush-01', 'Modélisation du pavillon'],
      ['poush-02', 'Modélisation du pavillon'],
      ['poush-03', 'Modélisation, détail'],
      ['poush-04', 'Modélisation, détail']
    ]
  },
  {
    t: 'Les mains bleuies',
    a: 'Mallory Lowe Mpoka',
    l: 'Maison Gacha, Paris',
    d: '21 mars – 6 juin 2025',
    k: ['Conseil spatial', 'Modélisation'],
    ph: [['mains-01', 'Vue d’exposition'], ['mains-02', 'Trois distances de lecture']]
  },
  {
    t: 'Tabula Rasa',
    a: 'Livia Melzi',
    l: 'Galerie Salon H, Paris',
    d: '8 mars – 18 avril 2025',
    k: ['Conseil spatial', 'Densité', 'Parcours'],
    ph: [
      ['tabula-05', 'Vue d’exposition'],
      ['tabula-01', 'Vue d’exposition'],
      ['tabula-02', 'Le seuil, réglé par le parcours'],
      ['tabula-03', 'Détail'],
      ['tabula-04', 'Façade']
    ]
  },
  {
    t: 'Rethinking Identity',
    a: 'Livia Melzi',
    l: 'EMOP / Arendt Award, Luxembourg',
    d: '2023',
    k: ['Conseil spatial', 'Accrochage', 'Contraintes du bâtiment'],
    ph: [
      ['arendt-02', 'Vue d’exposition'],
      ['arendt-03', 'Vue d’exposition'],
      ['arendt-04', 'Modélisation de la salle'],
      ['arendt-01', 'Étude d’accrochage']
    ]
  },
  {
    t: 'Circulation(s)',
    a: 'Livia Melzi',
    l: 'Athens Photo Festival, Benaki Museum, Athènes',
    d: 'juin 2022',
    k: ['Conseil spatial', 'Modélisation'],
    ph: [
      ['circulation-01', 'Vue d’exposition'],
      ['circulation-02', 'Vue d’exposition'],
      ['circulation-03', 'Le mur d’accrochage'],
      ['circulation-04', 'Modélisation du mur'],
      ['circulation-05', 'Modélisation, détail']
    ]
  },
  {
    t: 'Image Satellite',
    a: 'Livia Melzi',
    l: 'Festival L’IMAGE_SATELLITE, Nice',
    d: '2021',
    k: ['Conseil spatial', 'Couleurs', 'Parcours'],
    ph: [['satellite-01', 'Vue du parvis'], ['satellite-02', 'Orientation et lumière'], ['satellite-03', 'Étude d’implantation']]
  },
  {
    t: 'Qu’il était bon mon petit français',
    a: 'Livia Melzi',
    l: 'Salon de Montrouge',
    d: '2021',
    k: ['Conseil spatial', 'Accrochage', 'Rythme'],
    ph: [['montrouge-01', 'Étude d’accrochage'], ['montrouge-02', 'Variante de parcours']]
  }
];

/* proportions réelles des visuels (largeur / hauteur) : la page
   réserve la bonne place avant chargement, et ne recadre jamais. */
export const RATIO = {
  'ndop-01': 1.333, 'ndop-02': 1.333, 'ndop-03': 0.750, 'ndop-04': 1.073, 'ndop-05': 0.781,
  'ndop-06': 0.750, 'ndop-07': 0.791, 'ndop-08': 1.617, 'ndop-09': 1.731, 'ndop-10': 1.777,
  'proxy-01': 1.339, 'proxy-02': 1.491, 'proxy-03': 1.491, 'proxy-04': 1.339,
  'arendt-02': 1.579, 'arendt-03': 1.222, 'arendt-04': 1.788,
  'circulation-01': 1.333, 'circulation-02': 0.750, 'circulation-03': 1.531, 'circulation-04': 1.777, 'circulation-05': 1.777,
  'poush-05': 0.786, 'poush-06': 0.804, 'poush-07': 0.812, 'poush-08': 0.779, 'tabula-05': 1.484,
  'arendt-01': 1.793, 'fenetre-01': 1.244, 'fenetre-02': 1.195, 'fenetre-03': 1.279,
  'fenetre-04': 1.332, 'fenetre-accroches': 1.333, 'fenetre-mobilier': 1.333, 'fenetre-socle': 1.333,
  'identite-01': 0.494, 'identite-02': 0.495, 'mains-01': 1.777, 'mains-02': 1.777,
  'montrouge-01': 1.720, 'montrouge-02': 1.720, 'poush-01': 1.793, 'poush-02': 1.894,
  'poush-03': 1.818, 'poush-04': 1.804, 'proto-01': 1.340, 'proto-02': 1.837,
  'proto-03': 1.779, 'satellite-01': 1.793, 'satellite-02': 1.792, 'satellite-03': 1.777,
  'tabula-01': 1.793, 'tabula-02': 1.545, 'tabula-03': 1.687, 'tabula-04': 1.687,
  'tissu-01': 1.793, 'tissu-02': 1.806
};
