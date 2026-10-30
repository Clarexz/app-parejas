// Worklets no corre en Node sin su mock oficial; Reanimated usa el resolver de jest.config.js.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
