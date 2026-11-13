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

import type { FoilType, RiderLevel, RiderProfile, SpotDefinition, SpotWindConfig } from '../types';

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
  frontWing: [number, number]; // cm², pour le type de foil du rider (ou polyvalent)
  mast: string;
  foil: FoilAdvice;
  notes: string[];
}

// ---------------- Foil ----------------

export const FOIL_TYPE_META: Record<FoilType, { label: string; short: string; aspect: string; areaFactor: number }> = {
  polyvalent: { label: 'Freeride / polyvalent', short: 'polyvalent', aspect: 'allongement moyen (≈ 6 – 8)', areaFactor: 1 },
  'high-aspect': { label: 'Haut allongement (glisse, pumping)', short: 'haut allongement', aspect: 'allongement élevé (≈ 8 – 11)', areaFactor: 0.85 },
  surf: { label: 'Surf / faible allongement (maniable)', short: 'surf', aspect: 'faible allongement (≈ 4,5 – 6,5)', areaFactor: 1.1 },
  downwind: { label: 'Downwind / race (très haut allongement)', short: 'downwind', aspect: 'très haut allongement (≈ 11 et plus)', areaFactor: 0.75 },
};

export interface FoilAdvice {
  /** Type d'aile avant le plus adapté aux conditions. */
  bestType: FoilType;
  bestTypeWhy: string;
  /** Surface conseillée pour le type idéal. */
  bestFrontWing: [number, number];
  mastRange: [number, number] | null;
  fuselage: string;
  stab: string;
  /** Verdict sur le foil déclaré par le rider. */
  owned: { label: string; verdict: 'adapté' | 'un peu petit' | 'trop petit' | 'un peu grand' | 'trop grand'; text: string } | null;
  setup: string[];
}

const round50 = (v: number) => Math.round(v / 50) * 50;

/** Surface d'aile avant « polyvalente » de référence (cm²) pour ce rider et ce vent. */
function baseFrontWing(r: RiderProfile, speed: number): number {
  const base = { débutant: 2000, intermédiaire: 1500, confirmé: 1250, expert: 1050 }[r.level];
  const windAdj = speed < 11 ? 1.3 : speed < 14 ? 1.15 : speed < 18 ? 1 : speed < 23 ? 0.88 : 0.78;
  return base * windAdj * (r.weightKg / 75);
}

function foilAdvice(r: RiderProfile, w: WindInput, spot: SpotDefinition): FoilAdvice {
  const waves = spot.water.surface === 'vagues';
  const shallow = spot.water.depth === 'faible' || spot.water.depth === 'très faible';
  const ref = baseFrontWing(r, w.speed);

  // Type idéal selon les conditions
  let bestType: FoilType;
  let bestTypeWhy: string;
  if (r.level === 'débutant') {
    bestType = 'surf';
    bestTypeWhy = 'Pour apprendre : grande aile avant à faible allongement, qui décolle tôt, à basse vitesse, et pardonne les erreurs.';
  } else if (waves) {
    bestType = 'surf';
    bestTypeWhy = 'Spot de vagues : une aile surf ou à allongement moyen tourne court et reste contrôlable sur la houle.';
  } else if (w.speed < 14) {
    bestType = 'high-aspect';
    bestTypeWhy = 'Vent léger : un haut allongement glisse mieux, se pompe facilement et tient le vol dans les trous de vent.';
  } else if (w.speed > 22) {
    bestType = r.level === 'expert' ? 'high-aspect' : 'polyvalent';
    bestTypeWhy = 'Vent fort : petite aile avant, fine et rapide, pour garder le contrôle à haute vitesse.';
  } else {
    bestType = 'polyvalent';
    bestTypeWhy = 'Vent moyen sur plan d’eau plat : une aile polyvalente offre le meilleur compromis décollage / vitesse / virages.';
  }
  const fwBest = round50(ref * FOIL_TYPE_META[bestType].areaFactor);
  const bestFrontWing: [number, number] = [fwBest - 150, fwBest + 150];

  // Mât
  let mastRange: [number, number] | null;
  if (spot.water.foil === 'déconseillé') mastRange = null;
  else if (spot.water.depth === 'très faible') mastRange = [45, 60];
  else if (shallow || spot.water.foil === 'prudence') mastRange = [60, 70];
  else if (r.level === 'débutant') mastRange = [60, 75];
  else if (waves || w.speed > 22) mastRange = [80, 90];
  else mastRange = [75, 85];

  const fuselage =
    r.level === 'débutant'
      ? 'Long : plus de stabilité en tangage, idéal pour apprendre.'
      : waves
        ? 'Court à moyen : virages plus serrés sur la vague.'
        : w.speed < 14
          ? 'Moyen à long : stable et efficace pour pomper.'
          : 'Moyen (standard de la marque) : bon compromis stabilité / maniabilité.';
  const stab =
    r.level === 'débutant'
      ? 'Grand stab : vol plus stable et plus lent.'
      : w.speed > 22
        ? 'Stab plus petit : moins de traînée et plus de vitesse ; gardez le grand si le vol devient instable.'
        : 'Stab de série, assorti à l’aile avant.';

  // Foil du rider
  let owned: FoilAdvice['owned'] = null;
  const type = r.foilType ?? 'polyvalent';
  if (r.foilFrontWing && r.foilFrontWing > 300) {
    const ideal = ref * FOIL_TYPE_META[type].areaFactor;
    const ratio = r.foilFrontWing / ideal;
    const label = `${r.foilFrontWing} cm² · ${FOIL_TYPE_META[type].short}`;
    if (ratio < 0.72)
      owned = { label, verdict: 'trop petit', text: `Pour ce vent, il faudrait environ ${round50(ideal)} cm² : décollage tardif, pumping très physique. Préférez une plus grande aile avant ou attendez plus de vent.` };
    else if (ratio < 0.88)
      owned = { label, verdict: 'un peu petit', text: 'Ça vole, mais il faudra une aile de wing un peu plus grande ou un bon pumping pour décoller.' };
    else if (ratio <= 1.15) owned = { label, verdict: 'adapté', text: 'Bonne taille d’aile avant pour ces conditions.' };
    else if (ratio <= 1.35)
      owned = { label, verdict: 'un peu grand', text: 'Décollage très facile mais la portance va vite devenir forte : reculez le mât et prenez une aile de wing un peu plus petite.' };
    else
      owned = { label, verdict: 'trop grand', text: `Pour ce vent, environ ${round50(ideal)} cm² suffiraient : le foil risque de « sortir de l’eau » en survitesse (ventilation, chute). Prenez une aile avant plus petite.` };
  }

  // Conseils de réglage
  const setup: string[] = [];
  if (w.speed < 14) setup.push('Mât avancé sur le rail (vers le nez) : décollage plus précoce, mais plus d’appui sur le pied avant.');
  else if (w.speed > 22) setup.push('Mât reculé sur le rail (vers l’arrière) : plus de contrôle à haute vitesse.');
  else setup.push('Mât au milieu du rail pour commencer, puis ajustez au ressenti.');
  setup.push('Le nez monte tout seul ? Reculez le mât. Il faut appuyer sur le pied arrière pour voler ? Avancez-le.');
  if (w.speed > 22) setup.push('Pour limiter la portance en vitesse, réglez l’incidence du stab (cale / shim) selon la notice de la marque.');
  if (mastRange && r.foilMast && r.foilMast > mastRange[1] + 2)
    setup.push(`Votre mât de ${r.foilMast} cm est long pour ce plan d’eau : un mât de ${mastRange[0]} – ${mastRange[1]} cm est plus sûr.`);
  if (r.level !== 'débutant' && r.foilMast && mastRange && r.foilMast < mastRange[0] - 5 && !shallow)
    setup.push(`Avec un mât de ${r.foilMast} cm, vous toucherez plus vite la surface dans le clapot : volez bas et ralentissez dans les rafales.`);
  if (spot.water.weed) setup.push('Algues : vérifiez régulièrement le bord d’attaque du foil, la moindre algue fait chuter la portance.');
  if (type === 'downwind' && !waves && w.speed < 18) setup.push('Une aile downwind demande de la vitesse pour décoller : prévoyez une aile de wing plus grande au départ.');

  return { bestType, bestTypeWhy, bestFrontWing, mastRange, fuselage, stab, owned, setup };
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
      ? beginner
        ? 'Planche d’initiation large avec dérive'
        : 'Planche light wind / longboard avec dérive'
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

  const foil = foilAdvice(r, w, spot);
  const fw = round50(baseFrontWing(r, w.speed) * FOIL_TYPE_META[r.foilType ?? foil.bestType].areaFactor);
  const frontWing: [number, number] = [fw - 150, fw + 150];

  const mast = foil.mastRange ? `${foil.mastRange[0]} – ${foil.mastRange[1]} cm${foil.mastRange[1] <= 70 ? ' (mât court)' : ''}` : 'Foil déconseillé sur ce spot';
  if (spot.water.foilNote) notes.push(spot.water.foilNote);
  if (r.level === 'débutant') notes.push('Débutant en wing : commencez avec un moniteur, un grand volume et une aile « moyenne » (4 à 5 m²).');
  if (!r.doesWing) notes.push('Votre profil indique que vous ne pratiquez pas le wing foil : conseil donné à titre indicatif.');
  if (ownedWing != null && Math.abs(ownedWing - wing) >= 1) notes.push(`Votre aile la plus proche (${ownedWing} m²) est assez éloignée de la taille idéale.`);

  return { regime, wing, wingRange, ownedWing, boardVolume, frontWing, mast, foil, notes };
}

/** Conseil complet + choix windsurf / wing foil. */
export function adviseGear(rider: RiderProfile, wind: WindInput, spot: SpotDefinition, cfg: SpotWindConfig, blocked: boolean): GearAdvice {
  const ws = windsurfAdvice(rider, wind, spot, cfg);
  const wg = wingAdvice(rider, wind, spot);
  const reasons: string[] = [];

  // --- score windsurf ---
  let sWs = { initiation: 0.75, planant: 1, 'non planant': 0.25, 'trop fort': 0.1 }[ws.regime];
  if (rider.level !== 'débutant' && ws.regime === 'planant' && wind.speed > cfg.speed.idealMax) sWs *= 0.85;

  // --- score wing ---
  let sWg = { 'trop léger': 0.05, 'pumping / limite': 0.45, 'foil confortable': 1, 'trop fort': 0.15 }[wg.regime];
  if (spot.water.foil === 'déconseillé') sWg *= 0.15;
  else if (spot.water.foil === 'prudence') sWg *= 0.75;
  if (!rider.doesWing) sWg *= 0.5;
  const ownedFoil = wg.foil.owned?.verdict;
  if (ownedFoil === 'trop petit' || ownedFoil === 'trop grand') sWg *= 0.8;

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
  if (ownedFoil === 'trop petit') reasons.push('Votre aile avant de foil est petite pour ce vent : le décollage sera difficile.');
  if (ownedFoil === 'trop grand') reasons.push('Votre aile avant de foil est grande pour ce vent : risque de survitesse et de perte de contrôle.');
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
