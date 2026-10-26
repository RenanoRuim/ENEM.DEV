import { NativeTabs } from 'expo-router/native-tabs';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor="#161B22"
      indicatorColor="#30363D"
      labelStyle={{ selected: { color: '#39D353' } }}>
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
    </NativeTabs>
  );
}
