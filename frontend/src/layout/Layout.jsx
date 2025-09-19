import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/history', label: 'Historique' },
  { path: '/config', label: 'Configuration' }
];

function Layout({ currentPath, children }) {
  const active =
    NAV_ITEMS.find((item) => item.path !== '/' && currentPath.startsWith(item.path)) || NAV_ITEMS[0];

  return (
    <div className="pb-72">
      <header className="navbar">
        <RouterLink to="/" className="link cursor-pointer text-base-content font-medium text-sm">
          Compte rendu automatique
        </RouterLink>
        <nav className="flex items-center gap-2 flex-wrap">
          {NAV_ITEMS.map((item) => {
            const isActive = active.path === item.path;
            return (
              <RouterLink
                key={item.path}
                to={item.path}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              >
                {item.label}
              </RouterLink>
            );
          })}
        </nav>
      </header>
      <main className="page-container">{children}</main>
    </div>
  );
}

Layout.propTypes = {
  currentPath: PropTypes.string.isRequired,
  children: PropTypes.node
};

export default Layout;
