import { useSyncExternalStore } from 'react';

const colorSchemeQuery = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mediaQuery = window.matchMedia(colorSchemeQuery);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia(colorSchemeQuery).matches ? 'dark' : 'light';
}

export function useColorScheme() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'light');
}
