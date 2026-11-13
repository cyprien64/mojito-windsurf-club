// Illustrations décoratives : feuilles de menthe, citron vert, vagues, voile.
import type { CSSProperties } from 'react';

export function MintLeaf({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden="true">
      <path d="M8 56 C4 30 22 8 56 6 C58 36 38 58 8 56Z" fill="#4CC98F" />
      <path d="M8 56 C4 30 22 8 56 6 C58 36 38 58 8 56Z" fill="url(#leaf-shine)" opacity=".5" />
      <path d="M10 54 C24 40 36 26 54 8" stroke="#19724E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M22 42 L18 30 M30 34 L28 20 M38 26 L40 14 M26 38 L38 40 M34 30 L46 30" stroke="#19724E" strokeWidth="1.4" opacity=".6" strokeLinecap="round" />
      <defs>
        <linearGradient id="leaf-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LimeSlice({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#A3CC2A" />
      <circle cx="32" cy="32" r="26" fill="#F2F7D0" />
      <circle cx="32" cy="32" r="23" fill="#D4EE7A" />
      <g stroke="#F2F7D0" strokeWidth="2.2" strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1="32" y1="32" x2={32 + 22 * Math.cos((a * Math.PI) / 180)} y2={32 + 22 * Math.sin((a * Math.PI) / 180)} />
        ))}
      </g>
      <circle cx="32" cy="32" r="3" fill="#F2F7D0" />
    </svg>
  );
}

export function Waves({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M0 60 C150 20 300 100 450 60 S750 20 900 60 S1100 100 1200 60 V120 H0Z" fill="currentColor" opacity=".35" />
      <path d="M0 80 C200 50 350 110 550 80 S850 50 1000 80 S1150 105 1200 85 V120 H0Z" fill="currentColor" opacity=".6" />
    </svg>
  );
}

/** Illustration de repli lorsqu'un spot n'a pas de photo libre de droits. */
export function SpotIllustration({ accent, kind }: { accent: string; kind: 'lac' | 'étang' }) {
  const uid = accent.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D5F5E4" />
          <stop offset="1" stopColor="#FFFDF7" />
        </linearGradient>
        <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} />
          <stop offset="1" stopColor="#178F86" />
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill={`url(#sky-${uid})`} />
      <circle cx="320" cy="60" r="30" fill="#F7E256" opacity=".9" />
      {kind === 'lac' ? (
        <>
          <path d="M0 120 L60 80 L110 110 L170 60 L240 115 L300 85 L400 120 V140 H0Z" fill="#19724E" opacity=".55" />
          <path d="M0 125 C80 112 160 130 240 118 S360 112 400 122 V140 H0Z" fill="#134B36" opacity=".7" />
        </>
      ) : (
        <path d="M0 128 C60 120 140 126 200 118 S330 122 400 116 V140 H0Z" fill="#7FA21C" opacity=".6" />
      )}
      <rect y="132" width="400" height="88" fill={`url(#water-${uid})`} />
      <g stroke="#FFFDF7" strokeWidth="2" opacity=".5" fill="none" strokeLinecap="round">
        <path d="M30 160 q15 -6 30 0 t30 0" />
        <path d="M250 180 q15 -6 30 0 t30 0" />
        <path d="M120 200 q15 -6 30 0 t30 0" />
      </g>
      <g transform="translate(180 92)">
        <path d="M20 0 C40 20 44 42 38 62 L4 62 C10 42 12 20 20 0Z" fill="#FFFDF7" />
        <path d="M20 0 V66" stroke="#0B2A20" strokeWidth="2.5" />
        <path d="M-4 68 H44" stroke="#0B2A20" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
