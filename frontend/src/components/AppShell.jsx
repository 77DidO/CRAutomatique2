import { NavLink, Outlet, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/jobs', label: 'Historique' },
  { to: '/settings', label: 'Paramètres' }
];

function AppShell() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__branding">
          <span className="app-brand">CR Automatique</span>
          <span className="app-location">{location.pathname}</span>
        </div>
        <nav className="app-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
