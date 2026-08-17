const path = require('path');
const fs = require('fs');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '../..');
const coreRoot = path.resolve(workspaceRoot, 'packages/core');

const defaultConfig = getDefaultConfig(projectRoot);

const config = {
  watchFolders: [coreRoot],
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === '@bystrobarista/core') {
        return {filePath: path.join(coreRoot, 'index.ts'), type: 'sourceFile'};
      }
      if (moduleName.startsWith('@bystrobarista/core/')) {
        const sub = moduleName.slice('@bystrobarista/core/'.length);
        for (const ext of ['.ts', '.tsx', '/index.ts']) {
          const candidate = path.join(coreRoot, sub + ext);
          if (fs.existsSync(candidate)) {
            return {filePath: candidate, type: 'sourceFile'};
          }
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
