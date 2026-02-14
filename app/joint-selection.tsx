import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const JOINTS = ["Schulter", "Ellbogen", "Hufte", "Knie"];

export default function JointSelectionScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const [side, setSide] = useState<"rechts" | "links" | null>(null);
  const [joint, setJoint] = useState<string | null>(null);

  const displayId = useMemo(() => patientId ?? "001", [patientId]);
  const canContinue = Boolean(side && joint);

  return (
    <View style={styles.container}>
      <Text style={styles.patientLabel}>Patient&apos;in {displayId}</Text>
      <Text style={styles.title}>Gelenk auswahlen</Text>
      <View style={styles.sideRow}>
        <Pressable
          style={[
            styles.sideButton,
            side === "rechts" && styles.sideButtonActive,
          ]}
          onPress={() => setSide("rechts")}
        >
          <Text
            style={[
              styles.sideButtonText,
              side === "rechts" && styles.sideButtonTextActive,
            ]}
          >
            Rechte Seite
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.sideButton,
            side === "links" && styles.sideButtonActive,
          ]}
          onPress={() => setSide("links")}
        >
          <Text
            style={[
              styles.sideButtonText,
              side === "links" && styles.sideButtonTextActive,
            ]}
          >
            Linke Seite
          </Text>
        </Pressable>
      </View>
      <View style={styles.jointList}>
        {JOINTS.map((item) => (
          <Pressable
            key={item}
            style={[
              styles.jointButton,
              joint === item && styles.jointButtonActive,
            ]}
            onPress={() => setJoint(item)}
          >
            <Text
              style={[
                styles.jointButtonText,
                joint === item && styles.jointButtonTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[
          styles.primaryButton,
          !canContinue && styles.primaryButtonDisabled,
        ]}
        disabled={!canContinue}
        onPress={() =>
          router.push({
            pathname: "/movement-selection",
            params: { patientId: displayId, side, joint },
          })
        }
      >
        <Text style={styles.primaryButtonText}>Weiter</Text>
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
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    color: "#1f1f1f",
  },
  sideRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },
  sideButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d6d6d6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  sideButtonActive: {
    borderColor: "#1e88e5",
    backgroundColor: "#e8f1fb",
  },
  sideButtonText: {
    color: "#5a5a5a",
  },
  sideButtonTextActive: {
    color: "#1e88e5",
    fontWeight: "600",
  },
  jointList: {
    gap: 12,
    marginBottom: 24,
  },
  jointButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d6d6d6",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  jointButtonActive: {
    borderColor: "#1e88e5",
    backgroundColor: "#e8f1fb",
  },
  jointButtonText: {
    color: "#5a5a5a",
  },
  jointButtonTextActive: {
    color: "#1e88e5",
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: "auto",
    marginBottom: 24,
    backgroundColor: "#1e88e5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#a7c7ee",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
