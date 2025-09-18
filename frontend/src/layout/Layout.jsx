import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './Layout.css';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/history', label: 'Historique' },
  { path: '/config', label: 'Configuration' }
];

function Layout({ currentPath, children }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Compte rendu automatique</h1>
        <nav>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.path} className={currentPath.startsWith(item.path) ? 'active' : ''}>
                <Link to={item.path}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

Layout.propTypes = {
  currentPath: PropTypes.string.isRequired,
  children: PropTypes.node
};

export default Layout;
