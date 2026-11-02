import { useSyncExternalStore } from 'react';
import { Dimensions } from 'react-native';

const breakpoint = 900;

function subscribe(onChange: () => void) {
  const subscription = Dimensions.addEventListener('change', onChange);
  return () => subscription.remove();
}

function getSnapshot() {
  return Dimensions.get('window').width;
}

function getServerSnapshot() {
  return 0;
}

export function useViewportWidth() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsWideLayout() {
  return useViewportWidth() >= breakpoint;
}
