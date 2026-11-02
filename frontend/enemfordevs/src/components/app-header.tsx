import { StyleSheet, Text, View } from 'react-native';

import { useIsWideLayout } from '@/hooks/use-is-wide-layout';
import { useThemedStyles } from '@/hooks/use-theme';

export function AppHeader({ title }: { title: string }) {
  const isWide = useIsWideLayout();
  const styles = useThemedStyles(baseStyles);
  const horizontalPadding = isWide ? 30 : 16;

  return (
    <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.brand}>ENEM.DEV</Text>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  header: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
    backgroundColor: '#0D1117',
  },
  title: {
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '600',
  },
  brand: {
    color: '#8B949E',
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
});
