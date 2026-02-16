// CRITICAL: Set up TensorFlow.js environment FIRST
// This must run before any other imports that might use TensorFlow.js
import '../utils/tfjsSetup';

import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack initialRouteName="index" screenOptions={{ headerShown: false }} />;
}
