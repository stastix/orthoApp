/**
 * TensorFlow.js React Native Environment Setup
 * 
 * This file MUST be imported before any TensorFlow.js imports.
 * It configures the React Native environment to work with TensorFlow.js
 * by setting up browser-like globals that TensorFlow.js expects.
 */

// Type-safe wrapper for global modifications
const g = global as unknown as Record<string, unknown> & {
  process?: {
    browser?: boolean;
    type?: string;
    platform?: string;
    versions?: Record<string, string>;
  };
  window?: typeof globalThis;
  document?: {
    createElement: () => Record<string, never>;
  };
  fetch?: typeof fetch;
};

// Configure process for browser-like environment
if (g.process) {
  g.process.browser = true;
  g.process.type = 'browser';
  // Use type assertion for platform since React Native isn't in Node's type definitions
  (g.process as { platform?: string }).platform = 'react-native';
  
  // Remove Node.js version to prevent Node.js detection
  if (g.process.versions) {
    const versions = { ...g.process.versions };
    delete versions.node;
    g.process.versions = versions;
  }
}

// Set up fetch on global if not already present
if (typeof g.fetch === 'undefined' && typeof fetch !== 'undefined') {
  g.fetch = fetch;
}

// Set up window reference for browser-like environment
if (typeof g.window === 'undefined') {
  g.window = global as unknown as typeof globalThis;
}

// Ensure fetch is available on window
if (g.window && typeof (g.window as { fetch?: typeof fetch }).fetch === 'undefined') {
  (g.window as { fetch?: typeof fetch }).fetch = g.fetch || (typeof fetch !== 'undefined' ? fetch : undefined);
}

// Set up minimal document-like object for compatibility
if (typeof g.document === 'undefined') {
  g.document = {
    createElement: () => ({}),
  } as { createElement: () => Record<string, never> };
}
