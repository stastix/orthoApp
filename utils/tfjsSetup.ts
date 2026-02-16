// CRITICAL: This file MUST be imported before any TensorFlow.js imports
// It sets up the React Native environment so TensorFlow.js uses the browser platform

// Force browser platform for TensorFlow.js (not Node.js)
if (typeof global !== 'undefined') {
  // CRITICAL: Set process.browser = true FIRST
  // This must happen before any TensorFlow.js code runs
  if (typeof global.process === 'undefined') {
    // @ts-ignore
    global.process = { 
      env: {}, 
      platform: 'react-native',
      browser: true,
      versions: {},
      type: 'browser'
    };
  } else {
    // @ts-ignore
    global.process.browser = true;
    // @ts-ignore
    global.process.type = 'browser';
    // @ts-ignore
    global.process.platform = 'react-native';
    // Remove Node.js version to prevent Node.js detection
    // @ts-ignore
    if (global.process.versions) {
      // @ts-ignore
      delete global.process.versions.node;
    }
  }
  
  // Set up fetch - React Native has it, but TensorFlow.js needs it on global
  if (typeof global.fetch === 'undefined') {
    if (typeof fetch !== 'undefined') {
      // @ts-ignore
      global.fetch = fetch;
    }
  }
  
  // Set up window for browser-like environment
  if (typeof global.window === 'undefined') {
    // @ts-ignore
    global.window = global;
  }
  
  // Ensure fetch is on window too
  if (typeof global.window !== 'undefined' && typeof global.window.fetch === 'undefined') {
    // @ts-ignore
    global.window.fetch = global.fetch || fetch;
  }
  
  // Set up document-like object (some TensorFlow.js code checks for this)
  if (typeof global.document === 'undefined') {
    // @ts-ignore
    global.document = {
      createElement: () => ({}),
    };
  }
}

// Export nothing - this file is just for side effects
export {};

