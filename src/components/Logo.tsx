export function LogoMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4CC98F" />
          <stop offset="1" stopColor="#178F86" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#lg-bg)" />
      <circle cx="372" cy="150" r="74" fill="#F7E256" />
      <circle cx="372" cy="150" r="58" fill="#BFE34A" />
      <g stroke="#F7E256" strokeWidth="7" strokeLinecap="round">
        <line x1="372" y1="150" x2="372" y2="94" />
        <line x1="372" y1="150" x2="420" y2="122" />
        <line x1="372" y1="150" x2="420" y2="178" />
        <line x1="372" y1="150" x2="372" y2="206" />
        <line x1="372" y1="150" x2="324" y2="178" />
        <line x1="372" y1="150" x2="324" y2="122" />
      </g>
      <path d="M232 92 C300 170 312 280 286 372 L150 372 C178 280 196 170 232 92Z" fill="#FFFDF7" />
      <path d="M232 92 L232 380" stroke="#0B2A20" strokeWidth="10" strokeLinecap="round" />
      <path d="M168 300 L284 268" stroke="#0B2A20" strokeWidth="9" strokeLinecap="round" />
      <path d="M120 392 L340 392" stroke="#0B2A20" strokeWidth="16" strokeLinecap="round" />
      <path d="M60 436 C110 410 150 462 200 436 S290 410 340 436 S420 462 452 436" fill="none" stroke="#FFFDF7" strokeWidth="14" strokeLinecap="round" />
      <path d="M96 182 C70 150 82 112 118 104 C126 140 120 166 96 182Z" fill="#D5F5E4" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="h-9 w-9 shrink-0 drop-shadow-sm" />
      <span className="leading-none">
        <span className="block font-display text-[19px] font-extrabold italic tracking-tight text-ink-900">Mojito</span>
        {!compact && <span className="block text-[10px] font-bold uppercase tracking-[.22em] text-mint-700">Windsurf Club</span>}
      </span>
    </span>
  );
}
