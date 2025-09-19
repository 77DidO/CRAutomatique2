import PropTypes from 'prop-types';
import { NavLink, useParams } from 'react-router-dom';
import { Nav } from 'react-bootstrap';

const TABS = [
  { id: 'overview', label: 'Aperçu' },
  { id: 'audio', label: 'Audio' },
  { id: 'texts', label: 'Textes' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'vtt', label: 'Sous-titres' }
];

function ItemTabs({ basePath }) {
  const { id, tab = 'overview' } = useParams();
  return (
    <div className="bg-white shadow-sm border-0 rounded-4 p-2 overflow-auto">
      <Nav variant="pills" activeKey={tab} className="flex-nowrap">
        {TABS.map((entry) => (
          <Nav.Item key={entry.id}>
            <Nav.Link
              as={NavLink}
              to={`${basePath}/${id}/${entry.id}`}
              eventKey={entry.id}
              className="rounded-pill px-3"
            >
              {entry.label}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
    </div>
  );
}

ItemTabs.propTypes = {
  basePath: PropTypes.string
};

ItemTabs.defaultProps = {
  basePath: '/item'
};

export default ItemTabs;
