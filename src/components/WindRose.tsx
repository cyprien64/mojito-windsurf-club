import { useState } from 'react';
import type { SectorRating } from '../types';
import { SECTOR_CODES, SECTOR_NAMES, cardinal, sectorIndex, sectorRange } from '../lib/wind';
import { SECTOR_RATING_META } from '../lib/scoring';

interface Props {
  /** Configuration du spot (16 secteurs). */
  sectors?: SectorRating[];
  /** Direction actuelle du vent (d'où il vient), en degrés. */
  direction?: number | null;
  speedLabel?: string;
  /** Mode édition : clic sur un secteur. */
  onSectorClick?: (index: number) => void;
  size?: number;
}

const C = 160;
const R_OUT = 132;
const R_IN = 46;

function pt(angleDeg: number, r: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}

function wedge(i: number, rIn: number, rOut: number): string {
  const a0 = i * 22.5 - 11.25 + 0.6;
  const a1 = i * 22.5 + 11.25 - 0.6;
  const [x0, y0] = pt(a0, rOut);
  const [x1, y1] = pt(a1, rOut);
  const [x2, y2] = pt(a1, rIn);
  const [x3, y3] = pt(a0, rIn);
  return `M${x0} ${y0} A${rOut} ${rOut} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${rIn} ${rIn} 0 0 0 ${x3} ${y3}Z`;
}

export function WindRose({ sectors, direction, speedLabel, onSectorClick, size = 300 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const active = direction != null ? sectorIndex(direction) : null;
  const shown = hover ?? active;
  const interactive = !!onSectorClick;

  return (
    <div className="relative mx-auto" style={{ width: '100%', maxWidth: size }}>
      <svg viewBox="0 0 320 320" className="h-auto w-full select-none" role="img" aria-label={direction != null ? `Rose des vents, vent de ${cardinal(direction)}` : 'Rose des vents'}>
        <circle cx={C} cy={C} r={R_OUT + 14} fill="#FFFDF7" stroke="#D5F5E4" strokeWidth="2" />
        {SECTOR_CODES.map((code, i) => {
          const rating = sectors?.[i];
          const fill = rating ? SECTOR_RATING_META[rating].color : '#EEFBF4';
          const isActive = i === active;
          return (
            <path
              key={code}
              d={wedge(i, R_IN, R_OUT)}
              fill={fill}
              fillOpacity={rating ? (hover === i ? 1 : isActive ? 0.95 : 0.72) : hover === i ? 0.9 : 0.6}
              stroke={isActive ? '#0B2A20' : '#FFFDF7'}
              strokeWidth={isActive ? 2.5 : 1}
              className={interactive ? 'cursor-pointer transition-[fill-opacity]' : 'transition-[fill-opacity]'}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSectorClick?.(i)}
              role={interactive ? 'button' : undefined}
              aria-label={`${SECTOR_NAMES[code]} ${sectorRange(i)}${rating ? ` : ${SECTOR_RATING_META[rating].label}` : ''}`}
            />
          );
        })}
        {/* graduations */}
        {Array.from({ length: 72 }).map((_, k) => {
          const a = k * 5;
          const [x0, y0] = pt(a, R_OUT + 6);
          const [x1, y1] = pt(a, R_OUT + (a % 45 === 0 ? 14 : 9));
          return <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#1C4A3A" strokeOpacity={a % 45 === 0 ? 0.6 : 0.25} strokeWidth={a % 45 === 0 ? 1.6 : 1} />;
        })}
        {SECTOR_CODES.map((code, i) => {
          if (i % 2) return null;
          const [x, y] = pt(i * 22.5, (R_IN + R_OUT) / 2 + (i % 4 === 0 ? 0 : 0));
          return (
            <text key={code} x={x} y={y + 4} textAnchor="middle" fontSize={i % 4 === 0 ? 14 : 11} fontWeight={800} fill="#0B2A20" opacity={0.85} pointerEvents="none">
              {code}
            </text>
          );
        })}
        {direction != null && (
          <g style={{ transform: `rotate(${direction}deg)`, transformOrigin: `${C}px ${C}px`, transition: 'transform .8s cubic-bezier(.2,.8,.2,1)' }} pointerEvents="none">
            {/* flèche venant de l'extérieur vers le centre : le vent VIENT de cette direction */}
            <path d={`M${C} ${C - R_OUT - 12} L${C + 11} ${C - R_OUT - 34} L${C - 11} ${C - R_OUT - 34}Z`} fill="#0B2A20" transform={`rotate(180 ${C} ${C - R_OUT - 23})`} />
            <line x1={C} y1={C - R_OUT + 4} x2={C} y2={C - R_IN + 6} stroke="#0B2A20" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 5" />
          </g>
        )}
        <circle cx={C} cy={C} r={R_IN - 4} fill="#FFFDF7" stroke="#D5F5E4" />
        <text x={C} y={C - 2} textAnchor="middle" fontSize="20" fontWeight="800" fill="#0B2A20" className="tabular">
          {shown != null ? SECTOR_CODES[shown] : '—'}
        </text>
        <text x={C} y={C + 15} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#1C4A3A" opacity=".75">
          {hover != null ? sectorRange(hover) : direction != null ? `${Math.round(direction)}°` : ''}
        </text>
        {speedLabel && hover == null && (
          <text x={C} y={C + 28} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1E8F60">
            {speedLabel}
          </text>
        )}
      </svg>
      {hover != null && sectors && (
        <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-night px-3 py-1 text-xs font-semibold text-white shadow-lift">
          {SECTOR_NAMES[SECTOR_CODES[hover]]} · {SECTOR_RATING_META[sectors[hover]].label}
        </div>
      )}
    </div>
  );
}

export function RoseLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs font-semibold text-ink-700">
      {(Object.keys(SECTOR_RATING_META) as SectorRating[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: SECTOR_RATING_META[k].color }} />
          {SECTOR_RATING_META[k].label}
        </span>
      ))}
    </div>
  );
}
