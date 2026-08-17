module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons)/)',
  ],
  moduleNameMapper: {
    '^@bystrobarista/core$': '<rootDir>/../../packages/core/index.ts',
    '^@bystrobarista/core/(.*)$': '<rootDir>/../../packages/core/$1',
  },
  // When jest transforms a core file (under packages/core/), babel emits
  // requires for @babel/runtime helpers. Those helpers live only in
  // apps/mobile/node_modules under the standalone-mobile install strategy.
  // Force jest to always look there first — the default per-file walk-up
  // won't find them from packages/core/.
  moduleDirectories: ['<rootDir>/node_modules', 'node_modules'],
};
