// =====================================================================
//  CONSEIL MATÉRIEL — windsurf & wing foil
// ---------------------------------------------------------------------
//  Estimations basées sur des règles empiriques courantes, à adapter
//  à votre matériel et à votre ressenti :
//   - Voile de windsurf (planing freeride) ≈ 1,34 × poids (kg) / vent (nds)
//   - Aile de wing foil               ≈ 1,0 × poids (kg) / vent (nds)
//   - Aileron freeride (cm)            ≈ 5,5 × surface de voile (m²)
//   - Volume de planche : poids + marge selon le niveau et la force du vent
//  Ce sont des ordres de grandeur, pas des valeurs exactes.
// =====================================================================

import type { RiderLevel, RiderProfile, SpotDefinition, SpotWindConfig } from '../types';

export const DEFAULT_RIDER: RiderProfile = { weightKg: 75, level: 'intermédiaire', sails: [], wings: [], doesWing: true };

const SAIL_SIZES = [3.3, 3.7, 4.0, 4.2, 4.5, 4.7, 5.0, 5.3, 5.6, 5.9, 6.3, 6.6, 7.0, 7.5, 7.8, 8.5, 9.0, 9.5];
const WING_SIZES = [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7];

const SAIL_MAX: Record<RiderLevel, number> = { débutant: 6.0, intermédiaire: 7.8, confirmé: 8.5, expert: 9.5 };
/** Vent minimum pour planer en windsurf (nds), selon le niveau. */
const PLANING_MIN: Record<RiderLevel, number> = { débutant: 99, intermédiaire: 14, confirmé: 12, expert: 11 };
/** Vent minimum pour décoller en wing foil (nds). */
const WING_MIN: Record<RiderLevel, number> = { débutant: 14, intermédiaire: 12, confirmé: 10, expert: 9 };
const WING_MAX: Record<RiderLevel, number> = { débutant: 20, intermédiaire: 27, confirmé: 32, expert: 38 };

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const nearest = (list: number[], v: number) => list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0]);
const round5 = (v: number) => Math.round(v / 5) * 5;

export interface WindInput {
  speed: number; // nds
  gust: number | null;
  source: string; // ex. "maintenant" / "créneau 14 h – 17 h"
}

export interface WindsurfAdvice {
  regime: 'initiation' | 'non planant' | 'planant' | 'trop fort';
  sail: number;
  sailRange: [number, number];
  ownedSail: number | null;
  boardVolume: [number, number];
  boardType: string;
  fin: string;
  finLength: [number, number] | null;
  notes: string[];
}

export interface WingAdvice {
  regime: 'trop léger' | 'pumping / limite' | 'foil confortable' | 'trop fort';
  wing: number;
  wingRange: [number, number];
  ownedWing: number | null;
  boardVolume: [number, number];
  frontWing: [number, number]; // cm²
  mast: string;
  notes: string[];
}

export type Discipline = 'windsurf' | 'wingfoil' | 'les deux' | 'aucun';

export interface GearAdvice {
  wind: WindInput;
  windsurf: WindsurfAdvice;
  wing: WingAdvice;
  scores: { windsurf: number; wingfoil: number };
  choice: Discipline;
  headline: string;
  reasons: string[];
}

function effectiveWind(w: WindInput): number {
  // On dimensionne un peu au-dessus du vent moyen quand c'est rafaleux.
  if (w.gust == null) return w.speed;
  return w.speed + 0.25 * Math.max(0, w.gust - w.speed);
}

function windsurfAdvice(r: RiderProfile, w: WindInput, spot: SpotDefinition, cfg: SpotWindConfig): WindsurfAdvice {
  const kn = Math.max(4, effectiveWind(w));
  const notes: string[] = [];
  const beginner = r.level === 'débutant';

  let raw = (1.34 * r.weightKg) / kn;
  if (beginner) raw *= 0.7;
  const sail = nearest(SAIL_SIZES, clamp(raw, 3.3, SAIL_MAX[r.level]));
  const sailRange: [number, number] = [nearest(SAIL_SIZES, clamp(sail * 0.92, 3.3, 9.5)), nearest(SAIL_SIZES, clamp(sail * 1.08, 3.3, SAIL_MAX[r.level]))];
  const ownedSail = r.sails.length ? nearest(r.sails, sail) : null;

  let regime: WindsurfAdvice['regime'];
  if (beginner) regime = w.speed <= 14 ? 'initiation' : 'trop fort';
  else if (w.speed > cfg.speed.maxRideable) regime = 'trop fort';
  else if (w.speed >= PLANING_MIN[r.level]) regime = 'planant';
  else regime = 'non planant';

  // Volume : poids + marge selon le vent puis le niveau
  let margin = w.speed < 12 ? 70 : w.speed < 16 ? 45 : w.speed < 22 ? 25 : w.speed < 28 ? 10 : 0;
  margin += { débutant: 70, intermédiaire: 20, confirmé: 0, expert: -10 }[r.level];
  if (beginner) margin = Math.max(margin, 90);
  const v = r.weightKg + margin;
  const boardVolume: [number, number] = [round5(v - 10), round5(v + 15)];
  const extra = v - r.weightKg;
  const boardType =
    extra >= 85
      ? 'Planche d’initiation large avec dérive'
      : extra >= 55
        ? 'Freeride gros volume / light wind'
        : extra >= 28
          ? 'Freeride / freemove'
          : extra >= 8
            ? 'Freestyle-wave ou slalom selon votre programme'
            : 'Petite planche wave / vent fort';

  // Aileron
  let finLength: [number, number] | null = [clamp(Math.round(sail * 5.5) - 2, 16, 48), clamp(Math.round(sail * 5.5) + 2, 18, 50)];
  let fin: string;
  if (beginner) {
    fin = 'Aileron d’origine de la planche d’initiation, dérive sortie pour remonter au vent';
    finLength = null;
  } else if (spot.water.surface === 'vagues') {
    fin = 'Ailerons wave (thruster / quad) adaptés aux vagues';
    finLength = [16, 22];
  } else if (spot.water.weed) {
    fin = 'Aileron anti-algues (weed, bord d’attaque incliné), un peu plus long qu’un aileron droit';
    finLength = [finLength[0] + 2, finLength[1] + 4];
  } else {
    fin = 'Aileron freeride droit';
  }
  if (spot.water.depth === 'très faible' || spot.water.depth === 'faible') {
    notes.push('Plan d’eau peu profond : prenez l’aileron le plus court compatible avec votre voile, et attention au fond en sortant de l’eau.');
    if (finLength) finLength = [Math.max(16, finLength[0] - 4), Math.max(18, finLength[1] - 4)];
  }

  if (regime === 'non planant') notes.push(`Vent sous le seuil de planing estimé pour votre niveau (~${PLANING_MIN[r.level]} nds) : navigation en archimède ou grand gréement.`);
  if (regime === 'trop fort') notes.push(beginner ? 'Vent trop fort pour une séance d’initiation.' : 'Vent au-delà du seuil excessif du spot.');
  if (w.gust != null && w.gust > w.speed * 1.4) notes.push('Vent rafaleux : choisissez la petite taille de la fourchette si vous êtes souvent surtoilé.');
  if (ownedSail != null && Math.abs(ownedSail - sail) >= 1) notes.push(`Votre voile la plus proche (${ownedSail} m²) est assez éloignée de la taille idéale.`);

  return { regime, sail, sailRange, ownedSail, boardVolume, boardType, fin, finLength, notes };
}

function wingAdvice(r: RiderProfile, w: WindInput, spot: SpotDefinition): WingAdvice {
  const kn = Math.max(5, w.speed);
  const notes: string[] = [];
  const k = { débutant: 1.1, intermédiaire: 1.0, confirmé: 0.95, expert: 0.9 }[r.level];
  const wing = nearest(WING_SIZES, clamp((k * r.weightKg) / kn, 2.5, 7));
  const wingRange: [number, number] = [nearest(WING_SIZES, clamp(wing - 0.5, 2.5, 7)), nearest(WING_SIZES, clamp(wing + 0.5, 2.5, 7))];
  const ownedWing = r.wings.length ? nearest(r.wings, wing) : null;

  let regime: WingAdvice['regime'];
  if (w.speed < WING_MIN[r.level] - 2) regime = 'trop léger';
  else if (w.speed < WING_MIN[r.level]) regime = 'pumping / limite';
  else if (w.speed <= WING_MAX[r.level]) regime = 'foil confortable';
  else regime = 'trop fort';

  const margin = { débutant: 45, intermédiaire: 20, confirmé: 5, expert: -15 }[r.level] + (w.speed < 13 ? 10 : 0);
  const v = r.weightKg + margin;
  const boardVolume: [number, number] = [round5(v - 10), round5(v + 10)];

  const base = { débutant: 2000, intermédiaire: 1500, confirmé: 1200, expert: 1000 }[r.level];
  const windAdj = w.speed < 13 ? 1.2 : w.speed > 22 ? 0.85 : 1;
  const weightAdj = r.weightKg / 75;
  const fw = Math.round((base * windAdj * weightAdj) / 50) * 50;
  const frontWing: [number, number] = [fw - 150, fw + 150];

  let mast = '75 – 85 cm';
  if (spot.water.foil === 'déconseillé') {
    mast = 'Foil déconseillé sur ce spot';
    notes.push(spot.water.foilNote);
  } else if (spot.water.depth === 'faible' || spot.water.foil === 'prudence') {
    mast = '60 – 70 cm (mât court)';
    notes.push(spot.water.foilNote);
  } else if (spot.water.foilNote) {
    notes.push(spot.water.foilNote);
  }
  if (r.level === 'débutant') notes.push('Débutant en wing : commencez avec un moniteur, un grand volume et une aile « moyenne » (4 à 5 m²).');
  if (!r.doesWing) notes.push('Votre profil indique que vous ne pratiquez pas le wing foil : conseil donné à titre indicatif.');
  if (ownedWing != null && Math.abs(ownedWing - wing) >= 1) notes.push(`Votre aile la plus proche (${ownedWing} m²) est assez éloignée de la taille idéale.`);

  return { regime, wing, wingRange, ownedWing, boardVolume, frontWing, mast, notes };
}

/** Conseil complet + choix windsurf / wing foil. */
export function adviseGear(rider: RiderProfile, wind: WindInput, spot: SpotDefinition, cfg: SpotWindConfig, blocked: boolean): GearAdvice {
  const ws = windsurfAdvice(rider, wind, spot, cfg);
  const wg = wingAdvice(rider, wind, spot);
  const reasons: string[] = [];

  // --- score windsurf ---
  let sWs = { initiation: 0.75, planant: 1, 'non planant': 0.35, 'trop fort': 0.1 }[ws.regime];
  if (rider.level !== 'débutant' && ws.regime === 'planant' && wind.speed > cfg.speed.idealMax) sWs *= 0.85;

  // --- score wing ---
  let sWg = { 'trop léger': 0.05, 'pumping / limite': 0.45, 'foil confortable': 1, 'trop fort': 0.15 }[wg.regime];
  if (spot.water.foil === 'déconseillé') sWg *= 0.15;
  else if (spot.water.foil === 'prudence') sWg *= 0.75;
  if (!rider.doesWing) sWg *= 0.5;

  const gf = wind.gust != null && wind.speed > 3 ? wind.gust / wind.speed : 1;
  if (gf >= 1.45) {
    sWg = Math.min(1, sWg * 1.1);
    sWs *= 0.9;
  }

  // --- explications ---
  if (wind.speed < PLANING_MIN[rider.level] && wind.speed >= WING_MIN[rider.level] && spot.water.foil !== 'déconseillé' && rider.level !== 'débutant')
    reasons.push(`À ${Math.round(wind.speed)} nds, le vent est trop léger pour planer en windsurf à votre niveau mais suffisant pour voler en foil.`);
  if (ws.regime === 'planant' && wind.speed >= 18) reasons.push(`${Math.round(wind.speed)} nds établis : conditions idéales pour planer en windsurf.`);
  if (spot.water.foil === 'déconseillé') reasons.push('Le plan d’eau n’est pas adapté au foil (profondeur, algues ou obstacles).');
  if (gf >= 1.45) reasons.push('Vent rafaleux : le wing foil absorbe mieux les rafales que le windsurf.');
  if (wg.regime === 'trop fort' && ws.regime === 'planant') reasons.push('Vent fort : le windsurf avec une petite voile est plus confortable qu’une aile.');
  if (rider.level === 'débutant' && ws.regime === 'initiation') reasons.push('Vent léger et régulier : idéal pour une séance d’initiation au windsurf.');

  let choice: Discipline;
  if (blocked) {
    choice = 'aucun';
    reasons.unshift('Orientation du vent classée dangereuse sur ce spot : pas de recommandation de navigation.');
  } else if (Math.max(sWs, sWg) < 0.3) {
    choice = 'aucun';
    reasons.push('Ni le windsurf ni le wing foil ne sont vraiment adaptés à ces conditions.');
  } else if (Math.abs(sWs - sWg) < 0.15 && Math.min(sWs, sWg) >= 0.6) {
    choice = 'les deux';
  } else {
    choice = sWs >= sWg ? 'windsurf' : 'wingfoil';
  }

  const headline =
    choice === 'aucun'
      ? 'Pas de session conseillée'
      : choice === 'les deux'
        ? `Windsurf ${ws.sail} m² ou wing ${wg.wing} m² : les deux fonctionnent`
        : choice === 'windsurf'
          ? `Windsurf conseillé · voile ${ws.ownedSail ?? ws.sail} m²`
          : `Wing foil conseillé · aile ${wg.ownedWing ?? wg.wing} m²`;

  return {
    wind,
    windsurf: ws,
    wing: wg,
    scores: { windsurf: Math.round(sWs * 100), wingfoil: Math.round(sWg * 100) },
    choice,
    headline,
    reasons,
  };
}
