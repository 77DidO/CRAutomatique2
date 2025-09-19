import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {}
});

function getStoredTheme() {
  if (typeof window === 'undefined') {
    return null;
  }
  const value = window.localStorage.getItem('theme');
  return value === 'dark' || value === 'light' ? value : null;
}

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [state, setState] = useState(() => {
    const stored = getStoredTheme();
    const theme = stored ?? getSystemTheme();
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    return { theme, source: stored ? 'explicit' : 'system' };
  });

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (state.source === 'explicit') {
      window.localStorage.setItem('theme', state.theme);
    } else {
      window.localStorage.removeItem('theme');
    }
  }, [state.theme, state.source]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event) => {
      if (getStoredTheme()) {
        return;
      }
      const nextTheme = event.matches ? 'dark' : 'light';
      setState((prev) =>
        prev.theme === nextTheme && prev.source === 'system'
          ? prev
          : { theme: nextTheme, source: 'system' }
      );
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((nextTheme) => {
    const normalized = nextTheme === 'dark' ? 'dark' : 'light';
    setState((prev) =>
      prev.theme === normalized && prev.source === 'explicit'
        ? prev
        : { theme: normalized, source: 'explicit' }
    );
  }, []);

  const toggleTheme = useCallback(() => {
    setState((prev) => {
      const nextTheme = prev.theme === 'dark' ? 'light' : 'dark';
      return { theme: nextTheme, source: 'explicit' };
    });
  }, []);

  const value = useMemo(
    () => ({
      theme: state.theme,
      setTheme,
      toggleTheme
    }),
    [state.theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useTheme() {
  return useContext(ThemeContext);
}
