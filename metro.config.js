// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force TensorFlow.js to use browser build instead of Node.js build
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Force browser build for TensorFlow.js core
    if (moduleName === '@tensorflow/tfjs-core') {
      // Resolve to browser build explicitly
      const browserPath = path.resolve(
        __dirname,
        'node_modules/@tensorflow/tfjs-core/dist/tf-core.js'
      );
      return {
        filePath: browserPath,
        type: 'sourceFile',
      };
    }
    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;

