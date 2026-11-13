const BASE = import.meta.env.BASE_URL;

/** Emblème du club (verre de mojito + windsurfer), recadré depuis le logo officiel. */
export function LogoMark({ className = 'h-10 w-auto' }: { className?: string }) {
  return <img src={`${BASE}brand/emblem.jpg`} alt="" aria-hidden="true" className={`rounded-md bg-black object-contain ${className}`} />;
}

/** Logo complet du club (fond noir), pour la page d'accueil. */
export function ClubLogo({ className = '' }: { className?: string }) {
  return <img src={`${BASE}brand/logo-club.jpg`} alt="Logo du Mojito Windsurf Club – Team 100 % Pyrénées" className={className} width={900} height={554} />;
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="h-10 w-auto shrink-0 shadow-sm ring-1 ring-black/10" />
      <span className="leading-none">
        <span className="block font-brand text-[17px] tracking-wide text-ink-900">MOJITO</span>
        {!compact && <span className="mt-0.5 block font-brand text-[10px] tracking-[.14em] text-mint-600">WINDSURF CLUB</span>}
      </span>
    </span>
  );
}
