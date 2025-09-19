import {
  Navigate,
  Outlet,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  useLocation
} from 'react-router-dom';
import Layout from './layout/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import ConfigPage from './pages/ConfigPage.jsx';
import ItemDetailPage from './pages/ItemDetailPage.jsx';

function AppLayout() {
  const location = useLocation();

  return (
    <Layout currentPath={location.pathname}>
      <Outlet />
    </Layout>
  );
}

const rawBaseName =
  import.meta.env.VITE_BASE_PATH
  || import.meta.env.BASE_URL
  || '/';

const normalizedBaseName = (() => {
  if (!rawBaseName) {
    return '/';
  }
  const trimmed = rawBaseName.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeading.replace(/\/+$/, '');
  return withoutTrailing || '/';
})();

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="dashboard" element={<Navigate to="/" replace />} />
      <Route path="history" element={<HistoryPage />} />
      <Route path="config" element={<ConfigPage />} />
      <Route path="item/:id/:tab?" element={<ItemDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  ),
  {
    basename: normalizedBaseName,
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

export default router;
