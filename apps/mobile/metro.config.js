const path = require('path');
const fs = require('fs');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '../..');
const coreRoot = path.resolve(workspaceRoot, 'packages/core');

const defaultConfig = getDefaultConfig(projectRoot);

// Libraries that must resolve to apps/mobile/node_modules exactly once.
// Metro's hierarchical lookup for files under packages/core walks up to the
// MONOREPO-ROOT node_modules (where the workspace install of core's own deps
// lives) — a second copy of react there crashes the app with "Invalid hook
// call"; a second i18next means initI18n initialises an instance the screens
// never read. Redirecting the origin to the app root forces the app's copy.
const SHARED_SINGLETONS = new Set([
  'react',
  'react-native',
  'i18next',
  'react-i18next',
  'zustand',
  '@supabase/supabase-js',
  '@babel/runtime',
]);

const packageBase = moduleName => {
  const parts = moduleName.split('/');
  return moduleName.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

const config = {
  watchFolders: [coreRoot],
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === '@bystrobarista/core') {
        return {filePath: path.join(coreRoot, 'index.ts'), type: 'sourceFile'};
      }
      if (moduleName.startsWith('@bystrobarista/core/')) {
        const sub = moduleName.slice('@bystrobarista/core/'.length);
        for (const ext of ['.ts', '.tsx', '.json', '/index.ts']) {
          const candidate = path.join(coreRoot, sub + ext);
          if (fs.existsSync(candidate)) {
            return {filePath: candidate, type: 'sourceFile'};
          }
        }
      }
      if (
        context.originModulePath &&
        context.originModulePath.startsWith(coreRoot) &&
        SHARED_SINGLETONS.has(packageBase(moduleName))
      ) {
        return context.resolveRequest(
          {...context, originModulePath: path.join(projectRoot, 'package.json')},
          moduleName,
          platform
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
