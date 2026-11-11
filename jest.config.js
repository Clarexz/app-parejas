/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  resolver: 'react-native-reanimated/jest/resolver',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '<rootDir>/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  // El preset de jest-expo más FlashList, que se publica como ESM.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@shopify/flash-list))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
