import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { WhereToSail } from './pages/WhereToSail';
import { Conditions } from './pages/Conditions';
import { Forecast } from './pages/Forecast';
import { Models } from './pages/Models';
import { Webcams } from './pages/Webcams';
import { Compare } from './pages/Compare';
import { HistoryPage } from './pages/HistoryPage';
import { Alerts } from './pages/Alerts';
import { Admin } from './pages/Admin';
import { GearPage } from './pages/GearPage';
import { Weekend } from './pages/Weekend';
import { Sessions } from './pages/Sessions';
import { Leaderboard } from './pages/Leaderboard';
import { RoutesPage } from './pages/Routes';
import { WhoGoes } from './pages/WhoGoes';
import { Agenda } from './pages/Agenda';
import { Trend } from './pages/Trend';
import { BeachMode } from './pages/BeachMode';
import { lazy, Suspense } from 'react';

// La carte (Leaflet) n'est chargée que si on l'ouvre.
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })));

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="plage/:spotId?" element={<BeachMode />} />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="ou-naviguer" element={<WhereToSail />} />
            <Route path="conditions/:spotId?" element={<Conditions />} />
            <Route path="previsions/:spotId?" element={<Forecast />} />
            <Route path="modeles/:spotId?" element={<Models />} />
            <Route path="webcams/:spotId?" element={<Webcams />} />
            <Route path="comparer" element={<Compare />} />
            <Route path="historique/:spotId?" element={<HistoryPage />} />
            <Route path="materiel/:spotId?" element={<GearPage />} />
            <Route path="weekend" element={<Weekend />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="classement" element={<Leaderboard />} />
            <Route path="trajets" element={<RoutesPage />} />
            <Route path="qui-y-va" element={<WhoGoes />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="tendance/:spotId?" element={<Trend />} />
            <Route
              path="carte"
              element={
                <Suspense fallback={<p className="text-sm">Chargement de la carte…</p>}>
                  <MapPage />
                </Suspense>
              }
            />
            <Route path="alertes" element={<Alerts />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
