import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Medal, Plus, Trash2, Trophy } from 'lucide-react';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import { useApp } from '../context/AppContext';
import {
  addCompetition,
  backendEnabled,
  deleteCompetition,
  listCompetitions,
  loadAdminSession,
  type Competition,
  type CompetitionMetric,
} from '../services/backend';
import { competitionBoard, competitionStatus, leaderboard, METRIC_META, todayIso, type RiderScore } from '../lib/leaderboard';
import { fmt } from '../lib/format';

const MEDALS = ['🥇', '🥈', '🥉'];
type Period = '7' | '30' | 'saison' | 'tout';

function daysAgo(n: number) {
  const d = new Date(Date.now() - n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Board({ rows, metric, limit = 20 }: { rows: RiderScore[]; metric: CompetitionMetric; limit?: number }) {
  const m = METRIC_META[metric];
  if (!rows.length) return <p className="text-sm text-ink-700">Pas encore de participants sur cette période.</p>;
  const max = rows[0].value || 1;
  return (
    <ol className="space-y-1.5">
      {rows.slice(0, limit).map((r, i) => (
        <li key={r.key} className={`relative overflow-hidden rounded-xl border px-3 py-2 ${i < 3 ? 'border-lime-300 bg-lemon-300/20' : 'border-mint-100 bg-cream-50'}`}>
          <div className="absolute inset-y-0 left-0 bg-mint-200/40" style={{ width: `${(r.value / max) * 100}%` }} aria-hidden="true" />
          <div className="relative flex items-center gap-3">
            <span className="w-8 text-center text-lg font-extrabold">{MEDALS[i] ?? i + 1}</span>
            <span className="flex-1 font-bold">{r.name}</span>
            <span className="hidden text-xs text-ink-700 sm:inline">
              {r.sessions} session{r.sessions > 1 ? 's' : ''} · {fmt(r.distance, 1)} km · {fmt(r.duration, 1)} h
            </span>
            <span className="tabular text-lg font-extrabold">
              {fmt(r.value, m.digits)} <span className="text-xs font-bold text-ink-700">{m.unit}</span>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Leaderboard() {
  const { reports, reloadReports } = useApp();
  const [metric, setMetric] = useState<CompetitionMetric>('distance');
  const [period, setPeriod] = useState<Period>('30');
  const [spotId, setSpotId] = useState<string>('');
  const [comps, setComps] = useState<Competition[]>([]);
  const [compError, setCompError] = useState<string | null>(null);
  const admin = loadAdminSession();
  const today = todayIso();

  const reloadComps = () => {
    if (!backendEnabled) return;
    listCompetitions()
      .then((c) => {
        setComps(c);
        setCompError(null);
      })
      .catch((e: Error) => setCompError(e.message));
  };
  useEffect(reloadComps, []);

  const from = period === '7' ? daysAgo(6) : period === '30' ? daysAgo(29) : period === 'saison' ? `${today.slice(0, 4)}-01-01` : undefined;
  const rows = useMemo(() => leaderboard(reports, metric, { from, spotId: spotId || null }), [reports, metric, from, spotId]);

  const active = comps.filter((c) => competitionStatus(c, today) === 'en cours');
  const upcoming = comps.filter((c) => competitionStatus(c, today) === 'à venir');
  const finished = comps.filter((c) => competitionStatus(c, today) === 'terminée');

  if (!backendEnabled) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Classement & défis</h1>
        <div className="card card-pad text-sm">
          Le classement utilise les retours de session : il faut d’abord activer Supabase (README, « Activer les fonctions communautaires »).
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <Trophy className="h-7 w-7 text-lemon-500" /> Classement & défis
        </h1>
        <p className="text-sm text-ink-700">
          Calculé à partir des sessions déclarées dans{' '}
          <Link to="/sessions" className="font-bold text-mint-700 underline">
            Sur l’eau
          </Link>{' '}
          (distance, durée, vitesse). Données déclaratives : les valeurs aberrantes sont ignorées. Pour la vitesse moyenne, la session doit durer au moins 20 min.
        </p>
      </section>

      {/* Micro-compétitions en cours */}
      {active.map((c) => (
        <CompetitionCard key={c.id} c={c} rows={competitionBoard(reports, c)} admin={!!admin} onDeleted={reloadComps} />
      ))}

      {/* Classement général */}
      <section className="card card-pad">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
          <Medal className="h-5 w-5 text-mint-600" /> Classement général
        </h2>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(Object.keys(METRIC_META) as CompetitionMetric[]).map((k) => (
            <button key={k} onClick={() => setMetric(k)} className={`chip border px-3 py-1.5 text-sm ${metric === k ? 'border-night bg-night text-white' : 'border-mint-200 bg-cream-50'}`}>
              {METRIC_META[k].label}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(
            [
              ['7', '7 jours'],
              ['30', '30 jours'],
              ['saison', 'Saison ' + today.slice(0, 4)],
              ['tout', 'Tout'],
            ] as [Period, string][]
          ).map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)} className={`chip border ${period === k ? 'border-mint-600 bg-mint-600 text-white' : 'border-mint-200 bg-cream-50'}`}>
              {l}
            </button>
          ))}
          <select className="input !w-auto !py-1.5" value={spotId} onChange={(e) => setSpotId(e.target.value)} aria-label="Filtrer par spot">
            <option value="">Tous les spots</option>
            {SPOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName}
              </option>
            ))}
          </select>
        </div>
        <p className="mb-2 text-xs text-ink-700">{METRIC_META[metric].desc}</p>
        <Board rows={rows} metric={metric} />
      </section>

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">Défis à venir</h2>
          {upcoming.map((c) => (
            <CompetitionCard key={c.id} c={c} rows={[]} admin={!!admin} onDeleted={reloadComps} />
          ))}
        </section>
      )}

      {admin && <NewCompetition onCreated={reloadComps} />}
      {!admin && (
        <p className="text-xs text-ink-700">
          Les admins créent les micro-compétitions depuis cette page après s’être connectés dans{' '}
          <Link to="/admin" className="underline">
            Admin
          </Link>
          .
        </p>
      )}
      {compError && <p className="text-sm text-rate-bad">Défis indisponibles : {compError}</p>}

      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">Palmarès des défis terminés</h2>
          {finished.map((c) => (
            <CompetitionCard key={c.id} c={c} rows={competitionBoard(reports, c)} admin={!!admin} onDeleted={reloadComps} podiumOnly />
          ))}
        </section>
      )}
      <button className="btn-ghost" onClick={reloadReports}>
        Actualiser
      </button>
    </div>
  );
}

function CompetitionCard({ c, rows, admin, onDeleted, podiumOnly = false }: { c: Competition; rows: RiderScore[]; admin: boolean; onDeleted: () => void; podiumOnly?: boolean }) {
  const today = todayIso();
  const status = competitionStatus(c, today);
  const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <section className={`card overflow-hidden ${status === 'en cours' ? 'ring-2 ring-lemon-400' : ''}`}>
      <div className={`flex flex-wrap items-center gap-2 px-4 py-3 ${status === 'en cours' ? 'bg-gradient-to-r from-lemon-300/70 to-lime-300/40' : 'bg-mint-50'}`}>
        <span className="chip bg-night text-white">{status === 'en cours' ? '🔥 Défi en cours' : status === 'à venir' ? '⏳ À venir' : '🏁 Terminé'}</span>
        <h3 className="flex-1 font-display text-lg font-extrabold">{c.title}</h3>
        {admin && c.id != null && (
          <button
            className="text-rate-bad"
            aria-label="Supprimer le défi"
            onClick={async () => {
              const s = loadAdminSession();
              if (s && confirm(`Supprimer le défi « ${c.title} » ?`)) {
                await deleteCompetition(c.id as number, s).catch(() => undefined);
                onDeleted();
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="p-4">
        <p className="mb-3 text-sm text-ink-700">
          {METRIC_META[c.metric].desc} · du {fmtDate(c.starts_on)} au {fmtDate(c.ends_on)}
          {c.spot_id && ` · ${SPOT_BY_ID[c.spot_id]?.shortName ?? c.spot_id}`}
          {c.discipline && ` · ${c.discipline === 'windsurf' ? 'planche à voile' : 'wing foil'}`}
          {c.description && <span className="mt-1 block text-ink-800">{c.description}</span>}
        </p>
        {status !== 'à venir' && <Board rows={rows} metric={c.metric} limit={podiumOnly ? 3 : 10} />}
      </div>
    </section>
  );
}

function NewCompetition({ onCreated }: { onCreated: () => void }) {
  const today = todayIso();
  const [c, setC] = useState<Competition>({
    title: '',
    metric: 'distance',
    spot_id: null,
    discipline: null,
    starts_on: today,
    ends_on: daysAgo(-7),
    description: '',
  });
  const [msg, setMsg] = useState<string | null>(null);
  const set = (p: Partial<Competition>) => setC((x) => ({ ...x, ...p }));
  return (
    <section className="card card-pad">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
        <Plus className="h-5 w-5" /> Nouveau défi (admin)
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="label">Titre</span>
          <input className="input mt-1" placeholder="ex. Le plus de bornes à Leucate cette semaine" value={c.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Critère</span>
          <select className="input mt-1" value={c.metric} onChange={(e) => set({ metric: e.target.value as CompetitionMetric })}>
            {(Object.keys(METRIC_META) as CompetitionMetric[]).map((k) => (
              <option key={k} value={k}>
                {METRIC_META[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Spot</span>
          <select className="input mt-1" value={c.spot_id ?? ''} onChange={(e) => set({ spot_id: e.target.value || null })}>
            <option value="">Tous les spots</option>
            {SPOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Discipline</span>
          <select className="input mt-1" value={c.discipline ?? ''} onChange={(e) => set({ discipline: (e.target.value || null) as Competition['discipline'] })}>
            <option value="">Toutes</option>
            <option value="windsurf">Planche à voile</option>
            <option value="wingfoil">Wing foil</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Début</span>
          <input type="date" className="input mt-1" value={c.starts_on} onChange={(e) => set({ starts_on: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Fin (incluse)</span>
          <input type="date" className="input mt-1" value={c.ends_on} onChange={(e) => set({ ends_on: e.target.value })} />
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="label">Description / lot (facultatif)</span>
          <input className="input mt-1" placeholder="ex. Le gagnant remporte la tournée de mojitos 🍹" value={c.description} maxLength={200} onChange={(e) => set({ description: e.target.value })} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="btn-primary"
          disabled={!c.title.trim() || c.ends_on < c.starts_on}
          onClick={async () => {
            const s = loadAdminSession();
            if (!s) return setMsg('Connectez-vous dans Admin.');
            try {
              await addCompetition({ ...c, title: c.title.trim() }, s);
              setMsg('Défi créé !');
              set({ title: '', description: '' });
              onCreated();
            } catch (e) {
              setMsg((e as Error).message);
            }
          }}
        >
          Créer le défi
        </button>
        {msg && <span className="text-sm font-bold text-mint-700">{msg}</span>}
      </div>
    </section>
  );
}
