import PropTypes from 'prop-types';
import { NavLink, useParams } from 'react-router-dom';
import './ItemTabs.css';

const TABS = [
  { id: 'overview', label: 'Aperçu' },
  { id: 'audio', label: 'Audio' },
  { id: 'texts', label: 'Textes' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'vtt', label: 'Sous-titres' }
];

function ItemTabs({ basePath }) {
  const { id } = useParams();
  return (
    <nav className="item-tabs">
      {TABS.map((tab) => (
        <NavLink key={tab.id} to={`${basePath}/${id}/${tab.id}`} className={({ isActive }) => (isActive ? 'active' : '')}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

ItemTabs.propTypes = {
  basePath: PropTypes.string
};

ItemTabs.defaultProps = {
  basePath: '/item'
};

export default ItemTabs;
