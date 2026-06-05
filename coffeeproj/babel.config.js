module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
  ],
  env: {
    production: {
      // Strip console.log/info/debug calls from prod bundles (keep error/warn
      // so genuine failures still surface in Crashlytics/Sentry-equivalents).
      plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]],
    },
  },
};
