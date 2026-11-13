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

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="ou-naviguer" element={<WhereToSail />} />
            <Route path="conditions/:spotId?" element={<Conditions />} />
            <Route path="previsions/:spotId?" element={<Forecast />} />
            <Route path="modeles/:spotId?" element={<Models />} />
            <Route path="webcams/:spotId?" element={<Webcams />} />
            <Route path="comparer" element={<Compare />} />
            <Route path="historique/:spotId?" element={<HistoryPage />} />
            <Route path="alertes" element={<Alerts />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
