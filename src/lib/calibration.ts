// =====================================================================
//  RÉGLAGE DES SPOTS PAR LES RETOURS DU CLUB
//  Compare le vent prévu au moment de chaque retour (wind_kn, modèle) au
//  ressenti déclaré (« trop faible », « bon », « fort », « trop fort »)
//  pour proposer aux admins d'ajuster les seuils de vitesse d'un spot.
//  Rien n'est appliqué automatiquement.
// =====================================================================
import type { SpotWindConfig } from '../types';
import type { SessionReport } from '../services/backend';

export interface CalibrationSuggestion {
  field: keyof SpotWindConfig['speed'];
  label: string;
  current: number;
  suggested: number;
  why: string;
}

export interface Calibration {
  count: number;
  byFeel: Record<SessionReport['feel'], number[]>;
  suggestions: CalibrationSuggestion[];
}

export const MIN_REPORTS = 6;

const q = (arr: number[], p: number) => {
  const s = [...arr].sort((a, b) => a - b);
  if (!s.length) return 0;
  const i = (s.length - 1) * p;
  return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i - Math.floor(i));
};

export function calibrate(reports: SessionReport[], spotId: string, cfg: SpotWindConfig): Calibration {
  const since = Date.now() - 365 * 86400000;
  const rs = reports.filter((r) => r.spot_id === spotId && r.wind_kn != null && (!r.created_at || new Date(r.created_at).getTime() > since));
  const byFeel: Calibration['byFeel'] = { 'trop faible': [], bon: [], fort: [], 'trop fort': [] };
  for (const r of rs) byFeel[r.feel].push(r.wind_kn as number);
  const out: CalibrationSuggestion[] = [];
  const sp = cfg.speed;
  if (rs.length < MIN_REPORTS) return { count: rs.length, byFeel, suggestions: out };

  const ridden = [...byFeel.bon, ...byFeel.fort];
  // Seuil « trop faible »
  const ridBelow = ridden.filter((v) => v < sp.minRideable);
  const lightAbove = byFeel['trop faible'].filter((v) => v >= sp.minRideable);
  if (ridBelow.length >= 3) {
    const s = Math.max(4, Math.round(q(ridBelow, 0.25)));
    if (s < sp.minRideable) out.push({ field: 'minRideable', label: 'Trop faible sous', current: sp.minRideable, suggested: s, why: `${ridBelow.length} sessions jugées bonnes ou fortes avec moins de ${sp.minRideable} nds prévus.` });
  } else if (lightAbove.length >= 3) {
    const s = Math.round(q(lightAbove, 0.75)) + 1;
    if (s > sp.minRideable) out.push({ field: 'minRideable', label: 'Trop faible sous', current: sp.minRideable, suggested: s, why: `${lightAbove.length} sessions jugées « trop faible » avec ${sp.minRideable} nds ou plus prévus.` });
  }
  // Plage idéale = cœur des sessions « bon »
  if (byFeel.bon.length >= 4) {
    const lo = Math.round(q(byFeel.bon, 0.25));
    const hi = Math.round(q(byFeel.bon, 0.8));
    if (Math.abs(lo - sp.idealMin) >= 2)
      out.push({ field: 'idealMin', label: 'Idéal à partir de', current: sp.idealMin, suggested: lo, why: `La moitié des sessions « bon » ont eu lieu entre ${lo} et ${hi} nds prévus.` });
    if (Math.abs(hi - sp.idealMax) >= 3 && hi > lo)
      out.push({ field: 'idealMax', label: 'Idéal jusqu’à', current: sp.idealMax, suggested: hi, why: `80 % des sessions « bon » ont eu moins de ${hi} nds prévus.` });
  }
  // Seuil excessif
  const strongBelow = byFeel['trop fort'].filter((v) => v < sp.maxRideable);
  if (strongBelow.length >= 2) {
    const s = Math.round(q(strongBelow, 0.25));
    if (s < sp.maxRideable) out.push({ field: 'maxRideable', label: 'Excessif au-delà', current: sp.maxRideable, suggested: s, why: `${strongBelow.length} sessions jugées « trop fort » sous ${sp.maxRideable} nds prévus.` });
  }
  return { count: rs.length, byFeel, suggestions: out };
}
