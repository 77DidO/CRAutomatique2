import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/history', label: 'Historique' },
  { path: '/config', label: 'Configuration' }
];

const SunIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="theme-toggle__icon-svg"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-7.07-1.41 1.41M6.34 17.66l-1.41 1.41m0-13.41L6.34 6.34m11.32 11.32 1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="theme-toggle__icon-svg"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
);

function Layout({ currentPath, children }) {
  const { theme, toggleTheme } = useTheme();
  const active =
    NAV_ITEMS.find((item) => item.path !== '/' && currentPath.startsWith(item.path)) || NAV_ITEMS[0];
  const isDark = theme === 'dark';
  const toggleLabel = isDark ? 'Activer le thème clair' : 'Activer le thème sombre';

  return (
    <div className="pb-72">
      <header className="navbar">
        <RouterLink to="/" className="link cursor-pointer text-base-content font-medium text-sm">
          Compte rendu automatique
        </RouterLink>
        <div className="navbar-actions">
          <nav className="navbar-links">
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
          <button
            type="button"
            className="btn btn-sm btn-ghost theme-toggle"
            onClick={toggleTheme}
            aria-label={toggleLabel}
            aria-pressed={isDark}
          >
            <span aria-hidden="true" className="theme-toggle__icon">
              {isDark ? <MoonIcon /> : <SunIcon />}
            </span>
            <span className="sr-only">{toggleLabel}</span>
          </button>
        </div>
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
