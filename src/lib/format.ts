import { toKmh } from './wind';

export const fmt = (v: number | null | undefined, digits = 0): string =>
  v == null || Number.isNaN(v) ? '—' : v.toLocaleString('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const fmtKn = (v: number | null | undefined) => (v == null ? '—' : `${fmt(v)} nds`);
export const fmtKmh = (v: number | null | undefined) => (v == null ? '—' : `${fmt(toKmh(v))} km/h`);

/** Heure "HH h" depuis une chaîne locale ISO "2026-11-13T14:00". */
export function hourLabel(iso: string): string {
  const h = iso.slice(11, 13);
  return `${Number(h)} h`;
}

export function hhmm(iso: string | undefined | null): string {
  if (!iso) return '—';
  return iso.slice(11, 16).replace(':', ' h ');
}

const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Date locale (sans fuseau) d'une chaîne "YYYY-MM-DD..." */
function localDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayLabel(iso: string, long = false): string {
  const d = localDate(iso);
  return `${(long ? DAYS_LONG : DAYS)[d.getDay()]} ${d.getDate()}`;
}

/** "aujourd'hui", "demain" ou le jour. */
export function relativeDay(iso: string, todayIso: string): string {
  const diff = Math.round((localDate(iso).getTime() - localDate(todayIso).getTime()) / 86400000);
  if (diff === 0) return 'aujourd’hui';
  if (diff === 1) return 'demain';
  if (diff === -1) return 'hier';
  return dayLabel(iso, true);
}

export function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'à l’instant';
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export function dateTime(d: Date | number): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  return date.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Nébulosité en octas (0 à 8), unité des météorologues. */
export function octas(pct: number | null | undefined): number | null {
  return pct == null ? null : Math.round((pct / 100) * 8);
}

export function cloudLabel(pct: number | null | undefined): string {
  if (pct == null) return '—';
  if (pct < 12) return 'Ciel clair';
  if (pct < 38) return 'Peu nuageux';
  if (pct < 63) return 'Partiellement nuageux';
  if (pct < 88) return 'Nuageux';
  return 'Couvert';
}
