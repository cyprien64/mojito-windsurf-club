import type { ClubSettings, ScoringWeights } from '../types';
import { SPOTS } from './spots';

/** Pondérations par défaut (modifiables dans la page Admin). Total = 100. */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  orientation: 30,
  speed: 25,
  regularity: 15,
  gusts: 15,
  trend: 10,
  models: 5,
};

export const WEIGHT_LABELS: Record<keyof ScoringWeights, string> = {
  orientation: 'Orientation du vent',
  speed: 'Vitesse du vent',
  regularity: 'Régularité du vent',
  gusts: 'Intensité des rafales',
  trend: 'Évolution des conditions',
  models: 'Accord entre modèles',
};

/** Seuils des niveaux de navigabilité (score /100). */
export const RATING_THRESHOLDS = { excellent: 78, good: 60, average: 40 };

/** Fréquence de rafraîchissement des données (ms). */
export const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
export const FORECAST_TTL_MS = 15 * 60 * 1000;
export const MODELS_TTL_MS = 30 * 60 * 1000;

export function buildDefaultSettings(): ClubSettings {
  return {
    version: 1,
    weights: { ...DEFAULT_WEIGHTS },
    windowThreshold: 60,
    daylightOnly: true,
    spots: Object.fromEntries(SPOTS.map((s) => [s.id, structuredClone(s.defaults)])),
  };
}
