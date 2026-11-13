import { Link } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { Sailboat, Wind } from 'lucide-react';
import type { Discipline, GearAdvice } from '../lib/gear';
import type { RiderLevel, RiderProfile } from '../types';
import { clubStats, statForWind } from '../lib/clubStats';
import { useApp } from '../context/AppContext';

export const DISCIPLINE_META: Record<Discipline, { label: string; emoji: string; color: string }> = {
  windsurf: { label: 'Planche à voile', emoji: '🏄', color: '#1E8F60' },
  wingfoil: { label: 'Wing foil', emoji: '🪁', color: '#2F6FDE' },
  'les deux': { label: 'Windsurf ou wing', emoji: '🤙', color: '#8E44AD' },
  aucun: { label: 'Pas de session', emoji: '⛔', color: '#E5484D' },
};

export function DisciplineChip({ advice }: { advice: GearAdvice }) {
  const m = DISCIPLINE_META[advice.choice];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold text-white" style={{ background: m.color }}>
      <span aria-hidden="true">{m.emoji}</span> {advice.headline}
    </span>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span className="tabular">{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-mint-100">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-mint-100 py-1.5 text-sm last:border-0">
      <span className="text-ink-700">{k}</span>
      <span className="text-right font-bold text-ink-900">{v}</span>
    </div>
  );
}

/** Détail complet : choix de la discipline + matériel windsurf et wing. */
export function GearPanel({ advice, compact = false, spotId }: { advice: GearAdvice; compact?: boolean; spotId?: string }) {
  const { rider, reports } = useApp();
  const stats = spotId ? clubStats(reports, spotId) : [];
  const clubWs = statForWind(stats, 'windsurf', advice.wind.speed);
  const clubWg = statForWind(stats, 'wingfoil', advice.wind.speed);
  const ws = advice.windsurf;
  const wg = advice.wing;
  const highlight = (d: 'windsurf' | 'wingfoil') => advice.choice === d || advice.choice === 'les deux';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DisciplineChip advice={advice} />
        <span className="text-xs text-ink-700">
          Pour {rider.weightKg} kg, niveau {rider.level} · vent {Math.round(advice.wind.speed)} nds
          {advice.wind.gust != null && ` (rafales ${Math.round(advice.wind.gust)})`} · {advice.wind.source}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ScoreBar label="🏄 Planche à voile" value={advice.scores.windsurf} color="#1E8F60" />
        <ScoreBar label="🪁 Wing foil" value={advice.scores.wingfoil} color="#2F6FDE" />
      </div>
      {(clubWs || clubWg) && (
        <p className="rounded-xl bg-lemon-300/40 px-3 py-2 text-sm">
          👥 <strong>Expérience du club</strong> sur ce spot par {Math.round(advice.wind.speed)} nds :{' '}
          {clubWs && `windsurf en ${clubWs.medianSize} m² (${clubWs.count} sessions)`}
          {clubWs && clubWg && ' · '}
          {clubWg && `wing en ${clubWg.medianSize} m² (${clubWg.count} sessions)`}
        </p>
      )}
      {advice.reasons.length > 0 && (
        <ul className="space-y-1 text-sm text-ink-800">
          {advice.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      )}
      {!compact && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className={`rounded-2xl border p-3.5 ${highlight('windsurf') ? 'border-mint-400 bg-mint-50/70' : 'border-mint-100 bg-white/60'}`}>
            <p className="mb-1 flex items-center gap-2 font-display text-base font-extrabold">
              <Sailboat className="h-4 w-4 text-mint-700" /> Planche à voile <span className="chip bg-cream-50 text-ink-700">{ws.regime}</span>
            </p>
            <Row k="Voile" v={`${ws.sail} m² (${ws.sailRange[0]} – ${ws.sailRange[1]})`} />
            {ws.ownedSail != null && <Row k="Dans votre voilerie" v={`${ws.ownedSail} m²`} />}
            <Row k="Volume de planche" v={`${ws.boardVolume[0]} – ${ws.boardVolume[1]} L`} />
            <Row k="Type" v={ws.boardType} />
            <Row k="Aileron" v={ws.finLength ? `${ws.finLength[0]} – ${ws.finLength[1]} cm` : '—'} />
            <p className="mt-1 text-xs text-ink-700">{ws.fin}</p>
            {ws.notes.map((n) => (
              <p key={n} className="mt-1 text-xs text-rate-mid">
                ⚠ {n}
              </p>
            ))}
          </div>
          <div className={`rounded-2xl border p-3.5 ${highlight('wingfoil') ? 'border-[#2F6FDE]/50 bg-blue-50/60' : 'border-mint-100 bg-white/60'}`}>
            <p className="mb-1 flex items-center gap-2 font-display text-base font-extrabold">
              <Wind className="h-4 w-4 text-[#2F6FDE]" /> Wing foil <span className="chip bg-cream-50 text-ink-700">{wg.regime}</span>
            </p>
            <Row k="Aile" v={`${wg.wing} m² (${wg.wingRange[0]} – ${wg.wingRange[1]})`} />
            {wg.ownedWing != null && <Row k="Dans votre matériel" v={`${wg.ownedWing} m²`} />}
            <Row k="Volume de planche" v={`${wg.boardVolume[0]} – ${wg.boardVolume[1]} L`} />
            <Row k="Aile avant du foil" v={`${wg.frontWing[0]} – ${wg.frontWing[1]} cm²`} />
            <Row k="Mât" v={wg.mast} />
            {wg.notes.map((n) => (
              <p key={n} className="mt-1 text-xs text-rate-mid">
                ⚠ {n}
              </p>
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] text-ink-700/70">
        Ordres de grandeur issus de règles empiriques (voile ≈ 1,34 × poids / vent, aile ≈ poids / vent). Ajustez selon votre matériel, votre technique et le
        ressenti sur place. {compact && <Link to="/materiel" className="font-bold text-mint-700 underline">Voir le détail</Link>}
      </p>
    </div>
  );
}

const LEVELS: RiderLevel[] = ['débutant', 'intermédiaire', 'confirmé', 'expert'];

const parseList = (s: string) =>
  s
    .split(/[;,\s]+/)
    .map((x) => Number(x.replace(',', '.')))
    .filter((x) => Number.isFinite(x) && x > 0 && x < 15);

/**
 * Saisie du poids : on garde le texte tapé tel quel (on peut effacer et
 * retaper librement) et on n'enregistre que des valeurs valides (35–150 kg).
 * Boutons −/+ et curseur pour un réglage facile au pouce.
 */
function WeightField({ value, onChange }: { value: number; onChange: (kg: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = (raw: string) => {
    const n = Math.round(Number(raw.replace(',', '.')));
    if (Number.isFinite(n) && n >= 35 && n <= 150) onChange(n);
    else setText(String(value));
  };
  const step = (d: number) => onChange(Math.min(150, Math.max(35, value + d)));
  return (
    <div className="block sm:col-span-2 lg:col-span-1">
      <span className="label">Poids (kg)</span>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" className="btn-ghost !px-3 !py-2 text-lg" onClick={() => step(-1)} aria-label="Retirer 1 kg">
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="input tabular text-center text-lg font-bold"
          value={text}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
            setText(v);
            const n = Number(v);
            if (v.length >= 2 && n >= 35 && n <= 150) onChange(n);
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
          }}
          aria-label="Poids en kilogrammes"
        />
        <button type="button" className="btn-ghost !px-3 !py-2 text-lg" onClick={() => step(1)} aria-label="Ajouter 1 kg">
          +
        </button>
      </div>
      <input type="range" min={35} max={150} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-mint-600" aria-label="Curseur de poids" />
    </div>
  );
}

/** Formulaire du profil (enregistré sur l'appareil). */
export function RiderForm() {
  const { rider, setRider } = useApp();
  const set = (p: Partial<RiderProfile>) => setRider({ ...rider, ...p });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <WeightField value={rider.weightKg} onChange={(kg) => set({ weightKg: kg })} />
      <label className="block">
        <span className="label">Niveau</span>
        <select className="input mt-1" value={rider.level} onChange={(e) => set({ level: e.target.value as RiderLevel })}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Mes voiles (m², facultatif)</span>
        <input
          className="input mt-1"
          placeholder="ex. 4.7, 5.6, 6.6, 7.8"
          defaultValue={rider.sails.join(', ')}
          onBlur={(e) => set({ sails: parseList(e.target.value).sort((a, b) => a - b) })}
        />
      </label>
      <label className="block">
        <span className="label">Mes ailes de wing (m², facultatif)</span>
        <input
          className="input mt-1"
          placeholder="ex. 4, 5, 6"
          defaultValue={rider.wings.join(', ')}
          onBlur={(e) => set({ wings: parseList(e.target.value).sort((a, b) => a - b) })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
        <input type="checkbox" className="h-5 w-5 accent-mint-600" checked={rider.doesWing} onChange={(e) => set({ doesWing: e.target.checked })} />
        Je pratique aussi le wing foil
      </label>
    </div>
  );
}
