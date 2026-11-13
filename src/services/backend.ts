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

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const backendEnabled = Boolean(URL && KEY);

async function call<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!URL || !KEY) throw new Error('Backend non activé');
  const res = await fetch(`${URL}${path}`, {
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
}

export async function listReports(sinceHours = 24 * 400): Promise<SessionReport[]> {
  const since = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString();
  return call<SessionReport[]>(`/rest/v1/session_reports?select=*&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=3000`);
}

export async function addReport(r: SessionReport): Promise<SessionReport> {
  const rows = await call<SessionReport[]>('/rest/v1/session_reports', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(r),
  });
  return rows[0];
}

export async function deleteReport(id: number, token: string): Promise<void> {
  await call(`/rest/v1/session_reports?id=eq.${id}`, { method: 'DELETE' }, token);
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
