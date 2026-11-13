import { LEVEL_META, type Level } from '../lib/scoring';

export function RatingBadge({ level, size = 'md', label }: { level: Level; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const m = LEVEL_META[level];
  const cls = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${cls} ${m.bg} ${m.text}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
      {label ?? (size === 'sm' ? m.short : m.label)}
    </span>
  );
}

/** Anneau de score /100 */
export function ScoreRing({ score, level, size = 64 }: { score: number; level: Level; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = LEVEL_META[level].color;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`Note ${score}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#D5F5E4" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
          style={{ transition: 'stroke-dashoffset .8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="tabular font-display text-lg font-extrabold leading-none" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}
