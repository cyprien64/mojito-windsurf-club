import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Hand, Trash2 } from 'lucide-react';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import { useApp } from '../context/AppContext';
import { addTrip, backendEnabled, cancelTrip, isMine, loadAdminSession, saveAuthor, savedAuthor, type Trip } from '../services/backend';
import { isoDay, useTrips } from '../hooks/useTrips';
import { RatingBadge } from '../components/RatingBadge';
import { levelFromScore } from '../lib/scoring';
import { dayLabel } from '../lib/format';

const DISC_LABEL: Record<Trip['discipline'], string> = { windsurf: '🏄 windsurf', wingfoil: '🪁 wing', 'les deux': '🤙 windsurf ou wing' };

/** Meilleure note horaire prévue pour ce spot, ce jour, sur la plage horaire choisie. */
export function useDayScore() {
  const { evaluations } = useApp();
  return (spotId: string, day: string, from: number, to: number): number | null => {
    const ev = evaluations[spotId];
    if (!ev) return null;
    const hs = ev.hours.filter((h) => h.time.startsWith(day) && Number(h.time.slice(11, 13)) >= from && Number(h.time.slice(11, 13)) < to && h.speed != null);
    if (!hs.length) return null;
    return Math.round(Math.max(...hs.map((h) => h.score)));
  };
}

/** Liste compacte des sorties (réutilisée sur la page d'un spot). */
export function TripList({ trips, onChange, showSpot = true }: { trips: Trip[]; onChange: () => void; showSpot?: boolean }) {
  const admin = loadAdminSession();
  const score = useDayScore();
  const byDay = useMemo(() => {
    const m = new Map<string, Trip[]>();
    for (const t of trips) {
      if (!m.has(t.day)) m.set(t.day, []);
      m.get(t.day)!.push(t);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [trips]);
  if (!trips.length) return <p className="text-sm text-ink-700">Personne n’a encore prévu de sortie.</p>;
  const today = isoDay(0);
  return (
    <div className="space-y-4">
      {byDay.map(([day, list]) => (
        <div key={day}>
          <p className="label mb-1">{day === today ? 'Aujourd’hui' : day === isoDay(1) ? 'Demain' : dayLabel(`${day}T12:00`, true)}</p>
          <ul className="divide-y divide-mint-100 rounded-xl border border-mint-100 bg-cream-50/70">
            {list.map((t) => {
              const sc = score(t.spot_id, t.day, t.from_hour, t.to_hour);
              const canCancel = isMine('trips', t.id) || !!admin;
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <strong>{t.author}</strong>
                  {showSpot && (
                    <Link to={`/conditions/${t.spot_id}`} className="font-bold text-mint-700 hover:underline">
                      {SPOT_BY_ID[t.spot_id]?.shortName ?? t.spot_id}
                    </Link>
                  )}
                  <span className="tabular text-ink-700">
                    {t.from_hour} h – {t.to_hour} h
                  </span>
                  <span className="text-ink-700">{DISC_LABEL[t.discipline]}</span>
                  {t.carpool === 'propose' && (
                    <span className="chip bg-mint-100 text-mint-800">
                      <Car className="h-3.5 w-3.5" /> propose {t.seats ?? ''} place{(t.seats ?? 0) > 1 ? 's' : ''}
                      {t.departure && ` depuis ${t.departure}`}
                    </span>
                  )}
                  {t.carpool === 'cherche' && (
                    <span className="chip bg-lemon-300/60 text-ink-900">
                      <Hand className="h-3.5 w-3.5" /> cherche une place{t.departure && ` depuis ${t.departure}`}
                    </span>
                  )}
                  {sc != null && <RatingBadge level={levelFromScore(sc)} size="sm" label={`prévision ${sc}/100`} />}
                  {canCancel && t.id != null && (
                    <button
                      className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-rate-bad"
                      onClick={async () => {
                        if (confirm('Annuler cette sortie ?')) {
                          await cancelTrip(t.id as number, admin).catch(() => undefined);
                          onChange();
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Annuler
                    </button>
                  )}
                  {t.comment && <p className="w-full text-xs text-ink-800">{t.comment}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Formulaire « J'y vais ». */
export function TripForm({ defaultSpot, onDone }: { defaultSpot: string; onDone: () => void }) {
  const [t, setT] = useState<Trip>({
    author: savedAuthor(),
    spot_id: defaultSpot,
    day: isoDay(0),
    from_hour: 13,
    to_hour: 18,
    discipline: 'windsurf',
    carpool: '',
    seats: null,
    departure: '',
    comment: '',
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const score = useDayScore()(t.spot_id, t.day, t.from_hour, t.to_hour);
  const set = (p: Partial<Trip>) => setT((x) => ({ ...x, ...p }));
  const days = Array.from({ length: 14 }, (_, i) => isoDay(i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const submit = async () => {
    if (!t.author.trim()) return setMsg('Indiquez votre prénom.');
    if (t.to_hour <= t.from_hour) return setMsg('L’heure de fin doit être après l’heure de début.');
    setBusy(true);
    setMsg(null);
    try {
      await addTrip({
        ...t,
        author: t.author.trim().slice(0, 40),
        departure: t.departure.trim().slice(0, 40),
        comment: t.comment.trim().slice(0, 200),
        seats: t.carpool === 'propose' ? t.seats ?? 1 : null,
      });
      saveAuthor(t.author);
      setMsg('C’est noté, le club est prévenu !');
      set({ comment: '' });
      onDone();
    } catch (e) {
      setMsg(`Envoi impossible : ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="label">Prénom</span>
          <input className="input mt-1" value={t.author} onChange={(e) => set({ author: e.target.value })} maxLength={40} />
        </label>
        <label className="block">
          <span className="label">Spot</span>
          <select className="input mt-1" value={t.spot_id} onChange={(e) => set({ spot_id: e.target.value })}>
            {SPOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Jour</span>
          <select className="input mt-1" value={t.day} onChange={(e) => set({ day: e.target.value })}>
            {days.map((d, i) => (
              <option key={d} value={d}>
                {i === 0 ? 'Aujourd’hui' : i === 1 ? 'Demain' : dayLabel(`${d}T12:00`, true)}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="label">Horaires</span>
          <div className="mt-1 flex items-center gap-1.5">
            <select className="input" value={t.from_hour} onChange={(e) => set({ from_hour: Number(e.target.value) })} aria-label="Heure d’arrivée">
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h} h
                </option>
              ))}
            </select>
            <span>→</span>
            <select className="input" value={t.to_hour} onChange={(e) => set({ to_hour: Number(e.target.value) })} aria-label="Heure de départ">
              {hours.map((h) => (
                <option key={h + 1} value={h + 1}>
                  {h + 1} h
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="block">
          <span className="label">Discipline</span>
          <select className="input mt-1" value={t.discipline} onChange={(e) => set({ discipline: e.target.value as Trip['discipline'] })}>
            <option value="windsurf">Planche à voile</option>
            <option value="wingfoil">Wing foil</option>
            <option value="les deux">Les deux</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Covoiturage</span>
          <select className="input mt-1" value={t.carpool} onChange={(e) => set({ carpool: e.target.value as Trip['carpool'] })}>
            <option value="">Non</option>
            <option value="propose">Je propose des places</option>
            <option value="cherche">Je cherche une place</option>
          </select>
        </label>
        {t.carpool === 'propose' && (
          <label className="block">
            <span className="label">Places libres</span>
            <select className="input mt-1" value={t.seats ?? 1} onChange={(e) => set({ seats: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        {t.carpool !== '' && (
          <label className="block">
            <span className="label">Départ de (ville)</span>
            <input className="input mt-1" placeholder="ex. Pau" value={t.departure} onChange={(e) => set({ departure: e.target.value })} maxLength={40} />
          </label>
        )}
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className="label">Message (facultatif)</span>
          <input className="input mt-1" placeholder="ex. j’emmène la 5.6 et le foil, RDV au parking" value={t.comment} onChange={(e) => set({ comment: e.target.value })} maxLength={200} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={submit} disabled={busy}>
          {busy ? 'Envoi…' : 'J’y vais !'}
        </button>
        {score != null && (
          <span className="flex items-center gap-2 text-sm">
            Prévision sur ce créneau : <RatingBadge level={levelFromScore(score)} size="sm" label={`${score}/100`} />
          </span>
        )}
        {msg && <span className="text-sm font-bold text-mint-700">{msg}</span>}
      </div>
      <p className="mt-2 text-[11px] text-ink-700/70">
        Visible par tous les visiteurs du site. Seul ce téléphone (ou un admin) peut annuler la sortie. Pour le covoiturage, échangez vos numéros entre vous
        (ne les publiez pas ici).
      </p>
    </div>
  );
}

export function WhoGoes() {
  const { spotId } = useApp();
  const { trips, error, reload } = useTrips();
  const [spotFilter, setSpotFilter] = useState('*');
  const list = trips.filter((t) => spotFilter === '*' || t.spot_id === spotFilter);
  const offers = trips.filter((t) => t.carpool === 'propose').reduce((a, t) => a + (t.seats ?? 0), 0);
  const seeks = trips.filter((t) => t.carpool === 'cherche').length;

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">🙋 Qui y va ?</h1>
        <p className="max-w-2xl text-sm text-ink-700">
          Dites au club où et quand vous comptez naviguer : vous retrouvez les autres sur l’eau et vous organisez le covoiturage. La note de prévision du créneau
          s’affiche à côté de chaque sortie (7 prochains jours).
        </p>
      </section>
      {!backendEnabled ? (
        <div className="card card-pad text-sm">Fonction disponible une fois la base Supabase activée (voir le README).</div>
      ) : (
        <>
          <section className="card card-pad">
            <h2 className="mb-3 font-display text-lg font-extrabold">J’y vais</h2>
            <TripForm defaultSpot={spotId} onDone={reload} />
          </section>
          <section className="card card-pad">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-extrabold">Sorties prévues</h2>
              <div className="flex flex-wrap items-center gap-2">
                {(offers > 0 || seeks > 0) && (
                  <span className="chip bg-mint-50 text-ink-800">
                    🚗 {offers} place{offers > 1 ? 's' : ''} proposée{offers > 1 ? 's' : ''} · {seeks} demande{seeks > 1 ? 's' : ''}
                  </span>
                )}
                <select className="input !w-auto !py-1.5" value={spotFilter} onChange={(e) => setSpotFilter(e.target.value)} aria-label="Filtrer par spot">
                  <option value="*">Tous les spots</option>
                  {SPOTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error ? <p className="text-sm text-rate-bad">{error}</p> : <TripList trips={list} onChange={reload} />}
          </section>
        </>
      )}
    </div>
  );
}

/** Bloc « Qui y va ? » sur la page d'un spot. */
export function SpotTripsCard({ spotId }: { spotId: string }) {
  const { trips, error, reload } = useTrips();
  const [open, setOpen] = useState(false);
  if (!backendEnabled) return null;
  const here = trips.filter((t) => t.spot_id === spotId);
  return (
    <section className="card card-pad">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold">🙋 Qui y va ?</h2>
        <button className="btn-ghost !py-1.5" onClick={() => setOpen((v) => !v)}>
          {open ? 'Fermer' : 'J’y vais aussi'}
        </button>
      </div>
      {open && (
        <div className="mb-4 rounded-xl border border-mint-100 p-3">
          <TripForm
            defaultSpot={spotId}
            onDone={() => {
              reload();
              setOpen(false);
            }}
          />
        </div>
      )}
      {error ? <p className="text-sm text-rate-bad">{error}</p> : <TripList trips={here} onChange={reload} showSpot={false} />}
      <Link to="/qui-y-va" className="mt-2 inline-block text-sm font-bold text-mint-700 hover:underline">
        Toutes les sorties du club →
      </Link>
    </section>
  );
}
