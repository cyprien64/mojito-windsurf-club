import type { SpotDefinition } from '../types';
import { SpotIllustration } from './Decor';

export function SpotImage({ spot, className = '', showCredit = true }: { spot: SpotDefinition; className?: string; showCredit?: boolean }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {spot.photo ? (
        <img src={spot.photo.src} alt={spot.photo.caption} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <SpotIllustration accent={spot.accent} kind={spot.kind} />
      )}
      {showCredit && (
        <span className="absolute bottom-1 right-1.5 max-w-[90%] truncate rounded bg-black/35 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-sm">
          {spot.photo ? (
            <a href={spot.photo.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              © {spot.photo.author} · {spot.photo.license}
            </a>
          ) : (
            'Illustration — aucune photo libre trouvée'
          )}
        </span>
      )}
    </div>
  );
}
