import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './layout/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import ConfigPage from './pages/ConfigPage.jsx';
import ItemDetailPage from './pages/ItemDetailPage.jsx';

function App() {
  const location = useLocation();
  return (
    <Layout currentPath={location.pathname}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/item/:id/:tab?" element={<ItemDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
