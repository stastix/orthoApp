import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function PatientIdScreen() {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");

  const trimmedId = useMemo(() => patientId.trim(), [patientId]);
  const canContinue = trimmedId.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Motion Analysis</Text>
      <TextInput
        style={styles.input}
        placeholder="Patienten-ID"
        placeholderTextColor="#9e9e9e"
        value={patientId}
        onChangeText={setPatientId}
        autoFocus
      />
      <Pressable
        style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
        disabled={!canContinue}
        onPress={() => router.push({ pathname: "/joint-selection", params: { patientId: trimmedId } })}
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
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 32,
    color: "#1f1f1f",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9d9d9",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
    color: "#1f1f1f",
  },
  primaryButton: {
    backgroundColor: "#1e88e5",
    paddingHorizontal: 24,
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

