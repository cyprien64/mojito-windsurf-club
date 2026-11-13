import { useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import { useApp } from '../context/AppContext';
import { evaluateRules, loadRules, notificationsSupported, requestPermission, saveRules, type AlertRule } from '../services/notifications';

const RULE_TEXT: Record<AlertRule['type'], string> = {
  'wind-above': 'Le vent moyen dépasse',
  'good-conditions': 'Les conditions deviennent favorables (note ≥)',
  'models-converge': 'Les modèles convergent vers une bonne session (créneau ≥)',
};

export function Alerts() {
  const { ranking } = useApp();
  const [rules, setRules] = useState<AlertRule[]>(() => loadRules());
  const [perm, setPerm] = useState<string>(() => (notificationsSupported() ? Notification.permission : 'unsupported'));

  const update = (id: string, patch: Partial<AlertRule>) => {
    const next = rules.map((r) => (r.id === id ? ({ ...r, ...patch } as AlertRule) : r));
    setRules(next);
    saveRules(next);
  };

  const preview = evaluateRules(rules, ranking, (id) => SPOT_BY_ID[id]?.shortName ?? id);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Alertes</h1>
        <p className="max-w-2xl text-sm text-ink-700">
          Recevez une notification sur cet appareil lorsque les conditions correspondent à vos critères. Les règles sont vérifiées à chaque actualisation des
          données (toutes les 15 min) tant que le site ou l’application installée est ouvert. Une orientation classée dangereuse ne déclenche jamais d’alerte
          positive.
        </p>
      </section>

      <section className="card card-pad flex flex-wrap items-center gap-3">
        {perm === 'granted' ? <BellRing className="h-5 w-5 text-mint-700" /> : perm === 'denied' ? <BellOff className="h-5 w-5 text-rate-bad" /> : <Bell className="h-5 w-5" />}
        <p className="flex-1 text-sm">
          {perm === 'unsupported'
            ? 'Ce navigateur ne gère pas les notifications. Sur iPhone, installez d’abord le site sur l’écran d’accueil.'
            : perm === 'granted'
              ? 'Notifications autorisées sur cet appareil.'
              : perm === 'denied'
                ? 'Notifications bloquées : modifiez l’autorisation dans les réglages du navigateur.'
                : 'Autorisez les notifications pour recevoir les alertes.'}
        </p>
        {perm === 'default' && (
          <button className="btn-primary" onClick={async () => setPerm(await requestPermission())}>
            Autoriser
          </button>
        )}
      </section>

      <section className="space-y-3">
        {rules.map((r) => (
          <div key={r.id} className="card card-pad flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" className="h-5 w-5 accent-mint-600" checked={r.enabled} onChange={(e) => update(r.id, { enabled: e.target.checked })} />
              {RULE_TEXT[r.type]}
            </label>
            <input
              type="number"
              className="input !w-20"
              value={r.type === 'wind-above' ? r.knots : r.minScore}
              onChange={(e) => update(r.id, r.type === 'wind-above' ? { knots: Number(e.target.value) } : { minScore: Number(e.target.value) })}
              aria-label="Seuil"
            />
            <span className="text-sm text-ink-700">{r.type === 'wind-above' ? 'nœuds' : '/100'} sur</span>
            <select className="input !w-auto" value={r.spotId} onChange={(e) => update(r.id, { spotId: e.target.value })}>
              <option value="*">tous les spots</option>
              {SPOTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>

      <section className="card card-pad">
        <h2 className="font-display text-lg font-extrabold">Alertes qui se déclencheraient maintenant</h2>
        {preview.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {preview.map((a) => (
              <li key={`${a.ruleId}-${a.spotId}`}>
                <strong>{a.title}</strong> — {a.body}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-ink-700">Aucune pour le moment.</p>
        )}
      </section>
    </div>
  );
}
