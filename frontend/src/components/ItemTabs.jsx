import PropTypes from 'prop-types';
import { NavLink, useParams } from 'react-router-dom';
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
    <div className="surface-card">
      <nav className="flex flex-wrap gap-3">
        {TABS.map((entry) => (
          <NavLink
            key={entry.id}
            to={`${basePath}/${id}/${entry.id}`}
            className={({ isActive }) => `btn btn-sm ${isActive || tab === entry.id ? 'btn-primary' : 'btn-secondary'}`}
          >
            {entry.label}
          </NavLink>
        ))}
      </nav>
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
