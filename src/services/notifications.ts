// =====================================================================
//  NOTIFICATIONS — architecture prête pour des alertes futures.
// ---------------------------------------------------------------------
//  Aujourd'hui : les règles sont évaluées dans le navigateur à chaque
//  actualisation des données, et une notification système est affichée
//  si l'utilisateur l'a autorisée (site ouvert ou installé en PWA).
//  Demain : ces mêmes règles pourront être évaluées par une tâche
//  planifiée (GitHub Actions, Cloudflare Worker…) qui enverra des
//  notifications Web Push — voir README, section « Notifications ».
// =====================================================================

import type { SpotEvaluation } from '../lib/scoring';

export type AlertRule =
  | { id: string; type: 'wind-above'; spotId: string | '*'; knots: number; enabled: boolean }
  | { id: string; type: 'good-conditions'; spotId: string | '*'; minScore: number; enabled: boolean }
  | { id: string; type: 'models-converge'; spotId: string | '*'; minScore: number; enabled: boolean };

export interface TriggeredAlert {
  ruleId: string;
  spotId: string;
  title: string;
  body: string;
}

const RULES_KEY = 'mwc-alert-rules:v1';
const SENT_KEY = 'mwc-alert-sent:v1';

export const DEFAULT_RULES: AlertRule[] = [
  { id: 'good', type: 'good-conditions', spotId: '*', minScore: 70, enabled: false },
  { id: 'wind', type: 'wind-above', spotId: '*', knots: 18, enabled: false },
  { id: 'models', type: 'models-converge', spotId: '*', minScore: 65, enabled: false },
];

export function loadRules(): AlertRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? (JSON.parse(raw) as AlertRule[]) : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveRules(rules: AlertRule[]): void {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {
    /* ignore */
  }
}

/** Évalue les règles sur les évaluations courantes. */
export function evaluateRules(rules: AlertRule[], evals: SpotEvaluation[], spotName: (id: string) => string): TriggeredAlert[] {
  const out: TriggeredAlert[] = [];
  for (const r of rules) {
    if (!r.enabled) continue;
    for (const e of evals) {
      if (r.spotId !== '*' && r.spotId !== e.spotId) continue;
      if (e.blocked) continue; // jamais d'alerte positive sur une orientation dangereuse
      const name = spotName(e.spotId);
      if (r.type === 'wind-above' && e.speed != null && e.speed >= r.knots) {
        out.push({ ruleId: r.id, spotId: e.spotId, title: `${name} : ${Math.round(e.speed)} nds`, body: `Le vent dépasse ${r.knots} nœuds.` });
      }
      if (r.type === 'good-conditions' && e.score >= r.minScore) {
        out.push({ ruleId: r.id, spotId: e.spotId, title: `${name} : conditions favorables`, body: e.summary });
      }
      if (r.type === 'models-converge' && e.agreement?.level === 'forte' && (e.bestWindow?.avgScore ?? 0) >= r.minScore) {
        out.push({
          ruleId: r.id,
          spotId: e.spotId,
          title: `${name} : les modèles convergent`,
          body: `Bonne session annoncée par ${e.agreement.modelCount} modèles concordants.`,
        });
      }
    }
  }
  return out;
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

/** Affiche les alertes nouvelles (une seule fois par règle/spot et par jour). */
export async function dispatchAlerts(alerts: TriggeredAlert[]): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted' || !alerts.length) return;
  let sent: Record<string, string> = {};
  try {
    sent = JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
  } catch {
    /* ignore */
  }
  const today = new Date().toISOString().slice(0, 10);
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  for (const a of alerts) {
    const k = `${a.ruleId}:${a.spotId}`;
    if (sent[k] === today) continue;
    sent[k] = today;
    const opts = { body: a.body, icon: './icons/icon-192.png', tag: k };
    if (reg) await reg.showNotification(a.title, opts);
    else new Notification(a.title, opts);
  }
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    /* ignore */
  }
}
