import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4f46e5'
    },
    secondary: {
      main: '#0ea5e9'
    },
    background: {
      default: '#eef2ff',
      paper: '#ffffff'
    }
  },
  shape: {
    borderRadius: 16
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: {
      fontSize: '2rem',
      fontWeight: 700
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600
    }
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: 'contained'
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 999
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20
        }
      }
    }
  }
});

export default theme;
