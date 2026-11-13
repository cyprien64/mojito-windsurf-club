import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CameraOff, Columns2, ExternalLink, Maximize2, RefreshCw, Square, X } from 'lucide-react';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import { WEBCAMS } from '../config/webcams';
import { useApp } from '../context/AppContext';
import { bustUrl, noWebcamNote, webcamsForSpot } from '../services/webcams';
import type { Webcam } from '../types';

function useNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function WebcamView({ cam, tall = false }: { cam: Webcam; tall?: boolean }) {
  const [reloadAt, setReloadAt] = useState(Date.now());
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  // Rafraîchissement automatique si la source le permet.
  useEffect(() => {
    if (!cam.refreshSeconds) return;
    const id = window.setInterval(() => setReloadAt(Date.now()), cam.refreshSeconds * 1000);
    return () => window.clearInterval(id);
  }, [cam.refreshSeconds]);

  const h = tall ? 'h-[70vh]' : 'aspect-video';
  if (failed) {
    return (
      <div className={`${h} grid place-items-center bg-mint-50 p-4 text-center text-sm text-ink-700`}>
        <div>
          <CameraOff className="mx-auto mb-2 h-6 w-6" />
          Webcam indisponible pour le moment.
          <a href={cam.sourcePage} target="_blank" rel="noreferrer" className="mt-1 block font-bold text-mint-700 underline">
            Voir sur le site source
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="relative">
      {cam.kind === 'iframe' ? (
        <iframe
          key={reloadAt}
          src={cam.url}
          title={cam.title}
          className={`${h} w-full border-0 bg-night`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setLoadedAt(Date.now())}
        />
      ) : (
        <img
          src={bustUrl(cam.url, reloadAt)}
          alt={cam.title}
          className={`${h} w-full bg-night object-cover`}
          onLoad={() => setLoadedAt(Date.now())}
          onError={() => setFailed(true)}
        />
      )}
      <div className="flex items-center justify-between gap-2 bg-night px-3 py-1.5 text-[11px] text-white/80">
        <span>
          {loadedAt
            ? `${cam.kind === 'image' ? 'Image chargée' : 'Lecteur chargé'} à ${new Date(loadedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : 'Chargement…'}
          {cam.kind === 'iframe' && ' · heure de prise de vue affichée dans le lecteur'}
        </span>
        <button onClick={() => setReloadAt(Date.now())} className="inline-flex items-center gap-1 font-bold text-lemon-300 hover:text-lemon-400">
          <RefreshCw className="h-3 w-3" /> Recharger
        </button>
      </div>
    </div>
  );
}

function WebcamCard({ cam, onExpand }: { cam: Webcam; onExpand: () => void }) {
  if (cam.kind === 'link') {
    return (
      <a href={cam.url} target="_blank" rel="noreferrer" className="card card-pad flex items-start gap-3 transition hover:shadow-lift">
        <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-mint-700" />
        <div>
          <p className="font-bold">{cam.title}</p>
          <p className="text-xs text-ink-700">{cam.proximity}</p>
          <p className="mt-1 text-[11px] text-ink-700/70">Lien externe · {cam.provider} (intégration non disponible)</p>
        </div>
      </a>
    );
  }
  return (
    <article className="card overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-4 py-3">
        <div>
          <h3 className="font-bold leading-tight">{cam.title}</h3>
          <p className="text-xs text-ink-700">{cam.proximity}</p>
        </div>
        <button onClick={onExpand} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mint-50 hover:bg-mint-100" aria-label="Agrandir la webcam">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      <WebcamView cam={cam} />
      <p className="px-4 py-2 text-[11px] text-ink-700/80">
        Source :{' '}
        <a className="underline" href={cam.sourcePage} target="_blank" rel="noreferrer">
          {cam.provider}
        </a>
        {cam.live ? ' · direct' : ' · séquences récentes fournies par la source (pas un direct continu)'}
      </p>
    </article>
  );
}

export function Webcams() {
  const { spotId: param } = useParams();
  const navigate = useNavigate();
  const { setSpotId } = useApp();
  const selected = param && (param === 'tous' || SPOT_BY_ID[param]) ? param : 'tous';
  const [cols, setCols] = useState<1 | 2>(2);
  const [expanded, setExpanded] = useState<Webcam | null>(null);
  useNow(60000);

  useEffect(() => {
    if (selected !== 'tous') setSpotId(selected);
  }, [selected, setSpotId]);

  const cams = selected === 'tous' ? WEBCAMS : webcamsForSpot(selected);
  const embedded = cams.filter((c) => c.kind !== 'link');
  const links = cams.filter((c) => c.kind === 'link');
  const note = selected !== 'tous' ? noWebcamNote(selected) : null;

  return (
    <div className="space-y-5">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
          {[{ id: 'tous', shortName: 'Toutes' }, ...SPOTS].map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/webcams/${s.id}`)}
              className={`rounded-full border px-3.5 py-2 text-sm font-bold ${selected === s.id ? 'border-night bg-night text-white' : 'border-mint-200 bg-cream-50'}`}
            >
              {s.shortName}
            </button>
          ))}
        </div>
      </div>

      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Webcams {selected !== 'tous' && `· ${SPOT_BY_ID[selected].shortName}`}</h1>
          <p className="text-sm text-ink-700">Flux publics intégrés depuis leurs sources officielles. Rafraîchissement automatique toutes les 10 min.</p>
        </div>
        <div className="hidden rounded-full border border-mint-200 bg-cream-50 p-1 sm:flex">
          <button onClick={() => setCols(1)} className={`rounded-full p-1.5 ${cols === 1 ? 'bg-night text-white' : ''}`} aria-label="Une webcam par ligne">
            <Square className="h-4 w-4" />
          </button>
          <button onClick={() => setCols(2)} className={`rounded-full p-1.5 ${cols === 2 ? 'bg-night text-white' : ''}`} aria-label="Deux webcams par ligne">
            <Columns2 className="h-4 w-4" />
          </button>
        </div>
      </section>

      {note && (
        <div className="card card-pad flex items-start gap-3">
          <CameraOff className="mt-0.5 h-5 w-5 shrink-0 text-ink-700" />
          <div className="text-sm">
            <p className="font-bold">Pas de webcam sur ce spot</p>
            <p className="text-ink-700">{note}</p>
            {links.length > 0 && <p className="mt-1 text-ink-700">Webcam publique la plus proche ci-dessous (lien externe).</p>}
          </div>
        </div>
      )}

      {embedded.length > 0 && (
        <div className={`grid gap-4 ${cols === 2 ? 'md:grid-cols-2' : ''}`}>
          {embedded.map((c) => (
            <WebcamCard key={c.id} cam={c} onExpand={() => setExpanded(c)} />
          ))}
        </div>
      )}
      {links.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {links.map((c) => (
            <WebcamCard key={c.id} cam={c} onExpand={() => undefined} />
          ))}
        </div>
      )}

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur" role="dialog" aria-modal="true" onClick={() => setExpanded(null)}>
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-night" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 text-white">
              <p className="font-bold">{expanded.title}</p>
              <button onClick={() => setExpanded(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <WebcamView cam={expanded} tall />
          </div>
        </div>
      )}
    </div>
  );
}
