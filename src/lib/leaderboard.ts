// Classements du club à partir des retours de session (données déclaratives).
import type { Competition, CompetitionMetric, SessionReport } from '../services/backend';

export const METRIC_META: Record<CompetitionMetric, { label: string; unit: string; desc: string; digits: number }> = {
  distance: { label: 'Distance', unit: 'km', desc: 'Distance totale parcourue', digits: 1 },
  duration: { label: 'Temps sur l’eau', unit: 'h', desc: 'Temps total de navigation', digits: 1 },
  sessions: { label: 'Sessions', unit: '', desc: 'Nombre de sessions déclarées', digits: 0 },
  avg_speed: { label: 'Vitesse moyenne', unit: 'nds', desc: 'Meilleure vitesse moyenne sur une session (au moins 20 min)', digits: 1 },
  max_speed: { label: 'Vitesse max', unit: 'nds', desc: 'Pointe de vitesse la plus élevée (GPS / montre)', digits: 1 },
};

/** Limites de plausibilité : au-delà, la valeur est ignorée (erreur de saisie). */
const LIMITS = { distance: 250, duration: 720, avgSpeedKn: 40, maxSpeedKn: 55 };

export interface RiderScore {
  key: string;
  name: string;
  sessions: number;
  distance: number; // km
  duration: number; // h
  bestAvgSpeed: number | null; // nds
  maxSpeed: number | null; // nds
  value: number;
  lastSpot: string | null;
}

export function sessionAvgSpeedKn(r: SessionReport): number | null {
  if (r.distance_km == null || r.duration_min == null || r.duration_min < 20) return null;
  if (r.distance_km > LIMITS.distance || r.duration_min > LIMITS.duration) return null;
  const kn = r.distance_km / (r.duration_min / 60) / 1.852;
  return kn > 0 && kn <= LIMITS.avgSpeedKn ? kn : null;
}

export interface Filter {
  from?: string; // AAAA-MM-JJ inclus
  to?: string; // AAAA-MM-JJ inclus
  spotId?: string | null;
  discipline?: 'windsurf' | 'wingfoil' | null;
}

export function filterReports(reports: SessionReport[], f: Filter): SessionReport[] {
  return reports.filter((r) => {
    const day = (r.created_at ?? '').slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (f.spotId && r.spot_id !== f.spotId) return false;
    if (f.discipline && r.discipline !== f.discipline) return false;
    return true;
  });
}

export function leaderboard(reports: SessionReport[], metric: CompetitionMetric, f: Filter = {}): RiderScore[] {
  const map = new Map<string, RiderScore>();
  for (const r of filterReports(reports, f)) {
    const key = r.author.trim().toLowerCase();
    if (!key) continue;
    let s = map.get(key);
    if (!s) {
      s = { key, name: r.author.trim(), sessions: 0, distance: 0, duration: 0, bestAvgSpeed: null, maxSpeed: null, value: 0, lastSpot: null };
      map.set(key, s);
    }
    s.sessions += 1;
    if (!s.lastSpot) s.lastSpot = r.spot_id;
    if (r.distance_km != null && r.distance_km > 0 && r.distance_km <= LIMITS.distance) s.distance += r.distance_km;
    if (r.duration_min != null && r.duration_min > 0 && r.duration_min <= LIMITS.duration) s.duration += r.duration_min / 60;
    const avg = sessionAvgSpeedKn(r);
    if (avg != null && (s.bestAvgSpeed == null || avg > s.bestAvgSpeed)) s.bestAvgSpeed = avg;
    if (r.max_speed_kn != null && r.max_speed_kn > 0 && r.max_speed_kn <= LIMITS.maxSpeedKn && (s.maxSpeed == null || r.max_speed_kn > s.maxSpeed)) s.maxSpeed = r.max_speed_kn;
  }
  const list = [...map.values()].map((s) => ({
    ...s,
    value:
      metric === 'distance'
        ? s.distance
        : metric === 'duration'
          ? s.duration
          : metric === 'sessions'
            ? s.sessions
            : metric === 'avg_speed'
              ? (s.bestAvgSpeed ?? 0)
              : (s.maxSpeed ?? 0),
  }));
  return list.filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
}

export function competitionStatus(c: Competition, today: string): 'à venir' | 'en cours' | 'terminée' {
  if (today < c.starts_on) return 'à venir';
  if (today > c.ends_on) return 'terminée';
  return 'en cours';
}

export function competitionBoard(reports: SessionReport[], c: Competition): RiderScore[] {
  return leaderboard(reports, c.metric, { from: c.starts_on, to: c.ends_on, spotId: c.spot_id, discipline: c.discipline });
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
