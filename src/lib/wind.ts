// Outils direction / vitesse du vent.

export const SECTOR_CODES = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'] as const;
export type SectorCode = (typeof SECTOR_CODES)[number];

export const SECTOR_NAMES: Record<SectorCode, string> = {
  N: 'Nord', NNE: 'Nord-Nord-Est', NE: 'Nord-Est', ENE: 'Est-Nord-Est', E: 'Est', ESE: 'Est-Sud-Est', SE: 'Sud-Est', SSE: 'Sud-Sud-Est',
  S: 'Sud', SSO: 'Sud-Sud-Ouest', SO: 'Sud-Ouest', OSO: 'Ouest-Sud-Ouest', O: 'Ouest', ONO: 'Ouest-Nord-Ouest', NO: 'Nord-Ouest', NNO: 'Nord-Nord-Ouest',
};

export const KN_TO_KMH = 1.852;

export const toKmh = (kn: number) => kn * KN_TO_KMH;

/** Index du secteur (0-15) pour une direction en degrés. */
export function sectorIndex(deg: number): number {
  const d = ((deg % 360) + 360) % 360;
  return Math.round(d / 22.5) % 16;
}

export function cardinal(deg: number | null | undefined): string {
  if (deg == null || Number.isNaN(deg)) return '—';
  return SECTOR_CODES[sectorIndex(deg)];
}

export function cardinalLong(deg: number | null | undefined): string {
  if (deg == null || Number.isNaN(deg)) return '—';
  return SECTOR_NAMES[SECTOR_CODES[sectorIndex(deg)]];
}

/** Plage angulaire d'un secteur, ex. « 326°–348° ». */
export function sectorRange(i: number): string {
  const c = i * 22.5;
  const a = (c - 11.25 + 360) % 360;
  const b = (c + 11.25) % 360;
  return `${Math.round(a)}°–${Math.round(b)}°`;
}

/** Échelle de Beaufort (nœuds). */
export function beaufort(kn: number): number {
  const limits = [1, 4, 7, 11, 17, 22, 28, 34, 41, 48, 56, 64];
  let i = 0;
  while (i < limits.length && kn >= limits[i]) i++;
  return i;
}

export type WindStrength = 'faible' | 'modéré' | 'fort' | 'très fort';

/** Classe générique (indépendante du spot) basée sur Beaufort. */
export function windStrength(kn: number): WindStrength {
  if (kn < 11) return 'faible'; // ≤ F3
  if (kn < 17) return 'modéré'; // F4
  if (kn < 28) return 'fort'; // F5–F6
  return 'très fort'; // ≥ F7
}

/** Différence angulaire minimale (0-180). */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return 180 - d;
}

/** Moyenne circulaire de directions (degrés). */
export function circularMean(dirs: number[]): number | null {
  if (!dirs.length) return null;
  let x = 0;
  let y = 0;
  for (const d of dirs) {
    x += Math.cos((d * Math.PI) / 180);
    y += Math.sin((d * Math.PI) / 180);
  }
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Dispersion circulaire (écart-type angulaire approx., degrés). */
export function circularSpread(dirs: number[]): number {
  if (dirs.length < 2) return 0;
  let x = 0;
  let y = 0;
  for (const d of dirs) {
    x += Math.cos((d * Math.PI) / 180);
    y += Math.sin((d * Math.PI) / 180);
  }
  const r = Math.sqrt(x * x + y * y) / dirs.length;
  if (r >= 1) return 0;
  return (Math.sqrt(-2 * Math.log(r)) * 180) / Math.PI;
}
