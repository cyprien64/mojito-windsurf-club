// =====================================================================
//  TRAJETS — distance et temps de route depuis la position de l'utilisateur
// ---------------------------------------------------------------------
//  - Position : géolocalisation du navigateur (avec l'accord de l'utilisateur)
//    ou ville de départ saisie (géocodage OpenStreetMap / Nominatim).
//  - Itinéraires : OSRM (Open Source Routing Machine, données OpenStreetMap),
//    UN seul appel pour tous les spots. Temps sans trafic.
//  - La position n'est envoyée qu'à ces services, uniquement à la demande,
//    et n'est stockée que sur l'appareil de l'utilisateur.
// =====================================================================

import type { SpotDefinition } from '../types';
import { haversineKm } from './stations';

export interface Origin {
  lat: number;
  lon: number;
  label: string;
  source: 'gps' | 'ville';
  at: number;
}

export interface RouteInfo {
  distanceKm: number;
  durationMin: number;
  /** true : estimation à vol d'oiseau (service d'itinéraire indisponible). */
  estimated: boolean;
}

const ORIGIN_KEY = 'mwc-origin';
const ROUTES_KEY = 'mwc-routes';

export function loadOrigin(): Origin | null {
  try {
    return JSON.parse(localStorage.getItem(ORIGIN_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveOrigin(o: Origin | null): void {
  try {
    if (o) localStorage.setItem(ORIGIN_KEY, JSON.stringify(o));
    else {
      localStorage.removeItem(ORIGIN_KEY);
      localStorage.removeItem(ROUTES_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function locate(): Promise<Origin> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('La géolocalisation n’est pas disponible sur cet appareil.'));
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: Math.round(p.coords.latitude * 1000) / 1000,
          lon: Math.round(p.coords.longitude * 1000) / 1000,
          label: 'Ma position',
          source: 'gps',
          at: Date.now(),
        }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? 'Accès à la position refusé. Autorisez-le dans les réglages du navigateur, ou saisissez une ville de départ.'
              : 'Position introuvable pour le moment. Réessayez ou saisissez une ville de départ.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

export async function geocodeCity(query: string): Promise<Origin> {
  const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', countrycodes: 'fr,es' });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'fr' } });
  if (!res.ok) throw new Error('Recherche de la ville impossible pour le moment.');
  const list = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (!list.length) throw new Error(`Aucun lieu trouvé pour « ${query} ».`);
  return {
    lat: Math.round(Number(list[0].lat) * 1000) / 1000,
    lon: Math.round(Number(list[0].lon) * 1000) / 1000,
    label: list[0].display_name.split(',').slice(0, 2).join(','),
    source: 'ville',
    at: Date.now(),
  };
}

/** Distance et temps de route vers chaque spot (cache 30 min par point de départ). */
export async function fetchRoutes(origin: Origin, spots: SpotDefinition[]): Promise<Record<string, RouteInfo>> {
  const key = `${origin.lat},${origin.lon}|${spots.map((s) => s.id).join(',')}`;
  try {
    const hit = JSON.parse(localStorage.getItem(ROUTES_KEY) || 'null');
    if (hit && hit.key === key && Date.now() - hit.at < 30 * 60 * 1000) return hit.data;
  } catch {
    /* ignore */
  }
  const coords = [`${origin.lon},${origin.lat}`, ...spots.map((s) => `${s.lon},${s.lat}`)].join(';');
  let out: Record<string, RouteInfo> = {};
  try {
    const res = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=duration,distance`);
    const body = await res.json();
    if (!res.ok || body.code !== 'Ok') throw new Error(body.message || 'itinéraire indisponible');
    spots.forEach((s, i) => {
      const d = body.distances?.[0]?.[i + 1];
      const t = body.durations?.[0]?.[i + 1];
      if (typeof d === 'number' && typeof t === 'number') out[s.id] = { distanceKm: d / 1000, durationMin: t / 60, estimated: false };
    });
  } catch {
    // Repli : vol d'oiseau × 1,3 à 75 km/h de moyenne
    out = {};
    for (const s of spots) {
      const km = haversineKm(origin.lat, origin.lon, s.lat, s.lon) * 1.3;
      out[s.id] = { distanceKm: km, durationMin: (km / 75) * 60, estimated: true };
    }
  }
  try {
    localStorage.setItem(ROUTES_KEY, JSON.stringify({ key, at: Date.now(), data: out }));
  } catch {
    /* ignore */
  }
  return out;
}

export function formatDuration(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

export const googleMapsUrl = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
export const wazeUrl = (lat: number, lon: number) => `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
