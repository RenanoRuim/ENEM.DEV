import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from "@/hooks/use-theme";

export default function AppTabs() {
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.border}
      labelStyle={{ selected: { color: colors.green } }}
      tintColor={colors.green}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" md="dashboard" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="questions">
        <NativeTabs.Trigger.Label>Questões</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.closed" md="menu_book" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="redacao-lab">
        <NativeTabs.Trigger.Label>Redação Lab</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="pencil.and.outline" md="edit_note" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="debug">
        <NativeTabs.Trigger.Label>Debug</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ladybug" md="bug_report" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="performance">
        <NativeTabs.Trigger.Label>Desempenho</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="about" hidden>
        <NativeTabs.Trigger.Label>Sobre</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="info.circle" md="info" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings" hidden>
        <NativeTabs.Trigger.Label>Aparência</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="paintbrush" md="palette" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="forgot-password" hidden>
        <NativeTabs.Trigger.Label>Recuperar senha</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="key.fill" md="key" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="reset-password" hidden>
        <NativeTabs.Trigger.Label>Redefinir senha</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="lock.fill" md="lock" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="auth">
        <NativeTabs.Trigger.Label>Conta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
