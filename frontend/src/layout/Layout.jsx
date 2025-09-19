import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/history', label: 'Historique' },
  { path: '/config', label: 'Configuration' }
];

function Layout({ currentPath, children }) {
  const active =
    NAV_ITEMS.find((item) => item.path !== '/' && currentPath.startsWith(item.path)) || NAV_ITEMS[0];
  return (
    <div className="min-vh-100 bg-light">
      <Navbar bg="white" expand="md" className="shadow-sm border-bottom sticky-top" collapseOnSelect>
        <Container>
          <Navbar.Brand className="fw-semibold text-primary">Compte rendu automatique</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav" className="justify-content-end">
            <Nav activeKey={active.path} className="gap-1">
              {NAV_ITEMS.map((item) => (
                <Nav.Link
                  key={item.path}
                  as={RouterLink}
                  to={item.path}
                  eventKey={item.path}
                  className="rounded-pill px-3"
                >
                  {item.label}
                </Nav.Link>
              ))}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container as="main" className="py-4 py-md-5">
        {children}
      </Container>
    </div>
  );
}

Layout.propTypes = {
  currentPath: PropTypes.string.isRequired,
  children: PropTypes.node
};

export default Layout;
