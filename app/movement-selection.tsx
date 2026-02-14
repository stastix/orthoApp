import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const MOVEMENTS = [
  { label: "Flexion", enabled: true },
  { label: "Abduktion", enabled: false },
  { label: "Rotation", enabled: false },
];

export default function MovementSelectionScreen() {
  const { patientId, joint, side } = useLocalSearchParams<{
    patientId?: string;
    joint?: string;
    side?: string;
  }>();
  const [movement, setMovement] = useState<string | null>("Flexion");

  const title = useMemo(() => {
    if (joint && side) {
      return `${side === "links" ? "Linke" : "Rechte"} Seite · ${joint}`;
    }
    return "Bewegung auswahlen";
  }, [joint, side]);
  const handleClick = () => {
    console.log("Start measurement for", { patientId, joint, side, movement });
    router.push({
      pathname: "/cameraView",
      params: { patientId, joint, side, movement },
    });
  };
  return (
    <View style={styles.container}>
      <Text style={styles.patientLabel}>Patientin {patientId ?? "001"}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Bewegung auswahlen</Text>
      <View style={styles.list}>
        {MOVEMENTS.map((item) => {
          const isActive = movement === item.label;
          return (
            <Pressable
              key={item.label}
              style={[
                styles.movementButton,
                isActive && styles.movementButtonActive,
                !item.enabled && styles.movementButtonDisabled,
              ]}
              disabled={!item.enabled}
              onPress={() => setMovement(item.label)}
            >
              <Text
                style={[
                  styles.movementButtonText,
                  isActive && styles.movementButtonTextActive,
                  !item.enabled && styles.movementButtonTextDisabled,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable style={styles.primaryButton} onPress={() => handleClick()}>
        <Text style={styles.primaryButtonText}>Messung starten</Text>
      </Pressable>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  patientLabel: {
    textAlign: "center",
    color: "#606060",
    marginBottom: 6,
  },
  title: {
    textAlign: "center",
    fontSize: 16,
    color: "#606060",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 24,
    color: "#1f1f1f",
  },
  list: {
    gap: 12,
    marginBottom: 24,
  },
  movementButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e88e5",
    paddingVertical: 12,
    alignItems: "center",
  },
  movementButtonActive: {
    backgroundColor: "#1e88e5",
  },
  movementButtonDisabled: {
    borderColor: "#c8c8c8",
    backgroundColor: "#f0f0f0",
  },
  movementButtonText: {
    color: "#1e88e5",
    fontWeight: "600",
  },
  movementButtonTextActive: {
    color: "#fff",
  },
  movementButtonTextDisabled: {
    color: "#9e9e9e",
  },
  primaryButton: {
    marginTop: "auto",
    marginBottom: 24,
    backgroundColor: "#1e88e5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
