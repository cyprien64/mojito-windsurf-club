import type { ReactNode } from 'react';

export function StatTile({ icon, label, value, sub, accent }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className="card flex flex-col gap-1 p-3.5">
      <div className="flex items-center gap-1.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: accent ?? '#EEFBF4' }}>
          {icon}
        </span>
        <span className="label">{label}</span>
      </div>
      <div className="tabular text-lg font-extrabold leading-tight text-ink-900">{value}</div>
      {sub && <div className="text-xs text-ink-700/75">{sub}</div>}
    </div>
  );
}
