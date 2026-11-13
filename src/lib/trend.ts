// Synthèse jour par jour d'une prévision d'ensemble (51 scénarios ECMWF).
import type { SpotWindConfig } from '../types';
import type { EnsembleRaw } from '../services/weather';
import { sectorRatingFor } from './scoring';
import { circularMean } from './wind';

export type Confidence = 'forte' | 'moyenne' | 'faible';

export interface TrendDay {
  day: string;
  lead: number; // jours depuis aujourd'hui
  median: number;
  p10: number;
  p90: number;
  gustMedian: number | null;
  dir: number | null;
  /** Probabilité (0-1) que le vent soit navigable (vitesse et orientation). */
  pRideable: number;
  /** Probabilité (0-1) de conditions idéales. */
  pGood: number;
  confidence: Confidence;
}

const q = (sorted: number[], p: number) => {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

export function summarizeTrend(raw: EnsembleRaw, cfg: SpotWindConfig, todayIso: string): TrendDay[] {
  const days = [...new Set(raw.time.map((t) => t.slice(0, 10)))];
  const today = new Date(`${todayIso}T12:00:00`).getTime();
  return days.map((day) => {
    const idx = raw.time.map((t, i) => [t, i] as const).filter(([t]) => t.startsWith(day) && Number(t.slice(11, 13)) >= 10 && Number(t.slice(11, 13)) <= 18).map(([, i]) => i);
    const means: number[] = [];
    const gusts: number[] = [];
    const dirs: number[] = [];
    let ride = 0;
    let good = 0;
    raw.speed.forEach((member, m) => {
      const sp = idx.map((i) => member[i]).filter((v): v is number => v != null);
      if (!sp.length) return;
      // Meilleure fenêtre de 3 h de la journée pour ce scénario
      let best = 0;
      let bestStart = 0;
      for (let k = 0; k + 2 < sp.length; k++) {
        const v = (sp[k] + sp[k + 1] + sp[k + 2]) / 3;
        if (v > best) {
          best = v;
          bestStart = k;
        }
      }
      if (sp.length < 3) best = sp.reduce((a, b) => a + b, 0) / sp.length;
      const dIdx = idx.slice(bestStart, bestStart + 3);
      const d = circularMean(dIdx.map((i) => raw.dir[m]?.[i]).filter((v): v is number => v != null));
      const g = Math.max(...dIdx.map((i) => raw.gust[m]?.[i] ?? 0));
      means.push(best);
      if (g > 0) gusts.push(g);
      if (d != null) dirs.push(d);
      const rating = sectorRatingFor(cfg, d);
      const okDir = rating === 'ideal' || rating === 'ok' || rating == null;
      if (okDir && best >= cfg.speed.minRideable && best <= cfg.speed.maxRideable) ride++;
      if ((rating === 'ideal' || rating === 'ok') && best >= cfg.speed.idealMin && best <= cfg.speed.idealMax) good++;
    });
    const sorted = [...means].sort((a, b) => a - b);
    const gs = [...gusts].sort((a, b) => a - b);
    const p10 = q(sorted, 0.1);
    const p90 = q(sorted, 0.9);
    const spread = p90 - p10;
    const lead = Math.round((new Date(`${day}T12:00:00`).getTime() - today) / 86400000);
    let confidence: Confidence = spread <= 5 ? 'forte' : spread <= 10 ? 'moyenne' : 'faible';
    if (lead >= 10 && confidence === 'forte') confidence = 'moyenne';
    const n = means.length || 1;
    return {
      day,
      lead,
      median: q(sorted, 0.5),
      p10,
      p90,
      gustMedian: gs.length ? q(gs, 0.5) : null,
      dir: circularMean(dirs),
      pRideable: ride / n,
      pGood: good / n,
      confidence,
    };
  });
}
