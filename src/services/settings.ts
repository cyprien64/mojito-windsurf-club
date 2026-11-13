// Paramètres administrables du club.
// Ordre de priorité :
//   1. Réglages locaux enregistrés depuis la page Admin (localStorage de l'appareil)
//   2. Fichier public `club-settings.json` publié dans le dépôt (partagé par tous les membres)
//   3. Valeurs par défaut du code (src/config/spots.ts + src/config/scoring.ts)
// Sur un site statique (GitHub Pages), il n'y a pas de base de données : pour partager
// des réglages avec tout le club, exportez-les depuis Admin et remplacez
// `public/club-settings.json` dans le dépôt (voir README).

import type { ClubSettings, SpotWindConfig } from '../types';
import { buildDefaultSettings } from '../config/scoring';
import { SPOTS } from '../config/spots';

const LOCAL_KEY = 'mwc-settings:v1';

export type SettingsSource = 'local' | 'club' | 'default';

function isValidSpotConfig(c: any): c is SpotWindConfig {
  return (
    c &&
    Array.isArray(c.sectors) &&
    c.sectors.length === 16 &&
    c.speed &&
    ['minRideable', 'idealMin', 'idealMax', 'maxRideable'].every((k) => typeof c.speed[k] === 'number') &&
    c.gusts &&
    typeof c.gusts.maxGust === 'number' &&
    typeof c.gusts.maxGustFactor === 'number'
  );
}

/** Fusionne un objet (potentiellement partiel / ancien) avec les valeurs par défaut. */
export function normalizeSettings(raw: any): ClubSettings {
  const base = buildDefaultSettings();
  if (!raw || typeof raw !== 'object') return base;
  const weights = { ...base.weights };
  if (raw.weights) {
    (Object.keys(weights) as (keyof typeof weights)[]).forEach((k) => {
      const v = Number(raw.weights[k]);
      if (Number.isFinite(v) && v >= 0) weights[k] = v;
    });
  }
  const spots = { ...base.spots };
  for (const s of SPOTS) {
    const c = raw.spots?.[s.id];
    if (isValidSpotConfig(c)) spots[s.id] = { ...c, notes: typeof c.notes === 'string' ? c.notes : '' };
  }
  return {
    version: 1,
    weights,
    windowThreshold: Number.isFinite(Number(raw.windowThreshold)) ? Number(raw.windowThreshold) : base.windowThreshold,
    daylightOnly: typeof raw.daylightOnly === 'boolean' ? raw.daylightOnly : base.daylightOnly,
    spots,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export function loadLocalSettings(): ClubSettings | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? normalizeSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLocalSettings(s: ClubSettings): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }));
}

export function clearLocalSettings(): void {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

/** Réglages du club publiés avec le site (public/club-settings.json). */
export async function fetchClubSettings(): Promise<ClubSettings | null> {
  try {
    const res = await fetch(`./club-settings.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.spots) return null;
    return normalizeSettings(json);
  } catch {
    return null;
  }
}

export function exportSettings(s: ClubSettings): string {
  return JSON.stringify({ ...s, updatedAt: new Date().toISOString() }, null, 2);
}
