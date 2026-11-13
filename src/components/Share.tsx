import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { SPOT_BY_ID } from '../config/spots';
import { LEVEL_META, type SpotEvaluation } from '../lib/scoring';
import { cardinal } from '../lib/wind';
import { hhmm } from '../lib/format';

export function shareText(ev: SpotEvaluation): string {
  const spot = SPOT_BY_ID[ev.spotId];
  const url = `${location.origin}${location.pathname}#/conditions/${ev.spotId}`;
  const lines = [
    `🌴 Mojito Windsurf Club — ${spot.name}`,
    `💨 ${Math.round(ev.speed ?? 0)} nds ${cardinal(ev.dir)} · rafales ${Math.round(ev.gust ?? 0)} nds`,
    `${LEVEL_META[ev.level].label} (${ev.score}/100)`,
    ev.bestWindow ? `⏰ Meilleur créneau : ${hhmm(ev.bestWindow.start)} – ${hhmm(ev.bestWindow.end)}` : '',
    url,
  ];
  return lines.filter(Boolean).join('\n');
}

/** Partage natif (téléphone) ou WhatsApp en repli. */
export function ShareButton({ ev, compact = false }: { ev: SpotEvaluation; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const text = shareText(ev);
  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* annulé : on ne fait rien */
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };
  return (
    <span className="inline-flex gap-1.5">
      <button onClick={onShare} className={compact ? 'chip border border-mint-200 bg-cream-50 text-ink-800' : 'btn-ghost !py-2'}>
        <Share2 className="h-4 w-4" /> Partager
      </button>
      {!compact && (
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="btn-ghost !py-2" aria-label="Partager sur WhatsApp">
          WhatsApp
        </a>
      )}
      {!compact && (
        <button
          className="btn-ghost !py-2"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              /* ignore */
            }
          }}
        >
          {copied ? 'Copié ✓' : 'Copier'}
        </button>
      )}
    </span>
  );
}
