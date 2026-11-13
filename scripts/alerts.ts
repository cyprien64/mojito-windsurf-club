// =====================================================================
//  ALERTES TELEGRAM — exécuté par GitHub Actions (.github/workflows/alerts.yml)
// ---------------------------------------------------------------------
//  Récupère les prévisions Open-Meteo, applique EXACTEMENT le même moteur
//  de notation que le site (src/lib/scoring.ts) et envoie un résumé des
//  bonnes sessions à venir sur un groupe / canal Telegram.
//  Secrets requis (Settings → Secrets and variables → Actions) :
//    TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
//  Variables facultatives : ALERT_MIN_SCORE (défaut 70), SITE_URL
//  Sans secrets, le script affiche le message et s'arrête sans erreur.
// =====================================================================

import { readFileSync } from 'node:fs';
import { SPOTS, SPOT_BY_ID } from '../src/config/spots';
import { fetchAllSpotsModels, fetchAllSpotsWeather } from '../src/services/weather';
import { normalizeSettings } from '../src/services/settings';
import { evaluateSpot, findWindows, bestWindow, modelAgreement, AGREEMENT_META, type SailWindow } from '../src/lib/scoring';
import { cardinal } from '../src/lib/wind';
import { hhmm, relativeDay } from '../src/lib/format';

const MIN_SCORE = Number(process.env.ALERT_MIN_SCORE || 70);
const SITE = (process.env.SITE_URL || 'https://cyprien64.github.io/mojito-windsurf-club/').replace(/\/?$/, '/');

async function loadSettings() {
  // 1. réglages publiés en ligne (Supabase), 2. fichier du club, 3. défauts
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const res = await fetch(`${url.trim().match(/^https?:\/\/[^/]+/)?.[0]}/rest/v1/club_settings?id=eq.1&select=data`, { headers: { apikey: key } });
      const rows = (await res.json()) as { data: unknown }[];
      if (rows?.[0]?.data) return normalizeSettings(rows[0].data);
    } catch {
      /* repli */
    }
  }
  try {
    return normalizeSettings(JSON.parse(readFileSync('public/club-settings.json', 'utf8')));
  } catch {
    return normalizeSettings(null);
  }
}

async function main() {
  const settings = await loadSettings();
  const weather = (await fetchAllSpotsWeather(SPOTS, true)).data;
  let models: Awaited<ReturnType<typeof fetchAllSpotsModels>>['data'] = {};
  try {
    models = (await fetchAllSpotsModels(SPOTS, true)).data;
  } catch {
    /* comparaison des modèles facultative */
  }

  const lines: string[] = [];
  for (const s of SPOTS) {
    const w = weather[s.id];
    if (!w) continue;
    const cfg = settings.spots[s.id] ?? s.defaults;
    const ev = evaluateSpot(s.id, w, cfg, settings, models[s.id]);
    // Fenêtres sur les 36 prochaines heures
    const wins: SailWindow[] = findWindows(ev.hours, w.nowIndex, w.nowIndex + 36, Math.max(settings.windowThreshold, MIN_SCORE), settings.daylightOnly);
    const best = bestWindow(wins);
    if (!best || best.hours < 2) continue;
    const hours = ev.hours.filter((h) => h.time >= best.start && h.time < best.end).map((h) => h.time);
    const agr = modelAgreement(models[s.id], hours);
    lines.push(
      `🌴 *${SPOT_BY_ID[s.id].name}* — ${relativeDay(best.start, w.current.time)} ${hhmm(best.start)} – ${hhmm(best.end)}\n` +
        `   ${Math.round(best.avgSpeed)} nds ${cardinal(best.mainDir)}, rafales max ${best.maxGust != null ? Math.round(best.maxGust) : '—'} nds · ${Math.round(best.avgScore)}/100` +
        (agr ? `\n   Modèles : ${AGREEMENT_META[agr.level].label.toLowerCase()}` : '') +
        `\n   ${SITE}#/conditions/${s.id}`,
    );
  }

  if (!lines.length) {
    console.log('Aucune bonne session dans les 36 prochaines heures : pas de message.');
    return;
  }
  const text =
    `*Mojito Windsurf Club — sessions à venir*\n\n${lines.join('\n\n')}\n\n` +
    `_Aide à la décision automatique : vérifiez toujours les conditions réelles avant de naviguer._`;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.log('Secrets Telegram absents — message qui aurait été envoyé :\n\n' + text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram : ${res.status} ${await res.text()}`);
  console.log('Message Telegram envoyé.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
