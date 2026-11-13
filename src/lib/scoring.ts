// =====================================================================
//  MOTEUR DE NOTATION — « Où naviguer aujourd'hui ? »
// ---------------------------------------------------------------------
//  Note /100 = moyenne pondérée de 6 critères (pondérations dans Admin) :
//  orientation, vitesse, régularité, rafales, évolution, accord modèles.
//  Règles de sécurité appliquées APRÈS le calcul (elles priment) :
//   - orientation « dangereuse » → recommandation bloquée (note ≤ 10),
//     le spot est toujours classé après les spots non bloqués ;
//   - vent > seuil excessif → note plafonnée + avertissement ;
//   - rafales > seuil → note plafonnée + avertissement ;
//   - vent trop faible → note plafonnée.
//  Une note n'est JAMAIS une garantie de sécurité.
// =====================================================================

import type { ClubSettings, ScoringWeights, SectorRating, SpotModels, SpotWeather, SpotWindConfig } from '../types';
import { RATING_THRESHOLDS } from '../config/scoring';
import { MODEL_BY_ID } from '../config/models';
import { angleDiff, cardinalLong, circularMean, circularSpread, sectorIndex, windStrength, type WindStrength } from './wind';

export type Level = 'excellent' | 'good' | 'average' | 'poor' | 'blocked';
export type SpeedClass = 'trop faible' | 'léger' | 'idéal' | 'fort' | 'excessif';
export type Tone = 'good' | 'bad' | 'warn' | 'info';

export const LEVEL_META: Record<Level, { label: string; short: string; color: string; text: string; bg: string }> = {
  excellent: { label: 'Excellentes conditions', short: 'Excellent', color: '#0F7A43', text: 'text-white', bg: 'bg-rate-top' },
  good: { label: 'Bonnes conditions', short: 'Bon', color: '#3DBE6A', text: 'text-white', bg: 'bg-rate-good' },
  average: { label: 'Conditions moyennes', short: 'Moyen', color: '#F2994A', text: 'text-white', bg: 'bg-rate-mid' },
  poor: { label: 'Conditions défavorables', short: 'Défavorable', color: '#E5484D', text: 'text-white', bg: 'bg-rate-bad' },
  blocked: { label: 'Déconseillé — danger (orientation ou orage)', short: 'Bloqué', color: '#9B1C1F', text: 'text-white', bg: 'bg-[#9B1C1F]' },
};

export const SECTOR_RATING_META: Record<SectorRating, { label: string; color: string; score: number }> = {
  ideal: { label: 'Idéale', color: '#0F7A43', score: 1 },
  ok: { label: 'Acceptable', color: '#7BDCAE', score: 0.6 },
  bad: { label: 'Défavorable', color: '#F2994A', score: 0.15 },
  danger: { label: 'Dangereuse', color: '#E5484D', score: 0 },
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function levelFromScore(score: number): Level {
  if (score >= RATING_THRESHOLDS.excellent) return 'excellent';
  if (score >= RATING_THRESHOLDS.good) return 'good';
  if (score >= RATING_THRESHOLDS.average) return 'average';
  return 'poor';
}

export function sectorRatingFor(cfg: SpotWindConfig, dir: number | null): SectorRating | null {
  if (dir == null) return null;
  return cfg.sectors[sectorIndex(dir)] ?? 'ok';
}

export function speedClass(kn: number, cfg: SpotWindConfig): SpeedClass {
  const t = cfg.speed;
  if (kn < t.minRideable) return 'trop faible';
  if (kn < t.idealMin) return 'léger';
  if (kn <= t.idealMax) return 'idéal';
  if (kn <= t.maxRideable) return 'fort';
  return 'excessif';
}

export function speedScore(kn: number, cfg: SpotWindConfig): number {
  const t = cfg.speed;
  if (kn < t.minRideable) return 0.25 * clamp01(kn / Math.max(1, t.minRideable));
  if (kn < t.idealMin) return 0.25 + 0.75 * clamp01((kn - t.minRideable) / Math.max(1, t.idealMin - t.minRideable));
  if (kn <= t.idealMax) return 1;
  if (kn <= t.maxRideable) return 1 - 0.5 * clamp01((kn - t.idealMax) / Math.max(1, t.maxRideable - t.idealMax));
  return 0.1;
}

export function gustScore(kn: number, gust: number | null, cfg: SpotWindConfig): number {
  if (gust == null) return 0.6;
  if (kn < 3) return gust > cfg.gusts.maxGust ? 0.1 : 0.6;
  const factor = gust / kn;
  let s = clamp01(1 - (factor - 1.25) / Math.max(0.15, cfg.gusts.maxGustFactor - 1.25 + 0.3));
  if (gust > cfg.gusts.maxGust) s *= 0.3;
  return s;
}

/** Régularité sur une fenêtre d'heures (vitesse + direction). */
export function regularityScore(speeds: number[], dirs: number[]): number {
  if (speeds.length < 2) return 0.6;
  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  if (mean < 1) return 0.5;
  const sd = Math.sqrt(speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length);
  const cv = sd / mean;
  const dirSpread = circularSpread(dirs);
  return clamp01(1 - cv / 0.35) * 0.6 + clamp01(1 - dirSpread / 45) * 0.4;
}

// ---------------------------------------------------------------------
//  Accord entre modèles
// ---------------------------------------------------------------------

export type AgreementLevel = 'forte' | 'moyenne' | 'divergence';

export interface Agreement {
  level: AgreementLevel;
  score: number;
  modelCount: number;
  speedSpread: number; // nœuds
  dirSpread: number; // degrés
  /** Paire de modèles la plus éloignée sur la vitesse. */
  maxPair: { a: string; b: string; diff: number } | null;
  perModel: { modelId: string; speed: number; gust: number | null; dir: number | null }[];
}

export const AGREEMENT_META: Record<AgreementLevel, { label: string; color: string; desc: string }> = {
  forte: { label: 'Forte convergence', color: '#0F7A43', desc: 'Les modèles annoncent des conditions similaires.' },
  moyenne: { label: 'Convergence moyenne', color: '#F2994A', desc: 'Quelques différences entre modèles.' },
  divergence: { label: 'Forte divergence', color: '#E5484D', desc: 'Prévisions incertaines : les modèles ne s’accordent pas.' },
};

/** Compare les modèles sur une liste d'heures (chaînes ISO locales). */
export function modelAgreement(models: SpotModels | undefined, hours: string[]): Agreement | null {
  if (!models || !hours.length) return null;
  const perModel: Agreement['perModel'] = [];
  for (const m of models.models) {
    const sp: number[] = [];
    const gu: number[] = [];
    const di: number[] = [];
    for (const h of hours) {
      const i = m.time.indexOf(h);
      if (i < 0) continue;
      const s = m.windSpeed[i];
      if (s == null) continue;
      sp.push(s);
      const g = m.windGusts[i];
      if (g != null) gu.push(g);
      const d = m.windDirection[i];
      if (d != null) di.push(d);
    }
    // Le modèle doit couvrir au moins la moitié des heures demandées.
    if (sp.length < Math.max(1, hours.length / 2)) continue;
    perModel.push({
      modelId: m.modelId,
      speed: sp.reduce((a, b) => a + b, 0) / sp.length,
      gust: gu.length ? gu.reduce((a, b) => a + b, 0) / gu.length : null,
      dir: circularMean(di),
    });
  }
  if (perModel.length < 2) return null;
  const speeds = perModel.map((p) => p.speed);
  const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const speedSpread = Math.max(...speeds) - Math.min(...speeds);
  const dirs = perModel.map((p) => p.dir).filter((d): d is number => d != null);
  const meanDir = circularMean(dirs);
  // Sous 5 nœuds la direction n'a pas de sens : on l'ignore.
  const dirSpread = meanDir != null && meanSpeed >= 5 ? Math.max(0, ...dirs.map((d) => angleDiff(d, meanDir))) : 0;
  const rel = speedSpread / Math.max(meanSpeed, 6);

  let level: AgreementLevel = 'divergence';
  if (rel <= 0.3 && dirSpread <= 30) level = 'forte';
  else if (rel <= 0.55 && dirSpread <= 60) level = 'moyenne';

  let maxPair: Agreement['maxPair'] = null;
  for (let i = 0; i < perModel.length; i++)
    for (let j = i + 1; j < perModel.length; j++) {
      const diff = Math.abs(perModel[i].speed - perModel[j].speed);
      if (!maxPair || diff > maxPair.diff) maxPair = { a: perModel[i].modelId, b: perModel[j].modelId, diff };
    }

  return {
    level,
    score: level === 'forte' ? 1 : level === 'moyenne' ? 0.6 : 0.2,
    modelCount: perModel.length,
    speedSpread,
    dirSpread,
    maxPair,
    perModel,
  };
}

// ---------------------------------------------------------------------
//  Notation horaire (pour les créneaux)
// ---------------------------------------------------------------------

export interface HourEval {
  time: string;
  index: number;
  speed: number | null;
  gust: number | null;
  dir: number | null;
  rating: SectorRating | null;
  score: number; // 0-100
  daylight: boolean;
  blocked: boolean;
  /** Orage prévu à cette heure (codes météo 95, 96, 99). */
  storm?: boolean;
}

/** Codes WMO d'orage (avec ou sans grêle). */
export const isStormCode = (c: number | null | undefined) => c != null && c >= 95;

function isDaylight(time: string, w: SpotWeather): boolean {
  const day = time.slice(0, 10);
  const i = w.daily.time.indexOf(day);
  if (i < 0) return true;
  const rise = w.daily.sunrise[i];
  const set = w.daily.sunset[i];
  if (!rise || !set) return true;
  // Une heure est « de jour » si sa demi-heure est entre le lever et le coucher.
  const mid = `${time.slice(0, 14)}30`;
  return mid >= rise && mid <= set;
}

export function evaluateHours(w: SpotWeather, cfg: SpotWindConfig, weights: ScoringWeights): HourEval[] {
  const { time, windSpeed, windGusts, windDirection } = w.hourly;
  const wO = weights.orientation;
  const wS = weights.speed;
  const wR = weights.regularity;
  const wG = weights.gusts;
  const total = wO + wS + wR + wG || 1;
  return time.map((t, i) => {
    const sp = windSpeed[i];
    const gu = windGusts[i];
    const di = windDirection[i];
    const daylight = isDaylight(t, w);
    if (sp == null) return { time: t, index: i, speed: null, gust: gu, dir: di, rating: null, score: 0, daylight, blocked: false };
    const rating = sectorRatingFor(cfg, di);
    const o = rating ? SECTOR_RATING_META[rating].score : 0.5;
    const s = speedScore(sp, cfg);
    const g = gustScore(sp, gu, cfg);
    const sp3: number[] = [];
    const di3: number[] = [];
    for (let k = i - 1; k <= i + 1; k++) {
      const v = windSpeed[k];
      const d = windDirection[k];
      if (v != null) sp3.push(v);
      if (d != null) di3.push(d);
    }
    const r = regularityScore(sp3, di3);
    let score = ((o * wO + s * wS + r * wR + g * wG) / total) * 100;
    if (sp < cfg.speed.minRideable) score = Math.min(score, 30);
    if (sp > cfg.speed.maxRideable) score = Math.min(score, 25);
    if (gu != null && gu > cfg.gusts.maxGust) score = Math.min(score, 40);
    const storm = isStormCode(w.hourly.weatherCode[i]);
    const blocked = rating === 'danger' || storm;
    if (blocked) score = 0;
    return { time: t, index: i, speed: sp, gust: gu, dir: di, rating, score, daylight, blocked, storm };
  });
}

// ---------------------------------------------------------------------
//  Créneaux de navigation
// ---------------------------------------------------------------------

export interface SailWindow {
  start: string; // heure ISO de début
  end: string; // heure ISO de fin (exclue) = heure de dégradation
  hours: number;
  avgScore: number;
  peakScore: number;
  avgSpeed: number;
  maxGust: number | null;
  mainDir: number | null;
}

function addHour(iso: string): string {
  const [d, t] = iso.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const h = Number(t.slice(0, 2)) + 1;
  const date = new Date(Date.UTC(y, m - 1, day, h));
  return `${date.toISOString().slice(0, 10)}T${String(date.getUTCHours()).padStart(2, '0')}:00`;
}

/** Tous les créneaux ≥ seuil dans [from, to). */
export function findWindows(hours: HourEval[], from: number, to: number, threshold: number, daylightOnly: boolean): SailWindow[] {
  const out: SailWindow[] = [];
  let run: HourEval[] = [];
  const flush = () => {
    if (run.length) {
      const speeds = run.map((h) => h.speed ?? 0);
      const gusts = run.map((h) => h.gust).filter((g): g is number => g != null);
      out.push({
        start: run[0].time,
        end: addHour(run[run.length - 1].time),
        hours: run.length,
        avgScore: run.reduce((a, h) => a + h.score, 0) / run.length,
        peakScore: Math.max(...run.map((h) => h.score)),
        avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
        maxGust: gusts.length ? Math.max(...gusts) : null,
        mainDir: circularMean(run.map((h) => h.dir).filter((d): d is number => d != null)),
      });
    }
    run = [];
  };
  for (let i = Math.max(0, from); i < Math.min(hours.length, to); i++) {
    const h = hours[i];
    const ok = h.score >= threshold && !h.blocked && (!daylightOnly || h.daylight);
    // une coupure jour/nuit ou de date termine aussi le créneau
    if (ok && run.length && run[run.length - 1].time.slice(0, 10) !== h.time.slice(0, 10)) flush();
    if (ok) run.push(h);
    else flush();
  }
  flush();
  return out;
}

/** Meilleur créneau : favorise qualité ET durée. */
export function bestWindow(windows: SailWindow[]): SailWindow | null {
  let best: SailWindow | null = null;
  let bestVal = -1;
  for (const w of windows) {
    const val = w.avgScore * Math.min(w.hours, 5);
    if (val > bestVal) {
      best = w;
      bestVal = val;
    }
  }
  return best;
}

// ---------------------------------------------------------------------
//  Évaluation complète d'un spot
// ---------------------------------------------------------------------

export interface Reason {
  text: string;
  tone: Tone;
}

export interface SpotEvaluation {
  spotId: string;
  score: number;
  rawScore: number;
  level: Level;
  blocked: boolean;
  components: Record<keyof ScoringWeights, number | null>;
  speed: number | null;
  gust: number | null;
  dir: number | null;
  temperature: number | null;
  sectorRating: SectorRating | null;
  speedClass: SpeedClass | null;
  strength: WindStrength | null;
  gustFactor: number | null;
  trend: 'hausse' | 'stable' | 'baisse' | null;
  agreement: Agreement | null;
  warnings: string[];
  reasons: Reason[];
  summary: string;
  hours: HourEval[];
  windows: SailWindow[];
  bestWindow: SailWindow | null;
  /** Meilleure heure si aucun créneau n'atteint le seuil. */
  bestHour: HourEval | null;
  /** Origine du vent actuel utilisé pour la note. */
  windSource?: 'modèle' | 'balise';
}

const ORIENTATION_TEXT: Record<SectorRating, string> = {
  ideal: 'orientation idéale pour ce spot',
  ok: 'orientation acceptable',
  bad: 'orientation défavorable pour ce spot',
  danger: 'orientation classée DANGEREUSE pour ce spot',
};

export function evaluateSpot(
  spotId: string,
  w: SpotWeather,
  cfg: SpotWindConfig,
  settings: ClubSettings,
  models?: SpotModels,
): SpotEvaluation {
  const weights = settings.weights;
  const hours = evaluateHours(w, cfg, weights);
  const now = w.nowIndex;
  const speed = w.current.windSpeed ?? w.hourly.windSpeed[now] ?? null;
  const gust = w.current.windGusts ?? w.hourly.windGusts[now] ?? null;
  const dir = w.current.windDirection ?? w.hourly.windDirection[now] ?? null;

  // Créneaux sur les 48 prochaines heures
  const windows = findWindows(hours, now, now + 48, settings.windowThreshold, settings.daylightOnly);
  const best = bestWindow(windows);
  let bestHour: HourEval | null = null;
  for (let i = now; i < Math.min(hours.length, now + 48); i++) {
    const h = hours[i];
    if (settings.daylightOnly && !h.daylight) continue;
    if (!bestHour || h.score > bestHour.score) bestHour = h;
  }

  // Accord entre modèles : sur le meilleur créneau, sinon les 6 prochaines heures
  const agreementHours = best
    ? hours.filter((h) => h.time >= best.start && h.time < best.end).map((h) => h.time)
    : w.hourly.time.slice(now, now + 6);
  const agreement = modelAgreement(models, agreementHours);

  const components: SpotEvaluation['components'] = {
    orientation: null,
    speed: null,
    regularity: null,
    gusts: null,
    trend: null,
    models: agreement ? agreement.score : null,
  };
  const reasons: Reason[] = [];
  const warnings: string[] = [];

  if (speed == null) {
    return {
      spotId, score: 0, rawScore: 0, level: 'poor', blocked: false, components, speed, gust, dir,
      temperature: w.current.temperature, sectorRating: null, speedClass: null, strength: null, gustFactor: null,
      trend: null, agreement, warnings: ['Données de vent indisponibles.'],
      reasons: [{ text: 'Données de vent indisponibles pour ce spot.', tone: 'warn' }],
      summary: 'Données indisponibles : impossible d’évaluer ce spot.', hours, windows, bestWindow: best, bestHour,
    };
  }

  const rating = sectorRatingFor(cfg, dir);
  const sClass = speedClass(speed, cfg);
  components.orientation = rating ? SECTOR_RATING_META[rating].score : 0.5;
  components.speed = speedScore(speed, cfg);
  components.gusts = gustScore(speed, gust, cfg);
  const sp: number[] = [];
  const di: number[] = [];
  for (let i = now; i < Math.min(hours.length, now + 4); i++) {
    const v = w.hourly.windSpeed[i];
    const d = w.hourly.windDirection[i];
    if (v != null) sp.push(v);
    if (d != null) di.push(d);
  }
  components.regularity = regularityScore(sp, di);

  // Évolution : qualité moyenne des 3 prochaines heures (vitesse + orientation)
  const next = hours.slice(now + 1, now + 4).filter((h) => h.speed != null);
  if (next.length) {
    components.trend = next.reduce((a, h) => a + h.score, 0) / next.length / 100;
  }
  const futureSpeed = next.length ? next.reduce((a, h) => a + (h.speed ?? 0), 0) / next.length : speed;
  const trend: SpotEvaluation['trend'] = futureSpeed > speed + 2 ? 'hausse' : futureSpeed < speed - 2 ? 'baisse' : 'stable';

  // Moyenne pondérée (critères indisponibles = neutres à 0,5)
  let sum = 0;
  let total = 0;
  (Object.keys(weights) as (keyof ScoringWeights)[]).forEach((k) => {
    const v = components[k] ?? 0.5;
    sum += v * weights[k];
    total += weights[k];
  });
  const rawScore = total ? (sum / total) * 100 : 0;
  let score = rawScore;

  // ---- Règles de sécurité (priment sur la note) ----
  // Orage : maintenant ou dans les 2 prochaines heures → navigation bloquée.
  const stormNow = [now, now + 1, now + 2].some((i) => isStormCode(i === now ? (w.current.weatherCode ?? w.hourly.weatherCode[i]) : w.hourly.weatherCode[i]));
  let stormAt: string | null = null;
  for (let i = now; i < Math.min(hours.length, now + 24); i++) {
    if (hours[i].storm) {
      stormAt = hours[i].time;
      break;
    }
  }
  const blocked = rating === 'danger' || stormNow;
  if (rating === 'danger') {
    score = Math.min(score, 10);
    warnings.push(`Orientation ${cardinalLong(dir)} classée dangereuse par les admins : recommandation bloquée.`);
  }
  if (stormNow) {
    score = Math.min(score, 10);
    warnings.push('⚡ Orage prévu maintenant ou dans les 2 heures : ne naviguez pas, la foudre frappe en priorité ce qui dépasse sur l’eau.');
  } else if (stormAt) {
    warnings.push(`⚡ Orage prévu vers ${stormAt.slice(11, 13)} h : les heures orageuses sont exclues des créneaux. Surveillez le ciel et rentrez au premier coup de tonnerre.`);
  }
  if (speed > cfg.speed.maxRideable) {
    score = Math.min(score, 35);
    warnings.push(`Vent moyen (${Math.round(speed)} nds) au-dessus du seuil excessif du spot (${cfg.speed.maxRideable} nds).`);
  }
  if (gust != null && gust > cfg.gusts.maxGust) {
    score = Math.min(score, 45);
    warnings.push(`Rafales (${Math.round(gust)} nds) au-dessus du seuil configuré (${cfg.gusts.maxGust} nds).`);
  }
  if (speed < cfg.speed.minRideable) score = Math.min(score, 30);

  const level: Level = blocked ? 'blocked' : levelFromScore(score);
  const gustFactor = gust != null && speed >= 3 ? gust / speed : null;

  // ---- Explications ----
  if (rating) {
    reasons.push({
      text: `Vent de secteur ${cardinalLong(dir)} (${Math.round(dir ?? 0)}°) : ${ORIENTATION_TEXT[rating]}.`,
      tone: rating === 'ideal' ? 'good' : rating === 'ok' ? 'info' : 'bad',
    });
  }
  const speedText: Record<SpeedClass, string> = {
    'trop faible': `vent trop faible (seuil du spot : ${cfg.speed.minRideable} nds)`,
    léger: `vent léger, en dessous de la plage idéale (${cfg.speed.idealMin}–${cfg.speed.idealMax} nds)`,
    idéal: `dans la plage idéale du spot (${cfg.speed.idealMin}–${cfg.speed.idealMax} nds)`,
    fort: `vent fort pour ce spot (plage idéale jusqu’à ${cfg.speed.idealMax} nds)`,
    excessif: `vent excessif (au-delà de ${cfg.speed.maxRideable} nds)`,
  };
  reasons.push({
    text: `${Math.round(speed)} nœuds de vent moyen : ${speedText[sClass]}.`,
    tone: sClass === 'idéal' ? 'good' : sClass === 'excessif' ? 'warn' : sClass === 'trop faible' ? 'bad' : 'info',
  });
  if (gust != null && gustFactor != null) {
    const gTone: Tone = gustFactor <= 1.3 ? 'good' : gustFactor >= cfg.gusts.maxGustFactor ? 'bad' : 'info';
    reasons.push({
      text: `Rafales à ${Math.round(gust)} nds (×${gustFactor.toFixed(1)}) : ${gustFactor <= 1.3 ? 'vent régulier, faibles rafales' : gustFactor >= cfg.gusts.maxGustFactor ? 'vent très irrégulier' : 'rafales marquées'}.`,
      tone: gTone,
    });
  }
  if (components.regularity != null) {
    const r = components.regularity;
    reasons.push({
      text: r >= 0.7 ? 'Vent stable sur les prochaines heures.' : r >= 0.4 ? 'Vent moyennement stable sur les prochaines heures.' : 'Vent instable (vitesse ou direction changeantes).',
      tone: r >= 0.7 ? 'good' : r >= 0.4 ? 'info' : 'bad',
    });
  }
  if (trend) {
    reasons.push({
      text: trend === 'hausse' ? 'Vent en renforcement dans les 3 prochaines heures.' : trend === 'baisse' ? 'Vent en baisse dans les 3 prochaines heures.' : 'Vent globalement stable dans les 3 prochaines heures.',
      tone: 'info',
    });
  }
  if (agreement) {
    const pair = agreement.maxPair;
    const names = pair ? `${MODEL_BY_ID[pair.a]?.label ?? pair.a} et ${MODEL_BY_ID[pair.b]?.label ?? pair.b}` : '';
    reasons.push({
      text:
        agreement.level === 'divergence'
          ? `Conditions incertaines : les modèles ${names} présentent un écart de ${Math.round(pair?.diff ?? 0)} nds.`
          : agreement.level === 'moyenne'
            ? `Convergence moyenne des ${agreement.modelCount} modèles (écart max. ${Math.round(agreement.speedSpread)} nds).`
            : `Forte convergence des ${agreement.modelCount} modèles météo.`,
      tone: agreement.level === 'forte' ? 'good' : agreement.level === 'moyenne' ? 'info' : 'warn',
    });
  } else {
    reasons.push({ text: 'Comparaison des modèles indisponible pour le moment.', tone: 'info' });
  }

  // ---- Phrase de synthèse ----
  let summary: string;
  const dirTxt = `vent de secteur ${cardinalLong(dir)}`;
  if (stormNow) {
    summary = `Navigation déconseillée : orage prévu sur le spot (${Math.round(speed)} nœuds, ${dirTxt}).`;
  } else if (blocked) {
    summary = `Navigation déconseillée : ${dirTxt}, orientation classée dangereuse pour ce spot, malgré ${Math.round(speed)} nœuds.`;
  } else if (level === 'excellent' || level === 'good') {
    summary = `Spot recommandé : ${dirTxt}, ${rating ? ORIENTATION_TEXT[rating].replace(' pour ce spot', '') : 'orientation inconnue'}, ${Math.round(speed)} nœuds ${
      (components.regularity ?? 0) >= 0.7 ? 'réguliers' : ''
    }${gustFactor != null && gustFactor <= 1.3 ? ' et faibles rafales' : gust != null ? `, rafales à ${Math.round(gust)} nœuds` : ''}.`;
  } else if (sClass === 'trop faible') {
    summary = `Spot déconseillé : vent trop faible (${Math.round(speed)} nœuds).`;
  } else if (rating === 'bad') {
    summary = `Spot déconseillé : ${dirTxt}, orientation défavorable pour ce spot malgré une vitesse de ${Math.round(speed)} nœuds.`;
  } else if (sClass === 'excessif' || (gust != null && gust > cfg.gusts.maxGust)) {
    summary = `Prudence : vent ou rafales au-delà des seuils du spot (${Math.round(speed)} nds, rafales ${gust != null ? Math.round(gust) : '—'} nds).`;
  } else {
    summary = `Conditions moyennes : ${Math.round(speed)} nœuds, ${dirTxt}${(components.regularity ?? 1) < 0.4 ? ', vent irrégulier' : ''}.`;
  }
  if (agreement?.level === 'divergence' && !blocked) summary += ' Prévisions incertaines (modèles divergents).';
  summary = summary.replace(/\s+/g, ' ').replace(' ,', ',').replace(' .', '.');

  return {
    spotId,
    score: Math.round(score),
    rawScore: Math.round(rawScore),
    level,
    blocked,
    components,
    speed,
    gust,
    dir,
    temperature: w.current.temperature,
    sectorRating: rating,
    speedClass: sClass,
    strength: windStrength(speed),
    gustFactor,
    trend,
    agreement,
    warnings,
    reasons,
    summary,
    hours,
    windows,
    bestWindow: best,
    bestHour,
  };
}

/** Classement : la sécurité prime — un spot bloqué n'est jamais devant un spot non bloqué. */
export function rankEvaluations(list: SpotEvaluation[]): SpotEvaluation[] {
  return [...list].sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
    if (b.score !== a.score) return b.score - a.score;
    return (b.bestWindow?.avgScore ?? 0) - (a.bestWindow?.avgScore ?? 0);
  });
}
