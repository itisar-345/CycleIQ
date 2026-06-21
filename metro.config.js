const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const DB_WEB_STUB = path.resolve(__dirname, 'database/index.web.ts');
const SQLITE_PKG = path.resolve(__dirname, 'node_modules/expo-sqlite');

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web') {
    return originalResolveRequest
      ? originalResolveRequest(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  }

  // Stub .wasm
  if (moduleName.endsWith('.wasm')) {
    return { type: 'empty' };
  }

  // Redirect database module to web stub
  if (
    moduleName === '@/database' ||
    moduleName === '../database' ||
    moduleName === './database' ||
    moduleName.endsWith('/database/index') ||
    moduleName.endsWith('/database')
  ) {
    return { type: 'sourceFile', filePath: DB_WEB_STUB };
  }

  // Block expo-sqlite by name
  if (moduleName === 'expo-sqlite' || moduleName.startsWith('expo-sqlite/')) {
    return { type: 'empty' };
  }

  // Block any import originating from inside expo-sqlite on web
  if (context.originModulePath && context.originModulePath.startsWith(SQLITE_PKG)) {
    return { type: 'empty' };
  }

  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
