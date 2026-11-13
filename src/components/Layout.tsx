import type { CSSProperties } from 'react';
import { Bell, Camera, Compass, Gauge, History, Layers, LineChart, MapPin, Scale, Settings, Trophy } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Logo } from './Logo';
import { LimeSlice, MintLeaf } from './Decor';

export function useMainNav() {
  const { spotId } = useApp();
  return [
    { to: '/', label: 'Spots', icon: MapPin, end: true },
    { to: `/conditions/${spotId}`, match: '/conditions', label: 'Conditions', icon: Gauge },
    { to: `/previsions/${spotId}`, match: '/previsions', label: 'Prévisions', icon: LineChart },
    { to: `/modeles/${spotId}`, match: '/modeles', label: 'Modèles', icon: Layers },
    { to: `/webcams/${spotId}`, match: '/webcams', label: 'Webcams', icon: Camera },
  ];
}

const SECONDARY = [
  { to: '/ou-naviguer', label: 'Où naviguer ?', icon: Trophy },
  { to: '/comparer', label: 'Comparer', icon: Scale },
  { to: '/historique', label: 'Historique', icon: History },
  { to: '/alertes', label: 'Alertes', icon: Bell },
  { to: '/admin', label: 'Admin', icon: Settings },
];

export function Layout() {
  const nav = useMainNav();
  const location = useLocation();
  // Revenir en haut de page à chaque changement de page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const isActive = (item: { to: string; match?: string; end?: boolean }) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.match ?? item.to);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* décor */}
      <MintLeaf className="pointer-events-none fixed -left-6 top-40 hidden h-24 w-24 animate-floaty opacity-30 lg:block" style={{ '--r': '-20deg' } as unknown as CSSProperties} />
      <LimeSlice className="pointer-events-none fixed -right-8 bottom-24 hidden h-28 w-28 animate-floaty opacity-25 lg:block" />

      <header className="sticky top-0 z-30 border-b border-mint-100/70 bg-cream-50/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
          <NavLink to="/" aria-label="Accueil Mojito Windsurf Club">
            <Logo />
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {nav.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition ${
                  isActive(item) ? 'bg-mint-600 text-white shadow-card' : 'text-ink-800 hover:bg-mint-50'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <NavLink
            to="/ou-naviguer"
            className="hidden items-center gap-1.5 rounded-full bg-lemon-400 px-3.5 py-2 text-sm font-extrabold text-ink-900 shadow-card transition hover:bg-lemon-300 sm:flex"
          >
            <Compass className="h-4 w-4" /> Où naviguer ?
          </NavLink>
        </div>
        <div className="border-t border-mint-100/60">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-1.5">
            {SECONDARY.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                className={({ isActive: a }) =>
                  `flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${a ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-mint-50'}`
                }
              >
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      <main key={location.pathname.split('/')[1]} className="mx-auto max-w-6xl animate-pageIn px-4 pb-28 pt-4 md:pb-12 md:pt-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-28 text-xs text-ink-700/70 md:pb-8">
        <div className="border-t border-mint-100 pt-4">
          Données météo :{' '}
          <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          (CC BY 4.0) — modèles ECMWF, NOAA GFS, DWD ICON, Météo-France ARPEGE/AROME. Webcams : leurs sources respectives. Photos : Wikimedia Commons (crédits sur
          chaque image). Les conditions « actuelles » sont des valeurs de modèles, pas des mesures de station. Aide à la décision uniquement : vérifiez toujours les
          conditions réelles avant de naviguer.
        </div>
      </footer>

      {/* Navigation inférieure mobile (accessible au pouce) */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-mint-100 bg-cream-50/95 backdrop-blur-lg md:hidden" aria-label="Navigation principale mobile">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {nav.map((item) => {
            const active = isActive(item);
            return (
              <NavLink key={item.label} to={item.to} className="flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10.5px] font-bold">
                <span className={`grid h-8 w-12 place-items-center rounded-full transition ${active ? 'bg-mint-600 text-white' : 'text-ink-700'}`}>
                  <item.icon className="h-[19px] w-[19px]" />
                </span>
                <span className={active ? 'text-mint-700' : 'text-ink-700/80'}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
