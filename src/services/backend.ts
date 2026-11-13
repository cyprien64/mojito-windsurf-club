// =====================================================================
//  BACKEND OPTIONNEL — Supabase (gratuit)
// ---------------------------------------------------------------------
//  Active : retours de session des membres (« J'y suis »), réglages du
//  club partagés en ligne et connexion sécurisée des admins.
//  Activation : créez un projet Supabase, exécutez supabase/schema.sql,
//  puis renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
//  (variables du dépôt GitHub, voir README). Sans ces variables, le site
//  fonctionne normalement et ces fonctions indiquent « non activé ».
//  Utilise directement l'API REST (pas de SDK) pour rester léger.
// =====================================================================

import type { ClubSettings } from '../types';

// On ne garde que « https://xxxx.supabase.co », même si l'URL copiée se termine par /rest/v1/.
const BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().match(/^https?:\/\/[^/]+/)?.[0];
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const backendEnabled = Boolean(BASE && KEY);

async function call<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!BASE || !KEY) throw new Error('Backend non activé');
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      // Jeton utilisateur seulement si un admin est connecté : fonctionne avec
      // l'ancienne clé « anon » comme avec la nouvelle clé « publishable ».
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(body?.message || body?.msg || body?.error_description || `Erreur ${res.status}`);
  return body as T;
}

// ---------------- Retours de session ----------------

export type Feel = 'trop faible' | 'bon' | 'fort' | 'trop fort';

export interface SessionReport {
  id?: number;
  created_at?: string;
  spot_id: string;
  author: string;
  discipline: 'windsurf' | 'wingfoil';
  on_water: boolean;
  feel: Feel;
  rating: number;
  sail: number | null;
  board: number | null;
  /** Vent moyen du modèle (nds) au moment du retour — sert aux statistiques du club. */
  wind_kn: number | null;
  comment: string;
  /** Marque / modèle de la voile ou de l'aile. */
  sail_brand: string;
  /** Marque / modèle de la planche. */
  board_brand: string;
  /** Distance parcourue (km), déclarative (GPS, montre…). */
  distance_km: number | null;
  /** Durée de la session (minutes). */
  duration_min: number | null;
  /** Vitesse max (nœuds), lue sur un GPS / une montre. */
  max_speed_kn: number | null;
  /** Tracé GPS simplifié [lat, lon][] (import GPX), facultatif. */
  track?: [number, number][] | null;
  /** Calculé par la base : la session a un tracé GPS. */
  has_track?: boolean;
}

const BASE_COLS =
  'id,created_at,spot_id,author,discipline,on_water,feel,rating,sail,board,wind_kn,comment,sail_brand,board_brand,distance_km,duration_min,max_speed_kn';
// Tant que le script SQL n'a pas été relancé, la colonne has_track n'existe pas : on s'en passe.
let REPORT_COLS = `${BASE_COLS},has_track`;
async function withTrackFallback<T>(f: () => Promise<T>): Promise<T> {
  try {
    return await f();
  } catch (e) {
    if (REPORT_COLS.includes('has_track') && /has_track/.test((e as Error).message)) {
      REPORT_COLS = BASE_COLS;
      return f();
    }
    throw e;
  }
}

export async function getTrack(id: number): Promise<[number, number][] | null> {
  const rows = await call<{ track: [number, number][] | null }[]>(`/rest/v1/session_reports?select=track&id=eq.${id}`);
  return rows[0]?.track ?? null;
}

export async function listReports(sinceHours = 24 * 400): Promise<SessionReport[]> {
  const since = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString();
  return withTrackFallback(() => call<SessionReport[]>(`/rest/v1/session_reports?select=${REPORT_COLS}&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=3000`));
}

export async function addReport(r: SessionReport): Promise<SessionReport> {
  // On n'envoie le tracé que s'il existe (compatible avec une base pas encore mise à jour).
  const { has_track: _h, track, ...row } = r;
  const rows = await withTrackFallback(() =>
    call<SessionReport[]>(`/rest/v1/session_reports?select=${REPORT_COLS}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(track && track.length > 1 ? { ...row, track } : row),
    }),
  );
  return rows[0];
}

export async function deleteReport(id: number, token: string): Promise<void> {
  await call(`/rest/v1/session_reports?id=eq.${id}`, { method: 'DELETE' }, token);
}

// ---------------- Code secret de l'appareil ----------------
// Permet d'annuler ses propres sorties / inscriptions sans compte.

export function deviceToken(): string {
  const KEY_T = 'mwc-device-token';
  try {
    let t = localStorage.getItem(KEY_T);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(KEY_T, t);
    }
    return t;
  } catch {
    return crypto.randomUUID();
  }
}

function mine(kind: 'trips' | 'signups'): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(`mwc-my-${kind}`) || '{}');
  } catch {
    return {};
  }
}
function remember(kind: 'trips' | 'signups', id: number, on: boolean) {
  const m = mine(kind);
  if (on) m[id] = true;
  else delete m[id];
  try {
    localStorage.setItem(`mwc-my-${kind}`, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}
export const isMine = (kind: 'trips' | 'signups', id?: number) => id != null && !!mine(kind)[id];

// ---------------- « Qui y va ? » ----------------

export interface Trip {
  id?: number;
  created_at?: string;
  author: string;
  spot_id: string;
  /** AAAA-MM-JJ */
  day: string;
  from_hour: number;
  to_hour: number;
  discipline: 'windsurf' | 'wingfoil' | 'les deux';
  carpool: '' | 'propose' | 'cherche';
  seats: number | null;
  departure: string;
  comment: string;
}

const TRIP_COLS = 'id,created_at,author,spot_id,day,from_hour,to_hour,discipline,carpool,seats,departure,comment';

export async function listTrips(): Promise<Trip[]> {
  const today = new Date();
  const from = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  return call<Trip[]>(`/rest/v1/trips?select=${TRIP_COLS}&day=gte.${from}&order=day.asc,from_hour.asc&limit=500`);
}

export async function addTrip(t: Trip): Promise<void> {
  const token = deviceToken();
  // On relit l'id créé via le code secret (le code n'est pas lisible : on filtre sur l'auteur et la date).
  await call('/rest/v1/trips', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...t, owner_token: token }) });
  const rows = await call<Trip[]>(
    `/rest/v1/trips?select=id&author=eq.${encodeURIComponent(t.author)}&day=eq.${t.day}&spot_id=eq.${encodeURIComponent(t.spot_id)}&order=id.desc&limit=1`,
  );
  if (rows[0]?.id != null) remember('trips', rows[0].id, true);
}

export async function cancelTrip(id: number, admin?: AdminSession | null): Promise<void> {
  if (isMine('trips', id)) {
    await call('/rest/v1/rpc/cancel_trip', { method: 'POST', body: JSON.stringify({ trip_id: id, token: deviceToken() }) });
    remember('trips', id, false);
  } else if (admin) {
    await call(`/rest/v1/trips?id=eq.${id}`, { method: 'DELETE' }, admin.token);
  }
}

// ---------------- Calendrier du club ----------------

export type EventKind = 'sortie' | 'compétition' | 'formation' | 'soirée' | 'autre';

export interface ClubEvent {
  id?: number;
  created_at?: string;
  title: string;
  kind: EventKind;
  starts_on: string;
  ends_on: string;
  location: string;
  spot_id: string | null;
  description: string;
}

export interface EventSignup {
  id?: number;
  created_at?: string;
  event_id: number;
  author: string;
  comment: string;
}

export async function listEvents(): Promise<ClubEvent[]> {
  return call<ClubEvent[]>('/rest/v1/events?select=*&order=starts_on.asc&limit=200');
}
export async function addEvent(e: ClubEvent, session: AdminSession): Promise<void> {
  await call('/rest/v1/events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(e) }, session.token);
}
export async function deleteEvent(id: number, session: AdminSession): Promise<void> {
  await call(`/rest/v1/events?id=eq.${id}`, { method: 'DELETE' }, session.token);
}
export async function listSignups(): Promise<EventSignup[]> {
  return call<EventSignup[]>('/rest/v1/event_signups?select=id,created_at,event_id,author,comment&order=created_at.asc&limit=2000');
}
export async function addSignup(s: EventSignup): Promise<void> {
  await call('/rest/v1/event_signups', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...s, owner_token: deviceToken() }) });
  const rows = await call<EventSignup[]>(
    `/rest/v1/event_signups?select=id&event_id=eq.${s.event_id}&author=eq.${encodeURIComponent(s.author)}&order=id.desc&limit=1`,
  );
  if (rows[0]?.id != null) remember('signups', rows[0].id, true);
}
export async function cancelSignup(id: number, admin?: AdminSession | null): Promise<void> {
  if (isMine('signups', id)) {
    await call('/rest/v1/rpc/cancel_signup', { method: 'POST', body: JSON.stringify({ signup_id: id, token: deviceToken() }) });
    remember('signups', id, false);
  } else if (admin) {
    await call(`/rest/v1/event_signups?id=eq.${id}`, { method: 'DELETE' }, admin.token);
  }
}

/** Prénom mémorisé sur l'appareil (partagé entre les formulaires). */
export function savedAuthor(): string {
  try {
    return localStorage.getItem('mwc-author') ?? '';
  } catch {
    return '';
  }
}
export function saveAuthor(name: string) {
  try {
    localStorage.setItem('mwc-author', name.trim());
  } catch {
    /* ignore */
  }
}

// ---------------- Micro-compétitions ----------------

export type CompetitionMetric = 'distance' | 'duration' | 'sessions' | 'avg_speed' | 'max_speed';

export interface Competition {
  id?: number;
  created_at?: string;
  title: string;
  metric: CompetitionMetric;
  spot_id: string | null;
  discipline: 'windsurf' | 'wingfoil' | null;
  /** Dates incluses, format AAAA-MM-JJ. */
  starts_on: string;
  ends_on: string;
  description: string;
}

export async function listCompetitions(): Promise<Competition[]> {
  return call<Competition[]>('/rest/v1/competitions?select=*&order=starts_on.desc&limit=200');
}

export async function addCompetition(c: Competition, session: AdminSession): Promise<void> {
  await call('/rest/v1/competitions', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(c) }, session.token);
}

export async function deleteCompetition(id: number, session: AdminSession): Promise<void> {
  await call(`/rest/v1/competitions?id=eq.${id}`, { method: 'DELETE' }, session.token);
}

// ---------------- Réglages du club ----------------

export interface RemoteSettings {
  data: ClubSettings;
  updated_at: string;
  updated_by: string | null;
}

export async function fetchRemoteSettings(): Promise<RemoteSettings | null> {
  if (!backendEnabled) return null;
  const rows = await call<RemoteSettings[]>('/rest/v1/club_settings?id=eq.1&select=data,updated_at,updated_by');
  return rows[0] ?? null;
}

export async function publishSettings(data: ClubSettings, session: AdminSession): Promise<void> {
  await call(
    '/rest/v1/club_settings',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: 1, data, updated_at: new Date().toISOString(), updated_by: session.email }),
    },
    session.token,
  );
}

// ---------------- Connexion admin (code reçu par e-mail) ----------------

export interface AdminSession {
  token: string;
  email: string;
  expiresAt: number;
}

const SESSION_KEY = 'mwc-admin-session';

export function loadAdminSession(): AdminSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as AdminSession | null;
    return s && s.expiresAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function logoutAdmin(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Envoie un code de connexion. Seuls les admins invités dans Supabase peuvent se connecter. */
export async function sendLoginCode(email: string): Promise<void> {
  await call('/auth/v1/otp', { method: 'POST', body: JSON.stringify({ email, create_user: false }) });
}

export async function verifyLoginCode(email: string, code: string): Promise<AdminSession> {
  const r = await call<{ access_token: string; expires_in: number; user?: { email?: string } }>('/auth/v1/verify', {
    method: 'POST',
    body: JSON.stringify({ type: 'email', email, token: code.trim() }),
  });
  const session: AdminSession = { token: r.access_token, email: r.user?.email ?? email, expiresAt: Date.now() + (r.expires_in - 60) * 1000 };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
  return session;
}
