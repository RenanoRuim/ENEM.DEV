import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/auth-context";
import { useThemedStyles } from "@/hooks/use-theme";

export function AccountStatusCard() {
  const router = useRouter();
  const styles = useThemedStyles(baseStyles);
  const { session, isConfigured, syncStatus, syncError } = useAuth();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Conta e sincronização</Text>
      {session ? (
        <>
          <Text style={styles.description}>{session.user.email}</Text>
          <Text style={syncStatus === "error" ? styles.error : styles.description}>
            {syncStatus === "syncing" && "Sincronizando os dados desta conta..."}
            {syncStatus === "synced" && "Dados desta conta sincronizados."}
            {syncStatus === "idle" && "Sincronização aguardando configuração."}
            {syncStatus === "error" && (syncError ?? "Falha na sincronização.")}
          </Text>
        </>
      ) : (
        <Text style={styles.description}>
          Entre para sincronizar os dados desta conta. Os dados do visitante
          permanecem separados e não são associados automaticamente.
        </Text>
      )}
      {!isConfigured && (
        <Text style={styles.error}>
          Configure a URL e a chave pública do Supabase para ativar a conta.
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/auth")}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>
          {session ? "Gerenciar conta" : "Entrar ou criar conta"}
        </Text>
      </Pressable>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  card: {
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "#30363D",
    borderRadius: 12,
    backgroundColor: "#161B22",
  },
  title: { color: "#E6EDF3", fontSize: 14, fontWeight: "700" },
  description: { color: "#8B949E", fontSize: 12, lineHeight: 18 },
  error: { color: "#F0883E", fontSize: 12, lineHeight: 18 },
  button: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#39D353",
  },
  buttonText: { color: "#0D1117", fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.75 },
});
