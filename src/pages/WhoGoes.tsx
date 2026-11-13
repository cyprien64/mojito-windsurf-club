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

/** Marqueur d'un passager dans le commentaire : « 🚗 avec Paul ». */
const PASSENGER = '🚗 avec ';
const passengerOf = (t: Trip) => (t.comment.startsWith(PASSENGER) ? t.comment.slice(PASSENGER.length).trim() : null);

/** Demande le prénom une seule fois (mémorisé ensuite sur le téléphone). */
function askName(): string | null {
  const saved = savedAuthor();
  if (saved) return saved;
  const n = window.prompt('Votre prénom (il sera mémorisé sur ce téléphone) :')?.trim();
  if (!n) return null;
  saveAuthor(n);
  return n.slice(0, 40);
}

interface Group {
  key: string;
  spot: string;
  day: string;
  trips: Trip[];
  from: number;
  to: number;
}

/**
 * Sorties regroupées par spot et par jour : on voit d'un coup d'œil qui y va,
 * et on rejoint le groupe en un geste (« Je viens aussi » / « Je monte avec… »).
 */
export function TripList({ trips, onChange, showSpot = true }: { trips: Trip[]; onChange: () => void; showSpot?: boolean }) {
  const admin = loadAdminSession();
  const score = useDayScore();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const me = savedAuthor().toLowerCase();

  const groups = useMemo(() => {
    const m = new Map<string, Group>();
    for (const t of trips) {
      const key = `${t.day}|${t.spot_id}`;
      const g = m.get(key) ?? { key, spot: t.spot_id, day: t.day, trips: [], from: 24, to: 0 };
      g.trips.push(t);
      g.from = Math.min(g.from, t.from_hour);
      g.to = Math.max(g.to, t.to_hour);
      m.set(key, g);
    }
    return [...m.values()].sort((a, b) => a.day.localeCompare(b.day) || b.trips.length - a.trips.length);
  }, [trips]);

  if (!trips.length) return <p className="text-sm text-ink-700">Personne n’a encore prévu de sortie.</p>;
  const today = isoDay(0);
  const dayName = (d: string) => (d === today ? 'Aujourd’hui' : d === isoDay(1) ? 'Demain' : dayLabel(`${d}T12:00`, true));

  const join = async (g: Group, base: Trip, driver?: Trip) => {
    const name = askName();
    if (!name) return;
    setBusy(g.key + (driver?.id ?? ''));
    setMsg(null);
    try {
      await addTrip({
        author: name,
        spot_id: g.spot,
        day: g.day,
        from_hour: base.from_hour,
        to_hour: base.to_hour,
        discipline: base.discipline,
        carpool: driver ? 'cherche' : '',
        seats: null,
        departure: driver?.departure ?? '',
        comment: driver ? `${PASSENGER}${driver.author}` : '',
      });
      setMsg(driver ? `C’est noté : vous montez avec ${driver.author}. Échangez vos numéros pour le rendez-vous.` : 'C’est noté, à tout à l’heure sur l’eau !');
      onChange();
    } catch (e) {
      setMsg(`Impossible : ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {msg && <p className="rounded-xl bg-mint-100 px-3 py-2 text-sm font-bold text-mint-800">{msg}</p>}
      {groups.map((g) => {
        const sc = score(g.spot, g.day, g.from, g.to);
        const alreadyIn = !!me && g.trips.some((t) => t.author.toLowerCase() === me);
        const base = g.trips[0];
        const drivers = g.trips.filter((t) => t.carpool === 'propose');
        return (
          <article key={g.key} className="rounded-2xl border border-mint-200 bg-cream-50/80 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-base font-extrabold">
                {dayName(g.day)}
                {showSpot && (
                  <>
                    {' · '}
                    <Link to={`/conditions/${g.spot}`} className="text-mint-700 hover:underline">
                      {SPOT_BY_ID[g.spot]?.shortName ?? g.spot}
                    </Link>
                  </>
                )}
              </p>
              <span className="tabular text-sm text-ink-700">
                {g.from} h – {g.to} h
              </span>
              {sc != null && <RatingBadge level={levelFromScore(sc)} size="sm" label={`prévision ${sc}/100`} />}
              <span className="chip ml-auto bg-mint-600 text-white">
                {g.trips.length} rider{g.trips.length > 1 ? 's' : ''}
              </span>
            </div>

            <ul className="mt-2 space-y-1.5">
              {g.trips.map((t) => {
                const mine = isMine('trips', t.id);
                const passengers = g.trips.filter((p) => passengerOf(p)?.toLowerCase() === t.author.toLowerCase()).length;
                const left = t.carpool === 'propose' ? Math.max(0, (t.seats ?? 0) - passengers) : 0;
                const isPassenger = passengerOf(t);
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <strong>{t.author}</strong>
                    <span className="text-xs text-ink-700">
                      {t.from_hour} h – {t.to_hour} h · {DISC_LABEL[t.discipline]}
                    </span>
                    {t.carpool === 'propose' && (
                      <span className="chip bg-mint-100 text-mint-800">
                        <Car className="h-3.5 w-3.5" /> {left} place{left > 1 ? 's' : ''} libre{left > 1 ? 's' : ''}
                        {t.departure && ` depuis ${t.departure}`}
                      </span>
                    )}
                    {t.carpool === 'cherche' && !isPassenger && (
                      <span className="chip bg-lemon-300/60 text-ink-900">
                        <Hand className="h-3.5 w-3.5" /> cherche une place{t.departure && ` depuis ${t.departure}`}
                      </span>
                    )}
                    {isPassenger && <span className="chip bg-cream-200 text-ink-800">🚗 monte avec {isPassenger}</span>}
                    {t.carpool === 'propose' && left > 0 && !mine && !(me && t.author.toLowerCase() === me) && (
                      <button
                        className="btn-ghost !px-2.5 !py-1 text-xs"
                        disabled={busy !== null}
                        onClick={() => join(g, t, t)}
                      >
                        🚗 Je monte avec {t.author}
                      </button>
                    )}
                    {(mine || admin) && t.id != null && (
                      <button
                        className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-rate-bad"
                        onClick={async () => {
                          if (confirm(mine ? 'Annuler ma participation ?' : `Supprimer la sortie de ${t.author} ?`)) {
                            await cancelTrip(t.id as number, admin).catch(() => undefined);
                            onChange();
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {mine ? 'Je ne viens plus' : 'Supprimer'}
                      </button>
                    )}
                    {t.comment && !isPassenger && <p className="w-full pl-1 text-xs text-ink-800">« {t.comment} »</p>}
                  </li>
                );
              })}
            </ul>

            <div className="mt-3">
              {alreadyIn ? (
                <p className="text-sm font-bold text-mint-700">✅ Vous en êtes !</p>
              ) : (
                <button className="btn-primary w-full !py-2.5 sm:w-auto" disabled={busy !== null} onClick={() => join(g, base)}>
                  🤙 {busy === g.key ? 'Envoi…' : `Je viens aussi (${base.from_hour} h – ${base.to_hour} h)`}
                </button>
              )}
              {drivers.length === 0 && !alreadyIn && <p className="mt-1 text-[11px] text-ink-700/70">Un seul geste : votre prénom est mémorisé sur ce téléphone.</p>}
            </div>
          </article>
        );
      })}
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
          {open ? 'Fermer' : here.length ? 'Autre jour / horaire' : 'J’y vais'}
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
