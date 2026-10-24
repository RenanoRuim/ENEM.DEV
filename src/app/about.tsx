import {
  AlertTriangle,
  BookOpenCheck,
  BrainCircuit,
  Code2,
  ExternalLink as ExternalLinkIcon,
  Flame,
  GraduationCap,
  Layers3,
  Trophy,
} from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ExternalLink } from "@/components/external-link";
import { useIsWideLayout } from "@/hooks/use-is-wide-layout";

const colors = {
  background: "#0D1117",
  surface: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  green: "#39D353",
  blue: "#58A6FF",
  orange: "#F0883E",
};

const features = [
  {
    title: "Questões e filtros",
    description:
      "Pratique com questões do ENEM e selecione ano, área e idioma quando disponível.",
    icon: BookOpenCheck,
    color: colors.blue,
  },
  {
    title: "Desempenho e Debug Mode",
    description:
      "Acompanhe seus resultados e revise questões que ainda precisam de atenção.",
    icon: BrainCircuit,
    color: colors.orange,
  },
  {
    title: "XP, níveis e conquistas",
    description:
      "Veja seu progresso de estudo representado por recompensas e marcos.",
    icon: Trophy,
    color: colors.green,
  },
  {
    title: "Daily Commit",
    description:
      "Defina uma meta diária de questões e acompanhe sua sequência de estudos.",
    icon: Flame,
    color: colors.orange,
  },
];

export default function AboutScreen() {
  const isWide = useIsWideLayout();

  return (
    <View style={styles.screen}>
      <AppHeader title="Sobre o ENEM.DEV" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isWide && styles.contentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Code2 color={colors.green} size={22} />
          </View>
          <Text style={styles.eyebrow}>PROJETO INDEPENDENTE</Text>
          <Text style={styles.title}>Estudar para o ENEM, um passo de cada vez.</Text>
          <Text style={styles.description}>
            O ENEM.DEV nasceu da necessidade pessoal de estudar para o ENEM. A
            ideia é tornar essa preparação mais organizada, interativa e
            motivadora, reunindo prática e acompanhamento do progresso em um só
            lugar.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O que você encontra</Text>
          <View style={styles.featureGrid}>
            {features.map(({ title, description, icon: Icon, color }) => (
              <View key={title} style={styles.featureCard}>
                <View
                  style={[
                    styles.featureIcon,
                    { backgroundColor: `${color}18` },
                  ]}
                >
                  <Icon color={color} size={17} />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardDescription}>{description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Layers3 color={colors.blue} size={18} />
            <Text style={styles.sectionTitle}>Tecnologias</Text>
          </View>
          <Text style={styles.bodyText}>
            Aplicativo desenvolvido com Expo, React Native, TypeScript e Expo
            Router, com suporte para Web e dispositivos móveis. Também utiliza
            Reanimated para animações e AsyncStorage para persistência local.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <BrainCircuit color={colors.green} size={18} />
            <Text style={styles.sectionTitle}>Desenvolvimento com IA</Text>
          </View>
          <Text style={styles.bodyText}>
            Ferramentas de inteligência artificial foram utilizadas como apoio
            durante o desenvolvimento. O projeto segue uma abordagem conhecida
            como vibe coding: partir de ideias e refiná-las iterativamente com
            assistência de IA. A IA é uma ferramenta de apoio; os recursos
            exibidos dependem do código e dos dados disponíveis no aplicativo.
          </Text>
        </View>

        <View style={[styles.section, styles.noticeSection]}>
          <View style={styles.sectionHeading}>
            <AlertTriangle color={colors.orange} size={18} />
            <Text style={styles.sectionTitle}>Fonte de dados e limitações</Text>
          </View>
          <Text style={styles.bodyText}>
            As questões são obtidas de uma API externa mantida pela comunidade.
            A disponibilidade, classificação, enunciados, gabaritos e arquivos
            dependem dessa fonte e podem conter lacunas ou ficar indisponíveis.
            O ENEM.DEV valida os dados necessários para responder, mas não
            controla a API nem garante que ela esteja sempre acessível.
          </Text>
          <Text style={styles.disclaimer}>
            O ENEM.DEV é um projeto independente e não possui vínculo oficial
            com o INEP ou o Ministério da Educação (MEC).
          </Text>
        </View>

        <View style={styles.linksSection}>
          <GraduationCap color={colors.muted} size={18} />
          <View style={styles.linksCopy}>
            <Text style={styles.linksTitle}>Saiba mais sobre a fonte</Text>
            <ExternalLink
              href="https://api.enem.dev/"
              style={styles.link}
            >
              Documentação da API ENEM.DEV
              <ExternalLinkIcon color={colors.blue} size={13} />
            </ExternalLink>
            <ExternalLink
              href="https://github.com/yunger7/enem-api"
              style={styles.link}
            >
              Repositório da API
              <ExternalLinkIcon color={colors.blue} size={13} />
            </ExternalLink>
            <Text style={styles.repositoryNote}>
              O endereço público do repositório deste aplicativo não está
              configurado no projeto.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 40,
    gap: 22,
  },
  contentWide: {
    paddingHorizontal: 30,
    paddingTop: 28,
  },
  hero: {
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  heroIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#39D35355",
    borderRadius: 11,
    backgroundColor: "#39D35312",
  },
  eyebrow: {
    color: colors.green,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 25,
    lineHeight: 33,
    fontWeight: "700",
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
  },
  section: {
    padding: 18,
    gap: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  featureCard: {
    flexGrow: 1,
    flexBasis: 190,
    minWidth: 0,
    padding: 13,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.background,
  },
  featureIcon: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  cardDescription: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  bodyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
  },
  noticeSection: {
    borderColor: "#F0883E55",
    backgroundColor: "#F0883E08",
  },
  disclaimer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    color: colors.text,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "600",
  },
  linksSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  linksCopy: {
    flex: 1,
    gap: 10,
  },
  linksTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    color: colors.blue,
    fontSize: 11,
    fontWeight: "600",
  },
  repositoryNote: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
  },
});
