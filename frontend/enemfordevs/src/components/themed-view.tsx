import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useVisualPreferences } from '@/contexts/visual-preferences-context';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const { colorScheme } = useVisualPreferences();
  const override = colorScheme === 'dark' ? darkColor : lightColor;

  return <View style={[{ backgroundColor: override ?? theme[type ?? 'background'] }, style]} {...otherProps} />;
}
