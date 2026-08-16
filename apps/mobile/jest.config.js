module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons)/)',
  ],
  moduleNameMapper: {
    '^@bystrobarista/core$': '<rootDir>/../../packages/core/src/index.ts',
    '^@bystrobarista/core/(.*)$': '<rootDir>/../../packages/core/src/$1',
  },
};
