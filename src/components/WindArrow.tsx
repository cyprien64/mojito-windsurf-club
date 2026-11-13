import { cardinal } from '../lib/wind';

/** Flèche indiquant le sens où VA le vent (direction météo + 180°). */
export function WindArrow({ deg, size = 20, className = '', color = 'currentColor' }: { deg: number | null; size?: number; className?: string; color?: string }) {
  if (deg == null) return <span className={className}>—</span>;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ transform: `rotate(${deg + 180}deg)`, transition: 'transform .6s ease' }}
      role="img"
      aria-label={`Vent de ${cardinal(deg)} (${Math.round(deg)}°)`}
    >
      <path d="M12 2 L18 20 L12 16 L6 20 Z" fill={color} />
    </svg>
  );
}
