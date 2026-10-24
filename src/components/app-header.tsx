import { StyleSheet, Text, View } from 'react-native';

import { useIsWideLayout } from '@/hooks/use-is-wide-layout';

const colors = {
  border: '#30363D',
  text: '#E6EDF3',
  muted: '#8B949E',
};

export function AppHeader({ title }: { title: string }) {
  const isWide = useIsWideLayout();
  const horizontalPadding = isWide ? 30 : 16;

  return (
    <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.brand}>ENEM.DEV</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#0D1117',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  brand: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
});
