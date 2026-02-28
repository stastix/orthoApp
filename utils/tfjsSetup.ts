/**
 * TensorFlow.js Setup
 * Uses CPU backend - compatible with React Native without tfjs-react-native
 */

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-cpu"; 
import 'whatwg-fetch'; // you already have this in package.json


let backendInitialized = false;

export async function initializeTensorFlow() {
  if (backendInitialized) {
    return;
  }

  try {
    // Force CPU backend - most compatible with React Native
    await tf.setBackend("cpu");
    await tf.ready();

    const backend = tf.getBackend();
    console.log(`TensorFlow.js backend: ${backend}`);

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
