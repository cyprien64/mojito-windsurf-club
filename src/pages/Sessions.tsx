import { lazy, Suspense, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUp, Route as RouteIcon, Star, Users, Waves } from 'lucide-react';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import { useApp } from '../context/AppContext';
import { addReport, backendEnabled, deleteReport, getTrack, loadAdminSession, type Feel, type SessionReport } from '../services/backend';
import { distKm, parseGpx, summarizeGpx, type GpxSummary } from '../lib/gpx';

const TrackMap = lazy(() => import('../components/TrackMap'));

/** Heure locale de Paris « AAAA-MM-JJTHH:00 » (format des séries Open-Meteo). */
function parisHour(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:00`;
}

/** Tracé d'une session publiée, chargé à la demande. */
function TrackToggle({ id }: { id: number }) {
  const [track, setTrack] = useState<[number, number][] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'open' | 'error'>('idle');
  return (
    <div className="mt-1">
      <button
        className="inline-flex items-center gap-1 text-xs font-bold text-mint-700"
        onClick={async () => {
          if (state === 'open') return setState('idle');
          setState('loading');
          try {
            const t = track ?? (await getTrack(id));
            setTrack(t);
            setState(t && t.length > 1 ? 'open' : 'error');
          } catch {
            setState('error');
          }
        }}
      >
        <RouteIcon className="h-3.5 w-3.5" /> {state === 'open' ? 'Masquer le tracé' : state === 'loading' ? 'Chargement…' : 'Voir le tracé GPS'}
      </button>
      {state === 'error' && <span className="ml-2 text-xs text-rate-bad">Tracé indisponible.</span>}
      {state === 'open' && track && (
        <Suspense fallback={<div className="skeleton mt-2 h-56" />}>
          <TrackMap track={track} className="mt-2 h-56" />
        </Suspense>
      )}
    </div>
  );
}
import { clubStats } from '../lib/clubStats';
import { timeAgo } from '../lib/format';

const FEELS: Feel[] = ['trop faible', 'bon', 'fort', 'trop fort'];
const ON_WATER_HOURS = 3;

export function isOnWater(r: SessionReport) {
  return r.on_water && !!r.created_at && Date.now() - new Date(r.created_at).getTime() < ON_WATER_HOURS * 3600 * 1000;
}

function NotEnabled() {
  return (
    <div className="card card-pad text-sm">
      <p className="font-bold">Fonction pas encore activée</p>
      <p className="mt-1 text-ink-700">
        Les retours de session ont besoin d’une petite base de données gratuite (Supabase). Un admin doit créer le projet et renseigner deux variables dans le
        dépôt GitHub : la procédure (5 minutes) est dans le README, section « Activer les fonctions communautaires ».
      </p>
    </div>
  );
}

export function Sessions() {
  const { reports, reportsError, reloadReports, evaluations, spotId, rider, weather } = useApp();
  const [gpx, setGpx] = useState<GpxSummary | null>(null);
  const [gpxMsg, setGpxMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<SessionReport>({
    spot_id: spotId,
    author: (() => {
      try {
        return localStorage.getItem('mwc-author') ?? '';
      } catch {
        return '';
      }
    })(),
    discipline: 'windsurf',
    on_water: true,
    feel: 'bon',
    rating: 4,
    sail: rider.sails[0] ?? null,
    board: null,
    wind_kn: null,
    comment: '',
    sail_brand: rider.sailBrand ?? '',
    board_brand: rider.boardBrand ?? '',
    distance_km: null,
    duration_min: null,
    max_speed_kn: null,
  });
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const admin = loadAdminSession();
  const set = (p: Partial<SessionReport>) => setForm((f) => ({ ...f, ...p }));

  const importGpx = async (file: File) => {
    setGpxMsg(null);
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('fichier trop gros (15 Mo max).');
      const sum = summarizeGpx(parseGpx(await file.text()));
      setGpx(sum);
      // Spot le plus proche du départ (moins de 15 km)
      let near: { id: string; d: number } | null = null;
      if (sum.first) for (const sp of SPOTS) {
        const d = distKm(sum.first, sp);
        if (!near || d < near.d) near = { id: sp.id, d };
      }
      if (sum.durationMin != null) {
        setHours(String(Math.floor(sum.durationMin / 60)));
        setMinutes(String(sum.durationMin % 60));
      }
      set({
        distance_km: sum.distanceKm > 0 ? Math.min(250, sum.distanceKm) : null,
        max_speed_kn: sum.maxSpeedKn,
        track: sum.track,
        on_water: false,
        ...(near && near.d < 15 ? { spot_id: near.id } : {}),
      });
      setGpxMsg(`Tracé importé${near && near.d < 15 ? ` · spot détecté : ${SPOT_BY_ID[near.id].shortName}` : ''}. Vérifiez puis publiez.`);
    } catch (e) {
      setGpx(null);
      setGpxMsg(`Import impossible : ${(e as Error).message}`);
    }
  };

  /** Vent du modèle à l'heure de la session GPX (historique 7 j), sinon vent actuel. */
  const windFor = (spot: string): number | null => {
    const w = weather.data?.[spot];
    if (gpx?.start && w) {
      const i = w.hourly.time.indexOf(parisHour(gpx.start));
      if (i >= 0 && w.hourly.windSpeed[i] != null) return Math.round(w.hourly.windSpeed[i] as number);
    }
    const ev = evaluations[spot];
    return ev?.speed != null ? Math.round(ev.speed) : null;
  };

  const submit = async () => {
    if (!form.author.trim()) {
      setMsg('Indiquez votre prénom.');
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      const dur = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
      if (form.distance_km != null && (form.distance_km <= 0 || form.distance_km > 250)) throw new Error('distance invalide (0 à 250 km).');
      if (dur > 720) throw new Error('durée invalide (12 h maximum).');
      if (form.max_speed_kn != null && (form.max_speed_kn <= 0 || form.max_speed_kn > 55)) throw new Error('vitesse max invalide (0 à 55 nds).');
      await addReport({
        ...form,
        author: form.author.trim().slice(0, 40),
        comment: form.comment.slice(0, 500),
        sail_brand: form.sail_brand.trim().slice(0, 60),
        board_brand: form.board_brand.trim().slice(0, 60),
        duration_min: dur > 0 ? dur : null,
        wind_kn: windFor(form.spot_id),
        track: gpx ? form.track ?? null : null,
        // Session importée : datée du début du tracé (pour le classement), jamais dans le futur
        ...(gpx?.start && gpx.start.getTime() < Date.now() ? { created_at: gpx.start.toISOString() } : {}),
      });
      setGpx(null);
      setGpxMsg(null);
      if (fileRef.current) fileRef.current.value = '';
      setHours('');
      setMinutes('');
      try {
        localStorage.setItem('mwc-author', form.author.trim());
      } catch {
        /* ignore */
      }
      setMsg('Merci ! Votre retour est publié.');
      set({ comment: '', distance_km: null, max_speed_kn: null, track: null });
      reloadReports();
    } catch (e) {
      setMsg(`Envoi impossible : ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  const onWater = reports.filter(isOnWater);
  const recent = reports.slice(0, 40);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <Users className="h-7 w-7 text-mint-600" /> Sur l’eau
        </h1>
        <p className="text-sm text-ink-700">
          Dites au club où vous naviguez et comment ça s’est passé. Avec le temps, le site apprend quelle taille de voile ou d’aile le club utilise réellement sur
          chaque spot.
        </p>
      </section>

      {!backendEnabled ? (
        <NotEnabled />
      ) : (
        <>
          <section className="card card-pad">
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold">
              <Waves className="h-5 w-5 text-lagoon-500" /> En ce moment sur l’eau
            </h2>
            {onWater.length ? (
              <div className="flex flex-wrap gap-2">
                {onWater.map((r) => (
                  <span key={r.id} className="chip bg-mint-100 text-ink-900">
                    🏄 {r.author} · {SPOT_BY_ID[r.spot_id]?.shortName ?? r.spot_id} · {r.discipline === 'windsurf' ? 'windsurf' : 'wing'}
                    {r.sail ? ` ${r.sail} m²` : ''} · {r.created_at && timeAgo(new Date(r.created_at).getTime())}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-700">Personne n’a signalé être sur l’eau dans les {ON_WATER_HOURS} dernières heures.</p>
            )}
          </section>

          <section className="card card-pad">
            <h2 className="mb-3 font-display text-lg font-extrabold">J’y suis / j’y étais</h2>
            <div className="mb-4 rounded-xl border border-dashed border-mint-300 bg-mint-50/50 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-ghost cursor-pointer !py-2">
                  <FileUp className="h-4 w-4" /> Importer un fichier GPX
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".gpx,application/gpx+xml,application/xml,text/xml"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) importGpx(f);
                    }}
                  />
                </label>
                <p className="flex-1 text-xs text-ink-700">
                  Montre ou appli GPS (Garmin, Coros, Suunto, Strava, Waterspeed…) : exportez la session en .gpx. Distance, durée, vitesse max et tracé sont remplis
                  automatiquement. Le fichier est lu sur votre téléphone ; seul un tracé simplifié est publié.
                </p>
              </div>
              {gpxMsg && <p className="mt-2 text-sm font-bold text-mint-700">{gpxMsg}</p>}
              {gpx && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-ink-700">
                    {gpx.start && `${gpx.start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · `}
                    {gpx.distanceKm} km
                    {gpx.durationMin != null && ` · ${Math.floor(gpx.durationMin / 60)} h ${String(gpx.durationMin % 60).padStart(2, '0')}`}
                    {gpx.avgSpeedKn != null && ` · moyenne ${gpx.avgSpeedKn} nds`}
                    {gpx.maxSpeedKn != null && ` · pointe ${gpx.maxSpeedKn} nds (10 s)`} · {gpx.points} points
                  </p>
                  <Suspense fallback={<div className="skeleton h-56" />}>
                    <TrackMap track={gpx.track} className="h-56" />
                  </Suspense>
                  <button
                    className="text-xs font-bold text-rate-bad"
                    onClick={() => {
                      setGpx(null);
                      setGpxMsg(null);
                      set({ track: null });
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                  >
                    Retirer le tracé
                  </button>
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className="label">Prénom</span>
                <input className="input mt-1" value={form.author} onChange={(e) => set({ author: e.target.value })} maxLength={40} />
              </label>
              <label className="block">
                <span className="label">Spot</span>
                <select className="input mt-1" value={form.spot_id} onChange={(e) => set({ spot_id: e.target.value })}>
                  {SPOTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Discipline</span>
                <select
                  className="input mt-1"
                  value={form.discipline}
                  onChange={(e) => {
                    const d = e.target.value as SessionReport['discipline'];
                    set({
                      discipline: d,
                      sail_brand: (d === 'windsurf' ? rider.sailBrand : rider.wingBrand) ?? '',
                      board_brand: (d === 'windsurf' ? rider.boardBrand : rider.foilBoardBrand) ?? '',
                    });
                  }}
                >
                  <option value="windsurf">Planche à voile</option>
                  <option value="wingfoil">Wing foil</option>
                </select>
              </label>
              <label className="block">
                <span className="label">{form.discipline === 'windsurf' ? 'Voile (m²)' : 'Aile (m²)'}</span>
                <input
                  className="input mt-1"
                  inputMode="decimal"
                  value={form.sail ?? ''}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(',', '.'));
                    set({ sail: e.target.value === '' || !Number.isFinite(n) ? null : n });
                  }}
                />
              </label>
              <label className="block">
                <span className="label">Planche (L)</span>
                <input
                  className="input mt-1"
                  inputMode="numeric"
                  value={form.board ?? ''}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    set({ board: e.target.value === '' || !Number.isFinite(n) ? null : Math.round(n) });
                  }}
                />
              </label>
              <label className="block">
                <span className="label">{form.discipline === 'windsurf' ? 'Marque / modèle de voile' : 'Marque / modèle d’aile'}</span>
                <input className="input mt-1" placeholder="ex. Duotone E-Pace 6.0" value={form.sail_brand} onChange={(e) => set({ sail_brand: e.target.value })} maxLength={60} />
              </label>
              <label className="block">
                <span className="label">Marque / modèle de planche</span>
                <input className="input mt-1" placeholder="ex. Starboard Carve 131" value={form.board_brand} onChange={(e) => set({ board_brand: e.target.value })} maxLength={60} />
              </label>
              <label className="block">
                <span className="label">Distance (km)</span>
                <input
                  className="input mt-1"
                  inputMode="decimal"
                  value={form.distance_km ?? ''}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(',', '.'));
                    set({ distance_km: e.target.value === '' || !Number.isFinite(n) ? null : Math.round(n * 10) / 10 });
                  }}
                />
              </label>
              <div>
                <span className="label">Durée de la session</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <input className="input text-center" inputMode="numeric" placeholder="h" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} aria-label="Heures" />
                  <span className="font-bold">h</span>
                  <input className="input text-center" inputMode="numeric" placeholder="min" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} aria-label="Minutes" />
                  <span className="font-bold">min</span>
                </div>
              </div>
              <label className="block">
                <span className="label">Vitesse max (nds, GPS / montre)</span>
                <input
                  className="input mt-1"
                  inputMode="decimal"
                  value={form.max_speed_kn ?? ''}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(',', '.'));
                    set({ max_speed_kn: e.target.value === '' || !Number.isFinite(n) ? null : Math.round(n * 10) / 10 });
                  }}
                />
              </label>
              <label className="block">
                <span className="label">Ressenti du vent</span>
                <select className="input mt-1" value={form.feel} onChange={(e) => set({ feel: e.target.value as Feel })}>
                  {FEELS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <div>
                <span className="label">Note de la session</span>
                <div className="mt-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => set({ rating: n })} aria-label={`${n} sur 5`}>
                      <Star className={`h-7 w-7 ${n <= form.rating ? 'fill-lemon-400 text-lemon-500' : 'text-ink-700/30'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold">
                <input type="checkbox" className="h-5 w-5 accent-mint-600" checked={form.on_water} onChange={(e) => set({ on_water: e.target.checked })} />
                Je suis sur l’eau maintenant
              </label>
              <label className="block sm:col-span-2 lg:col-span-3">
                <span className="label">Commentaire</span>
                <textarea className="input mt-1 min-h-[70px]" value={form.comment} onChange={(e) => set({ comment: e.target.value })} maxLength={500} />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className="btn-primary" onClick={submit} disabled={sending}>
                {sending ? 'Envoi…' : 'Publier'}
              </button>
              {msg && <span className="text-sm font-bold text-mint-700">{msg}</span>}
            </div>
            <p className="mt-2 text-[11px] text-ink-700/70">
              Publié pour tous les visiteurs du site. N’indiquez que votre prénom. Distance, durée et vitesse comptent pour le{' '}
              <Link to="/classement" className="underline">
                classement
              </Link>{' '}
              : utilisez toujours le même prénom.
            </p>
          </section>

          <section className="card card-pad">
            <h2 className="mb-2 font-display text-lg font-extrabold">Ce que le club utilise vraiment</h2>
            {SPOTS.map((s) => {
              const st = clubStats(reports, s.id);
              if (!st.length) return null;
              return (
                <div key={s.id} className="mb-3">
                  <p className="font-bold">{s.shortName}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {st.map((b) => (
                      <span key={`${b.discipline}-${b.band[0]}`} className="chip bg-mint-50 text-ink-900">
                        {b.discipline === 'windsurf' ? '🏄' : '🪁'} {b.band[0]}–{b.band[1] >= 60 ? '+' : b.band[1]} nds : {b.medianSize} m² ({b.count} sessions, ★{' '}
                        {b.avgRating.toFixed(1)})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-ink-700">Statistiques affichées à partir de 2 retours par spot et par plage de vent (30 derniers jours).</p>
          </section>

          <section className="card card-pad">
            <h2 className="mb-2 font-display text-lg font-extrabold">Derniers retours</h2>
            {reportsError && <p className="text-sm text-rate-bad">{reportsError}</p>}
            <ul className="divide-y divide-mint-100">
              {recent.map((r) => (
                <li key={r.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{r.author}</strong>
                    <Link to={`/conditions/${r.spot_id}`} className="text-mint-700 hover:underline">
                      {SPOT_BY_ID[r.spot_id]?.shortName ?? r.spot_id}
                    </Link>
                    <span className="text-ink-700">
                      {r.discipline === 'windsurf' ? 'windsurf' : 'wing'}
                      {r.sail ? ` ${r.sail} m²` : ''}
                      {r.board ? ` · ${r.board} L` : ''} · vent {r.feel}
                      {r.wind_kn != null ? ` (modèle ${r.wind_kn} nds)` : ''} · {'★'.repeat(r.rating)}
                    </span>
                    <span className="text-xs text-ink-700/60">{r.created_at && timeAgo(new Date(r.created_at).getTime())}</span>
                    {admin && r.id != null && (
                      <button
                        className="ml-auto text-xs font-bold text-rate-bad"
                        onClick={async () => {
                          if (confirm('Supprimer ce retour ?')) {
                            await deleteReport(r.id as number, admin.token).catch(() => undefined);
                            reloadReports();
                          }
                        }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  {(r.sail_brand || r.board_brand || r.distance_km != null || r.duration_min != null || r.max_speed_kn != null) && (
                    <p className="mt-0.5 text-xs text-ink-700">
                      {[r.sail_brand, r.board_brand].filter(Boolean).join(' · ')}
                      {r.distance_km != null && ` · ${r.distance_km} km`}
                      {r.duration_min != null && ` · ${Math.floor(r.duration_min / 60)} h ${String(r.duration_min % 60).padStart(2, '0')}`}
                      {r.max_speed_kn != null && ` · pointe ${r.max_speed_kn} nds`}
                    </p>
                  )}
                  {r.comment && <p className="mt-0.5 text-ink-800">{r.comment}</p>}
                  {r.has_track && r.id != null && <TrackToggle id={r.id} />}
                </li>
              ))}
            </ul>
            {!recent.length && <p className="text-sm text-ink-700">Aucun retour pour le moment.</p>}
          </section>
        </>
      )}
    </div>
  );
}
