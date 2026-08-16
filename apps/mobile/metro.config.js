const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '../..');

const defaultConfig = getDefaultConfig(projectRoot);

// Monorepo-aware resolver. `watchFolders` is intentionally NOT set here yet —
// once packages/core is introduced it must include workspaceRoot AND watchman
// must be installed (Node's fs.watch hits EMFILE watching a whole workspace).
const config = {
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    disableHierarchicalLookup: true,
    extraNodeModules: {
      react: path.dirname(require.resolve('react/package.json')),
      'react-native': path.dirname(require.resolve('react-native/package.json')),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
