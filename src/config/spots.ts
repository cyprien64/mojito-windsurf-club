// =====================================================================
//  FICHIER CENTRAL DES SPOTS — Mojito Windsurf Club
// ---------------------------------------------------------------------
//  - Coordonnées GPS : chaque spot indique sa source et la date de
//    vérification. Modifiez-les ici si le point de mise à l'eau diffère.
//  - Paramètres nautiques (`defaults`) : valeurs INITIALES proposées pour
//    démarrer. Elles doivent être validées par les admins du club, puis
//    ajustées depuis la page « Admin » du site (sans toucher au code).
//  - Aucune orientation « dangereuse » n'est pré-remplie : c'est une
//    décision de sécurité qui revient aux admins qui connaissent le spot.
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
    accent: '#4CC98F',
    photo: {
      src: 'spots/leon.jpg',
      author: 'VIGNA christian',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lac_de_L%C3%A9on_Landes_France.jpg',
      caption: 'Lac de Léon',
    },
    info: 'Lac côtier landais, régime de vents d’ouest et brises thermiques en été.',
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
];

export const SPOT_BY_ID: Record<string, SpotDefinition> = Object.fromEntries(SPOTS.map((s) => [s.id, s]));

export const DEFAULT_SPOT_ID = 'la-mine';
