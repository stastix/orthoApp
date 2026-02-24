/**
 * TensorFlow.js React Native Environment Setup
 * 
 * This file MUST be imported before any TensorFlow.js imports.
 * It configures the React Native environment to work with TensorFlow.js
 * by setting up the React Native backend.
 */

import '@tensorflow/tfjs-react-native';
import * as tf from '@tensorflow/tfjs';

// Initialize React Native backend
let backendInitialized = false;

export async function initializeTensorFlow() {
  if (backendInitialized) {
    return;
  }

  try {
    // Set environment flags
    tf.env().set('WEBGL_PACK', false);
    tf.env().set('WEBGL_FORCE_F16_TEXTURES', false);
    tf.env().set('WEBGL_PACK_DEPTHWISECONV', false);
    
    // Wait for TensorFlow.js to be ready
    // @tensorflow/tfjs-react-native automatically sets up the correct backend
    await tf.ready();
    
    // Check which backend is active
    const backend = tf.getBackend();
    console.log(`TensorFlow.js backend: ${backend}`);
    
    // If somehow WebGL is selected, switch to CPU
    if (backend === 'webgl' || backend === 'webgpu') {
      console.warn('WebGL backend detected, switching to CPU');
      await tf.setBackend('cpu');
      await tf.ready();
    }
    
    backendInitialized = true;
    console.log('TensorFlow.js React Native backend initialized');
  } catch (error) {
    console.error('Failed to initialize TensorFlow.js:', error);
    throw error;
  }
}

// Auto-initialize on import
initializeTensorFlow().catch(err => {
  console.error('Auto-initialization failed:', err);
});
