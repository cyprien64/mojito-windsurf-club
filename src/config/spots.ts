// =====================================================================
//  FICHIER CENTRAL DES SPOTS — Mojito Windsurf Club
// ---------------------------------------------------------------------
//  - Coordonnées GPS : chaque spot indique sa source et la date de
//    vérification. Modifiez-les ici si le point de mise à l'eau diffère.
//  - Paramètres nautiques (`defaults`) : valeurs INITIALES proposées pour
//    démarrer. Elles doivent être validées par les admins du club, puis
//    ajustées depuis la page « Admin » du site (sans toucher au code).
//  - Orientations « dangereuses » : seules celles qui sont évidentes (vent
//    offshore vers le large à Saint-Jean-de-Luz et La Franqui) sont pré-remplies. Les autres
//    sont une décision de sécurité qui revient aux admins qui connaissent le spot.
// =====================================================================

import type { SectorRating, SpotDefinition } from '../types';
import { SECTOR_CODES, type SectorCode } from '../lib/wind';

/** Construit les 16 secteurs à partir de listes lisibles. */
function sectors(spec: Partial<Record<SectorRating, SectorCode[]>>, fallback: SectorRating = 'ok'): SectorRating[] {
  return SECTOR_CODES.map((code) => {
    for (const rating of ['danger', 'bad', 'ideal', 'ok'] as SectorRating[]) {
      if (spec[rating]?.includes(code)) return rating;
    }
    return fallback;
  });
}

export const SPOTS: SpotDefinition[] = [
  {
    id: 'gabas',
    name: 'Lac du Gabas / Eslourenties',
    shortName: 'Lac du Gabas',
    location: 'Eslourenties-Daban (64) · Luquet (65)',
    aka: ['Lac de Cabas', 'Esclourentis', 'Réservoir du Gabas'],
    kind: 'lac',
    lat: 43.2803,
    lon: -0.1291,
    coordSource: 'OpenStreetMap — centre de l’emprise du « Réservoir du Gabas » (way 37370685)',
    coordCheckedOn: '2026-11-13',
    accent: '#3CCFC1',
    info:
      'Réservoir d’environ 190 ha. Deux mises à l’eau (Eslourenties et Lourenties). Les zones de quiétude (amont du grand et du petit lac) sont interdites d’accès.',
    stations: [986],
    water: {
      depth: 'moyenne',
      weed: false,
      surface: 'plat',
      foil: 'prudence',
      foilNote: 'Profondeur variable selon le niveau du réservoir : repérez les hauts-fonds et les berges avant de foiler.',
    },
    defaults: {
      // Lac orienté NO–SE : les vents dans l'axe offrent le plus de fetch.
      sectors: sectors({ ideal: ['NO', 'ONO', 'SE', 'ESE'] }),
      speed: { minRideable: 9, idealMin: 13, idealMax: 24, maxRideable: 30 },
      gusts: { maxGust: 36, maxGustFactor: 1.7 },
      notes: 'Réglages initiaux à valider par les admins. Axe du lac NO–SE (fetch maximal).',
    },
  },
  {
    id: 'leon',
    name: 'Lac de Léon',
    shortName: 'Lac de Léon',
    location: 'Léon (40) · Landes',
    aka: ['Étang de Léon'],
    kind: 'lac',
    lat: 43.8945,
    lon: -1.3205,
    coordSource: 'OpenStreetMap / Nominatim — objet « Étang de Léon »',
    coordCheckedOn: '2026-11-13',
    accent: '#3FE06A',
    photo: {
      src: 'spots/leon.jpg',
      author: 'VIGNA christian',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lac_de_L%C3%A9on_Landes_France.jpg',
      caption: 'Lac de Léon',
    },
    info: 'Lac côtier landais, régime de vents d’ouest et brises thermiques en été.',
    water: {
      depth: 'faible',
      weed: false,
      surface: 'plat',
      foil: 'prudence',
      foilNote: 'Lac peu profond par endroits : restez dans les zones de plus d’un mètre avec un foil.',
    },
    defaults: {
      sectors: sectors({ ideal: ['O', 'ONO', 'NO', 'OSO'] }),
      speed: { minRideable: 9, idealMin: 13, idealMax: 24, maxRideable: 32 },
      gusts: { maxGust: 38, maxGustFactor: 1.7 },
      notes: 'Réglages initiaux à valider par les admins.',
    },
  },
  {
    id: 'la-mine',
    name: 'Leucate – La Mine',
    shortName: 'La Mine',
    location: 'Étang de Leucate · Leucate (11)',
    kind: 'étang',
    lat: 42.8971,
    lon: 3.0155,
    coordSource: 'Fiche spot « Etang de Leucate / La Mine » (unplug-kitesurf.com)',
    coordCheckedOn: '2026-11-13',
    accent: '#1FB3A6',
    photo: {
      src: 'spots/la-mine.jpg',
      author: 'Florian Pépellin',
      license: 'CC BY-SA 3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:%C3%89tang_de_Leucate_depuis_voie_ferr%C3%A9e.JPG',
      caption: 'Étang de Leucate (vue générale, pas le spot exact)',
    },
    info:
      'Dans la continuité du Goulet, cadre sauvage, eau plate à clapoteuse et peu profonde. Kite interdit. Vérifiez les règles saisonnières auprès de l’office de tourisme.',
    stations: [1538],
    water: {
      depth: 'faible',
      weed: true,
      surface: 'clapot',
      foil: 'déconseillé',
      foilNote: 'Plan d’eau peu profond avec beaucoup d’algues : le foil risque de toucher le fond et de s’engluer.',
    },
    defaults: {
      // Tramontane (NO à N) = vent dominant ; marin (SE) praticable.
      sectors: sectors({
        ideal: ['N', 'NNO', 'NO', 'ONO'],
        ok: ['O', 'NNE', 'E', 'ESE', 'SE', 'SSE'],
        bad: ['NE', 'ENE', 'S', 'SSO', 'SO', 'OSO'],
      }),
      speed: { minRideable: 12, idealMin: 16, idealMax: 28, maxRideable: 38 },
      gusts: { maxGust: 45, maxGustFactor: 1.6 },
      notes: 'Réglages initiaux à valider par les admins. Tramontane = vent dominant.',
    },
  },
  {
    id: 'parc-huitres',
    name: 'Leucate – Parc à huîtres',
    shortName: 'Parc à huîtres',
    location: 'Étang de Leucate · La Corrège (11)',
    kind: 'étang',
    lat: 42.8732,
    lon: 3.035,
    coordSource: 'Windfinder — spot « Étang de Leucate / Parc à huîtres »',
    coordCheckedOn: '2026-11-13',
    accent: '#BFE34A',
    photo: {
      src: 'spots/parc-huitres.jpg',
      author: 'Ymblanter',
      license: 'CC BY-SA 4.0',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:Fitou_%C3%89tang_de_Leucate_and_the_village_of_Leucate_seen_from_Aire_de_Fitou.jpg',
      caption: 'Étang de Leucate vu de Fitou (vue générale, pas le spot exact)',
    },
    info:
      'Spot historique entre Leucate-village et Port-Leucate, faible profondeur, idéal pour progresser. Kite interdit. Algues possibles selon la saison (aileron anti-algues conseillé).',
    stations: [1538],
    water: {
      depth: 'très faible',
      weed: true,
      surface: 'plat',
      foil: 'déconseillé',
      foilNote: 'Très faible profondeur, algues et tables ostréicoles : foil fortement déconseillé.',
    },
    defaults: {
      sectors: sectors({
        ideal: ['NO', 'ONO', 'NNO', 'O'],
        ok: ['N', 'NNE', 'SE', 'SSE', 'S', 'OSO'],
        bad: ['NE', 'ENE', 'E', 'ESE', 'SSO', 'SO'],
      }),
      speed: { minRideable: 11, idealMin: 15, idealMax: 25, maxRideable: 33 },
      gusts: { maxGust: 40, maxGustFactor: 1.6 },
      notes: 'Réglages initiaux à valider par les admins. Spot peu profond, adapté à la progression.',
    },
  },
  {
    id: 'eole',
    name: 'Leucate – Éole',
    shortName: 'Éole',
    location: 'Étang de Leucate · Le Barcarès (66)',
    kind: 'étang',
    lat: 42.8321,
    lon: 3.0347,
    coordSource: 'Windfinder — spot « Étang de Leucate / Eole »',
    coordCheckedOn: '2026-11-13',
    accent: '#F7E256',
    photo: {
      src: 'spots/eole.jpg',
      author: 'H. Zell',
      license: 'CC BY-SA 3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Grau_de_Leucate_001.jpg',
      caption: 'Grau de Leucate (secteur de l’étang, pas le spot exact)',
    },
    info:
      'Deux bassins communicants, Tramontane dominante. Certaines sources signalent la fermeture de la base Éole et un accès restreint : vérifiez l’accès avant de vous déplacer.',
    stations: [1538],
    water: {
      depth: 'faible',
      weed: false,
      surface: 'plat',
      foil: 'prudence',
      foilNote: 'Étang peu profond : mât court et repérage des zones profondes indispensables pour foiler.',
    },
    defaults: {
      sectors: sectors({
        ideal: ['N', 'NNO', 'NO', 'ONO'],
        ok: ['O', 'SE', 'SSE', 'S', 'NNE'],
        bad: ['NE', 'ENE', 'E', 'ESE', 'SSO', 'SO', 'OSO'],
      }),
      speed: { minRideable: 12, idealMin: 16, idealMax: 28, maxRideable: 38 },
      gusts: { maxGust: 45, maxGustFactor: 1.6 },
      notes: 'Réglages initiaux à valider par les admins. Vérifier l’accès au spot (base signalée fermée).',
    },
  },
  {
    id: 'saint-jean-de-luz',
    name: 'Saint-Jean-de-Luz',
    shortName: 'St-Jean-de-Luz',
    location: 'Baie de Saint-Jean-de-Luz · Pays basque (64)',
    aka: ['Baie de Saint-Jean-de-Luz', 'Socoa'],
    kind: 'baie',
    lat: 43.3887,
    lon: -1.6627,
    coordSource: 'Windfinder — spot « Saint-Jean-de-Luz » (Grande Plage)',
    coordCheckedOn: '2026-11-13',
    accent: '#3CCFC1',
    photo: {
      src: 'spots/saint-jean-de-luz.jpg',
      author: 'Giorgio Galeotti',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Baie_de_Saint-Jean-de-Luz_-_Saint-Jean-de-Luz,_France_-_July_16,_2024.jpg',
      caption: 'Baie de Saint-Jean-de-Luz',
    },
    info:
      'Baie fermée par trois digues, ouverte au nord-ouest : plan d’eau abrité de la houle mais exposé au vent de mer. Respectez les zones de baignade balisées et le chenal du port (Ciboure / Socoa).',
    stations: [1715],
    water: {
      depth: 'profonde',
      weed: false,
      surface: 'clapot',
      foil: 'ok',
      foilNote: 'Eau profonde, adaptée au foil. Attention aux bateaux dans le chenal et aux baigneurs en saison.',
    },
    tides: true,
    marine: { lat: 43.42, lon: -1.69, label: 'au large de la baie (hors digues)' },
    defaults: {
      // Baie ouverte au NO : vents d'ouest à nord-ouest = vent de mer.
      // Vents de sud à sud-est = OFFSHORE, ils poussent vers le large → classés dangereux par prudence.
      sectors: sectors({
        ideal: ['O', 'ONO', 'NO'],
        ok: ['NNO', 'N', 'OSO'],
        bad: ['NNE', 'NE', 'ENE', 'E', 'SO', 'SSO'],
        danger: ['ESE', 'SE', 'SSE', 'S'],
      }),
      speed: { minRideable: 11, idealMin: 15, idealMax: 25, maxRideable: 32 },
      gusts: { maxGust: 38, maxGustFactor: 1.6 },
      notes:
        'Réglages initiaux à valider par les admins. Vents de S à ESE classés dangereux par défaut : offshore, ils poussent vers le large.',
    },
  },
  {
    id: 'hossegor',
    name: 'Lac marin d’Hossegor',
    shortName: 'Hossegor',
    location: 'Soorts-Hossegor (40) · Landes',
    aka: ['Lac d’Hossegor'],
    kind: 'lac',
    lat: 43.6722,
    lon: -1.4287,
    coordSource: 'OpenStreetMap / Nominatim — objet « Lac d’Hossegor »',
    coordCheckedOn: '2026-11-13',
    accent: '#1FB3A6',
    info:
      'Lac marin relié à l’océan par le canal : il se vide et se remplit avec la marée. Naviguez plutôt autour de la pleine mer, le lac devient très peu profond à marée basse.',
    tides: true,
    water: {
      depth: 'faible',
      weed: false,
      surface: 'plat',
      foil: 'prudence',
      foilNote: 'Foil seulement autour de la pleine mer : à marée basse, le lac est très peu profond.',
    },
    marine: { lat: 43.67, lon: -1.47, label: 'au large d’Hossegor' },
    defaults: {
      sectors: sectors({ ideal: ['O', 'ONO', 'NO', 'OSO'] }),
      speed: { minRideable: 10, idealMin: 14, idealMax: 24, maxRideable: 32 },
      gusts: { maxGust: 38, maxGustFactor: 1.7 },
      notes: 'Réglages initiaux à valider par les admins. Vérifier l’horaire de pleine mer.',
    },
  },
  {
    id: 'soustons',
    name: 'Étang de Soustons',
    shortName: 'Soustons',
    location: 'Soustons (40) · Landes',
    aka: ['Lac de Soustons'],
    kind: 'lac',
    lat: 43.7703,
    lon: -1.3277,
    coordSource: 'OpenStreetMap — centre de l’emprise de l’« Étang de Soustons » (relation 1705749)',
    coordCheckedOn: '2026-11-13',
    accent: '#3FE06A',
    info: 'Grand étang landais d’eau douce, abrité par la forêt. Régime de vents d’ouest et brises thermiques en été.',
    water: {
      depth: 'faible',
      weed: false,
      surface: 'plat',
      foil: 'prudence',
      foilNote: 'Étang peu profond par endroits : repérez les zones de plus d’un mètre avant de foiler.',
    },
    defaults: {
      sectors: sectors({ ideal: ['O', 'ONO', 'NO', 'OSO'] }),
      speed: { minRideable: 9, idealMin: 13, idealMax: 24, maxRideable: 32 },
      gusts: { maxGust: 38, maxGustFactor: 1.7 },
      notes: 'Réglages initiaux à valider par les admins.',
    },
  },
  {
    id: 'gruissan',
    name: 'Gruissan – Étang de Mateille',
    shortName: 'Gruissan',
    location: 'Les Ayguades · Gruissan (11)',
    kind: 'étang',
    lat: 43.1252,
    lon: 3.126,
    coordSource: 'OpenStreetMap / Nominatim — objet « Étang de Mateille »',
    coordCheckedOn: '2026-11-13',
    accent: '#BFE34A',
    info: 'Étang peu profond entre Gruissan et Narbonne-Plage, réputé pour la Tramontane. Balise Pioupiou du club local sur place.',
    stations: [602],
    water: {
      depth: 'faible',
      weed: false,
      surface: 'plat',
      foil: 'prudence',
      foilNote: 'Étang peu profond : mât court et repérage du fond indispensables.',
    },
    defaults: {
      sectors: sectors({
        ideal: ['N', 'NNO', 'NO', 'ONO'],
        ok: ['O', 'SE', 'SSE', 'ESE', 'E'],
        bad: ['NNE', 'NE', 'ENE', 'S', 'SSO', 'SO', 'OSO'],
      }),
      speed: { minRideable: 12, idealMin: 16, idealMax: 28, maxRideable: 38 },
      gusts: { maxGust: 45, maxGustFactor: 1.6 },
      notes: 'Réglages initiaux à valider par les admins. Tramontane = vent dominant.',
    },
  },
  {
    id: 'la-franqui',
    name: 'Leucate – La Franqui (mer)',
    shortName: 'La Franqui',
    location: 'Plage des Coussoules · Leucate (11)',
    kind: 'baie',
    lat: 42.9419,
    lon: 3.0388,
    coordSource: 'OpenStreetMap — poste de secours de la plage des Coussoules',
    coordCheckedOn: '2026-11-13',
    accent: '#3CCFC1',
    info:
      'Spot en mer du Mondial du Vent. Plage orientée à l’est : la Tramontane (NO) y est side-off et les vents d’ouest y sont offshore. Chenal de sortie réservé au windsurf, kite interdit sous la falaise.',
    stations: [1538],
    water: {
      depth: 'profonde',
      weed: false,
      surface: 'vagues',
      foil: 'prudence',
      foilNote: 'Mer : shorebreak et vagues par vent de mer, sortez par le chenal balisé.',
    },
    marine: { lat: 42.94, lon: 3.08, label: 'au large de La Franqui' },
    defaults: {
      // Plage face à l'est : vents d'ouest = offshore vers le large → dangereux par prudence.
      sectors: sectors({
        ideal: ['N', 'NNO', 'SE', 'ESE'],
        ok: ['NNE', 'NE', 'ENE', 'E', 'SSE', 'S'],
        bad: ['NO', 'SSO', 'SO'],
        danger: ['ONO', 'O', 'OSO'],
      }),
      speed: { minRideable: 12, idealMin: 16, idealMax: 28, maxRideable: 38 },
      gusts: { maxGust: 45, maxGustFactor: 1.6 },
      notes:
        'Réglages initiaux à valider par les admins. Vents d’ouest classés dangereux par défaut : offshore, ils poussent vers le large.',
    },
  },
  {
    id: 'lourdes',
    name: 'Lac de Lourdes',
    shortName: 'Lourdes',
    location: 'Lourdes (65) · Hautes-Pyrénées',
    kind: 'lac',
    lat: 43.1083,
    lon: -0.0858,
    coordSource: 'OpenStreetMap — centre de l’emprise du « Lac de Lourdes » (way 42425195)',
    coordCheckedOn: '2026-11-13',
    accent: '#3FE06A',
    photo: {
      src: 'spots/lourdes.jpg',
      author: 'Lourdes Tourisme',
      license: 'CC BY-SA 3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lac_de_Lourdes.jpg',
      caption: 'Lac de Lourdes',
    },
    info:
      'Lac glaciaire d’environ 1,3 km de long, orienté est-ouest, au pied des Pyrénées. Vent souvent faible et irrégulier (effets de relief) : les journées de vent d’ouest bien établi sont les meilleures. Vérifiez les règles locales de navigation.',
    water: {
      depth: 'moyenne',
      weed: false,
      surface: 'plat',
      foil: 'prudence',
      foilNote: 'Bords peu profonds et zone de tourbière à l’ouest : foilez au centre du lac.',
    },
    defaults: {
      // Lac orienté est-ouest : les vents dans l'axe offrent le plus de fetch.
      sectors: sectors({ ideal: ['O', 'ONO', 'OSO', 'E'], bad: ['N', 'S'] }),
      speed: { minRideable: 8, idealMin: 12, idealMax: 22, maxRideable: 28 },
      gusts: { maxGust: 32, maxGustFactor: 1.8 },
      notes: 'Réglages initiaux à valider par les admins. Lac de montagne : vent souvent rafaleux.',
    },
  },
  {
    id: 'ganguise',
    name: 'Lac de la Ganguise',
    shortName: 'Ganguise',
    location: 'Belflou (11) · Lauragais',
    kind: 'lac',
    lat: 43.3179,
    lon: 1.8055,
    coordSource: 'OpenStreetMap / Nominatim — réservoir « Lac de la Ganguise »',
    coordCheckedOn: '2026-11-13',
    accent: '#3FE06A',
    info:
      'Grand réservoir du Lauragais, exposé aux deux vents locaux : le Cers (ouest / nord-ouest) et l’Autan (sud-est), souvent soutenus. Niveau d’eau variable selon la saison.',
    water: {
      depth: 'moyenne',
      weed: false,
      surface: 'clapot',
      foil: 'prudence',
      foilNote: 'Niveau du réservoir variable : repérez les hauts-fonds près des berges avant de foiler.',
    },
    defaults: {
      // Cers (O–NO) et Autan (SE) : les deux régimes dominants du Lauragais.
      sectors: sectors({ ideal: ['O', 'ONO', 'NO', 'SE', 'ESE'], bad: ['N', 'NNE', 'S', 'SSO'] }),
      speed: { minRideable: 10, idealMin: 14, idealMax: 26, maxRideable: 34 },
      gusts: { maxGust: 42, maxGustFactor: 1.7 },
      notes: 'Réglages initiaux à valider par les admins. L’Autan peut être très rafaleux.',
    },
  },
  {
    id: 'sanguinet',
    name: 'Lac de Sanguinet',
    shortName: 'Sanguinet',
    location: 'Lac de Cazaux-Sanguinet · Sanguinet (40)',
    aka: ['Lac de Cazaux-Sanguinet'],
    kind: 'lac',
    lat: 44.4972,
    lon: -1.0927,
    coordSource: 'Windfinder — spot « Lac de Sanguinet / Sanguinet »',
    coordCheckedOn: '2026-11-13',
    accent: '#1FB3A6',
    info:
      'Très grand lac d’eau douce (près de 6 000 ha), eau claire, bords sableux peu profonds et centre profond. Une partie du lac, côté base aérienne de Cazaux, est réglementée : respectez le balisage.',
    water: {
      depth: 'profonde',
      weed: false,
      surface: 'clapot',
      foil: 'ok',
      foilNote: 'Bords peu profonds : partez au foil une fois sorti de la zone de bord. Respectez les zones balisées.',
    },
    defaults: {
      sectors: sectors({ ideal: ['O', 'ONO', 'NO', 'OSO', 'NNO'] }),
      speed: { minRideable: 10, idealMin: 14, idealMax: 25, maxRideable: 33 },
      gusts: { maxGust: 40, maxGustFactor: 1.7 },
      notes: 'Réglages initiaux à valider par les admins.',
    },
  },
  {
    id: 'la-nautique',
    name: 'Narbonne – La Nautique',
    shortName: 'La Nautique',
    location: 'Port la Nautique · Étang de Bages-Sigean (11)',
    kind: 'étang',
    lat: 43.142,
    lon: 3.0093,
    coordSource: 'OpenStreetMap / Nominatim — port de « Port-la-Nautique »',
    coordCheckedOn: '2026-11-13',
    accent: '#BFE34A',
    info:
      'Spot de l’étang de Bages-Sigean, au sud de Narbonne : eau plate et Tramontane puissante, apprécié pour la vitesse. Plan d’eau peu profond.',
    water: {
      depth: 'faible',
      weed: true,
      surface: 'plat',
      foil: 'prudence',
      foilNote: 'Étang peu profond avec des herbiers : mât court et zones profondes uniquement.',
    },
    defaults: {
      sectors: sectors({
        ideal: ['O', 'ONO', 'NO', 'NNO'],
        ok: ['N', 'OSO', 'SE', 'ESE', 'SSE'],
        bad: ['NNE', 'NE', 'ENE', 'E', 'S', 'SSO', 'SO'],
      }),
      speed: { minRideable: 12, idealMin: 16, idealMax: 30, maxRideable: 40 },
      gusts: { maxGust: 48, maxGustFactor: 1.6 },
      notes: 'Réglages initiaux à valider par les admins. Tramontane = vent dominant, souvent forte.',
    },
  },
];

export const SPOT_BY_ID: Record<string, SpotDefinition> = Object.fromEntries(SPOTS.map((s) => [s.id, s]));

export const DEFAULT_SPOT_ID = 'la-mine';
