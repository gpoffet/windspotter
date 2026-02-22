import { useEffect } from 'react';
import type { ThemePreference } from '../types/user';

const STORAGE_KEY = 'theme';

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  localStorage.setItem(STORAGE_KEY, resolved);
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

export function useTheme(preference?: ThemePreference) {
  const pref = preference ?? 'system';

  useEffect(() => {
    applyTheme(resolve(pref));

    if (pref !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [pref]);
}
