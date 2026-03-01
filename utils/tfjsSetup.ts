/**
 * TensorFlow.js Setup
 * Uses CPU backend - compatible with React Native without tfjs-react-native
 */

// Polyfill fetch for TensorFlow.js (React Native)

import * as tf from "@tensorflow/tfjs-react-native";
import "@tensorflow/tfjs-backend-cpu";
import "whatwg-fetch"; // already included in package.json

let backendInitialized = false;

export async function initializeTensorFlow() {
  if (backendInitialized) {
    return;
  }

  try {
    // Prefer GPU backend (rn-webgl) if available, otherwise fall back to CPU.
    await tf.ready();
    if (
      await tf
        .setBackend("rn-webgl")
        .then(() => true)
        .catch(() => false)
    ) {
      console.log("TensorFlow.js backend set to rn-webgl (GPU)");
    } else {
      await tf.setBackend("cpu");
      console.log("TensorFlow.js backend set to cpu (no GPU available)");
    }

    const backend = tf.getBackend();
    console.log(`TensorFlow.js backend active: ${backend}`);

    backendInitialized = true;
    console.log("TensorFlow.js initialized successfully");
  } catch (error) {
    console.error("Failed to initialize TensorFlow.js:", error);
    throw error;
  }
}

// Auto-initialize on import
initializeTensorFlow().catch((err) => {
  console.error("Auto-initialization failed:", err);
});
