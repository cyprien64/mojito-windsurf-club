// Ce que le club a appris de ses propres sessions : taille de voile / d'aile
// réellement utilisée par plage de vent et par spot.
import type { SessionReport } from '../services/backend';

export const WIND_BANDS: [number, number][] = [
  [0, 12],
  [12, 16],
  [16, 20],
  [20, 25],
  [25, 60],
];

export interface BandStat {
  band: [number, number];
  discipline: 'windsurf' | 'wingfoil';
  count: number;
  medianSize: number;
  avgRating: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function clubStats(reports: SessionReport[], spotId: string): BandStat[] {
  const out: BandStat[] = [];
  for (const discipline of ['windsurf', 'wingfoil'] as const) {
    for (const band of WIND_BANDS) {
      const rs = reports.filter(
        (r) => r.spot_id === spotId && r.discipline === discipline && r.sail != null && r.wind_kn != null && r.wind_kn >= band[0] && r.wind_kn < band[1],
      );
      if (rs.length < 2) continue;
      out.push({
        band,
        discipline,
        count: rs.length,
        medianSize: median(rs.map((r) => r.sail as number)),
        avgRating: rs.reduce((a, r) => a + r.rating, 0) / rs.length,
      });
    }
  }
  return out;
}

/** Statistique applicable au vent donné, si le club a assez de retours. */
export function statForWind(stats: BandStat[], discipline: 'windsurf' | 'wingfoil', kn: number): BandStat | null {
  return stats.find((s) => s.discipline === discipline && kn >= s.band[0] && kn < s.band[1]) ?? null;
}
