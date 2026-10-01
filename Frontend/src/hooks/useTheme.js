import { useState, useEffect } from 'react';

/**
 * useTheme - manages light/dark theme.
 * Default: 'light'. Persists to localStorage under key 'apex-theme'.
 * Applies data-theme=dark on <html> for dark mode; removes it for light.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('apex-theme') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem('apex-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme };
}
