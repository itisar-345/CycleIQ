const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const SQLITE_PKG = path.resolve(__dirname, 'node_modules/expo-sqlite');

const originalResolveRequest = config.resolver.resolveRequest;

// Web preview: the database modules run on sql.js via database/connection.web.ts (picked by
// Metro's platform extensions), so expo-sqlite itself is never needed in the web bundle.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName.endsWith('.wasm')) return { type: 'empty' };
    if (moduleName === 'expo-sqlite' || moduleName.startsWith('expo-sqlite/')) return { type: 'empty' };
    if (context.originModulePath && context.originModulePath.startsWith(SQLITE_PKG)) return { type: 'empty' };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
