import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logoWrapper}>
        <View style={styles.logo}>
          <View style={[styles.logoPill, styles.logoPillRed]} />
          <View style={styles.logoRow}>
            <View style={[styles.logoDot, styles.logoDotBlue]} />
            <View style={[styles.logoDot, styles.logoDotRed]} />
          </View>
          <View style={[styles.logoPill, styles.logoPillBlue]} />
        </View>
      </View>
      <Text style={styles.title}>Motion Analysis</Text>
      <Pressable style={styles.primaryButton} onPress={() => router.push("/patient-id")}>
        <Text style={styles.primaryButtonText}>Start</Text>
      </Pressable>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  logo: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 6,
  },
  logoPill: {
    width: 46,
    height: 14,
    borderRadius: 8,
  },
  logoPillRed: {
    backgroundColor: "#e53935",
  },
  logoPillBlue: {
    backgroundColor: "#1e88e5",
  },
  logoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  logoDotRed: {
    backgroundColor: "#e53935",
  },
  logoDotBlue: {
    backgroundColor: "#1e88e5",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1f1f1f",
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: "#1e88e5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
