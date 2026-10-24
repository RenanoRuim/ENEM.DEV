import { BookOpen, Bug, ChartNoAxesColumnIncreasing } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';

const sections = {
  questions: {
    title: 'Questões',
    description: 'As questões do ENEM estarão disponíveis nesta área em uma próxima etapa.',
    icon: BookOpen,
  },
  debug: {
    title: 'Debug Mode',
    description: 'Aqui você poderá revisar as questões que respondeu incorretamente.',
    icon: Bug,
  },
  performance: {
    title: 'Desempenho',
    description: 'Seus indicadores reais de desempenho serão apresentados aqui futuramente.',
    icon: ChartNoAxesColumnIncreasing,
  },
} as const;

export function SectionScreen({ section }: { section: keyof typeof sections }) {
  const item = sections[section];
  const Icon = item.icon;
  const isWide = useIsWideLayout();

  return (
    <View style={styles.screen}>
      <AppHeader title={item.title} />
      <ScrollView contentContainerStyle={[styles.content, { padding: isWide ? 30 : 16 }]}>
        <View style={styles.panel}>
          <View style={styles.icon}>
            <Icon color="#58A6FF" size={21} />
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Esta tela é apenas um espaço de navegação inicial.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    padding: 30,
  },
  panel: {
    alignItems: 'flex-start',
    padding: 24,
    borderWidth: 1,
    borderColor: '#30363D',
    borderRadius: 12,
    backgroundColor: '#161B22',
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#58A6FF18',
  },
  title: {
    marginTop: 18,
    color: '#E6EDF3',
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    marginTop: 8,
    color: '#8B949E',
    fontSize: 13,
    lineHeight: 20,
  },
  notice: {
    marginTop: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 7,
    backgroundColor: '#0D1117',
  },
  noticeText: {
    color: '#8B949E',
    fontSize: 10,
  },
});
