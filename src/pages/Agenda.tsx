import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus, MapPin, Trash2, UserPlus } from 'lucide-react';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import {
  addEvent,
  addSignup,
  backendEnabled,
  cancelSignup,
  deleteEvent,
  isMine,
  listEvents,
  listSignups,
  loadAdminSession,
  saveAuthor,
  savedAuthor,
  type ClubEvent,
  type EventKind,
  type EventSignup,
} from '../services/backend';
import { isoDay } from '../hooks/useTrips';

const KIND_META: Record<EventKind, { emoji: string; color: string }> = {
  sortie: { emoji: '🏄', color: '#16A038' },
  compétition: { emoji: '🏆', color: '#E58A1F' },
  formation: { emoji: '🎓', color: '#2F6FDE' },
  soirée: { emoji: '🍹', color: '#8E44AD' },
  autre: { emoji: '📌', color: '#5B6B60' },
};

const fmtDate = (d: string, withYear = false) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) });

function daysUntil(d: string): number {
  return Math.round((new Date(`${d}T12:00:00`).getTime() - new Date(`${isoDay(0)}T12:00:00`).getTime()) / 86400000);
}

/** Fichier .ics pour ajouter l'événement à l'agenda du téléphone. */
function downloadIcs(e: ClubEvent) {
  const end = new Date(`${e.ends_on}T12:00:00`);
  end.setDate(end.getDate() + 1);
  const d = (s: string) => s.replace(/-/g, '');
  const endStr = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}${String(end.getDate()).padStart(2, '0')}`;
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mojito Windsurf Club//FR',
    'BEGIN:VEVENT',
    `UID:mwc-event-${e.id}@mojito-windsurf-club`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d(e.starts_on)}`,
    `DTEND;VALUE=DATE:${endStr}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `DESCRIPTION:${esc(e.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mojito-evenement.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SignupForm({ eventId, onDone }: { eventId: number; onDone: () => void }) {
  const [author, setAuthor] = useState(savedAuthor());
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="label">Prénom</span>
        <input className="input mt-1 !w-40" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={40} />
      </label>
      <label className="block min-w-[180px] flex-1">
        <span className="label">Message (facultatif)</span>
        <input className="input mt-1" placeholder="ex. j’arrive le 18, 2 places dans ma voiture" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={200} />
      </label>
      <button
        className="btn-primary !py-2"
        disabled={busy}
        onClick={async () => {
          if (!author.trim()) return setMsg('Indiquez votre prénom.');
          setBusy(true);
          setMsg(null);
          try {
            await addSignup({ event_id: eventId, author: author.trim().slice(0, 40), comment: comment.trim().slice(0, 200) });
            saveAuthor(author);
            setComment('');
            onDone();
          } catch (e) {
            setMsg(`Inscription impossible : ${(e as Error).message}`);
          } finally {
            setBusy(false);
          }
        }}
      >
        <UserPlus className="h-4 w-4" /> Je m’inscris
      </button>
      {msg && <p className="w-full text-sm text-rate-bad">{msg}</p>}
    </div>
  );
}

function AdminEventForm({ onDone }: { onDone: () => void }) {
  const admin = loadAdminSession();
  const [e, setE] = useState<ClubEvent>({ title: '', kind: 'sortie', starts_on: isoDay(7), ends_on: isoDay(7), location: '', spot_id: null, description: '' });
  const [msg, setMsg] = useState<string | null>(null);
  if (!admin) return null;
  const set = (p: Partial<ClubEvent>) => setE((x) => ({ ...x, ...p }));
  return (
    <section className="card card-pad">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold">
        <CalendarPlus className="h-5 w-5 text-mint-600" /> Nouvel événement (admin)
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className="label">Titre</span>
          <input className="input mt-1" value={e.title} onChange={(x) => set({ title: x.target.value })} maxLength={100} />
        </label>
        <label className="block">
          <span className="label">Type</span>
          <select className="input mt-1" value={e.kind} onChange={(x) => set({ kind: x.target.value as EventKind })}>
            {(Object.keys(KIND_META) as EventKind[]).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Du</span>
          <input type="date" className="input mt-1" value={e.starts_on} onChange={(x) => set({ starts_on: x.target.value, ends_on: x.target.value > e.ends_on ? x.target.value : e.ends_on })} />
        </label>
        <label className="block">
          <span className="label">Au</span>
          <input type="date" className="input mt-1" value={e.ends_on} min={e.starts_on} onChange={(x) => set({ ends_on: x.target.value })} />
        </label>
        <label className="block">
          <span className="label">Spot (facultatif)</span>
          <select className="input mt-1" value={e.spot_id ?? ''} onChange={(x) => set({ spot_id: x.target.value || null })}>
            <option value="">—</option>
            {SPOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="label">Lieu</span>
          <input className="input mt-1" placeholder="ex. Leucate (11)" value={e.location} onChange={(x) => set({ location: x.target.value })} maxLength={80} />
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="label">Description</span>
          <textarea className="input mt-1 min-h-[80px]" value={e.description} onChange={(x) => set({ description: x.target.value })} maxLength={1000} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="btn-primary"
          onClick={async () => {
            if (!e.title.trim()) return setMsg('Titre obligatoire.');
            try {
              await addEvent({ ...e, title: e.title.trim() }, admin);
              setMsg('Événement publié.');
              set({ title: '', description: '' });
              onDone();
            } catch (err) {
              setMsg(`Erreur : ${(err as Error).message}`);
            }
          }}
        >
          Publier
        </button>
        {msg && <span className="text-sm font-bold text-mint-700">{msg}</span>}
      </div>
    </section>
  );
}

export function Agenda() {
  const admin = loadAdminSession();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [signups, setSignups] = useState<EventSignup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openSignup, setOpenSignup] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);

  const reload = useCallback(async () => {
    if (!backendEnabled) return;
    try {
      const [e, s] = await Promise.all([listEvents(), listSignups()]);
      setEvents(e);
      setSignups(s);
      setError(null);
    } catch (err) {
      const m = (err as Error).message;
      setError(/events|signups/.test(m) ? 'La base n’est pas encore à jour : un admin doit relancer le script supabase/schema.sql.' : m);
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);

  const today = isoDay(0);
  const upcoming = useMemo(() => events.filter((e) => e.ends_on >= today), [events, today]);
  const past = useMemo(() => events.filter((e) => e.ends_on < today).reverse(), [events, today]);
  const list = showPast ? past : upcoming;

  return (
    <div className="space-y-5">
      <section>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <CalendarDays className="h-7 w-7 text-mint-600" /> Agenda du club
        </h1>
        <p className="max-w-2xl text-sm text-ink-700">Sorties, compétitions, formations et soirées du club. Inscrivez-vous en un clic et ajoutez l’événement à votre agenda.</p>
      </section>

      {!backendEnabled ? (
        <div className="card card-pad text-sm">Fonction disponible une fois la base Supabase activée (voir le README).</div>
      ) : (
        <>
          <AdminEventForm onDone={reload} />
          <div className="flex gap-2">
            <button className={`chip border ${!showPast ? 'border-mint-500 bg-mint-600 text-white' : 'border-mint-200 bg-cream-50'}`} onClick={() => setShowPast(false)}>
              À venir ({upcoming.length})
            </button>
            <button className={`chip border ${showPast ? 'border-mint-500 bg-mint-600 text-white' : 'border-mint-200 bg-cream-50'}`} onClick={() => setShowPast(true)}>
              Passés ({past.length})
            </button>
          </div>
          {error && <p className="text-sm text-rate-bad">{error}</p>}
          {!loaded && <div className="skeleton h-32" />}
          {loaded && !error && !list.length && <p className="text-sm text-ink-700">{showPast ? 'Aucun événement passé.' : 'Aucun événement prévu pour le moment.'}</p>}
          {list.map((e) => {
            const subs = signups.filter((s) => s.event_id === e.id);
            const k = KIND_META[e.kind] ?? KIND_META.autre;
            const n = daysUntil(e.starts_on);
            const ongoing = e.starts_on <= today && e.ends_on >= today;
            const multiYear = e.starts_on.slice(0, 4) !== String(new Date().getFullYear());
            return (
              <article key={e.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 bg-[#050806] px-5 py-4 text-white">
                  <span className="text-3xl" aria-hidden="true">
                    {k.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-brand text-xl leading-tight text-[#3FE06A] sm:text-2xl">{e.title}</h2>
                    <p className="text-sm text-white/80">
                      {e.starts_on === e.ends_on ? fmtDate(e.starts_on, multiYear) : `du ${fmtDate(e.starts_on)} au ${fmtDate(e.ends_on, multiYear)}`}
                    </p>
                  </div>
                  {!showPast && (
                    <span className="rounded-full bg-[#3FE06A] px-3 py-1 text-sm font-extrabold text-black">
                      {ongoing ? 'En cours !' : n === 1 ? 'Demain' : `J-${n}`}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="chip text-white" style={{ background: k.color }}>
                      {e.kind}
                    </span>
                    {e.location && (
                      <span className="inline-flex items-center gap-1 text-ink-700">
                        <MapPin className="h-4 w-4" /> {e.location}
                      </span>
                    )}
                    {e.spot_id && SPOT_BY_ID[e.spot_id] && (
                      <Link to={`/conditions/${e.spot_id}`} className="font-bold text-mint-700 hover:underline">
                        Conditions à {SPOT_BY_ID[e.spot_id].shortName} →
                      </Link>
                    )}
                  </p>
                  {e.description && <p className="mt-2 whitespace-pre-line text-sm text-ink-800">{e.description}</p>}

                  <div className="mt-4">
                    <p className="label">
                      {subs.length} inscrit{subs.length > 1 ? 's' : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {subs.map((s) => (
                        <span key={s.id} className="chip bg-mint-50 text-ink-900" title={s.comment}>
                          🤙 {s.author}
                          {s.comment && <span className="font-normal text-ink-700"> · {s.comment}</span>}
                          {(isMine('signups', s.id) || admin) && s.id != null && (
                            <button
                              className="ml-1 text-rate-bad"
                              aria-label={`Annuler l’inscription de ${s.author}`}
                              onClick={async () => {
                                if (confirm('Annuler cette inscription ?')) {
                                  await cancelSignup(s.id as number, admin).catch(() => undefined);
                                  reload();
                                }
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!showPast && e.id != null && (
                      <button className="btn-primary !py-2" onClick={() => setOpenSignup(openSignup === e.id ? null : (e.id as number))}>
                        <UserPlus className="h-4 w-4" /> S’inscrire
                      </button>
                    )}
                    <button className="btn-ghost !py-2" onClick={() => downloadIcs(e)}>
                      <CalendarPlus className="h-4 w-4" /> Ajouter à mon agenda
                    </button>
                    {admin && e.id != null && (
                      <button
                        className="btn-ghost !py-2 text-rate-bad"
                        onClick={async () => {
                          if (confirm(`Supprimer « ${e.title} » et ses inscriptions ?`)) {
                            await deleteEvent(e.id as number, admin).catch(() => undefined);
                            reload();
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </button>
                    )}
                  </div>
                  {openSignup === e.id && e.id != null && (
                    <SignupForm
                      eventId={e.id}
                      onDone={() => {
                        setOpenSignup(null);
                        reload();
                      }}
                    />
                  )}
                </div>
              </article>
            );
          })}
        </>
      )}
    </div>
  );
}
