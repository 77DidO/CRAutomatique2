import PropTypes from 'prop-types';
import { NavLink, useParams } from 'react-router-dom';
import { Paper, Tab, Tabs } from '@mui/material';

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
    <Paper elevation={0} sx={{ p: 1.5 }}>
      <Tabs
        value={tab}
        variant="scrollable"
        scrollButtons="auto"
        textColor="primary"
        indicatorColor="primary"
        onChange={() => {}}
      >
        {TABS.map((entry) => (
          <Tab
            key={entry.id}
            label={entry.label}
            value={entry.id}
            component={NavLink}
            to={`${basePath}/${id}/${entry.id}`}
            sx={{
              borderRadius: 999,
              minHeight: 'auto',
              py: 1,
              px: 2
            }}
          />
        ))}
      </Tabs>
    </Paper>
  );
}

ItemTabs.propTypes = {
  basePath: PropTypes.string
};

ItemTabs.defaultProps = {
  basePath: '/item'
};

export default ItemTabs;
