import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Container,
  Tab,
  Tabs,
  Toolbar,
  Typography
} from '@mui/material';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/history', label: 'Historique' },
  { path: '/config', label: 'Configuration' }
];

function Layout({ currentPath, children }) {
  const active =
    NAV_ITEMS.find((item) => item.path !== '/' && currentPath.startsWith(item.path)) || NAV_ITEMS[0];
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: 'blur(16px)',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          py: { xs: 1.5, md: 2.5 }
        }}
      >
        <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 4 }, flexWrap: 'wrap' }}>
          <Typography variant="h6" color="text.primary" sx={{ flexGrow: { xs: 1, md: 0 } }}>
            Compte rendu automatique
          </Typography>
          <Tabs
            value={active.path}
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            onChange={() => {}}
            sx={{ ml: { xs: 0, md: 'auto' } }}
          >
            {NAV_ITEMS.map((item) => (
              <Tab
                key={item.path}
                label={item.label}
                value={item.path}
                component={RouterLink}
                to={item.path}
                sx={{
                  borderRadius: 999,
                  '&.Mui-selected': {
                    fontWeight: 600
                  }
                }}
              />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
        {children}
      </Container>
    </Box>
  );
}

Layout.propTypes = {
  currentPath: PropTypes.string.isRequired,
  children: PropTypes.node
};

export default Layout;
