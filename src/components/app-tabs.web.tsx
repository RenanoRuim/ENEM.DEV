import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import {
  BookOpen,
  Bug,
  ChartNoAxesColumnIncreasing,
  Code2,
  House,
  Info,
} from "lucide-react-native";
import type { ComponentProps, ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useIsWideLayout } from "@/hooks/use-is-wide-layout";

const navItems = [
  { name: "home", href: "/", label: "Dashboard", icon: House },
  { name: "questions", href: "/questions", label: "Questões", icon: BookOpen },
  { name: "debug", href: "/debug", label: "Debug Mode", icon: Bug },
  {
    name: "performance",
    href: "/performance",
    label: "Desempenho",
    icon: ChartNoAxesColumnIncreasing,
  },
  { name: "about", href: "/about", label: "Sobre", icon: Info },
] as const;

type NavIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;
type TabButtonProps = Omit<ComponentProps<typeof Pressable>, "ref"> & {
  isFocused?: boolean;
  icon: NavIcon;
  label: string;
  compact: boolean;
};

export default function AppTabs() {
  const isWide = useIsWideLayout();

  return (
    <Tabs style={styles.tabs}>
      <TabSlot
        style={StyleSheet.flatten([
          styles.slot,
          isWide ? styles.desktopSlot : styles.mobileSlot,
        ])}
      />
      <TabList asChild>
        <View
          style={StyleSheet.flatten([
            styles.navigation,
            isWide ? styles.sidebar : styles.bottomBar,
          ])}
        >
          {navItems.map((item) => (
            <TabTrigger
              key={item.name}
              name={item.name}
              href={item.href}
              asChild
            >
              <TabButton
                icon={item.icon}
                label={item.label}
                compact={!isWide}
              />
            </TabTrigger>
          ))}
        </View>
      </TabList>
      {isWide && (
        <>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Code2 color="#39D353" size={19} strokeWidth={2.4} />
            </View>
            <View>
              <Text style={styles.brandName}>ENEM.DEV</Text>
              <Text style={styles.brandCaption}>Treino = Nota++</Text>
            </View>
          </View>
          <Text style={styles.sectionCaption}>PLATAFORMA</Text>
          <View style={styles.sidebarFooter}>
            <View style={styles.footerStatus} />
            <Text style={styles.footerText}>
              Apenas você decide seu limite para aprender.
            </Text>
          </View>
        </>
      )}
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon: Icon,
  label,
  compact,
  ...props
}: TabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.tabButton,
        compact && styles.mobileTabButton,
        isFocused && styles.activeTabButton,
        pressed && styles.pressed,
      ]}
    >
      <Icon
        color={isFocused ? "#39D353" : "#8B949E"}
        size={18}
        strokeWidth={1.9}
      />
      <Text
        style={[
          styles.tabLabel,
          compact && styles.mobileTabLabel,
          isFocused && styles.activeTabLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
    backgroundColor: "#0D1117",
  },
  slot: {
    flex: 1,
    backgroundColor: "#0D1117",
  },
  desktopSlot: {
    marginLeft: 248,
  },
  mobileSlot: {
    paddingBottom: 72,
  },
  navigation: {
    position: "absolute",
    zIndex: 10,
    backgroundColor: "#0D1117",
  },
  sidebar: {
    top: 0,
    bottom: 0,
    left: 0,
    width: 248,
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: 18,
    paddingTop: 112,
    borderRightWidth: 1,
    borderRightColor: "#30363D",
  },
  bottomBar: {
    right: 0,
    bottom: 0,
    left: 0,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "#30363D",
    backgroundColor: "#161B22",
  },
  brand: {
    position: "absolute",
    zIndex: 12,
    top: 24,
    left: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 6,
    paddingBottom: 29,
  },
  brandIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#30363D",
    borderRadius: 10,
    backgroundColor: "#161B22",
  },
  brandName: {
    color: "#E6EDF3",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  brandCaption: {
    marginTop: 3,
    color: "#8B949E",
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: "600",
  },
  sectionCaption: {
    position: "absolute",
    zIndex: 12,
    top: 91,
    left: 27,
    color: "#8B949E",
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "700",
  },
  tabButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 11,
    borderRadius: 8,
  },
  mobileTabButton: {
    minWidth: 65,
    minHeight: 58,
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 2,
    borderRadius: 0,
  },
  activeTabButton: {
    backgroundColor: "#39D35316",
  },
  tabLabel: {
    color: "#8B949E",
    fontSize: 12,
    fontWeight: "500",
  },
  mobileTabLabel: {
    fontSize: 9,
  },
  activeTabLabel: {
    color: "#39D353",
    fontWeight: "600",
  },
  sidebarFooter: {
    position: "absolute",
    zIndex: 12,
    bottom: 0,
    left: 0,
    width: 248,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: "#30363D",
  },
  footerStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#39D353",
  },
  footerText: {
    color: "#8B949E",
    fontSize: 10,
  },
  pressed: {
    opacity: 0.7,
  },
});
