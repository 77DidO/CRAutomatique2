import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#003a63',
      contrastText: '#ffffff',
    },
    success: {
      main: '#15803d',
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif",
  },
});

export default theme;
