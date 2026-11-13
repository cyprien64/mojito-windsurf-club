// Balises anémomètres en temps réel — réseau Pioupiou / OpenWindMap.
// API publique et gratuite : https://developers.pioupiou.fr/api/live/
// Données sous licence ouverte : © contributeurs du réseau OpenWindMap.

import type { StationReading } from '../types';
import { cached } from './cache';
import { KN_TO_KMH } from '../lib/wind';

const TTL = 4 * 60 * 1000;

const num = (v: unknown): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);
const kmhToKn = (v: number | null) => (v == null ? null : v / KN_TO_KMH);

export function haversineKm(a: number, b: number, c: number, d: number): number {
  const R = 6371;
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchOne(id: number): Promise<StationReading> {
  const res = await fetch(`https://api.pioupiou.fr/v1/live-with-meta/${id}`);
  if (!res.ok) throw new Error(`Balise ${id} indisponible (${res.status})`);
  const d = (await res.json()).data ?? {};
  const m = d.measurements ?? {};
  const time: string | null = m.date ?? null;
  return {
    provider: 'pioupiou',
    id,
    name: d.meta?.name ?? `Balise ${id}`,
    lat: num(d.location?.latitude),
    lon: num(d.location?.longitude),
    distanceKm: null,
    time,
    ageMin: null,
    avg: kmhToKn(num(m.wind_speed_avg)),
    max: kmhToKn(num(m.wind_speed_max)),
    min: kmhToKn(num(m.wind_speed_min)),
    heading: num(m.wind_heading),
    online: d.status?.state === 'on',
  };
}

/** Lit plusieurs balises (cache 4 min). Les balises en erreur sont ignorées. */
export async function fetchStations(ids: number[], force = false): Promise<Record<number, StationReading>> {
  const out: Record<number, StationReading> = {};
  await Promise.all(
    [...new Set(ids)].map(async (id) => {
      try {
        const r = await cached(`station:v1:${id}`, TTL, () => fetchOne(id), force);
        out[id] = r.data;
      } catch {
        /* balise indisponible */
      }
    }),
  );
  return out;
}

/** Complète distance au spot et âge de la mesure. */
export function withContext(s: StationReading, lat: number, lon: number): StationReading {
  return {
    ...s,
    distanceKm: s.lat != null && s.lon != null ? haversineKm(lat, lon, s.lat, s.lon) : null,
    ageMin: s.time ? Math.round((Date.now() - new Date(s.time).getTime()) / 60000) : null,
  };
}

/** Une mesure est exploitable si elle date de moins de 30 min et que la balise est en ligne. */
export const isFresh = (s: StationReading) => s.online && s.ageMin != null && s.ageMin <= 30 && s.avg != null;
